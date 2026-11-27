// De kaarten van fase 6.3: Nederland en Belgie, Europa, Europa kleine staten (bouwplan T2b-2 fase 6.3). Alleen bouwomgeving.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node --max-old-space-size=8000 maak-kaarten.mjs <map met de Natural Earth-bestanden> <cbsgebiedsindelingen2026.gpkg>
//          <sectoren.geojson> <uitvoermap> [kaartId,kaartId] [natpark.gpkg van RVO, voor de streken uit een Nationaal Park]
//          [INSPIRESurfaceWaterBody.gml, de landelijke KRW-waterlichamen, voor het water van Nederland (T5b-2)]
//          [top10nl-waterdeel-t5b2.json, de bundel met de TOP10NL-waterdelen (T5b-2)]
//          [nwb-vaarwegen-t5b3.json en spw-parcs-nationaux-t5b3.json, de kanalen en de Waalse parken (T5b-3a)] [Lbstrbel.gpkg (T5b-3c)]
// - leest de configuratie tools/topo/kaarten/<kaartId>.json en de kennisbank (alleen lezen);
// - de bronnen via openBron, met de SHA-256 uit het register;
// - projecteert, knipt, maakt een topologie, vereenvoudigt en rondt af met dezelfde regels als maak-proefkaarten.mjs (T2a).
//   Die code staat hier bewust opnieuw (open lijst): maak-proefkaarten.mjs exporteert niets, draait bij het importeren en
//   mag niet wijzigen. Per kaart de tolerantie en de afronding uit de configuratie (nlbe: 0,0625 px bij x1 en 0,01; A1);
// - schrijft src/core/topo/kaarten/<kaartId>.js met gedeelde bogen (plan T3 par. 3.5, bogen.mjs); uitgepakt met pakUit
//   (src/core/topo/kaart/bogen.js) is dat byte-gelijk de vorm van de T2a-kaarten, zodat tik-meet.mjs ze ongewijzigd meet;
//   per item alleen de kennisbank-id (KAARTREF), geen naam (B1 a, B2 a);
// - T5c: een kaart met een indeling in src/core/topo/kaartdelen.js krijgt ook zijn delen (<kaartId>-basis.js en -<deel>.js), via
//   maak-kaartdelen.mjs; de app laadt alleen de delen;
// - de grensmeting NL-BE op de uiteindelijke kaartgeometrie (bouwplan par. 1, optie a); stopt bij elke overschrijding.

import fs from "fs";
import path from "path";
import crypto from "crypto";
import zlib from "zlib";
import { fileURLToPath, pathToFileURL } from "url";
import proj4 from "proj4";
import { pakIn } from "./bogen.mjs";
import ClipperLib from "clipper-lib";
import { geoPath, geoTransverseMercator, geoAzimuthalEqualArea } from "d3-geo";
import { topology } from "topojson-server";
import { presimplify, simplify } from "topojson-simplify";
import { feature, merge } from "topojson-client";
import { oppervlak, pool, getekendeAfstand, afstandTotLijnstuk } from "./vlakpunt.mjs";
import { openBron, CRS } from "./bronnen/bron.mjs";
import { leesGpkg, leesGeometrie } from "./bronnen/lees-gpkg.mjs";
import { leesGeojson, CRS_GEOJSON } from "./bronnen/lees-geojson.mjs";
import { noordzeeVlak } from "./maak-water-nlbe.mjs";
import { shaComponent } from "./maak-eilanden-nl.mjs";
import { openKrw, openTop10, GEOM_PER_SOORT, krwVorm } from "./maak-water-nl.mjs";
import { openNwb } from "./maak-kanalen-nl.mjs";
import { openSpw } from "./maak-parken-be.mjs";
import { openLbs } from "./maak-streken-be.mjs";
import { KAARTDELEN } from "../../src/core/topo/kaartdelen.js";
import { splits as splitsDelen, schrijf as schrijfDelen } from "./maak-kaartdelen.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var ROOT = path.resolve(HIER, "..", "..");
var BRONNEN = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8"));
var NEB = BRONNEN.naturalEarth.bestanden;
export var BREEDTE = 1000;
export var WEERGAVE = 428 - 2 * 16;
export var EENHEID_PX = WEERGAVE / BREEDTE;
export var KAARTIDS = ["nlbe", "europa", "koninkrijk"];
export var GRENS_MIN_STUK_PX2 = 0.01, GRENS_ZONE_PX = 2, GRENS_EIS_PX = 0.5, GRENS_MEETFOUT_PX = 0.05, GRENS_STAP_PX = 0.1, ZOOM_GRENS = 8;
export var SOORT_PER_BRON = { "cbs-provincie": "provincie", "stb-provincie": "provincie", "stb-gewest": "gewest", "stb-taalgebied": "taalgebied", "cbs-gemeente": "gemeente", "streek": "streek", "kb-grenspunt": "grenspunt", "stb-enclaves": "bijzonder-gebied", "ne-koninkrijk": "gebied", "kb-punt": "stad", "ne-rivier": "rivier", "cbs-eiland": "eiland", "ne-land": "land", "land-nlbe": "land", "water-zee": "zee", "water-meer": "meer", "water-zeearm": "zeearm", "water-rivier": "rivier", "water-rivier-vlak": "rivier", "rvo-park": "natuurgebied", "nwb-kanaal": "kanaal", "spw-park": "natuurgebied" };
// T5b-2 (plan par. 3.3): een park dat al een streek is, staat als die streek in de laag van de parken (een item, twee rollen)
export function soortPastInLaag(bron, it) { return it.soort === SOORT_PER_BRON[bron] || (bron === "rvo-park" && it.soort === "streek" && !!it.feiten.nationaalPark); }
export var GZIP_DOEL = { nlbe: 40 * 1024, europa: 120 * 1024, koninkrijk: 40 * 1024 };

function fout(t) { throw new Error(t); }
function sha(b) { return crypto.createHash("sha256").update(b).digest("hex"); }

// ---- de kennisbank (alleen lezen) ----
async function kennisbank() {
  var bestanden = ["items/landen.js", "items/steden-nl.js", "items/provincies.js", "items/gewesten.js", "items/steden-be.js", "items/water-nlbe.js", "items/eilanden-nl.js", "items/taalgebieden.js", "items/gemeenten-nl.js", "items/streken-nl.js", "items/grensgebieden.js", "items/koninkrijk.js", "items/water-nl.js", "items/parken-nl.js", "items/kanalen-nl.js", "items/parken-be.js", "items/water-be.js", "items/streken-be.js"];
  var perId = {};
  for (var i = 0; i < bestanden.length; i++) {
    var m = await import(pathToFileURL(path.join(ROOT, "src/core/topo", bestanden[i])).href);
    Object.keys(m).forEach(function(k) { if (Array.isArray(m[k]) && m[k].length && m[k][0].soort && m[k][0].geometrie) m[k].forEach(function(it) { if (perId[it.id]) fout("dubbele id in de kennisbank: " + it.id); perId[it.id] = it; }); });
  }
  return perId;
}

// ---- de bronnen: alle geometrie als GeoJSON in lon/lat ----
function bronnen(paden) {
  var cache = {};
  function ne(naam) {
    if (cache[naam]) return cache[naam];
    var b = openBron(path.join(paden.ne, naam), "NE", naam);
    if (NEB[naam] !== undefined && b.sha256 !== NEB[naam]) fout("SHA-256 van " + naam + " wijkt af van naturalEarth");
    cache[naam] = { sha: b.sha256, buf: b.buf, fs: JSON.parse(b.buf.toString("utf8")).features };
    return cache[naam];
  }
  return { ne: ne, paden: paden };
}
function rdNaarLl() { return proj4(CRS["EPSG:28992"], "EPSG:4326"); }
function lambertNaarLl() { return proj4(CRS_GEOJSON["EPSG:3812"], "EPSG:4326"); }
function zetOm(delen, t) { return d3Wind(delen.map(function(p) { return p.map(function(r) { return r.map(function(c) { return t.forward(c); }); }); })); }
// d3-geo leest een ring op de bol: de buitenring met de klok mee (in lon/lat), gaten tegen de klok in. polygon-clipping en
// topojson merge geven het omgekeerde (GeoJSON-volgorde); zonder omdraaien tekent d3 "de wereld min het land".
// Alleen voor CBS, Statbel en de afgeleide vlakken (klein gebied, geen datumgrens); Natural Earth blijft zoals het is.
function oppLl(r) { var s = 0; for (var i = 1; i < r.length; i++) s += r[i - 1][0] * r[i][1] - r[i][0] * r[i - 1][1]; return s / 2; }
export function d3Wind(delen) { return delen.map(function(p) { return p.map(function(r, i) { var a = oppLl(r); return (i === 0 ? a > 0 : a < 0) ? r.slice().reverse() : r; }); }); }

