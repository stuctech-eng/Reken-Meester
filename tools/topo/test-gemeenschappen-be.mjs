// Tests voor de gemeenschappen van Belgie (plan T5c, nb22). Alleen bouwomgeving, niet in de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node test-gemeenschappen-be.mjs [20250625_GRONDWET.pdf]
// - byte-gelijk: het script maakt opnieuw precies items/gemeenschappen-be.js;
// - de inhoud: 3 gemeenschappen (art. 2), 5 relaties bevoegd-in; elke gemeenschap in haar eigen taalgebied (reikwijdte taalgebied),
//   in Brussel-Hoofdstad alleen de Vlaamse en de Franse en alleen met reikwijdte instellingen; de Duitstalige niet in Brussel;
// - de Grondwet: met de PDF erbij (SHA-256 uit het register) staat elke passage letterlijk in de tekst (pdftotext, witruimte en
//   afbreekstreepjes aan het eind van een regel genormaliseerd);
// - mutanten op de tabel: een naam die niet in art. 2 staat, een onbekend taalgebied, een verkeerde reikwijdte.

import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { execFileSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";
import { bouw, schrijf } from "./maak-gemeenschappen-be.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HIER, "..", "..");
var PDF = process.argv[2];
var n = 0, fouten = [];
function eis(ok, t) { n++; if (!ok) fouten.push(t); }

var G = (await import(pathToFileURL(path.join(ROOT, "src/core/topo/items/gemeenschappen-be.js")).href)).GEMEENSCHAPPEN_BE;
var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gemeenschappen-"));
schrijf(tmp, await bouw());
eis(fs.readFileSync(path.join(tmp, "items", "gemeenschappen-be.js")).equals(fs.readFileSync(path.join(ROOT, "src/core/topo/items/gemeenschappen-be.js"))), "byte-gelijk: items/gemeenschappen-be.js");

eis(G.length === 3 && G.every(function(g) { return g.soort === "gemeenschap" && g.feiten.land.waarde === "BEL" && g.geometrie.bron === null && /A2/.test(g.geometrie.geen); }), "3 gemeenschappen in Belgie, zonder vlak (A2)");
var rel = []; G.forEach(function(g) { g.relaties.forEach(function(r) { rel.push(g.id + ">" + r.naar + ":" + r.kwalificaties.reikwijdte); }); });
eis(rel.sort().join() === "gemeenschap-be-de>taalgebied-be-de:taalgebied,gemeenschap-be-fr>taalgebied-be-bru:instellingen,gemeenschap-be-fr>taalgebied-be-fr:taalgebied,gemeenschap-be-vl>taalgebied-be-bru:instellingen,gemeenschap-be-vl>taalgebied-be-nl:taalgebied", "de 5 bevoegdheden van T1 par. 1.4 (" + rel.join(", ") + ")");

var T = JSON.parse(fs.readFileSync(path.join(HIER, "gemeenschappen-be.json"), "utf8"));
if (PDF) {
  var sha = crypto.createHash("sha256").update(fs.readFileSync(PDF)).digest("hex");
  eis(sha === T.bron.sha256, "de PDF is de Grondwet uit het register");
  function norm(s) { return s.replace(/-\s*\n\s*/g, "").replace(/\s+/g, " ").trim(); }
  var tekst = norm(execFileSync("pdftotext", ["-layout", PDF, "-"]).toString("utf8"));
  [T.gemeenschappen.passage].concat(T.bevoegd.map(function(r) { return r.passage; })).forEach(function(p) { eis(tekst.indexOf(norm(p)) >= 0, "passage letterlijk in de Grondwet: " + p.slice(0, 50)); });
} else console.log("zonder PDF: de passages zijn niet tegen de Grondwet gecontroleerd");

var TAB = path.join(HIER, "gemeenschappen-be.json"), BRON = path.join(HIER, "bronnen.json");
var tabOud = fs.readFileSync(TAB), bronOud = fs.readFileSync(BRON);
var MUT = [
  ["een naam die niet in art. 2 staat", function(t) { t.gemeenschappen.items["gemeenschap-be-de"] = "Duitse Gemeenschap"; }],
  ["een onbekend taalgebied", function(t) { t.bevoegd[4].naar = "taalgebied-be-lux"; }],
  ["een verkeerde reikwijdte", function(t) { t.bevoegd[2].reikwijdte = "gewest"; }]
];
var gevangen = 0, gemist = [];
try {
  for (var m = 0; m < MUT.length; m++) {
    var t = JSON.parse(tabOud.toString("utf8")); MUT[m][1](t);
    var tekstT = JSON.stringify(t, null, 2), shaT = crypto.createHash("sha256").update(tekstT).digest("hex");
    fs.writeFileSync(TAB, tekstT);
    fs.writeFileSync(BRON, bronOud.toString("utf8").replace(/("tools\/topo\/gemeenschappen-be.json": ")[0-9a-f]{64}"/, "$1" + shaT + "\""));
    var mod = await import(pathToFileURL(path.join(HIER, "maak-gemeenschappen-be.mjs")).href + "?m=" + m);
    var ok = false; try { await mod.bouw(); } catch (e) { ok = true; }
    if (ok) gevangen++; else gemist.push(MUT[m][0]);
  }
} finally { fs.writeFileSync(TAB, tabOud); fs.writeFileSync(BRON, bronOud); }
eis(gemist.length === 0, "mutanten gevangen: " + gemist.join(", "));

console.log("mutanten gemeenschappen-be: " + gevangen + " van " + MUT.length + " gevangen");
console.log("test-gemeenschappen-be: " + (fouten.length ? "FOUT" : "GOED") + ": " + (n - fouten.length) + " controles geslaagd, " + fouten.length + " mislukt");
fouten.forEach(function(f) { console.log("  - " + f); });
if (fouten.length) process.exit(1);
