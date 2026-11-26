// De kanalen van Nederland uit het NWB Vaarwegen van Rijkswaterstaat (plan T5b-3 par. 3.2; plan T1 par. 2.1). Alleen bouwomgeving.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node maak-kanalen-nl.mjs <nwb-vaarwegen-t5b3.json> <uitvoermap>
// - controleert de SHA-256 van de bundel en van kanalen-nl.json tegen het register; de bundel moet volledig zijn (elke volgende
//   pagina aanwezig) en precies het aantal vakken van het register hebben;
// - per kanaal alle vaarwegvakken met een vaarwegnaam (vwg_naam) uit de tabel; elke naam komt voor; geen vak twee keer;
// - een kanaal is een lijn; feiten: land Nederland (bron NWB) of, voor een kanaal in twee landen, grensgebied (besluit);
// - schrijft items/kanalen-nl.js; twee keer draaien geeft een byte-gelijk bestand.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { openBron } from "./bronnen/bron.mjs";
import { leesBundel } from "./bronnen/lees-bundel.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var BRONNEN = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8"));
var NWB = BRONNEN.nwbVaarwegen, REG = BRONNEN.register.ids;

function fout(t) { throw new Error(t); }

export function openNwb(pad) {
  var b = openBron(pad, "NWB", NWB.bestand);
  if (b.sha256 !== NWB.sha256) fout("SHA-256 van de NWB-bundel wijkt af van nwbVaarwegen");
  var R = leesBundel(b.buf, "vwk_id");
  if (!R.volledig) fout("NWB: de bundel mist bladzijden");
  if (R.records.length !== NWB.vakken) fout("NWB: " + R.records.length + " vakken, verwacht " + NWB.vakken);
  var per = {}; R.records.forEach(function(r) { per[String(r.kenmerken.vwk_id)] = r; });
  return { sha: b.sha256, records: R.records, per: per };
}

export function bouw(paden) {
  var N = openNwb(paden.nwb);
  var tab = openBron(path.join(HIER, "kanalen-nl.json"), "tabellenNlbe", "tools/topo/kanalen-nl.json");
  if (REG.tabellenNlbe.bestanden["tools/topo/kanalen-nl.json"] !== tab.sha256) fout("SHA-256 van kanalen-nl.json wijkt af van het register");
  var T = JSON.parse(tab.buf.toString("utf8"));
  var bronNwb = { id: "NWB", bestand: NWB.bestand, sha256: NWB.sha256, opgehaald: NWB.opgehaald };
  var gebruikt = {}, namen = {};
  var ITEMS = Object.keys(T.kanalen).sort().map(function(id) {
    var t = T.kanalen[id];
    if (namen[t.naam]) fout("naam twee keer: " + t.naam); namen[t.naam] = 1;
    var vakken = N.records.filter(function(r) { return t.nwb.indexOf(r.kenmerken.vwg_naam) >= 0; });
    t.nwb.forEach(function(n) { if (!vakken.some(function(r) { return r.kenmerken.vwg_naam === n; })) fout("NWB: geen vaarweg " + n); });
    vakken.forEach(function(r) {
      var k = String(r.kenmerken.vwk_id);
      if (gebruikt[k]) fout("NWB: vak " + k + " twee keer gebruikt"); gebruikt[k] = id;
      var g = r.geometrie.type; if (g !== "LineString" && g !== "MultiLineString") fout("NWB: vak " + k + " is geen lijn");
    });
    var ids = vakken.map(function(r) { return String(r.kenmerken.vwk_id); }).sort(function(a, b) { return Number(a) - Number(b); });
    var it = { id: id, soort: "kanaal",
      naam: { waarde: t.naam, varianten: [], herkomst: "besluit", status: "vastgesteld", besluit: T.naamBesluit, controle: { id: "NWB", waarde: t.nwb.join("; ") } },
      feiten: {},
      geometrie: { bron: { bronId: "NWB", bestand: NWB.bestand, sha256: NWB.sha256, sleutel: "vwk_id", waarden: ids, crs: "CRS84",
        aggregatie: "alle " + ids.length + " vaarwegvakken met vwg_naam " + t.nwb.join(" of ") }, kaart: {} },
      relaties: [] };
    if (t.besluit) it.feiten.afbakening = { waarde: "NWB vwg_naam: " + t.nwb.join(", "), herkomst: "besluit", status: "vastgesteld", besluit: T[t.besluit] || fout("onbekend besluit: " + t.besluit) };
    if (t.grensgebied) it.feiten.grensgebied = { waarde: t.grensgebied.landen, herkomst: "besluit", status: "vastgesteld", besluit: T[t.grensgebied.besluit] || fout("onbekend besluit: " + t.grensgebied.besluit) };
    else it.feiten.land = { waarde: "NLD", herkomst: "bron", status: "vastgesteld", bron: bronNwb };
    return it;
  });
  return { ITEMS: ITEMS };
}

function regel(naam, waarde) { return "export var " + naam + " = " + JSON.stringify(waarde) + ";\n"; }
export function schrijf(uit, r) {
  fs.mkdirSync(path.join(uit, "items"), { recursive: true });
  fs.writeFileSync(path.join(uit, "items", "kanalen-nl.js"), "// GEGENEREERD door tools/topo/maak-kanalen-nl.mjs uit tools/topo/kanalen-nl.json en het NWB Vaarwegen (SHA-256 in tools/topo/bronnen.json); niet met de hand bewerken.\n// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.\n" + regel("KANALEN_NL", r.ITEMS));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  var r = bouw({ nwb: process.argv[2] });
  schrijf(process.argv[3], r);
  console.log(JSON.stringify(r.ITEMS.map(function(i) { return i.id + " " + i.geometrie.bron.waarden.length; })));
}