// Naaldregel (GPT-advies 19-11-2026, optie A): alleen op vlakringen direct na een merge, in de broncoordinaten, voor de projectie.
// Een hoekpunt B met buren A en A (exact gelijk, ook over de overgang van het laatste naar het eerste punt) is een naald: de ring
// gaat heen en exact terug. B en een van de twee A's worden verwijderd, herhaald tot er geen naald meer is. Exacte gelijkheid, geen
// tolerantie. Een ring met minder dan 3 verschillende punten vervalt; vervalt de buitenring, dan vervalt het hele vlak (oppervlakte 0).
// De verwijdering is een vrije reductie: de overblijvende ring is (op de cyclische volgorde na) uniek, wat de startpositie ook is.
function zelfdePunt(a, b) { return a[0] === b[0] && a[1] === b[1]; }
export function zonderNaaldenRing(ring, melding) {
  var p = ring.slice(0, ring.length - 1), st = [];
  function meld(tip, a) { if (melding) melding.push({ tip: tip, lengte: Math.hypot(tip[0] - a[0], tip[1] - a[1]) }); }
  p.forEach(function(q) {
    if (st.length && zelfdePunt(st[st.length - 1], q)) return;                 // dubbel punt
    st.push(q);
    while (st.length >= 3 && zelfdePunt(st[st.length - 1], st[st.length - 3])) { var a = st.pop(), tip = st.pop(); meld(tip, a); }
  });
  // de overgang van het eind naar het begin
  var veranderd = true;
  while (veranderd && st.length >= 3) {
    veranderd = false;
    var n = st.length;
    if (zelfdePunt(st[n - 1], st[0])) { st.pop(); veranderd = true; continue; }
    if (zelfdePunt(st[n - 1], st[1])) { meld(st[0], st[1]); st.shift(); st.shift(); veranderd = true; continue; }
    if (zelfdePunt(st[n - 2], st[0])) { meld(st[n - 1], st[0]); st.pop(); st.pop(); veranderd = true; continue; }
  }
  var k = {}; st.forEach(function(q) { k[q[0] + "," + q[1]] = 1; });
  if (Object.keys(k).length < 3) return null;
  return st.concat([st[0].slice()]);
}
export function zonderNaalden(delen, melding) {
  var uit = [];
  delen.forEach(function(poly) {
    var buiten = zonderNaaldenRing(poly[0], melding);
    if (!buiten) return;
    var gaten = poly.slice(1).map(function(r) { return zonderNaaldenRing(r, melding); }).filter(function(r) { return r; });
    uit.push([buiten].concat(gaten));
  });
  return uit;
}
function oppDelen(delen) { var s = 0; delen.forEach(function(p) { p.forEach(function(r, i) { var a = 0; for (var j = 1; j < r.length; j++) a += r[j - 1][0] * r[j][1] - r[j][0] * r[j - 1][1]; s += (i === 0 ? 1 : -1) * Math.abs(a / 2); }); }); return s; }
function ontNaald(delen, naam, melding) {
  var m = [], uit = zonderNaalden(delen, m), voor = oppDelen(delen), na = oppDelen(uit);
  if (Math.abs(voor - na) > 1e-6 * Math.max(1, Math.abs(voor))) fout("naaldregel veranderde de oppervlakte van " + naam + ": " + voor + " naar " + na);
  m.forEach(function(x) { x.waar = naam; melding.push(x); });
  return uit;
}

// CBS: provincies en gemeenten (RD), eenmaal gelezen
async function leesCbs(paden) {
  var g = BRONNEN.cbsGebiedsindelingen2026, b = openBron(paden.gpkg, "CBSGEB", g.gpkg.bestand);
  if (b.sha256 !== g.gpkg.sha256) fout("SHA-256 van CBSGEB wijkt af");
  var prov = {}, gem = {}, pvVan = {}, provGem = {};
  (await leesGpkg(b.buf, "provincie_gegeneraliseerd", ["statcode"], "geom", "statcode")).records.forEach(function(r) { prov[r.kenmerken.statcode] = leesGeometrie(r.geom); });
  (await leesGpkg(b.buf, "gemeente_niet_gegeneraliseerd", ["statcode"], "geom", "statcode")).records.forEach(function(r) { gem[r.kenmerken.statcode] = leesGeometrie(r.geom); });
  // V4 b (GPT 18-11-2026): de kaartgeometrie van een provincie (en daarmee van NLD) = de niet-gegeneraliseerde gemeenten van die
  // provincie samen, zonder vereniging (zoals N1 a); de indeling uit gebiedsindelingen_register. De GEOREF van de items blijft.
  (await leesGpkg(b.buf, "gebiedsindelingen_register", ["gm_code", "pv_code"], "fid", "gm_code")).records.forEach(function(r) {
    var k = r.kenmerken; if (pvVan[k.gm_code]) fout("CBSGEB: gemeente twee keer in het register: " + k.gm_code); pvVan[k.gm_code] = k.pv_code;
  });
  // samenvoegen per provincie met topojson merge (exact op gedeelde randen, zoals bij Statbel; geen polygon-clipping, dus geen naalden):
  // zo vallen de binnengrenzen tussen gemeenten weg. De topologie zonder kwantisering, in RD.
  var codes = Object.keys(gem).sort(), topoG = topology({ g: { type: "GeometryCollection", geometries: codes.map(function(c) { return { type: "MultiPolygon", coordinates: gem[c] }; }) } });
  var perPv = {};
  codes.forEach(function(c, i) { var pv = pvVan[c] || fout("CBSGEB: gemeente zonder provincie: " + c); (perPv[pv] = perPv[pv] || []).push(topoG.objects.g.geometries[i]); });
  var naalden = [];
  Object.keys(perPv).sort().forEach(function(pv) { provGem[pv] = ontNaald(merge(topoG, perPv[pv]).coordinates, pv, naalden); });
  var heelNl = ontNaald(merge(topoG, topoG.objects.g.geometries).coordinates, "NLD", naalden);
  if (Object.keys(pvVan).length !== Object.keys(gem).length) fout("CBSGEB: register en gemeentelaag verschillen in aantal");
  Object.keys(prov).forEach(function(c) { if (!provGem[c]) fout("CBSGEB: provincie zonder gemeenten: " + c); });
  // T5b (plan par. 3.1): een gemeente uit dezelfde topologie, dus met dezelfde randen als de provincies
  function gemeente(c) { var i = codes.indexOf(c); if (i < 0) fout("CBSGEB: geen gemeente " + c); return ontNaald(merge(topoG, [topoG.objects.g.geometries[i]]).coordinates, c, naalden); }
  // T5b (plan par. 3.4): een streek als vereniging van gemeenten, uit dezelfde topologie
  function gemeenten(lijst, naam) { var x = lijst.map(function(c) { var i = codes.indexOf(c); if (i < 0) fout("CBSGEB: geen gemeente " + c); return topoG.objects.g.geometries[i]; }); return ontNaald(merge(topoG, x).coordinates, naam, naalden); }
  return { sha: b.sha256, prov: prov, gem: gem, provGem: provGem, heelNl: heelNl, naalden: naalden, gemeente: gemeente, gemeenten: gemeenten };
}
// RVO: de Nationale Parken (RD), alleen als een kaart ze gebruikt (het pad is dan verplicht)
async function leesRvo(paden) {
  var g = BRONNEN.rvoNationaleParken, b = openBron(paden.rvo, "RVO", g.gpkg.bestand);
  if (b.sha256 !== g.gpkg.sha256) fout("SHA-256 van natpark.gpkg wijkt af");
  var per = {};
  (await leesGpkg(b.buf, g.gpkg.laag, ["naam"], "geom", "naam")).records.forEach(function(r) { if (per[r.kenmerken.naam]) fout("RVO: naam twee keer: " + r.kenmerken.naam); per[r.kenmerken.naam] = leesGeometrie(r.geom); });
  return { sha: b.sha256, per: per };
}
// Statbel: de sectoren, exact samengevoegd per sleutel via gedeelde randen (topojson zonder kwantisering)
function leesStatbel(paden) {
  var s = BRONNEN.statbel.sectoren, b = openBron(paden.sectoren, "STB", s.geojson.bestand);
  if (b.sha256 !== s.geojson.sha256) fout("SHA-256 van de sectoren wijkt af");
  var g = leesGeojson(b.buf, ["cd_prov_refnis", "cd_rgn_refnis", "cd_munty_refnis"]);
  var topo = topology({ s: { type: "GeometryCollection", geometries: g.records.map(function(r) { return { type: "MultiPolygon", coordinates: r.delen }; }) } });
  var geoms = topo.objects.s.geometries;
  var naalden = [];
  function samen(filter, naam) { var x = []; g.records.forEach(function(r, i) { if (filter(r.kenmerken)) x.push(geoms[i]); }); if (!x.length) fout("Statbel: geen sectoren"); return ontNaald(merge(topo, x).coordinates, naam, naalden); }
  return { sha: b.sha256, samen: samen, naalden: naalden };
}

