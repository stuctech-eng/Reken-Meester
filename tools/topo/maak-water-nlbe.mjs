// Water voor Basis: de Noordzee en de 6 grote rivieren (bouwplan T2b-2 fase 6.2 deel 2, versie 2). Alleen bouwomgeving.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node maak-water-nlbe.mjs <map met de Natural Earth-bestanden> <uitvoermap>
// - de Noordzee: het NE-vlak North Sea min het land van NE admin-0 (polygon-clipping); het vlak komt niet in de repository,
//   alleen de GEOREF met de afleiding. De oppervlakte wordt gemeten in EPSG:3035 (ETRS89-LAEA, oppervlaktegetrouw);
// - de rivieren: per item precies de NE-features met de afgesproken naam (dezelfde keuze als de T2a-proef);
// - geen Waddenzee en geen Westerschelde (K7 B, K5 A); namen uit de Taalunie of als besluit (D1);
// - schrijft items/water-nlbe.js; twee keer draaien geeft een byte-gelijk bestand.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import proj4 from "proj4";
import pc from "polygon-clipping";
import { openBron } from "./bronnen/bron.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var SCRIPT = "tools/topo/maak-water-nlbe.mjs";
var BRONNEN = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8"));
var NEB = BRONNEN.naturalEarth.bestanden, MAR = BRONNEN.naturalEarthMarine;
var LAND = "ne_10m_admin_0_map_units.geojson", RIV = "ne_10m_rivers_lake_centerlines.geojson";
// EPSG:3035 (ETRS89-LAEA Europe): oppervlaktegetrouw, voor oppervlakten in m2 (bouwplan deel 2 v2, par. 7)
export var LAEA = "+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";
var naarLaea = proj4("EPSG:4326", LAEA);

function fout(t) { throw new Error(t); }
function multi(g) { return g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : fout("geen vlak: " + g.type); }
function bbox(m) { var b = [Infinity, Infinity, -Infinity, -Infinity]; m.forEach(function(p) { p[0].forEach(function(c) { b[0] = Math.min(b[0], c[0]); b[1] = Math.min(b[1], c[1]); b[2] = Math.max(b[2], c[0]); b[3] = Math.max(b[3], c[1]); }); }); return b; }
function raakt(a, b) { return a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3]; }
function oppRingM2(r) { var p = r.map(function(c) { return naarLaea.forward(c); }), s = 0; for (var i = 0; i < p.length - 1; i++) s += p[i][0] * p[i + 1][1] - p[i + 1][0] * p[i][1]; return Math.abs(s / 2); }
// oppervlakte van een multivlak in m2, gemeten in EPSG:3035
export function oppM2(m) { var s = 0; m.forEach(function(p) { p.forEach(function(r, i) { s += i === 0 ? oppRingM2(r) : -oppRingM2(r); }); }); return s; }
function rond(v) { return Math.round(v * 1e5) / 1e5; }

// het afgeleide watervlak van de Noordzee: het NE-vlak min al het land van admin-0 dat de omhullende raakt
export function noordzeeVlak(marineBuf, landBuf, neId) {
  var zee = JSON.parse(marineBuf.toString("utf8")).features.filter(function(f) { return f.properties.ne_id === neId; });
  if (zee.length !== 1) fout("NE: niet precies een vlak met ne_id " + neId);
  var z = multi(zee[0].geometry), bz = bbox(z);
  var land = JSON.parse(landBuf.toString("utf8")).features.map(function(f) { return multi(f.geometry); }).filter(function(m) { return raakt(bbox(m), bz); });
  if (!land.length) fout("NE: geen land bij de Noordzee");
  return { ne: zee[0], ruw: z, land: land, vlak: pc.difference.apply(null, [z].concat(land)) };
}

