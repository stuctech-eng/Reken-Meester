// Randen van de 194 landen (plan T2b §3.4 v1.3, met t = 0,5 km): grenst-aan, landlocked en de vergelijking met world-countries.
// Alleen bouwomgeving, niet in de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node bereken-randen.mjs <map met de Natural Earth-bestanden> <countries.json van world-countries 5.1.0> <uitvoermap>
// - controleert de SHA-256 van elk bronbestand tegen bronnen.json;
// - bouwt een topologie zonder kwantisering: alleen exact gelijke coordinaten gelden als gedeeld;
// - deelt elk stuk rand in bij precies een van de vijf soorten (§3.4);
// - controleert de kust over de volledige lijngeometrie, niet alleen in de hoekpunten;
// - schrijft afgeleid/randen.js; twee keer draaien geeft een byte-gelijk bestand.

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { topology } from "topojson-server";
import { bewijsBinnen, lengteBoven, AFSTAND_FACTOR, KM_GRAAD_MAX, randSoort, landlockedUitkomst } from "./randregels.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var BRON = process.argv[2];
var WC_BESTAND = process.argv[3];
var UIT = process.argv[4];

var T_KM = 0.5;          // tolerantie voor kust aan zee en aan binnenwater (GPT, 17-11-2026)
var DREMPEL_KM = 1;      // grenst-aan vanaf 1 km gedeelde rand (§3.4)
var MIN_STUK_KM = 0.001; // kleiner wordt een deelstuk bij de kustcontrole niet gehalveerd; dan "niet bewezen" (onbekende rand)
var CEL = 0.1;           // rastervak van de zoekindex in graden
var R = 6371;
var RAD = Math.PI / 180;

var bronnen = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8"));
var VN = JSON.parse(fs.readFileSync(path.join(HIER, "vn-lidstaten.json"), "utf8"));

function sha(buf) { return crypto.createHash("sha256").update(buf).digest("hex"); }
function laadNE(naam) {
  var buf = fs.readFileSync(path.join(BRON, naam));
  if (sha(buf) !== bronnen.naturalEarth.bestanden[naam]) throw new Error("SHA-256 klopt niet voor " + naam);
  return JSON.parse(buf.toString("utf8")).features;
}
function laadWC() {
  var buf = fs.readFileSync(WC_BESTAND);
  if (sha(buf) !== bronnen.worldCountries.countriesJson) throw new Error("SHA-256 klopt niet voor countries.json");
  return JSON.parse(buf.toString("utf8"));
}

// ---- meetkunde ----
function km(a, b) {
  var dl = (b[0] - a[0]) * RAD, df = (b[1] - a[1]) * RAD;
  var s = Math.sin(df / 2) * Math.sin(df / 2) + Math.cos(a[1] * RAD) * Math.cos(b[1] * RAD) * Math.sin(dl / 2) * Math.sin(dl / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}
// afstand van punt p tot lijnstuk ab in km (lokaal vlak rond p; nauwkeurig op afstanden van deze orde)
function stukKm(p, a, b) {
  var c = Math.cos(p[1] * RAD);
  var ax = (a[0] - p[0]) * c * 111.32, ay = (a[1] - p[1]) * 110.57, bx = (b[0] - p[0]) * c * 111.32, by = (b[1] - p[1]) * 110.57;
  var dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
  var t = l ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l)) : 0;
  return Math.hypot(ax + t * dx, ay + t * dy);
}
function maakIndex(ringen) {
  var g = new Map();
  ringen.forEach(function(r) {
    for (var i = 1; i < r.length; i++) {
      var a = r[i - 1], b = r[i];
      var x0 = Math.floor(Math.min(a[0], b[0]) / CEL), x1 = Math.floor(Math.max(a[0], b[0]) / CEL);
      var y0 = Math.floor(Math.min(a[1], b[1]) / CEL), y1 = Math.floor(Math.max(a[1], b[1]) / CEL);
      for (var x = x0; x <= x1; x++) for (var y = y0; y <= y1; y++) {
        var k = x + "," + y;
        if (!g.has(k)) g.set(k, []);
        g.get(k).push([a, b]);
      }
    }
  });
  return g;
}
// kortste afstand tot de rand; zoekt in het eigen rastervak en de acht buren. Wat verder ligt dan een rastervak,
// komt terug als Infinity of als een afstand groter dan t: voor de indeling is dat hetzelfde (een rastervak is overal
// breder dan t, zie de controle op de breedte hieronder).
function afstand(idx, p) {
  var cx = Math.floor(p[0] / CEL), cy = Math.floor(p[1] / CEL), m = Infinity;
  for (var x = cx - 1; x <= cx + 1; x++) for (var y = cy - 1; y <= cy + 1; y++) {
    var l = idx.get(x + "," + y);
    if (l) for (var i = 0; i < l.length; i++) { var d = stukKm(p, l[i][0], l[i][1]); if (d < m) m = d; }
  }
  return m;
}
// ligt het hele lijnstuk ab binnen t van de rand? Alleen ja als het bewezen is (zie randregels.mjs)
var KUSTTEL = { lijnstukken: 0, direct: 0, naHalveren: 0, nietBewezen: 0, bewezenDeelstukken: 0, halveringen: 0, puntBuitenT: 0, grensBereikt: 0 };
function heelBinnen(idx, a, b, da, db) {
  KUSTTEL.lijnstukken++;
  var voor = KUSTTEL.halveringen;
  var ja = bewijsBinnen(function(p) { return afstand(idx, p); }, lengteBoven, a, b, da, db, T_KM, MIN_STUK_KM, AFSTAND_FACTOR, KUSTTEL);
  if (!ja) KUSTTEL.nietBewezen++; else if (KUSTTEL.halveringen === voor) KUSTTEL.direct++; else KUSTTEL.naHalveren++;
  return ja;
}

