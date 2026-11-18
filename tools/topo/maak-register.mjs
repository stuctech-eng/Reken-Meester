// Het bronregister van de kennisbank (bouwplan T2b-2 fase 6.1 v1.9, par. 2). Alleen bouwomgeving, niet in de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node maak-register.mjs <uitvoermap>
// Neemt het blok "register" van bronnen.json letterlijk over in src/core/topo/bronnen.js. Er wordt niets aangevuld:
// een bron-id dat elders wordt gebruikt maar hier niet staat, laat de tests falen. Bestanden in de repository worden
// gecontroleerd op hun SHA-256; een afwijking stopt het script.

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var ROOT = path.resolve(HIER, "..", "..");
var UIT = process.argv[2];
var BRONNEN = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8"));
var REG = BRONNEN.register;
if (!REG || !REG.ids) throw new Error("bronnen.json heeft geen blok register");

Object.keys(REG.ids).forEach(function(id) {
  var r = REG.ids[id];
  if (!r.titel || !Array.isArray(r.soort) || !r.soort.length || typeof r.bestanden !== "object") throw new Error("register onvolledig: " + id);
  Object.keys(r.bestanden).forEach(function(b) {
    if (!/^[0-9a-f]{64}$/.test(r.bestanden[b])) throw new Error("geen geldige SHA-256 voor " + id + " " + b);
    if (b.indexOf("tools/") === 0) {
      var sha = crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, b))).digest("hex");
      if (sha !== r.bestanden[b]) throw new Error("SHA-256 klopt niet voor " + b);
    }
  });
});

var tekst = "// GEGENEREERD door tools/topo/maak-register.mjs uit tools/topo/bronnen.json (blok register); niet met de hand bewerken.\n" +
  "// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.\n" +
  "export var REGISTER = " + JSON.stringify(REG.ids) + ";\n";
fs.mkdirSync(UIT, { recursive: true });
fs.writeFileSync(path.join(UIT, "bronnen.js"), tekst);
console.log(JSON.stringify({ ids: Object.keys(REG.ids) }));
