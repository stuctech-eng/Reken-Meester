// Tests voor de vier taalgebieden van Belgie (plan T5b par. 3.8, B6). Alleen bouwomgeving, niet in de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node --max-old-space-size=6000 test-taalgebieden-be.mjs <TU_COM_REFNIS.txt> <sectoren.geojson> [Justel_databank.pdf]
// - byte-gelijk: het script maakt opnieuw precies items/taalgebieden.js;
// - de wet: met de PDF erbij staat elke passage van taalgebieden-be.json letterlijk in de tekst (pdftotext, witruimte genormaliseerd);
// - onafhankelijk van de regel van het script:
//   Duits = precies de 9 Duitstalige gemeenten (Eupen, Kelmis, Lontzen, Raeren, Amel, Bullingen, Burg-Reuland, Butgenbach, Sankt Vith);
//   Nederlands = het Vlaams Gewest, Frans + Duits = het Waals Gewest, Brussel-Hoofdstad = het Brussels Hoofdstedelijk Gewest
//   (de gewestcode van elke sector); elke sector in precies een taalgebied;
//   de 11 Belgische steden liggen in het taalgebied van hun gewest;
// - mutanten op de tabel: elke afwijking van de wet stopt het script.

import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";
import { openBron } from "./bronnen/bron.mjs";
import { leesGeojson } from "./bronnen/lees-geojson.mjs";
import { leesRefnis } from "./maak-bestuur-nlbe.mjs";
import { bouw, schrijf, deel, leesGemeenten } from "./maak-taalgebieden-be.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var ROOT = path.resolve(HIER, "..", "..");
var REFNIS = process.argv[2], SECT = process.argv[3], PDF = process.argv[4];
var BRONNEN = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8"));
var T = JSON.parse(fs.readFileSync(path.join(HIER, "taalgebieden-be.json"), "utf8"));
var TG = (await import(pathToFileURL(path.join(ROOT, "src/core/topo/items/taalgebieden.js")).href)).TAALGEBIEDEN;
var SBE = (await import(pathToFileURL(path.join(ROOT, "src/core/topo/items/steden-be.js")).href)).STEDEN_BE;
function kopie(x) { return JSON.parse(JSON.stringify(x)); }

var n = 0, fouten = [];
function eis(ok, t) { n++; if (!ok) fouten.push(t); }

// ---- byte-gelijk ----
var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "taalgebieden-"));
var r = await bouw({ refnis: REFNIS, sectoren: SECT });
schrijf(tmp, r);
var opnieuw = fs.readFileSync(path.join(tmp, "items", "taalgebieden.js"));
eis(opnieuw.equals(fs.readFileSync(path.join(ROOT, "src/core/topo/items/taalgebieden.js"))), "byte-gelijk: items/taalgebieden.js");

// ---- de wet ----
// witruimte als een spatie; een afbreekstreepje aan het eind van een regel blijft, zonder de witruimte erna (Brussel-|Hoofdstad)
function norm(s) { return s.replace(/\s+/g, " ").replace(/- /g, "-").trim(); }
if (PDF) {
  var pb = openBron(PDF, "OV", T.bron.bestand);
  eis(pb.sha256 === T.bron.sha256, "de PDF heeft de SHA-256 van de tabel");
  var tekst = norm(execFileSync("pdftotext", ["-layout", PDF, "-"]).toString("utf8").replace(/\n\s*:\s*\n/g, "\n"));
  var passages = [T.indeling.passage].concat(Object.keys(T.gebieden).map(function(k) { return T.gebieden[k].passage; }));
  passages.forEach(function(p) {
    // een passage kan over regels lopen; de genummerde onderdelen (1°, 2°) staan op een eigen regel
    eis(tekst.indexOf(norm(p)) >= 0, "passage letterlijk in de wet: " + p.slice(0, 50));
  });
} else console.log("zonder PDF: de passages zijn niet tegen de wet gecontroleerd");

