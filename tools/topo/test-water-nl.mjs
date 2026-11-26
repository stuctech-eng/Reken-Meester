// Tests voor het water van Nederland uit de landelijke KRW-waterlichamen (plan T5b par. 3.2, B7 en B8). Alleen bouwomgeving.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node --max-old-space-size=6000 test-water-nl.mjs <INSPIRESurfaceWaterBody.gml> <cbsgebiedsindelingen2026.gpkg> <map NE>
// - byte-gelijk: het script maakt opnieuw precies items/water-nl.js;
// - de inhoud: 14 items (1 zee, 6 meren, 2 zeearmen, 5 rivieren), de namen uit T1 par. 2.1, elke KRW-naam als controle;
// - nagerekend zonder het script, met de lezer van de GML: elk lichaam heeft de naam uit de tabel en het juiste soort geometrie;
// - de ligging, onafhankelijk met CBS en NE: het binnenste punt van elk meer en elke zeearm ligt binnen 20 km van een Nederlandse
//   gemeente (CBS; de gemeentevlakken zijn zonder het grote water) en dichter bij Nederland dan bij Belgie of Duitsland (NE); van elke
//   rivier ligt minstens 90 % van de punten in een Nederlandse gemeente (of binnen 100 m ervan);
// - geen overlap tussen twee watervlakken (polygon-clipping, kleiner dan 1 ha);
// - de Dommel: de twee lichamen sluiten op elkaar aan (een eindpunt binnen 100 m van de andere lijn);
// - mutanten op de tabel: een andere naam, een lichaam dat niet bestaat, een lijn als meer, een lichaam twee keer, een meer als zeearm.

import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { fileURLToPath, pathToFileURL } from "url";
import proj4 from "proj4";
import pc from "polygon-clipping";
import { leesKrwGml } from "./bronnen/lees-gml-krw.mjs";
import { leesGpkg, leesGeometrie } from "./bronnen/lees-gpkg.mjs";
import { CRS } from "./bronnen/bron.mjs";
import { binnenVlak, afstandTotLijnstuk, pool } from "./vlakpunt.mjs";
import { bouw, schrijf } from "./maak-water-nl.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var ROOT = path.resolve(HIER, "..", "..");
var PADEN = { gml: process.argv[2] }, GPKG = process.argv[3], NE = process.argv[4];
var W = (await import(pathToFileURL(path.join(ROOT, "src/core/topo/items/water-nl.js")).href)).WATER_NL;
var n = 0, fouten = [];
function eis(ok, t) { n++; if (!ok) fouten.push(t); }

// ---- byte-gelijk ----
var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "water-nl-"));
schrijf(tmp, bouw(PADEN));
eis(fs.readFileSync(path.join(tmp, "items", "water-nl.js")).equals(fs.readFileSync(path.join(ROOT, "src/core/topo/items/water-nl.js"))), "byte-gelijk: items/water-nl.js");

// ---- inhoud ----
var tel = {}; W.forEach(function(w) { tel[w.soort] = (tel[w.soort] || 0) + 1; });
eis(W.length === 14 && tel.zee === 1 && tel.meer === 6 && tel.zeearm === 2 && tel.rivier === 5, "14 items: 1 zee, 6 meren, 2 zeearmen, 5 rivieren (" + JSON.stringify(tel) + ")");
var T1 = ["Waddenzee", "IJsselmeer", "Markermeer", "Grevelingenmeer", "Veerse Meer", "Lauwersmeer", "Zuidlaardermeer", "Westerschelde", "Oosterschelde", "Bergse Maas", "Oude Maas", "Overijsselse Vecht", "Roer", "Dommel"];
eis(W.map(function(w) { return w.naam.waarde; }).sort().join() === T1.slice().sort().join(), "de namen zijn precies de 14 namen uit T1 par. 2.1 (en nb01)");

// ---- nagerekend met de lezer ----
var K = leesKrwGml(fs.readFileSync(PADEN.gml)), per = {};
K.records.forEach(function(r) { per[r.kenmerken.localId] = r; });
var GEOM = { rivier: "lijn", zee: "vlak", meer: "vlak", zeearm: "vlak" };
var geo = {};
W.forEach(function(w) {
  var ids = w.geometrie.bron.waarden, namen = w.naam.controle.waarde.split("; ");
  eis(ids.length === namen.length, "evenveel lichamen als KRW-namen: " + w.id);
  var delen = [];
  ids.forEach(function(k, i) {
    var r = per[k];
    eis(!!r && r.kenmerken.naam === namen[i] && r.soort === GEOM[w.soort], "KRW " + k + ": naam " + namen[i] + " en " + GEOM[w.soort] + " (" + w.id + ")");
    if (r) { var g = r.geometrie(); delen = delen.concat(g.lijnen || g.delen); }
  });
  geo[w.id] = delen;
});
eis(W.filter(function(w) { return w.geometrie.bron.waarden.length > 1; }).map(function(w) { return w.id; }).sort().join() === "rivier-dommel,zee-waddenzee", "alleen de Waddenzee en de Dommel bestaan uit twee lichamen");