// ---- lagen ----
// Conventie (GPT, 17-11-2026): Somaliland (Natural Earth ADM0_A3 SOL, de facto) hoort in deze kennisbank bij Somalie (SOM),
// omdat de 194 op de VN-lijst rusten. Een bewuste afwijking van de bron, ook in BRON.samenvoegingen en op de open lijst.
var SAMENVOEGINGEN = { SOL: "SOM" };
var SAMEN = { BEL: ["BFR", "BWR", "BCR"], GBR: ["NIR", "WLS", "ENG", "SCT"], SRB: ["SRV", "SRS"], BIH: ["BHF", "BIS", "BHB"], ATG: ["ACA", "ACB"] };
var DEEL_VAN = {};
Object.keys(SAMEN).forEach(function(k) { SAMEN[k].forEach(function(g) { DEEL_VAN[g] = k; }); });

var eenheden = {}, landVan = {}, hoofddeel = {};
laadNE("ne_10m_admin_0_map_units.geojson").forEach(function(f) {
  var p = f.properties, id = DEEL_VAN[p.GU_A3] || p.GU_A3, g = f.geometry;
  if (!eenheden[id]) eenheden[id] = [];
  (g.type === "Polygon" ? [g.coordinates] : g.coordinates).forEach(function(c) { eenheden[id].push(c); });
  var land = SAMENVOEGINGEN[p.ADM0_A3] || p.ADM0_A3;
  if (landVan[id] && landVan[id] !== land) throw new Error("eenheid in twee landen: " + id);
  landVan[id] = land;
  hoofddeel[id] = p.HOMEPART === 1;
});
var ids = Object.keys(eenheden).sort();
var oceaan = laadNE("ne_10m_ocean.geojson")[0].geometry.coordinates;
if (oceaan.length !== 2) throw new Error("ne_10m_ocean: verwacht twee vlakken (wereldzee en Kaspische Zee)");
var zeeIdx = maakIndex(oceaan[0]), kaspIdx = maakIndex(oceaan[1]);
var meren = laadNE("ne_10m_lakes.geojson").map(function(f) {
  var g = f.geometry, polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates, bb = [Infinity, Infinity, -Infinity, -Infinity];
  polys.forEach(function(p) { p[0].forEach(function(q) { bb[0] = Math.min(bb[0], q[0]); bb[1] = Math.min(bb[1], q[1]); bb[2] = Math.max(bb[2], q[0]); bb[3] = Math.max(bb[3], q[1]); }); });
  return { naam: f.properties.name || null, polys: polys, bb: bb };
});
var meerIdx = new Map();
meren.forEach(function(m, i) {
  for (var x = Math.floor(m.bb[0]); x <= Math.floor(m.bb[2]); x++) for (var y = Math.floor(m.bb[1]); y <= Math.floor(m.bb[3]); y++) {
    var k = x + "," + y; if (!meerIdx.has(k)) meerIdx.set(k, []); meerIdx.get(k).push(i);
  }
});
function inRing(p, r) {
  var binnen = false;
  for (var i = 0, j = r.length - 1; i < r.length; j = i++) {
    if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) binnen = !binnen;
  }
  return binnen;
}
function inMeer(p) {
  var l = meerIdx.get(Math.floor(p[0]) + "," + Math.floor(p[1])) || [];
  for (var i = 0; i < l.length; i++) {
    var m = meren[l[i]];
    if (p[0] < m.bb[0] || p[0] > m.bb[2] || p[1] < m.bb[1] || p[1] > m.bb[3]) continue;
    for (var j = 0; j < m.polys.length; j++) {
      var poly = m.polys[j];
      if (inRing(p, poly[0]) && !poly.slice(1).some(function(gat) { return inRing(p, gat); })) return m;
    }
  }
  return null;
}

