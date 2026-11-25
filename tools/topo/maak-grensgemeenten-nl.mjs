// De Nederlandse grensgemeenten (plan T5b par. 3.1, B1; plan T1 par. 2.1). Alleen bouwomgeving.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node --max-old-space-size=6000 maak-grensgemeenten-nl.mjs <cbsgebiedsindelingen2026.gpkg> <sectoren.geojson> <map NE> <uitvoermap>
// De regel (grensgemeenten-nl.json):
// - de gemeenten van CBS Gebiedsindelingen 2026 (gemeente_niet_gegeneraliseerd) als topologie zonder kwantisering, in RD;
// - een lijnstuk van een boog die maar een gemeente gebruikt, is buitengrens als het punt op verschuivingM naast het midden aan
//   de buitenkant in geen enkele gemeente ligt (anders is het een naad tussen twee gemeenten die net niet samenvalt) en niet in
//   een gat van de vereniging van Nederland (een spleet tussen gemeenten); een gat dat in Belgie ligt (Baarle) telt wel;
// - Belgie: het midden ligt binnen tolerantieBeM van de buitenrand van de Statbel-sectoren (omgezet naar RD);
// - Duitsland: anders, als het midden binnen zoekafstandDeM van Natural Earth DEU ligt (NE wijst alleen het buurland aan);
// - een gemeente is grensgemeente van een land bij minstens minimumM grens; uitgezonderd: de gemeenten in de tabel (besluit);
// - schrijft items/gemeenten-nl.js (de grensgemeenten) en afgeleid/grensgemeenten-nl.js (grenst-aan, zonder km: de lengte
//   is een meting voor het rapport; bij Oldambt telt het water van de Dollard mee);
// - twee keer draaien geeft byte-gelijke bestanden.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import proj4 from "proj4";
import { topology } from "topojson-server";
import { merge } from "topojson-client";
import { openBron, CRS } from "./bronnen/bron.mjs";
import { leesGpkg, leesGeometrie } from "./bronnen/lees-gpkg.mjs";
import { leesGeojson, CRS_GEOJSON } from "./bronnen/lees-geojson.mjs";
import { binnenVlak, afstandTotLijnstuk } from "./vlakpunt.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var SCRIPT = "tools/topo/maak-grensgemeenten-nl.mjs";
var BRONNEN = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8"));
var GEB = BRONNEN.cbsGebiedsindelingen2026, STB = BRONNEN.statbel, REG = BRONNEN.register.ids;
var LAAG = "gemeente_niet_gegeneraliseerd", NE_BESTAND = "ne_10m_admin_0_map_units.geojson";

function fout(t) { throw new Error(t); }
function bbox(ringen) { var b = [Infinity, Infinity, -Infinity, -Infinity]; ringen.forEach(function(r) { r.forEach(function(c) { if (c[0] < b[0]) b[0] = c[0]; if (c[1] < b[1]) b[1] = c[1]; if (c[0] > b[2]) b[2] = c[0]; if (c[1] > b[3]) b[3] = c[1]; }); }); return b; }
function binnenBox(p, b) { return p[0] >= b[0] && p[1] >= b[1] && p[0] <= b[2] && p[1] <= b[3]; }
// lijnstukken in een raster, voor de afstand van een punt tot een rand
export function raster(lijnen, cel) {
  var R = {};
  lijnen.forEach(function(l) { for (var i = 0; i + 1 < l.length; i++) { var a = l[i], b = l[i + 1]; for (var x = Math.floor(Math.min(a[0], b[0]) / cel); x <= Math.floor(Math.max(a[0], b[0]) / cel); x++) for (var y = Math.floor(Math.min(a[1], b[1]) / cel); y <= Math.floor(Math.max(a[1], b[1]) / cel); y++) (R[x + "," + y] = R[x + "," + y] || []).push([a, b]); } });
  return { R: R, cel: cel };
}
// afstand tot de rand, gezocht in de cel en de 8 buurcellen; verder dan een cel weg geeft Infinity (genoeg voor de drempels)
export function afstand(p, ra) {
  var cx = Math.floor(p[0] / ra.cel), cy = Math.floor(p[1] / ra.cel), m = Infinity;
  for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) (ra.R[(cx + dx) + "," + (cy + dy)] || []).forEach(function(s) { var d = afstandTotLijnstuk(p, s[0], s[1]); if (d < m) m = d; });
  return m;
}

