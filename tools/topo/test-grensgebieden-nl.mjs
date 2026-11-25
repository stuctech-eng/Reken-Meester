// Tests voor het Drielandenpunt en het enclavegebied Baarle (plan T5b par. 3.6, B4). Alleen bouwomgeving, niet in de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node --max-old-space-size=6000 test-grensgebieden-nl.mjs <cbsgebiedsindelingen2026.gpkg> <sectoren.geojson> <map NE>
// - byte-gelijk: het script maakt opnieuw precies items/grensgebieden.js;
// - Drielandenpunt, onafhankelijk nagerekend: het punt (lon/lat, terug naar RD) ligt binnen 1 m van de grens van Vaals (CBS) en
//   binnen 1 m van de grens van Plombieres (Statbel); lon/lat (5 decimalen, ongeveer 1 m) en RD van het item horen bij elkaar (binnen 1,5 m);
// - Baarle: 22 Belgische enclaves, 7 Nederlandse tegen-enclaves en 1 Nederlandse enclave in Belgie zelf, nagerekend zonder het
//   script: de sectoren van Baarle-Hertog als eigen vereniging; de delen die een andere Belgische gemeente raken horen bij het
//   hoofdgebied (Zondereigen), de andere zijn de enclaves; de tegen-enclaves als delen van Baarle-Nassau binnen een enclave;
// - de kaart: het item Baarle heeft 22 delen op de kaart nlbe.

import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import proj4 from "proj4";
import { topology } from "topojson-server";
import { merge } from "topojson-client";
import { leesGpkg, leesGeometrie } from "./bronnen/lees-gpkg.mjs";
import { leesGeojson, CRS_GEOJSON } from "./bronnen/lees-geojson.mjs";
import { CRS } from "./bronnen/bron.mjs";
import { binnenVlak, afstandTotLijnstuk } from "./vlakpunt.mjs";
import { bouw, schrijf } from "./maak-grensgebieden-nl.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var ROOT = path.resolve(HIER, "..", "..");
var PADEN = { gpkg: process.argv[2], sectoren: process.argv[3], ne: process.argv[4] };
var GB = (await import(pathToFileURL(path.join(ROOT, "src/core/topo/items/grensgebieden.js")).href)).GRENSGEBIEDEN;
var n = 0, fouten = [];
function eis(ok, t) { n++; if (!ok) fouten.push(t); }
function afst(q, ringen) { var m = Infinity; ringen.forEach(function(r) { for (var i = 0; i + 1 < r.length; i++) m = Math.min(m, afstandTotLijnstuk(q, r[i], r[i + 1])); }); return m; }
function ringen(delen) { var a = []; delen.forEach(function(p) { p.forEach(function(r) { a.push(r); }); }); return a; }

// ---- byte-gelijk ----
var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "grensgebieden-"));
schrijf(tmp, await bouw(PADEN));
eis(fs.readFileSync(path.join(tmp, "items", "grensgebieden.js")).equals(fs.readFileSync(path.join(ROOT, "src/core/topo/items/grensgebieden.js"))), "byte-gelijk: items/grensgebieden.js");

var per = {}; GB.forEach(function(it) { per[it.id] = it; });
var naarRd = proj4(CRS_GEOJSON["EPSG:3812"], CRS["EPSG:28992"]), llNaarRd = proj4("EPSG:4326", CRS["EPSG:28992"]);
var g = await leesGpkg(fs.readFileSync(PADEN.gpkg), "gemeente_niet_gegeneraliseerd", ["statcode"], "geom", "statcode");
function gem(c) { return leesGeometrie(g.records.filter(function(r) { return r.kenmerken.statcode === c; })[0].geom); }
var s = leesGeojson(fs.readFileSync(PADEN.sectoren), ["cd_munty_refnis"]);

// ---- Drielandenpunt ----
var dp = per["grenspunt-drielandenpunt"].geometrie.punt, q = llNaarRd.forward([dp.lon, dp.lat]);
eis(Math.hypot(q[0] - dp.rd[0], q[1] - dp.rd[1]) <= 1.5, "lon/lat en RD van het Drielandenpunt horen bij elkaar (" + Math.hypot(q[0] - dp.rd[0], q[1] - dp.rd[1]).toFixed(2) + " m)");
eis(afst(dp.rd, ringen(gem("GM0981"))) <= 1, "Drielandenpunt binnen 1 m van de grens van Vaals");
var pl = []; s.records.forEach(function(r) { if (r.kenmerken.cd_munty_refnis === "63088") r.delen.forEach(function(d) { d.forEach(function(x) { pl.push(x.map(function(c) { return naarRd.forward(c); })); }); }); });
eis(afst(dp.rd, pl) <= 1, "Drielandenpunt binnen 1 m van de grens van Plombieres");

