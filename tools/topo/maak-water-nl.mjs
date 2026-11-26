// Het water van Nederland uit de landelijke KRW-oppervlaktewaterlichamen (plan T5b par. 3.2, B7 en B8; plan T1 par. 2.1).
// Alleen bouwomgeving.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node --max-old-space-size=6000 maak-water-nl.mjs <INSPIRESurfaceWaterBody.gml> <uitvoermap>
// - controleert de SHA-256 van de GML en van water-nl.json tegen het register in bronnen.json;
// - per item de KRW-lichamen uit de tabel: elk lichaam bestaat precies een keer, met precies de naam uit de tabel; geen lichaam
//   wordt twee keer gebruikt; de geometrie past bij de soort (rivier: lijn; zee, meer, zeearm: vlak) en het KRW-type ook
//   (rivier: riverWaterBody; meer: lakeWaterBody; zeearm: transitionalWaterBody of coastalWaterBody; zee: coastalWaterBody);
// - een item uit twee lichamen: de vereniging (besluit in de tabel), gemeld in de GEOREF;
// - feiten: de beheerder (bron KRW); een meer en een zeearm liggen in Nederland (de landelijke set van Nederland); een zee en een
//   rivier zijn internationaal water, zonder landrelatie (zoals water-nlbe.js);
// - schrijft items/water-nl.js; twee keer draaien geeft een byte-gelijk bestand.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { openBron } from "./bronnen/bron.mjs";
import { leesKrwGml } from "./bronnen/lees-gml-krw.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var BRONNEN = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8"));
var KRWB = BRONNEN.krwOppervlaktewaterlichamen, REG = BRONNEN.register.ids;
export var GEOM_PER_SOORT = { rivier: "lijn", zee: "vlak", meer: "vlak", zeearm: "vlak" };
export var KRW_TYPE_PER_SOORT = { rivier: ["riverWaterBody"], zee: ["coastalWaterBody"], meer: ["lakeWaterBody"], zeearm: ["transitionalWaterBody", "coastalWaterBody"] };

function fout(t) { throw new Error(t); }

export function openKrw(pad) {
  var b = openBron(pad, "KRW", KRWB.gml.bestand);
  if (b.sha256 !== KRWB.gml.sha256) fout("SHA-256 van de KRW-GML wijkt af van krwOppervlaktewaterlichamen");
  var K = leesKrwGml(b.buf);
  if (K.records.length !== KRWB.gml.features || K.crs !== KRWB.gml.crs) fout("KRW: onverwacht aantal lichamen of CRS");
  var per = {}; K.records.forEach(function(r) { per[r.kenmerken.localId] = r; });
  return { sha: b.sha256, records: K.records, per: per };
}

export function bouw(paden) {
  var K = openKrw(paden.gml);
  var tab = openBron(path.join(HIER, "water-nl.json"), "tabellenNlbe", "tools/topo/water-nl.json");
  if (REG.tabellenNlbe.bestanden["tools/topo/water-nl.json"] !== tab.sha256) fout("SHA-256 van water-nl.json wijkt af van het register");
  var T = JSON.parse(tab.buf.toString("utf8"));
  var bronKrw = { id: "KRW", bestand: KRWB.gml.bestand, sha256: KRWB.gml.sha256, versie: KRWB.gml.versie, gedownload: KRWB.gedownload };
  var gebruikt = {}, namen = {};
  var ITEMS = Object.keys(T.water).sort().map(function(id) {
    var t = T.water[id], ids = Object.keys(t.krw).sort();
    if (!GEOM_PER_SOORT[t.soort]) fout("onbekende soort: " + t.soort);
    if (!ids.length) fout("item zonder KRW-lichaam: " + id);
    if (namen[t.soort + "|" + t.naam]) fout("naam twee keer: " + t.naam); namen[t.soort + "|" + t.naam] = 1;
    var beheerders = {};
    ids.forEach(function(k) {
      var r = K.per[k] || fout("KRW: geen lichaam " + k);
      if (r.kenmerken.naam !== t.krw[k]) fout("KRW: " + k + " heet " + r.kenmerken.naam + ", niet " + t.krw[k]);
      if (gebruikt[k]) fout("KRW: " + k + " twee keer gebruikt (" + gebruikt[k] + ", " + id + ")"); gebruikt[k] = id;
      if (r.soort !== GEOM_PER_SOORT[t.soort]) fout("KRW: " + k + " is een " + r.soort + ", een " + t.soort + " vraagt een " + GEOM_PER_SOORT[t.soort]);
      if (KRW_TYPE_PER_SOORT[t.soort].indexOf(r.kenmerken.type) < 0) fout("KRW: " + k + " heeft type " + r.kenmerken.type + ", past niet bij " + t.soort);
      beheerders[r.kenmerken.beheerder || fout("KRW: " + k + " zonder beheerder")] = 1;
    });
    var krwNamen = ids.map(function(k) { return t.krw[k]; });
    var varianten = ids.length === 1 && krwNamen[0] !== t.naam ? [krwNamen[0]] : [];
    var it = { id: id, soort: t.soort,
      naam: { waarde: t.naam, varianten: varianten, herkomst: "besluit", status: "vastgesteld", besluit: T.naamBesluit, controle: { id: "KRW", waarde: krwNamen.join("; ") } },
      feiten: {}, geometrie: { bron: { bronId: "KRW", bestand: KRWB.gml.bestand, sha256: KRWB.gml.sha256, sleutel: "localId", waarden: ids, crs: KRWB.gml.crs }, kaart: {} }, relaties: [] };
    if (ids.length > 1) it.geometrie.bron.aggregatie = "de vereniging van deze " + ids.length + " KRW-lichamen (" + krwNamen.join(", ") + "); besluit in tools/topo/water-nl.json (besluitSamen)";
    var bh = Object.keys(beheerders).sort();
    it.feiten.beheerder = { waarde: bh.length === 1 ? bh[0] : bh, herkomst: "bron", status: "vastgesteld", bron: bronKrw };
    if (t.soort === "meer" || t.soort === "zeearm") it.feiten.land = { waarde: "NLD", herkomst: "bron", status: "vastgesteld", bron: bronKrw };
    if (ids.length > 1) it.feiten.samengesteld = { waarde: ids.length, herkomst: "besluit", status: "vastgesteld", besluit: T.besluitSamen };
    return it;
  });
  return { ITEMS: ITEMS };
}

function regel(naam, waarde) { return "export var " + naam + " = " + JSON.stringify(waarde) + ";\n"; }
export function schrijf(uit, r) {
  fs.mkdirSync(path.join(uit, "items"), { recursive: true });
  fs.writeFileSync(path.join(uit, "items", "water-nl.js"), "// GEGENEREERD door tools/topo/maak-water-nl.mjs uit tools/topo/water-nl.json en de landelijke KRW-oppervlaktewaterlichamen (SHA-256 in tools/topo/bronnen.json); niet met de hand bewerken.\n// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.\n" + regel("WATER_NL", r.ITEMS));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  var r = bouw({ gml: process.argv[2] });
  schrijf(process.argv[3], r);
  console.log(JSON.stringify(r.ITEMS.map(function(i) { return i.id + " " + i.geometrie.bron.waarden.join("+"); })));
}
