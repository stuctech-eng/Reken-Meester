// De Nationale Parken van Nederland (plan T5b par. 3.3, B9; plan T1 par. 2.1: alle Nationale Parken op de peildatum).
// Alleen bouwomgeving.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node maak-parken-nl.mjs <natpark.gpkg> <uitvoermap>
// - controleert de SHA-256 van natpark.gpkg (RVO) en van streken-nl.json tegen het register;
// - elk park van RVO wordt een item van de soort natuurgebied, behalve een park dat al een streek is (streken-nl.json, "park"):
//   dat is hetzelfde item met een tweede rol (T1 par. 2.1, zoals Zeeuws-Vlaanderen en de Dollard); de streek krijgt het feit
//   nationaalPark in maak-streken-nl.mjs;
// - naam, nummer en datum van aanwijzing uit RVO (bron); een park zonder datum krijgt geen datum (gemeld in het rapport);
// - stopt bij een dubbele naam of een id die twee keer voorkomt; schrijft items/parken-nl.js; twee keer draaien geeft een
//   byte-gelijk bestand.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { openBron } from "./bronnen/bron.mjs";
import { leesGpkg } from "./bronnen/lees-gpkg.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var BRONNEN = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8"));
var RVO = BRONNEN.rvoNationaleParken, REG = BRONNEN.register.ids;

function fout(t) { throw new Error(t); }
export function slug(naam) { return naam.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

export async function bouw(paden) {
  var np = openBron(paden.natpark, "RVO", RVO.gpkg.bestand);
  if (np.sha256 !== RVO.gpkg.sha256) fout("SHA-256 van natpark.gpkg wijkt af");
  var st = openBron(path.join(HIER, "streken-nl.json"), "tabellenNlbe", "tools/topo/streken-nl.json");
  if (REG.tabellenNlbe.bestanden["tools/topo/streken-nl.json"] !== st.sha256) fout("SHA-256 van streken-nl.json wijkt af van het register");
  var S = JSON.parse(st.buf.toString("utf8")), alsStreek = {};
  Object.keys(S.streken).forEach(function(id) { var p = S.streken[id].park; if (p) alsStreek[p.naam] = id; });
  var parken = await leesGpkg(np.buf, RVO.gpkg.laag, ["naam", "nr", "instrument", "datum"], "geom", "naam");
  if (parken.crs !== RVO.gpkg.crs || parken.records.length !== RVO.gpkg.features) fout("RVO: onverwacht CRS of aantal");
  var rvoBron = { id: "RVO", bestand: RVO.gpkg.bestand, sha256: RVO.gpkg.sha256, laag: RVO.gpkg.laag, laatsteWijziging: RVO.laatsteWijziging, gedownload: RVO.gedownload };
  var ids = {}, namen = {}, STREEK = [];
  var ITEMS = [];
  parken.records.forEach(function(r) {
    var k = r.kenmerken;
    if (k.instrument !== "Nationaal Park") fout("RVO: " + k.naam + " is geen Nationaal Park");
    if (namen[k.naam]) fout("RVO: naam twee keer: " + k.naam); namen[k.naam] = 1;
    if (alsStreek[k.naam]) { STREEK.push({ park: k.naam, nr: k.nr, item: alsStreek[k.naam] }); return; }
    var id = "park-nl-" + slug(k.naam);
    if (ids[id]) fout("id twee keer: " + id); ids[id] = 1;
    var it = { id: id, soort: "natuurgebied",
      naam: { waarde: k.naam, varianten: [], herkomst: "bron", status: "vastgesteld", bron: rvoBron },
      feiten: {
        land: { waarde: "NLD", herkomst: "bron", status: "vastgesteld", bron: rvoBron },
        status: { waarde: "Nationaal Park", herkomst: "bron", status: "vastgesteld", bron: rvoBron },
        nummer: { waarde: k.nr, herkomst: "bron", status: "vastgesteld", bron: rvoBron }
      },
      geometrie: { bron: { bronId: "RVO", bestand: RVO.gpkg.bestand, sha256: RVO.gpkg.sha256, laag: RVO.gpkg.laag, sleutel: "naam", waarde: k.naam, crs: RVO.gpkg.crs }, kaart: {} },
      relaties: [] };
    if (k.datum) it.feiten.aangewezen = { waarde: k.datum, herkomst: "bron", status: "vastgesteld", bron: rvoBron };
    ITEMS.push(it);
  });
  Object.keys(alsStreek).forEach(function(n) { if (!namen[n]) fout("RVO: het park van streek " + alsStreek[n] + " bestaat niet: " + n); });
  ITEMS.sort(function(a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; });
  STREEK.sort(function(a, b) { return a.item < b.item ? -1 : 1; });
  return { ITEMS: ITEMS, STREEK: STREEK };
}

function regel(naam, waarde) { return "export var " + naam + " = " + JSON.stringify(waarde) + ";\n"; }
export function schrijf(uit, r) {
  fs.mkdirSync(path.join(uit, "items"), { recursive: true });
  fs.writeFileSync(path.join(uit, "items", "parken-nl.js"), "// GEGENEREERD door tools/topo/maak-parken-nl.mjs uit RVO Nationale Parken en tools/topo/streken-nl.json (SHA-256 in tools/topo/bronnen.json); niet met de hand bewerken.\n// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.\n// PARKEN_ALS_STREEK: de parken die al een streek zijn (hetzelfde item, met het feit nationaalPark).\n" + regel("PARKEN_NL", r.ITEMS) + regel("PARKEN_ALS_STREEK", r.STREEK));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  var r = await bouw({ natpark: process.argv[2] });
  schrijf(process.argv[3], r);
  console.log(JSON.stringify(r.ITEMS.map(function(i) { return i.id + " " + i.feiten.nummer.waarde + " " + (i.feiten.aangewezen ? i.feiten.aangewezen.waarde : "zonder datum"); })) + " " + JSON.stringify(r.STREEK));
}
