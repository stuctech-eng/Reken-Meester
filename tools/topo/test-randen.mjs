// Tests voor de randen van de 194 (plan T2b §3.4 v1.3 en §3.5). Alleen bouwomgeving, niet in de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node test-randen.mjs <map met de Natural Earth-bestanden> <countries.json van world-countries 5.1.0> [randen.js]
// Zonder derde argument: test src/core/topo/afgeleid/randen.js en controleert ook dat het script dat bestand byte-gelijk
// opnieuw maakt (twee keer). Met een derde argument (mutanten): alleen de inhoudelijke controles op dat bestand.
//
// De herberekening hieronder is eigen code: geen topojson, een eigen sleutel per lijnstuk, d3-geo voor afstanden en
// voor "ligt in een meer", en een eigen bemonstering van de kust (om de 50 m, met een eigen veiligheidsmarge).

import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { execFileSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";
import { geoDistance, geoContains } from "d3-geo";
import { bewijsBinnen, lengteBoven, AFSTAND_FACTOR, KM_GRAAD_MAX, randSoort, landlockedUitkomst } from "./randregels.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var ROOT = path.resolve(HIER, "..", "..");
var NE = process.argv[2], WCF = process.argv[3];
var STANDAARD = path.join(ROOT, "src", "core", "topo", "afgeleid", "randen.js");
var DOEL = process.argv[4] ? path.resolve(process.argv[4]) : STANDAARD;
var MUTANT = !!process.argv[4];
var T = 0.5, DREMPEL = 1, STAP = 0.05, RKM = 6371;
var STATUSSEN = ["onderzocht", "bevestigd verschil", "nog onbeslist", "gecorrigeerd"];

var fouten = [], geslaagd = 0;
function eis(ok, tekst) { if (ok) geslaagd++; else fouten.push(tekst); }

var R = await import(pathToFileURL(DOEL).href + "?" + Date.now());
var bronnen = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8"));
var VN = JSON.parse(fs.readFileSync(path.join(HIER, "vn-lidstaten.json"), "utf8"));
function sha(buf) { return crypto.createHash("sha256").update(buf).digest("hex"); }
function lees(naam) {
  var buf = fs.readFileSync(path.join(NE, naam));
  eis(sha(buf) === bronnen.naturalEarth.bestanden[naam], "SHA-256 " + naam);
  return JSON.parse(buf.toString("utf8")).features;
}

// ---- 1. bronnen en vaste waarden ----
eis(R.BRON.tKm === T && R.BRON.drempelKm === DREMPEL, "t = 0,5 km en drempel = 1 km in BRON");
eis(R.BRON.naturalEarth.bestanden.every(function(x) { return bronnen.naturalEarth.bestanden[x[0]] === x[1]; }), "SHA-256 in BRON gelijk aan bronnen.json");
eis(R.BRON.controle.sha256 === bronnen.worldCountries.countriesJson, "SHA-256 van WC in BRON");
eis(VN.bron.url && VN.bron.geraadpleegd && VN.landen.length === 194, "landenlijst met bron, 194 regels");
eis(VN.landen.filter(function(l) { return !l.conventie; }).length === 193, "193 VN-lidstaten plus een conventie (Vaticaanstad)");
var DE194 = {};
VN.landen.forEach(function(l) { DE194[l.ne] = l; });
eis(Object.keys(DE194).length === 194, "194 verschillende codes");
var wcBuf = fs.readFileSync(WCF);
eis(sha(wcBuf) === bronnen.worldCountries.countriesJson, "SHA-256 countries.json");
var WC = JSON.parse(wcBuf.toString("utf8"));

// ---- 2. synthetische tests van de regels (los van de echte gegevens) ----
// coordinaten in km; afstand tot een gebroken lijn ("kust")
function vlakAfst(kust) { return function(p) { var m = Infinity; for (var i = 1; i < kust.length; i++) {
  var a = kust[i - 1], b = kust[i], dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy;
  var t = l ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)) : 0;
  m = Math.min(m, Math.hypot(a[0] + t * dx - p[0], a[1] + t * dy - p[1])); } return m; }; }
function vlakLengte(a, b) { return Math.hypot(b[0] - a[0], b[1] - a[1]); }
function bewijs(kust, a, b) { var f = vlakAfst(kust), tel = { bewezenDeelstukken: 0, halveringen: 0, puntBuitenT: 0, grensBereikt: 0 };
  return { ja: bewijsBinnen(f, vlakLengte, a, b, f(a), f(b), T, 0.001, 1, tel), tel: tel }; }