// ---- de 194 ----
var DE194 = {};
VN.landen.forEach(function(l) { DE194[l.ne] = l; });
if (Object.keys(DE194).length !== 194) throw new Error("niet precies 194 landen");
Object.keys(DE194).forEach(function(c) { if (!ids.some(function(id) { return landVan[id] === c; })) throw new Error("geen kaarteenheid voor " + c); });

// ---- topologie zonder kwantisering ----
var fc = { type: "FeatureCollection", features: ids.map(function(id) { return { type: "Feature", id: id, geometry: { type: "MultiPolygon", coordinates: eenheden[id] } }; }) };
var topo = topology({ l: fc });
var bogen = topo.arcs, gebruik = bogen.map(function() { return []; });
topo.objects.l.geometries.forEach(function(g) {
  (function loop(a) { a.forEach(function(x) { if (Array.isArray(x)) loop(x); else gebruik[x < 0 ? ~x : x].push(g.id); }); })(g.arcs);
});

function r3(v) { return Math.round(v * 1000) / 1000; }
function r1(v) { return Math.round(v * 10) / 10; }
var grens = {};          // "A|B" (A < B, landen) -> { land, binnenwater, meren{}, alleenBuitenHoofddeel }
var kust = {};           // land -> { zee, kaspisch, onbekend, nietAantoonbaar, onbekendStukken[] }
var tel = { bogen: bogen.length, gedeeld: 0, internEenheid: 0, internLand: 0, eigen: 0, eigenBuiten194: 0, stukkenEigen: 0, stukkenGedeeld: 0 };
function kustVan(c) { return kust[c] || (kust[c] = { zee: 0, kaspisch: 0, onbekend: 0, nietAantoonbaar: 0, onbekendStukken: [] }); }

bogen.forEach(function(arc, i) {
  var u = gebruik[i], verschillend = u.filter(function(x, k) { return u.indexOf(x) === k; });
  if (verschillend.length > 2) throw new Error("boog met meer dan twee eenheden: " + i);
  if (verschillend.length === 1 && u.length >= 2) { tel.internEenheid++; return; }
  if (verschillend.length === 2) {
    var A = landVan[verschillend[0]], B = landVan[verschillend[1]];
    if (A === B) { tel.internLand++; return; }
    tel.gedeeld++;
    var k = A < B ? A + "|" + B : B + "|" + A;
    var g = grens[k] || (grens[k] = { land: 0, binnenwater: 0, meren: {}, viaHoofddeel: false });
    if (hoofddeel[verschillend[0]] && hoofddeel[verschillend[1]]) g.viaHoofddeel = true;
    for (var j = 1; j < arc.length; j++) {
      tel.stukkenGedeeld++;
      var L = km(arc[j - 1], arc[j]), m = inMeer([(arc[j - 1][0] + arc[j][0]) / 2, (arc[j - 1][1] + arc[j][1]) / 2]);
      if (m) { g.binnenwater += L; var n = m.naam || "(zonder naam)"; g.meren[n] = (g.meren[n] || 0) + L; } else g.land += L;
    }
    return;
  }
  // niet gedeeld: kust aan zee, kust aan binnenwater of onbekende rand, per lijnstuk
  tel.eigen++;
  var c = landVan[u[0]];
  if (!DE194[c]) { tel.eigenBuiten194++; return; }   // alleen de 194 krijgen een indeling (Antarctica loopt tot 90 graden Z)
  var kv = kustVan(c);
  var dz = arc.map(function(p) { if (Math.abs(p[1]) >= 87) throw new Error("punt boven 87 graden: rastervak smaller dan t"); return afstand(zeeIdx, p); });
  var dk = arc.map(function(p) { return afstand(kaspIdx, p); });
  for (var q = 1; q < arc.length; q++) {
    tel.stukkenEigen++;
    var a = arc[q - 1], b = arc[q], L2 = km(a, b);
    var zee = dz[q - 1] <= T_KM && dz[q] <= T_KM && heelBinnen(zeeIdx, a, b, dz[q - 1], dz[q]);
    var kasp = dk[q - 1] <= T_KM && dk[q] <= T_KM && heelBinnen(kaspIdx, a, b, dk[q - 1], dk[q]);
    var soort = randSoort(zee, kasp);
    if (soort === "zee") kv.zee += L2;
    else if (soort === "kaspisch") kv.kaspisch += L2;
    else {
      kv.onbekend += L2;
      if ((dz[q - 1] <= T_KM && dz[q] <= T_KM) || (dk[q - 1] <= T_KM && dk[q] <= T_KM)) kv.nietAantoonbaar += L2;
      kv.onbekendStukken.push([a, b]);
    }
  }
});