export function bouw(neMap) {
  var marBron = openBron(path.join(neMap, MAR.bestand), "NE", MAR.bestand);
  if (marBron.sha256 !== MAR.sha256) fout("SHA-256 van het marinebestand wijkt af van naturalEarthMarine");
  var landBron = openBron(path.join(neMap, LAND), "NE", LAND), rivBron = openBron(path.join(neMap, RIV), "NE", RIV);
  if (landBron.sha256 !== NEB[LAND] || rivBron.sha256 !== NEB[RIV]) fout("SHA-256 van NE wijkt af van naturalEarth");
  var tabBron = openBron(path.join(HIER, "water-nlbe.json"), "tabellenNlbe", "tools/topo/water-nlbe.json");
  var T = JSON.parse(tabBron.buf.toString("utf8"));
  function naam(t) {
    if (t.naambron === "TU") return { waarde: t.naam, varianten: [], herkomst: "bron", status: "vastgesteld", bron: { id: "TU", url: T.naamTU.url, tabel: T.naamTU.tabel, geraadpleegd: T.geraadpleegd } };
    if (t.naambron === "besluit") return { waarde: t.naam, varianten: [], herkomst: "besluit", status: "vastgesteld", besluit: T.naamBesluit };
    return fout("onbekende naambron: " + t.naambron);
  }
  var ITEMS = [];
  // ---- de Noordzee ----
  var zid = "zee-noordzee", zt = T.zeeen[zid];
  if (Object.keys(T.zeeen).join() !== zid) fout("alleen de Noordzee (K7 B)");
  var nz = noordzeeVlak(marBron.buf, landBron.buf, zt.neId);
  if (nz.ne.properties.name !== zt.neNaam) fout("NE: ne_id " + zt.neId + " is niet " + zt.neNaam);
  var opp = oppM2(nz.vlak), doorsnede = oppM2(pc.intersection.apply(null, [nz.vlak].concat([pc.union.apply(null, nz.land)])));
  if (!(opp > 0)) fout("het Noordzeevlak is leeg");
  if (doorsnede >= 1) fout("het Noordzeevlak bevat land: " + doorsnede + " m2");
  ITEMS.push({
    id: zid, soort: "zee", naam: naam(zt), feiten: {},
    geometrie: { bron: { bronId: "NE", bestand: MAR.bestand, sha256: MAR.sha256, sleutel: "ne_id", waarde: zt.neId, crs: "EPSG:4326",
      afleiding: { script: SCRIPT, invoer: [{ bronId: "NE", sha256: MAR.sha256 }, { bronId: "NE", sha256: NEB[LAND] }], regel: "het NE-vlak " + zt.neNaam + " min het land van NE admin-0 map units dat de omhullende raakt (" + nz.land.length + " eenheden), met polygon-clipping 0.15.7; oppervlakte gemeten in EPSG:3035" } }, kaart: {} },
    aanwijzen: zt.aanwijzen,
    relaties: []
  });
  // ---- de rivieren ----
  var rivieren = JSON.parse(rivBron.buf.toString("utf8")).features;
  Object.keys(T.rivieren).forEach(function(id) {
    var t = T.rivieren[id], fs2 = rivieren.filter(function(f) { return f.properties.name === t.neNaam; });
    if (fs2.length !== t.features) fout("NE: " + t.neNaam + " heeft " + fs2.length + " features, verwacht " + t.features);
    var b = [Infinity, Infinity, -Infinity, -Infinity];
    fs2.forEach(function(f) { var g = f.geometry, lijnen = g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" ? g.coordinates : fout("geen lijn: " + t.neNaam); lijnen.forEach(function(l) { l.forEach(function(c) { b[0] = Math.min(b[0], c[0]); b[1] = Math.min(b[1], c[1]); b[2] = Math.max(b[2], c[0]); b[3] = Math.max(b[3], c[1]); }); }); });
    ITEMS.push({ id: id, soort: "rivier", naam: naam(t), feiten: {}, geometrie: { bron: { bronId: "NE", bestand: RIV, sha256: NEB[RIV], sleutel: "name", waarde: t.neNaam, features: t.features, omhullende: b.map(rond), crs: "EPSG:4326" }, kaart: {} }, relaties: [] });
  });
  if (ITEMS.some(function(it) { return /wadden|schelde/i.test(it.id + it.naam.waarde); })) fout("Waddenzee of Westerschelde in deel 2");
  var AFW = [
    { id: "nlbe-w1-noordzee-waddenzee", soort: "geometrie", tekst: zt.aanwijzen.reden + ". Gemeten: het NE-vlak North Sea omvat het water bij Lauwersoog en voor de Groninger kust; het NE-vlak Waddenzee houdt op bij lengte 6,09 (bouwplan v2 par. 7)" },
    { id: "nlbe-w2-ne-rivieren", soort: "geometrie", tekst: "W2, geconstateerd en nog nader te onderzoeken: Natural Earth knipt de rivieren anders dan de Nederlandse indeling; het stuk Rhine loopt tot lengte 4,99 (bij Gorinchem), het stuk Waal begint daar. Vastgesteld in de brondata (omhullende), nog niet op een kaart nagekeken; aandachtspunt voor 6.3 en 6.4" },
    { id: "nlbe-namen-woordenlijst", soort: "naam", tekst: "D1 b: Waal, Nederrijn, Lek, IJssel, Maas en Waddeneilanden staan niet bij de Taalunie (die noemt alleen exoniemen) en hebben de naam als besluit (T1 par. 2.1); de Woordenlijst was niet toegankelijk vanuit de bouwomgeving, dus niet vastgesteld of ze daar staan. Rijn en Noordzee: Taalunie, Overige namen (Europa)" }
  ];
  return { ITEMS: ITEMS, AFW: AFW, meting: { oppKm2: opp / 1e6, doorsnedeM2: doorsnede, landEenheden: nz.land.length } };
}

function regel(naam, waarde) { return "export var " + naam + " = " + JSON.stringify(waarde) + ";\n"; }
export function schrijf(uit, r) {
  fs.mkdirSync(path.join(uit, "items"), { recursive: true });
  fs.writeFileSync(path.join(uit, "items", "water-nlbe.js"), "// GEGENEREERD door tools/topo/maak-water-nlbe.mjs uit Natural Earth v5.1.2 (SHA-256 in tools/topo/bronnen.json) en tools/topo/water-nlbe.json; niet met de hand bewerken.\n// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.\n" + regel("WATER_NLBE", r.ITEMS) + "// punten voor de open lijst (src/core/topo/open-vragen.md)\n" + regel("AFWIJKINGEN_WATER", r.AFW));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  var r = bouw(process.argv[2]);
  schrijf(process.argv[3], r);
  console.log(JSON.stringify({ items: r.ITEMS.map(function(x) { return x.id; }), meting: r.meting }));
}