var recht = [[-1, 0], [11, 0]], hoek = [[0, 0], [5, -3], [10, 0]];
var s1 = bewijs(recht, [1, 0.4], [9, 0.4]);
eis(s1.ja && s1.tel.grensBereikt === 0, "synthetisch: lijnstuk overal op 0,4 km van de kust is kust (bewezen)");
var s2 = bewijs(hoek, [0, 0.3], [10, 0.3]);
eis(!s2.ja && s2.tel.puntBuitenT > 0, "synthetisch: eindpunten binnen t, midden ver van de kust: geen kust");
var s3 = bewijs(recht, [0, 0.4999999], [1, 0.4999999]);
eis(!s3.ja && s3.tel.grensBereikt > 0, "synthetisch: overal binnen t, maar niet te bewijzen boven 1 m: onbekend (conservatief)");
var fr = vlakAfst(recht);
eis(bewijsBinnen(fr, vlakLengte, [1, 0.45], [1.0005, 0.45], 0.45, 0.45, T, 0.001, 1, null) && !bewijsBinnen(fr, vlakLengte, [1, 0.45], [1.0005, 0.45], 0.45, 0.45, T, 0.001, 1.2, null), "synthetisch: de afstandsfactor telt mee in de bovengrens (0,45 km: met factor 1 kust, met factor 1,2 niet bewezen)");
// eigenschap: bewezen betekent echt binnen t (dicht nagemeten), voor 3000 willekeurige lijnstukken
var zaad = 12345; function toeval() { zaad = (zaad * 1103515245 + 12345) % 2147483648; return zaad / 2147483648; }
var onterecht = 0, bewezenAantal = 0;
for (var z = 0; z < 3000; z++) {
  var kust = [[0, 0]]; for (var k = 1; k <= 4; k++) kust.push([k * 2, (toeval() - 0.5) * 2]);
  var f = vlakAfst(kust), a = [toeval() * 8, (toeval() - 0.5) * 3], b = [a[0] + (toeval() - 0.5) * 4, a[1] + (toeval() - 0.5) * 2];
  if (f(a) > T || f(b) > T) continue;
  if (!bewijsBinnen(f, vlakLengte, a, b, f(a), f(b), T, 0.001, 1, null)) continue;
  bewezenAantal++;
  for (var i = 0; i <= 2000; i++) { var q = [a[0] + (b[0] - a[0]) * i / 2000, a[1] + (b[1] - a[1]) * i / 2000]; if (f(q) > T + 1e-9) { onterecht++; break; } }
}
eis(bewezenAantal > 100 && onterecht === 0, "synthetisch: geen enkel bewezen lijnstuk heeft een punt buiten t (" + bewezenAantal + " bewezen, " + onterecht + " onterecht)");
// lengteBoven: nooit kleiner dan de werkelijke lengte van de rechte lijn op de WGS84-ellipsoide (fijn nagerekend)
function ellLengte(a, b) { var e2 = 0.00669438, A = 6378.137, s = 0, n = 400;
  for (var i = 0; i < n; i++) { var f = (a[1] + (b[1] - a[1]) * (i + 0.5) / n) * Math.PI / 180, w = Math.sqrt(1 - e2 * Math.sin(f) * Math.sin(f));
    var kx = A * Math.cos(f) / w * Math.PI / 180, ky = A * (1 - e2) / (w * w * w) * Math.PI / 180;
    s += Math.hypot((b[0] - a[0]) / n * kx, (b[1] - a[1]) / n * ky); } return s; }
