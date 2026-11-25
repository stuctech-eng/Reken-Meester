// Het Koninkrijk der Nederlanden: de landen en de openbare lichamen in het Caribisch gebied (plan T5b par. 3.5, B3; plan T1
// par. 2.1). Alleen bouwomgeving.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node maak-koninkrijk.mjs <map NE> <uitvoermap>
// - controleert de SHA-256 van de NE-bestanden en van koninkrijk.json tegen het register;
// - elke naam staat letterlijk in de passage van het Statuut (art. 1, lid 1 of lid 2); elk vlak is precies een NE-feature;
// - relaties met herkomst bron (het Statuut): het Koninkrijk omvat Nederland, Aruba, Curacao en Sint Maarten (koninkrijk-omvat,
//   de inverse van deel-van-koninkrijk); Bonaire, Sint Eustatius en Saba: bijzondere-gemeente-van Nederland (art. 1, lid 2; de
//   soort volgens T1, de officiele term openbaar lichaam als feit);
// - schrijft items/koninkrijk.js; twee keer draaien geeft een byte-gelijk bestand.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { openBron } from "./bronnen/bron.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var BRONNEN = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8"));
var REG = BRONNEN.register.ids;
var NE0 = "ne_10m_admin_0_map_units.geojson", NE1 = "ne_10m_admin_1_states_provinces.geojson";

function fout(t) { throw new Error(t); }

export async function bouw(paden) {
  function ne(b) { var x = openBron(path.join(paden.ne, b), "NE", b); if (x.sha256 !== REG.NE.bestanden[b]) fout("SHA-256 van " + b + " wijkt af"); return x; }
  var n0 = ne(NE0), n1 = ne(NE1);
  var tab = openBron(path.join(HIER, "koninkrijk.json"), "tabellenNlbe", "tools/topo/koninkrijk.json");
  if (REG.tabellenNlbe.bestanden["tools/topo/koninkrijk.json"] !== tab.sha256) fout("SHA-256 van koninkrijk.json wijkt af van het register");
  var T = JSON.parse(tab.buf.toString("utf8")), S = T.statuut, OL = T.openbaarLichaam;
  var f0 = JSON.parse(n0.buf.toString("utf8")).features, f1 = JSON.parse(n1.buf.toString("utf8")).features;
  function stb(lid) { return { id: "OV", uitgever: S.uitgever, document: S.document + ", art. 1, " + lid, url: S.url, passage: S[lid === "lid 1" ? "lid1" : "lid2"], geraadpleegd: S.geraadpleegd }; }
  function inPassage(naam, passage) { if (passage.indexOf(naam) < 0) fout("naam niet in de passage van het Statuut: " + naam); }
  var ITEMS = [];
  var kon = { id: T.koninkrijk.id, soort: "gebied",
    naam: { waarde: T.koninkrijk.naam, varianten: [], herkomst: "bron", status: "vastgesteld", bron: { id: "OV", uitgever: S.uitgever, document: S.document, url: S.url, passage: "Statuut voor het Koninkrijk der Nederlanden", geraadpleegd: S.geraadpleegd } },
    feiten: { status: { waarde: "koninkrijk", herkomst: "bron", status: "vastgesteld", bron: stb("lid 1") } },
    geometrie: { bron: null, geen: "geen eigen vlak: het Koninkrijk is Nederland, Aruba, Curacao en Sint Maarten samen", kaart: {} },
    relaties: [] };
  inPassage("Nederland", S.lid1);
  kon.relaties.push({ type: "koninkrijk-omvat", naar: "NLD", kwalificaties: {}, herkomst: "bron", status: "vastgesteld", bron: stb("lid 1") });
  Object.keys(T.landen).sort().forEach(function(id) {
    var l = T.landen[id]; inPassage(l.naam, S.lid1);
    var f = f0.filter(function(x) { return x.properties.ADM0_A3 === l.ne; });
    if (f.length !== 1 || f[0].properties.SOVEREIGNT !== "Netherlands") fout("NE: geen uniek " + l.ne + " onder Nederland");
    kon.relaties.push({ type: "koninkrijk-omvat", naar: id, kwalificaties: {}, herkomst: "bron", status: "vastgesteld", bron: stb("lid 1") });
    ITEMS.push({ id: id, soort: "gebied",
      naam: { waarde: l.naam, varianten: l.varianten || [], herkomst: "bron", status: "vastgesteld", bron: stb("lid 1") },
      feiten: { status: { waarde: "land binnen het Koninkrijk", herkomst: "bron", status: "vastgesteld", bron: stb("lid 1") } },
      geometrie: { bron: { bronId: "NE", bestand: NE0, sha256: n0.sha256, sleutel: "ADM0_A3", waarde: l.ne, crs: "EPSG:4326" }, kaart: {} },
      relaties: [] });
  });
  Object.keys(T.openbareLichamen).sort().forEach(function(id) {
    var o = T.openbareLichamen[id]; inPassage(o.naam, S.lid2);
    if (OL.passage.indexOf(o.naam) < 0) fout("naam niet in de passage van de Rijksoverheid: " + o.naam);
    var f = f1.filter(function(x) { return x.properties.iso_3166_2 === o.ne1; });
    if (f.length !== 1 || f[0].properties.adm0_a3 !== "NLD" || f[0].properties.name !== o.neNaam) fout("NE admin_1: geen uniek " + o.ne1 + " " + o.neNaam);
    ITEMS.push({ id: id, soort: "gebied",
      naam: { waarde: o.naam, varianten: o.varianten || [], herkomst: "bron", status: "vastgesteld", bron: stb("lid 2") },
      feiten: { land: { waarde: "NLD", herkomst: "bron", status: "vastgesteld", bron: stb("lid 2") },
        status: { waarde: "openbaar lichaam", herkomst: "bron", status: "vastgesteld", bron: { id: "OV", uitgever: OL.uitgever, document: OL.document, url: OL.url, passage: OL.passage, geraadpleegd: OL.geraadpleegd } } },
      geometrie: { bron: { bronId: "NE", bestand: NE1, sha256: n1.sha256, sleutel: "iso_3166_2", waarde: o.ne1, crs: "EPSG:4326" }, kaart: {} },
      relaties: [{ type: "bijzondere-gemeente-van", naar: "NLD", kwalificaties: {}, herkomst: "besluit", status: "vastgesteld", besluit: T.besluit }] });
  });
  ITEMS.unshift(kon);
  return { ITEMS: ITEMS };
}

function regel(naam, waarde) { return "export var " + naam + " = " + JSON.stringify(waarde) + ";\n"; }
export function schrijf(uit, r) {
  fs.mkdirSync(path.join(uit, "items"), { recursive: true });
  fs.writeFileSync(path.join(uit, "items", "koninkrijk.js"), "// GEGENEREERD door tools/topo/maak-koninkrijk.mjs uit tools/topo/koninkrijk.json (het Statuut) en Natural Earth (SHA-256 in tools/topo/bronnen.json); niet met de hand bewerken.\n// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.\n" + regel("KONINKRIJK", r.ITEMS));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  var r = await bouw({ ne: process.argv[2] });
  schrijf(process.argv[3], r);
  console.log(JSON.stringify(r.ITEMS.map(function(i) { return i.id + " " + i.naam.waarde; })));
}
