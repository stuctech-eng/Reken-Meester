// De 11 vaste Belgische steden (plan T1 par. 2.2; bouwplan T2b-2 fase 6.2 v3, deel 1). Alleen bouwomgeving, niet in de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node maak-steden-be.mjs <TU_COM_REFNIS.txt> <sectoren.geojson> <map met de Natural Earth-bestanden> <uitvoermap>
// - naam (Nederlands) en variant (Frans) uit Statbel REFNIS, geldig op 1-1-2026;
// - het punt is de geometrie van Natural Earth v5.1.2 (populated_places_simple), alleen als die in de eigen gemeente ligt
//   (statistische sectoren 2024); anders, of zonder NE-punt, een open punt met de reden uit steden-be.json (K6 c, Brussel);
// - Brussel krijgt de relaties hoofdstad-van en regeringszetel-van naar BEL (Grondwet art. 194, ov-rollen-nlbe.json R4, R5);
// - schrijft items/steden-be.js; twee keer draaien geeft een byte-gelijk bestand.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import proj4 from "proj4";
import { openBron } from "./bronnen/bron.mjs";
import { CRS_GEOJSON } from "./bronnen/lees-geojson.mjs";
import { leesRefnis, leesSectoren } from "./maak-bestuur-nlbe.mjs";
import { binnenVlak } from "./vlakpunt.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var BRONNEN = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8"));
var STB = BRONNEN.statbel, NEB = BRONNEN.naturalEarth;
var NE_PLAATSEN = "ne_10m_populated_places_simple.geojson";
var DREMPEL_KM = 1;