// ---- ligging met CBS (RD) ----
var naarRd = proj4("EPSG:4326", CRS["EPSG:28992"]);
var g = await leesGpkg(fs.readFileSync(GPKG), "gemeente_niet_gegeneraliseerd", ["statcode"], "geom", "statcode");
var gem = g.records.map(function(r) { var d = leesGeometrie(r.geom), b = [Infinity, Infinity, -Infinity, -Infinity]; d.forEach(function(p) { p[0].forEach(function(c) { b[0] = Math.min(b[0], c[0]); b[1] = Math.min(b[1], c[1]); b[2] = Math.max(b[2], c[0]); b[3] = Math.max(b[3], c[1]); }); }); return { d: d, b: b }; });
function inNl(q, marge) {
  return gem.some(function(x) {
    if (q[0] < x.b[0] - marge || q[0] > x.b[2] + marge || q[1] < x.b[1] - marge || q[1] > x.b[3] + marge) return false;
    if (x.d.some(function(p) { return binnenVlak(q, p); })) return true;
    if (!marge) return false;
    return x.d.some(function(p) { return p.some(function(r) { for (var i = 0; i + 1 < r.length; i++) if (afstandTotLijnstuk(q, r[i], r[i + 1]) <= marge) return true; return false; }); });
  });
}
var buren = JSON.parse(fs.readFileSync(path.join(NE, "ne_10m_admin_0_map_units.geojson"), "utf8")).features.filter(function(f) { return f.properties.ADM0_A3 === "BEL" || f.properties.ADM0_A3 === "DEU"; }).map(function(f) {
  var d = (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates).map(function(p) { return p.map(function(r) { return r.map(function(c) { return naarRd.forward(c); }); }); });
  var b = [Infinity, Infinity, -Infinity, -Infinity]; d.forEach(function(p) { p[0].forEach(function(c) { b[0] = Math.min(b[0], c[0]); b[1] = Math.min(b[1], c[1]); b[2] = Math.max(b[2], c[0]); b[3] = Math.max(b[3], c[1]); }); });
  return { d: d, b: b };
});
function rd(delen) { return delen.map(function(p) { return p.map(function(r) { return r.map(function(c) { return naarRd.forward(c); }); }); }); }
W.forEach(function(w) {
  if (w.soort === "meer" || w.soort === "zeearm") {
    var v = rd(geo[w.id]), groot = v.slice().sort(function(a, b) { return Math.abs(oppRing(b[0])) - Math.abs(oppRing(a[0])); })[0];
    var pl = pool([groot[0]].concat(groot.slice(1)), 1), q = [pl.x, pl.y], dNl = randAfstand(q, gem, 20000), dBuur = randAfstand(q, buren, Infinity);
    eis(dNl <= 20000 && dNl < dBuur, "het binnenste punt van " + w.id + " ligt bij Nederland: " + Math.round(dNl) + " m van een Nederlandse gemeente, " + Math.round(dBuur) + " m van Belgie of Duitsland");
  }
  if (w.soort === "rivier") {
    var pts = []; geo[w.id].forEach(function(l) { l.forEach(function(c, i) { if (i % 5 === 0) pts.push(naarRd.forward(c)); }); });
    var binnen = pts.filter(function(q) { return inNl(q, 100); }).length;
    eis(binnen >= 0.9 * pts.length, "rivier " + w.id + ": " + binnen + " van " + pts.length + " punten in Nederland (of binnen 100 m)");
  }
});
// afstand van een punt tot de rand van de dichtstbijzijnde vlakken (in RD), alleen vlakken waarvan de omhullende binnen max ligt
function randAfstand(q, lijst, max) {
  var m = Infinity;
  lijst.forEach(function(x) {
    if (q[0] < x.b[0] - max || q[0] > x.b[2] + max || q[1] < x.b[1] - max || q[1] > x.b[3] + max) return;
    if (x.d.some(function(p) { return binnenVlak(q, p); })) { m = 0; return; }
    x.d.forEach(function(p) { p.forEach(function(r) { for (var i = 0; i + 1 < r.length; i++) m = Math.min(m, afstandTotLijnstuk(q, r[i], r[i + 1])); }); });
  });
  return m;
}
function oppRing(r) { var s = 0; for (var i = 0; i + 1 < r.length; i++) s += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return s / 2; }
function opp(m) { var s = 0; m.forEach(function(p) { p.forEach(function(r, i) { s += (i ? -1 : 1) * Math.abs(oppRing(r)); }); }); return s; }