var teKort = 0;
for (var z2 = 0; z2 < 3000; z2++) {
  var la = (toeval() - 0.5) * 170, a2 = [(toeval() - 0.5) * 360, la], b2 = [a2[0] + (toeval() - 0.5) * 1, Math.max(-86, Math.min(86, la + (toeval() - 0.5) * 1))];
  if (lengteBoven(a2, b2) < ellLengte(a2, b2)) teKort++;
}
// de afstandsfactor: noord-zuid 111,70 / 110,57; oost-west de verandering van cos over 0,5 / 110,57 graad bij 87 graden
var dBreedte = T / 110.57, cosFactor = Math.cos((87 - dBreedte) * Math.PI / 180) / Math.cos(87 * Math.PI / 180), nodig = KM_GRAAD_MAX / 110.57 * cosFactor;
eis(dBreedte < 0.004523 && cosFactor <= 1.00151 && nodig <= 1.01175, "afstandsfactor: " + dBreedte.toFixed(6) + " graad, cos-factor " + cosFactor.toFixed(6) + " (<= 1,00151), nodig " + nodig.toFixed(5));
eis(KM_GRAAD_MAX >= 111.694 && AFSTAND_FACTOR >= nodig, "afstandsfactor dekt de meetfout: " + AFSTAND_FACTOR + " >= " + nodig.toFixed(5));
eis(teKort === 0, "lengteBoven is nooit kleiner dan de lengte van de lijn op de ellipsoide (" + teKort + " van 3000 te kort)");
eis(randSoort(true, false) === "zee" && randSoort(false, true) === "kaspisch" && randSoort(true, true) === "onbekend" && randSoort(false, false) === "onbekend", "synthetisch: randsoort uit de twee bewijzen");
// drie verzonnen landen (lengtes per randsoort in km)
var LAND_A = { landgrens: 120, zee: 0, onbekend: 3 }, LAND_B = { landgrens: 80, zee: 40, onbekend: 3 }, LAND_C = { landgrens: 200, zee: 0, onbekend: 0 };
eis(landlockedUitkomst(LAND_A.zee, LAND_A.onbekend) === "onbeslist", "synthetisch land A: geen zeekust, wel onbekende rand: onbeslist");
eis(landlockedUitkomst(LAND_B.zee, LAND_B.onbekend) === "niet", "synthetisch land B: zeekust en onbekende rand: niet landlocked");
eis(landlockedUitkomst(LAND_C.zee, LAND_C.onbekend) === "landlocked", "synthetisch land C: alleen landgrenzen: landlocked");

