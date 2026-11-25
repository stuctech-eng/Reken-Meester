// Tests voor de 11 Belgische steden (bouwplan T2b-2 fase 6.2 v3, deel 1). Alleen bouwomgeving, niet in de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node --max-old-space-size=6000 test-steden-be.mjs <TU_COM_REFNIS.txt> <sectoren.geojson> <map met de Natural Earth-bestanden>
// Controleert de inhoud van items/steden-be.js tegen REFNIS, Natural Earth en steden-be.json, de ligging van elk punt in de
// eigen gemeente (EXACT, punt-in-vlak op de sectoren), bij Brussel, Leuven en Waver in de centrumsector (T5b), de relaties van
// Brussel, de open lijst en de reproduceerbaarheid;
// daarna de mutanten.

import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";
import proj4 from "proj4";
import { leesRefnis } from "./maak-bestuur-nlbe.mjs";
import { CRS_GEOJSON, leesGeojson } from "./bronnen/lees-geojson.mjs";
import { binnenVlak } from "./vlakpunt.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var ROOT = path.resolve(HIER, "..", "..");
var REFNIS = process.argv[2], SECT = process.argv[3], NE = process.argv[4];
var BRONNEN = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8"));
var TAB = JSON.parse(fs.readFileSync(path.join(HIER, "steden-be.json"), "utf8"));
var OVR = JSON.parse(fs.readFileSync(path.join(HIER, "ov-rollen-nlbe.json"), "utf8"));
var M = await import(pathToFileURL(path.join(ROOT, "src/core/topo/items/steden-be.js")).href);
var STATUSSEN = ["onderzocht", "bevestigd verschil", "nog onbeslist", "gecorrigeerd"];
var RF = leesRefnis(fs.readFileSync(REFNIS));
var sect = leesGeojson(fs.readFileSync(SECT), ["cd_sector", "cd_munty_refnis", "cd_prov_refnis", "cd_rgn_refnis", "dt_situation", "tx_sector_descr_nl", "tx_sector_descr_fr"]);
// de centrumsectoren (T5b): code -> gemeente, naam (Nederlands | Frans) en de vlakken
var sectNaam = {};
sect.records.forEach(function(r) { var k = r.kenmerken; sectNaam[k.cd_sector] = { gem: k.cd_munty_refnis, naam: k.tx_sector_descr_nl + " | " + k.tx_sector_descr_fr, delen: r.delen }; });
var neBestand = "ne_10m_populated_places_simple.geojson";
var NEF = {}; JSON.parse(fs.readFileSync(path.join(NE, neBestand), "utf8")).features.forEach(function(f) { NEF[f.properties.ne_id] = f; });
var naar3812 = proj4("EPSG:4326", CRS_GEOJSON["EPSG:3812"]);
var perGem = {}; sect.records.forEach(function(r) { (perGem[r.kenmerken.cd_munty_refnis] = perGem[r.kenmerken.cd_munty_refnis] || []).push(r); });
function inGemeente(ll, code) { var xy = naar3812.forward(ll); return (perGem[code] || []).some(function(r) { return r.delen.some(function(d) { return binnenVlak(xy, d); }); }); }
function gemeenteVan(ll) { var xy = naar3812.forward(ll); var k = Object.keys(perGem).filter(function(g) { return perGem[g].some(function(r) { return r.delen.some(function(d) { return binnenVlak(xy, d); }); }); }); return k.join(); }
function inSector(ll, code) { var xy = naar3812.forward(ll), sc = sectNaam[code]; return !!sc && sc.delen.some(function(d) { return binnenVlak(xy, d); }); }
function kopie(x) { return JSON.parse(JSON.stringify(x)); }

