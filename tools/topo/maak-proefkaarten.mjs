// Kaartscript voor de kaartproef T2a (plan TO fase T2, v1.1, §2). Alleen bouwomgeving, niet in de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node maak-proefkaarten.mjs <map met de Natural Earth-bestanden> <uitvoermap>
// - controleert de SHA-256 van elk bronbestand tegen bronnen.json;
// - projecteert, knipt uit, bouwt een topologie, vereenvoudigt tot hoogstens 0,5 CSS-pixel afwijking
//   bij een kaartweergave van 396 CSS-pixels breed (schermbreedte 428 min 2 x 16 rand) en rondt af op 0,1;
// - controleert de afwijking na projectie, vereenvoudiging en afronding;
// - schrijft per kaart een ES-module; twee keer draaien geeft byte-gelijke bestanden.

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { geoPath, geoTransverseMercator, geoAzimuthalEqualArea, geoMercator, geoEqualEarth } from "d3-geo";
import { topology } from "topojson-server";
import { presimplify, simplify } from "topojson-simplify";
import { feature, merge } from "topojson-client";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var BRON = process.argv[2];
var UIT = process.argv[3];
var BREEDTE = 1000;                 // viewBox-breedte in eenheden
var WEERGAVE = 428 - 2 * 16;        // CSS-pixels breed bij een scherm van 428
var TOL_PX = 0.5;                   // hoogstens 0,5 CSS-pixel afwijking
var EENHEID_PX = WEERGAVE / BREEDTE;
var TOL = TOL_PX / EENHEID_PX;      // in viewBox-eenheden

var bronnen = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8")).naturalEarth;
var cache = {};
function laad(naam) {
  if (cache[naam]) return cache[naam];
  var buf = fs.readFileSync(path.join(BRON, naam));
  var sha = crypto.createHash("sha256").update(buf).digest("hex");
  if (sha !== bronnen.bestanden[naam]) throw new Error("SHA-256 klopt niet voor " + naam);
  cache[naam] = JSON.parse(buf.toString("utf8")).features;
  return cache[naam];
}

// Kaarteenheden die Natural Earth opsplitst en die als één land gelden (vaste lijst)
var SAMEN = { BEL: ["BFR", "BWR", "BCR"], GBR: ["NIR", "WLS", "ENG", "SCT"], SRB: ["SRV", "SRS"], BIH: ["BHF", "BIS", "BHB"], ATG: ["ACA", "ACB"] };
var SAMEN_NAAM = { BEL: "België", GBR: "Verenigd Koninkrijk", SRB: "Servië", BIH: "Bosnië en Herzegovina", ATG: "Antigua en Barbuda" };
var DEEL_VAN = {};
Object.keys(SAMEN).forEach(function(k) { SAMEN[k].forEach(function(g) { DEEL_VAN[g] = k; }); });

function landen(bestand) {
  var uit = {}, volgorde = [];
  laad(bestand).forEach(function(f) {
    var p = f.properties, id = DEEL_VAN[p.GU_A3] || p.GU_A3;
    if (!uit[id]) { uit[id] = { id: id, naam: SAMEN_NAAM[id] || p.NAME_NL || p.NAME, label: DEEL_VAN[p.GU_A3] ? null : [p.LABEL_X, p.LABEL_Y], delen: [] }; volgorde.push(id); }
    uit[id].delen.push(f.geometry);
  });
  return volgorde.sort().map(function(id) { return uit[id]; });
}
function samen(geoms) {
  var polys = [];
  geoms.forEach(function(g) { if (g.type === "Polygon") polys.push(g.coordinates); else polys = polys.concat(g.coordinates); });
  return { type: "MultiPolygon", coordinates: polys };
}
function lijnenSamen(geoms) {
  var l = [];
  geoms.forEach(function(g) { if (g.type === "LineString") l.push(g.coordinates); else l = l.concat(g.coordinates); });
  return { type: "MultiLineString", coordinates: l };
}

