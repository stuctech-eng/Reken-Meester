// Grensgebieden van Nederland: het Drielandenpunt en het enclavegebied Baarle (plan T5b par. 3.6, B4; plan T1 par. 2.1).
// Alleen bouwomgeving.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node --max-old-space-size=6000 maak-grensgebieden-nl.mjs <cbsgebiedsindelingen2026.gpkg> <sectoren.geojson> <map NE> <uitvoermap>
// Drielandenpunt (afgeleid):
// - de buitenrand van Belgie (vereniging van de Statbel-sectoren, het hoofdgebied) loopt over de grens van Vaals (CBS); het punt is
//   het laatste hoekpunt van Belgie dat binnen 1 m van de grens van Vaals ligt, waar de buitenrand van Belgie de grens van Vaals
//   verlaat en daarna minstens 100 m van Vaals af gaat (de grens met Duitsland);
// - gecontroleerd: het punt ligt binnen 1 m van de Belgische gemeente Plombieres (Franse naam in de sectoren; ook Kelmis
//   raakt het punt in Statbel), alleen gemeenten van het arrondissement Verviers, en binnen 2 km van
//   Natural Earth DEU (NE wijst alleen het buurland aan).
// Enclavegebied Baarle (afgeleid):
// - de Belgische enclaves: de delen van Belgie (vereniging van alle sectoren) buiten het hoofdgebied; elk deel bestaat alleen uit
//   sectoren van Baarle-Hertog (13002);
// - de Nederlandse tegen-enclaves: de delen van Baarle-Nassau (CBS) die binnen een Belgische enclave liggen;
// - het item is de buitenrand van de Belgische enclaves (met de tegen-enclaves erin).
// Schrijft items/grensgebieden.js; twee keer draaien geeft een byte-gelijk bestand.

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
var SCRIPT = "tools/topo/maak-grensgebieden-nl.mjs";
var BRONNEN = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8"));
var GEB = BRONNEN.cbsGebiedsindelingen2026, STB = BRONNEN.statbel, REG = BRONNEN.register.ids;
var NE_BESTAND = "ne_10m_admin_0_map_units.geojson";
var BESLUIT_NAMEN = "T1 par. 2.1: de namen Drielandenpunt en enclavegebied Baarle (rol grensgebied)";

function fout(t) { throw new Error(t); }
function oppRing(r) { var a = 0; for (var j = 0; j + 1 < r.length; j++) a += r[j][0] * r[j + 1][1] - r[j + 1][0] * r[j][1]; return Math.abs(a / 2); }
function afstLijnen(q, ringen) { var m = Infinity; ringen.forEach(function(r) { for (var i = 0; i + 1 < r.length; i++) { var d = afstandTotLijnstuk(q, r[i], r[i + 1]); if (d < m) m = d; } }); return m; }
function rond(v, n) { var f = Math.pow(10, n); return Math.round(v * f) / f; }

