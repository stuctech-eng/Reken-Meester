// Test van de geborgde tik-meet (bouwplan T2b-2 fase 6.1 v1.13, par. 6). Alleen bouwomgeving, niet in de app.
// Een meting in Node vervangt de iPhone-controle niet (plan v2 par. 5.6).
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node test-tik-meet.mjs <oud-ind.mjs> <oud-tik-meet.mjs> <werkmap>
//   <oud-ind.mjs>, <oud-tik-meet.mjs>: de T2a-referentiebestanden (ind.mjs en tik-meet.mjs), naast elkaar in een map
//   <werkmap>: een lege map voor de verslagen
// Delen: 1 SHA's van T2a, 2 statisch, 3 vergelijking van de twee tikregels met verschilmutanten, 4 middelpunten,
// 5 oud tegen nieuw per schermbreedte (byte-gelijk), 6 de T2a-criteria op het verslag.
// Met DELEN=56 draaien alleen 1, 2, 5 en 6 (om na een onderbreking de rastervergelijking niet te herhalen).

import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { spawn } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";
import * as IND from "./tik-onafhankelijk.mjs";
import * as TR from "../../public/kaartproef/tikregel.js";
import { PROEFKAARTEN, laadKaarten } from "./tik-meet.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var ROOT = path.resolve(HIER, "..", "..");
var OUD_IND = process.argv[2], OUD_MEET = process.argv[3], WERK = process.argv[4];
var SHA_IND = "71001f6e314c2c33e300502ef9cb996f7733d63a86cad2851b8477ff10925fac";
var SHA_MEET = "347e5c6af4ca6caa681d8aef613005741dd48983af6bd02da82dfd536510fed0";
var SCHERMEN = [320, 375, 390, 428], Z = [1, 2, 4, 8];
var UITZONDERING_X8 = { "proef-europa|GGY": 1, "proef-europa|JEY": 1 };   // T2a aanvulling par. 2: Guernsey en Jersey pas bij x8
var fouten = [], n = 0;
function eis(ok, tekst) { n++; if (!ok) fouten.push(tekst); }
function sha(p) { return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex"); }
function stop(tekst) { console.log("STOP: " + tekst); process.exit(2); }

// ---- 1. SHA's van de T2a-referentiebestanden ----
if (!OUD_IND || !OUD_MEET || !WERK) stop("gebruik: node test-tik-meet.mjs <oud-ind.mjs> <oud-tik-meet.mjs> <werkmap>");
if (path.dirname(path.resolve(OUD_IND)) !== path.dirname(path.resolve(OUD_MEET))) stop("ind.mjs en tik-meet.mjs moeten in dezelfde map staan");
var si = sha(OUD_IND), sm = sha(OUD_MEET);
console.log("T2a ind.mjs " + path.resolve(OUD_IND) + " sha256 " + si);
console.log("T2a tik-meet.mjs " + path.resolve(OUD_MEET) + " sha256 " + sm);
if (si !== SHA_IND) stop("SHA van ind.mjs wijkt af");
if (sm !== SHA_MEET) stop("SHA van tik-meet.mjs wijkt af");
fs.mkdirSync(WERK, { recursive: true });

// ---- 2. statisch: de onafhankelijke regel importeert niets ----
var bronInd = fs.readFileSync(path.join(HIER, "tik-onafhankelijk.mjs"), "utf8");
eis(!/\bimport\b/.test(bronInd.replace(/\/\/.*$/gm, "")), "tik-onafhankelijk.mjs importeert niets");
eis(!/kaartproef|tikregel|tik-meet/.test(bronInd.replace(/\/\/.*$/gm, "")), "tik-onafhankelijk.mjs noemt kaartproef, tikregel of tik-meet niet buiten commentaar");
var bronMeet = fs.readFileSync(path.join(HIER, "tik-meet.mjs"), "utf8");
var imp = (bronMeet.match(/^import .* from "([^"]+)";$/gm) || []).map(function(r) { return r.match(/from "([^"]+)"/)[1]; });
eis(JSON.stringify(imp) === JSON.stringify(["fs", "path", "url", "./tik-onafhankelijk.mjs"]), "tik-meet.mjs importeert alleen fs, path, url en tik-onafhankelijk.mjs (" + imp.join(", ") + ")");
eis(!/tikregel/.test(bronMeet.replace(/\/\/.*$/gm, "")), "tik-meet.mjs gebruikt tikregel.js niet");
[bronInd, bronMeet].forEach(function(b, i) { eis(b.indexOf(String.fromCharCode(96)) < 0, "geen backticks in " + (i ? "tik-meet.mjs" : "tik-onafhankelijk.mjs")); });

