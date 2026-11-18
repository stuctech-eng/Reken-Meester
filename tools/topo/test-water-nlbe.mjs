// Tests voor het water van Basis: de Noordzee en de 6 grote rivieren (bouwplan T2b-2 fase 6.2 deel 2, versie 2).
// Alleen bouwomgeving, niet in de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node --max-old-space-size=6000 test-water-nlbe.mjs <map met de Natural Earth-bestanden>
// Alle geometrische controles zijn EXACT (geen steekproef): de doorsnede van het Noordzeevlak met het land wordt berekend
// met polygon-clipping en de oppervlakte in EPSG:3035 (oppervlaktegetrouw) gemeten; de rivieren worden opnieuw geteld.

import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";
import pc from "polygon-clipping";
import { noordzeeVlak, oppM2 } from "./maak-water-nlbe.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var ROOT = path.resolve(HIER, "..", "..");
var NE = process.argv[2];
var BRONNEN = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8"));
var T = JSON.parse(fs.readFileSync(path.join(HIER, "water-nlbe.json"), "utf8"));
var W = await import(pathToFileURL(path.join(ROOT, "src/core/topo/items/water-nlbe.js")).href);
var STATUSSEN = ["onderzocht", "bevestigd verschil", "nog onbeslist", "gecorrigeerd"];
var REG = BRONNEN.register.ids;
function kopie(x) { return JSON.parse(JSON.stringify(x)); }

var marBuf = fs.readFileSync(path.join(NE, BRONNEN.naturalEarthMarine.bestand));
var landBuf = fs.readFileSync(path.join(NE, "ne_10m_admin_0_map_units.geojson"));
var RIVF = JSON.parse(fs.readFileSync(path.join(NE, "ne_10m_rivers_lake_centerlines.geojson"), "utf8")).features;
var NZ = noordzeeVlak(marBuf, landBuf, T.zeeen["zee-noordzee"].neId);
var LANDU = pc.union.apply(null, NZ.land);
function meet(vlak) { return { opp: oppM2(vlak), doorsnede: oppM2(pc.intersection(vlak, LANDU)) }; }
var METING = meet(NZ.vlak);

function controleer(c) {
  var fouten = [], n = 0;
  function eis(ok, groep, tekst) { n++; if (!ok) fouten.push({ groep: groep, tekst: tekst }); }
  var ids = c.items.map(function(x) { return x.id; });
  eis(ids.join() === ["zee-noordzee"].concat(Object.keys(T.rivieren)).join(), "aantallen", "precies de Noordzee en de 6 rivieren (" + ids.join(", ") + ")");
  eis(!c.items.some(function(x) { return /wadden/i.test(x.id + " " + x.naam.waarde); }), "waddenzee", "geen Waddenzee in deel 2 (K7 B)");
  eis(!c.items.some(function(x) { return /schelde/i.test(x.id + " " + x.naam.waarde); }), "westerschelde", "geen Westerschelde in deel 2 (K5 A)");
  c.items.forEach(function(x) {
    var t = x.soort === "zee" ? T.zeeen[x.id] : T.rivieren[x.id];
    if (!t) return;
    var nm = x.naam;
    if (t.naambron === "TU") eis(nm.waarde === t.naam && nm.herkomst === "bron" && nm.bron.id === "TU" && nm.bron.url === T.naamTU.url, "namen", "naam uit de Taalunie (Overige namen): " + x.id);
    else eis(nm.waarde === t.naam && nm.herkomst === "besluit" && nm.besluit === T.naamBesluit && nm.bron === undefined, "namen", "naam als besluit (D1 b), zonder bron: " + x.id);
    eis(!(nm.bron && nm.bron.id === "NE"), "namen", "NE is geen naambron: " + x.id);
    var g = x.geometrie.bron;
    eis(!!REG[g.bronId] && REG[g.bronId].bestanden[g.bestand] === g.sha256, "georef", "GEOREF in het register met dezelfde SHA: " + x.id);
  });
  // ---- de Noordzee ----
  var z = c.items.filter(function(x) { return x.id === "zee-noordzee"; })[0];
  if (z) {
    var g = z.geometrie.bron;
    eis(z.soort === "zee" && g.sleutel === "ne_id" && g.waarde === T.zeeen["zee-noordzee"].neId && g.bestand === BRONNEN.naturalEarthMarine.bestand, "noordzee", "GEOREF naar het NE-vlak North Sea");
    eis(!!g.afleiding && g.afleiding.invoer.map(function(i) { return i.sha256; }).join() === [BRONNEN.naturalEarthMarine.sha256, BRONNEN.naturalEarth.bestanden["ne_10m_admin_0_map_units.geojson"]].join(), "noordzee", "afleiding: het marinebestand en admin-0, met hun SHA");
    eis(!!z.aanwijzen && z.aanwijzen.toegestaan === false && /^W1:/.test(z.aanwijzen.reden), "w1", "de Noordzee is niet aanwijsbaar (W1)");
    eis(c.meting.opp > 0, "noordzee", "EXACT: het Noordzeevlak is niet leeg (" + (c.meting.opp / 1e6).toFixed(1) + " km2, EPSG:3035)");
    eis(c.meting.doorsnede < 1, "land", "EXACT: de doorsnede van het Noordzeevlak met het land is kleiner dan 1 m2 (" + c.meting.doorsnede.toFixed(6) + " m2, EPSG:3035)");
  }
  // ---- de rivieren: opnieuw geteld in het NE-bestand ----
  c.items.filter(function(x) { return x.soort === "rivier"; }).forEach(function(x) {
    var t = T.rivieren[x.id], g = x.geometrie.bron, f = RIVF.filter(function(r) { return r.properties.name === g.waarde; });
    if (!t) { eis(false, "rivieren", "rivier niet in de tabel: " + x.id); return; }
    eis(g.sleutel === "name" && g.waarde === t.neNaam && g.features === f.length && f.length === t.features, "rivieren", "NE-naam " + t.neNaam + " met " + t.features + " feature(s): " + x.id);
    var b = [Infinity, Infinity, -Infinity, -Infinity];
    f.forEach(function(r) { (r.geometry.type === "LineString" ? [r.geometry.coordinates] : r.geometry.coordinates).forEach(function(l) { l.forEach(function(q) { b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], q[0]); b[3] = Math.max(b[3], q[1]); }); }); });
    eis(JSON.stringify(b.map(function(v) { return Math.round(v * 1e5) / 1e5; })) === JSON.stringify(g.omhullende), "rivieren", "de omhullende komt overeen: " + x.id);
    eis(x.relaties.length === 0, "rivieren", "geen relaties in 6.2: " + x.id);
  });
  return { fouten: fouten, n: n };
}

