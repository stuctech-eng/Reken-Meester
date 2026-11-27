// Tests voor de steden aan het water (plan T5c, B3; nb17). Alleen bouwomgeving, niet in de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node --max-old-space-size=8000 test-water-steden-nl.mjs <nwb-vaarwegen-t5b3.json> <INSPIRESurfaceWaterBody.gml>
//          <top10nl-waterdeel-t5b2.json> <CBS_bevolkingskernen_2021.gpkg>
// - byte-gelijk: het script maakt opnieuw precies afgeleid/water-steden-nl.js;
// - elke relatie: toegestane soorten (relaties.js), vastgesteld en bewezen, de invoer met een SHA-256 uit het register;
// - nagerekend op een andere manier: de rivier en de rand van de bebouwing worden elke 25 m bemonsterd; de kleinste afstand tussen
//   de monsters (0 bij een monster binnen de bebouwing of het rivierwater) valt in dezelfde klasse (aan, twijfel, ver) als het
//   bestand; een paar vlak bij een grens (binnen 30 m) telt niet mee in deze vergelijking;
// - bekende gevallen: Nijmegen aan de Waal, Maastricht aan de Maas, Arnhem aan de Nederrijn, Rotterdam aan de Nieuwe Maas;
//   Rotterdam en de Lek twijfel; geen Belgische rivier;
// - mutant: een verzonnen paar (Groningen aan de Maas) wordt door de herberekening gevangen.

import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { bouw, schrijf, vormen } from "./maak-water-steden-nl.mjs";
import { leesKernen } from "./maak-steden-nl.mjs";
import { leesGeometrie } from "./bronnen/lees-gpkg.mjs";
import { binnenVlak } from "./vlakpunt.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HIER, "..", "..");
var PADEN = { nwb: process.argv[2], krw: process.argv[3], top10: process.argv[4], kernen: process.argv[5] };
var n = 0, fouten = [];
function eis(ok, t) { n++; if (!ok) fouten.push(t); }
function laad(p) { return import(pathToFileURL(path.join(ROOT, p)).href); }

var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "water-steden-"));
var R = await bouw(PADEN);
schrijf(tmp, R);
eis(fs.readFileSync(path.join(tmp, "afgeleid", "water-steden-nl.js")).equals(fs.readFileSync(path.join(ROOT, "src/core/topo/afgeleid/water-steden-nl.js"))), "byte-gelijk: afgeleid/water-steden-nl.js");
var WS = await laad("src/core/topo/afgeleid/water-steden-nl.js");
var RS = (await laad("src/core/topo/relaties.js")).RELATIES, REG = (await laad("src/core/topo/bronnen.js")).REGISTER, IX = await laad("src/core/topo/relatie-index.js");
var D = await (await laad("src/core/topo/laden.js")).laadTopo(["nlbe"]);

var slecht = [];
WS.WATER_STEDEN_NL.forEach(function(r) {
  var t = RS[r.type], b = D.item(r.van), d = D.item(r.naar);
  if (!t || !b || !d || t.bronSoorten.indexOf(b.soort) < 0 || t.doelSoorten.indexOf(d.soort) < 0 || !IX.bewezen(r, "relatie")) slecht.push(r.van + " " + r.naar);
  if (!r.afleiding.invoer.every(function(x) { var e = REG[x.bronId]; return !!e && Object.keys(e.bestanden).some(function(k) { return e.bestanden[k] === x.sha256; }); })) slecht.push("register: " + r.van + " " + r.naar);
  if (/^rivier-be-/.test(r.naar)) slecht.push("Belgisch: " + r.naar);
});
eis(slecht.length === 0, "elke relatie geldig (" + slecht.join(", ") + ")");

