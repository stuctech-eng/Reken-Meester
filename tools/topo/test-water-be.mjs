// Tests voor de rivieren en kanalen van Belgie als label-item (plan T5b-3, optie B). Alleen bouwomgeving, niet in de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node test-water-be.mjs
// - byte-gelijk: het script maakt opnieuw precies items/water-be.js;
// - elke rivier en elk kanaal van T1 par. 2.2 bestaat precies een keer in de kennisbank (nieuw of al bestaand), met die naam;
// - de nieuwe items hebben geen geometrie (A2); een kanaal ligt in Belgie, een rivier heeft geen feit land.

import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { bouw, schrijf } from "./maak-water-be.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var ROOT = path.resolve(HIER, "..", "..");
var n = 0, fouten = [];
function eis(ok, t) { n++; if (!ok) fouten.push(t); }

var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "water-be-"));
schrijf(tmp, await bouw());
eis(fs.readFileSync(path.join(tmp, "items", "water-be.js")).equals(fs.readFileSync(path.join(ROOT, "src/core/topo/items/water-be.js"))), "byte-gelijk: items/water-be.js");

var W = (await import(pathToFileURL(path.join(ROOT, "src/core/topo/items/water-be.js")).href)).WATER_BE;
var alle = W.slice();
for (var f of ["items/water-nlbe.js", "items/kanalen-nl.js"]) { var m = await import(pathToFileURL(path.join(ROOT, "src/core/topo", f)).href); Object.keys(m).forEach(function(k) { alle = alle.concat(m[k]); }); }
var T1R = ["Schelde", "Maas", "Leie", "Dender", "Durme", "Rupel", "Dijle", "Demer", "Nete", "Zenne", "IJzer", "Samber", "Ourthe", "Vesder", "Lesse", "Semois"];
var T1K = ["Albertkanaal", "Kanaal Gent-Terneuzen", "Zeekanaal Brussel-Schelde", "Kanaal Brussel-Charleroi", "Kempisch Kanaal", "Kanaal Bossuit-Kortrijk", "Kanaal Gent-Brugge"];
T1R.forEach(function(nm) { eis(alle.filter(function(x) { return x.soort === "rivier" && x.naam.waarde === nm; }).length === 1, "rivier een keer in de kennisbank: " + nm); });
T1K.forEach(function(nm) { eis(alle.filter(function(x) { return x.soort === "kanaal" && x.naam.waarde === nm; }).length === 1, "kanaal een keer in de kennisbank: " + nm); });
eis(W.length === 21, "21 nieuwe items (15 rivieren, 6 kanalen)");
W.forEach(function(x) {
  eis(x.geometrie.bron === null && /A2/.test(x.geometrie.geen), "zonder geometrie (A2): " + x.id);
  eis(x.soort === "kanaal" ? x.feiten.land.waarde === "BEL" : x.feiten.land === undefined, "land: " + x.id);
});

console.log("test-water-be: " + (fouten.length ? "FOUT" : "GOED") + ": " + (n - fouten.length) + " controles geslaagd, " + fouten.length + " mislukt");
fouten.forEach(function(f) { console.log("  - " + f); });
if (fouten.length) process.exit(1);