// ---- projectie, knippen en vereenvoudigen (dezelfde regels als maak-proefkaarten.mjs) ----
function maakPr(cfg) {
  var p = cfg.projectie;
  if (p.naam === "transverseMercator") return geoTransverseMercator().rotate(p.rotate);
  if (p.naam === "azimuthalEqualArea") return geoAzimuthalEqualArea().rotate(p.rotate);
  return fout("onbekende projectie: " + p.naam);
}
function multi(delen) { return { type: "MultiPolygon", coordinates: delen }; }
function maakProjectie(cfg, doelDelen) {
  var pr = maakPr(cfg), pts = [];
  for (var i = 0; i <= 8; i++) for (var j = 0; j <= 8; j++) pts.push([cfg.lon[0] + (cfg.lon[1] - cfg.lon[0]) * i / 8, cfg.lat[0] + (cfg.lat[1] - cfg.lat[0]) * j / 8]);
  var mp = { type: "MultiPoint", coordinates: pts };
  pr.fitWidth(BREEDTE, mp);
  var b = geoPath(pr).bounds(mp), hoogte = Math.ceil(b[1][1]);
  if (!cfg.doek) { pr.clipExtent([[0, 0], [BREEDTE, hoogte]]); return { pr: pr, breedte: BREEDTE, hoogte: hoogte, start: [0, 0] }; }
  var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  // het doek omvat alleen de delen van de doelen die in de uitsnede liggen (het midden van de buitenring binnen lon en lat van de
  // configuratie): zo tellen overzeese delen (Frans-Guyana bij FRA, Caribisch Nederland bij NLD) niet mee (besluit Claude 19-11-2026)
  function inUitsnede(p) { var r = p[0], x = 0, y = 0; for (var i = 0; i < r.length - 1; i++) { x += r[i][0]; y += r[i][1]; } x /= r.length - 1; y /= r.length - 1; return x >= cfg.lon[0] && x <= cfg.lon[1] && y >= cfg.lat[0] && y <= cfg.lat[1]; }
  doelDelen = doelDelen.map(function(d) { return d.filter(inUitsnede); }).filter(function(d) { return d.length; });
  doelDelen.forEach(function(d) { var bb = geoPath(pr).bounds(multi(d)); x0 = Math.min(x0, bb[0][0]); y0 = Math.min(y0, bb[0][1]); x1 = Math.max(x1, bb[1][0]); y1 = Math.max(y1, bb[1][1]); });
  x0 = Math.floor(x0 - cfg.doek.rand); y0 = Math.floor(y0 - cfg.doek.rand); x1 = Math.ceil(x1 + cfg.doek.rand); y1 = Math.ceil(y1 + cfg.doek.rand);
  var t = pr.translate(); pr.translate([t[0] - x0, t[1] - y0]);
  pr.clipExtent([[0, 0], [x1 - x0, y1 - y0]]);
  return { pr: pr, breedte: x1 - x0, hoogte: y1 - y0, start: [-x0, -y0] };
}
function vlak(pr, geom, gesloten) {
  var ringen = [], huidig = null;
  var ctx = { moveTo: function(x, y) { huidig = [[x, y]]; ringen.push(huidig); }, lineTo: function(x, y) { huidig.push([x, y]); }, closePath: function() { if (gesloten && huidig.length) huidig.push([huidig[0][0], huidig[0][1]]); }, arc: function() {} };
  geoPath(pr).context(ctx)(geom);
  return ringen.filter(function(r) { return r.length >= (gesloten ? 4 : 2); });
}
function maakRond(stap) { var f = Math.round(1 / stap); return function(v) { return Math.round(v * f) / f; }; }
// Vereenvoudiging per boog (besluit Claude 19-11-2026, tussenweg): dezelfde regels als T2a (Visvalingam via topojson-simplify, de
// afwijking na afronding van elk oorspronkelijk punt tot het vereenvoudigde pad, hoogstens TOL), maar het gewicht wordt per boog van
// de topologie gezocht in plaats van een gewicht voor de hele kaart. Gedeelde grenzen zijn een boog en blijven dus identiek. Een
// ring die zou verdwijnen, blijft origineel (T2a).
function vereenvoudig(items, TOL, rond, behoud) {
  function rondRing(r) { var uit = []; r.forEach(function(q) { var x = rond(q[0]), y = rond(q[1]); var l = uit[uit.length - 1]; if (!l || l[0] !== x || l[1] !== y) uit.push([x, y]); }); return uit; }
  function verschillend(r) { var k = {}; r.forEach(function(q) { k[q[0] + "," + q[1]] = 1; }); return Object.keys(k).length; }
  var fc = { type: "FeatureCollection", features: items.map(function(it, i) { return { type: "Feature", id: i, geometry: it.lijn ? { type: "MultiLineString", coordinates: it.ringen } : { type: "MultiPolygon", coordinates: it.ringen.map(function(r) { return [r]; }) } }; }) };
  var topo = presimplify(topology({ k: fc }));
  // afwijking van een boog bij gewicht w: elk oorspronkelijk punt tot de afgeronde vereenvoudigde lijn (het eigen stuk en de buren)
  function boogAfwijking(arc, w) {
    var vast = arc.vast, keep = []; for (var i = 0; i < arc.length; i++) if (i === 0 || i === arc.length - 1 || arc[i][2] >= w || (vast && vast[i])) keep.push(i);
    var rs = keep.map(function(k) { return [rond(arc[k][0]), rond(arc[k][1])]; }), max = 0, j = 0;
    for (var t = 0; t < arc.length; t++) {
      while (j + 1 < keep.length - 1 && keep[j + 1] <= t) j++;
      var m = Infinity;
      for (var k = Math.max(0, j - 1); k <= Math.min(rs.length - 2, j + 1); k++) m = Math.min(m, afstandTotLijnstuk(arc[t], rs[k], rs[k + 1]));
      if (rs.length === 1) m = Math.hypot(arc[t][0] - rs[0][0], arc[t][1] - rs[0][1]);
      if (m > max) max = m;
    }
    return { max: max, keep: keep };
  }
  var gewichten = [], maxAf = 0;
  var vastePunten = 0;
  var bogen = topo.arcs.map(function(arc) {
    if (behoud) { var vast = null; for (var i = 0; i < arc.length; i++) if (behoud(arc[i])) { vast = vast || new Uint8Array(arc.length); vast[i] = 1; vastePunten++; } arc.vast = vast; }
    var b0 = boogAfwijking(arc, 0);
    if (b0.max > TOL) fout("zelfs zonder vereenvoudiging te grote afwijking op een boog: " + b0.max);
    var lo = 0, hi = 5000, best = b0;
    for (var n = 0; n < 30; n++) { var mid = (lo + hi) / 2, r = boogAfwijking(arc, mid); if (r.max <= TOL) { lo = mid; best = r; } else hi = mid; }
    gewichten.push(lo); if (best.max > maxAf) maxAf = best.max;
    return best.keep.map(function(k) { return [arc[k][0], arc[k][1]]; });
  });
  var s = { type: "Topology", objects: topo.objects, arcs: bogen }, fs2 = feature(s, s.objects.k).features;
  var ringen = items.map(function(it, i) {
    var g = fs2[i].geometry, rs = !g ? [] : (it.lijn ? g.coordinates : g.coordinates.map(function(p) { return p[0]; }));
    return it.ringen.map(function(orig, k) {
      var simp = rs[k];
      if (!simp || simp.length < (it.lijn ? 2 : 4) || verschillend(simp) < (it.lijn ? 2 : 3)) simp = orig;
      var min = it.lijn ? 2 : 4, r = rondRing(simp);
      if (r.length >= min) return r;
      // geen ring weglaten (besluit Claude 19-11-2026): valt hij na het afronden samen, dan de afgeronde oorspronkelijke ring, zo nodig
      // aangevuld met zijn laatste punt tot een geldige ring (zonder oppervlakte); zo blijft elk oorspronkelijk punt binnen de tolerantie
      r = rondRing(orig);
      while (r.length < min) r.push(r[r.length - 1].slice());
      return r;
    });
  });
  gewichten.sort(function(a, b) { return a - b; });
  function q(f) { return gewichten.length ? gewichten[Math.floor(f * (gewichten.length - 1))] : 0; }
  return { max: maxAf, ringen: ringen, gewicht: { bogen: gewichten.length, min: q(0), mediaan: q(0.5), max: q(1), vastePunten: vastePunten } };
}
function maakGetal(stap) { var f = Math.round(1 / stap); return function(v) { return String(Math.round(v * f) / f); }; }
function pad(ringen, gesloten, getal) {
  return ringen.map(function(r) {
    var pts = gesloten ? r.slice(0, r.length - 1) : r, uit = "M" + getal(pts[0][0]) + "," + getal(pts[0][1]);
    if (pts.length > 1) uit += "l" + pts.slice(1).map(function(q, i) { return getal(q[0] - pts[i][0]) + "," + getal(q[1] - pts[i][1]); }).join(" ");
    return uit + (gesloten ? "Z" : "");
  }).join("");
}

// ---- conventies van T2a (Europa) ----
function zonderVer(delen, lonMin) { return delen.filter(function(c) { var rr = c[0], som = 0; rr.forEach(function(q) { som += q[0]; }); return som / rr.length >= lonMin; }); }
function knipRing(ring, lat, noord) {
  function binnen(q) { return noord ? q[1] >= lat : q[1] <= lat; }
  function snij(a, b) { var t = (lat - a[1]) / (b[1] - a[1]); return [a[0] + (b[0] - a[0]) * t, lat]; }
  var uit = [], n = ring.length - 1;
  for (var i = 0; i < n; i++) { var a = ring[i], b = ring[i + 1]; if (binnen(a)) { uit.push(a); if (!binnen(b)) uit.push(snij(a, b)); } else if (binnen(b)) uit.push(snij(a, b)); }
  if (uit.length) uit.push(uit[0]);
  return uit;
}
function knip(delen, lat, noord) { return delen.map(function(c) { return c.map(function(rr) { return knipRing(rr, lat, noord); }).filter(function(rr) { return rr.length >= 4; }); }).filter(function(c) { return c.length; }); }

// NE admin-0: per ADM0_A3 alle delen (polygonen), met de conventies
function neLanden(B, cfg) {
  var per = {};
  B.ne("ne_10m_admin_0_map_units.geojson").fs.forEach(function(f) {
    var k = f.properties.ADM0_A3, g = f.geometry, d = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    per[k] = (per[k] || []).concat(d);
  });
  var c = cfg.conventies || {};
  if (c.verreDelen) c.verreDelen.landen.forEach(function(k) { per[k] = zonderVer(per[k], c.verreDelen.lonMin); });
  if (c.marokkoGrens !== undefined && per.MAR && per.SAH) {
    var zuid = knip(per.MAR, c.marokkoGrens, false), noord = knip(per.MAR, c.marokkoGrens, true);
    var t = topology({ s: { type: "GeometryCollection", geometries: [multi(per.SAH), multi(zuid)] } });
    per.MAR = noord; per.SAH = merge(t, t.objects.s.geometries).coordinates;
  }
  return per;
}

