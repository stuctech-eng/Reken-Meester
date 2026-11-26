// De Nederlandse streken met een officiele grens (plan T5b par. 3.4, B2; plan T1 par. 2.1). Alleen bouwomgeving.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node maak-streken-nl.mjs <cbsgebiedsindelingen2026.gpkg> <natpark.gpkg> <uitvoermap>
// - controleert de SHA-256 van de bronbestanden en van streken-nl.json tegen het register in bronnen.json;
// - een streek uit een CBS-indeling (COROP-gebied, landbouwgebied, gemeente, provincie zonder gemeenten): de gemeenten met die
//   code in gebiedsindelingen_register; de CBS-naam van de indeling moet gelijk zijn aan de tabel; het vlak is de vereniging van
//   die gemeenten (gemeente_niet_gegeneraliseerd, zoals de provincies op de kaart);
// - een streek uit een Nationaal Park (RVO): precies een park met die naam en dat nummer;
// - stopt bij elke afwijking; schrijft items/streken-nl.js; twee keer draaien geeft een byte-gelijk bestand.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { openBron } from "./bronnen/bron.mjs";
import { leesGpkg } from "./bronnen/lees-gpkg.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var SCRIPT = "tools/topo/maak-streken-nl.mjs";
var BRONNEN = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8"));
var GEB = BRONNEN.cbsGebiedsindelingen2026, RVO = BRONNEN.rvoNationaleParken, REG = BRONNEN.register.ids;
var LAAG = "gemeente_niet_gegeneraliseerd";
var BESLUIT_NAMEN = "T1 par. 2.1: de namen van de streken (Zuid-Limburg met Heuvelland als variant; Zeeuws-Vlaanderen volgens TU/WL, met de CBS-spelling als variant)";
var NAAMKOLOM = { cr_code: "cr_naam", lb_code: "lb_naam", gm_code: "gm_naam", pv_code: "pv_naam" };

function fout(t) { throw new Error(t); }