// ── projecteren en uitknippen tot vlakke ringen en lijnen ──
// De schaal komt altijd uit de uitsnede lon/lat (1000 eenheden = de schermbreedte bij x1). Een kaart met een groter doek
// (k.doek) houdt die schaal; het doek omvat dan alle doelen, en het beeld begint bij x1 op de oude uitsnede (start).
function maakProjectie(k) {
  var pr = k.projectie();
  var pts = [];
  for (var i = 0; i <= 8; i++) for (var j = 0; j <= 8; j++) pts.push([k.lon[0] + (k.lon[1] - k.lon[0]) * i / 8, k.lat[0] + (k.lat[1] - k.lat[0]) * j / 8]);
  var mp = { type: "MultiPoint", coordinates: pts };
  pr.fitWidth(BREEDTE, mp);
  var b = geoPath(pr).bounds(mp);
  var hoogte = Math.ceil(b[1][1]);
  if (!k.doek) { pr.clipExtent([[0, 0], [BREEDTE, hoogte]]); return { pr: pr, breedte: BREEDTE, hoogte: hoogte, start: [0, 0] }; }
  // doek: de omhullende van alle doelen (zonder verre delen), met een rand, naar buiten afgerond op hele eenheden
  var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  k.doek.doelen().forEach(function(item) { var bb = geoPath(pr).bounds(samen(item.delen)); x0 = Math.min(x0, bb[0][0]); y0 = Math.min(y0, bb[0][1]); x1 = Math.max(x1, bb[1][0]); y1 = Math.max(y1, bb[1][1]); });
  x0 = Math.floor(x0 - k.doek.rand); y0 = Math.floor(y0 - k.doek.rand); x1 = Math.ceil(x1 + k.doek.rand); y1 = Math.ceil(y1 + k.doek.rand);
  var t = pr.translate(); pr.translate([t[0] - x0, t[1] - y0]);   // hele eenheden verschuiven: vormen en schaal blijven gelijk
  pr.clipExtent([[0, 0], [x1 - x0, y1 - y0]]);
  return { pr: pr, breedte: x1 - x0, hoogte: y1 - y0, start: [-x0, -y0] };
}
// Delen van een land waarvan het midden ten westen van lonMin ligt (verre overzeese delen), vallen weg
function zonderVer(item, lonMin) {
  var delen = item.delen.map(function(g) {
    var ps = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    ps = ps.filter(function(c) { var rr = c[0], som = 0; rr.forEach(function(q) { som += q[0]; }); return som / rr.length >= lonMin; });
    return ps.length ? { type: "MultiPolygon", coordinates: ps } : null;
  }).filter(function(g) { return g; });
  return { id: item.id, naam: item.naam, label: item.label, delen: delen };
}
function vlak(pr, geom, gesloten) {
  var ringen = [], huidig = null;
  var ctx = {
    moveTo: function(x, y) { huidig = [[x, y]]; ringen.push(huidig); },
    lineTo: function(x, y) { huidig.push([x, y]); },
    closePath: function() { if (gesloten && huidig.length) huidig.push([huidig[0][0], huidig[0][1]]); },
    arc: function() {}
  };
  geoPath(pr).context(ctx)(geom);
  return ringen.filter(function(r) { return r.length >= (gesloten ? 4 : 2); });
}