// onbekende stukken samenvatten tot een omhullend vak per land (voor de open lijst)
function vak(stukken) {
  var bb = [Infinity, Infinity, -Infinity, -Infinity];
  stukken.forEach(function(s) { s.forEach(function(p) { bb[0] = Math.min(bb[0], p[0]); bb[1] = Math.min(bb[1], p[1]); bb[2] = Math.max(bb[2], p[0]); bb[3] = Math.max(bb[3], p[1]); }); });
  return bb.map(function(v) { return Math.round(v * 100) / 100; });
}

// ---- uitkomsten voor de 194 ----
var landen194 = Object.keys(DE194).sort();
var GRENST_AAN = [], KORT = [], BUITEN = {};
// enclave (§3.4): een land zonder niet-gedeelde rand en met precies een buur is buurland van dat land, ook onder de drempel
var burenVan = {};
Object.keys(grens).forEach(function(k) { var ab = k.split("|"); (burenVan[ab[0]] = burenVan[ab[0]] || []).push(ab[1]); (burenVan[ab[1]] = burenVan[ab[1]] || []).push(ab[0]); });
var ENCLAVE = {};
Object.keys(DE194).forEach(function(c) { if (!kust[c] && burenVan[c] && burenVan[c].length === 1) ENCLAVE[c] = burenVan[c][0]; });
Object.keys(grens).sort().forEach(function(k) {
  var ab = k.split("|"), g = grens[k], tot = g.land + g.binnenwater;
  var in194 = DE194[ab[0]] && DE194[ab[1]];
  if (!in194) {
    ab.forEach(function(x, i) { var y = ab[1 - i]; if (DE194[x] && !DE194[y]) { (BUITEN[x] = BUITEN[x] || []).push([y, r1(tot)]); } });
    return;
  }
  var via = g.binnenwater === 0 ? "land" : (g.land === 0 ? "binnenwater" : "beide");
  var meren = Object.keys(g.meren).sort().map(function(n) { return [n, r1(g.meren[n])]; });
  var enclave = ENCLAVE[ab[0]] === ab[1] ? ab[0] : (ENCLAVE[ab[1]] === ab[0] ? ab[1] : null);
  var rec = { a: ab[0], b: ab[1], km: r1(tot), landKm: r1(g.land), binnenwaterKm: r1(g.binnenwater), via: via, meren: meren, alleenBuitenHoofddeel: !g.viaHoofddeel, enclave: enclave };
  if (tot >= DREMPEL_KM || enclave) GRENST_AAN.push(rec); else KORT.push(rec);
});
var LANDLOCKED = {};
landen194.forEach(function(c) {
  var kv = kustVan(c);
  var uitkomst = landlockedUitkomst(kv.zee, kv.onbekend);
  LANDLOCKED[c] = { uitkomst: uitkomst, zeeKm: r1(kv.zee), kaspischKm: r1(kv.kaspisch), onbekendKm: r1(kv.onbekend), onbekendVak: kv.onbekend > 0 ? vak(kv.onbekendStukken) : null };
});