var uit = controleer({ items: kopie(W.WATER_NLBE), meting: METING });
console.log((uit.fouten.length ? "FOUT" : "GOED") + ": " + (uit.n - uit.fouten.length) + " controles geslaagd, " + uit.fouten.length + " mislukt");
uit.fouten.forEach(function(f) { console.log("  - [" + f.groep + "] " + f.tekst); });
console.log("EXACT Noordzee: " + (METING.opp / 1e6).toFixed(1) + " km2 (EPSG:3035), doorsnede met het land " + METING.doorsnede.toFixed(6) + " m2; " + NZ.land.length + " landeenheden afgetrokken");

// ---- open lijst ----
var open = {};
fs.readFileSync(path.join(ROOT, "src/core/topo/open-vragen.md"), "utf8").split("\n").forEach(function(r) { var m = /^- ([a-zA-Z0-9-]+) \| ([a-z ]+) \| (.+)$/.exec(r); if (m) open[m[1]] = { status: m[2], uitleg: m[3] }; });
var openFout = W.AFWIJKINGEN_WATER.filter(function(a) { var o = open[a.id]; return !o || STATUSSEN.indexOf(o.status) < 0 || o.uitleg !== a.tekst; });
var w2ok = (open["nlbe-w2-ne-rivieren"] || {}).status === "nog onbeslist" && /nog nader te onderzoeken/.test((open["nlbe-w2-ne-rivieren"] || {}).uitleg || "");
console.log("open lijst: " + (W.AFWIJKINGEN_WATER.length - openFout.length) + " van " + W.AFWIJKINGEN_WATER.length + " letterlijk op de lijst; W2 nog onbeslist en nog nader te onderzoeken: " + (w2ok ? "ja" : "NEE"));

// ---- reproduceerbaar ----
var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "water-")), herhaal = [];
[1, 2].forEach(function(k) { execFileSync("node", ["--max-old-space-size=6000", path.join(HIER, "maak-water-nlbe.mjs"), NE, path.join(tmp, "r" + k)]); herhaal.push(fs.readFileSync(path.join(tmp, "r" + k, "items/water-nlbe.js")).equals(fs.readFileSync(path.join(ROOT, "src/core/topo/items/water-nlbe.js")))); });
var reproOk = herhaal.every(Boolean);
console.log("twee keer draaien: " + (reproOk ? "byte-gelijk" : "VERSCHIL"));

// ---- mutanten ----
function it(c, id) { return c.items.filter(function(x) { return x.id === id; })[0]; }
var MUT = [
  ["13 een Waddenzee-item", "waddenzee", function(c) { var x = kopie(it(c, "zee-noordzee")); x.id = "zee-waddenzee"; x.naam.waarde = "Waddenzee"; c.items.push(x); }],
  ["14 Noordzeevlak zonder de aftrek van het land", "land", function(c) { c.meting = meet(NZ.ruw); }],
  ["3 Noordzee aanwijsbaar", "w1", function(c) { it(c, "zee-noordzee").aanwijzen.toegestaan = true; }],
  ["4 de Westerschelde als item", "westerschelde", function(c) { var x = kopie(it(c, "rivier-maas")); x.id = "zeearm-westerschelde"; x.naam.waarde = "Westerschelde"; c.items.push(x); }],
  ["7 Rijn met Rhein erbij", "rivieren", function(c) { var g = it(c, "rivier-rijn").geometrie.bron; g.features = 3; }],
  ["naam uit NE", "namen", function(c) { var n = it(c, "rivier-waal").naam; n.herkomst = "bron"; n.bron = { id: "NE" }; delete n.besluit; }],
  ["Rijn als besluit in plaats van Taalunie", "namen", function(c) { var n = it(c, "rivier-rijn").naam; n.herkomst = "besluit"; n.besluit = T.naamBesluit; delete n.bron; }]
];
var gevangen = 0, gemist = [];
MUT.forEach(function(m) { var c = { items: kopie(W.WATER_NLBE), meting: METING }; m[2](c); var r = controleer(c); if (r.fouten.some(function(f) { return f.groep === m[1]; })) gevangen++; else gemist.push(m[0]); });
console.log("mutanten: " + gevangen + " van " + MUT.length + " gevangen door de verwachte groep");
gemist.forEach(function(g) { console.log("  - GEMIST: " + g); });
process.exit(uit.fouten.length || gemist.length || openFout.length || !w2ok || !reproOk ? 1 : 0);