// ---- de kaart ----
export async function maakKaart(cfg, KB, B, gedeeld) {
  var invoer = {};
  function gebruik(id, s) { invoer[id + ":" + s] = 1; }
  var NE = neLanden(B, cfg); gebruik("NE", NEB["ne_10m_admin_0_map_units.geojson"]);
  function item(id) { var it = KB[id]; if (!it) fout("onbekende kennisbank-id op de kaart " + cfg.id + ": " + id); return it; }
  // geometrie per bron (lon/lat, lijst van polygonen of lijnen)
  function geom(bron, id) {
    var it = id ? item(id) : null;
    if (bron === "cbs-provincie") { if (it.soort !== "provincie") fout("geen provincie: " + id); var cb = gedeeld.cbs(); gebruik("CBSGEB", cb.sha); var gp = it.geometrie.bron; if (gp.bronId !== "CBSGEB" || gp.sha256 !== cb.sha || gp.laag !== "provincie_gegeneraliseerd") fout("GEOREF van " + id + " past niet bij cbs-provincie"); if (!cb.prov[gp.waarde]) fout("CBS: geen " + id); return zetOm(cb.provGem[gp.waarde], rdNaarLl()); }
    if (bron === "cbs-eiland") {
      if (it.soort !== "eiland") fout("geen eiland: " + id);
      var cb2 = gedeeld.cbs(), g = it.geometrie.bron, comp = (cb2.gem[g.waarde] || fout("CBS: geen " + g.waarde))[g.deel];
      if (g.bronId !== "CBSGEB" || g.sha256 !== cb2.sha) fout("GEOREF van " + id + " past niet bij cbs-eiland");
      if (shaComponent(comp) !== g.deelSha256) fout("CBS: het component van " + id + " past niet bij de GEOREF");
      gebruik("CBSGEB", cb2.sha); return zetOm([comp], rdNaarLl());
    }
    if (bron === "stb-provincie" || bron === "stb-gewest") {
      var st = gedeeld.stb(), sl = bron === "stb-provincie" ? "cd_prov_refnis" : "cd_rgn_refnis", gs = it.geometrie.bron, code = gs.waarde;
      if (gs.bronId !== "STB" || gs.sha256 !== st.sha || gs.sleutel !== sl) fout("GEOREF van " + id + " past niet bij " + bron);
      if ((bron === "stb-provincie") !== (it.soort === "provincie")) fout("verkeerde soort voor " + bron + ": " + id);
      gebruik("STB", st.sha); return zetOm(st.samen(function(k) { return k[sl] === code; }, id), lambertNaarLl());
    }
    if (bron === "cbs-gemeente") {
      var cb5 = gedeeld.cbs(), g5 = it.geometrie.bron;
      if (it.soort !== "gemeente" || g5.bronId !== "CBSGEB" || g5.sha256 !== cb5.sha || g5.laag !== "gemeente_niet_gegeneraliseerd" || g5.sleutel !== "statcode") fout("GEOREF van " + id + " past niet bij cbs-gemeente");
      gebruik("CBSGEB", cb5.sha); return zetOm(cb5.gemeente(g5.waarde), rdNaarLl());
    }
    // T5b (plan par. 3.4): een streek uit een CBS-indeling (vereniging van gemeenten) of uit een Nationaal Park (RVO)
    if (bron === "streek" && it.geometrie.bron && it.geometrie.bron.bronId === "CBSGEB") {
      var cb6 = gedeeld.cbs(), g6 = it.geometrie.bron;
      if (it.soort !== "streek" || g6.bronId !== "CBSGEB" || g6.sha256 !== cb6.sha || g6.laag !== "gemeente_niet_gegeneraliseerd" || g6.sleutel !== "statcode" || !Array.isArray(g6.waarden) || !g6.waarden.length) fout("GEOREF van " + id + " past niet bij een streek uit CBS");
      gebruik("CBSGEB", cb6.sha); return zetOm(cb6.gemeenten(g6.waarden, id), rdNaarLl());
    }
    // T5b-3c (plan par. 3.3): een Belgische streek uit de landbouwstreken (KB 1951); bij meer landbouwstreken hun delen samen
    if (bron === "streek" && it.geometrie.bron && it.geometrie.bron.bronId === "LBS") {
      var lb = gedeeld.lbs(), gl = it.geometrie.bron;
      if (it.soort !== "streek" || gl.sha256 !== lb.sha || gl.sleutel !== "NAAM" || !Array.isArray(gl.waarden) || !gl.waarden.length) fout("GEOREF van " + id + " past niet bij een streek uit LBS");
      gebruik("LBS", lb.sha); var dl = []; gl.waarden.forEach(function(n) { dl = dl.concat(lb.per[n] || fout("LBS: geen " + n)); }); return d3Wind(dl);
    }
    if (bron === "streek") {
      var rv7 = gedeeld.rvo(), g7 = it.geometrie.bron;
      if (it.soort !== "streek" || g7.bronId !== "RVO" || g7.sha256 !== rv7.sha || g7.sleutel !== "naam" || !rv7.per[g7.waarde]) fout("GEOREF van " + id + " past niet bij een streek uit RVO");
      gebruik("RVO", rv7.sha); return zetOm(ontNaald(rv7.per[g7.waarde], id, []), rdNaarLl());
    }
    if (bron === "ne-koninkrijk") {
      // T5b (plan par. 3.5): Aruba, Curacao en Sint Maarten uit admin_0_map_units; Bonaire, Sint Eustatius en Saba uit admin_1
      var g9 = it.geometrie.bron;
      if (it.soort !== "gebied" || g9.bronId !== "NE") fout("GEOREF van " + id + " past niet bij ne-koninkrijk");
      if (g9.bestand === "ne_10m_admin_0_map_units.geojson" && g9.sleutel === "ADM0_A3") { if (g9.sha256 !== NEB[g9.bestand]) fout("GEOREF van " + id + ": andere SHA"); return NE[g9.waarde] || fout("NE: geen " + id); }
      if (g9.bestand === "ne_10m_admin_1_states_provinces.geojson" && g9.sleutel === "iso_3166_2") {
        var a9 = B.ne(g9.bestand); if (a9.sha !== g9.sha256) fout("GEOREF van " + id + ": andere SHA"); gebruik("NE", a9.sha);
        var f9 = a9.fs.filter(function(f) { return f.properties.iso_3166_2 === g9.waarde; });
        if (f9.length !== 1) fout("NE admin_1: niet precies een " + g9.waarde);
        return f9[0].geometry.type === "Polygon" ? [f9[0].geometry.coordinates] : f9[0].geometry.coordinates;
      }
      return fout("GEOREF van " + id + " past niet bij ne-koninkrijk");
    }
    if (bron === "stb-enclaves") {
      // T5b (plan par. 3.6): de Belgische enclaves = de delen van Belgie buiten het hoofdgebied, alleen de buitenrand
      var st8 = gedeeld.stb(), g8 = it.geometrie.bron;
      if (it.soort !== "bijzonder-gebied" || g8.bronId !== "STB" || g8.sha256 !== st8.sha || g8.sleutel !== "cd_munty_refnis" || g8.waarde !== "13002") fout("GEOREF van " + id + " past niet bij stb-enclaves");
      var alle8 = st8.samen(function() { return true; }, id), groot8 = -1, gi8 = -1;
      alle8.forEach(function(p, i) { var a = Math.abs(oppDelen([[p[0]]])); if (a > groot8) { groot8 = a; gi8 = i; } });
      gebruik("STB", st8.sha); return zetOm(alle8.filter(function(p, i) { return i !== gi8; }).map(function(p) { return [p[0]]; }), lambertNaarLl());
    }
    if (bron === "stb-taalgebied") {
      // T5b (plan par. 3.8): de sectoren van de gemeenten van het taalgebied (maak-taalgebieden-be.mjs)
      var st4 = gedeeld.stb(), gt = it.geometrie.bron;
      if (it.soort !== "taalgebied" || gt.bronId !== "STB" || gt.sha256 !== st4.sha || gt.sleutel !== "cd_munty_refnis" || !Array.isArray(gt.waarden) || !gt.waarden.length) fout("GEOREF van " + id + " past niet bij stb-taalgebied");
      gebruik("STB", st4.sha); return zetOm(st4.samen(function(k) { return gt.waarden.indexOf(k.cd_munty_refnis) >= 0; }, id), lambertNaarLl());
    }
    if (bron === "land-nlbe") {
      // N1 a (GPT 18-11-2026): NLD = de 12 provincievlakken samen, zonder vereniging (een vereniging gaf naalden zonder oppervlakte)
      if (id === "NLD") { var c3 = gedeeld.cbs(); gebruik("CBSGEB", c3.sha); return zetOm(c3.heelNl, rdNaarLl()); }
      if (id === "BEL") { var s3 = gedeeld.stb(); gebruik("STB", s3.sha); return zetOm(s3.samen(function() { return true; }, "BEL"), lambertNaarLl()); }
      return geom("ne-land", id);
    }
    if (bron === "ne-land") { if (it.soort !== "land") fout("geen land: " + id); if (it.geometrie.bron.sha256 !== NEB["ne_10m_admin_0_map_units.geojson"]) fout("GEOREF van " + id + " past niet bij ne-land"); return NE[it.geometrie.bron.waarde] || fout("NE: geen " + id); }
    if (bron === "ne-rivier") {
      var rv = B.ne("ne_10m_rivers_lake_centerlines.geojson"); gebruik("NE", rv.sha);
      var fs2 = rv.fs.filter(function(f) { return f.properties.name === it.geometrie.bron.waarde; });
      if (it.soort !== "rivier" || it.geometrie.bron.sha256 !== rv.sha) fout("GEOREF van " + id + " past niet bij ne-rivier");
      if (fs2.length !== it.geometrie.bron.features) fout("NE: aantal features van " + id);
      var l = []; fs2.forEach(function(f) { var g2 = f.geometry; l = l.concat(g2.type === "LineString" ? [g2.coordinates] : g2.coordinates); }); return l;
    }
    // T5b-2 (plan par. 3.2): water uit de landelijke KRW-waterlichamen, of uit BRT TOP10NL (de waterdelen met de naam); een item uit
    // meer delen: bij KRW hun delen samen (zonder vereniging), bij TOP10NL samengevoegd langs gedeelde randen (topojson merge)
    if (/^water-/.test(bron)) {
      var gk = it.geometrie.bron;
      if (!Array.isArray(gk.waarden) || !gk.waarden.length) fout("GEOREF van " + id + " past niet bij " + bron);
      if (gk.bronId === "KRW") {
        var kw = gedeeld.krw();
        if (gk.sha256 !== kw.sha || gk.sleutel !== "localId") fout("GEOREF van " + id + " past niet bij " + bron);
        gebruik("KRW", kw.sha);
        // T5c-3: via krwVorm (met deelGebied: alleen de stukken in het gebied, besluitOudeMaas)
        var kv = krwVorm(kw, gk);
        if (kv.soort !== (gk.vorm || GEOM_PER_SOORT[it.soort])) fout("KRW: " + gk.waarden.join(",") + " is een " + kv.soort + " voor " + id);
        var dk = kv.delen;
        return (gk.vorm || GEOM_PER_SOORT[it.soort]) === "lijn" ? dk : d3Wind(dk);
      }
      if (gk.bronId === "TOP10") {
        var tw = gedeeld.top10();
        if (gk.sha256 !== tw.sha || gk.sleutel !== "lokaal_id" || (gk.vorm || GEOM_PER_SOORT[it.soort]) !== "vlak") fout("GEOREF van " + id + " past niet bij " + bron);
        gebruik("TOP10", tw.sha);
        var tt = topology({ w: { type: "GeometryCollection", geometries: gk.waarden.map(function(k) { return { type: "MultiPolygon", coordinates: (tw.per[k] || fout("TOP10: geen waterdeel " + k)).delen }; }) } });
        return d3Wind(ontNaald(merge(tt, tt.objects.w.geometries).coordinates, id, []));
      }
      return fout("GEOREF van " + id + " past niet bij " + bron);
    }
    // T5b-2 (plan par. 3.3): een Nationaal Park (RVO), ook een streek die een park is
    if (bron === "rvo-park") {
      var rv8 = gedeeld.rvo(), gp8 = it.geometrie.bron;
      if (!soortPastInLaag(bron, it) || gp8.bronId !== "RVO" || gp8.sha256 !== rv8.sha || gp8.sleutel !== "naam" || !rv8.per[gp8.waarde]) fout("GEOREF van " + id + " past niet bij rvo-park");
      gebruik("RVO", rv8.sha); return zetOm(ontNaald(rv8.per[gp8.waarde], id, []), rdNaarLl());
    }
    // T5b-3a (plan par. 3.2): een kanaal = de vaarwegvakken van NWB Vaarwegen (lijnen)
    if (bron === "nwb-kanaal") {
      var nw = gedeeld.nwb(), gn = it.geometrie.bron;
      if (it.soort !== "kanaal" || gn.bronId !== "NWB" || gn.sha256 !== nw.sha || gn.sleutel !== "vwk_id" || !Array.isArray(gn.waarden) || !gn.waarden.length) fout("GEOREF van " + id + " past niet bij nwb-kanaal");
      gebruik("NWB", nw.sha);
      var ln = []; gn.waarden.forEach(function(k) { var g = (nw.per[k] || fout("NWB: geen vak " + k)).geometrie; ln = ln.concat(g.type === "LineString" ? [g.coordinates] : g.coordinates); });
      return ln;
    }
    // T5b-3a (plan par. 3.4): een Waals Nationaal Park (SPW, laag Perimetres)
    if (bron === "spw-park") {
      var sp = gedeeld.spw(), gs2 = it.geometrie.bron;
      if (it.soort !== "natuurgebied" || gs2.bronId !== "SPW" || gs2.sha256 !== sp.sha || gs2.sleutel !== "NOM_PNX" || !sp.per[gs2.waarde]) fout("GEOREF van " + id + " past niet bij spw-park");
      gebruik("SPW", sp.sha); var gg2 = sp.per[gs2.waarde].geometrie; return d3Wind(gg2.type === "Polygon" ? [gg2.coordinates] : gg2.coordinates);
    }
    if (bron === "noordzee") { var mar = B.ne("ne_10m_geography_marine_polys.geojson"); gebruik("NE", mar.sha); return d3Wind(noordzeeVlak(mar.buf, B.ne("ne_10m_admin_0_map_units.geojson").buf, KB["zee-noordzee"].geometrie.bron.waarde).vlak); }
    return fout("onbekende bron: " + bron);
  }
  // doelen eerst (voor het doek)
  var lagenIn = cfg.lagen.map(function(l) {
    if (!SOORT_PER_BRON[l.bron]) fout("onbekende bron in laag " + l.id + ": " + l.bron);
    return { id: l.id, soort: l.soort, bron: l.bron, items: l.items.map(function(id) {
      var it = item(id);
      if (!soortPastInLaag(l.bron, it)) fout("item " + id + " heeft soort " + it.soort + ", laag " + l.id + " vraagt " + SOORT_PER_BRON[l.bron]);
      if (l.soort === "punt") { if (it.geometrie.punt.status !== "vastgesteld") fout("geen vastgesteld punt: " + id); return { id: id, punt: [it.geometrie.punt.lon, it.geometrie.punt.lat] }; }
      return { id: id, delen: geom(l.bron, id) };
    }), achter: (l.laagAchtergrond || []).map(function(a) { return { id: a.id, delen: geom(a.bron, a.id) }; }) };
  });
  var doelDelen = []; lagenIn.forEach(function(l) { if (l.soort === "vlak") l.items.forEach(function(x) { doelDelen.push(x.delen); }); });
  var P = maakProjectie(cfg, doelDelen), pr = P.pr;
  var TOL = cfg.tolerantiePx / EENHEID_PX, rond = maakRond(cfg.afronding), getal = maakGetal(cfg.afronding);
  // achtergrond
  var achterIn = [];
  cfg.achtergrond.forEach(function(a) {
    if (a.bron === "ne-land-overig") Object.keys(NE).sort().forEach(function(k) { if (a.uitgezonderd.indexOf(k) < 0 && NE[k].length) achterIn.push({ id: "ne-" + k, delen: NE[k], ne: true }); });
    else achterIn.push({ id: a.id, delen: geom(a.bron, a.id) });
  });
  var alleItems = [];
  function voegToe(delen, soort, isAchter) {
    var g = soort === "lijn" ? { type: "MultiLineString", coordinates: delen } : multi(delen);
    var ringen = vlak(pr, g, soort !== "lijn");
    if (isAchter) ringen = ringen.filter(function(r) { var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; r.forEach(function(q) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }); return Math.max(x1 - x0, y1 - y0) >= TOL; });
    if (!ringen.length) return null;
    alleItems.push({ ringen: ringen, lijn: soort === "lijn" });
    return alleItems.length - 1;
  }
  var achter = [];
  achterIn.forEach(function(a) { var ix = voegToe(a.delen, "vlak", true); if (ix !== null) achter.push({ id: a.id, index: ix }); });
  var lagen = lagenIn.map(function(l) {
    var items = [];
    l.items.forEach(function(x) {
      if (l.soort === "punt") { var q = pr(x.punt); items.push({ id: x.id, x: rond(q[0]), y: rond(q[1]) }); return; }
      var ix = voegToe(x.delen, l.soort, false);
      if (ix === null) fout("doel valt buiten de kaart " + cfg.id + ": " + x.id);
      items.push({ id: x.id, index: ix });
    });
    var la = [];
    l.achter.forEach(function(a) { var ix = voegToe(a.delen, "vlak", false); if (ix !== null) la.push({ id: a.id, index: ix }); });
    var uit = { id: l.id, soort: l.soort, bron: l.bron, items: items };
    if (la.length) uit.achtergrond = la;
    return uit;
  });
  // grensBehoud: punten bij de grens van twee landen (binnen zonePx bij x8 van de onvereenvoudigde rand van beide) blijven staan
  var behoud = null;
  if (cfg.grensBehoud) {
    var gb = cfg.grensBehoud, landLaag = lagen.filter(function(l) { return l.id === "landen"; })[0] || fout("grensBehoud vraagt de laag landen");
    var randen = gb.landen.map(function(id) { var x = landLaag.items.filter(function(y) { return y.id === id; })[0] || fout("grensBehoud: geen " + id); return index(lijnstukken(alleItems[x.index].ringen), 5); });
    var G = gb.zonePx / (EENHEID_PX * ZOOM_GRENS);
    behoud = function(q) { return randen.every(function(ix) { return afstand(ix, q) <= G; }); };
  }
  var v = vereenvoudig(alleItems, TOL, rond, behoud), ruw = [];
  function vul(o) {
    var rs = v.ringen[o.index], lijn = alleItems[o.index].lijn;
    ruw.push({ id: o.id, lijn: lijn, ringen: alleItems[o.index].ringen });
    o.d = pad(rs, !lijn, getal);
    if (!lijn) {
      o.opp = rs.length ? Math.round(oppervlak(rs) * 10) / 10 : 0;
      if (rs.length) { var pl = pool(rs, 0.01), mx = rond(pl.x), my = rond(pl.y), rr = getekendeAfstand([mx, my], rs); o.mx = mx; o.my = my; o.ir = Math.max(0, Math.floor(rr * 100) / 100); }
      else fout("vlak zonder ring na afronding: " + o.id);
    }
    delete o.index;
  }
  achter.forEach(vul);
  lagen.forEach(function(l) { if (l.soort !== "punt") l.items.forEach(vul); (l.achtergrond || []).forEach(vul); });
  var cfgTekst = fs.readFileSync(path.join(HIER, "kaarten", cfg.id + ".json"));
  var inv = Object.keys(invoer).sort();
  var kaartVersie = sha(Buffer.concat([cfgTekst, Buffer.from(inv.join("\n"))]));
  var kaart = { id: cfg.id, kaartVersie: kaartVersie, invoer: inv, breedte: P.breedte, hoogte: P.hoogte };
  if (cfg.doek) { kaart.beeld = BREEDTE; kaart.start = P.start; }
  kaart.achtergrond = achter; kaart.lagen = lagen;
  // startbeelden: per regio het beeld (eenheden) waarin een doel opent; uit de lon/lat-uitsnede van de configuratie, zoals het doek
  if (cfg.startbeelden) kaart.startbeelden = cfg.startbeelden.map(function(sb) {
    var pts = []; for (var a = 0; a <= 8; a++) for (var b = 0; b <= 8; b++) pts.push([sb.lon[0] + (sb.lon[1] - sb.lon[0]) * a / 8, sb.lat[0] + (sb.lat[1] - sb.lat[0]) * b / 8]);
    var bb = geoPath(pr).bounds({ type: "MultiPoint", coordinates: pts }), x = Math.max(0, bb[0][0]), y = Math.max(0, bb[0][1]);
    sb.doelen.forEach(function(id) { if (!lagen.some(function(l) { return l.items.some(function(it) { return it.id === id; }); })) fout("startbeeld " + sb.id + ": " + id + " is geen doel op de kaart"); });
    return { id: sb.id, x: rond(x), y: rond(y), w: rond(Math.min(P.breedte, bb[1][0]) - x), h: rond(Math.min(P.hoogte, bb[1][1]) - y), doelen: sb.doelen.slice() };
  });
  var afwijkingen = (cfg.grensMelden || []).map(function(z) { return { id: z.id, soort: "grens", tekst: z.toelichting }; }).concat(cfg.afwijkingen || []);
  return { kaart: kaart, afwijkingen: afwijkingen, ruw: ruw, pr: pr, meting: { maxAfwijkingPx: Math.round(v.max * EENHEID_PX * 10000) / 10000, gewicht: v.gewicht, tolerantiePx: cfg.tolerantiePx } };
}

