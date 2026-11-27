// Van bron naar zee, deel 1: stroomt-door, Nederlandse rivier -> Nederlandse provincie (plan T5c, B1 b; nb16). Alleen bouwomgeving.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node --max-old-space-size=8000 maak-stroomt-door-nl.mjs <nwb-vaarwegen-t5b3.json> <INSPIRESurfaceWaterBody.gml>
//          <top10nl-waterdeel-t5b2.json> <cbsgebiedsindelingen2026.gpkg> [uitmap]   (standaard: src/core/topo)
// De regel:
// - de vorm van elke rivier zoals in maak-water-steden-nl.mjs (vormen: NWB voor de 6 grote rivieren, anders de GEOREF; RD);
// - de provincies: CBS Gebiedsindelingen 2026, provincie_gegeneraliseerd (RD);
// - een lijn: monsters elke 25 m (het midden van elk stukje), per provincie de lengte; een vlak: een raster van 50 m binnen het vlak,
//   per provincie de oppervlakte; het aandeel is ten opzichte van wat in een Nederlandse provincie ligt;
// - stroomt door bij een aandeel van minstens DREMPEL (10 %); tussen TWIJFEL (1 %) en DREMPEL een twijfelpaar (geen relatie; nooit
//   als fout antwoord of foute keuze);
// - schrijft afgeleid/stroomt-door-nl.js; twee keer draaien geeft een byte-gelijk bestand.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { vormen } from "./maak-water-steden-nl.mjs";
import { openBron } from "./bronnen/bron.mjs";
import { leesGpkg, leesGeometrie } from "./bronnen/lees-gpkg.mjs";
import { binnenVlak } from "./vlakpunt.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HIER, "..", "..");
var BRONNEN = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8")), GEB = BRONNEN.cbsGebiedsindelingen2026;
var SCRIPT = "tools/topo/maak-stroomt-door-nl.mjs";
export var DREMPEL = 0.10, TWIJFEL = 0.01;
function fout(t) { throw new Error(t); }

export async function aandelen(paden) {
  var V = await vormen(paden);
  var g = openBron(paden.gpkg, "CBSGEB", GEB.gpkg.bestand);
  if (g.sha256 !== GEB.gpkg.sha256) fout("SHA-256 van het CBS-bestand wijkt af");
  var P = await leesGpkg(g.buf, "provincie_gegeneraliseerd", ["statcode", "statnaam"], "geom", "statcode");
  if (P.records.length !== 12) fout("niet 12 provincies");
  var prov = P.records.map(function(r) { var d = leesGeometrie(r.geom), b = [Infinity, Infinity, -Infinity, -Infinity]; d.forEach(function(p) { p[0].forEach(function(c) { b[0] = Math.min(b[0], c[0]); b[1] = Math.min(b[1], c[1]); b[2] = Math.max(b[2], c[0]); b[3] = Math.max(b[3], c[1]); }); }); return { id: "prov-nl-" + r.kenmerken.statcode.toLowerCase(), d: d, b: b }; });
  function welke(q) { for (var i = 0; i < prov.length; i++) { var p = prov[i]; if (q[0] < p.b[0] || q[0] > p.b[2] || q[1] < p.b[1] || q[1] > p.b[3]) continue; if (p.d.some(function(x) { return binnenVlak(q, x); })) return p.id; } return null; }
  var uit = {};
  Object.keys(V.vormen).sort().forEach(function(rid) {
    var v = V.vormen[rid], tel = {};
    function tik(q, w) { var p = welke(q); if (p) tel[p] = (tel[p] || 0) + w; }
    v.lijnen.forEach(function(l) { for (var i = 0; i + 1 < l.length; i++) { var a = l[i], b = l[i + 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.round(d / 25)); for (var j = 0; j < k; j++) tik([a[0] + (b[0] - a[0]) * (j + 0.5) / k, a[1] + (b[1] - a[1]) * (j + 0.5) / k], d / k); } });
    v.vlakken.forEach(function(dl) { var b = [Infinity, Infinity, -Infinity, -Infinity]; dl[0].forEach(function(c) { b[0] = Math.min(b[0], c[0]); b[1] = Math.min(b[1], c[1]); b[2] = Math.max(b[2], c[0]); b[3] = Math.max(b[3], c[1]); }); for (var x = Math.floor(b[0] / 50) * 50 + 25; x < b[2]; x += 50) for (var y = Math.floor(b[1] / 50) * 50 + 25; y < b[3]; y += 50) if (binnenVlak([x, y], dl)) tik([x, y], 2500); });
    var som = Object.keys(tel).reduce(function(a, k) { return a + tel[k]; }, 0);
    if (!(som > 0)) fout("rivier buiten de provincies: " + rid);
    uit[rid] = {}; Object.keys(tel).sort().forEach(function(k) { uit[rid][k] = tel[k] / som; });
  });
  return { V: V, aandelen: uit, cbsSha: g.sha256 };
}

export async function bouw(paden) {
  var A = await aandelen(paden), REL = [], TW = [];
  Object.keys(A.aandelen).sort().forEach(function(rid) {
    Object.keys(A.aandelen[rid]).sort().forEach(function(p) {
      var a = A.aandelen[rid][p];
      if (a >= DREMPEL) REL.push({ type: "stroomt-door", van: rid, naar: p, kwalificaties: {}, herkomst: "afgeleid", status: "vastgesteld",
        afleiding: { script: SCRIPT, regel: "minstens 10 % van de rivier (lengte, of bij een vlak de oppervlakte) ligt in deze provincie (CBS provincie_gegeneraliseerd, RD); tussen 1 en 10 % twijfel", invoer: A.V.invoer[rid].concat([{ bronId: "CBSGEB", sha256: A.cbsSha }]) } });
      else if (a > TWIJFEL) TW.push({ type: "stroomt-door", van: rid, naar: p });
    });
  });
  return { REL: REL, TWIJFEL: TW, AANDELEN: A.aandelen };
}

export function schrijf(uit, r) {
  fs.mkdirSync(path.join(uit, "afgeleid"), { recursive: true });
  fs.writeFileSync(path.join(uit, "afgeleid", "stroomt-door-nl.js"), "// GEGENEREERD door " + SCRIPT + "; niet met de hand bewerken.\n" +
    "// Van bron naar zee (plan T5c, B1 b; nb16): stroomt-door (Nederlandse rivier -> provincie) en de twijfelparen (geen relatie; nooit als fout antwoord of foute keuze).\n" +
    "// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.\n" +
    "export var STROOMT_DOOR_NL = " + JSON.stringify(r.REL) + ";\n" +
    "export var STROOMT_DOOR_TWIJFEL_NL = " + JSON.stringify(r.TWIJFEL) + ";\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  var r = await bouw({ nwb: process.argv[2], krw: process.argv[3], top10: process.argv[4], gpkg: process.argv[5] });
  schrijf(process.argv[6] || path.join(ROOT, "src/core/topo"), r);
  Object.keys(r.AANDELEN).forEach(function(rid) { console.log(rid + ": " + Object.keys(r.AANDELEN[rid]).map(function(p) { return p + " " + (100 * r.AANDELEN[rid][p]).toFixed(1); }).join(", ")); });
  console.log("stroomt-door: " + r.REL.length + ", twijfel: " + r.TWIJFEL.map(function(x) { return x.van + " " + x.naar; }).join(", "));
}
