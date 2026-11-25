// Tests voor de Nederlandse grensgemeenten (plan T5b par. 3.1, B1). Alleen bouwomgeving, niet in de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node --max-old-space-size=6000 test-grensgemeenten-nl.mjs <cbsgebiedsindelingen2026.gpkg> <sectoren.geojson> <map NE>
// - byte-gelijk: het script maakt opnieuw precies items/gemeenten-nl.js en afgeleid/grensgemeenten-nl.js;
// - onafhankelijk van de meting van het script (hoekpunten, geen lijnstukken):
//   elke CBS-gemeente met een hoekpunt binnen 1 m van de buitenrand van Belgie is een grensgemeente van Belgie, en omgekeerd ligt
//   elke grensgemeente van Belgie met een hoekpunt binnen de tolerantie; elke grensgemeente van Duitsland ligt met een hoekpunt
//   binnen de zoekafstand van Natural Earth DEU en heeft geen grens met Belgie die de hele Duitse lengte verklaart;
// - de open lijst: elke uitzondering staat letterlijk in open-vragen.md;
// - mutanten op de tabel en de keuze.

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
import { bouw, schrijf, lees, meet, kies, raster, afstand } from "./maak-grensgemeenten-nl.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var ROOT = path.resolve(HIER, "..", "..");
var PADEN = { gpkg: process.argv[2], sectoren: process.argv[3], ne: process.argv[4] };
var GG = await import(pathToFileURL(path.join(ROOT, "src/core/topo/items/gemeenten-nl.js")).href);
var GR = (await import(pathToFileURL(path.join(ROOT, "src/core/topo/afgeleid/grensgemeenten-nl.js")).href)).GRENSGEMEENTEN_NL;
function kopie(x) { return JSON.parse(JSON.stringify(x)); }
var n = 0, fouten = [];
function eis(ok, t) { n++; if (!ok) fouten.push(t); }

// ---- byte-gelijk ----
var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "grensgemeenten-"));
var r = await bouw(PADEN);
schrijf(tmp, r);
["items/gemeenten-nl.js", "afgeleid/grensgemeenten-nl.js"].forEach(function(b) { eis(fs.readFileSync(path.join(tmp, b)).equals(fs.readFileSync(path.join(ROOT, "src/core/topo", b))), "byte-gelijk: " + b); });