// ---- controle tegen world-countries (alleen controle; levert geen enkele waarde) ----
var WC = laadWC(), wcPer = {};
WC.forEach(function(w) { wcPer[w.cca3] = w; });
function wcCode(c) { return (DE194[c] && DE194[c].wc) || c; }
var neVanWc = {};
landen194.forEach(function(c) { neVanWc[wcCode(c)] = c; });
var AFWIJKINGEN = [];
function afw(id, soort, tekst, gegevens) { AFWIJKINGEN.push({ id: id, soort: soort, tekst: tekst, gegevens: gegevens || null }); }
WC.filter(function(w) { return w.unMember; }).map(function(w) { return w.cca3; }).sort().forEach(function(w) {
  if (!neVanWc[w]) afw("lijst-wc-" + w, "lijst", "WC telt " + w + " als VN-lid, maar het staat niet in de 194");
});
landen194.forEach(function(c) {
  var w = wcPer[wcCode(c)];
  if (!w) { afw("lijst-geen-wc-" + c, "lijst", c + " staat niet in WC"); return; }
  if (!w.unMember) afw("lijst-wc-geen-lid-" + c, "lijst", "WC telt " + c + " niet als VN-lid");
  if (wcCode(c) !== c) afw("code-" + c, "code", "Natural Earth gebruikt " + c + ", WC (ISO) " + wcCode(c));
});
var onzeBuren = {};
GRENST_AAN.forEach(function(g) { (onzeBuren[g.a] = onzeBuren[g.a] || {})[g.b] = g; (onzeBuren[g.b] = onzeBuren[g.b] || {})[g.a] = g; });
var gezien = {};
landen194.forEach(function(c) {
  var w = wcPer[wcCode(c)]; if (!w) return;
  var wcB = (w.borders || []).map(function(x) { return neVanWc[x] || null; });
  var wcBuiten = (w.borders || []).filter(function(x) { return !neVanWc[x]; });
  wcB.forEach(function(b) {
    if (!b) return; var k = c < b ? c + "|" + b : b + "|" + c;
    if (!(onzeBuren[c] && onzeBuren[c][b]) && !gezien[k]) { gezien[k] = 1; afw("buren-alleen-wc-" + k.replace("|", "-"), "buren", "WC: " + c + " grenst aan " + b + "; volgens de geometrie niet (of < 1 km)"); }
  });
  Object.keys(onzeBuren[c] || {}).forEach(function(b) {
    var k = c < b ? c + "|" + b : b + "|" + c;
    if (wcB.indexOf(b) < 0 && !gezien[k]) { gezien[k] = 1; var g = onzeBuren[c][b]; afw("buren-alleen-ne-" + k.replace("|", "-"), "buren", "volgens de geometrie grenst " + c + " aan " + b + " (" + g.km + " km), WC niet", { km: g.km, via: g.via, alleenBuitenHoofddeel: g.alleenBuitenHoofddeel }); }
  });
  if (wcBuiten.length) afw("buren-wc-buiten-" + c, "buren-buiten", "WC noemt buren buiten de 194 voor " + c + ": " + wcBuiten.join(", "), { wc: wcBuiten, ne: (BUITEN[c] || []).map(function(x) { return x[0]; }) });
  else if (BUITEN[c]) afw("buren-ne-buiten-" + c, "buren-buiten", "volgens de geometrie grenst " + c + " aan gebieden buiten de 194: " + BUITEN[c].map(function(x) { return x[0]; }).join(", "), { ne: BUITEN[c] });
  var ll = LANDLOCKED[c];
  if (ll.uitkomst === "onbeslist") afw("landlocked-onbeslist-" + c, "landlocked", c + ": geen kust aan zee, wel onbekende rand");
  else if ((ll.uitkomst === "landlocked") !== !!w.landlocked) afw("landlocked-wc-" + c, "landlocked", c + ": volgens de geometrie " + ll.uitkomst + ", WC landlocked = " + w.landlocked);
  if (ll.onbekendKm > 0) afw("onbekende-rand-" + c, "onbekende-rand", c + ": " + ll.onbekendKm + " km onbekende rand", { vak: ll.onbekendVak });
});
Object.keys(SAMENVOEGINGEN).forEach(function(k) { afw("conventie-" + k + "-" + SAMENVOEGINGEN[k], "conventie", "Natural Earth " + k + " is samengevoegd met " + SAMENVOEGINGEN[k] + " (afwijking van de bron)"); });
KORT.forEach(function(g) { afw("buren-kort-" + g.a + "-" + g.b, "buren-kort", g.a + " en " + g.b + " delen " + g.km + " km rand (> 0 en < 1 km): geen automatische relatie"); });
GRENST_AAN.forEach(function(g) {
  if (g.binnenwaterKm > 0 && g.landKm < DREMPEL_KM) afw("buren-binnenwater-" + g.a + "-" + g.b, "buren-binnenwater", g.a + " en " + g.b + ": " + g.landKm + " km over land, " + g.binnenwaterKm + " km door binnenwater");
  if (g.enclave && g.km < DREMPEL_KM) afw("buren-enclave-" + g.a + "-" + g.b, "buren-enclave", g.enclave + " is een enclave; de gedeelde rand is in de bron " + g.km + " km (< " + DREMPEL_KM + " km), de relatie volgt uit de enclaveregel");
  if (g.alleenBuitenHoofddeel) afw("buren-overzees-" + g.a + "-" + g.b, "buren-overzees", g.a + " en " + g.b + " grenzen alleen via een deel buiten het hoofddeel (Natural Earth HOMEPART)");
});
AFWIJKINGEN.sort(function(x, y) { return x.id < y.id ? -1 : x.id > y.id ? 1 : 0; });