// ── meetkunde in het vlak ──
function oppRing(r) { var s = 0; for (var i = 0; i < r.length - 1; i++) s += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return s / 2; }
function binnen(p, r) {
  var c = false;
  for (var i = 0, j = r.length - 1; i < r.length; j = i++) {
    var a = r[i], b = r[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
function oppervlak(ringen) {
  // even-oneven: een ring binnen een oneven aantal andere ringen telt negatief (gat)
  var s = 0;
  ringen.forEach(function(r, i) {
    var diepte = 0;
    ringen.forEach(function(q, j) { if (i !== j && binnen(r[0], q)) diepte++; });
    s += (diepte % 2 ? -1 : 1) * Math.abs(oppRing(r));
  });
  return Math.abs(s);
}
function zwaartepuntGrootste(ringen) {
  var best = null, bo = -1;
  ringen.forEach(function(r) { var o = Math.abs(oppRing(r)); if (o > bo) { bo = o; best = r; } });
  var a = 0, cx = 0, cy = 0;
  for (var i = 0; i < best.length - 1; i++) {
    var f = best[i][0] * best[i + 1][1] - best[i + 1][0] * best[i][1];
    a += f; cx += (best[i][0] + best[i + 1][0]) * f; cy += (best[i][1] + best[i + 1][1]) * f;
  }
  return [cx / (3 * a), cy / (3 * a)];
}
// Pool van ontoegankelijkheid (zoals polylabel): het punt binnen het vlak (even-oneven) dat het verst van de rand ligt
function binnenVlak(p, ringen) { var n = 0; ringen.forEach(function(r) { if (binnen(p, r)) n++; }); return n % 2 === 1; }
function randAfstand(p, ringen) { var m = Infinity; ringen.forEach(function(r) { m = Math.min(m, afstandTotLijn(p, r)); }); return m; }
function getekendeAfstand(p, ringen) { var d = randAfstand(p, ringen); return binnenVlak(p, ringen) ? d : -d; }
function pool(ringen, precisie) {
  var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  ringen.forEach(function(r) { r.forEach(function(q) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }); });
  var w = x1 - x0, h = y1 - y0, cel = Math.min(w, h);
  function maak(x, y, hh) { var d = getekendeAfstand([x, y], ringen); return { x: x, y: y, h: hh, d: d, max: d + hh * Math.SQRT2 }; }
  var best = maak(x0 + w / 2, y0 + h / 2, 0);
  var z = zwaartepuntGrootste(ringen), zc = maak(z[0], z[1], 0); if (zc.d > best.d) best = zc;
  if (cel === 0) return best;
  var rij = [], hh = cel / 2;
  for (var x = x0; x < x1; x += cel) for (var y = y0; y < y1; y += cel) rij.push(maak(x + hh, y + hh, hh));
  while (rij.length) {
    rij.sort(function(a, b) { return a.max - b.max; });
    var c = rij.pop();
    if (c.d > best.d) best = c;
    if (c.max - best.d <= precisie) continue;
    var k = c.h / 2;
    rij.push(maak(c.x - k, c.y - k, k), maak(c.x + k, c.y - k, k), maak(c.x - k, c.y + k, k), maak(c.x + k, c.y + k, k));
  }
  return best;
}

function afstandTotLijnstuk(p, a, b) {
  var dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy;
  var t = l ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)) : 0;
  var x = a[0] + t * dx - p[0], y = a[1] + t * dy - p[1];
  return Math.sqrt(x * x + y * y);
}
function afstandTotLijn(p, r) {
  var m = Infinity;
  for (var i = 0; i < r.length - 1; i++) m = Math.min(m, afstandTotLijnstuk(p, r[i], r[i + 1]));
  return m;
}