// ---- 2b. eigen herberekening ----
// de vaste samenvoeging (beslissing GPT, 17-11-2026), hier opnieuw vastgelegd en tegen BRON gecontroleerd
var SAMENVOEGING = { SOL: "SOM" };
eis(JSON.stringify((R.BRON.samenvoegingen || []).map(function(x) { return [x.van, x.naar]; })) === JSON.stringify([["SOL", "SOM"]]), "samenvoeging Somaliland bij Somalie staat in BRON");
var land = {}, eenhedenPerLand = {};
var featuresNE = lees("ne_10m_admin_0_map_units.geojson");
featuresNE.forEach(function(f) {
  var c = SAMENVOEGING[f.properties.ADM0_A3] || f.properties.ADM0_A3, g = f.geometry;
  (g.type === "Polygon" ? [g.coordinates] : g.coordinates).forEach(function(p) { (land[c] = land[c] || []).push(p); });
  (eenhedenPerLand[c] = eenhedenPerLand[c] || []).push(f.properties.GU_A3);
});
function sleutel(a, b) { var x = a[0] + "," + a[1], y = b[0] + "," + b[1]; return x < y ? x + "|" + y : y + "|" + x; }
var stukken = new Map();   // sleutel -> { a, b, wie: { land: aantal } }
Object.keys(land).forEach(function(c) {
  land[c].forEach(function(poly) { poly.forEach(function(ring) {
    for (var i = 1; i < ring.length; i++) {
      var a = ring[i - 1], b = ring[i];
      if (a[0] === b[0] && a[1] === b[1]) continue;
      var k = sleutel(a, b), s = stukken.get(k);
      if (!s) { s = { a: a, b: b, wie: {} }; stukken.set(k, s); }
      s.wie[c] = (s.wie[c] || 0) + 1;
    }
  }); });
});
function lengte(a, b) { return geoDistance(a, b) * RKM; }
var meren = lees("ne_10m_lakes.geojson").map(function(f) {
  var bb = [Infinity, Infinity, -Infinity, -Infinity], g = f.geometry;
  (g.type === "Polygon" ? [g.coordinates] : g.coordinates).forEach(function(p) { p[0].forEach(function(q) { bb[0] = Math.min(bb[0], q[0]); bb[1] = Math.min(bb[1], q[1]); bb[2] = Math.max(bb[2], q[0]); bb[3] = Math.max(bb[3], q[1]); }); });
  return { f: f, bb: bb };
});
function inMeer(p) { return meren.some(function(m) { return p[0] >= m.bb[0] && p[0] <= m.bb[2] && p[1] >= m.bb[1] && p[1] <= m.bb[3] && geoContains(m.f, p); }); }
var oceaan = lees("ne_10m_ocean.geojson")[0].geometry.coordinates;
eis(oceaan.length === 2, "ne_10m_ocean heeft twee vlakken");
var C2 = 0.05;
function index(ringen) {
  var g = new Map();
  ringen.forEach(function(r) { for (var i = 1; i < r.length; i++) {
    var a = r[i - 1], b = r[i];
    for (var x = Math.floor(Math.min(a[0], b[0]) / C2); x <= Math.floor(Math.max(a[0], b[0]) / C2); x++)
      for (var y = Math.floor(Math.min(a[1], b[1]) / C2); y <= Math.floor(Math.max(a[1], b[1]) / C2); y++) {
        var k = x * 100000 + y; if (!g.has(k)) g.set(k, []); g.get(k).push([a, b]);
      }
  } });
  return g;
}
// afstand punt-lijnstuk: vlak rond het midden van het lijnstuk (andere benadering dan het script)
function puntStuk(p, a, b) {
  var c = Math.cos((a[1] + b[1]) / 2 * Math.PI / 180), k = Math.PI / 180 * RKM;
  var px = p[0] * c * k, py = p[1] * k, ax = a[0] * c * k, ay = a[1] * k, bx = b[0] * c * k, by = b[1] * k;
  var dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0;
  return Math.hypot(ax + t * dx - px, ay + t * dy - py);
}
function afst(idx, p) {
  var cx = Math.floor(p[0] / C2), cy = Math.floor(p[1] / C2), m = Infinity, n = Math.ceil(T / (C2 * 111 * Math.cos(p[1] * Math.PI / 180))) + 1;
  for (var x = cx - n; x <= cx + n; x++) for (var y = cy - 2; y <= cy + 2; y++) {
    var l = idx.get(x * 100000 + y); if (l) l.forEach(function(s) { var d = puntStuk(p, s[0], s[1]); if (d < m) m = d; });
  }
  return m;
}
var zeeI = index(oceaan[0]), kaspI = index(oceaan[1]);
function langsBinnen(idx, a, b) {
  var da = afst(idx, a), db = afst(idx, b), L = lengte(a, b);
  if (da > T || db > T) return false;
  if (Math.max(da, db) + L / 2 <= T) return true;
  var n = Math.ceil(L / STAP), vorige = da;
  for (var i = 1; i <= n; i++) {
    var p = i === n ? b : [a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n], d = i === n ? db : afst(idx, p);
    if (Math.max(vorige, d) + L / n / 2 > T) return false;
    vorige = d;
  }
  return true;
}
var paren = {}, kustEigen = {};
stukken.forEach(function(s) {
  var wie = Object.keys(s.wie);
  if (wie.length === 2) {
    var k = wie.sort().join("|"), L = lengte(s.a, s.b), p = paren[k] || (paren[k] = { land: 0, water: 0 });
    if (inMeer([(s.a[0] + s.b[0]) / 2, (s.a[1] + s.b[1]) / 2])) p.water += L; else p.land += L;
    return;
  }
  if (wie.length !== 1 || s.wie[wie[0]] !== 1) return;   // intern (twee keer door hetzelfde land)
  var c = wie[0]; if (!DE194[c]) return;
  var kv = kustEigen[c] || (kustEigen[c] = { zee: 0, kasp: 0, onb: 0 }), L2 = lengte(s.a, s.b);
  var z = langsBinnen(zeeI, s.a, s.b), q = langsBinnen(kaspI, s.a, s.b);
  if (z && !q) kv.zee += L2; else if (q && !z) kv.kasp += L2; else kv.onb += L2;
});

