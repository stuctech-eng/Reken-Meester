// Steden aan het water: ligt-aan, Nederlandse stad -> rivier (plan T5c, B3; nb17). Alleen bouwomgeving.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node --max-old-space-size=6000 maak-water-steden-nl.mjs <nwb-vaarwegen-t5b3.json> <INSPIRESurfaceWaterBody.gml>
//          <top10nl-waterdeel-t5b2.json> <CBS_bevolkingskernen_2021.gpkg> [uitmap]   (standaard: src/core/topo)
// De regel (water-steden-nl.json, SHA-256 in het register):
// - de steden: de Nederlandse steden van de kennisbank, zonder IJmond (geen woonplaats); hun bebouwing is het vlak van hun
//   CBS-bevolkingskern (de GEOREF van het item, RD);
// - de rivieren: de 17 Nederlandse rivieren met een vorm. Voor de 6 grote rivieren de vaarwegvakken van NWB Vaarwegen met de namen
//   uit de tabel (besluit); voor de andere de GEOREF van het item: KRW (lijn of vlak, met deelGebied via krwVorm) of TOP10NL (vlak);
// - de afstand in RD (lon/lat naar EPSG:28992 met proj4) tussen de rivier en de bebouwing: 0 als ze elkaar snijden of de een in de
//   ander ligt, anders de kleinste afstand tussen hun randen;
// - ligt-aan bij hoogstens ligtAanM; tussen ligtAanM en twijfelM een twijfelpaar (geen relatie; de sjablonen gebruiken het paar
//   nooit als fout antwoord of foute keuze);
// - schrijft afgeleid/water-steden-nl.js; twee keer draaien geeft een byte-gelijk bestand.

import fs from "fs";
import path from "path";
import proj4 from "proj4";
import { fileURLToPath, pathToFileURL } from "url";
import { openBron, CRS } from "./bronnen/bron.mjs";
import { openKrw, openTop10, krwVorm } from "./maak-water-nl.mjs";
import { openNwb } from "./maak-kanalen-nl.mjs";
import { leesKernen } from "./maak-steden-nl.mjs";
import { leesGeometrie } from "./bronnen/lees-gpkg.mjs";
import { binnenVlak, afstandTotLijnstuk } from "./vlakpunt.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HIER, "..", "..");
var BRONNEN = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8")), REG = BRONNEN.register.ids;
var SCRIPT = "tools/topo/maak-water-steden-nl.mjs";
function fout(t) { throw new Error(t); }
var naarRd = proj4("EPSG:4326", CRS["EPSG:28992"]);
function rd(c) { return naarRd.forward([c[0], c[1]]); }

// de vorm van een rivier in RD: { lijnen: [[[x,y],...]], vlakken: [ [ring, ring...] ] }
export async function vormen(paden) {
  var tab = openBron(path.join(HIER, "water-steden-nl.json"), "tabellenNlbe", "tools/topo/water-steden-nl.json");
  if (REG.tabellenNlbe.bestanden["tools/topo/water-steden-nl.json"] !== tab.sha256) fout("SHA-256 van water-steden-nl.json wijkt af van het register");
  var T = JSON.parse(tab.buf.toString("utf8"));
  var nwb = openNwb(paden.nwb), krw = null, top10 = null;
  var W = (await import(pathToFileURL(path.join(ROOT, "src/core/topo/items/water-nlbe.js")).href)).WATER_NLBE;
  var WNL = (await import(pathToFileURL(path.join(ROOT, "src/core/topo/items/water-nl.js")).href)).WATER_NL;
  var rivieren = W.concat(WNL).filter(function(w) { return w.soort === "rivier" && /^rivier-/.test(w.id) && !/^rivier-be-/.test(w.id); });
  var uit = {}, invoer = {};
  rivieren.forEach(function(w) {
    var v = { lijnen: [], vlakken: [] };
    if (T.nwb[w.id]) {
      var namen = T.nwb[w.id], n = 0;
      Object.keys(nwb.per).forEach(function(k) {
        var r = nwb.per[k]; if (namen.indexOf(r.kenmerken.vwg_naam) < 0) return; n++;
        var g = r.geometrie; (g.type === "LineString" ? [g.coordinates] : g.coordinates).forEach(function(l) { v.lijnen.push(l.map(rd)); });
      });
      if (!n) fout("NWB: geen vakken voor " + w.id);
      invoer[w.id] = [{ bronId: "NWB", sha256: nwb.sha }];
    } else {
      var gk = w.geometrie.bron;
      if (!gk || !gk.waarden) fout("geen vorm voor " + w.id);
      if (gk.bronId === "KRW") {
        krw = krw || openKrw(paden.krw);
        if (gk.sha256 !== krw.sha) fout("KRW-SHA van " + w.id);
        var kv = krwVorm(krw, gk);
        if (kv.soort === "lijn") kv.delen.forEach(function(l) { v.lijnen.push(l.map(rd)); });
        else kv.delen.forEach(function(d) { v.vlakken.push(d.map(function(ring) { return ring.map(rd); })); });
        invoer[w.id] = [{ bronId: "KRW", sha256: krw.sha }];
      } else if (gk.bronId === "TOP10") {
        top10 = top10 || openTop10(paden.top10);
        if (gk.sha256 !== top10.sha) fout("TOP10-SHA van " + w.id);
        gk.waarden.forEach(function(k) { (top10.per[k] || fout("TOP10: geen " + k)).delen.forEach(function(d) { v.vlakken.push(d.map(function(ring) { return ring.map(rd); })); }); });
        invoer[w.id] = [{ bronId: "TOP10", sha256: top10.sha }];
      } else fout("onbekende bron voor " + w.id);
    }
    uit[w.id] = v;
  });
  return { T: T, tabSha: tab.sha256, vormen: uit, invoer: invoer };
}