export async function bouw(paden) {
  var gpkg = openBron(paden.gpkg, "CBSGEB", GEB.gpkg.bestand);
  if (gpkg.sha256 !== GEB.gpkg.sha256) fout("SHA-256 van CBSGEB wijkt af");
  var sect = openBron(paden.sectoren, "STB", STB.sectoren.geojson.bestand);
  if (sect.sha256 !== STB.sectoren.geojson.sha256) fout("SHA-256 van de sectoren wijkt af");
  var ne = openBron(path.join(paden.ne, NE_BESTAND), "NE", NE_BESTAND);
  if (ne.sha256 !== REG.NE.bestanden[NE_BESTAND]) fout("SHA-256 van " + NE_BESTAND + " wijkt af");
  var naarRd = proj4(CRS_GEOJSON["EPSG:3812"], CRS["EPSG:28992"]), naarLl = proj4(CRS["EPSG:28992"], "EPSG:4326");
  // CBS: Vaals en Baarle-Nassau
  var g = await leesGpkg(gpkg.buf, "gemeente_niet_gegeneraliseerd", ["statcode", "statnaam"], "geom", "statcode");
  function gemeente(c, naam) { var x = g.records.filter(function(r) { return r.kenmerken.statcode === c; }); if (x.length !== 1 || x[0].kenmerken.statnaam !== naam) fout("CBS: " + c + " is niet " + naam); return leesGeometrie(x[0].geom); }
  var vaals = gemeente("GM0981", "Vaals"), bn = gemeente("GM0744", "Baarle-Nassau");
  var vaalsRingen = []; vaals.forEach(function(p) { p.forEach(function(r) { vaalsRingen.push(r); }); });
  // Statbel: Belgie als vereniging van de sectoren
  var s = leesGeojson(sect.buf, ["cd_munty_refnis", "tx_munty_descr_fr"]);
  var t = topology({ s: { type: "GeometryCollection", geometries: s.records.map(function(r) { return { type: "MultiPolygon", coordinates: r.delen }; }) } });
  var BE = merge(t, t.objects.s.geometries).coordinates.map(function(p) { return p.map(function(r) { return r.map(function(c) { return naarRd.forward(c); }); }); });
  var volg = BE.map(function(p, i) { return { i: i, opp: oppRing(p[0]) }; }).sort(function(a, b) { return b.opp - a.opp; });
  var hoofd = BE[volg[0].i], enclaves = volg.slice(1).map(function(x) { return BE[x.i]; });

  // ---- Drielandenpunt ----
  var vb = [Infinity, Infinity, -Infinity, -Infinity]; vaalsRingen.forEach(function(r) { r.forEach(function(c) { vb[0] = Math.min(vb[0], c[0]); vb[1] = Math.min(vb[1], c[1]); vb[2] = Math.max(vb[2], c[0]); vb[3] = Math.max(vb[3], c[1]); }); });
  function bijVaals(q) { return q[0] >= vb[0] - 2 && q[1] >= vb[1] - 2 && q[0] <= vb[2] + 2 && q[1] <= vb[3] + 2; }
  var ring = hoofd[0], dicht = ring.map(function(q) { return bijVaals(q) && afstLijnen(q, vaalsRingen) <= 1; }), kand = [];
  for (var i = 0; i + 1 < ring.length; i++) {
    if (!dicht[i] || dicht[i + 1]) continue;
    var weg = true; for (var k = 1; k <= 10 && i + k < ring.length; k++) if (dicht[i + k]) weg = false;
    var verder = false; for (var k2 = 1; i + k2 < ring.length && k2 <= 60; k2++) if (afstLijnen(ring[i + k2], vaalsRingen) >= 100) { verder = true; break; }
    if (weg && verder) kand.push(i);
  }
  // de ring kan ook in de andere richting lopen: dan verlaat Belgie Vaals bij het eerste hoekpunt van een reeks
  for (var j = ring.length - 1; j > 0; j--) {
    if (!dicht[j] || dicht[j - 1]) continue;
    var weg2 = true; for (var k3 = 1; k3 <= 10 && j - k3 >= 0; k3++) if (dicht[j - k3]) weg2 = false;
    var verder2 = false; for (var k4 = 1; j - k4 >= 0 && k4 <= 60; k4++) if (afstLijnen(ring[j - k4], vaalsRingen) >= 100) { verder2 = true; break; }
    if (weg2 && verder2 && kand.indexOf(j) < 0) kand.push(j);
  }
  // alleen de plek waar daarna Duitsland ligt: binnen 2 km van NE DEU
  var de = JSON.parse(ne.buf.toString("utf8")).features.filter(function(f) { return f.properties.ADM0_A3 === "DEU"; })[0];
  var naarRdLl = proj4("EPSG:4326", CRS["EPSG:28992"]), deRingen = [];
  (de.geometry.type === "Polygon" ? [de.geometry.coordinates] : de.geometry.coordinates).forEach(function(p) { p.forEach(function(r) { deRingen.push(r.map(function(c) { return naarRdLl.forward(c); })); }); });
  kand = kand.filter(function(x) { return afstLijnen(ring[x], deRingen) <= 2000; });
  if (kand.length !== 1) fout("Drielandenpunt: niet precies een plek (" + kand.length + ")");
  var P = ring[kand[0]];
  // de Belgische gemeente bij het punt
  var bij = []; s.records.forEach(function(r) { var rr = []; r.delen.forEach(function(d) { d.forEach(function(x) { rr.push(x.map(function(c) { return naarRd.forward(c); })); }); }); if (afstLijnen(P, rr) <= 1) bij.push(r.kenmerken.cd_munty_refnis + " " + r.kenmerken.tx_munty_descr_fr); });
  bij = bij.filter(function(x, k) { return bij.indexOf(x) === k; });
  bij.sort();
  if (!bij.some(function(x) { return / Plombi.res$/.test(x); }) || !bij.every(function(x) { return /^63/.test(x); })) fout("Drielandenpunt: niet bij Plombieres (arrondissement Verviers): " + bij.join(", "));
  var ll = naarLl.forward(P);

  // ---- Baarle ----
  var sectBh = s.records.filter(function(r) { return r.kenmerken.cd_munty_refnis === "13002"; });
  enclaves.forEach(function(p, k) {
    var q = p[0][0], m = afstLijnen(q, [].concat.apply([], sectBh.map(function(r) { var rr = []; r.delen.forEach(function(d) { d.forEach(function(x) { rr.push(x.map(function(c) { return naarRd.forward(c); })); }); }); return rr; })));
    if (m > 0.01) fout("Baarle: een deel van Belgie buiten het hoofdgebied is geen Baarle-Hertog (" + k + ")");
  });
  var tegen = bn.filter(function(p) { var q = p[0][0]; return enclaves.some(function(e) { return binnenVlak(q, [e[0]]); }); });
  var inHoofd = bn.filter(function(p) { var q = p[0][0]; return binnenVlak(q, [hoofd[0]]); });

  var cbsBron = { id: "CBSGEB", bestand: GEB.gpkg.bestand, sha256: GEB.gpkg.sha256, laag: "gemeente_niet_gegeneraliseerd", jaargang: GEB.jaargang, gedownload: GEB.gedownload };
  var invoer = [{ bronId: "CBSGEB", sha256: GEB.gpkg.sha256 }, { bronId: "STB", sha256: STB.sectoren.geojson.sha256 }, { bronId: "NE", sha256: ne.sha256 }];
  function afgeleid(waarde, regel) { return { waarde: waarde, herkomst: "afgeleid", status: "vastgesteld", afleiding: { script: SCRIPT, invoer: invoer, regel: regel } }; }
  var ITEMS = [
    { id: "grenspunt-drielandenpunt", soort: "grenspunt",
      naam: { waarde: "Drielandenpunt", varianten: [], herkomst: "besluit", status: "vastgesteld", besluit: BESLUIT_NAMEN },
      feiten: { landen: afgeleid(["BEL", "DEU", "NLD"], "het punt ligt op de grens van Vaals (CBS) en van " + bij.map(function(x) { return x.replace(/^[0-9]+ /, ""); }).join(" en ") + " (Statbel), waar de buitengrens van Belgie Vaals verlaat; Duitsland volgens Natural Earth (binnen 2 km)"), rol: { waarde: "grensgebied", herkomst: "besluit", status: "vastgesteld", besluit: BESLUIT_NAMEN } },
      geometrie: { punt: { lon: rond(ll[0], 5), lat: rond(ll[1], 5), rd: [rond(P[0], 1), rond(P[1], 1)], herkomst: "afgeleid", status: "vastgesteld",
        afleiding: { script: SCRIPT, invoer: invoer, regel: "het laatste hoekpunt van de buitenrand van Belgie (vereniging van de Statbel-sectoren " + STB.sectoren.situatie + ", EPSG:3812 naar RD) binnen 1 m van de grens van Vaals (CBS " + GEB.jaargang + "), waarna de rand minstens 100 m van Vaals af gaat; RD naar WGS84" } },
        bron: null, geen: "een punt; geen vlak", kaart: {} },
      relaties: [] },
    { id: "gebied-baarle", soort: "bijzonder-gebied",
      naam: { waarde: "enclavegebied Baarle", varianten: ["Baarle"], herkomst: "besluit", status: "vastgesteld", besluit: BESLUIT_NAMEN },
      feiten: { landen: afgeleid(["BEL", "NLD"], "Belgische enclaves (Statbel, Baarle-Hertog) met Nederlandse tegen-enclaves (CBS, Baarle-Nassau)"), rol: { waarde: "grensgebied", herkomst: "besluit", status: "vastgesteld", besluit: BESLUIT_NAMEN },
        belgischeEnclaves: afgeleid(enclaves.length, "de delen van Belgie (vereniging van de Statbel-sectoren " + STB.sectoren.situatie + ") buiten het hoofdgebied; elk deel bestaat uit sectoren van Baarle-Hertog (13002)"),
        nederlandseTegenEnclaves: afgeleid(tegen.length, "de delen van Baarle-Nassau (CBS " + GEB.jaargang + ", gemeente_niet_gegeneraliseerd) die binnen een Belgische enclave liggen (punt in vlak)"),
        nederlandseEnclavesInHoofdgebied: afgeleid(inHoofd.length, "de delen van Baarle-Nassau binnen de buitenrand van het hoofdgebied van Belgie: Nederlandse enclaves in Belgie zelf (niet in het item)") },
      geometrie: { bron: { bronId: "STB", bestand: STB.sectoren.geojson.bestand, sha256: STB.sectoren.geojson.sha256, sleutel: "cd_munty_refnis", waarde: "13002", crs: STB.sectoren.geojson.crs, aggregatie: "de delen van de vereniging van alle sectoren buiten het hoofdgebied (de Belgische enclaves), alleen de buitenrand: de Nederlandse tegen-enclaves vallen erin", situatie: STB.sectoren.situatie }, kaart: {} },
      relaties: [] }
  ];
  return { ITEMS: ITEMS, meting: { kandidaten: kand.length, gemeente: bij.join(", "), enclaves: enclaves.length, tegen: tegen.length, inHoofd: inHoofd.length, opp: enclaves.map(function(e) { return Math.round(oppRing(e[0])); }) } };
}

function regel(naam, waarde) { return "export var " + naam + " = " + JSON.stringify(waarde) + ";\n"; }
export function schrijf(uit, r) {
  fs.mkdirSync(path.join(uit, "items"), { recursive: true });
  fs.writeFileSync(path.join(uit, "items", "grensgebieden.js"), "// GEGENEREERD door tools/topo/maak-grensgebieden-nl.mjs uit CBS Gebiedsindelingen 2026, de Statbel-sectoren 2024 en Natural Earth (SHA-256 in tools/topo/bronnen.json); niet met de hand bewerken.\n// Het Drielandenpunt en het enclavegebied Baarle (plan T5b par. 3.6).\n// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.\n" + regel("GRENSGEBIEDEN", r.ITEMS));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  var r = await bouw({ gpkg: process.argv[2], sectoren: process.argv[3], ne: process.argv[4] });
  schrijf(process.argv[5], r);
  console.log(JSON.stringify({ punt: r.ITEMS[0].geometrie.punt.lon + " " + r.ITEMS[0].geometrie.punt.lat, meting: r.meting }));
}
