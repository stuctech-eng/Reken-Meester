// Tests voor stroomt-door, Nederlandse rivier -> provincie (plan T5c, B1 b; nb16). Alleen bouwomgeving, niet in de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node --max-old-space-size=8000 test-stroomt-door-nl.mjs <nwb-vaarwegen-t5b3.json> <INSPIRESurfaceWaterBody.gml>
//          <top10nl-waterdeel-t5b2.json> <cbsgebiedsindelingen2026.gpkg>
// - byte-gelijk: het script maakt opnieuw precies afgeleid/stroomt-door-nl.js;
// - elke relatie: toegestane soorten, vastgesteld en bewezen, de invoer met een SHA-256 uit het register;
// - nagerekend op een andere manier: de rivier bemonsterd elke 100 m (een vlak: raster van 200 m); de provincie per monster via de
//   gemeente waarin het ligt (gemeente_niet_gegeneraliseerd), met als provincie van de gemeente die waarin de meeste van haar
//   hoekpunten liggen; hetzelfde oordeel (door, twijfel, niet) voor elk paar dat minstens 2 procentpunt van 10 % en minstens
//   0,5 procentpunt van 1 % ligt;
// - bekende gevallen, ook een die niet mag (de Roer door Groningen); een verzonnen paar zou de herberekening ook vangen.

import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { bouw, schrijf, DREMPEL, TWIJFEL } from "./maak-stroomt-door-nl.mjs";
import { vormen } from "./maak-water-steden-nl.mjs";
import { leesGpkg, leesGeometrie } from "./bronnen/lees-gpkg.mjs";
import { binnenVlak } from "./vlakpunt.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HIER, "..", "..");
var PADEN = { nwb: process.argv[2], krw: process.argv[3], top10: process.argv[4], gpkg: process.argv[5] };
var n = 0, fouten = [];
function eis(ok, t) { n++; if (!ok) fouten.push(t); }
function laad(p) { return import(pathToFileURL(path.join(ROOT, p)).href); }

var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "stroomt-door-"));
var R = await bouw(PADEN);
schrijf(tmp, R);
eis(fs.readFileSync(path.join(tmp, "afgeleid", "stroomt-door-nl.js")).equals(fs.readFileSync(path.join(ROOT, "src/core/topo/afgeleid/stroomt-door-nl.js"))), "byte-gelijk: afgeleid/stroomt-door-nl.js");
var SD = await laad("src/core/topo/afgeleid/stroomt-door-nl.js");
var RS = (await laad("src/core/topo/relaties.js")).RELATIES, REG = (await laad("src/core/topo/bronnen.js")).REGISTER, IX = await laad("src/core/topo/relatie-index.js");
var D = await (await laad("src/core/topo/laden.js")).laadTopo(["nlbe"]);
var slecht = [];
SD.STROOMT_DOOR_NL.forEach(function(r) {
  var t = RS[r.type], b = D.item(r.van), d = D.item(r.naar);
  if (!t || !b || !d || t.bronSoorten.indexOf(b.soort) < 0 || t.doelSoorten.indexOf(d.soort) < 0 || !IX.bewezen(r, "relatie")) slecht.push(r.van + " " + r.naar);
  if (!r.afleiding.invoer.every(function(x) { var e = REG[x.bronId]; return !!e && Object.keys(e.bestanden).some(function(k) { return e.bestanden[k] === x.sha256; }); })) slecht.push("register: " + r.van + " " + r.naar);
});
eis(slecht.length === 0, "elke relatie geldig (" + slecht.join(", ") + ")");