export async function bouw(paden) {
  var gpkg = openBron(paden.gpkg, "CBSGEB", GEB.gpkg.bestand);
  if (gpkg.sha256 !== GEB.gpkg.sha256) fout("SHA-256 van CBSGEB wijkt af");
  var np = openBron(paden.natpark, "RVO", RVO.gpkg.bestand);
  if (np.sha256 !== RVO.gpkg.sha256 || REG.RVO.bestanden[RVO.gpkg.bestand] !== np.sha256) fout("SHA-256 van natpark.gpkg wijkt af");
  var tab = openBron(path.join(HIER, "streken-nl.json"), "tabellenNlbe", "tools/topo/streken-nl.json");
  if (REG.tabellenNlbe.bestanden["tools/topo/streken-nl.json"] !== tab.sha256) fout("SHA-256 van streken-nl.json wijkt af van het register");
  var T = JSON.parse(tab.buf.toString("utf8"));
  var reg = await leesGpkg(gpkg.buf, "gebiedsindelingen_register", ["gm_code", "gm_naam", "cr_code", "cr_naam", "lb_code", "lb_naam", "pv_code", "pv_naam"], "fid", "gm_code");
  if (reg.records.length !== GEB.lagen.gebiedsindelingen_register) fout("CBSGEB: register niet compleet");
  var parken = await leesGpkg(np.buf, RVO.gpkg.laag, ["naam", "nr", "instrument", "datum"], "geom", "naam");
  if (parken.crs !== RVO.gpkg.crs || parken.records.length !== RVO.gpkg.features) fout("RVO: onverwacht CRS of aantal");
  var regBron = { id: "CBSGEB", bestand: GEB.gpkg.bestand, sha256: GEB.gpkg.sha256, laag: "gebiedsindelingen_register", jaargang: GEB.jaargang, gedownload: GEB.gedownload };
  var rvoBron = { id: "RVO", bestand: RVO.gpkg.bestand, sha256: RVO.gpkg.sha256, laag: RVO.gpkg.laag, laatsteWijziging: RVO.laatsteWijziging, gedownload: RVO.gedownload };
  var invoer = [{ bronId: "CBSGEB", sha256: GEB.gpkg.sha256 }, { bronId: "tabellenNlbe", sha256: tab.sha256 }];
  var gebruikt = {};
  var ITEMS = Object.keys(T.streken).sort().map(function(id) {
    var s = T.streken[id], it = { id: id, soort: "streek",
      naam: { waarde: s.naam, varianten: s.varianten, herkomst: "besluit", status: "vastgesteld", besluit: BESLUIT_NAMEN },
      feiten: {}, geometrie: {}, relaties: [] };
    if (s.indeling) {
      var d = s.indeling, nk = NAAMKOLOM[d.kolom] || fout("onbekende kolom " + d.kolom);
      var rijen = reg.records.map(function(r) { return r.kenmerken; }).filter(function(k) { return k[d.kolom] === d.code; });
      if (!rijen.length) fout("CBS: geen gemeenten met " + d.kolom + " " + d.code);
      rijen.forEach(function(k) { if (k[nk] !== d.cbsNaam) fout("CBS: " + d.code + " heet " + k[nk] + ", niet " + d.cbsNaam); });
      var zonder = d.zonder || {};
      Object.keys(zonder).forEach(function(c) { var x = rijen.filter(function(k) { return k.gm_code === c; }); if (x.length !== 1 || x[0].gm_naam !== zonder[c]) fout("CBS: " + c + " is niet " + zonder[c] + " in " + d.code); });
      var codes = rijen.map(function(k) { return k.gm_code; }).filter(function(c) { return !zonder[c]; }).sort();
      it.naam.controle = { id: "CBSGEB", waarde: d.cbsNaam };
      it.feiten.land = { waarde: "NLD", herkomst: "bron", status: "vastgesteld", bron: regBron };
      it.feiten.indeling = { waarde: d.soort + " " + d.code + " " + d.cbsNaam + (Object.keys(zonder).length ? ", zonder " + Object.keys(zonder).sort().map(function(c) { return zonder[c] + " (" + c + ")"; }).join(" en ") : ""), herkomst: "besluit", status: "vastgesteld", besluit: T.besluit };
      it.feiten.aantalGemeenten = { waarde: codes.length, herkomst: "afgeleid", status: "vastgesteld", afleiding: { script: SCRIPT, invoer: invoer, regel: "de gemeenten met " + d.kolom + " = " + d.code + " in gebiedsindelingen_register (CBS " + GEB.jaargang + ")" + (Object.keys(zonder).length ? ", zonder " + Object.keys(zonder).sort().join(" en ") : "") } };
      it.geometrie = { bron: { bronId: "CBSGEB", bestand: GEB.gpkg.bestand, sha256: GEB.gpkg.sha256, laag: LAAG, sleutel: "statcode", waarden: codes, crs: GEB.gpkg.crs, aggregatie: "de vereniging van deze gemeenten (indeling " + d.kolom + " " + d.code + " in gebiedsindelingen_register)" }, kaart: {} };
    } else if (s.park) {
      var p = parken.records.filter(function(r) { return r.kenmerken.naam === s.park.naam; });
      if (p.length !== 1 || p[0].kenmerken.nr !== s.park.nr || p[0].kenmerken.instrument !== "Nationaal Park") fout("RVO: geen uniek Nationaal Park " + s.park.naam + " nr " + s.park.nr);
      var k = p[0].kenmerken;
      it.naam.controle = { id: "RVO", waarde: k.naam };
      it.feiten.land = { waarde: "NLD", herkomst: "bron", status: "vastgesteld", bron: rvoBron };
      it.feiten.indeling = { waarde: "Nationaal Park " + k.naam + " (nr " + k.nr + ", " + k.datum + ")", herkomst: "besluit", status: "vastgesteld", besluit: T.besluit };
      it.geometrie = { bron: { bronId: "RVO", bestand: RVO.gpkg.bestand, sha256: RVO.gpkg.sha256, laag: RVO.gpkg.laag, sleutel: "naam", waarde: k.naam, crs: RVO.gpkg.crs }, kaart: {} };
    } else if (s.globaal) {
      // globaal (plan T5b par. 3.4, besluit T5b-1): geen officiele grens, dus geen vlak (soorten.js, A2); de gemeenten als besluit,
      // elke code met precies die naam in het CBS-register
      var gl = Object.keys(s.globaal).sort();
      if (!gl.length) fout("globale streek zonder gemeenten: " + id);
      gl.forEach(function(c) { var x = reg.records.filter(function(r) { return r.kenmerken.gm_code === c; }); if (x.length !== 1 || x[0].kenmerken.gm_naam !== s.globaal[c]) fout("CBS: " + c + " is niet " + s.globaal[c]); });
      it.feiten.land = { waarde: "NLD", herkomst: "bron", status: "vastgesteld", bron: regBron };
      it.feiten.grens = { waarde: "globaal", herkomst: "besluit", status: "vastgesteld", besluit: T.besluitGlobaal };
      it.feiten.gemeenten = { waarde: gl, herkomst: "besluit", status: "vastgesteld", besluit: T.besluitGlobaal };
      it.geometrie = { bron: null, geen: "globaal, zonder officiele grens: alleen benoemen, als label-item zonder vlak (A2)", kaart: {} };
    } else fout("streek zonder indeling, park of globaal: " + id);
    if (gebruikt[s.naam]) fout("naam twee keer: " + s.naam); gebruikt[s.naam] = 1;
    return it;
  });
  return { ITEMS: ITEMS };
}

function regel(naam, waarde) { return "export var " + naam + " = " + JSON.stringify(waarde) + ";\n"; }
export function schrijf(uit, r) {
  fs.mkdirSync(path.join(uit, "items"), { recursive: true });
  fs.writeFileSync(path.join(uit, "items", "streken-nl.js"), "// GEGENEREERD door tools/topo/maak-streken-nl.mjs uit tools/topo/streken-nl.json, CBS Gebiedsindelingen 2026 en RVO Nationale Parken (SHA-256 in tools/topo/bronnen.json); niet met de hand bewerken.\n// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.\n" + regel("STREKEN_NL", r.ITEMS));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  var r = await bouw({ gpkg: process.argv[2], natpark: process.argv[3] });
  schrijf(process.argv[4], r);
  console.log(JSON.stringify(r.ITEMS.map(function(i) { return [i.id, i.feiten.aantalGemeenten ? i.feiten.aantalGemeenten.waarde : i.feiten.indeling ? i.feiten.indeling.waarde : i.feiten.gemeenten.waarde.length]; })));
}