export function lees(paden) {
  var gpkg = openBron(paden.gpkg, "CBSGEB", GEB.gpkg.bestand);
  if (gpkg.sha256 !== GEB.gpkg.sha256) fout("SHA-256 van CBSGEB wijkt af");
  var sect = openBron(paden.sectoren, "STB", STB.sectoren.geojson.bestand);
  if (sect.sha256 !== STB.sectoren.geojson.sha256) fout("SHA-256 van de sectoren wijkt af");
  var ne = openBron(path.join(paden.ne, NE_BESTAND), "NE", NE_BESTAND);
  if (ne.sha256 !== REG.NE.bestanden[NE_BESTAND]) fout("SHA-256 van " + NE_BESTAND + " wijkt af");
  var tab = openBron(path.join(HIER, "grensgemeenten-nl.json"), "tabellenNlbe", "tools/topo/grensgemeenten-nl.json");
  if (REG.tabellenNlbe.bestanden["tools/topo/grensgemeenten-nl.json"] !== tab.sha256) fout("SHA-256 van grensgemeenten-nl.json wijkt af van het register");
  return { gpkg: gpkg, sect: sect, ne: ne, tab: tab, T: JSON.parse(tab.buf.toString("utf8")) };
}

// de meting: per gemeente de lengte van de buitengrens aan BEL en aan DEU (in m)
export async function meet(B, regels) {
  var g = await leesGpkg(B.gpkg.buf, LAAG, ["statcode", "statnaam"], "geom", "statcode");
  if (g.records.length !== GEB.lagen.gebiedsindelingen_register) fout("CBSGEB: niet " + GEB.lagen.gebiedsindelingen_register + " gemeenten");
  var gem = g.records.map(function(r) { var d = leesGeometrie(r.geom), ringen = []; d.forEach(function(p) { p.forEach(function(x) { ringen.push(x); }); }); return { code: r.kenmerken.statcode, naam: r.kenmerken.statnaam, delen: d, ringen: ringen, bb: bbox(ringen) }; });
  function inGemeente(p) { for (var i = 0; i < gem.length; i++) if (binnenBox(p, gem[i].bb) && binnenVlak(p, gem[i].ringen)) return i; return -1; }
  var topo = topology({ g: { type: "GeometryCollection", geometries: gem.map(function(x) { return { type: "MultiPolygon", coordinates: x.delen }; }) } });
  var gebruik = {};
  topo.objects.g.geometries.forEach(function(geo, i) {
    function loop(a) { if (Array.isArray(a)) a.forEach(loop); else { var k = a < 0 ? ~a : a; (gebruik[k] = gebruik[k] || []).push(i); } }
    loop(geo.arcs);
  });
  // de gaten van de vereniging van Nederland
  var gaten = [];
  merge(topo, topo.objects.g.geometries).coordinates.forEach(function(p) { p.slice(1).forEach(function(r) { gaten.push({ r: [r], bb: bbox([r]) }); }); });
  function inGat(p) { for (var i = 0; i < gaten.length; i++) if (binnenBox(p, gaten[i].bb) && binnenVlak(p, gaten[i].r)) return true; return false; }
  // Belgie: de buitenrand van de sectoren, in RD
  var s = leesGeojson(B.sect.buf, []);
  if (s.crs !== "EPSG:3812") fout("sectoren: onverwacht CRS");
  var ts = topology({ s: { type: "GeometryCollection", geometries: s.records.map(function(r) { return { type: "MultiPolygon", coordinates: r.delen }; }) } });
  var t1 = proj4(CRS_GEOJSON["EPSG:3812"], CRS["EPSG:28992"]), beRingen = [];
  merge(ts, ts.objects.s.geometries).coordinates.forEach(function(p) { p.forEach(function(r) { beRingen.push(r.map(function(c) { return t1.forward(c); })); }); });
  var beBb = bbox(beRingen);
  function inBelgie(p) { return binnenBox(p, beBb) && binnenVlak(p, beRingen); }
  // Duitsland: Natural Earth, in RD
  var de = JSON.parse(B.ne.buf.toString("utf8")).features.filter(function(f) { return f.properties.ADM0_A3 === "DEU"; });
  if (de.length !== 1) fout("NE: niet precies een DEU");
  var t2 = proj4("EPSG:4326", CRS["EPSG:28992"]), deRingen = [];
  (de[0].geometry.type === "Polygon" ? [de[0].geometry.coordinates] : de[0].geometry.coordinates).forEach(function(p) { p.forEach(function(r) { deRingen.push(r.map(function(c) { return t2.forward(c); })); }); });
  var rb = raster(beRingen, Math.max(2000, regels.tolerantieBeM)), rd = raster(deRingen, regels.zoekafstandDeM);
  var per = {}, naden = 0, spleten = 0;
  Object.keys(gebruik).map(Number).sort(function(a, b) { return a - b; }).forEach(function(k) {
    if (gebruik[k].length !== 1) return;
    var i = gebruik[k][0], l = topo.arcs[k];
    for (var j = 0; j + 1 < l.length; j++) {
      var a = l[j], b = l[j + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (!len) continue;
      var m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], nx = -(b[1] - a[1]) / len * regels.verschuivingM, ny = (b[0] - a[0]) / len * regels.verschuivingM;
      var p1 = [m[0] + nx, m[1] + ny], p2 = [m[0] - nx, m[1] - ny], i1 = inGemeente(p1), i2 = inGemeente(p2);
      if (i1 !== -1 && i2 !== -1) { naden += len; continue; }
      var buiten = i1 === -1 ? p1 : p2;
      if (inGat(buiten) && !inBelgie(buiten)) { spleten += len; continue; }
      var x = per[gem[i].code] = per[gem[i].code] || { BEL: 0, DEU: 0 };
      if (afstand(m, rb) <= regels.tolerantieBeM) x.BEL += len;
      else if (afstand(m, rd) <= regels.zoekafstandDeM) x.DEU += len;
    }
  });
  var naam = {}; gem.forEach(function(x) { naam[x.code] = x.naam; });
  return { per: per, naam: naam, naden: naden, spleten: spleten };
}

