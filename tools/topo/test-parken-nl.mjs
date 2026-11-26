// Tests voor de Nationale Parken van Nederland (plan T5b par. 3.3, B9). Alleen bouwomgeving, niet in de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node test-parken-nl.mjs <natpark.gpkg>
// - byte-gelijk: het script maakt opnieuw precies items/parken-nl.js;
// - de telling: alle 22 parken van RVO, en 22 is ook het aantal van de Rijksoverheid (Hollandse Duinen, "het 22e Nederlandse
//   nationale park", 28-04-2026): 20 eigen items en 2 streken met het feit nationaalPark (De Biesbosch, Utrechtse Heuvelrug);
// - elk park een keer: de naam van RVO, het nummer, de GEOREF naar RVO; alleen Van Gogh zonder datum (zo staat het in RVO);
// - de laag parken op de kaart nlbe: precies deze 22 items;
// - overlap tussen twee parken: gemeten en gemeld (polygon-clipping, in ha); een overlap van 1 ha of meer is een fout;
// - mutant: een streek met een park dat niet bestaat, stopt het script.

import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { fileURLToPath, pathToFileURL } from "url";
import pc from "polygon-clipping";
import { leesGpkg, leesGeometrie } from "./bronnen/lees-gpkg.mjs";
import { bouw, schrijf } from "./maak-parken-nl.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var ROOT = path.resolve(HIER, "..", "..");
var PADEN = { natpark: process.argv[2] };
var P = await import(pathToFileURL(path.join(ROOT, "src/core/topo/items/parken-nl.js")).href);
var ST = (await import(pathToFileURL(path.join(ROOT, "src/core/topo/items/streken-nl.js")).href)).STREKEN_NL;
var n = 0, fouten = [];
function eis(ok, t) { n++; if (!ok) fouten.push(t); }

var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "parken-"));
schrijf(tmp, await bouw(PADEN));
eis(fs.readFileSync(path.join(tmp, "items", "parken-nl.js")).equals(fs.readFileSync(path.join(ROOT, "src/core/topo/items/parken-nl.js"))), "byte-gelijk: items/parken-nl.js");

var p = await leesGpkg(fs.readFileSync(PADEN.natpark), "natpark", ["naam", "nr", "datum"], "geom", "naam");
eis(p.records.length === 22, "RVO heeft 22 parken (Rijksoverheid: Hollandse Duinen is het 22e)");
eis(P.PARKEN_NL.length === 20 && P.PARKEN_ALS_STREEK.length === 2, "20 eigen items en 2 parken als streek");
var opItem = {};
P.PARKEN_NL.forEach(function(it) { opItem[it.naam.waarde] = it.id; eis(it.soort === "natuurgebied" && it.geometrie.bron.bronId === "RVO" && it.geometrie.bron.waarde === it.naam.waarde && it.feiten.land.waarde === "NLD", "park als natuurgebied met GEOREF naar RVO: " + it.id); });
P.PARKEN_ALS_STREEK.forEach(function(x) { var s = ST.filter(function(y) { return y.id === x.item; })[0]; opItem[x.park] = x.item; eis(!!s && s.feiten.nationaalPark && s.feiten.nationaalPark.waarde === x.park && s.geometrie.bron.bronId === "RVO" && s.geometrie.bron.waarde === x.park, "streek met het feit nationaalPark: " + x.item); });
p.records.forEach(function(r) { eis(!!opItem[r.kenmerken.naam], "elk park van RVO is een item: " + r.kenmerken.naam); });
var zonder = P.PARKEN_NL.filter(function(it) { return !it.feiten.aangewezen; }).map(function(it) { return it.id; });
eis(zonder.join() === "park-nl-van-gogh", "alleen Van Gogh zonder datum (" + zonder.join() + ")");

var K = (await import(pathToFileURL(path.join(ROOT, "src/core/topo/kaarten/nlbe.js")).href)).default;
var lp = K.lagen.filter(function(l) { return l.id === "parken"; })[0];
eis(!!lp && lp.items.map(function(x) { return x.id; }).sort().join() === Object.keys(opItem).map(function(k) { return opItem[k]; }).sort().join(), "de laag parken op de kaart nlbe: precies de 22 parken");

function oppRing(r) { var s = 0; for (var i = 0; i + 1 < r.length; i++) s += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return s / 2; }
function opp(m) { var s = 0; m.forEach(function(q) { q.forEach(function(r, i) { s += (i ? -1 : 1) * Math.abs(oppRing(r)); }); }); return s; }
var G = p.records.map(function(r) { return { naam: r.kenmerken.naam, g: leesGeometrie(r.geom) }; }), overlap = [];
for (var i = 0; i < G.length; i++) for (var j = i + 1; j < G.length; j++) { var x = opp(pc.intersection(G[i].g, G[j].g)) / 1e4; if (x >= 0.01) overlap.push(G[i].naam + " / " + G[j].naam + ": " + x.toFixed(2) + " ha"); eis(x < 1, "geen overlap van 1 ha of meer: " + G[i].naam + " en " + G[j].naam + " (" + x.toFixed(2) + " ha)"); }
console.log("overlap tussen parken (vanaf 0,01 ha): " + (overlap.join("; ") || "geen"));

var TAB = path.join(HIER, "streken-nl.json"), BRON = path.join(HIER, "bronnen.json");
var tabOud = fs.readFileSync(TAB), bronOud = fs.readFileSync(BRON), gevangen = 0;
try {
  var t = JSON.parse(tabOud.toString("utf8")); t.streken["streek-nl-biesbosch"].park.naam = "Biesbosch";
  var tekst = JSON.stringify(t, null, 2), sha = crypto.createHash("sha256").update(tekst).digest("hex");
  fs.writeFileSync(TAB, tekst);
  fs.writeFileSync(BRON, bronOud.toString("utf8").replace(/("tools\/topo\/streken-nl.json": ")[0-9a-f]{64}"/, "$1" + sha + "\""));
  var mod = await import(pathToFileURL(path.join(HIER, "maak-parken-nl.mjs")).href + "?m=1");
  try { await mod.bouw(PADEN); } catch (e) { gevangen = 1; }
} finally { fs.writeFileSync(TAB, tabOud); fs.writeFileSync(BRON, bronOud); }
eis(gevangen === 1, "mutant gevangen: een streek met een park dat niet bestaat");

console.log("test-parken-nl: " + (fouten.length ? "FOUT" : "GOED") + ": " + (n - fouten.length) + " controles geslaagd, " + fouten.length + " mislukt");
fouten.forEach(function(f) { console.log("  - " + f); });
if (fouten.length) process.exit(1);