// ---- 3. grenst-aan ----
var uitParen = {};
R.GRENST_AAN.forEach(function(g) {
  var k = g.a + "|" + g.b;
  eis(g.a < g.b && DE194[g.a] && DE194[g.b], "paar geordend en binnen de 194: " + k);
  eis(!uitParen[k], "paar een keer: " + k);
  uitParen[k] = g;
  eis(Math.abs(g.km - g.landKm - g.binnenwaterKm) <= 0.11, "km = land + binnenwater: " + k);
  eis(g.via === (g.binnenwaterKm === 0 ? "land" : (g.landKm === 0 ? "binnenwater" : "beide")), "kwalificatie via: " + k);
});
// enclave: een land zonder niet-gedeelde rand met precies een buur
var burenEigen = {};
Object.keys(paren).forEach(function(k) { var ab = k.split("|"); (burenEigen[ab[0]] = burenEigen[ab[0]] || []).push(ab[1]); (burenEigen[ab[1]] = burenEigen[ab[1]] || []).push(ab[0]); });
var enclaves = {};
Object.keys(DE194).forEach(function(c) { if (!kustEigen[c] && burenEigen[c] && burenEigen[c].length === 1) enclaves[c] = burenEigen[c][0]; });
eis(enclaves.LSO === "ZAF" && enclaves.SMR === "ITA" && enclaves.VAT === "ITA" && Object.keys(enclaves).length === 3, "enclaves: precies Lesotho, San Marino en Vaticaanstad");
var verwacht = {};
Object.keys(paren).forEach(function(k) {
  var ab = k.split("|"), p = paren[k], tot = p.land + p.water;
  if (!DE194[ab[0]] || !DE194[ab[1]]) return;
  if (tot >= DREMPEL || enclaves[ab[0]] === ab[1] || enclaves[ab[1]] === ab[0]) verwacht[k] = p;
});
Object.keys(verwacht).forEach(function(k) {
  var g = uitParen[k], p = verwacht[k];
  eis(!!g, "relatie ontbreekt: " + k);
  if (!g) return;
  eis(Math.abs(g.km - (p.land + p.water)) <= 0.2, "lengte " + k + ": " + g.km + " tegen " + (p.land + p.water).toFixed(2));
  // een grens die precies over de oever loopt (noordpunt van het Malawimeer), ligt op de rand van het meer; daar kan
  // "midden in het meer" per methode (vlak of bol) verschillen. Daarom 10% of 1 km speling op de verdeling land/binnenwater.
  eis(Math.abs(g.binnenwaterKm - p.water) <= Math.max(1, 0.1 * p.water), "binnenwater " + k + ": " + g.binnenwaterKm + " tegen " + p.water.toFixed(2));
  eis((g.binnenwaterKm > 0) === (p.water > 0), "wel of geen binnenwater " + k);
  eis(g.enclave === (enclaves[g.a] === g.b ? g.a : (enclaves[g.b] === g.a ? g.b : null)), "enclave bij " + k);
});
Object.keys(uitParen).forEach(function(k) { eis(!!verwacht[k], "relatie zonder gedeelde rand >= 1 km of enclave: " + k); });
R.KORTE_GRENZEN.forEach(function(g) { var p = paren[g.a + "|" + g.b]; eis(p && p.land + p.water > 0 && p.land + p.water < DREMPEL, "korte grens klopt: " + g.a + "-" + g.b); });

