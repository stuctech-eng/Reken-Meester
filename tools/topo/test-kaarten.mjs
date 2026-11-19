// Test van de kaarten van fase 6.3 (bouwplan T2b-2 fase 6.3 par. 6, met de grensmeting en optie a). Alleen bouwomgeving.
// Een meting in Node vervangt de iPhone-controle niet (plan v2 par. 5.6).
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node --max-old-space-size=8000 test-kaarten.mjs <map NE> <cbsgebiedsindelingen2026.gpkg> <sectoren.geojson> <werkmap>
// Met KAARTEN kies je de kaarten (standaard alle drie, bijvoorbeeld KAARTEN=nlbe); met DELEN de delen (standaard "inhoud"):
//   inhoud  - opnieuw bouwen (byte-gelijk met de bestanden), structuur, KAARTREF, eigen meting van de vereenvoudiging,
//             eigen grensmeting NL-BE (met de toetszone), omvang (gemeld tegen het doel, geen fout: B11 a),
//             mutanten 1 tot en met 7, 7b en nlbe met 0,5 px bij x1;
//   tik428  - de rastervergelijking tikregel.beslis tegen tik-onafhankelijk.besluitMet op 428 px met de 3 verschilmutanten
//             (mutanten 8 tot en met 10), en de tikmeting op 428 px: elk doel binnen x4 (B10);
//   tikrest - 320, 375 en 390 px: de rastervergelijking en de tikmeting, alleen gemeld.

import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import zlib from "zlib";
import { fileURLToPath, pathToFileURL } from "url";
import ClipperLib from "clipper-lib";
import { geoTransverseMercator } from "d3-geo";
import * as IND from "./tik-onafhankelijk.mjs";
import * as TR from "../../public/kaartproef/tikregel.js";
import { meetKaarten } from "./tik-meet.mjs";
import * as MK from "./maak-kaarten.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var ROOT = path.resolve(HIER, "..", "..");
var PADEN = { ne: process.argv[2], gpkg: process.argv[3], sectoren: process.argv[4] }, WERK = process.argv[5];
var DELEN = (process.env.DELEN || "inhoud").split(",");
var IDS = (process.env.KAARTEN || "nlbe,europa,europa-klein,europa-zuidoost,europa-noordoost,europa-kaukasus").split(",");
var BRONNEN = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8"));
var fouten = [], n = 0;
function eis(ok, tekst) { n++; if (!ok) fouten.push(tekst); }
function stop(tekst) { console.log("STOP: " + tekst); process.exit(2); }
function sha(b) { return crypto.createHash("sha256").update(b).digest("hex"); }
if (!PADEN.ne || !PADEN.gpkg || !PADEN.sectoren || !WERK) stop("gebruik: node test-kaarten.mjs <map NE> <gpkg> <sectoren.geojson> <werkmap>");
fs.mkdirSync(WERK, { recursive: true });

// eigen tabellen (los van maak-kaarten.mjs)
var SOORT = { "cbs-provincie": "provincie", "stb-provincie": "provincie", "stb-gewest": "gewest", "kb-punt": "stad", "ne-rivier": "rivier", "cbs-eiland": "eiland", "ne-land": "land", "land-nlbe": "land" };
var REGIO = ["europa-zuidoost", "europa-noordoost", "europa-kaukasus"];
var TOL_PX = { nlbe: 0.0625, europa: 0.5, "europa-klein": 0.5 };
var AFRONDING = { nlbe: 0.01, europa: 0.1, "europa-klein": 0.1 };
var GZIP = { nlbe: 40 * 1024, europa: 120 * 1024, "europa-klein": 40 * 1024 };
REGIO.forEach(function(r) { TOL_PX[r] = 0.5; AFRONDING[r] = 0.1; GZIP[r] = 40 * 1024; });   // de regiokaarten zoals europa-klein
var EENHEID = (428 - 32) / 1000, PX8 = EENHEID * 8;
var SLEUTELS_ITEM = { id: 1, d: 1, opp: 1, mx: 1, my: 1, ir: 1, x: 1, y: 1 };
var SLEUTELS_KAART = { id: 1, kaartVersie: 1, invoer: 1, breedte: 1, hoogte: 1, beeld: 1, start: 1, achtergrond: 1, lagen: 1 };
var SLEUTELS_LAAG = { id: 1, soort: 1, bron: 1, items: 1, achtergrond: 1 };

async function kennisbank() {
  var bestanden = ["items/landen.js", "items/steden-nl.js", "items/provincies.js", "items/gewesten.js", "items/steden-be.js", "items/water-nlbe.js", "items/eilanden-nl.js"], perId = {};
  for (var i = 0; i < bestanden.length; i++) {
    var m = await import(pathToFileURL(path.join(ROOT, "src/core/topo", bestanden[i])).href);
    Object.keys(m).forEach(function(k) { if (Array.isArray(m[k])) m[k].forEach(function(it) { if (it && it.geometrie) perId[it.id] = it; }); });
  }
  return perId;
}
var KB = await kennisbank();
function cfgVan(id) { return JSON.parse(fs.readFileSync(path.join(HIER, "kaarten", id + ".json"), "utf8")); }
async function laadBestand(id) { return (await import(pathToFileURL(path.join(ROOT, "src/core/topo/kaarten", id + ".js")).href + "?t=" + Date.now())).default; }