function controleer(S) {
  var fouten = [], n = 0;
  function eis(ok, groep, tekst) { n++; if (!ok) fouten.push({ groep: groep, tekst: tekst }); }
  eis(S.length === 11 && S.map(function(s) { return s.id; }).sort().join() === Object.keys(TAB.steden).sort().join(), "aantallen", "de 11 steden uit steden-be.json");
  eis(!S.some(function(s) { return /charleroi/.test(s.id); }), "aantallen", "geen Charleroi (A5)");
  S.forEach(function(s) {
    var t = TAB.steden[s.id] || {}, r = RF.geldig[t.refnis] || {};
    eis(s.soort === "stad" && s.feiten.refnis.waarde === t.refnis && r.niveau === 4, "refnis", "geldige REFNIS-gemeente: " + s.id);
    eis(s.naam.waarde === r.nl && s.naam.herkomst === "bron" && s.naam.bron.id === "STB" && s.naam.bron.sha256 === BRONNEN.statbel.refnis.txt.sha256, "namen", "naam = REFNIS (Nederlands), bron STB: " + s.id);
    eis(JSON.stringify(s.naam.varianten) === JSON.stringify(r.fr !== r.nl ? [r.fr] : []), "namen", "variant = REFNIS (Frans): " + s.id);
    var p = s.geometrie.punt;
    if (t.centrumSector) {
      // T5b (besluit Claude 25-11-2026, onderbouwt K6 c): het punt ligt in de centrumsector met de naam uit de tabel, in de eigen gemeente
      var sc = sectNaam[t.centrumSector];
      eis(!!sc && sc.gem === t.refnis && sc.naam === t.centrumNaam, "punt-centrum", "de centrumsector bestaat, ligt in de eigen gemeente en heeft de naam uit de tabel: " + s.id);
      eis(p.herkomst === "afgeleid" && p.status === "vastgesteld" && p.afleiding && p.afleiding.invoer.length === 1 && p.afleiding.invoer[0].bronId === "STB" && p.afleiding.invoer[0].sha256 === BRONNEN.statbel.sectoren.geojson.sha256 && p.afleiding.regel.indexOf(t.centrumSector) >= 0, "punt-centrum", "punt afgeleid uit de centrumsector, met de SHA van de sectoren: " + s.id);
      eis(!!s.geometrie.bron && s.geometrie.bron.bronId === "STB" && s.geometrie.bron.sleutel === "cd_sector" && s.geometrie.bron.waarde === t.centrumSector, "punt-centrum", "GEOREF naar de centrumsector: " + s.id);
      eis(Number.isFinite(p.lon) && inSector([p.lon, p.lat], t.centrumSector) && inGemeente([p.lon, p.lat], t.refnis), "ligging", "EXACT: het punt ligt in de centrumsector en in de eigen gemeente: " + s.id);
    } else if (t.neId === null) {
      eis(p.herkomst === "onderzoek" && p.status === "niet aangetoond" && p.reden === t.puntOpen && p.lon === undefined && s.geometrie.bron === null, "punt-open", "open punt met de reden uit de tabel, zonder coordinaten en zonder GEOREF: " + s.id);
    } else {
      var f = NEF[t.neId];
      eis(!!f && p.herkomst === "bron" && p.status === "vastgesteld" && p.lon === f.geometry.coordinates[0] && p.lat === f.geometry.coordinates[1], "punt", "punt = de NE-geometrie (niet de kenmerken): " + s.id);
      eis(p.bron.id === "NE" && p.bron.sha256 === BRONNEN.naturalEarth.bestanden[neBestand] && s.geometrie.bron.waarde === t.neId, "punt", "punt en GEOREF met de NE-SHA en het ne_id: " + s.id);
      eis(inGemeente([p.lon, p.lat], t.refnis), "ligging", "EXACT: het punt ligt in de eigen gemeente " + t.refnis + ": " + s.id);
    }
    var verwacht = ["R4", "R5"].filter(function(k) { return OVR.rollen[k].stad === s.id; }).map(function(k) { return OVR.rollen[k]; });
    eis(s.relaties.length === verwacht.length, "relaties", "alleen de relaties uit de tabel: " + s.id);
    verwacht.forEach(function(x) {
      var r = s.relaties.filter(function(y) { return y.type === x.rol && y.naar === x.doel; })[0];
      eis(!!r && r.herkomst === "bron" && r.status === "vastgesteld" && r.bron.id === "OV" && r.bron.passage === x.bron.passage && r.bron.url === x.bron.url, "relaties", "relatie " + x.rol + " met de letterlijke passage uit de Grondwet: " + s.id);
    });
  });
  var br = S.filter(function(s) { return s.id === "stad-be-brussel"; })[0];
  eis(!!br && br.relaties.map(function(r) { return r.type + ">" + r.naar; }).sort().join() === "hoofdstad-van>BEL,regeringszetel-van>BEL", "relaties", "Brussel: hoofdstad-van en regeringszetel-van naar BEL");
  eis(S.filter(function(s) { return s.geometrie.punt.status === "vastgesteld"; }).length === 11, "aantallen", "11 steden met een punt: 8 uit Natural Earth, 3 uit de centrumsector (Brussel, Leuven, Waver; T5b)");
  return { fouten: fouten, n: n };
}

var uit = controleer(kopie(M.STEDEN_BE));
console.log((uit.fouten.length ? "FOUT" : "GOED") + ": " + (uit.n - uit.fouten.length) + " controles geslaagd, " + uit.fouten.length + " mislukt");
uit.fouten.forEach(function(f) { console.log("  - [" + f.groep + "] " + f.tekst); });
// de reden van Brussel: het NE-punt ligt in Anderlecht (vastgesteld, niet aangenomen)
var neBr = NEF[1159151465].geometry.coordinates, gemBr = gemeenteVan(neBr);
console.log("controle Brussel: het NE-punt (ne_id 1159151465) ligt in gemeente " + gemBr + (gemBr === "21001" ? " (Anderlecht), niet in 21004" : ""));
var brOk = gemBr === "21001";