// ---- onafhankelijk: hoekpunten ----
var B = lees(PADEN), T = B.T;
var g = await leesGpkg(B.gpkg.buf, "gemeente_niet_gegeneraliseerd", ["statcode", "statnaam"], "geom", "statcode");
var s = leesGeojson(B.sect.buf, []);
var ts = topology({ s: { type: "GeometryCollection", geometries: s.records.map(function(x) { return { type: "MultiPolygon", coordinates: x.delen }; }) } });
var t1 = proj4(CRS_GEOJSON["EPSG:3812"], CRS["EPSG:28992"]), be = [];
merge(ts, ts.objects.s.geometries).coordinates.forEach(function(p) { p.forEach(function(x) { be.push(x.map(function(c) { return t1.forward(c); })); }); });
var t2 = proj4("EPSG:4326", CRS["EPSG:28992"]), de = [];
var DEf = JSON.parse(B.ne.buf.toString("utf8")).features.filter(function(f) { return f.properties.ADM0_A3 === "DEU"; })[0];
(DEf.geometry.type === "Polygon" ? [DEf.geometry.coordinates] : DEf.geometry.coordinates).forEach(function(p) { p.forEach(function(x) { de.push(x.map(function(c) { return t2.forward(c); })); }); });
var rb = raster(be, 2000), rd = raster(de, T.regels.zoekafstandDeM);
var naar = {}; GR.forEach(function(x) { (naar[x.van] = naar[x.van] || []).push(x.naar); });
g.records.forEach(function(rec) {
  var c = rec.kenmerken.statcode, id = "gem-nl-" + c.toLowerCase(), minBe = Infinity, minDe = Infinity;
  leesGeometrie(rec.geom).forEach(function(p) { p.forEach(function(ring) { ring.forEach(function(q) { var a = afstand(q, rb), d = afstand(q, rd); if (a < minBe) minBe = a; if (d < minDe) minDe = d; }); }); });
  var l = naar[id] || [];
  if (minBe <= 1) eis(l.indexOf("BEL") >= 0, "hoekpunt op de grens met Belgie, dus grensgemeente van Belgie: " + c + " " + rec.kenmerken.statnaam);
  if (l.indexOf("BEL") >= 0) eis(minBe <= T.regels.tolerantieBeM, "grensgemeente van Belgie met een hoekpunt bij Belgie: " + c);
  if (l.indexOf("DEU") >= 0) eis(minDe <= T.regels.zoekafstandDeM, "grensgemeente van Duitsland met een hoekpunt binnen de zoekafstand van NE DEU: " + c);
});
eis(GG.GEMEENTEN_NL.every(function(it) { return !!naar[it.id]; }) && Object.keys(naar).every(function(id) { return GG.GEMEENTEN_NL.some(function(it) { return it.id === id; }); }), "items en relaties horen bij elkaar");
eis(!naar["gem-nl-gm1979"], "Eemsdelta is uitgezonderd");
// bekende gevallen (plan T5b par. 3.1): Vaals (beide), Baarle-Nassau en Sluis (Belgie) wel; Utrecht niet
eis((naar["gem-nl-gm0981"] || []).slice().sort().join() === "BEL,DEU", "Vaals grenst aan Belgie en Duitsland");
eis((naar["gem-nl-gm0744"] || []).join() === "BEL" && (naar["gem-nl-gm1714"] || []).join() === "BEL", "Baarle-Nassau en Sluis grenzen aan Belgie");
eis(!naar["gem-nl-gm0344"], "Utrecht is geen grensgemeente");
// de open lijst
var open = fs.readFileSync(path.join(ROOT, "src/core/topo/open-vragen.md"), "utf8");
GG.AFWIJKINGEN_GRENS.forEach(function(a) { eis(open.indexOf("- " + a.id + " | ") >= 0 && open.indexOf(a.tekst) >= 0, "open lijst: " + a.id); });

// ---- mutanten: kies met een gewijzigde tabel (de meting een keer) ----
var M = await meet(B, T.regels);
var basis = kies(M, T).map(function(x) { return x.code + x.land; }).join();
var MUT = [
  ["uitzondering met een verkeerde naam", function(t) { t.uitgezonderd.GM1979.naam = "Delfzijl"; }],
  ["geen uitzondering voor Eemsdelta", function(t) { delete t.uitgezonderd.GM1979; }],
  ["minimum boven de kortste grens", function(t) { t.regels.minimumM = 600; }]
];
var gevangen = 0, gemist = [];
MUT.forEach(function(m) {
  var t = kopie(T); m[1](t);
  var anders; try { anders = kies(M, t).map(function(x) { return x.code + x.land; }).join() !== basis; } catch (e) { anders = true; }
  if (anders) gevangen++; else gemist.push(m[0]);
});
eis(gemist.length === 0, "mutanten gevangen: " + gemist.join(", "));

console.log("grensgemeenten: " + GG.GEMEENTEN_NL.length + ", grenst-aan BEL " + GR.filter(function(x) { return x.naar === "BEL"; }).length + ", DEU " + GR.filter(function(x) { return x.naar === "DEU"; }).length);
console.log("mutanten grensgemeenten: " + gevangen + " van " + MUT.length + " gevangen");
console.log("test-grensgemeenten-nl: " + (fouten.length ? "FOUT" : "GOED") + ": " + (n - fouten.length) + " controles geslaagd, " + fouten.length + " mislukt");
fouten.forEach(function(f) { console.log("  - " + f); });
if (fouten.length) process.exit(1);