// ---- 4. landlocked ----
eis(Object.keys(R.LANDLOCKED).length === 194, "landlocked voor alle 194");
Object.keys(DE194).forEach(function(c) {
  var l = R.LANDLOCKED[c], e = kustEigen[c] || { zee: 0, kasp: 0, onb: 0 };
  if (!l) { eis(false, "landlocked ontbreekt: " + c); return; }
  var regel = l.zeeKm > 0 ? "niet" : (l.onbekendKm > 0 ? "onbeslist" : "landlocked");
  eis(l.uitkomst === regel, "uitkomst volgt uit de randsoorten: " + c);
  var eigen = e.zee > 0 ? "niet" : (e.onb > 0 ? "onbeslist" : "landlocked");
  eis(l.uitkomst === eigen, "landlocked " + c + ": " + l.uitkomst + " tegen eigen herberekening " + eigen);
  eis(Math.abs(l.zeeKm - e.zee) <= Math.max(1, e.zee * 0.001), "kust aan zee " + c + ": " + l.zeeKm + " tegen " + e.zee.toFixed(1));
  eis(Math.abs(l.kaspischKm - e.kasp) <= 1, "kust aan de Kaspische Zee " + c + ": " + l.kaspischKm + " tegen " + e.kasp.toFixed(1));
  eis(Math.abs(l.onbekendKm - e.onb) <= 1, "onbekende rand " + c + ": " + l.onbekendKm + " tegen " + e.onb.toFixed(1));
});
var telLL = { niet: 0, landlocked: 0, onbeslist: 0 };
Object.keys(R.LANDLOCKED).forEach(function(c) { telLL[R.LANDLOCKED[c].uitkomst]++; });
eis(telLL.onbeslist === 0, "geen land onbeslist");
eis(R.LANDLOCKED.KAZ.uitkomst === "landlocked" && R.LANDLOCKED.TKM.uitkomst === "landlocked" && R.LANDLOCKED.AZE.uitkomst === "landlocked" && R.LANDLOCKED.KAZ.kaspischKm > 0, "Kaspische Zee is geen zee (Kazachstan, Turkmenistan, Azerbeidzjan landlocked)");
// de vier beslissingen van 17-11-2026
eis(!!uitParen["BRA|FRA"] && !!uitParen["FRA|SUR"], "Frankrijk (met Frans-Guyana) grenst aan Brazilie en Suriname");
eis(!!uitParen["DJI|SOM"], "Djibouti grenst aan Somalie (Somaliland samengevoegd)");
eis(!R.BUREN_BUITEN_DE_194.SOM && !R.BUREN_BUITEN_DE_194.DJI && !(R.BUREN_BUITEN_DE_194.ETH || []).some(function(x) { return x[0] === "SOL"; }), "Somaliland komt nergens meer als aparte buur voor");
eis(!uitParen["BWA|ZMB"], "geen relatie Botswana-Zambia");
eis(uitParen["COD|TZA"] && uitParen["COD|TZA"].via === "binnenwater" && uitParen["COD|TZA"].km >= DREMPEL, "Congo (DRC)-Tanzania: buren via binnenwater");
eis(R.LANDLOCKED.RUS.onbekendKm === 991.1, "Rusland: 991,1 km onbekende rand");
var kt = R.BRON.kustcontrole.tellers;
eis(kt.lijnstukken === kt.direct + kt.naHalveren + kt.nietBewezen && kt.nietBewezen === kt.puntBuitenT + kt.grensBereikt, "kustcontrole: elk gecontroleerd lijnstuk is direct bewezen, na halveren bewezen of niet bewezen");
eis(R.LANDLOCKED.FJI.uitkomst === "niet" && R.LANDLOCKED.FJI.onbekendKm > 55 && R.LANDLOCKED.FJI.onbekendKm < 56, "Fiji: niet landlocked, 55,4 km onbekende rand (naad)");