// ---- geen overlap tussen watervlakken ----
var V = W.filter(function(w) { return w.soort !== "rivier"; }).map(function(w) { return { id: w.id, g: rd(geo[w.id]) }; });
for (var i = 0; i < V.length; i++) for (var j = i + 1; j < V.length; j++) { var x = opp(pc.intersection(V[i].g, V[j].g)) / 1e4; eis(x < 1, "geen overlap " + V[i].id + " en " + V[j].id + " (" + x.toFixed(2) + " ha)"); }

// ---- de Dommel sluit aan ----
var d1 = per.NL27_BO_1_2.geometrie().lijnen.map(function(l) { return l.map(function(c) { return naarRd.forward(c); }); }), d2 = per.NL99_6_BO_BE_2.geometrie().lijnen.map(function(l) { return l.map(function(c) { return naarRd.forward(c); }); });
function afstandLijnen(q, ls) { var m = Infinity; ls.forEach(function(l) { for (var i = 0; i + 1 < l.length; i++) m = Math.min(m, afstandTotLijnstuk(q, l[i], l[i + 1])); }); return m; }
var eind = []; d1.forEach(function(l) { eind.push(l[0], l[l.length - 1]); });
var dmin = Math.min.apply(null, eind.map(function(q) { return afstandLijnen(q, d2); }));
eis(dmin <= 100, "de Boven Dommel sluit aan op de Midden- en Beneden Dommel (" + dmin.toFixed(1) + " m)");

// ---- mutanten op de tabel ----
var TAB = path.join(HIER, "water-nl.json"), BRON = path.join(HIER, "bronnen.json");
var tabOud = fs.readFileSync(TAB), bronOud = fs.readFileSync(BRON);
var MUT = [
  ["een andere KRW-naam", function(t) { t.water["meer-markermeer"].krw.NL92_MARKERMEER = "Markermeer en IJmeer"; }],
  ["een lichaam dat niet bestaat", function(t) { t.water["rivier-roer"].krw = { NL60_ROER2: "Roer" }; }],
  ["een rivierlijn als meer", function(t) { t.water["meer-zuidlaardermeer"].krw = { NL60_ROER: "Roer" }; }],
  ["een lichaam twee keer", function(t) { t.water["zeearm-oosterschelde"].krw = { NL89_WESTSDE_OWL: "Westerschelde" }; }],
  ["een meer als zeearm", function(t) { t.water["meer-veerse-meer"].soort = "zeearm"; }],
  ["twee items met dezelfde naam", function(t) { t.water["meer-veerse-meer"].naam = "IJsselmeer"; }]
];
var gevangen = 0, gemist = [];
try {
  for (var m = 0; m < MUT.length; m++) {
    var t = JSON.parse(tabOud.toString("utf8")); MUT[m][1](t);
    var tekst = JSON.stringify(t, null, 2), sha = crypto.createHash("sha256").update(tekst).digest("hex");
    fs.writeFileSync(TAB, tekst);
    fs.writeFileSync(BRON, bronOud.toString("utf8").replace(/("tools\/topo\/water-nl.json": ")[0-9a-f]{64}"/, "$1" + sha + "\""));
    var mod = await import(pathToFileURL(path.join(HIER, "maak-water-nl.mjs")).href + "?m=" + m);
    var ok = false; try { mod.bouw(PADEN); } catch (e) { ok = true; }
    if (ok) gevangen++; else gemist.push(MUT[m][0]);
  }
} finally { fs.writeFileSync(TAB, tabOud); fs.writeFileSync(BRON, bronOud); }
eis(gemist.length === 0, "mutanten gevangen: " + gemist.join(", "));

console.log("mutanten water-nl: " + gevangen + " van " + MUT.length + " gevangen");
console.log("test-water-nl: " + (fouten.length ? "FOUT" : "GOED") + ": " + (n - fouten.length) + " controles geslaagd, " + fouten.length + " mislukt");
fouten.forEach(function(f) { console.log("  - " + f); });
if (fouten.length) process.exit(1);
