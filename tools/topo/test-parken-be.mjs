// Tests voor de Nationale Parken van Belgie (plan T5b-3 par. 3.4). Alleen bouwomgeving, niet in de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node test-parken-be.mjs <spw-parcs-nationaux-t5b3.json> <map NE>
// - byte-gelijk: het script maakt opnieuw precies items/parken-be.js;
// - de inhoud: 6 parken, 2 in Wallonie met vlak en 4 in Vlaanderen zonder vlak (A2); alle in Belgie;
// - Wallonie, nagerekend: de oppervlakte van het vlak (EPSG:3035) ligt binnen 2 % van SUPERFICIE_TOTALE_HA van SPW, en het
//   vlak ligt in Belgie (het binnenste punt in het NE-vlak van Belgie);
// - Vlaanderen: elke naam staat letterlijk in de passage van het ANB;
// - de kaart nlbe: de laag parken-be heeft de 2 Waalse parken;
// - mutanten op de tabel: een SPW-naam die niet bestaat, een Vlaamse naam die niet in de passage staat.

import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { fileURLToPath, pathToFileURL } from "url";
import { binnenVlak, pool } from "./vlakpunt.mjs";
import { oppM2 } from "./maak-water-nlbe.mjs";
import { bouw, schrijf } from "./maak-parken-be.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var ROOT = path.resolve(HIER, "..", "..");
var PADEN = { spw: process.argv[2] }, NE = process.argv[3];
var P = (await import(pathToFileURL(path.join(ROOT, "src/core/topo/items/parken-be.js")).href)).PARKEN_BE;
var n = 0, fouten = [];
function eis(ok, t) { n++; if (!ok) fouten.push(t); }

var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "parken-be-"));
schrijf(tmp, bouw(PADEN));
eis(fs.readFileSync(path.join(tmp, "items", "parken-be.js")).equals(fs.readFileSync(path.join(ROOT, "src/core/topo/items/parken-be.js"))), "byte-gelijk: items/parken-be.js");

var vlak = P.filter(function(p) { return !!p.geometrie.bron; }), label = P.filter(function(p) { return !p.geometrie.bron; });
eis(P.length === 6 && vlak.length === 2 && label.length === 4, "6 parken: 2 met vlak, 4 zonder");
eis(P.every(function(p) { return p.soort === "natuurgebied" && p.feiten.land.waarde === "BEL"; }), "alle parken: natuurgebied in Belgie");
eis(label.map(function(p) { return p.naam.waarde; }).sort().join() === "Bosland,Brabantse Wouden,Hoge Kempen,Scheldevallei", "de 4 Vlaamse parken van het ANB");
label.forEach(function(p) { eis(p.naam.bron.passage.indexOf(p.naam.waarde) >= 0 && /A2/.test(p.geometrie.geen), "Vlaams park in de passage en zonder vlak: " + p.id); });

var B = JSON.parse(fs.readFileSync(PADEN.spw, "utf8")), spw = {};
B.paginas.forEach(function(q) { JSON.parse(q.tekst).features.forEach(function(f) { spw[f.properties.NOM_PNX] = f; }); });
// NE map units heeft Belgie in drie delen (Vlaanderen, Wallonie, Brussel), alle met ADM0_A3 BEL
var belDelen = []; JSON.parse(fs.readFileSync(path.join(NE, "ne_10m_admin_0_map_units.geojson"), "utf8")).features.filter(function(f) { return f.properties.ADM0_A3 === "BEL"; }).forEach(function(f) { belDelen = belDelen.concat(f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates); });
vlak.forEach(function(p) {
  var f = spw[p.geometrie.bron.waarde], g = f.geometry, d = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  var ha = oppM2(d) / 1e4, opg = f.properties.SUPERFICIE_TOTALE_HA;
  eis(Math.abs(ha - opg) <= 0.02 * opg, "oppervlakte " + p.id + ": " + Math.round(ha) + " ha tegen " + Math.round(opg) + " ha van SPW");
  var groot = d.slice().sort(function(a, b) { return oppM2([b]) - oppM2([a]); })[0], pl = pool(groot, 0.0001);
  eis(belDelen.some(function(q) { return binnenVlak([pl.x, pl.y], q); }), "in Belgie: " + p.id);
});

var K = (await import(pathToFileURL(path.join(ROOT, "src/core/topo/kaarten/nlbe.js")).href)).default;
var lb = K.lagen.filter(function(l) { return l.id === "parken-be"; })[0];
eis(!!lb && lb.items.map(function(x) { return x.id; }).sort().join() === vlak.map(function(p) { return p.id; }).sort().join(), "de kaart nlbe: de laag parken-be met de 2 Waalse parken");

var TAB = path.join(HIER, "parken-be.json"), BRON = path.join(HIER, "bronnen.json");
var tabOud = fs.readFileSync(TAB), bronOud = fs.readFileSync(BRON);
var MUT = [
  ["een SPW-naam die niet bestaat", function(t) { t.wallonie["park-be-vallee-de-la-semois"].spw = "Parc national de la Semois"; }],
  ["een Vlaamse naam die niet in de passage staat", function(t) { t.vlaanderen["park-be-bosland"].naam = "Bosland Lommel"; }]
];
var gevangen = 0, gemist = [];
try {
  for (var m = 0; m < MUT.length; m++) {
    var t = JSON.parse(tabOud.toString("utf8")); MUT[m][1](t);
    var tekst = JSON.stringify(t, null, 2), sha = crypto.createHash("sha256").update(tekst).digest("hex");
    fs.writeFileSync(TAB, tekst);
    fs.writeFileSync(BRON, bronOud.toString("utf8").replace(/("tools\/topo\/parken-be.json": ")[0-9a-f]{64}"/, "$1" + sha + "\""));
    var mod = await import(pathToFileURL(path.join(HIER, "maak-parken-be.mjs")).href + "?m=" + m);
    var ok = false; try { mod.bouw(PADEN); } catch (e) { ok = true; }
    if (ok) gevangen++; else gemist.push(MUT[m][0]);
  }
} finally { fs.writeFileSync(TAB, tabOud); fs.writeFileSync(BRON, bronOud); }
eis(gemist.length === 0, "mutanten gevangen: " + gemist.join(", "));

console.log("mutanten parken-be: " + gevangen + " van " + MUT.length + " gevangen");
console.log("test-parken-be: " + (fouten.length ? "FOUT" : "GOED") + ": " + (n - fouten.length) + " controles geslaagd, " + fouten.length + " mislukt");
fouten.forEach(function(f) { console.log("  - " + f); });
if (fouten.length) process.exit(1);
