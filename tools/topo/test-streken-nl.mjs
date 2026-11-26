// Tests voor de Nederlandse streken met een officiele grens (plan T5b par. 3.4, B2). Alleen bouwomgeving, niet in de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node --max-old-space-size=6000 test-streken-nl.mjs <cbsgebiedsindelingen2026.gpkg> <natpark.gpkg>
// - byte-gelijk: het script maakt opnieuw precies items/streken-nl.js;
// - de Flevopolder: precies Almere, Dronten, Lelystad en Zeewolde;
// - 3 globale streken (Betuwe, De Peel, Het Gooi): geen vlak, wel de gemeenten van het besluit;
// - geen overlap: de gemeenten van twee streken (ook de globale) zijn nooit dezelfde, en een park overlapt geen streek (polygon-clipping, < 1 ha);
// - een park: de oppervlakte van het vlak ligt binnen 1 procent van de hectares van RVO;
// - mutanten op de tabel: elke afwijking stopt het script.

import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import pc from "polygon-clipping";
import { leesGpkg, leesGeometrie } from "./bronnen/lees-gpkg.mjs";
import { bouw, schrijf } from "./maak-streken-nl.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var ROOT = path.resolve(HIER, "..", "..");
var PADEN = { gpkg: process.argv[2], natpark: process.argv[3] };
var ST = (await import(pathToFileURL(path.join(ROOT, "src/core/topo/items/streken-nl.js")).href)).STREKEN_NL;
var n = 0, fouten = [];
function eis(ok, t) { n++; if (!ok) fouten.push(t); }

// ---- byte-gelijk ----
var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "streken-"));
schrijf(tmp, await bouw(PADEN));
eis(fs.readFileSync(path.join(tmp, "items", "streken-nl.js")).equals(fs.readFileSync(path.join(ROOT, "src/core/topo/items/streken-nl.js"))), "byte-gelijk: items/streken-nl.js");

// ---- inhoud ----
var per = {}; ST.forEach(function(s) { per[s.id] = s; });
eis(ST.length === 15, "15 streken (11, de Flevopolder en 3 globaal)");
var GL = ST.filter(function(s) { return s.feiten.grens; });
eis(GL.map(function(s) { return s.id; }).sort().join() === "streek-nl-betuwe,streek-nl-de-peel,streek-nl-het-gooi", "3 globale streken: Betuwe, De Peel en Het Gooi");
GL.forEach(function(s) { eis(s.geometrie.bron === null && /A2/.test(s.geometrie.geen) && s.feiten.grens.waarde === "globaal" && s.feiten.gemeenten.waarde.length > 0, "globaal: geen vlak, wel gemeenten: " + s.id); });
eis(per["streek-nl-het-gooi"].feiten.gemeenten.waarde.join() === "GM0376,GM0402,GM0406,GM0417,GM1942", "Het Gooi = Blaricum, Hilversum, Huizen, Laren, Gooise Meren");
eis(per["streek-nl-betuwe"].feiten.gemeenten.waarde.length === 7 && per["streek-nl-de-peel"].feiten.gemeenten.waarde.length === 5, "Betuwe 7 en De Peel 5 gemeenten");
eis(per["streek-nl-flevopolder"].geometrie.bron.waarden.join() === "GM0034,GM0050,GM0303,GM0995", "Flevopolder = Almere, Zeewolde, Dronten, Lelystad");
var gezien = {};
ST.filter(function(s) { return s.geometrie.bron ? s.geometrie.bron.waarden : s.feiten.gemeenten; }).forEach(function(s) { (s.geometrie.bron ? s.geometrie.bron.waarden : s.feiten.gemeenten.waarde).forEach(function(c) { eis(!gezien[c], "gemeente in een streek: " + c + " (" + s.id + (gezien[c] ? ", " + gezien[c] : "") + ")"); gezien[c] = s.id; }); });
var g = await leesGpkg(fs.readFileSync(PADEN.gpkg), "gemeente_niet_gegeneraliseerd", ["statcode"], "geom", "statcode");
var gem = {}; g.records.forEach(function(r) { gem[r.kenmerken.statcode] = leesGeometrie(r.geom); });
var p = await leesGpkg(fs.readFileSync(PADEN.natpark), "natpark", ["naam", "hectares"], "geom", "naam");
var park = {}, ha = {}; p.records.forEach(function(r) { park[r.kenmerken.naam] = leesGeometrie(r.geom); ha[r.kenmerken.naam] = r.kenmerken.hectares; });
function opp(m) { var s = 0; m.forEach(function(poly) { poly.forEach(function(r, i) { var a = 0; for (var j = 0; j + 1 < r.length; j++) a += r[j][0] * r[j + 1][1] - r[j + 1][0] * r[j][1]; s += (i ? -1 : 1) * Math.abs(a / 2); }); }); return s; }
var V = ST.filter(function(s) { return !!s.geometrie.bron; }).map(function(s) { var b = s.geometrie.bron; return { id: s.id, park: !b.waarden, g: b.waarden ? pc.union.apply(null, b.waarden.map(function(c) { return gem[c]; })) : park[b.waarde], naam: b.waarde }; });
V.filter(function(v) { return v.park; }).forEach(function(v) {
  var a = opp(v.g) / 1e4; eis(Math.abs(a - ha[v.naam]) <= 0.01 * ha[v.naam], "park " + v.naam + ": " + Math.round(a) + " ha tegen " + Math.round(ha[v.naam]) + " ha van RVO");
  V.filter(function(w) { return w.id !== v.id; }).forEach(function(w) { var x = opp(pc.intersection(v.g, w.g)) / 1e4; eis(x < 1, "geen overlap " + v.id + " en " + w.id + " (" + x.toFixed(1) + " ha)"); });
});

