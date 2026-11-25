// De data van de iPhone-proef van T2b (fase 6.3): per kaart uit src/core/topo/kaarten een bestand in public/topoproef/data, met de
// titels en per item de naam uit de kennisbank (via KAARTREF: de item-id). Er is geen eigen namenlijst: de kennisbank is de bron.
// Alleen bouwomgeving; de proefpagina is geen deel van de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node maak-topoproef.mjs

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { pakUit } from "../../src/core/topo/kaart/bogen.js";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var ROOT = path.resolve(HIER, "..", "..");
var KAARTEN = [
  { id: "nlbe", titel: "Nederland en België" },
  { id: "europa", titel: "Europa" }
];
var BEELDTITEL = { west: "West en midden", zuidoost: "Zuidoost", noordoost: "Noordoost", kaukasus: "Kaukasus" };
var LAAGTITEL = { "provincies-nl": "Provincies (Nederland)", "provincies-be": "Provincies (België)", gewesten: "Gewesten (België)", taalgebieden: "Taalgebieden (België)", grensgemeenten: "Grensgemeenten (Nederland)", streken: "Streken (Nederland)", grenspunten: "Grenspunten", baarle: "Enclavegebied Baarle", steden: "Steden", rivieren: "Rivieren", waddeneilanden: "Waddeneilanden", landen: "Landen" };
var ITEMS = ["items/landen.js", "items/steden-nl.js", "items/provincies.js", "items/gewesten.js", "items/steden-be.js", "items/water-nlbe.js", "items/eilanden-nl.js", "items/taalgebieden.js", "items/gemeenten-nl.js", "items/streken-nl.js", "items/grensgebieden.js"];

function fout(t) { throw new Error(t); }
var KB = {};
for (var i = 0; i < ITEMS.length; i++) {
  var m = await import(pathToFileURL(path.join(ROOT, "src/core/topo", ITEMS[i])).href);
  Object.keys(m).forEach(function(k) { if (Array.isArray(m[k])) m[k].forEach(function(it) { if (it && it.geometrie && it.naam) KB[it.id] = it; }); });
}
var uit = path.join(ROOT, "public/topoproef/data");
fs.mkdirSync(uit, { recursive: true });
for (var j = 0; j < KAARTEN.length; j++) {
  var k = KAARTEN[j], bron = path.join(ROOT, "src/core/topo/kaarten", k.id + ".js");
  var K = pakUit((await import(pathToFileURL(bron).href)).default);   // plan T3 par. 3.5: de proef krijgt de T2a-vorm
  K.titel = k.titel;
  (K.startbeelden || []).forEach(function(sb) { sb.titel = BEELDTITEL[sb.id] || fout("geen titel voor startbeeld " + sb.id); });
  K.lagen.forEach(function(l) {
    l.titel = LAAGTITEL[l.id] || fout("geen laagtitel voor " + l.id);
    l.items.forEach(function(x) { var it = KB[x.id] || fout("KAARTREF: " + x.id + " niet in de kennisbank"); x.naam = it.naam.waarde; });
  });
  fs.writeFileSync(path.join(uit, k.id + ".js"), "// GEGENEREERD door tools/topo/maak-topoproef.mjs uit de kaart " + k.id + " (kaartVersie " + K.kaartVersie + ") en de namen uit de kennisbank; niet met de hand bewerken.\n// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.\nexport default " + JSON.stringify(K) + ";\n");
  console.log(k.id + ": " + K.lagen.map(function(l) { return l.id + " " + l.items.length; }).join(", "));
}
