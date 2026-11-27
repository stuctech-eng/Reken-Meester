// Test van de grensgebieden en hun buurland (plan T5c, B4; nb23). Alleen bouwomgeving, in Node.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik (vanuit de hoofdmap van de repo): node tools/topo/test-grensgebied-relaties.mjs
// - het script maakt twee keer een byte-gelijk bestand, gelijk aan src/core/topo/afgeleid/grensgebieden-nlbe.js;
// - elke relatie: toegestane bron- en doelsoort (relaties.js), vastgesteld en bewezen, de invoer met een SHA-256 uit het register;
// - nooit Nederland als buurland; elk van de vier grensgebieden heeft minstens een buurland;
// - Zeeuws-Vlaanderen, onafhankelijk: het vlak van de streek op de kaart ligt binnen 2 kaarteenheden (ongeveer 0,7 km) van een
//   Belgische provincie en ver (meer dan 50 eenheden) van Duitsland; de Dollard ligt dichter bij Duitsland (NE) dan bij Belgie;
// - mutant: een relatie naar Nederland of een SHA buiten het register wordt gevangen.

import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";

var HIER = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.join(HIER, "..", "..");
function laad(p) { return import(pathToFileURL(path.join(ROOT, p)).href); }
var n = 0, fouten = [];
function eis(ok, tekst) { n++; if (!ok) fouten.push(tekst); }

var STANDAARD = path.join(ROOT, "src/core/topo/afgeleid/grensgebieden-nlbe.js");
var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "grensgeb-"));
[1, 2].forEach(function(k) {
  execFileSync("node", [path.join(HIER, "maak-grensgebied-relaties.mjs"), path.join(tmp, "r" + k)]);
  eis(fs.readFileSync(path.join(tmp, "r" + k, "grensgebieden-nlbe.js")).equals(fs.readFileSync(STANDAARD)), "script geeft byte-gelijk grensgebieden-nlbe.js (run " + k + ")");
});
var L = (await laad("src/core/topo/afgeleid/grensgebieden-nlbe.js")).GRENSGEBIEDEN_NLBE;
var R = (await laad("src/core/topo/relaties.js")).RELATIES;
var REG = (await laad("src/core/topo/bronnen.js")).REGISTER;
var IX = await laad("src/core/topo/relatie-index.js");
var D = await (await laad("src/core/topo/laden.js")).laadTopo(["nlbe"], ["nlbe/gebieden", "nlbe/water", "nlbe/grens"]);

function controleer(lijst) {
  var f = [];
  lijst.forEach(function(r) {
    var t = R[r.type], b = D.item(r.van), d = D.item(r.naar), wie = r.van + " " + r.naar;
    if (!t || !b || !d || t.bronSoorten.indexOf(b.soort) < 0 || t.doelSoorten.indexOf(d.soort) < 0) f.push("soort: " + wie);
    if (!IX.bewezen(r, "relatie")) f.push("niet bewezen: " + wie);
    if (!r.afleiding.invoer.every(function(x) { var e = REG[x.bronId]; return !!e && Object.keys(e.bestanden).some(function(k) { return e.bestanden[k] === x.sha256; }); })) f.push("invoer niet in het register: " + wie);
    if (r.naar === "NLD") f.push("Nederland als buurland: " + wie);
  });
  return f;
}
var f0 = controleer(L);
eis(f0.length === 0, "elke relatie geldig (" + f0.join(" | ") + ")");
["grenspunt-drielandenpunt", "gebied-baarle", "streek-nl-zeeuws-vlaanderen", "zeearm-dollard"].forEach(function(id) { eis(L.some(function(r) { return r.van === id; }), id + ": minstens een buurland"); });

// onafhankelijk: afstand op de kaart
function seg(p, a, b) { var dx = b[0] - a[0], dy = b[1] - a[1], t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1); t = Math.max(0, Math.min(1, t)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); }
function afstand(A, B) { var m = Infinity; A.ringen.forEach(function(ra) { ra.forEach(function(p, i) { if (i % 3) return; B.ringen.forEach(function(rb) { for (var j = 0; j + 1 < rb.length; j++) m = Math.min(m, seg(p, rb[j], rb[j + 1])); }); }); }); return m; }
function doel(l, id) { return D.laag("nlbe", l).doelen.filter(function(d) { return d.id === id; })[0]; }
var zv = doel("streken", "streek-nl-zeeuws-vlaanderen"), be = D.laag("nlbe", "provincies-be").doelen, de = doel("landen", "DEU");
var dBe = Math.min.apply(null, be.map(function(p) { return afstand(zv, p); })), dDe = afstand(zv, de);
eis(dBe <= 2 && dDe > 50, "Zeeuws-Vlaanderen ligt tegen Belgie (" + dBe.toFixed(2) + ") en ver van Duitsland (" + dDe.toFixed(0) + ")");
var dol = doel("zeearmen", "zeearm-dollard"), dolDe = afstand(dol, de), dolBe = Math.min.apply(null, be.map(function(p) { return afstand(dol, p); }));
eis(dolDe < dolBe, "de Dollard ligt dichter bij Duitsland (" + dolDe.toFixed(1) + ") dan bij Belgie (" + dolBe.toFixed(0) + ")");

// mutanten
var m1 = JSON.parse(JSON.stringify(L)); m1[0].naar = "NLD";
var m2 = JSON.parse(JSON.stringify(L)); m2[0].afleiding.invoer[0].sha256 = "d".repeat(64);
eis(controleer(m1).length > 0 && controleer(m2).length > 0, "mutanten: Nederland als buurland en een SHA buiten het register worden gevangen");

console.log("test-grensgebied-relaties: " + (fouten.length ? "FOUT" : "GOED") + ": " + (n - fouten.length) + " controles geslaagd, " + fouten.length + " mislukt");
fouten.forEach(function(x) { console.log("  - " + x); });
if (fouten.length) process.exit(1);