// lijnstukken en vlakken van een vorm, met hun omhullende
function stukken(v) {
  var s = [];
  v.lijnen.forEach(function(l) { for (var i = 0; i + 1 < l.length; i++) s.push([l[i], l[i + 1]]); });
  v.vlakken.forEach(function(d) { d.forEach(function(r) { for (var i = 0; i + 1 < r.length; i++) s.push([r[i], r[i + 1]]); }); });
  return s;
}
function box(s) { var b = [Infinity, Infinity, -Infinity, -Infinity]; s.forEach(function(x) { x.forEach(function(p) { b[0] = Math.min(b[0], p[0]); b[1] = Math.min(b[1], p[1]); b[2] = Math.max(b[2], p[0]); b[3] = Math.max(b[3], p[1]); }); }); return b; }
function snijden(a, b) {
  function o(p, q, r) { var v = (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]); return v > 0 ? 1 : v < 0 ? -1 : 0; }
  return o(a[0], a[1], b[0]) !== o(a[0], a[1], b[1]) && o(b[0], b[1], a[0]) !== o(b[0], b[1], a[1]);
}
// de kleinste afstand tussen twee vormen (a: rivier, b: bebouwing); 0 bij snijden of erin liggen
export function afstand(a, b) {
  var sa = stukken(a), sb = stukken(b), ba = box(sa), bb = box(sb);
  if (sa.some(function(x) { return b.vlakken.some(function(d) { return binnenVlak(x[0], d); }); })) return 0;
  if (sb.some(function(x) { return a.vlakken.some(function(d) { return binnenVlak(x[0], d); }); })) return 0;
  var m = Math.max(ba[0] - bb[2], bb[0] - ba[2], ba[1] - bb[3], bb[1] - ba[3], 0);
  if (m > 20000) return m;
  var best = Infinity;
  sa.forEach(function(x) {
    sb.forEach(function(y) {
      if (best === 0) return;
      if (snijden(x, y)) { best = 0; return; }
      best = Math.min(best, afstandTotLijnstuk(x[0], y[0], y[1]), afstandTotLijnstuk(x[1], y[0], y[1]), afstandTotLijnstuk(y[0], x[0], x[1]), afstandTotLijnstuk(y[1], x[0], x[1]));
    });
  });
  return best;
}

export async function bouw(paden) {
  var V = await vormen(paden), T = V.T;
  var S = (await import(pathToFileURL(path.join(ROOT, "src/core/topo/items/steden-nl.js")).href)).STEDEN;
  var K = await leesKernen(paden.kernen), kern = {};
  (K.kernen || K).forEach(function(k) { kern[k.kernnummer] = k; });
  var steden = S.filter(function(s) { return s.id !== "stad-nl-ijmond"; });
  var REL = [], TWIJFEL = [], METING = [];
  steden.forEach(function(s) {
    var gk = s.geometrie.bron;
    if (!gk || gk.bronId !== "CBS" || !kern[gk.waarde]) fout("geen CBS-kern voor " + s.id);
    var bebouwing = { lijnen: [], vlakken: leesGeometrie(kern[gk.waarde].geom) };
    Object.keys(V.vormen).sort().forEach(function(rid) {
      var d = afstand(V.vormen[rid], bebouwing);
      if (d <= T.regels.twijfelM) METING.push(s.id + " " + rid + " " + Math.round(d));
      if (d <= T.regels.ligtAanM) REL.push({ type: "ligt-aan", van: s.id, naar: rid, kwalificaties: {}, herkomst: "afgeleid", status: "vastgesteld",
        afleiding: { script: SCRIPT, regel: "de rivier (" + (T.nwb[rid] ? "NWB Vaarwegen: " + T.nwb[rid].join(", ") : "de GEOREF van het item") + ") ligt binnen " + T.regels.ligtAanM + " m van de bebouwing van de stad (het vlak van de CBS-bevolkingskern, RD)", invoer: V.invoer[rid].concat([{ bronId: "CBS", sha256: gk.sha256 }, { bronId: "tabellenNlbe", sha256: V.tabSha }]) } });
      else if (d <= T.regels.twijfelM) TWIJFEL.push({ type: "ligt-aan", van: s.id, naar: rid });
    });
  });
  return { REL: REL, TWIJFEL: TWIJFEL, METING: METING };
}

export function schrijf(uit, r) {
  fs.mkdirSync(path.join(uit, "afgeleid"), { recursive: true });
  fs.writeFileSync(path.join(uit, "afgeleid", "water-steden-nl.js"), "// GEGENEREERD door " + SCRIPT + "; niet met de hand bewerken.\n" +
    "// Steden aan het water (plan T5c, B3; nb17): ligt-aan (stad -> rivier) en de twijfelparen (geen relatie; nooit als fout antwoord of foute keuze).\n" +
    "// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.\n" +
    "export var WATER_STEDEN_NL = " + JSON.stringify(r.REL) + ";\n" +
    "export var WATER_TWIJFEL_NL = " + JSON.stringify(r.TWIJFEL) + ";\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  var r = await bouw({ nwb: process.argv[2], krw: process.argv[3], top10: process.argv[4], kernen: process.argv[5] });
  schrijf(process.argv[6] || path.join(ROOT, "src/core/topo"), r);
  console.log(r.METING.join("\n"));
  console.log("ligt-aan: " + r.REL.length + ", twijfel: " + r.TWIJFEL.length);
}
