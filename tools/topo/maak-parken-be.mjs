// De Nationale Parken van Belgie (plan T5b-3 par. 3.4; plan T1 par. 2.2). Alleen bouwomgeving.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node maak-parken-be.mjs <spw-parcs-nationaux-t5b3.json> <uitvoermap>
// - controleert de SHA-256 van de SPW-bundel en van parken-be.json tegen het register;
// - Wallonie: elk park uit de tabel is precies een perimeter van SPW met die naam (NOM_PNX), TYPE_DE_ZONE Perimetre en STATUT
//   Valide; geen perimeter van SPW blijft over; de naam in de landstaal met de vlag naamZonderNederlandseBron (T1 par. 1.3);
// - Vlaanderen: de vier parken van het Agentschap Natuur en Bos; elke naam staat letterlijk in de passage; zonder vlak (A2);
// - schrijft items/parken-be.js; twee keer draaien geeft een byte-gelijk bestand.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { openBron } from "./bronnen/bron.mjs";
import { leesBundel } from "./bronnen/lees-bundel.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var BRONNEN = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8"));
var SPW = BRONNEN.spwParcsNationaux, REG = BRONNEN.register.ids;

function fout(t) { throw new Error(t); }

export function openSpw(pad) {
  var b = openBron(pad, "SPW", SPW.bestand);
  if (b.sha256 !== SPW.sha256) fout("SHA-256 van de SPW-bundel wijkt af van spwParcsNationaux");
  var R = leesBundel(b.buf, "NOM_PNX");
  if (!R.volledig) fout("SPW: de bundel mist bladzijden");
  var per = {}; R.records.forEach(function(r) { per[r.kenmerken.NOM_PNX] = r; });
  return { sha: b.sha256, records: R.records, per: per };
}

export function bouw(paden) {
  var P = openSpw(paden.spw);
  var tab = openBron(path.join(HIER, "parken-be.json"), "tabellenNlbe", "tools/topo/parken-be.json");
  if (REG.tabellenNlbe.bestanden["tools/topo/parken-be.json"] !== tab.sha256) fout("SHA-256 van parken-be.json wijkt af van het register");
  var T = JSON.parse(tab.buf.toString("utf8"));
  var bronSpw = { id: "SPW", bestand: SPW.bestand, sha256: SPW.sha256, opgehaald: SPW.opgehaald };
  var A = T.anb, bronAnb = { id: "OV", uitgever: A.uitgever, document: A.document, url: A.url, passage: A.passage, geraadpleegd: A.geraadpleegd };
  var ITEMS = [], gebruikt = {};
  Object.keys(T.wallonie).sort().forEach(function(id) {
    var n = T.wallonie[id].spw, r = P.per[n] || fout("SPW: geen park " + n), k = r.kenmerken;
    if (k.TYPE_DE_ZONE !== "Périmètre" || k.STATUT !== "Validé") fout("SPW: " + n + " is geen gevalideerde perimeter");
    var g = r.geometrie.type; if (g !== "Polygon" && g !== "MultiPolygon") fout("SPW: " + n + " is geen vlak");
    gebruikt[n] = 1;
    ITEMS.push({ id: id, soort: "natuurgebied",
      naam: { waarde: n, varianten: [], herkomst: "bron", status: "vastgesteld", bron: bronSpw },
      feiten: {
        land: { waarde: "BEL", herkomst: "bron", status: "vastgesteld", bron: bronSpw },
        status: { waarde: "Nationaal Park", herkomst: "bron", status: "vastgesteld", bron: bronSpw },
        naamZonderNederlandseBron: { waarde: true, herkomst: "besluit", status: "vastgesteld", besluit: T.naamBesluitSpw },
        oppervlakteHa: { waarde: k.SUPERFICIE_TOTALE_HA, herkomst: "bron", status: "vastgesteld", bron: bronSpw }
      },
      geometrie: { bron: { bronId: "SPW", bestand: SPW.bestand, sha256: SPW.sha256, sleutel: "NOM_PNX", waarde: n, crs: "EPSG:4326" }, kaart: {} },
      relaties: [] });
  });
  P.records.forEach(function(r) { if (!gebruikt[r.kenmerken.NOM_PNX]) fout("SPW: park niet in de tabel: " + r.kenmerken.NOM_PNX); });
  Object.keys(T.vlaanderen).sort().forEach(function(id) {
    var v = T.vlaanderen[id];
    if (A.passage.indexOf(v.naam) < 0) fout("naam niet in de passage van het ANB: " + v.naam);
    ITEMS.push({ id: id, soort: "natuurgebied",
      naam: { waarde: v.naam, varianten: [v.variant], herkomst: "bron", status: "vastgesteld", bron: bronAnb },
      feiten: {
        land: { waarde: "BEL", herkomst: "bron", status: "vastgesteld", bron: bronAnb },
        status: { waarde: "Nationaal Park", herkomst: "bron", status: "vastgesteld", bron: bronAnb }
      },
      geometrie: { bron: null, geen: "geen openbare begrenzing gevonden (Agentschap Natuur en Bos); alleen benoemen, als label-item zonder vlak (A2)", kaart: {} },
      relaties: [] });
  });
  ITEMS.sort(function(a, b) { return a.id < b.id ? -1 : 1; });
  return { ITEMS: ITEMS };
}

function regel(naam, waarde) { return "export var " + naam + " = " + JSON.stringify(waarde) + ";\n"; }
export function schrijf(uit, r) {
  fs.mkdirSync(path.join(uit, "items"), { recursive: true });
  fs.writeFileSync(path.join(uit, "items", "parken-be.js"), "// GEGENEREERD door tools/topo/maak-parken-be.mjs uit tools/topo/parken-be.json en SPW Parcs nationaux (SHA-256 in tools/topo/bronnen.json); niet met de hand bewerken.\n// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.\n" + regel("PARKEN_BE", r.ITEMS));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  var r = bouw({ spw: process.argv[2] });
  schrijf(process.argv[3], r);
  console.log(JSON.stringify(r.ITEMS.map(function(i) { return i.id + " " + (i.geometrie.bron ? "vlak" : "label"); })));
}