// ---- structuur, KAARTREF, kaartVersie (geeft een lijst met fouten; leeg = goed) ----
export function controleer(K, cfg) {
  var f = [];
  Object.keys(K).forEach(function(k) { if (!SLEUTELS_KAART[k]) f.push("onbekende sleutel in de kaart: " + k); });
  if (K.id !== cfg.id) f.push("id van de kaart");
  var tekst = fs.readFileSync(path.join(HIER, "kaarten", cfg.id + ".json"));
  var verwacht = sha(Buffer.concat([tekst, Buffer.from(K.invoer.join("\n"))]));
  if (K.kaartVersie !== verwacht) f.push("kaartVersie past niet bij de configuratie en de invoer");
  var bekend = {}; Object.keys(BRONNEN.register.ids).forEach(function(b) { Object.keys(BRONNEN.register.ids[b].bestanden).forEach(function(x) { bekend[b + ":" + BRONNEN.register.ids[b].bestanden[x]] = 1; }); });
  K.invoer.forEach(function(x) { if (!bekend[x]) f.push("invoer niet in het register: " + x); });
  if (K.lagen.length !== cfg.lagen.length) f.push("aantal lagen");
  cfg.lagen.forEach(function(lc, i) {
    var l = K.lagen[i];
    if (!l || l.id !== lc.id || l.soort !== lc.soort || l.bron !== lc.bron) { f.push("laag " + lc.id + ": id, soort of bron"); return; }
    Object.keys(l).forEach(function(k) { if (!SLEUTELS_LAAG[k]) f.push("onbekende sleutel in laag " + l.id + ": " + k); });
    if (l.items.map(function(x) { return x.id; }).join(",") !== lc.items.join(",")) f.push("laag " + l.id + ": items niet precies volgens de configuratie");
    l.items.forEach(function(x) {
      Object.keys(x).forEach(function(k) { if (!SLEUTELS_ITEM[k]) f.push("item " + x.id + " heeft sleutel " + k + " (geen namen of tekst)"); });
      var it = KB[x.id];
      if (!it) { f.push("KAARTREF: onbekende id " + x.id); return; }
      if (it.soort !== SOORT[l.bron]) f.push("KAARTREF: " + x.id + " is " + it.soort + ", laag " + l.id + " vraagt " + SOORT[l.bron]);
      if (JSON.stringify(it.geometrie.kaart) !== "{}") f.push("geometrie.kaart van " + x.id + " is niet leeg");
      if (l.soort === "punt" ? (typeof x.x !== "number" || typeof x.y !== "number") : typeof x.d !== "string") f.push("geometrie van " + x.id);
    });
    var la = (lc.laagAchtergrond || []).map(function(a) { return a.id; }).join(","), lk = (l.achtergrond || []).map(function(a) { return a.id; }).join(",");
    if (la !== lk) f.push("laag " + l.id + ": achtergrond niet volgens de configuratie");
  });
  K.achtergrond.forEach(function(a) { Object.keys(a).forEach(function(k) { if (!SLEUTELS_ITEM[k]) f.push("achtergrond " + a.id + " heeft sleutel " + k); }); });
  if (/"naam"|"label"|"tekst"/.test(JSON.stringify(K))) f.push("de kaart bevat een naam of tekst");
  return f;
}

// ---- eigen meting van de vereenvoudiging: elk hoekpunt van de geprojecteerde, onvereenvoudigde ring tot het pad ----
// M2 a: exact op het raster van 0,01 (de afronding van nlbe; 0,1 is daar een veelvoud van): optellen in gehele honderdsten
function padRingen(d) {
  var r = [], cur = null, x = 0, y = 0, i = 0;
  var t = d.replace(/([MlZ])/g, " $1 ").trim().split(/[\s,]+/);
  function h(v) { return Math.round(parseFloat(v) * 100); }
  while (i < t.length) {
    var c = t[i++];
    if (c === "M") { x = h(t[i++]); y = h(t[i++]); cur = [[x / 100, y / 100]]; r.push(cur); }
    else if (c === "l") { while (i < t.length && !/[MlZ]/.test(t[i])) { x += h(t[i++]); y += h(t[i++]); cur.push([x / 100, y / 100]); } }
    else if (c === "Z") cur.push([cur[0][0], cur[0][1]]);
  }
  return r;
}
function stukken(rs) { var s = []; rs.forEach(function(r) { for (var i = 1; i < r.length; i++) s.push([r[i - 1], r[i]]); }); return s; }
function dSeg(p, a, b) { var vx = b[0] - a[0], vy = b[1] - a[1], L = vx * vx + vy * vy, t = L ? ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / L : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(p[0] - a[0] - t * vx, p[1] - a[1] - t * vy); }
function rooster(sts, cel) {
  var g = new Map(), bb = [Infinity, -Infinity, Infinity, -Infinity];
  sts.forEach(function(s, i) {
    var a0 = Math.floor(Math.min(s[0][0], s[1][0]) / cel), a1 = Math.floor(Math.max(s[0][0], s[1][0]) / cel), b0 = Math.floor(Math.min(s[0][1], s[1][1]) / cel), b1 = Math.floor(Math.max(s[0][1], s[1][1]) / cel);
    bb = [Math.min(bb[0], a0), Math.max(bb[1], a1), Math.min(bb[2], b0), Math.max(bb[3], b1)];
    for (var a = a0; a <= a1; a++) for (var b = b0; b <= b1; b++) { var k = a * 100003 + b; if (!g.has(k)) g.set(k, []); g.get(k).push(i); }
  });
  return { g: g, cel: cel, sts: sts, bb: bb };
}
// eigen zoektocht (los van maak-kaarten.mjs): per ring alleen de randcellen binnen de omhullende; bij gelijke afstand de laagste index
function dichtstMet(R, p) {
  var cx = Math.floor(p[0] / R.cel), cy = Math.floor(p[1] / R.cel), best = Infinity, bi = -1, bb = R.bb;
  function kijk(a, b) { if (a < bb[0] || a > bb[1] || b < bb[2] || b > bb[3]) return; var l = R.g.get(a * 100003 + b); if (l) for (var j = 0; j < l.length; j++) { var s = R.sts[l[j]], d = dSeg(p, s[0], s[1]); if (d < best || (d === best && l[j] < bi)) { best = d; bi = l[j]; } } }
  var eerst = Math.max(0, bb[0] - cx, cx - bb[1], bb[2] - cy, cy - bb[3]), laatst = Math.max(eerst, cx - bb[0], bb[1] - cx, cy - bb[2], bb[3] - cy) + 1;
  for (var r = eerst; r <= laatst; r++) {
    if (r === 0) kijk(cx, cy);
    else { for (var a = cx - r; a <= cx + r; a++) { kijk(a, cy - r); kijk(a, cy + r); } for (var b = cy - r + 1; b <= cy + r - 1; b++) { kijk(cx - r, b); kijk(cx + r, b); } }
    if (best <= r * R.cel) return { d: best, i: bi };
  }
  return { d: best, i: bi };
}
function dichtst(R, p) { return dichtstMet(R, p).d; }
function volgorde(K) { var o = K.achtergrond.slice(); K.lagen.forEach(function(l) { if (l.soort !== "punt") o = o.concat(l.items); o = o.concat(l.achtergrond || []); }); return o; }
function meetVereenvoudiging(K, ruw) {
  var obj = volgorde(K), max = 0, waar = null, punten = 0;
  if (obj.length !== ruw.length) return { fout: "aantal objecten " + obj.length + " tegen " + ruw.length };
  obj.forEach(function(o, i) {
    if (ruw[i].id !== o.id) waar = waar || ("volgorde " + o.id);
    var R = rooster(stukken(padRingen(o.d)), 2);
    ruw[i].ringen.forEach(function(r) { r.forEach(function(q) { punten++; var d = dichtst(R, q); if (d > max) { max = d; waar = o.id + " (" + q[0].toFixed(2) + ", " + q[1].toFixed(2) + ")"; } }); });
  });
  return { maxPx: max * EENHEID, waar: waar, punten: punten };
}