var ALLES = process.env.DELEN !== "56";
// ---- 3. vergelijking van de twee tikregels per rasterpunt ----
var KAARTEN = await laadKaarten(ROOT, PROEFKAARTEN);
function beeldMidden(K, z, BREED) {
  var w = (K.beeld || K.breedte) / z, h = K.hoogte / z, c = [K.breedte / 2, K.hoogte / 2];
  var x = Math.min(Math.max(c[0] - w / 2, 0), K.breedte - w), y = Math.min(Math.max(c[1] - h / 2, 0), K.hoogte - h);
  return { x: x, y: y, w: w, h: h, s: BREED / w };
}
function uitkomstTR(r) {
  if (r.uitkomst === "geen") return { id: "", k: [] };
  var k = r.kandidaten.map(function(c) { return c.doel.id; }).sort();
  return { id: r.uitkomst === "gekozen" ? r.doel.id : "?", k: r.uitkomst === "twijfel" ? k : [] };
}
function uitkomstIND(r) { return { id: r.id, k: r.id === "?" ? r.kandidaten.slice().sort() : [] }; }
function vergelijk(tr, ind) {
  var punten = 0, verschil = 0, voorbeeld = null, per = {};
  KAARTEN.forEach(function(kaart) {
    var K = kaart.K;
    per[kaart.naam] = 0;
    K.lagen.forEach(function(laag) {
      var dTR = tr.maakDoelen(laag), dIND = ind.doelenVan(laag);
      SCHERMEN.forEach(function(scherm) {
        Z.forEach(function(z) {
          var b = beeldMidden(K, z, scherm - 32), s = b.s, x0 = b.x * s, y0 = b.y * s, x1 = x0 + b.w * s, y1 = y0 + b.h * s;
          var relIND = ind.relevant(dIND, s, x0, y0, x1, y1), ids = {};
          relIND.forEach(function(d) { ids[d.id] = 1; });
          var relTR = dTR.filter(function(d) { return ids[d.id]; });
          for (var y = y0; y <= y1; y += 2) for (var x = x0; x <= x1; x += 2) {
            var a = uitkomstTR(tr.beslis(relTR, s, x, y)), c = uitkomstIND(ind.besluitMet(relIND, s, x, y));
            punten++; per[kaart.naam]++;
            if (a.id !== c.id || a.k.join(",") !== c.k.join(",")) {
              verschil++;
              if (!voorbeeld) voorbeeld = kaart.naam + " laag " + laag.id + " scherm " + scherm + " x" + z + " punt (" + x.toFixed(1) + ", " + y.toFixed(1) + "): tikregel " + JSON.stringify(a) + ", onafhankelijk " + JSON.stringify(c);
            }
          }
        });
      });
    });
  });
  return { punten: punten, verschil: verschil, voorbeeld: voorbeeld, per: per };
}
if (ALLES) {
var echt = vergelijk(TR, IND);
console.log("vergelijking tikregel.beslis en tik-onafhankelijk.besluit: " + echt.punten + " rasterpunten (" + Object.keys(echt.per).map(function(k) { return k + " " + echt.per[k]; }).join(", ") + "), " + echt.verschil + " verschillen");
eis(echt.punten > 0 && echt.verschil === 0, "0 verschillen tussen de twee tikregels" + (echt.voorbeeld ? "; eerste: " + echt.voorbeeld : ""));

// verschilmutanten op kopieen in een tijdelijke map; de originelen blijven onaangeroerd
var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tik-mut-"));
async function kopieMet(bron, naam, oud, nieuw) {
  var s = fs.readFileSync(bron, "utf8");
  if (s.split(oud).length !== 2) stop("mutant " + naam + ": de te wijzigen tekst komt niet precies een keer voor");
  var p = path.join(tmp, naam + ".mjs");
  fs.writeFileSync(p, s.replace(oud, nieuw));
  return await import(pathToFileURL(p).href);
}
var TRPAD = path.join(ROOT, "public/kaartproef/tikregel.js"), INDPAD = path.join(HIER, "tik-onafhankelijk.mjs");
var MUT = [
  ["tikregel.js met marge 0, tegen de echte onafhankelijke regel", await kopieMet(TRPAD, "tikregel-marge0", "export var MARGE = 4;", "export var MARGE = 0;"), IND],
  ["tikregel.js zonder ingesloten doel wint, tegen de echte onafhankelijke regel", await kopieMet(TRPAD, "tikregel-geen-ingesloten", "if (kleinste && k.every(", "if (false && kleinste && k.every("), IND],
  ["tik-onafhankelijk.mjs met marge 0, tegen de echte tikregel.js", TR, await kopieMet(INDPAD, "onafhankelijk-marge0", "export var R = 22, A = Math.PI * R * R, MARGE = 4;", "export var R = 22, A = Math.PI * R * R, MARGE = 0;")]
];
MUT.forEach(function(m) {
  var u = vergelijk(m[1], m[2]);
  console.log("verschilmutant " + m[0] + ": " + u.verschil + " afwijkende rasterpunten van " + u.punten + (u.voorbeeld ? "; voorbeeld: " + u.voorbeeld : ""));
  eis(u.verschil > 0, "verschilmutant geeft verschil: " + m[0]);
});
fs.rmSync(tmp, { recursive: true, force: true });

// ---- 4. middelpunten: de onafhankelijke regel kiest het doel zelf of de keuzelijst, nooit een ander doel ----
var mid = 0;
KAARTEN.forEach(function(kaart) {
  var K = kaart.K;
  K.lagen.forEach(function(laag) {
    var doelen = IND.doelenVan(laag);
    doelen.forEach(function(d) {
      var p = d.soort === "punt" ? d.p : d.soort === "vlak" ? d.m : d.rs[0][Math.floor(d.rs[0].length / 2)];
      SCHERMEN.forEach(function(scherm) {
        Z.forEach(function(z) {
          var s = (scherm - 32) / ((K.beeld || K.breedte) / z), r = IND.besluit(doelen, s, p[0] * s, p[1] * s);
          mid++;
          eis(r === d.id || r === "?", "middelpunt van " + kaart.naam + " " + d.id + " bij " + scherm + " x" + z + " kiest het doel of de keuzelijst (" + r + ")");
        });
      });
    });
  });
});
console.log("middelpunten: " + mid + " gecontroleerd");
}