// ---- schrijven ----
var BRONREGEL = {
  script: "tools/topo/bereken-randen.mjs",
  naturalEarth: { versie: bronnen.naturalEarth.versie, commit: bronnen.naturalEarth.commit, bestanden: ["ne_10m_admin_0_map_units.geojson", "ne_10m_ocean.geojson", "ne_10m_lakes.geojson"].map(function(n) { return [n, bronnen.naturalEarth.bestanden[n]]; }) },
  landenlijst: { id: VN.bron.id, url: VN.bron.url, geraadpleegd: VN.bron.geraadpleegd },
  controle: { id: "WC", versie: bronnen.worldCountries.versie, sha256: bronnen.worldCountries.countriesJson },
  tKm: T_KM, drempelKm: DREMPEL_KM,
  samenvoegingen: Object.keys(SAMENVOEGINGEN).map(function(k) { return { van: k, naar: SAMENVOEGINGEN[k], reden: "Somaliland hoort bij Somalie: de 194 rusten op de VN-lijst (beslissing GPT, 17-11-2026)" }; }),
  kustcontrole: { regel: "kust alleen als bewezen: " + AFSTAND_FACTOR + " * max(d1, d2) + Lboven/2 <= t voor elk deelstuk (Lboven met " + KM_GRAAD_MAX + " km per graad op de laagste breedte); halveren tot " + (MIN_STUK_KM * 1000) + " m; niet bewezen = onbekende rand", tellers: KUSTTEL },
  conventie: "een land = alle kaarteenheden met dezelfde ADM0_A3 (Natural Earth); topologie zonder kwantisering; lengtes geodetisch (bol, R = 6371 km); een gedeeld lijnstuk ligt in binnenwater als zijn midden in een vlak van ne_10m_lakes ligt"
};
function regel(naam, waarde) { return "export var " + naam + " = " + JSON.stringify(waarde) + ";\n"; }
var tekst = "// GEGENEREERD door tools/topo/bereken-randen.mjs; niet met de hand bewerken.\n" +
  "// Plan T2b §3.4 v1.3 met t = " + T_KM + " km. Bronnen en SHA-256 in BRON hieronder en in tools/topo/bronnen.json.\n" +
  "// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.\n" +
  regel("BRON", BRONREGEL) +
  "// grenst-aan (symmetrisch, een keer per paar, a < b): gedeelde rand >= " + DREMPEL_KM + " km\n" +
  regel("GRENST_AAN", GRENST_AAN) +
  "// gedeelde rand > 0 en < " + DREMPEL_KM + " km: geen relatie, wel op de open lijst\n" +
  regel("KORTE_GRENZEN", KORT) +
  "// buren buiten de 194 (gebieden zonder eigen item), met de gedeelde lengte in km\n" +
  regel("BUREN_BUITEN_DE_194", BUITEN) +
  "// landlocked: niet / landlocked / onbeslist, met de lengte per randsoort in km\n" +
  regel("LANDLOCKED", LANDLOCKED) +
  "// verschillen met de controlebron en andere punten voor de open lijst (src/core/topo/open-vragen.md)\n" +
  regel("AFWIJKINGEN", AFWIJKINGEN);
fs.mkdirSync(UIT, { recursive: true });
fs.writeFileSync(path.join(UIT, "randen.js"), tekst);
var soorten = { landlocked: 0, niet: 0, onbeslist: 0 };
landen194.forEach(function(c) { soorten[LANDLOCKED[c].uitkomst]++; });
console.log(JSON.stringify({ tel: tel, kust: KUSTTEL, grenstAan: GRENST_AAN.length, kort: KORT.length, landlocked: soorten, afwijkingen: AFWIJKINGEN.length }));