// herberekening met monsters
var V = await vormen(PADEN), T = V.T;
function monsters(lijnen, stap) {
  var uit = [];
  lijnen.forEach(function(l) { for (var i = 0; i + 1 < l.length; i++) { var a = l[i], b = l[i + 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.ceil(d / stap)); for (var j = 0; j < k; j++) uit.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]); } uit.push(l[l.length - 1]); });
  return uit;
}
function randen(v) { var l = v.lijnen.slice(); v.vlakken.forEach(function(d) { d.forEach(function(r) { l.push(r); }); }); return l; }
function raster(p, cel) { var g = {}; p.forEach(function(q) { var k = Math.floor(q[0] / cel) + "," + Math.floor(q[1] / cel); (g[k] = g[k] || []).push(q); }); return g; }
function kleinste(a, gB, cel, max) {
  var m = Infinity;
  a.forEach(function(q) {
    var cx = Math.floor(q[0] / cel), cy = Math.floor(q[1] / cel), r = Math.ceil(max / cel);
    for (var x = cx - r; x <= cx + r; x++) for (var y = cy - r; y <= cy + r; y++) (gB[x + "," + y] || []).forEach(function(p) { var d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < m) m = d; });
  });
  return m;
}
var K = await leesKernen(PADEN.kernen), kern = {}; (K.kernen || K).forEach(function(k) { kern[k.kernnummer] = k; });
var S = (await laad("src/core/topo/items/steden-nl.js")).STEDEN.filter(function(s) { return s.id !== "stad-nl-ijmond"; });
var paren = {};
WS.WATER_STEDEN_NL.forEach(function(r) { paren[r.van + "|" + r.naar] = "aan"; });
WS.WATER_TWIJFEL_NL.forEach(function(r) { paren[r.van + "|" + r.naar] = "twijfel"; });
var anders = [], getoetst = 0;
function klasse(d) { return d <= T.regels.ligtAanM ? "aan" : d <= T.regels.twijfelM ? "twijfel" : "ver"; }
function herbereken(sid, rid) {
  var s = S.filter(function(x) { return x.id === sid; })[0], bb = leesGeometrie(kern[s.geometrie.bron.waarde].geom), v = V.vormen[rid];
  var mb = monsters(bb.reduce(function(a, d) { return a.concat(d); }, []), 25), mr = monsters(randen(v), 25);
  if (mr.some(function(q) { return bb.some(function(d) { return binnenVlak(q, d); }); }) || mb.some(function(q) { return v.vlakken.some(function(d) { return binnenVlak(q, d); }); })) return 0;
  return kleinste(mr, raster(mb, 500), 500, T.regels.twijfelM + 500);
}
S.forEach(function(s) {
  Object.keys(V.vormen).forEach(function(rid) {
    var d = herbereken(s.id, rid), k = klasse(d), b = paren[s.id + "|" + rid] || "ver";
    if (Math.abs(d - T.regels.ligtAanM) < 30 || Math.abs(d - T.regels.twijfelM) < 30) return;
    getoetst++;
    if (k !== b) anders.push(s.id + " " + rid + ": " + Math.round(d) + " m (" + k + ", bestand " + b + ")");
  });
});
eis(getoetst > 400 && anders.length === 0, "herberekend met monsters van 25 m: dezelfde klasse (" + getoetst + " paren; " + anders.join(", ") + ")");
function is(s, r, k) { return (paren["stad-nl-" + s + "|rivier-" + r] || "ver") === k; }
eis(is("nijmegen", "waal", "aan") && is("maastricht", "maas", "aan") && is("arnhem", "nederrijn", "aan") && is("rotterdam", "nieuwe-maas", "aan") && is("rotterdam", "lek", "twijfel"), "bekende gevallen: Nijmegen, Maastricht, Arnhem, Rotterdam; Rotterdam en de Lek twijfel");
// mutant
var dm = herbereken("stad-nl-groningen", "rivier-maas");
eis(klasse(dm) !== "aan", "mutant: Groningen aan de Maas wordt door de herberekening gevangen (" + Math.round(dm) + " m)");

console.log("test-water-steden-nl: " + (fouten.length ? "FOUT" : "GOED") + ": " + (n - fouten.length) + " controles geslaagd, " + fouten.length + " mislukt");
fouten.forEach(function(f) { console.log("  - " + f); });
if (fouten.length) process.exit(1);