// ── vereenvoudigen met topologie; afwijking gemeten na afronding ──
function rond(v) { return Math.round(v * 10) / 10; }
function rondRing(r) {
  var uit = [];
  r.forEach(function(q) { var x = rond(q[0]), y = rond(q[1]); var l = uit[uit.length - 1]; if (!l || l[0] !== x || l[1] !== y) uit.push([x, y]); });
  return uit;
}
function vereenvoudig(items) {
  // items: [{ ringen, lijn }]; elke ring wordt een eigen deel, zodat de volgorde gelijk blijft
  var fc = { type: "FeatureCollection", features: items.map(function(it, i) {
    return { type: "Feature", id: i, geometry: it.lijn ? { type: "MultiLineString", coordinates: it.ringen } : { type: "MultiPolygon", coordinates: it.ringen.map(function(r) { return [r]; }) } };
  }) };
  var topo = presimplify(topology({ k: fc }));
  function afwijking(orig, simp, rondS, gesloten) {
    // simp is een deelrij van orig (zelfde volgorde, eventueel ander beginpunt bij een gesloten ring)
    var start = 0;
    if (gesloten) { start = -1; for (var i = 0; i < orig.length; i++) if (orig[i][0] === simp[0][0] && orig[i][1] === simp[0][1]) { start = i; break; } if (start < 0) return Infinity; }
    var n = gesloten ? orig.length - 1 : orig.length, j = 0, max = 0;
    for (var t = 0; t < n; t++) {
      var q = orig[(start + t) % n];
      if (j + 1 < simp.length && simp[j + 1][0] === q[0] && simp[j + 1][1] === q[1]) j++;
      var m = Infinity;
      for (var k = Math.max(0, j - 1); k <= Math.min(rondS.length - 2, j + 1); k++) m = Math.min(m, afstandTotLijnstuk(q, rondS[k], rondS[k + 1]));
      if (m > max) max = m;
    }
    return max;
  }
  function probeer(w) {
    var s = simplify(topo, w), fs2 = feature(s, s.objects.k).features, max = 0;
    var uit = items.map(function(it, i) {
      var g = fs2[i].geometry, rs = !g ? [] : (it.lijn ? g.coordinates : g.coordinates.map(function(p) { return p[0]; }));
      return it.ringen.map(function(orig, k) {
        var simp = rs[k];
        // een ring die bij vereenvoudigen zou wegvallen, blijft onvereenvoudigd (alleen afgerond)
        if (!simp || simp.length < (it.lijn ? 2 : 4)) simp = orig;
        var rondS = simp.map(function(q) { return [rond(q[0]), rond(q[1])]; });
        max = Math.max(max, afwijking(orig, simp, rondS, !it.lijn));
        var r = rondRing(simp);
        return r.length >= (it.lijn ? 2 : 4) ? r : null;
      }).filter(function(r) { return r; });
    });
    return { max: max, ringen: uit };
  }
  var lo = 0, hi = 5000, best = probeer(0);
  if (best.max > TOL) throw new Error("zelfs zonder vereenvoudiging te grote afwijking: " + best.max);
  for (var n = 0; n < 30; n++) {
    var mid = (lo + hi) / 2, r = probeer(mid);
    if (r.max <= TOL) { lo = mid; best = r; } else hi = mid;
  }
  best.gewicht = lo;
  return best;
}

// Pad met relatieve stappen (l) tussen de afgeronde punten: dezelfde punten, minder tekens
function getal(v) { return String(Math.round(v * 10) / 10); }
function pad(ringen, gesloten) {
  return ringen.map(function(r) {
    var pts = gesloten ? r.slice(0, r.length - 1) : r, uit = "M" + getal(pts[0][0]) + "," + getal(pts[0][1]);
    if (pts.length > 1) uit += "l" + pts.slice(1).map(function(q, i) { return getal(q[0] - pts[i][0]) + "," + getal(q[1] - pts[i][1]); }).join(" ");
    return uit + (gesloten ? "Z" : "");
  }).join("");
}

