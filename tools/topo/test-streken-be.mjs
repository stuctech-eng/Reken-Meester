// Tests voor de Belgische streken uit de landbouwstreken (KB 1951; plan T5b-3 par. 3.3). Alleen bouwomgeving, niet in de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node test-streken-be.mjs <Lbstrbel.gpkg> <map NE>
// - byte-gelijk: het script maakt opnieuw precies items/streken-be.js;
// - de inhoud: Kempen, Condroz, Famenne en Ardennen (Ardennen en Hoge Ardennen samen); alle in Belgie;
// - nagerekend: het binnenste punt van elke streek ligt in het NE-vlak van Belgie; geen twee streken overlappen (polygon-clipping,
//   kleiner dan 1 ha); de Henegouwse Kempen hoort niet bij de Kempen;
// - de kaart nlbe: de laag streken-be heeft de 4 streken;
// - mutanten: een landbouwstreek die niet bestaat, een landbouwstreek twee keer.

import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { fileURLToPath, pathToFileURL } from "url";
import pc from "polygon-clipping";
import { leesGpkg, leesGeometrie } from "./bronnen/lees-gpkg.mjs";
import { binnenVlak, pool } from "./vlakpunt.mjs";
import { oppM2 } from "./maak-water-nlbe.mjs";
import { bouw, schrijf } from "./maak-streken-be.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var ROOT = path.resolve(HIER, "..", "..");
var PADEN = { lbs: process.argv[2] }, NE = process.argv[3];
var ST = (await import(pathToFileURL(path.join(ROOT, "src/core/topo/items/streken-be.js")).href)).STREKEN_BE;
var n = 0, fouten = [];
function eis(ok, t) { n++; if (!ok) fouten.push(t); }

var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "streken-be-"));
schrijf(tmp, await bouw(PADEN));
eis(fs.readFileSync(path.join(tmp, "items", "streken-be.js")).equals(fs.readFileSync(path.join(ROOT, "src/core/topo/items/streken-be.js"))), "byte-gelijk: items/streken-be.js");

eis(ST.map(function(s) { return s.naam.waarde; }).sort().join() === "Ardennen,Condroz,Famenne,Kempen", "de 4 streken met een officiele grens");
eis(ST.every(function(s) { return s.soort === "streek" && s.feiten.land.waarde === "BEL"; }), "alle in Belgie");
var per = {}; ST.forEach(function(s) { per[s.id] = s; });
eis(per["streek-be-ardennen"].geometrie.bron.waarden.join() === "Ardennen,Hoge Ardennen", "Ardennen = Ardennen en Hoge Ardennen");
eis(per["streek-be-kempen"].geometrie.bron.waarden.join() === "Kempen", "de Kempen zonder de Henegouwse Kempen");

var g = await leesGpkg(fs.readFileSync(PADEN.lbs), "Lbstrbel", ["NAAM"], "SHAPE", "NAAM"), lbs = {};
g.records.forEach(function(r) { lbs[r.kenmerken.NAAM] = leesGeometrie(r.geom); });
var belDelen = []; JSON.parse(fs.readFileSync(path.join(NE, "ne_10m_admin_0_map_units.geojson"), "utf8")).features.filter(function(f) { return f.properties.ADM0_A3 === "BEL"; }).forEach(function(f) { belDelen = belDelen.concat(f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates); });
var V = ST.map(function(s) { var d = []; s.geometrie.bron.waarden.forEach(function(k) { d = d.concat(lbs[k]); }); return { id: s.id, d: d }; });
V.forEach(function(v) {
  var groot = v.d.slice().sort(function(a, b) { return oppM2([b]) - oppM2([a]); })[0], pl = pool(groot, 0.0001);
  eis(belDelen.some(function(q) { return binnenVlak([pl.x, pl.y], q); }), "in Belgie: " + v.id + " (" + Math.round(oppM2(v.d) / 1e6) + " km2)");
});
for (var i = 0; i < V.length; i++) for (var j = i + 1; j < V.length; j++) { var x = oppM2(pc.intersection(V[i].d, V[j].d)) / 1e4; eis(x < 1, "geen overlap " + V[i].id + " en " + V[j].id + " (" + x.toFixed(2) + " ha)"); }

var K = (await import(pathToFileURL(path.join(ROOT, "src/core/topo/kaarten/nlbe.js")).href)).default;
var lb = K.lagen.filter(function(l) { return l.id === "streken-be"; })[0];
eis(!!lb && lb.items.map(function(x) { return x.id; }).sort().join() === ST.map(function(s) { return s.id; }).sort().join(), "de kaart nlbe: de laag streken-be met de 4 streken");

var TAB = path.join(HIER, "streken-be.json"), BRON = path.join(HIER, "bronnen.json");
var tabOud = fs.readFileSync(TAB), bronOud = fs.readFileSync(BRON);
var MUT = [
  ["een landbouwstreek die niet bestaat", function(t) { t.streken["streek-be-condroz"].lbs = ["Condros"]; }],
  ["een landbouwstreek twee keer", function(t) { t.streken["streek-be-condroz"].lbs = ["Kempen"]; }]
];
var gevangen = 0, gemist = [];
try {
  for (var m = 0; m < MUT.length; m++) {
    var t = JSON.parse(tabOud.toString("utf8")); MUT[m][1](t);
    var tekst = JSON.stringify(t, null, 2), sha = crypto.createHash("sha256").update(tekst).digest("hex");
    fs.writeFileSync(TAB, tekst);
    fs.writeFileSync(BRON, bronOud.toString("utf8").replace(/("tools\/topo\/streken-be.json": ")[0-9a-f]{64}"/, "$1" + sha + "\""));
    var mod = await import(pathToFileURL(path.join(HIER, "maak-streken-be.mjs")).href + "?m=" + m);
    var ok = false; try { await mod.bouw(PADEN); } catch (e) { ok = true; }
    if (ok) gevangen++; else gemist.push(MUT[m][0]);
  }
} finally { fs.writeFileSync(TAB, tabOud); fs.writeFileSync(BRON, bronOud); }
eis(gemist.length === 0, "mutanten gevangen: " + gemist.join(", "));

console.log("mutanten streken-be: " + gevangen + " van " + MUT.length + " gevangen");
console.log("test-streken-be: " + (fouten.length ? "FOUT" : "GOED") + ": " + (n - fouten.length) + " controles geslaagd, " + fouten.length + " mislukt");
fouten.forEach(function(f) { console.log("  - " + f); });
if (fouten.length) process.exit(1);