// ---- 5. vergelijking met WC (eigen code) en de open lijst ----
var wcPer = {}; WC.forEach(function(w) { wcPer[w.cca3] = w; });
function wcc(c) { return DE194[c].wc || c; }
var terug = {}; Object.keys(DE194).forEach(function(c) { terug[wcc(c)] = c; });
var ids = {};
Object.keys(SAMENVOEGING).forEach(function(k) { ids["conventie-" + k + "-" + SAMENVOEGING[k]] = 1; });
Object.keys(DE194).sort().forEach(function(c) {
  var w = wcPer[wcc(c)];
  eis(!!w && w.unMember, "WC kent " + c + " als lid");
  if (wcc(c) !== c) ids["code-" + c] = 1;
  (w.borders || []).forEach(function(b) {
    var x = terug[b]; if (!x) return; var k = c < x ? c + "|" + x : x + "|" + c;
    if (!uitParen[k]) ids["buren-alleen-wc-" + k.replace("|", "-")] = 1;
  });
  var l = R.LANDLOCKED[c];
  if (l.uitkomst === "onbeslist") ids["landlocked-onbeslist-" + c] = 1;
  else if ((l.uitkomst === "landlocked") !== !!w.landlocked) ids["landlocked-wc-" + c] = 1;
  if (l.onbekendKm > 0) ids["onbekende-rand-" + c] = 1;
});
R.GRENST_AAN.forEach(function(g) {
  var wa = wcPer[wcc(g.a)].borders || [];
  if (wa.indexOf(wcc(g.b)) < 0) ids["buren-alleen-ne-" + g.a + "-" + g.b] = 1;
  if (g.binnenwaterKm > 0 && g.landKm < DREMPEL) ids["buren-binnenwater-" + g.a + "-" + g.b] = 1;
  if (g.enclave && g.km < DREMPEL) ids["buren-enclave-" + g.a + "-" + g.b] = 1;
});
var uitIds = {}; R.AFWIJKINGEN.forEach(function(a) { uitIds[a.id] = a; });
Object.keys(ids).forEach(function(id) { eis(!!uitIds[id], "afwijking ontbreekt in randen.js: " + id); });
var open = {};
fs.readFileSync(path.join(ROOT, "src", "core", "topo", "open-vragen.md"), "utf8").split("\n").forEach(function(r) {
  var m = /^- ([a-z0-9-]+[A-Z0-9-]*) \| ([a-z ]+) \| (.+)$/.exec(r);
  if (m) { eis(!open[m[1]], "open lijst: id een keer: " + m[1]); open[m[1]] = { status: m[2], uitleg: m[3] }; }
});
R.AFWIJKINGEN.forEach(function(a) {
  var o = open[a.id];
  eis(!!o, "op de open lijst: " + a.id);
  if (o) eis(STATUSSEN.indexOf(o.status) >= 0 && o.uitleg.length > 10, "geldige status en uitleg: " + a.id);
});
// de open lijst bevat ook de punten van de landen (test-landen.mjs) en de steden (test-steden-nl.mjs); een id moet in een van die lijsten voorkomen
var landenIds = {};
try { var LL = await import(pathToFileURL(path.join(ROOT, "src", "core", "topo", "items", "landen.js")).href); LL.AFWIJKINGEN_LANDEN.forEach(function(a) { landenIds[a.id] = 1; }); } catch (e) { landenIds = {}; }
// en de punten van de Nederlandse steden (test-steden-nl.mjs)
try { var SS = await import(pathToFileURL(path.join(ROOT, "src", "core", "topo", "items", "steden-nl.js")).href); SS.AFWIJKINGEN_STEDEN.forEach(function(a) { landenIds[a.id] = 1; }); } catch (e) { }
// en de punten van fase 6.2, deel 1: provincies en hoofdsteden (test-bestuur-nlbe.mjs) en de Belgische steden (test-steden-be.mjs)
try { var PB = await import(pathToFileURL(path.join(ROOT, "src", "core", "topo", "items", "provincies.js")).href); PB.AFWIJKINGEN_BESTUUR.forEach(function(a) { landenIds[a.id] = 1; }); } catch (e) { }
try { var SB = await import(pathToFileURL(path.join(ROOT, "src", "core", "topo", "items", "steden-be.js")).href); SB.AFWIJKINGEN_STEDEN_BE.forEach(function(a) { landenIds[a.id] = 1; }); } catch (e) { }
// een punt dat niet meer voorkomt, blijft op de lijst staan met de status "gecorrigeerd" (niets stilzwijgend verwijderen)
Object.keys(open).forEach(function(id) { eis(!!uitIds[id] || !!landenIds[id] || open[id].status === "gecorrigeerd", "open lijst noemt een afwijking die niet (meer) bestaat en niet gecorrigeerd is: " + id); });

// ---- 6. reproduceerbaar en app onaangeroerd (niet bij mutanten) ----
if (!MUTANT) {
  var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "randen-"));
  [1, 2].forEach(function(n) {
    execFileSync("node", [path.join(HIER, "bereken-randen.mjs"), NE, WCF, path.join(tmp, "r" + n)]);
    eis(fs.readFileSync(path.join(tmp, "r" + n, "randen.js")).equals(fs.readFileSync(STANDAARD)), "script geeft byte-gelijk randen.js (run " + n + ")");
  });
  var git = function(a) { return execFileSync("git", a, { cwd: ROOT }).toString(); };
  var anders = git(["diff", "--name-only", "main"]).split("\n").concat(git(["ls-files", "--others", "--exclude-standard"]).split("\n")).filter(Boolean);
  anders.forEach(function(f) { eis(/^(tools\/topo\/|src\/core\/topo\/|public\/kaartproef\/)/.test(f), "buiten de toegestane mappen gewijzigd: " + f); });
  eis(git(["diff", "--name-only", "8cc2fef", "--", "public/kaartproef"]).trim() === "", "public/kaartproef gelijk aan T2a-proef-6 (8cc2fef)");
  var grep = ""; try { grep = git(["grep", "--untracked", "-l", "core/topo", "--", "src", "public", "index.html"]); } catch (e) { grep = ""; }
  var verwijzers = grep.split("\n").filter(Boolean).filter(function(f) { return f.indexOf("src/core/topo/") !== 0; });
  eis(verwijzers.length === 0, "geen bestand buiten de kennisbank verwijst naar src/core/topo: " + verwijzers.join(", "));
}

console.log((fouten.length ? "FOUT" : "GOED") + ": " + geslaagd + " controles geslaagd, " + fouten.length + " mislukt");
fouten.slice(0, 30).forEach(function(f) { console.log("  - " + f); });
process.exit(fouten.length ? 1 : 0);