// ── de kaarten ──
// Europa (zuid), ronde 4 (D4c): vaste lijst van 28 doelen; elk ander land in het doek is achtergrond.
// Verre delen van Spanje, het Verenigd Koninkrijk en Portugal (midden ten westen van 12 graden WL: Canarische Eilanden,
// Rockall, Azoren, Madeira) vallen weg (D2).
// Marokko: Natural Earth tekent standaard de feitelijke situatie, met het grootste deel van de Westelijke Sahara bij Marokko.
// Op deze kaart wordt Marokko volgens de gekozen atlasconventie begrensd op 27 graden 40 minuten NB. De Westelijke Sahara
// (status internationaal betwist) wordt als afzonderlijk grijs gebied weergegeven.
var GRENS_MAROKKO = 27 + 40 / 60;
var VER_WEG = ["ESP", "GBR", "PRX"];
var EUROPA_ZUID = ["AND", "AUT", "BEL", "BIH", "CHE", "CZE", "DEU", "DZA", "ESP", "FXX", "GBR", "GGY", "HRV", "HUN", "ITA", "JEY", "LIE", "LUX", "MAR", "MCO", "MLT", "NLX", "POL", "SMR", "SVK", "SVN", "TUN", "VAT"];
// Een ring (lon/lat) knippen op een breedtegraad (Sutherland-Hodgman met een halfvlak); noord = het deel ten noorden houden
function knipRing(ring, lat, noord) {
  function binnen(q) { return noord ? q[1] >= lat : q[1] <= lat; }
  function snij(a, b) { var t = (lat - a[1]) / (b[1] - a[1]); return [a[0] + (b[0] - a[0]) * t, lat]; }
  var uit = [], n = ring.length - 1;
  for (var i = 0; i < n; i++) {
    var a = ring[i], b = ring[i + 1];
    if (binnen(a)) { uit.push(a); if (!binnen(b)) uit.push(snij(a, b)); }
    else if (binnen(b)) uit.push(snij(a, b));
  }
  if (uit.length) uit.push(uit[0]);
  return uit;
}
function knipLand(item, lat, noord) {
  var delen = item.delen.map(function(g) {
    var ps = (g.type === "Polygon" ? [g.coordinates] : g.coordinates).map(function(c) { return c.map(function(rr) { return knipRing(rr, lat, noord); }).filter(function(rr) { return rr.length >= 4; }); }).filter(function(c) { return c.length; });
    return ps.length ? { type: "MultiPolygon", coordinates: ps } : null;
  }).filter(function(g) { return g; });
  return { id: item.id, naam: item.naam, label: item.label, delen: delen };
}
function europaZuid() {
  var alle = landen("ne_10m_admin_0_map_units.geojson").map(function(l) { return VER_WEG.indexOf(l.id) >= 0 ? zonderVer(l, -12) : l; });
  var mar = alle.filter(function(l) { return l.id === "MAR"; })[0], sah = alle.filter(function(l) { return l.id === "SAH"; })[0];
  var marZuid = knipLand(mar, GRENS_MAROKKO, false);
  alle = alle.map(function(l) {
    if (l.id === "MAR") return knipLand(mar, GRENS_MAROKKO, true);
    if (l.id === "SAH") {
      // de twee delen samenvoegen tot één vlak, zodat er geen grenslijn midden in de Westelijke Sahara staat
      var t = topology({ s: { type: "GeometryCollection", geometries: sah.delen.concat(marZuid.delen) } });
      return { id: sah.id, naam: sah.naam, label: sah.label, delen: [merge(t, t.objects.s.geometries)] };
    }
    return l;
  }).filter(function(l) { return l.delen.length; });
  var doelen = alle.filter(function(l) { return EUROPA_ZUID.indexOf(l.id) >= 0; });
  if (doelen.length !== EUROPA_ZUID.length) throw new Error("Europa (zuid): " + doelen.length + " doelen in plaats van " + EUROPA_ZUID.length);
  return { doelen: doelen, achtergrond: alle.filter(function(l) { return EUROPA_ZUID.indexOf(l.id) < 0; }) };
}
var KREEFTSKEERKRING = 23.4362; // vaste breedte; bron vast te leggen in T2b