// ---- eigen grensmeting NL-BE op het kaartbestand ----
function oppR(r) { var s = 0; for (var i = 1; i < r.length; i++) s += r[i - 1][0] * r[i][1] - r[i][0] * r[i - 1][1]; return s / 2; }
function lengte(r) { var s = 0; for (var i = 1; i < r.length; i++) s += Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]); return s; }
// eigen projectie (los van maak-kaarten.mjs), om plaatsen terug te rekenen en de meldzones (G1 b) te herkennen
function eigenProjectie(cfg) {
  var pr = geoTransverseMercator().rotate(cfg.projectie.rotate), rp = [];
  for (var a1 = 0; a1 <= 8; a1++) for (var b1 = 0; b1 <= 8; b1++) rp.push([cfg.lon[0] + (cfg.lon[1] - cfg.lon[0]) * a1 / 8, cfg.lat[0] + (cfg.lat[1] - cfg.lat[0]) * b1 / 8]);
  pr.fitWidth(1000, { type: "MultiPoint", coordinates: rp });
  return pr;
}
export function grens(K, weglaten) {
  var GC = cfgVan(K.id), GP = eigenProjectie(GC), ZONES = GC.grensMelden || [];
  function zoneVan(q) { var g = GP.invert(q); for (var z = 0; z < ZONES.length; z++) if (g[0] >= ZONES[z].lon[0] && g[0] <= ZONES[z].lon[1] && g[1] >= ZONES[z].lat[0] && g[1] <= ZONES[z].lat[1]) return ZONES[z].id; return null; }
  var L = K.lagen.filter(function(l) { return l.id === "landen"; })[0];
  function van(lijst, id) { var x = lijst.filter(function(y) { return y.id === id; })[0]; if (!x) throw new Error("grens: geen " + id); return padRingen(x.d); }
  var vl = { NL: van(L.items, "NLD"), BE: van(L.items, "BEL"), DEU: van(L.items, "DEU"), FRA: van(K.achtergrond, "ne-FRA"), LUX: van(K.achtergrond, "ne-LUX"), zee: van(K.achtergrond, "zee-noordzee") };
  var RS = {}; Object.keys(vl).forEach(function(k) { RS[k] = rooster(stukken(vl[k]), 5); });
  function indeling(eigen, buren) {
    var per = {}, som = 0, totaal = 0, grensStukken = [], klasse = [];
    var sts = stukken(eigen), eigenSet = new Set(sts.map(function(s) { return s[0].join(",") + ";" + s[1].join(","); }));
    sts.forEach(function(s, i) { totaal += Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]); });
    sts.forEach(function(s, i) {
      if (weglaten && weglaten(s, i)) { klasse[i] = null; return; }
      var m = [(s[0][0] + s[1][0]) / 2, (s[0][1] + s[1][1]) / 2], k = null, bd = Infinity;
      if (eigenSet.has(s[1].join(",") + ";" + s[0].join(","))) k = "binnen";   // N1 a: binnengrens tussen twee provincies van NLD
      else buren.forEach(function(b) { var d = dichtst(RS[b], m); if (d < bd) { bd = d; k = b; } });
      var l = Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]);
      per[k] = (per[k] || 0) + l * PX8; som += l;
      klasse[i] = k;
      if (k === buren[0]) grensStukken.push({ s: s, i: i });
    });
    return { per: per, somPx: som * PX8, totaalPx: totaal * PX8, grens: grensStukken, klasse: klasse };
  }
  var be = indeling(vl.BE, ["NL", "FRA", "LUX", "DEU", "zee"]), nl = indeling(vl.NL, ["BE", "DEU", "zee"]);
  // toetszone (plan par. 1 en 6, S2): beide zijden in de klasse NL-BE en binnen 2 px (x8) van het andere land; de rest gemeld
  function verst(gs, naar, ander, eigen) {
    var m = 0, plaats = null, stap = 0.1 / PX8, buiten = [], laatste = -2, binnen = 0, gemeld = {}, zoneLen = 0, getoetstLen = 0;
    gs.forEach(function(g) {
      var s = g.s, mid = [(s[0][0] + s[1][0]) / 2, (s[0][1] + s[1][1]) / 2], a = dichtstMet(RS[naar], mid), l = Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]), k = Math.max(1, Math.ceil(l / stap)), vm = 0, vp = null;
      for (var i = 0; i <= k; i++) { var q = [s[0][0] + (s[1][0] - s[0][0]) * i / k, s[0][1] + (s[1][1] - s[0][1]) * i / k], d = dichtst(RS[naar], q); if (d > vm) { vm = d; vp = q; } }
      if (ander[a.i] === eigen && a.d * PX8 <= 2) {
        // V1: per meetpunt in of buiten een meldzone (G1 b); de lengte per deelinterval, ingedeeld naar zijn midden
        binnen++; laatste = -2; zoneLen += l * PX8;
        var nn = Math.max(1, Math.ceil(l * PX8 / 0.1)), hier = {};
        for (var j = 0; j <= nn; j++) {
          var pq = [s[0][0] + (s[1][0] - s[0][0]) * j / nn, s[0][1] + (s[1][1] - s[0][1]) * j / nn], dd = dichtst(RS[naar], pq), zz = zoneVan(pq);
          if (zz) { var ge = gemeld[zz] = gemeld[zz] || { lijnstukken: 0, lengtePx: 0, maxPx: 0, punt: null }; if (dd * PX8 > ge.maxPx) { ge.maxPx = dd * PX8; ge.punt = pq; } }
          else if (dd > m) { m = dd; plaats = pq; }
          if (j < nn) { var zm = zoneVan([s[0][0] + (s[1][0] - s[0][0]) * (j + 0.5) / nn, s[0][1] + (s[1][1] - s[0][1]) * (j + 0.5) / nn]); if (zm) { gemeld[zm] = gemeld[zm] || { lijnstukken: 0, lengtePx: 0, maxPx: 0, punt: null }; gemeld[zm].lengtePx += l * PX8 / nn; hier[zm] = 1; } else getoetstLen += l * PX8 / nn; }
        }
        Object.keys(hier).forEach(function(zk) { gemeld[zk].lijnstukken++; });
        return;
      }
      var st = buiten[buiten.length - 1];
      if (!st || laatste !== g.i - 1) { st = { lijnstukken: 0, lengtePx: 0, maxPx: 0, punt: null }; buiten.push(st); }
      laatste = g.i; st.lijnstukken++; st.lengtePx += l * PX8; if (vm * PX8 > st.maxPx) { st.maxPx = vm * PX8; st.punt = vp; }
    });
    buiten.sort(function(x, y) { return y.maxPx - x.maxPx; });
    var gs = Object.keys(gemeld).reduce(function(t, zk) { return t + gemeld[zk].lengtePx; }, 0);
    return { px: m * PX8, plaats: plaats, binnen: binnen, buiten: buiten, gemeld: gemeld, zoneLen: zoneLen, getoetstLen: getoetstLen, lengteKlopt: Math.abs(getoetstLen + gs - zoneLen) <= 1e-6 * Math.max(1, zoneLen) };
  }
  // M1 a: even-oneven (xor), zoals inVlak in de tikregel; gaten en enclaves blijven gaten
  // eigen opbouw met Clipper (gelijk-oneven, gehele honderdsten): per stuk de doorsnede; daarnaast het totaal via NL + BE - (NL u BE)
  function cp(rs) { return rs.map(function(r) { var o = []; for (var i = 0; i < r.length - 1; i++) o.push({ X: Math.round(r[i][0] * 100), Y: Math.round(r[i][1] * 100) }); return o; }); }
  function voer(type, a, b) {
    var c = new ClipperLib.Clipper(), t = new ClipperLib.PolyTree();
    c.AddPaths(cp(a), ClipperLib.PolyType.ptSubject, true); if (b) c.AddPaths(cp(b), ClipperLib.PolyType.ptClip, true);
    c.Execute(type, t, ClipperLib.PolyFillType.pftEvenOdd, ClipperLib.PolyFillType.pftEvenOdd);
    var vl2 = [];
    function rij(n) { n.Childs().forEach(function(k) { if (!k.IsHole()) { var p = [k.Contour()].concat(k.Childs().map(function(h) { return h.Contour(); })).map(function(pad) { var r = pad.map(function(q) { return [q.X / 100, q.Y / 100]; }); r.push(r[0]); return r; }); vl2.push(p); } rij(k); }); }
    rij(t); return vl2;
  }
  function oppVl(v) { return v.reduce(function(s, p) { return s + Math.abs(oppR(p[0])) - p.slice(1).reduce(function(t, h) { return t + Math.abs(oppR(h)); }, 0); }, 0); }
  var nlA = oppVl(voer(ClipperLib.ClipType.ctUnion, vl.NL)), beA = oppVl(voer(ClipperLib.ClipType.ctUnion, vl.BE)), uniV = voer(ClipperLib.ClipType.ctUnion, vl.NL, vl.BE);
  var ovTotaalIE = (nlA + beA - oppVl(uniV)) * PX8 * PX8;
  var ov = voer(ClipperLib.ClipType.ctIntersection, vl.NL, vl.BE).map(function(p) { return { px2: (Math.abs(oppR(p[0])) - p.slice(1).reduce(function(s, h) { return s + Math.abs(oppR(h)); }, 0)) * PX8 * PX8, lPx: lengte(p[0]) / 2 * PX8, p: p[0][0] }; });
  var gat = [], RN = rooster(stukken(vl.NL), 5), RB = rooster(stukken(vl.BE), 5);
  uniV.forEach(function(p) { p.slice(1).forEach(function(h) { if (h.some(function(q) { return dichtst(RN, q) < 1e-6; }) && h.some(function(q) { return dichtst(RB, q) < 1e-6; })) gat.push({ px2: Math.abs(oppR(h)) * PX8 * PX8, lPx: lengte(h) / 2 * PX8, p: h[0] }); }); });
  var grensPx = be.per.NL || 0;
  // N2 a: breedte per stuk alleen bij >= 0,01 px2; de kleinere stukken tellen mee en worden gemeld
  function samen(a) { var g = a.filter(function(x) { return x.px2 >= 0.01; }), k = a.filter(function(x) { return x.px2 < 0.01; }); return { stukken: a.length, totaalPx2: a.reduce(function(s, x) { return s + x.px2; }, 0), getoetst: g.length, breedstePx: g.reduce(function(m, x) { return Math.max(m, x.px2 / x.lPx); }, 0), breedsteInMeldzone: g.length ? zoneVan(g.reduce(function(b, x) { return x.px2 / x.lPx > b.px2 / b.lPx ? x : b; }).p) : null, kleinStukken: k.length, kleinPx2: k.reduce(function(s, x) { return s + x.px2; }, 0) }; }
  var r = { be: { per: be.per, somPx: be.somPx, totaalPx: be.totaalPx }, nl: { per: nl.per, somPx: nl.somPx, totaalPx: nl.totaalPx }, grensPx: grensPx, overlap: samen(ov), gaten: samen(gat), beNl: verst(be.grens, "NL", nl.klasse, "BE"), nlBe: verst(nl.grens, "BE", be.klasse, "NL") };
  var f = [];
  if (Math.abs(be.somPx - be.totaalPx) > 1e-6 * be.totaalPx || Math.abs(nl.somPx - nl.totaalPx) > 1e-6 * nl.totaalPx) f.push("de som van de klassen is niet de hele rand");
  r.overlapTotaalIE = ovTotaalIE;
  // Clipper rondt nieuwe snijpunten af op hele honderdsten, bij de vereniging anders dan bij de doorsnede; de twee wegen verschillen dus
  // licht. Deze controle vangt grove fouten: marge de grootste van 0,5 px2 en 2 procent.
  if (Math.abs(ovTotaalIE - r.overlap.totaalPx2) > Math.max(0.5, 0.02 * r.overlap.totaalPx2)) f.push("overlap: doorsnede en NL + BE - (NL u BE) verschillen (" + r.overlap.totaalPx2 + " tegen " + ovTotaalIE + ")");
  if (r.overlap.breedstePx > 0.5 || r.overlap.totaalPx2 > 0.5 * grensPx) f.push("overlap boven de eis");
  if (r.gaten.breedstePx > 0.5 || r.gaten.totaalPx2 > 0.5 * grensPx) f.push("gaten boven de eis");
  if (r.beNl.px + 0.05 > 0.5 || r.nlBe.px + 0.05 > 0.5) f.push("grootste grensafstand boven de eis");
  if (!r.beNl.lengteKlopt || !r.nlBe.lengteKlopt) f.push("getoetste en gemelde lengte samen zijn niet de lengte van de toetszone");
  r.fouten = f;
  return r;
}
// verschuif de BE-hoekpunten in het middelste derde van de grens met NL over dy eenheden (mutanten 6 en 7)
function verschuifBe(K, dy) {
  var kopie = JSON.parse(JSON.stringify(K)), L = kopie.lagen.filter(function(l) { return l.id === "landen"; })[0];
  var nlR = rooster(stukken(padRingen(L.items.filter(function(x) { return x.id === "NLD"; })[0].d)), 5);
  var be = L.items.filter(function(x) { return x.id === "BEL"; })[0], rs = padRingen(be.d);
  var aan = []; rs.forEach(function(r) { r.forEach(function(q) { if (dichtst(nlR, q) < 0.05) aan.push(q[0]); }); });
  aan.sort(function(a, b) { return a - b; });
  var x0 = aan[Math.floor(aan.length / 3)], x1 = aan[Math.floor(2 * aan.length / 3)], geteld = 0;
  rs = rs.map(function(r) { return r.map(function(q) { if (q[0] >= x0 && q[0] <= x1 && dichtst(nlR, q) < 0.05) { geteld++; return [q[0], q[1] + dy]; } return q; }); });
  be.d = rs.map(function(r) { var u = "M" + r[0][0] + "," + r[0][1] + "l"; for (var i = 1; i < r.length - 1; i++) u += (i > 1 ? " " : "") + (r[i][0] - r[i - 1][0]) + "," + (r[i][1] - r[i - 1][1]); return u + "Z"; }).join("");
  return { K: kopie, geteld: geteld };
}