// ---- onafhankelijk: de gewestcode van elke sector ----
var g = leesGeojson(openBron(SECT, "STB", BRONNEN.statbel.sectoren.geojson.bestand).buf, ["cd_sector", "cd_munty_refnis", "cd_rgn_refnis"]);
var perId = {}; TG.forEach(function(it) { perId[it.id] = it; });
eis(TG.length === 4 && ["taalgebied-be-bru", "taalgebied-be-de", "taalgebied-be-fr", "taalgebied-be-nl"].every(function(id) { return !!perId[id]; }), "vier taalgebieden");
var DUITS = ["63001", "63012", "63013", "63023", "63040", "63048", "63061", "63067", "63087"];
eis(perId["taalgebied-be-de"].geometrie.bron.waarden.join() === DUITS.join(), "Duits = precies de 9 Duitstalige gemeenten");
var GEWEST = { "taalgebied-be-nl": ["02000"], "taalgebied-be-fr": ["03000"], "taalgebied-be-de": ["03000"], "taalgebied-be-bru": ["04000"] };
var teller = { per: {}, nul: 0, dubbel: 0, verkeerd: 0 };
g.records.forEach(function(s) {
  var k = s.kenmerken, in_ = TG.filter(function(it) { return it.geometrie.bron.waarden.indexOf(k.cd_munty_refnis) >= 0; });
  if (in_.length === 0) teller.nul++;
  else if (in_.length > 1) teller.dubbel++;
  else { teller.per[in_[0].id] = (teller.per[in_[0].id] || 0) + 1; if (GEWEST[in_[0].id].indexOf(k.cd_rgn_refnis) < 0) teller.verkeerd++; }
});
eis(teller.nul === 0 && teller.dubbel === 0, "elke sector in precies een taalgebied (" + teller.nul + " in geen, " + teller.dubbel + " in twee)");
eis(teller.verkeerd === 0, "elke sector in het taalgebied van zijn gewest (" + teller.verkeerd + " afwijkend)");
var aantal = {}; g.records.forEach(function(s) { aantal[s.kenmerken.cd_rgn_refnis] = (aantal[s.kenmerken.cd_rgn_refnis] || 0) + 1; });
eis(teller.per["taalgebied-be-nl"] === aantal["02000"] && teller.per["taalgebied-be-bru"] === aantal["04000"] && teller.per["taalgebied-be-fr"] + teller.per["taalgebied-be-de"] === aantal["03000"], "Nederlands = Vlaams Gewest, Brussel-Hoofdstad = Brussels Gewest, Frans + Duits = Waals Gewest (sectoren)");
TG.forEach(function(it) { eis(it.feiten.aantalGemeenten.waarde === it.geometrie.bron.waarden.length, "aantalGemeenten gelijk aan de GEOREF: " + it.id); });
// de 11 steden: het taalgebied van hun gewest
var VERW = { "stad-be-brussel": "taalgebied-be-bru", "stad-be-antwerpen": "taalgebied-be-nl", "stad-be-gent": "taalgebied-be-nl", "stad-be-brugge": "taalgebied-be-nl", "stad-be-hasselt": "taalgebied-be-nl", "stad-be-leuven": "taalgebied-be-nl", "stad-be-bergen": "taalgebied-be-fr", "stad-be-luik": "taalgebied-be-fr", "stad-be-aarlen": "taalgebied-be-fr", "stad-be-namen": "taalgebied-be-fr", "stad-be-waver": "taalgebied-be-fr" };
SBE.forEach(function(s) {
  var c = s.feiten.refnis.waarde, t = TG.filter(function(it) { return it.geometrie.bron.waarden.indexOf(c) >= 0; }).map(function(it) { return it.id; });
  eis(t.length === 1 && t[0] === VERW[s.id], "stad in zijn taalgebied: " + s.id + " (" + t.join() + ")");
});

// ---- mutanten: de tabel wijkt af van de wet ----
var RF = leesRefnis(openBron(REFNIS, "STB", BRONNEN.statbel.refnis.txt.bestand).buf);
var GEM = leesGemeenten(openBron(SECT, "STB", BRONNEN.statbel.sectoren.geojson.bestand).buf);
var MUT = [
  ["een Duitse deelgemeente weg (Recht)", function(t) { var d = t.gebieden["taalgebied-be-de"]; d.deelgemeenten = d.deelgemeenten.filter(function(x) { return x !== "Recht"; }); }],
  ["geen spelling voor Kalmis", function(t) { delete t.gebieden["taalgebied-be-de"].spelling.Kalmis; }],
  ["geen spelling Schonberg", function(t) { t.gebieden["taalgebied-be-de"].spelling.Schoenberg = ["Schoenberg"]; }],
  ["een niet-Duitse naam bij art. 5 (Malmedy)", function(t) { t.gebieden["taalgebied-be-de"].deelgemeenten.push("Malmedy"); }],
  ["het arrondissement Leuven vergeten", function(t) { t.gebieden["taalgebied-be-nl"].arrondissementen = ["Halle-Vilvoorde"]; }],
  ["Luik zonder uitzondering", function(t) { delete t.gebieden["taalgebied-be-fr"].behalve; }],
  ["een onbekende provincie", function(t) { t.gebieden["taalgebied-be-nl"].provincies.push("Brabant"); }],
  ["een Brusselse gemeente weg", function(t) { t.gebieden["taalgebied-be-bru"].gemeenten.pop(); }],
  ["een verkeerde Brusselse naam", function(t) { t.gebieden["taalgebied-be-bru"].gemeenten[0] = "Anderlecht-Centrum"; }]
];
var gevangen = 0, gemist = [];
MUT.forEach(function(m) {
  var t = kopie(T); m[1](t);
  var ok = false; try { deel(t, RF, GEM); } catch (e) { ok = true; }
  if (ok) gevangen++; else gemist.push(m[0]);
});
eis(gemist.length === 0, "mutanten gevangen: " + gemist.join(", "));
// de echte tabel geeft geen fout
var goed = true; try { deel(kopie(T), RF, GEM); } catch (e) { goed = false; }
eis(goed, "de tabel zelf geeft geen fout");

console.log("mutanten taalgebieden: " + gevangen + " van " + MUT.length + " gevangen");
console.log("test-taalgebieden-be: " + (fouten.length ? "FOUT" : "GOED") + ": " + (n - fouten.length) + " controles geslaagd, " + fouten.length + " mislukt");
fouten.forEach(function(f) { console.log("  - " + f); });
if (fouten.length) process.exit(1);