var KAARTEN = [
  { id: "proef-nl", titel: "Nederland", lon: [3.2, 7.3], lat: [50.65, 53.65],
    projectie: function() { return geoTransverseMercator().rotate([-5.4, -52.2]); },
    maak: function(pr) {
      var land = landen("ne_10m_admin_0_map_units.geojson").filter(function(l) { return l.id !== "NLX"; });
      var prov = laad("ne_10m_admin_1_states_provinces.geojson").filter(function(f) { return f.properties.adm0_a3 === "NLD" && f.properties.type_en === "Province"; })
        .map(function(f) { return { id: "nl-" + f.properties.iso_3166_2, naam: f.properties.name_nl || f.properties.name, delen: [f.geometry] }; })
        .sort(function(a, b) { return a.id < b.id ? -1 : 1; });
      var namen = { "Rhine": "Rijn" };
      var RIV = ["Rhine", "Waal", "Nederrijn", "Lek", "IJssel", "Maas"];
      var riv = RIV.map(function(n) {
        var g = laad("ne_10m_rivers_lake_centerlines.geojson").filter(function(f) { return f.properties.name === n; }).map(function(f) { return f.geometry; });
        return { id: "riv-" + n.toLowerCase(), naam: namen[n] || n, delen: g };
      });
      var plaats = laad("ne_10m_populated_places_simple.geojson").filter(function(f) { return f.properties.adm0name === "Netherlands"; })
        .map(function(f) { return { id: "pl-" + f.properties.name.toLowerCase().replace(/[^a-z]/g, ""), naam: f.properties.name === "The Hague" ? "Den Haag" : f.properties.name, punt: f.geometry.coordinates }; })
        .sort(function(a, b) { return a.id < b.id ? -1 : 1; });
      return { achtergrond: land, lagen: [
        { id: "provincies", titel: "Provincies", soort: "vlak", items: prov },
        { id: "plaatsen", titel: "Plaatsen", soort: "punt", items: plaats },
        { id: "rivieren", titel: "Rivieren", soort: "lijn", items: riv }
      ] };
    } },
  { id: "proef-europa", titel: "Europa (zuid)", lon: [-3.5, 16.5], lat: [35.0, 51.5],
    projectie: function() { return geoAzimuthalEqualArea().rotate([-6.5, -43.5]); },
    doek: { rand: 20, doelen: function() { return europaZuid().doelen; } },
    maak: function(pr) {
      var e = europaZuid();
      return { achtergrond: e.achtergrond, lagen: [ { id: "landen", titel: "Landen", soort: "vlak", items: e.doelen } ] };
    } },
  { id: "proef-caribisch-groot", titel: "Grote Antillen en Bahama's", lon: [-86.0, -67.5], lat: [16.8, 27.5],
    projectie: function() { return geoMercator(); },
    maak: function(pr) {
      var DOEL = ["CUB", "JAM", "HTI", "DOM", "BHS"];
      var alle = landen("ne_10m_admin_0_map_units.geojson");
      return { achtergrond: alle.filter(function(l) { return DOEL.indexOf(l.id) < 0; }),
        lagen: [ { id: "landen", titel: "Eilandstaten", soort: "vlak", items: alle.filter(function(l) { return DOEL.indexOf(l.id) >= 0; }) } ] };
    } },
  { id: "proef-caribisch-klein", titel: "Kleine Antillen", lon: [-63.2, -59.2], lat: [9.9, 17.9],
    projectie: function() { return geoMercator(); },
    maak: function(pr) {
      var DOEL = ["ATG", "KNA", "DMA", "LCA", "VCT", "GRD", "BRB", "TTO"];
      var alle = landen("ne_10m_admin_0_map_units.geojson");
      return { achtergrond: alle.filter(function(l) { return DOEL.indexOf(l.id) < 0; }),
        lagen: [ { id: "landen", titel: "Eilandstaten", soort: "vlak", items: alle.filter(function(l) { return DOEL.indexOf(l.id) >= 0; }) } ] };
    } },
  { id: "proef-wereld", titel: "Lijnen op de wereldbol", lon: [-180, 180], lat: [-90, 90],
    projectie: function() { return geoEqualEarth(); },
    maak: function(pr) {
      function lijn(punten) { return { type: "LineString", coordinates: punten }; }
      var ev = [], nm = [], kk = [];
      for (var x = -180; x <= 180; x += 1) { ev.push([x, 0]); kk.push([x, KREEFTSKEERKRING]); }
      for (var y = -90; y <= 90; y += 1) nm.push([0, y]);
      return { achtergrond: landen("ne_50m_admin_0_map_units.geojson"), lagen: [ { id: "lijnen", titel: "Lijnen", soort: "lijn", items: [
        { id: "evenaar", naam: "Evenaar", delen: [lijn(ev)] },
        { id: "nulmeridiaan", naam: "Nulmeridiaan", delen: [lijn(nm)] },
        { id: "kreeftskeerkring", naam: "Kreeftskeerkring", delen: [lijn(kk)] }
      ] } ] };
    } }
];