var GEBOUWD = null;
async function bouw(ids) { return await MK.bouwAlles(PADEN, ids); }

if (DELEN.indexOf("inhoud") >= 0) {
  // 1. opnieuw bouwen: byte-gelijk met de bestanden (twee onafhankelijke runs)
  var t0 = Date.now();
  GEBOUWD = await bouw(IDS);
  console.log("bouw: " + Math.round((Date.now() - t0) / 1000) + " s");
  for (var i = 0; i < GEBOUWD.length; i++) {
    var u = GEBOUWD[i], id = u.cfg.id, op = fs.readFileSync(path.join(ROOT, "src/core/topo/kaarten", id + ".js"), "utf8");
    eis(op === u.tekst, id + ": de tweede run is byte-gelijk met het kaartbestand");
    var K = await laadBestand(id), cfg = cfgVan(id);
    controleer(K, cfg).forEach(function(f) { eis(false, id + ": " + f); }); n++;
    eis(cfg.tolerantiePx === TOL_PX[id] && cfg.afronding === AFRONDING[id], id + ": tolerantie en afronding volgens het plan");
    var v = meetVereenvoudiging(K, u.res.ruw);
    console.log(id + ": eigen meting vereenvoudiging " + (v.fout || (v.maxPx.toFixed(4) + " px bij x1 over " + v.punten + " hoekpunten, grootste bij " + v.waar)) + " (tolerantie " + TOL_PX[id] + "; script " + u.res.meting.maxAfwijkingPx + ")");
    eis(!v.fout && v.maxPx <= TOL_PX[id] + 1e-9, id + ": eigen meting van de vereenvoudiging binnen de tolerantie");
    var gz = zlib.gzipSync(Buffer.from(op), { level: 9 }).length;
    console.log(id + ": " + Buffer.byteLength(op) + " bytes, gzip " + gz + " (doel " + GZIP[id] + ")");
    if (gz > GZIP[id]) console.log(id + ": OMVANG BOVEN HET DOEL (" + gz + " > " + GZIP[id] + "): gemeld, met een voorstel in het rapport; geen fout (T2 par. 5, B11 a)");
    if (id === "nlbe") {
      var g = grens(K);
      console.log("grens NL-BE (eigen meting): " + JSON.stringify({ be: g.be, nl: g.nl, grensPx: g.grensPx, overlap: g.overlap, gaten: g.gaten, beNl: { px: g.beNl.px, binnen: g.beNl.binnen, buiten: g.beNl.buiten.length }, nlBe: { px: g.nlBe.px, binnen: g.nlBe.binnen, buiten: g.nlBe.buiten.length }, fouten: g.fouten }));
      eis(!g.fouten.length, "grens NL-BE: " + g.fouten.join("; "));
      var EP = eigenProjectie(cfg), s = MK.grensMeting(K, function(q) { return EP.invert(q); }, cfg.grensMelden);
      // V2: per meldzone en per stuk buiten de toetszone: aantal, lengte, grootste afstand en plaats
      function zelfde(a, b) { return Math.abs(a - b) <= 1e-6; }
      function plaatsVan(q) { return q ? EP.invert(q).map(function(v) { return Math.round(v * 100000) / 100000; }) : null; }
      ["BE", "NL"].forEach(function(k) {
        var sg = s.gemeldeZones[k], tg = (k === "BE" ? g.beNl : g.nlBe).gemeld, sb = s.buitenZone[k], tb = (k === "BE" ? g.beNl : g.nlBe).buiten;
        Object.keys(sg).concat(Object.keys(tg)).forEach(function(z) { var a = sg[z], b = tg[z]; eis(a && b && a.lijnstukken === b.lijnstukken && zelfde(a.lengtePx, b.lengtePx) && zelfde(a.maxPx, b.maxPx) && JSON.stringify(a.plaats) === JSON.stringify(plaatsVan(b.punt)), "grens NL-BE: meldzone " + z + " (" + k + ") gelijk in script en test"); });
        eis(sb.length === tb.length && sb.every(function(x, i) { return x.lijnstukken === tb[i].lijnstukken && zelfde(x.lengtePx, tb[i].lengtePx) && zelfde(x.maxPx, tb[i].maxPx); }), "grens NL-BE: stukken buiten de toetszone (" + k + ") gelijk in script en test");
      });
      eis(Math.abs(s.overlap.totaalPx2 - g.overlap.totaalPx2) < 1e-6 && Math.abs(s.gaten.totaalPx2 - g.gaten.totaalPx2) < 1e-6 && Math.abs(s.maxAfstand.beNaarNlPx - g.beNl.px) < 1e-6 && Math.abs(s.maxAfstand.nlNaarBePx - g.nlBe.px) < 1e-6 && s.buitenZone.BE.length === g.beNl.buiten.length && s.buitenZone.NL.length === g.nlBe.buiten.length && JSON.stringify(Object.keys(s.gemeldeZones.BE)) === JSON.stringify(Object.keys(g.beNl.gemeld)) && JSON.stringify(Object.keys(s.gemeldeZones.NL)) === JSON.stringify(Object.keys(g.nlBe.gemeld)), "grens NL-BE: script en test komen op hetzelfde uit (ook de toetszone en de meldzones)");
      var pr = geoTransverseMercator().rotate(cfg.projectie.rotate), rp = []; for (var a1 = 0; a1 <= 8; a1++) for (var b1 = 0; b1 <= 8; b1++) rp.push([cfg.lon[0] + (cfg.lon[1] - cfg.lon[0]) * a1 / 8, cfg.lat[0] + (cfg.lat[1] - cfg.lat[0]) * b1 / 8]);
      pr.fitWidth(1000, { type: "MultiPoint", coordinates: rp });
      [["BE", g.beNl], ["NL", g.nlBe]].forEach(function(z) { console.log("buiten de toetszone " + z[0] + ": " + z[1].buiten.length + " stukken; grootste 5: " + JSON.stringify(z[1].buiten.slice(0, 5).map(function(b) { return { lijnstukken: b.lijnstukken, lengtePx: +b.lengtePx.toFixed(2), maxPx: +b.maxPx.toFixed(2), plaats: pr.invert(b.punt).map(function(v) { return +v.toFixed(4); }) }; }))); });
    }
  }
  // 2. mutanten 1 tot en met 7, 7b en nlbe met 0,5 px
  var gevangen = 0, MUT = 0;
  async function bouwMet(id, wijzig) {
    var cfg = cfgVan(id); wijzig(cfg);
    var c = await MK.maakGedeeld(PADEN);
    return await MK.maakKaart(cfg, c.KB, c.B, c.gedeeld);
  }
  async function vangt(naam, f) { MUT++; var ok = false, hoe = ""; try { hoe = await f(); ok = !!hoe; } catch (e) { ok = true; hoe = "fout: " + e.message; } console.log("mutant " + naam + ": " + (ok ? "gevangen (" + hoe + ")" : "NIET gevangen")); if (ok) gevangen++; eis(ok, "mutant gevangen: " + naam); }
  var NLBE = await laadBestand("nlbe"), CFG = cfgVan("nlbe");
  await vangt("1 onbekende id", function() { return bouwMet("nlbe", function(c) { c.lagen[0].items.push("prov-nl-pv99"); }).then(function() { return ""; }); });
  await vangt("2 stad in provincies", function() { return bouwMet("nlbe", function(c) { c.lagen[0].items.push("stad-nl-utrecht"); }).then(function() { return ""; }); });
  await vangt("3 naam in een kaartitem", function() { var k = JSON.parse(JSON.stringify(NLBE)); k.lagen[0].items[0].naam = "Groningen"; return controleer(k, CFG).join("; "); });
  await vangt("4 Brussels Hoofdstedelijk Gewest als doel in provincies-be", function() { return bouwMet("nlbe", function(c) { c.lagen[1].items.push("gewest-be-04000"); }).then(function() { return ""; }); });
  await vangt("5 kaartVersie past niet", function() { var k = JSON.parse(JSON.stringify(NLBE)); k.kaartVersie = sha("x"); return controleer(k, CFG).join("; "); });
  var m6 = verschuifBe(NLBE, -0.3), g6 = grens(m6.K);
  await vangt("6 grens NL-BE verschoven over NL (" + m6.geteld + " hoekpunten, 0,95 px)", function() { return g6.fouten.join("; ") + "; overlap " + g6.overlap.totaalPx2.toFixed(1) + " px2"; });
  var m7 = verschuifBe(NLBE, 0.3), g7 = grens(m7.K);
  await vangt("7 gat in de grens NL-BE (" + m7.geteld + " hoekpunten, 0,95 px)", function() { return g7.fouten.filter(function(f) { return /gaten/.test(f); }).join("; ") && (g7.fouten.join("; ") + "; gaten " + g7.gaten.totaalPx2.toFixed(1) + " px2"); });
  // 7b: de lijnstukken van de kleinste ring van BE (een enclave bij Baarle) uit de indeling weggelaten
  var beRs = padRingen(NLBE.lagen.filter(function(l) { return l.id === "landen"; })[0].items.filter(function(x) { return x.id === "BEL"; })[0].d);
  var klein = beRs.slice().sort(function(a, b) { return Math.abs(oppR(a)) - Math.abs(oppR(b)); })[0], kleinSet = {};
  for (var q = 1; q < klein.length; q++) kleinSet[klein[q - 1].join(",") + ";" + klein[q].join(",")] = 1;
  console.log("7b: kleinste ring van BE bij (" + klein[0][0] + ", " + klein[0][1] + "), " + (klein.length - 1) + " lijnstukken");
  var g7b = grens(NLBE, function(s) { return kleinSet[s[0].join(",") + ";" + s[1].join(",")]; });
  await vangt("7b stuk grens bij Baarle weggelaten uit de indeling", function() { return g7b.fouten.filter(function(f) { return /som/.test(f); }).join("; "); });
  var r05 = await bouwMet("nlbe", function(c) { c.tolerantiePx = 0.5; });
  await vangt("nlbe met 0,5 px bij x1", function() {
    var v2 = meetVereenvoudiging(r05.kaart, r05.ruw), g2 = grens(r05.kaart), uit = [];
    if (v2.maxPx > TOL_PX.nlbe) uit.push("vereenvoudiging " + v2.maxPx.toFixed(4) + " px");
    if (g2.fouten.length) uit.push(g2.fouten.join("; "));
    return uit.join("; ");
  });
  console.log("mutanten inhoud: " + gevangen + "/" + MUT);
}