// ---- 5. oud tegen nieuw, per schermbreedte (een tweede run is geschrapt: de meting is deterministisch en de
// byte-gelijkheid met T2a toont dat al; besluit Dick 18-11-2026) ----
function draai(script, scherm, uit) {
  return new Promise(function(ok, nok) {
    var p = spawn("node", [script, ROOT, String(scherm), uit], { stdio: ["ignore", "pipe", "pipe"] }), fout = "";
    p.stderr.on("data", function(d) { fout += d; });
    p.on("close", function(code) { if (code) nok(new Error(script + " " + scherm + ": " + fout)); else ok(uit); });
  });
}
var NIEUW = path.join(HIER, "tik-meet.mjs"), taken = [];
SCHERMEN.forEach(function(s) {
  taken.push([OUD_MEET, s, path.join(WERK, "oud-" + s + ".json")]);
  taken.push([NIEUW, s, path.join(WERK, "nieuw-" + s + ".json")]);
});
var PARALLEL = Math.max(1, Math.min(os.cpus().length, 4)), volgende = 0;
async function werker() { while (volgende < taken.length) { var t = taken[volgende++]; await draai(t[0], t[1], t[2]); } }
var werkers = []; for (var w = 0; w < PARALLEL; w++) werkers.push(werker());
await Promise.all(werkers);
SCHERMEN.forEach(function(s) {
  var o = path.join(WERK, "oud-" + s + ".json"), a = path.join(WERK, "nieuw-" + s + ".json");
  console.log("verslag " + s + ": oud " + sha(o) + ", nieuw " + sha(a));
  eis(fs.readFileSync(o).equals(fs.readFileSync(a)), "verslag " + s + " byte-gelijk aan T2a");
});

// ---- 6. de T2a-criteria op het verslag: tikbaar binnen x4, of x8 bij Guernsey en Jersey ----
[428].forEach(function(s) {   // alleen 428 px, de breedte die T2a mat (besluit GPT 18-11-2026, optie A)
  var v = JSON.parse(fs.readFileSync(path.join(WERK, "nieuw-" + s + ".json"), "utf8"));
  eis(v.length === 76, "verslag " + s + ": 76 doelen (" + v.length + ")");
  v.forEach(function(d) {
    var eerste = Z.filter(function(z) { return d.per["x" + z].oordeel !== "fout"; })[0];
    var grens = UITZONDERING_X8[d.kaart + "|" + d.id] ? 8 : 4;
    eis(eerste !== undefined && eerste <= grens, "verslag " + s + ": " + d.kaart + " " + d.id + " tikbaar binnen x" + grens + " (eerst bij " + (eerste ? "x" + eerste : "geen") + ")");
  });
});

console.log((fouten.length ? "FOUT" : "GOED") + ": " + (n - fouten.length) + " controles geslaagd, " + fouten.length + " mislukt");
fouten.slice(0, 30).forEach(function(f) { console.log("  - " + f); });
process.exit(fouten.length ? 1 : 0);