// ---- mutanten op de tabel ----
var TAB = path.join(HIER, "streken-nl.json"), BRON = path.join(HIER, "bronnen.json");
var tabOud = fs.readFileSync(TAB), bronOud = fs.readFileSync(BRON);
var MUT = [
  ["een andere CBS-naam", function(t) { t.streken["streek-nl-veluwe"].indeling.cbsNaam = "Noord-Veluwe"; }],
  ["een onbekende code", function(t) { t.streken["streek-nl-twente"].indeling.code = "LB2399"; }],
  ["Flevopolder zonder Urk met de naam Lelystad", function(t) { t.streken["streek-nl-flevopolder"].indeling.zonder.GM0184 = "Lelystad"; }],
  ["een park met het verkeerde nummer", function(t) { t.streken["streek-nl-biesbosch"].park.nr = 7; }],
  ["een park dat niet bestaat", function(t) { t.streken["streek-nl-biesbosch"].park.naam = "Biesbosch"; }],
  ["twee streken met dezelfde naam", function(t) { t.streken["streek-nl-westland"].naam = "Twente"; }],
  ["een globale gemeente met een verkeerde naam", function(t) { t.streken["streek-nl-het-gooi"].globaal.GM0417 = "Laren"; }],
  ["een globale streek zonder gemeenten", function(t) { t.streken["streek-nl-de-peel"].globaal = {}; }]
];
var gevangen = 0, gemist = [];
try {
  for (var i = 0; i < MUT.length; i++) {
    var t = JSON.parse(tabOud.toString("utf8")); MUT[i][1](t);
    var tekst = JSON.stringify(t, null, 2);
    fs.writeFileSync(TAB, tekst);
    var sha = (await import("crypto")).createHash("sha256").update(tekst).digest("hex");
    fs.writeFileSync(BRON, bronOud.toString("utf8").replace(/("tools\/topo\/streken-nl.json": ")[0-9a-f]{64}"/, "$1" + sha + "\""));
    var mod = await import(pathToFileURL(path.join(HIER, "maak-streken-nl.mjs")).href + "?m=" + i);
    var ok = false; try { await mod.bouw(PADEN); } catch (e) { ok = true; }
    if (ok) gevangen++; else gemist.push(MUT[i][0]);
  }
} finally { fs.writeFileSync(TAB, tabOud); fs.writeFileSync(BRON, bronOud); }
eis(gemist.length === 0, "mutanten gevangen: " + gemist.join(", "));

console.log("mutanten streken: " + gevangen + " van " + MUT.length + " gevangen");
console.log("test-streken-nl: " + (fouten.length ? "FOUT" : "GOED") + ": " + (n - fouten.length) + " controles geslaagd, " + fouten.length + " mislukt");
fouten.forEach(function(f) { console.log("  - " + f); });
if (fouten.length) process.exit(1);