// ---- tikregel: rastervergelijking en tikmeting ----
async function kaarten() { var k = []; for (var i = 0; i < IDS.length; i++) k.push({ naam: IDS[i], K: await laadBestand(IDS[i]) }); return k; }
function beeldMidden(K, z, BREED) {
  var w = (K.beeld || K.breedte) / z, h = K.hoogte / z, c = [K.breedte / 2, K.hoogte / 2];
  var x = Math.min(Math.max(c[0] - w / 2, 0), K.breedte - w), y = Math.min(Math.max(c[1] - h / 2, 0), K.hoogte - h);
  return { x: x, y: y, w: w, h: h, s: BREED / w };
}
function uitTR(r) { if (r.uitkomst === "geen") return { id: "", k: [] }; var k = r.kandidaten.map(function(c) { return c.doel.id; }).sort(); return { id: r.uitkomst === "gekozen" ? r.doel.id : "?", k: r.uitkomst === "twijfel" ? k : [] }; }
function uitIND(r) { return { id: r.id, k: r.id === "?" ? r.kandidaten.slice().sort() : [] }; }
function vergelijk(KAARTEN, schermen, tr, ind) {
  var punten = 0, verschil = 0, voorbeeld = null;
  KAARTEN.forEach(function(kaart) {
    var K = kaart.K;
    K.lagen.forEach(function(laag) {
      var dTR = tr.maakDoelen(laag), dIND = ind.doelenVan(laag);
      schermen.forEach(function(scherm) {
        [1, 2, 4, 8].forEach(function(z) {
          var b = beeldMidden(K, z, scherm - 32), s = b.s, x0 = b.x * s, y0 = b.y * s, x1 = x0 + b.w * s, y1 = y0 + b.h * s;
          var rel = ind.relevant(dIND, s, x0, y0, x1, y1), ids = {};
          rel.forEach(function(d) { ids[d.id] = 1; });
          var relTR = dTR.filter(function(d) { return ids[d.id]; });
          for (var y = y0; y <= y1; y += 2) for (var x = x0; x <= x1; x += 2) {
            var a = uitTR(tr.beslis(relTR, s, x, y)), c = uitIND(ind.besluitMet(rel, s, x, y));
            punten++;
            if (a.id !== c.id || a.k.join(",") !== c.k.join(",")) { verschil++; if (!voorbeeld) voorbeeld = kaart.naam + " " + laag.id + " " + scherm + " x" + z + " (" + x.toFixed(1) + ", " + y.toFixed(1) + "): " + JSON.stringify(a) + " / " + JSON.stringify(c); }
          }
        });
      });
    });
  });
  return { punten: punten, verschil: verschil, voorbeeld: voorbeeld };
}
async function kopieMet(bron, naam, oud, nieuw, tmp) {
  var s = fs.readFileSync(bron, "utf8");
  if (s.split(oud).length !== 2) stop("mutant " + naam + ": de te wijzigen tekst komt niet precies een keer voor");
  var p = path.join(tmp, naam + ".mjs"); fs.writeFileSync(p, s.replace(oud, nieuw));
  return await import(pathToFileURL(p).href);
}
async function tik(schermen, hard) {
  var KAARTEN = await kaarten(), t0 = Date.now();
  var echt = vergelijk(KAARTEN, schermen, TR, IND);
  console.log("rastervergelijking " + schermen.join(",") + ": " + echt.punten + " rasterpunten, " + echt.verschil + " verschillen" + (echt.voorbeeld ? "; eerste: " + echt.voorbeeld : "") + " (" + Math.round((Date.now() - t0) / 1000) + " s)");
  eis(echt.punten > 0 && echt.verschil === 0, "0 verschillen tussen de twee tikregels op " + schermen.join(","));
  if (hard) {
    var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "kaart-mut-")), TRP = path.join(ROOT, "public/kaartproef/tikregel.js"), INP = path.join(HIER, "tik-onafhankelijk.mjs");
    var M = [
      ["8 tikregel met marge 0", await kopieMet(TRP, "tr-m0", "export var MARGE = 4;", "export var MARGE = 0;", tmp), IND],
      ["9 tikregel zonder ingesloten doel wint", await kopieMet(TRP, "tr-gi", "if (kleinste && k.every(", "if (false && kleinste && k.every(", tmp), IND],
      ["10 onafhankelijk met marge 0", TR, await kopieMet(INP, "ind-m0", "export var R = 22, A = Math.PI * R * R, MARGE = 4;", "export var R = 22, A = Math.PI * R * R, MARGE = 0;", tmp)]
    ];
    // de verschilmutanten bewijzen dat de vergelijking verschillen ziet; dat hangt niet af van het detail van de kaart (in T2a op alle
    // kaarten aangetoond). Op nlbe daarom alleen op de kleinere lagen (keuze Dick 19-11-2026, b); de echte vergelijking blijft volledig.
    var MUT_LAGEN = { nlbe: ["provincies-be", "steden", "rivieren", "waddeneilanden"] };
    var KMUT = KAARTEN.map(function(k) { var lijst = MUT_LAGEN[k.naam]; if (!lijst) return k; var K2 = Object.assign({}, k.K); K2.lagen = k.K.lagen.filter(function(l) { return lijst.indexOf(l.id) >= 0; }); return { naam: k.naam, K: K2 }; });
    console.log("verschilmutanten op: " + KMUT.map(function(k) { return k.naam + " (" + k.K.lagen.map(function(l) { return l.id; }).join(", ") + ")"; }).join("; "));
    M.forEach(function(m) { var u = vergelijk(KMUT, schermen, m[1], m[2]); console.log("mutant " + m[0] + ": " + u.verschil + " verschillen van " + u.punten); eis(u.verschil > 0, "mutant gevangen: " + m[0]); });
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  schermen.forEach(function(scherm) {
    var t1 = Date.now(), res = meetKaarten(KAARTEN, scherm, 0);
    fs.writeFileSync(path.join(WERK, "tik-kaarten-" + scherm + ".json"), JSON.stringify(res));
    var niet = res.filter(function(r) { return !["x1", "x2", "x4"].some(function(z) { return r.per[z].oordeel !== "fout"; }); });
    var perZoom = { x1: 0, x2: 0, x4: 0, x8: 0, nooit: 0 };
    res.forEach(function(r) { var z = ["x1", "x2", "x4", "x8"].filter(function(k) { return r.per[k].oordeel !== "fout"; })[0]; perZoom[z || "nooit"]++; });
    console.log("tikmeting " + scherm + " px: " + res.length + " doelen; eerst tikbaar bij " + JSON.stringify(perZoom) + "; niet binnen x4: " + (niet.map(function(r) { return r.kaart + " " + r.id + " " + JSON.stringify(r.per); }).join(" | ") || "geen") + " (" + Math.round((Date.now() - t1) / 1000) + " s)");
    if (hard) eis(!niet.length, scherm + " px: elk doel tikbaar binnen x4");
  });
}
if (DELEN.indexOf("tik428") >= 0) await tik([428], true);
// tikrest: alleen gemeld; met SCHERMEN (bijvoorbeeld SCHERMEN=320) een deel van de breedtes
if (DELEN.indexOf("tikrest") >= 0) await tik((process.env.SCHERMEN || "320,375,390").split(",").map(Number), false);

console.log("test-kaarten (" + DELEN.join(",") + "): " + (n - fouten.length) + "/" + n + " controles goed");
if (fouten.length) { console.log("FOUTEN:\n- " + fouten.join("\n- ")); process.exit(1); }