// ---- de grensmeting NL-BE op de uiteindelijke kaartgeometrie (bouwplan par. 1) ----
// M2 a (GPT 18-11-2026): exact op het raster teruglezen. De getallen in het pad zijn veelvouden van de afronding (0,01 of 0,1);
// ze worden opgeteld als gehele getallen in stappen van 0,01 en pas aan het eind gedeeld, zodat gedeelde hoekpunten exact gelijk blijven.
export function leesPadRingen(d) {
  var r = [], cur = null, x = 0, y = 0, toks = d.match(/[MlZ][^MlZ]*/g) || [];
  function hg(v) { return Math.round(Number(v) * 100); }
  function punt() { return [x / 100, y / 100]; }
  toks.forEach(function(tok) {
    var c = tok[0], n = tok.slice(1).trim() ? tok.slice(1).trim().split(/[\s,]+/).map(hg) : [];
    if (c === "M") { x = n[0]; y = n[1]; cur = [punt()]; r.push(cur); }
    else if (c === "l") for (var i = 0; i < n.length; i += 2) { x += n[i]; y += n[i + 1]; cur.push(punt()); }
    else cur.push([cur[0][0], cur[0][1]]);
  });
  return r;
}
function lijnstukken(ringen) { var s = []; ringen.forEach(function(r) { for (var i = 1; i < r.length; i++) s.push([r[i - 1], r[i]]); }); return s; }
// rasterindex van lijnstukken: cellen met een getalsleutel, en de omhullende van de bezette cellen
function index(sts, cel) {
  var g = new Map(), X0 = Infinity, X1 = -Infinity, Y0 = Infinity, Y1 = -Infinity;
  sts.forEach(function(s, i) {
    var x0 = Math.floor(Math.min(s[0][0], s[1][0]) / cel), x1 = Math.floor(Math.max(s[0][0], s[1][0]) / cel), y0 = Math.floor(Math.min(s[0][1], s[1][1]) / cel), y1 = Math.floor(Math.max(s[0][1], s[1][1]) / cel);
    X0 = Math.min(X0, x0); X1 = Math.max(X1, x1); Y0 = Math.min(Y0, y0); Y1 = Math.max(Y1, y1);
    for (var a = x0; a <= x1; a++) for (var b = y0; b <= y1; b++) { var k = a * 1000003 + b, l = g.get(k); if (l) l.push(i); else g.set(k, [i]); }
  });
  return { g: g, cel: cel, sts: sts, bb: [X0, X1, Y0, Y1] };
}
// afstand van een punt tot het dichtstbijzijnde lijnstuk: ring na ring van cellen (alleen de rand van elke ring, en alleen binnen de
// omhullende van de index; lege ringen worden overgeslagen) tot het zeker is. Bij gelijke afstand wint de laagste index, dus de
// uitkomst hangt niet af van de volgorde waarin de cellen worden bekeken.
function afstandMet(ix, p) {
  var cx = Math.floor(p[0] / ix.cel), cy = Math.floor(p[1] / ix.cel), best = Infinity, bi = -1, bb = ix.bb, g = ix.g, sts = ix.sts;
  if (!sts.length) return { d: Infinity, i: -1 };
  function cel(a, b) { if (a < bb[0] || a > bb[1] || b < bb[2] || b > bb[3]) return; var l = g.get(a * 1000003 + b); if (!l) return; for (var j = 0; j < l.length; j++) { var i = l[j], s = sts[i], d = afstandTotLijnstuk(p, s[0], s[1]); if (d < best || (d === best && i < bi)) { best = d; bi = i; } } }
  var r0 = Math.max(0, bb[0] - cx, cx - bb[1], bb[2] - cy, cy - bb[3]), rMax = Math.max(cx - bb[0], bb[1] - cx, cy - bb[2], bb[3] - cy);
  for (var r = r0; r <= Math.max(r0, rMax) + 1; r++) {
    if (r === 0) cel(cx, cy);
    else {
      var a0 = Math.max(cx - r, bb[0]), a1 = Math.min(cx + r, bb[1]), b0 = Math.max(cy - r + 1, bb[2]), b1 = Math.min(cy + r - 1, bb[3]);
      for (var a = a0; a <= a1; a++) { cel(a, cy - r); cel(a, cy + r); }
      for (var b = b0; b <= b1; b++) { cel(cx - r, b); cel(cx + r, b); }
    }
    if (best <= r * ix.cel) return { d: best, i: bi };
  }
  return { d: best, i: bi };
}
function afstand(ix, p) { return afstandMet(ix, p).d; }
function oppRing(r) { var s = 0; for (var i = 0; i < r.length - 1; i++) s += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return s / 2; }
function omtrek(r) { var s = 0; for (var i = 1; i < r.length; i++) s += Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]); return s; }
// G1 b: melden = lijst van zones { id, lon: [min, max], lat: [min, max] }; lijnstukken in de toetszone met hun midden in zo'n
// zone worden gemeld (aantal, lengte, grootste afstand, plaats), maar niet getoetst. Alle andere eisen blijven.
export function grensMeting(kaart, terug, melden) {
  melden = melden || [];
  if (melden.length && !terug) fout("grensmeting: meldzones vragen de omgekeerde projectie");
  function inMelden(q) { if (!melden.length) return null; var g = terug(q); for (var z = 0; z < melden.length; z++) { var m = melden[z]; if (g[0] >= m.lon[0] && g[0] <= m.lon[1] && g[1] >= m.lat[0] && g[1] <= m.lat[1]) return m.id; } return null; }
  var px = EENHEID_PX * ZOOM_GRENS;                // CSS-px per eenheid bij x8
  var landen = kaart.lagen.filter(function(l) { return l.id === "landen"; })[0];
  function ringenVan(id) { var it = landen.items.filter(function(x) { return x.id === id; })[0] || fout("geen " + id + " in de laag landen"); return leesPadRingen(it.d); }
  function achterVan(id) { var it = kaart.achtergrond.filter(function(x) { return x.id === id; })[0] || fout("geen achtergrond " + id); return leesPadRingen(it.d); }
  var NL = ringenVan("NLD"), BE = ringenVan("BEL");
  var buren = { NL: NL, BE: BE, DEU: ringenVan("DEU"), FRA: achterVan("ne-FRA"), LUX: achterVan("ne-LUX"), zee: achterVan("zee-noordzee") };
  var cel = 5, IX = {}; Object.keys(buren).forEach(function(k) { IX[k] = index(lijnstukken(buren[k]), cel); });
  // indeling van elk lijnstuk bij zijn dichtstbijzijnde buur (midden van het lijnstuk); niets wordt uitgesloten
  // N1 a: NLD bestaat uit de 12 provincies; een lijnstuk dat het land ook in omgekeerde richting heeft, is een binnengrens
  // (klasse "binnen", gemeld en meegeteld in de som, niet in de toets)
  function sleutel(a, b) { return a[0] + "," + a[1] + ";" + b[0] + "," + b[1]; }
  function deelIn(eigen, kand) {
    var tel = {}, grens = [], klasse = [], alle = new Set();
    lijnstukken(eigen).forEach(function(s) { alle.add(sleutel(s[0], s[1])); });
    lijnstukken(eigen).forEach(function(s, si) {
      var m = [(s[0][0] + s[1][0]) / 2, (s[0][1] + s[1][1]) / 2], beste = null, bd = Infinity;
      if (alle.has(sleutel(s[1], s[0]))) beste = "binnen";
      else kand.forEach(function(k) { var d = afstand(IX[k], m); if (d < bd) { bd = d; beste = k; } });
      var L = Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]);
      tel[beste] = tel[beste] || { lijnstukken: 0, lengtePx: 0 }; tel[beste].lijnstukken++; tel[beste].lengtePx += L * px;
      klasse.push(beste);
      if (beste === kand[0]) grens.push({ s: s, i: si });
    });
    return { tel: tel, grens: grens, klasse: klasse };
  }
  var be = deelIn(BE, ["NL", "FRA", "LUX", "DEU", "zee"]), nl = deelIn(NL, ["BE", "DEU", "zee"]);
  // grootste afstand: lijn tot lijn, verdicht met tussenpunten op hoogstens 0,1 px bij x8
  // toetszone (S2): beide zijden in de klasse NL-BE (het dichtstbijzijnde lijnstuk van het andere land hoort ook bij die klasse)
  // en het midden binnen GRENS_ZONE_PX (bij x8) van het andere land. Daarbuiten: gemeld per aaneengesloten stuk, niet weggelaten.
  function ll(q) { if (!terug || !q) return null; var g = terug(q); return [Math.round(g[0] * 100000) / 100000, Math.round(g[1] * 100000) / 100000]; }
  function verst(s, naar) {
    var stap = GRENS_STAP_PX / px, L = Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]), n = Math.max(1, Math.ceil(L / stap)), best = { px: 0, punt: null };
    for (var i = 0; i <= n; i++) { var q = [s[0][0] + (s[1][0] - s[0][0]) * i / n, s[0][1] + (s[1][1] - s[0][1]) * i / n], d = afstand(IX[naar], q) * px; if (d > best.px) best = { px: d, punt: q }; }
    return best;
  }
  // V1 (18-11-2026): in de toetszone wordt per meetpunt (op hoogstens GRENS_STAP_PX) bepaald of het in een meldzone ligt; de lengte
  // per deelinterval (de werkelijke intervallengte, ingedeeld naar het midden van het interval). Gemeld en getoetst samen = de lengte.
  function toets(grens, naar, anderKlasse, eigenKlasse) {
    var best = { px: 0, punt: null }, buiten = [], huidig = null, binnenN = 0, binnenL = 0, zoneL = 0, gemeld = {};
    function gz(z) { return gemeld[z] = gemeld[z] || { lijnstukken: 0, lengtePx: 0, maxPx: 0, punt: null }; }
    grens.forEach(function(g) {
      var s = g.s, m = [(s[0][0] + s[1][0]) / 2, (s[0][1] + s[1][1]) / 2], a = afstandMet(IX[naar], m), L = Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]) * px;
      var inZone = anderKlasse[a.i] === eigenKlasse && a.d * px <= GRENS_ZONE_PX;
      if (inZone) {
        huidig = null; binnenN++; zoneL += L;
        var n = Math.max(1, Math.ceil(L / GRENS_STAP_PX)), geraakt = {};
        for (var i = 0; i <= n; i++) {
          var q = [s[0][0] + (s[1][0] - s[0][0]) * i / n, s[0][1] + (s[1][1] - s[0][1]) * i / n], d = afstand(IX[naar], q) * px, z = inMelden(q);
          if (z) { var e = gz(z); if (d > e.maxPx) { e.maxPx = d; e.punt = q; } }
          else if (d > best.px) best = { px: d, punt: q };
          if (i < n) {
            var t = [s[0][0] + (s[1][0] - s[0][0]) * (i + 0.5) / n, s[0][1] + (s[1][1] - s[0][1]) * (i + 0.5) / n], zi = inMelden(t);
            if (zi) { gz(zi).lengtePx += L / n; geraakt[zi] = 1; } else binnenL += L / n;
          }
        }
        Object.keys(geraakt).forEach(function(z) { gz(z).lijnstukken++; });
        return;
      }
      var v = verst(s, naar);
      if (!huidig || huidig.tot !== g.i - 1) { huidig = { van: g.i, tot: g.i, lijnstukken: 0, lengtePx: 0, maxPx: 0, plaats: null, punt: null }; buiten.push(huidig); }
      huidig.tot = g.i; huidig.lijnstukken++; huidig.lengtePx += L;
      if (v.px > huidig.maxPx) { huidig.maxPx = v.px; huidig.punt = v.punt; }
    });
    buiten.forEach(function(b) { b.plaats = ll(b.punt); delete b.van; delete b.tot; delete b.punt; });
    buiten.sort(function(x, y) { return y.maxPx - x.maxPx; });
    Object.keys(gemeld).forEach(function(z) { gemeld[z].plaats = ll(gemeld[z].punt); delete gemeld[z].punt; });
    var somGemeld = Object.keys(gemeld).reduce(function(t, z) { return t + gemeld[z].lengtePx; }, 0);
    if (Math.abs(binnenL + somGemeld - zoneL) > 1e-6 * Math.max(1, zoneL)) fout("grensmeting: getoetste en gemelde lengte samen zijn niet de lengte van de toetszone");
    return { px: best.px, punt: best.punt, plaats: ll(best.punt), binnen: { lijnstukken: binnenN, lengtePx: zoneL, getoetstPx: binnenL, gemeldPx: somGemeld }, buiten: buiten, gemeld: gemeld };
  }
  var dBE = toets(be.grens, "NL", nl.klasse, "BE"), dNL = toets(nl.grens, "BE", be.klasse, "NL");
  // overlap en gaten (px2), per stuk met de eis oppervlakte <= 0,5 px x de halve omtrek
  function multiVan(ringen) { return ringen.map(function(r) { return [r]; }); }
  function midden(r) { var x = 0, y = 0; for (var i = 0; i < r.length - 1; i++) { x += r[i][0]; y += r[i][1]; } return [x / (r.length - 1), y / (r.length - 1)]; }
  function stukken(mp) { return mp.map(function(p) { var a = Math.abs(oppRing(p[0])) - p.slice(1).reduce(function(s, r) { return s + Math.abs(oppRing(r)); }, 0); return { px2: a * px * px, lengtePx: omtrek(p[0]) / 2 * px, punt: midden(p[0]) }; }); }
  // M1 a (GPT 18-11-2026): het vlak van een land even-oneven, zoals de kaart en de tikregel het lezen (xor van alle ringen):
  // gaten en enclaves blijven gaten, aanliggende provincies vallen samen. Lukt het niet, dan stopt de meting met een fout.
  // Vlakbewerkingen met Clipper (besluit Claude 19-11-2026): polygon-clipping liep vast op deze geometrie. De coordinaten liggen exact
  // op het raster van 0,01 (M2 a), dus als gehele honderdsten exact; gelijk-oneven (pftEvenOdd), zoals de kaart en de tikregel (M1 a).
  function paden(ringen) { return ringen.map(function(r) { return r.slice(0, r.length - 1).map(function(q) { return { X: Math.round(q[0] * 100), Y: Math.round(q[1] * 100) }; }); }); }
  function terugRing(pad) { var r = pad.map(function(q) { return [q.X / 100, q.Y / 100]; }); r.push([r[0][0], r[0][1]]); return r; }
  function bewerk(soort) {
    var c = new ClipperLib.Clipper(), boom = new ClipperLib.PolyTree();
    c.AddPaths(paden(NL), ClipperLib.PolyType.ptSubject, true); c.AddPaths(paden(BE), ClipperLib.PolyType.ptClip, true);
    if (!c.Execute(soort, boom, ClipperLib.PolyFillType.pftEvenOdd, ClipperLib.PolyFillType.pftEvenOdd)) fout("grensmeting: Clipper kon de vlakbewerking niet uitvoeren");
    var uit = [];
    (function loop(n) { n.Childs().forEach(function(k) { if (!k.IsHole()) uit.push([terugRing(k.Contour())].concat(k.Childs().map(function(h) { return terugRing(h.Contour()); }))); k.Childs().forEach(loop); }); })(boom);
    return uit;
  }
  var overlap = stukken(bewerk(ClipperLib.ClipType.ctIntersection));
  var uni = bewerk(ClipperLib.ClipType.ctUnion), gaten = [];
  var nlIx = index(lijnstukken(NL), cel), beIx = index(lijnstukken(BE), cel);
  uni.forEach(function(p) { p.slice(1).forEach(function(h) {
    var raaktNl = h.some(function(q) { return afstand(nlIx, q) < 1e-6; }), raaktBe = h.some(function(q) { return afstand(beIx, q) < 1e-6; });
    if (raaktNl && raaktBe) gaten.push({ px2: Math.abs(oppRing(h)) * px * px, lengtePx: omtrek(h) / 2 * px, punt: midden(h) });
  }); });
  var grensLengtePx = (be.tel.NL ? be.tel.NL.lengtePx : 0);
  function som(a) { return a.reduce(function(s, x) { return s + x.px2; }, 0); }
  // N2 a (GPT 18-11-2026): de breedte per stuk alleen getoetst bij een oppervlakte >= 0,01 px2; kleinere stukken tellen mee
  // in het totaal en worden gemeld (aantal en samen)
  function perStuk(a) {
    var groot = a.filter(function(x) { return x.px2 >= GRENS_MIN_STUK_PX2; }), klein = a.filter(function(x) { return x.px2 < GRENS_MIN_STUK_PX2; });
    var sl = groot.reduce(function(m, x) { var b = x.lengtePx ? x.px2 / x.lengtePx : Infinity; return b > m.b ? { b: b, x: x } : m; }, { b: 0, x: null });
    return { stukken: a.length, totaalPx2: som(a), grootstePx2: a.reduce(function(m, x) { return Math.max(m, x.px2); }, 0), getoetst: groot.length, slechtsteBreedtePx: sl.b, slechtstePx2: sl.x ? sl.x.px2 : 0, slechtstePlaats: sl.x ? ll(sl.x.punt) : null, slechtsteInMeldzone: sl.x ? inMelden(sl.x.punt) : null, kleinStukken: klein.length, kleinPx2: som(klein) };
  }
  var uit = {
    indeling: { BE: be.tel, NL: nl.tel },
    grensLengtePx: grensLengtePx,
    overlap: perStuk(overlap),
    gaten: perStuk(gaten),
    maxAfstand: { beNaarNlPx: dBE.px, nlNaarBePx: dNL.px, meetfoutPx: GRENS_MEETFOUT_PX, zonePx: GRENS_ZONE_PX, plaatsBe: dBE.plaats, plaatsNl: dNL.plaats, zoneBe: dBE.binnen, zoneNl: dNL.binnen },
    buitenZone: { BE: dBE.buiten, NL: dNL.buiten },
    gemeldeZones: { BE: dBE.gemeld, NL: dNL.gemeld }
  };
  var fouten = [];
  if (uit.overlap.slechtsteBreedtePx > GRENS_EIS_PX) fouten.push("overlap: een stuk heeft een gemiddelde breedte van " + uit.overlap.slechtsteBreedtePx + " px");
  if (uit.overlap.totaalPx2 > GRENS_EIS_PX * grensLengtePx) fouten.push("overlap: totaal " + uit.overlap.totaalPx2 + " px2");
  if (uit.gaten.slechtsteBreedtePx > GRENS_EIS_PX) fouten.push("gaten: een stuk heeft een gemiddelde breedte van " + uit.gaten.slechtsteBreedtePx + " px");
  if (uit.gaten.totaalPx2 > GRENS_EIS_PX * grensLengtePx) fouten.push("gaten: totaal " + uit.gaten.totaalPx2 + " px2");
  [dBE.px, dNL.px].forEach(function(d) { if (d + GRENS_MEETFOUT_PX > GRENS_EIS_PX) fouten.push("grootste grensafstand " + d + " px (+ meetfout " + GRENS_MEETFOUT_PX + ")"); });
  uit.fouten = fouten;
  return uit;
}