// ---- open lijst ----
var open = {};
fs.readFileSync(path.join(ROOT, "src/core/topo/open-vragen.md"), "utf8").split("\n").forEach(function(r) { var m = /^- ([a-zA-Z0-9-]+) \| ([a-z ]+) \| (.+)$/.exec(r); if (m) open[m[1]] = { status: m[2], uitleg: m[3] }; });
var openFout = M.AFWIJKINGEN_STEDEN_BE.filter(function(a) { var o = open[a.id]; return !o || STATUSSEN.indexOf(o.status) < 0 || o.uitleg !== a.tekst; });
var verwachtAfw = ["nlbe-ne-kenmerken-hasselt"];
var afwOk = M.AFWIJKINGEN_STEDEN_BE.map(function(a) { return a.id; }).join() === verwachtAfw.join() && (open["nlbe-ne-kenmerken-hasselt"] || {}).status === "bevestigd verschil";
console.log("open lijst: " + (M.AFWIJKINGEN_STEDEN_BE.length - openFout.length) + " van " + M.AFWIJKINGEN_STEDEN_BE.length + " letterlijk op de lijst; verwachte afwijkingen " + (afwOk ? "aanwezig" : "NIET GELIJK"));

// ---- reproduceerbaar ----
var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "steden-be-")), herhaal = [];
[1, 2].forEach(function(k) {
  execFileSync("node", ["--max-old-space-size=6000", path.join(HIER, "maak-steden-be.mjs"), REFNIS, SECT, NE, path.join(tmp, "r" + k)]);
  herhaal.push(fs.readFileSync(path.join(tmp, "r" + k, "items/steden-be.js")).equals(fs.readFileSync(path.join(ROOT, "src/core/topo/items/steden-be.js"))));
});
var reproOk = herhaal.every(Boolean);
console.log("twee keer draaien: " + (reproOk ? "byte-gelijk" : "VERSCHIL"));

// ---- mutanten ----
function st(S, id) { return S.filter(function(s) { return s.id === id; })[0]; }
var MUT = [
  ["Brussel met het NE-punt in Anderlecht", "punt-centrum", function(S) { var p = st(S, "stad-be-brussel").geometrie; p.punt = { lon: neBr[0], lat: neBr[1], herkomst: "bron", status: "vastgesteld", bron: { id: "NE" } }; }],
  ["Leuven met een kunstmatig punt", "punt-centrum", function(S) { var p = st(S, "stad-be-leuven").geometrie; p.punt = { lon: 4.70, lat: 50.88, herkomst: "afgeleid", status: "vastgesteld", afleiding: { script: "x", regel: "gemeente-interieurpunt", invoer: [] } }; }],
  ["Hasselt met de NE-kenmerken in plaats van de geometrie", "punt", function(S) { var p = st(S, "stad-be-hasselt").geometrie.punt; p.lon = 5.483998; p.lat = 50.964003; }],
  ["punt van Gent in een andere gemeente", "ligging", function(S) { var p = st(S, "stad-be-gent").geometrie.punt; var b = st(S, "stad-be-brugge").geometrie.punt; p.lon = b.lon; p.lat = b.lat; NEF[TAB.steden["stad-be-gent"].neId] = { geometry: { coordinates: [b.lon, b.lat] } }; }],
  ["Brussel zonder regeringszetel", "relaties", function(S) { st(S, "stad-be-brussel").relaties.pop(); }],
  ["Brussel: passage gewijzigd", "relaties", function(S) { st(S, "stad-be-brussel").relaties[0].bron.passage = "Brussel is de hoofdstad."; }],
  ["naam niet uit REFNIS", "namen", function(S) { st(S, "stad-be-bergen").naam.waarde = "Mons"; }],
  ["Charleroi toegevoegd", "aantallen", function(S) { var x = kopie(st(S, "stad-be-namen")); x.id = "stad-be-charleroi"; S.push(x); }]
];
var bewaard = NEF[TAB.steden["stad-be-gent"].neId];
var gevangen = 0, gemist = [];
MUT.forEach(function(m) {
  var S = kopie(M.STEDEN_BE); m[2](S);
  var r = controleer(S);
  NEF[TAB.steden["stad-be-gent"].neId] = bewaard;
  if (r.fouten.some(function(f) { return f.groep === m[1]; })) gevangen++; else gemist.push(m[0]);
});
console.log("mutanten: " + gevangen + " van " + MUT.length + " gevangen door de verwachte groep");
gemist.forEach(function(g) { console.log("  - GEMIST: " + g); });
process.exit(uit.fouten.length || gemist.length || !reproOk || openFout.length || !afwOk || !brOk ? 1 : 0);
