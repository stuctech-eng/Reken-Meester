// Tests voor het Koninkrijk der Nederlanden (plan T5b par. 3.5, B3). Alleen bouwomgeving, niet in de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node test-koninkrijk.mjs <map NE>
// - byte-gelijk: het script maakt opnieuw precies items/koninkrijk.js;
// - de inhoud: het Koninkrijk omvat precies Nederland, Aruba, Curacao en Sint Maarten (Statuut art. 1, lid 1); Bonaire, Sint
//   Eustatius en Saba zijn bijzondere-gemeente-van Nederland en liggen in Nederland (lid 2);
// - de kaart koninkrijk: de zes gebieden als doel, elk in precies een startbeeld; het Koninkrijk zelf niet;
// - mutanten op de tabel: een naam die niet in de passage staat, of een NE-code die niet bestaat, stopt het script.

import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { fileURLToPath, pathToFileURL } from "url";
import { bouw, schrijf } from "./maak-koninkrijk.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var ROOT = path.resolve(HIER, "..", "..");
var PADEN = { ne: process.argv[2] };
var KN = (await import(pathToFileURL(path.join(ROOT, "src/core/topo/items/koninkrijk.js")).href)).KONINKRIJK;
var n = 0, fouten = [];
function eis(ok, t) { n++; if (!ok) fouten.push(t); }

var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "koninkrijk-"));
schrijf(tmp, await bouw(PADEN));
eis(fs.readFileSync(path.join(tmp, "items", "koninkrijk.js")).equals(fs.readFileSync(path.join(ROOT, "src/core/topo/items/koninkrijk.js"))), "byte-gelijk: items/koninkrijk.js");

var per = {}; KN.forEach(function(it) { per[it.id] = it; });
var omvat = per["gebied-koninkrijk"].relaties.filter(function(r) { return r.type === "koninkrijk-omvat"; }).map(function(r) { return r.naar; }).sort();
eis(omvat.join() === "NLD,gebied-aruba,gebied-curacao,gebied-sint-maarten", "het Koninkrijk omvat Nederland, Aruba, Curacao en Sint Maarten (" + omvat.join() + ")");
["gebied-bonaire", "gebied-sint-eustatius", "gebied-saba"].forEach(function(id) {
  var it = per[id];
  eis(!!it && it.feiten.land.waarde === "NLD" && it.relaties.length === 1 && it.relaties[0].type === "bijzondere-gemeente-van" && it.relaties[0].naar === "NLD", "openbaar lichaam van Nederland: " + id);
});
["gebied-aruba", "gebied-curacao", "gebied-sint-maarten"].forEach(function(id) { eis(!!per[id] && per[id].feiten.land === undefined && per[id].relaties.length === 0, "land binnen het Koninkrijk zonder landrelatie: " + id); });

var K = (await import(pathToFileURL(path.join(ROOT, "src/core/topo/kaarten/koninkrijk.js")).href)).default;
var doelen = []; K.lagen.forEach(function(l) { l.items.forEach(function(x) { doelen.push(x.id); }); });
eis(doelen.slice().sort().join() === KN.filter(function(x) { return x.id !== "gebied-koninkrijk"; }).map(function(x) { return x.id; }).sort().join(), "de kaart koninkrijk heeft precies de zes gebieden als doel");
doelen.forEach(function(id) { eis((K.startbeelden || []).filter(function(sb) { return sb.doelen.indexOf(id) >= 0; }).length === 1, "in precies een startbeeld: " + id); });

var TAB = path.join(HIER, "koninkrijk.json"), BRON = path.join(HIER, "bronnen.json");
var tabOud = fs.readFileSync(TAB), bronOud = fs.readFileSync(BRON);
var MUT = [
  ["een naam die niet in het Statuut staat", function(t) { t.landen["gebied-curacao"].naam = "Curaçao en Klein Curaçao"; }],
  ["een NE-code die niet bestaat", function(t) { t.landen["gebied-aruba"].ne = "ARU"; }],
  ["een verkeerde admin_1-naam", function(t) { t.openbareLichamen["gebied-saba"].neNaam = "Sabá"; }]
];
var gevangen = 0, gemist = [];
try {
  for (var i = 0; i < MUT.length; i++) {
    var t = JSON.parse(tabOud.toString("utf8")); MUT[i][1](t);
    var tekst = JSON.stringify(t, null, 2), sha = crypto.createHash("sha256").update(tekst).digest("hex");
    fs.writeFileSync(TAB, tekst);
    fs.writeFileSync(BRON, bronOud.toString("utf8").replace(/("tools\/topo\/koninkrijk.json": ")[0-9a-f]{64}"/, "$1" + sha + "\""));
    var mod = await import(pathToFileURL(path.join(HIER, "maak-koninkrijk.mjs")).href + "?m=" + i);
    var ok = false; try { await mod.bouw(PADEN); } catch (e) { ok = true; }
    if (ok) gevangen++; else gemist.push(MUT[i][0]);
  }
} finally { fs.writeFileSync(TAB, tabOud); fs.writeFileSync(BRON, bronOud); }
eis(gemist.length === 0, "mutanten gevangen: " + gemist.join(", "));

console.log("mutanten koninkrijk: " + gevangen + " van " + MUT.length + " gevangen");
console.log("test-koninkrijk: " + (fouten.length ? "FOUT" : "GOED") + ": " + (n - fouten.length) + " controles geslaagd, " + fouten.length + " mislukt");
fouten.forEach(function(f) { console.log("  - " + f); });
if (fouten.length) process.exit(1);