export function tekst(res, afronding) {
  return "// GEGENEREERD door tools/topo/maak-kaarten.mjs uit tools/topo/kaarten/" + res.kaart.id + ".json en de bronnen (SHA-256 in tools/topo/bronnen.json); niet met de hand bewerken.\n" +
    "// Eenheden: " + BREEDTE + " eenheden = de schermbreedte bij x1; afwijking door vereenvoudiging hoogstens " + res.meting.tolerantiePx + " CSS-pixel bij " + WEERGAVE + " CSS-pixels breed bij x1 (gemeten: " + res.meting.maxAfwijkingPx + "). Items zijn kennisbank-id's; geen namen.\n" +
    "// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.\n" +
    "export default " + JSON.stringify(pakIn(res.kaart, afronding)) + ";\n" +
    "export var AFWIJKINGEN_KAART = " + JSON.stringify(res.afwijkingen) + ";\n";
}

// de gelezen bronnen per proces (de bronnen veranderen niet: hun SHA-256 is gecontroleerd)
var GEDEELD = null;
export async function maakGedeeld(paden) {
  if (GEDEELD && GEDEELD.sleutel === JSON.stringify(paden)) return GEDEELD;
  var KB = await kennisbank(), B = bronnen(paden), c = await leesCbs(paden), s = null, rv = paden.rvo ? await leesRvo(paden) : null, kw = null, tw = null, nb = null, sw = null, lb = paden.lbs ? await openLbs(paden.lbs) : null;
  var gedeeld = { cbs: function() { return c; }, stb: function() { if (!s) s = leesStatbel(paden); return s; }, rvo: function() { return rv || fout("geen natpark.gpkg opgegeven (zevende argument)"); }, krw: function() { if (!kw) kw = openKrw(paden.krw || fout("geen KRW-GML opgegeven (achtste argument)")); return kw; }, top10: function() { if (!tw) tw = openTop10(paden.top10 || fout("geen TOP10NL-bundel opgegeven (negende argument)")); return tw; }, nwb: function() { if (!nb) nb = openNwb(paden.nwb || fout("geen NWB-bundel opgegeven (tiende argument)")); return nb; }, spw: function() { if (!sw) sw = openSpw(paden.spw || fout("geen SPW-bundel opgegeven (elfde argument)")); return sw; }, lbs: function() { return lb || fout("geen Lbstrbel.gpkg opgegeven (twaalfde argument)"); } };
  GEDEELD = { sleutel: JSON.stringify(paden), KB: KB, B: B, gedeeld: gedeeld };
  return GEDEELD;
}
export async function bouwAlles(paden, ids) {
  var G = await maakGedeeld(paden), KB = G.KB, B = G.B, gedeeld = G.gedeeld;
  var uit = [];
  for (var i = 0; i < ids.length; i++) {
    var cfg = JSON.parse(fs.readFileSync(path.join(HIER, "kaarten", ids[i] + ".json"), "utf8"));
    var res = await maakKaart(cfg, KB, B, gedeeld);
    if (res.meting.maxAfwijkingPx > cfg.tolerantiePx) fout("vereenvoudiging " + cfg.id + " boven de tolerantie: " + res.meting.maxAfwijkingPx);
    var t = tekst(res, cfg.afronding), gz = zlib.gzipSync(Buffer.from(t), { level: 9 }).length;
    res.omvang = { bytes: Buffer.byteLength(t), gzip: gz, doel: GZIP_DOEL[cfg.id] };
    if (cfg.id === "nlbe") { res.grens = grensMeting(res.kaart, function(q) { return res.pr.invert(q); }, cfg.grensMelden); }
    uit.push({ cfg: cfg, res: res, tekst: t });
  }
  return uit;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  var ids = process.argv[6] ? process.argv[6].split(",") : KAARTIDS;
  var uit = await bouwAlles({ ne: process.argv[2], gpkg: process.argv[3], sectoren: process.argv[4], rvo: process.argv[7], krw: process.argv[8], top10: process.argv[9], nwb: process.argv[10], spw: process.argv[11], lbs: process.argv[12] }, ids);
  var stop = [];
  uit.forEach(function(u) {
    console.log(u.cfg.id + ": afwijking " + u.res.meting.maxAfwijkingPx + " px (tolerantie " + u.cfg.tolerantiePx + "), " + u.res.omvang.bytes + " bytes, gzip " + u.res.omvang.gzip + " (doel " + u.res.omvang.doel + (u.res.omvang.gzip > u.res.omvang.doel ? ", boven het doel: melden met een voorstel, B11 a" : "") + "), lagen " + u.res.kaart.lagen.map(function(l) { return l.id + " " + l.items.length; }).join(", ") + ", achtergrond " + u.res.kaart.achtergrond.length);
    if (u.res.grens) console.log("grens NL-BE: " + JSON.stringify(u.res.grens));
    if (u.res.grens && u.res.grens.fouten.length) stop.push("grens NL-BE: " + u.res.grens.fouten.join("; "));
  });
  if (stop.length) { console.log("STOP: " + stop.join(" | ")); process.exit(2); }
  fs.mkdirSync(path.join(process.argv[5], "kaarten"), { recursive: true });
  uit.forEach(function(u) { fs.writeFileSync(path.join(process.argv[5], "kaarten", u.cfg.id + ".js"), u.tekst); });
  // T5c (plan T5c par. 3.3): een kaart met een indeling in delen krijgt ook zijn delen, uit het zojuist geschreven bestand
  for (var ki = 0; ki < uit.length; ki++) {
    if (!KAARTDELEN[uit[ki].cfg.id]) continue;
    var vol = (await import(pathToFileURL(path.join(process.argv[5], "kaarten", uit[ki].cfg.id + ".js")).href)).default;
    console.log("delen: " + schrijfDelen(path.join(process.argv[5], "kaarten"), vol, splitsDelen(vol)).join(", "));
  }
}