function maakKaart(k) {
  var p = maakProjectie(k), pr = p.pr, inh = k.maak(pr);
  var alleItems = [], verwijzing = [];
  function voegToe(item, soort, laag) {
    if (soort === "punt") { var q = pr(item.punt); return { punt: [rond(q[0]), rond(q[1])] }; }
    var g = soort === "lijn" ? lijnenSamen(item.delen) : samen(item.delen);
    var ringen = vlak(pr, g, soort !== "lijn");
    if (!ringen.length) return null;
    var idx = alleItems.length;
    if (!laag) ringen = ringen.filter(function(r) { var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; r.forEach(function(q) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }); return Math.max(x1 - x0, y1 - y0) >= TOL; });
    if (!ringen.length) return null;
    alleItems.push({ ringen: ringen, lijn: soort === "lijn" });
    verwijzing.push({ item: item, soort: soort, laag: laag });
    return { index: idx };
  }
  var achter = [], lagen = [];
  inh.achtergrond.forEach(function(l) { var r = voegToe(l, "vlak", null); if (r) achter.push({ id: l.id, index: r.index }); });
  inh.lagen.forEach(function(laag) {
    var items = [];
    laag.items.forEach(function(it) {
      var r = voegToe(it, laag.soort, laag.id);
      if (!r) return;
      if (r.punt) items.push({ id: it.id, naam: it.naam, x: r.punt[0], y: r.punt[1] });
      else items.push({ id: it.id, naam: it.naam, index: r.index, label: it.label || null });
    });
    lagen.push({ id: laag.id, titel: laag.titel, soort: laag.soort, items: items });
  });
  var v = vereenvoudig(alleItems);
  function vul(o) {
    var rs = v.ringen[o.index], lijn = alleItems[o.index].lijn;
    o.d = pad(rs, !lijn);
    if (!lijn) {
      // een vlak dat na afronding geen ring meer heeft (zoals Vaticaanstad op een kaart van Europa) houdt alleen zijn middelpunt
      var orig = alleItems[o.index].ringen;
      o.opp = rs.length ? Math.round(oppervlak(rs) * 10) / 10 : 0;
      // middelpunt en straal van de grootste ingeschreven cirkel (plan T2a, aanvulling §3); de straal wordt
      // na het afronden van het middelpunt opnieuw gemeten en naar beneden afgerond (veilig)
      if (rs.length) {
        var pl = pool(rs, 0.01), mx = rond(pl.x), my = rond(pl.y), rr = getekendeAfstand([mx, my], rs);
        o.mx = mx; o.my = my; o.ir = Math.max(0, Math.floor(rr * 100) / 100);
      } else {
        var m = o.label ? pr(o.label) : zwaartepuntGrootste(orig);
        o.mx = rond(m[0]); o.my = rond(m[1]); o.ir = 0;
      }
    }
    delete o.index; delete o.label;
  }
  achter.forEach(vul);
  lagen.forEach(function(l) { if (l.soort !== "punt") l.items.forEach(vul); });
  var kaart = { id: k.id, titel: k.titel, breedte: p.breedte, hoogte: p.hoogte, achtergrond: achter, lagen: lagen };
  // alleen een kaart met een groter doek krijgt beeld en start; de andere kaarten blijven byte-gelijk
  if (k.doek) kaart = { id: k.id, titel: k.titel, breedte: p.breedte, hoogte: p.hoogte, beeld: BREEDTE, start: p.start, achtergrond: achter, lagen: lagen };
  return { kaart: kaart,
    meting: { maxAfwijkingPx: Math.round(v.max * EENHEID_PX * 1000) / 1000, gewicht: v.gewicht } };
}

function schrijf(k, res) {
  var kop = "// GEGENEREERD door tools/topo/maak-proefkaarten.mjs; niet met de hand bewerken.\n" +
    "// Bron: Natural Earth " + bronnen.versie + " (commit " + bronnen.commit.slice(0, 12) + "); SHA-256 van de bronbestanden in tools/topo/bronnen.json.\n" +
    (res.kaart.beeld ? "// Eenheden: " + BREEDTE + " eenheden = de schermbreedte bij x1 (doek " + res.kaart.breedte + " x " + res.kaart.hoogte + ");" : "// Eenheden: viewBox " + BREEDTE + " breed;") + " afwijking door vereenvoudiging hoogstens " + TOL_PX + " CSS-pixel bij " + WEERGAVE + " CSS-pixels breed (gemeten: " + res.meting.maxAfwijkingPx + ").\n";
  fs.writeFileSync(path.join(UIT, k.id + ".js"), kop + "export default " + JSON.stringify(res.kaart) + ";\n");
}

fs.mkdirSync(UIT, { recursive: true });
var verslag = [];
KAARTEN.forEach(function(k) {
  var res = maakKaart(k);
  schrijf(k, res);
  verslag.push(k.id + ": afwijking " + res.meting.maxAfwijkingPx + " px, lagen " + res.kaart.lagen.map(function(l) { return l.id + " " + l.items.length; }).join(", ") + ", achtergrond " + res.kaart.achtergrond.length);
});
console.log(verslag.join("\n"));