export function kies(M, T) {
  var uit = [];
  Object.keys(M.per).sort().forEach(function(c) {
    ["BEL", "DEU"].forEach(function(land) {
      if (M.per[c][land] >= T.regels.minimumM) uit.push({ code: c, land: land, m: M.per[c][land] });
    });
  });
  Object.keys(T.uitgezonderd).forEach(function(c) { if (M.naam[c] !== T.uitgezonderd[c].naam) fout("uitgezonderd: " + c + " is niet " + T.uitgezonderd[c].naam); });
  return uit.filter(function(x) { return !T.uitgezonderd[x.code]; });
}

export async function bouw(paden) {
  var B = lees(paden), T = B.T, M = await meet(B, T.regels), G = kies(M, T);
  var cbsBron = { id: "CBSGEB", bestand: GEB.gpkg.bestand, sha256: GEB.gpkg.sha256, laag: LAAG, jaargang: GEB.jaargang, gedownload: GEB.gedownload };
  var invoer = [{ bronId: "CBSGEB", sha256: GEB.gpkg.sha256 }, { bronId: "STB", sha256: STB.sectoren.geojson.sha256 }, { bronId: "NE", sha256: B.ne.sha256 }, { bronId: "tabellenNlbe", sha256: B.tab.sha256 }];
  var codes = []; G.forEach(function(x) { if (codes.indexOf(x.code) < 0) codes.push(x.code); }); codes.sort();
  var ITEMS = codes.map(function(c) {
    return {
      id: "gem-nl-" + c.toLowerCase(), soort: "gemeente",
      naam: { waarde: M.naam[c], varianten: [], herkomst: "bron", status: "vastgesteld", bron: cbsBron },
      feiten: { land: { waarde: "NLD", herkomst: "bron", status: "vastgesteld", bron: cbsBron }, code: { waarde: c, herkomst: "bron", status: "vastgesteld", bron: cbsBron } },
      geometrie: { bron: { bronId: "CBSGEB", bestand: GEB.gpkg.bestand, sha256: GEB.gpkg.sha256, laag: LAAG, sleutel: "statcode", waarde: c, crs: "EPSG:28992" }, kaart: {} },
      relaties: []
    };
  });
  var r = T.regels;
  var REL = G.map(function(x) {
    return { type: "grenst-aan", van: "gem-nl-" + x.code.toLowerCase(), naar: x.land, kwalificaties: {}, herkomst: "afgeleid", status: "vastgesteld",
      afleiding: { script: SCRIPT, invoer: invoer, regel: "buitengrens van de CBS-gemeente (" + LAAG + ", " + GEB.jaargang + "): een lijnstuk met aan de buitenkant (" + r.verschuivingM + " m) geen gemeente en geen spleet; " + (x.land === "BEL" ? "binnen " + r.tolerantieBeM + " m van de buitenrand van de Statbel-sectoren " + STB.sectoren.situatie : "niet bij Belgie en binnen " + r.zoekafstandDeM + " m van Natural Earth DEU (alleen het buurland)") + "; minstens " + r.minimumM + " m (de lengte staat in het rapport, niet in de kennisbank: bij Oldambt telt het water van de Dollard mee)" } };
  });
  var AFW = Object.keys(T.uitgezonderd).sort().map(function(c) { var m = M.per[c] || { BEL: 0, DEU: 0 }; return { id: "nlbe-grens-" + c.toLowerCase(), soort: "grensgemeente", tekst: T.uitgezonderd[c].naam + " (" + c + "): " + Math.round(m.DEU) + " m buitengrens binnen de zoekafstand van Duitsland, niet opgenomen. " + T.uitgezonderd[c].besluit } });
  return { ITEMS: ITEMS, REL: REL, AFW: AFW, meting: { naden: Math.round(M.naden), spleten: Math.round(M.spleten), lengte: G.map(function(x) { return x.code + " " + M.naam[x.code] + " " + x.land + " " + Math.round(x.m); }) } };
}