function fout(t) { throw new Error(t); }
function afstandKm(a, b) {
  var R = 6371, r = Math.PI / 180, dl = (b[1] - a[1]) * r, dg = (b[0] - a[0]) * r;
  var h = Math.sin(dl / 2) * Math.sin(dl / 2) + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dg / 2) * Math.sin(dg / 2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function bouw(paden) {
  var refnisBron = openBron(paden.refnis, "STB", STB.refnis.txt.bestand);
  var sectBron = openBron(paden.sectoren, "STB", STB.sectoren.geojson.bestand);
  var neBron = openBron(path.join(paden.ne, NE_PLAATSEN), "NE", NE_PLAATSEN);
  if (neBron.sha256 !== NEB.bestanden[NE_PLAATSEN]) fout("SHA-256 van NE-plaatsen wijkt af van naturalEarth");
  var sbeBron = openBron(path.join(HIER, "steden-be.json"), "tabellenNlbe", "tools/topo/steden-be.json");
  var ovrBron = openBron(path.join(HIER, "ov-rollen-nlbe.json"), "tabellenNlbe", "tools/topo/ov-rollen-nlbe.json");
  var SBE = JSON.parse(sbeBron.buf.toString("utf8")), OVR = JSON.parse(ovrBron.buf.toString("utf8"));
  var RF = leesRefnis(refnisBron.buf), sect = leesSectoren(sectBron.buf);
  var naar3812 = proj4("EPSG:4326", CRS_GEOJSON["EPSG:3812"]);
  var ne = JSON.parse(neBron.buf.toString("utf8")).features, perNe = {};
  ne.forEach(function(f) { if (perNe[f.properties.ne_id]) fout("NE: dubbel ne_id"); perNe[f.properties.ne_id] = f; });
  var refnisFeit = { id: "STB", bestand: STB.refnis.txt.bestand, sha256: STB.refnis.txt.sha256, geldigOp: "2026-01-01", laatsteWijziging: STB.refnis.laatsteWijziging, gedownload: STB.refnis.gedownload };
  var AFW = [], STEDEN = [];
  Object.keys(SBE.steden).sort().forEach(function(id) {
    var t = SBE.steden[id], r = RF.geldig[t.refnis];
    if (!r || r.niveau !== 4) fout("geen geldige REFNIS-gemeente voor " + id);
    var naam = { waarde: r.nl, varianten: r.fr !== r.nl ? [r.fr] : [], herkomst: "bron", status: "vastgesteld", bron: refnisFeit };
    var punt, georef = null;
    if (t.neId !== null) {
      var f = perNe[t.neId];
      if (!f || f.geometry.type !== "Point") fout("NE: geen punt met ne_id " + t.neId);
      if (f.properties.adm0_a3 !== "BEL" || [r.nl, r.fr].indexOf(f.properties.name) < 0) fout("NE: ne_id " + t.neId + " is niet " + r.nl);
      var ll = f.geometry.coordinates, xy = naar3812.forward(ll);
      var gem = sect.records.filter(function(s) { return s.kenmerken.cd_munty_refnis === t.refnis; });
      if (!gem.length) fout("geen sectoren voor " + t.refnis);
      var binnen = gem.some(function(s) { return s.delen.some(function(d) { return binnenVlak(xy, d); }); });
      if (!binnen) fout("het NE-punt van " + id + " ligt niet in de eigen gemeente " + t.refnis + "; zet het punt open in steden-be.json");
      punt = { lon: ll[0], lat: ll[1], herkomst: "bron", status: "vastgesteld", bron: { id: "NE", bestand: NE_PLAATSEN, sha256: neBron.sha256, sleutel: "ne_id", waarde: t.neId, veld: "geometrie" } };
      georef = { bronId: "NE", bestand: NE_PLAATSEN, sha256: neBron.sha256, sleutel: "ne_id", waarde: t.neId, crs: "EPSG:4326" };
      var kenmerk = [f.properties.longitude, f.properties.latitude], d = afstandKm(ll, kenmerk);
      if (d > DREMPEL_KM) AFW.push({ id: "nlbe-ne-kenmerken-" + id.replace("stad-be-", ""), soort: "bron", tekst: "Natural Earth (ne_id " + t.neId + "): de kenmerken longitude/latitude (" + kenmerk.join(", ") + ") liggen " + d.toFixed(1) + " km van de geometrie (" + ll.join(", ") + "); de geometrie is leidend (GPT 18-11-2026)" });
    } else {
      if (!t.puntOpen) fout("geen NE-punt en geen reden voor " + id);
      punt = { herkomst: "onderzoek", status: "niet aangetoond", reden: t.puntOpen };
      AFW.push({ id: "nlbe-punt-" + id.replace("stad-be-", ""), soort: "punt", tekst: r.nl + ": geen punt. " + t.puntOpen });
    }
    var rel = [];
    ["R4", "R5"].forEach(function(k) {
      var x = OVR.rollen[k];
      if (x.stad !== id) return;
      rel.push({ type: x.rol, naar: x.doel, kwalificaties: {}, herkomst: "bron", status: "vastgesteld", bron: { id: "OV", uitgever: x.bron.uitgever, document: x.bron.document, url: x.bron.url, passage: x.bron.passage, geraadpleegd: OVR.geraadpleegd } });
    });
    STEDEN.push({ id: id, soort: "stad", naam: naam, feiten: { land: { waarde: "BEL", herkomst: "bron", status: "vastgesteld", bron: refnisFeit }, refnis: { waarde: t.refnis, herkomst: "bron", status: "vastgesteld", bron: refnisFeit } }, geometrie: { punt: punt, bron: georef, kaart: {} }, relaties: rel });
  });
  if (STEDEN.length !== 11) fout("niet 11 steden");
  var brussel = STEDEN.filter(function(s) { return s.id === "stad-be-brussel"; })[0];
  if (!brussel || brussel.relaties.length !== 2) fout("Brussel heeft niet de 2 relaties naar BEL");
  AFW.sort(function(a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; });
  return { STEDEN: STEDEN, AFW: AFW };
}

function regel(naam, waarde) { return "export var " + naam + " = " + JSON.stringify(waarde) + ";\n"; }
export function schrijf(uit, r) {
  fs.mkdirSync(path.join(uit, "items"), { recursive: true });
  fs.writeFileSync(path.join(uit, "items", "steden-be.js"), "// GEGENEREERD door tools/topo/maak-steden-be.mjs uit Statbel REFNIS, de statistische sectoren 2024, Natural Earth v5.1.2 en tools/topo/steden-be.json; niet met de hand bewerken.\n// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.\n" + regel("STEDEN_BE", r.STEDEN) + "// punten voor de open lijst (src/core/topo/open-vragen.md)\n" + regel("AFWIJKINGEN_STEDEN_BE", r.AFW));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  var r = bouw({ refnis: process.argv[2], sectoren: process.argv[3], ne: process.argv[4] });
  schrijf(process.argv[5], r);
  console.log(JSON.stringify({ steden: r.STEDEN.length, metPunt: r.STEDEN.filter(function(s) { return s.geometrie.punt.status === "vastgesteld"; }).length, afwijkingen: r.AFW.map(function(a) { return a.id; }) }));
}