// ---- Baarle, nagerekend zonder het script ----
var t = topology({ s: { type: "GeometryCollection", geometries: s.records.map(function(r) { return { type: "MultiPolygon", coordinates: r.delen }; }) } });
var bh = [];
s.records.forEach(function(r, i) { if (r.kenmerken.cd_munty_refnis === "13002") bh.push(t.objects.s.geometries[i]); });
var BH = merge(t, bh).coordinates;
// de delen van Baarle-Hertog in RD; een deel raakt een andere gemeente als een hoekpunt van zijn buitenrand binnen 0,01 m van
// een sector van een andere gemeente ligt
var losse = BH.map(function(p) { return p.map(function(r) { return r.map(function(c) { return naarRd.forward(c); }); }); });
var restRingen = [];
s.records.forEach(function(r) { if (r.kenmerken.cd_munty_refnis !== "13002") r.delen.forEach(function(d) { d.forEach(function(x) { var xx = x.map(function(c) { return naarRd.forward(c); }); var b = [Infinity, Infinity, -Infinity, -Infinity]; xx.forEach(function(c) { b[0] = Math.min(b[0], c[0]); b[1] = Math.min(b[1], c[1]); b[2] = Math.max(b[2], c[0]); b[3] = Math.max(b[3], c[1]); }); restRingen.push({ r: xx, b: b }); }); }); });
var buur = losse.map(function(rr) {
  var b = [Infinity, Infinity, -Infinity, -Infinity]; rr[0].forEach(function(c) { b[0] = Math.min(b[0], c[0]); b[1] = Math.min(b[1], c[1]); b[2] = Math.max(b[2], c[0]); b[3] = Math.max(b[3], c[1]); });
  var dicht = restRingen.filter(function(x) { return x.b[0] <= b[2] + 1 && x.b[2] >= b[0] - 1 && x.b[1] <= b[3] + 1 && x.b[3] >= b[1] - 1; }).map(function(x) { return x.r; });
  return rr[0].some(function(c) { return afst(c, dicht) < 0.01; });
});
var raakt = buur.filter(function(x) { return x; }).length;
var groepen = {}; losse.forEach(function(x, i) { if (!buur[i]) groepen[i] = 1; });
console.log("Baarle-Hertog: " + losse.length + " delen in de sectoren, " + raakt + " raakt een andere Belgische gemeente, " + Object.keys(groepen).length + " losse delen (de enclaves)");
var f = per["gebied-baarle"].feiten;
eis(raakt >= 1 && raakt + 22 === losse.length, "de delen van Baarle-Hertog die een andere Belgische gemeente raken (Zondereigen en wat daaraan vastzit) plus de 22 enclaves zijn alle delen (" + raakt + " + 22 = " + losse.length + ")");
eis(f.belgischeEnclaves.waarde === 22 && Object.keys(groepen).length === 22, "22 Belgische enclaves (" + f.belgischeEnclaves.waarde + ", nagerekend " + Object.keys(groepen).length + ")");
var bn = gem("GM0744"), encl = losse.filter(function(x, i) { return !buur[i]; }), zond = losse.filter(function(x, i) { return buur[i]; });
var tegen = bn.filter(function(p) { return encl.some(function(e) { return binnenVlak(p[0][0], [e[0]]); }); }).length;
var inZond = bn.filter(function(p) { return zond.some(function(e) { return binnenVlak(p[0][0], [e[0]]); }); }).length;
eis(f.nederlandseTegenEnclaves.waarde === 7 && tegen === 7, "7 Nederlandse tegen-enclaves (" + f.nederlandseTegenEnclaves.waarde + ", nagerekend " + tegen + ")");
eis(f.nederlandseEnclavesInHoofdgebied.waarde === 1 && inZond === 1, "1 Nederlandse enclave in Zondereigen (" + f.nederlandseEnclavesInHoofdgebied.waarde + ", nagerekend " + inZond + ")");

// ---- de kaart ----
var K = (await import(pathToFileURL(path.join(ROOT, "public/topoproef/data/nlbe.js")).href)).default;
var lb = K.lagen.filter(function(l) { return l.id === "baarle"; })[0];
eis(!!lb && lb.items.length === 1 && (lb.items[0].d.match(/M/g) || []).length === 22, "de kaart nlbe: Baarle met 22 delen");
var lp = K.lagen.filter(function(l) { return l.id === "grenspunten"; })[0];
eis(!!lp && lp.items.length === 1 && lp.items[0].id === "grenspunt-drielandenpunt", "de kaart nlbe: het Drielandenpunt");

console.log("test-grensgebieden-nl: " + (fouten.length ? "FOUT" : "GOED") + ": " + (n - fouten.length) + " controles geslaagd, " + fouten.length + " mislukt");
fouten.forEach(function(x) { console.log("  - " + x); });
if (fouten.length) process.exit(1);