function regel(naam, waarde) { return "export var " + naam + " = " + JSON.stringify(waarde) + ";\n"; }
var KOP = "// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.\n";
export function schrijf(uit, r) {
  fs.mkdirSync(path.join(uit, "items"), { recursive: true });
  fs.mkdirSync(path.join(uit, "afgeleid"), { recursive: true });
  fs.writeFileSync(path.join(uit, "items", "gemeenten-nl.js"), "// GEGENEREERD door tools/topo/maak-grensgemeenten-nl.mjs uit CBS Gebiedsindelingen 2026, de Statbel-sectoren 2024 en Natural Earth (SHA-256 in tools/topo/bronnen.json); niet met de hand bewerken.\n// De Nederlandse grensgemeenten (plan T5b par. 3.1).\n" + KOP + regel("GEMEENTEN_NL", r.ITEMS) + "// punten voor de open lijst (src/core/topo/open-vragen.md)\n" + regel("AFWIJKINGEN_GRENS", r.AFW));
  fs.writeFileSync(path.join(uit, "afgeleid", "grensgemeenten-nl.js"), "// GEGENEREERD door tools/topo/maak-grensgemeenten-nl.mjs; niet met de hand bewerken.\n// grenst-aan van elke grensgemeente naar Belgie en/of Duitsland (zonder kwalificaties).\n" + KOP + regel("GRENSGEMEENTEN_NL", r.REL));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  var r = await bouw({ gpkg: process.argv[2], sectoren: process.argv[3], ne: process.argv[4] });
  schrijf(process.argv[5], r);
  console.log(r.meting.lengte.join("\n"));
  console.log(JSON.stringify({ gemeenten: r.ITEMS.length, BEL: r.REL.filter(function(x) { return x.naar === "BEL"; }).length, DEU: r.REL.filter(function(x) { return x.naar === "DEU"; }).length, naden: r.meting.naden, spleten: r.meting.spleten }));
}