// herberekening: de provincie via de gemeenten (gemeente_niet_gegeneraliseerd), de provincie van een gemeente via het
// provinciegebied (provincie_gegeneraliseerd) waarin haar binnenste punt ligt; grovere monsters
var V = await vormen(PADEN), buf = fs.readFileSync(PADEN.gpkg);
var P = await leesGpkg(buf, "provincie_gegeneraliseerd", ["statcode"], "geom", "statcode");
var prov = P.records.map(function(r) { return { id: "prov-nl-" + r.kenmerken.statcode.toLowerCase(), d: leesGeometrie(r.geom) }; });
var G = await leesGpkg(buf, "gemeente_niet_gegeneraliseerd", ["statcode"], "geom", "statcode");
var gem = G.records.map(function(r) {
  var d = leesGeometrie(r.geom), b = [Infinity, Infinity, -Infinity, -Infinity];
  d.forEach(function(p) { p[0].forEach(function(c) { b[0] = Math.min(b[0], c[0]); b[1] = Math.min(b[1], c[1]); b[2] = Math.max(b[2], c[0]); b[3] = Math.max(b[3], c[1]); }); });
  // de provincie: waar de meeste hoekpunten van de gemeente in liggen
  var tel = {}; d[0][0].forEach(function(c, i) { if (i % 5) return; prov.forEach(function(p) { if (p.d.some(function(x) { return binnenVlak(c, x); })) tel[p.id] = (tel[p.id] || 0) + 1; }); });
  var pid = Object.keys(tel).sort(function(a, z) { return tel[z] - tel[a]; })[0];
  return { d: d, b: b, p: pid };
});
function welke(q) { for (var i = 0; i < gem.length; i++) { var g = gem[i]; if (q[0] < g.b[0] || q[0] > g.b[2] || q[1] < g.b[1] || q[1] > g.b[3]) continue; if (g.d.some(function(x) { return binnenVlak(q, x); })) return g.p; } return null; }
var anders = [], getoetst = 0;
Object.keys(V.vormen).forEach(function(rid) {
  var v = V.vormen[rid], tel = {}, som = 0;
  function tik(q, w) { var p = welke(q); if (p) { tel[p] = (tel[p] || 0) + w; som += w; } }
  v.lijnen.forEach(function(l) { for (var i = 0; i + 1 < l.length; i++) { var a = l[i], b = l[i + 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.round(d / 100)); for (var j = 0; j < k; j++) tik([a[0] + (b[0] - a[0]) * (j + 0.5) / k, a[1] + (b[1] - a[1]) * (j + 0.5) / k], d / k); } });
  v.vlakken.forEach(function(dl) { var b = [Infinity, Infinity, -Infinity, -Infinity]; dl[0].forEach(function(c) { b[0] = Math.min(b[0], c[0]); b[1] = Math.min(b[1], c[1]); b[2] = Math.max(b[2], c[0]); b[3] = Math.max(b[3], c[1]); }); for (var x = b[0] + 100; x < b[2]; x += 200) for (var y = b[1] + 100; y < b[3]; y += 200) if (binnenVlak([x, y], dl)) tik([x, y], 1); });
  prov.forEach(function(p) {
    var a = (tel[p.id] || 0) / som, k = a >= DREMPEL ? "door" : a > TWIJFEL ? "twijfel" : "niet";
    var b = SD.STROOMT_DOOR_NL.some(function(r) { return r.van === rid && r.naar === p.id; }) ? "door" : SD.STROOMT_DOOR_TWIJFEL_NL.some(function(r) { return r.van === rid && r.naar === p.id; }) ? "twijfel" : "niet";
    if (Math.abs(a - DREMPEL) < 0.02 || Math.abs(a - TWIJFEL) < 0.005) return;
    getoetst++;
    if (k !== b) anders.push(rid + " " + p.id + ": " + (100 * a).toFixed(1) + " % (" + k + ", bestand " + b + ")");
  });
});
eis(getoetst > 180 && anders.length === 0, "herberekend via de gemeenten, monsters van 100 m: hetzelfde oordeel (" + getoetst + " paren; " + anders.join(", ") + ")");
function door(r, p) { return SD.STROOMT_DOOR_NL.some(function(x) { return x.van === "rivier-" + r && x.naar === p; }); }
eis(door("maas", "prov-nl-pv31") && door("maas", "prov-nl-pv30") && door("maas", "prov-nl-pv25") && door("ijssel", "prov-nl-pv23") && door("roer", "prov-nl-pv31") && !door("roer", "prov-nl-pv20"), "bekende gevallen: de Maas door Limburg, Noord-Brabant en Gelderland; de IJssel door Overijssel; de Roer door Limburg, niet door Groningen");

console.log("test-stroomt-door-nl: " + (fouten.length ? "FOUT" : "GOED") + ": " + (n - fouten.length) + " controles geslaagd, " + fouten.length + " mislukt");
fouten.forEach(function(f) { console.log("  - " + f); });
if (fouten.length) process.exit(1);
