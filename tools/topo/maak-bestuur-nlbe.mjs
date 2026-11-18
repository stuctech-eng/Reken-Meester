// Provincies, gewesten en hoofdsteden van Nederland en Belgie (bouwplan T2b-2 fase 6.2 v3, deel 1). Alleen bouwomgeving.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node maak-bestuur-nlbe.mjs <cbsgebiedsindelingen2026.gpkg> <TU_COM_REFNIS.txt> <sectoren.geojson> <uitvoermap>
// - controleert de SHA-256 van elk bronbestand en van de tabellen tegen het register in bronnen.json;
// - maakt items/provincies.js (12 + 10), items/gewesten.js (3) en afgeleid/hoofdsteden-nlbe.js (de relaties);
// - controleert elke koppeling (plan v1 par. 3) en stopt bij elke afwijking; niets wordt stil gecorrigeerd;
// - de geometrie komt niet in de repository: een item heeft alleen een verwijzing (GEOREF) naar het bronbestand;
// - twee keer draaien geeft byte-gelijke bestanden.

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { openBron } from "./bronnen/bron.mjs";
import { leesGpkg, leesGeometrie, alleRingen } from "./bronnen/lees-gpkg.mjs";
import { leesGeojson } from "./bronnen/lees-geojson.mjs";
import { binnenVlak } from "./vlakpunt.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var ROOT = path.resolve(HIER, "..", "..");
var SCRIPT = "tools/topo/maak-bestuur-nlbe.mjs";
var BRONNEN = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8"));
var GEB = BRONNEN.cbsGebiedsindelingen2026, STB = BRONNEN.statbel;
var PEIL_REFNIS = "2026-01-01";
var GRONDWET = { id: "OV", uitgever: "Belgische Senaat", document: "Grondwet, art. 5 (gecoordineerde tekst, brochure 2025)", url: "https://senaat.be/doc/20250625_GRONDWET.pdf", geraadpleegd: "2026-11-18" };
// letterlijk uit de Grondwet, art. 5 (A6, gelezen op 18-11-2026)
export var ART5 = {
  "02000": { passage: "Het Vlaamse Gewest omvat de provincies Antwerpen, Limburg, Oost-Vlaanderen, Vlaams-Brabant en West-Vlaanderen.", provincies: ["Antwerpen", "Limburg", "Oost-Vlaanderen", "Vlaams-Brabant", "West-Vlaanderen"] },
  "03000": { passage: "Het Waalse Gewest omvat de provincies Henegouwen, Luik, Luxemburg, Namen en Waals-Brabant.", provincies: ["Henegouwen", "Luik", "Luxemburg", "Namen", "Waals-Brabant"] }
};
var BESLUIT_K3 = "GPT 18-11-2026 K3 a: de naam Friesland (T1 par. 2.1), met Fryslân (CBS) als variant";

function fout(t) { throw new Error(t); }
function sorteer(a, k) { return a.slice().sort(function(x, y) { return x[k] < y[k] ? -1 : x[k] > y[k] ? 1 : 0; }); }

// ---- REFNIS: de geldige records op de peildatum, met de keten naar boven ----
export function leesRefnis(buf) {
  var tekst = buf.toString("utf8").replace(/^﻿/, "");
  var regels = tekst.split(/\r?\n/).filter(function(r) { return r.length; });
  var kop = regels[0].split("|");
  var verwacht = ["LVL_REFNIS", "CD_REFNIS", "CD_SUP_REFNIS", "TX_REFNIS_DE", "TX_REFNIS_FR", "TX_REFNIS_NL", "DT_VLDT_START", "DT_VLDT_END"];
  if (kop.join() !== verwacht.join()) fout("REFNIS: onverwachte kolommen");
  function datum(s) { var m = s.split("/"); return m[2] + "-" + m[1] + "-" + m[0]; }
  var geldig = {};
  regels.slice(1).forEach(function(r) {
    var v = r.split("|");
    if (v.length !== 8) fout("REFNIS: regel met " + v.length + " velden");
    if (datum(v[6]) <= PEIL_REFNIS && PEIL_REFNIS <= datum(v[7])) {
      if (geldig[v[1]]) fout("REFNIS: dubbele geldige code " + v[1]);
      geldig[v[1]] = { niveau: Number(v[0]), code: v[1], boven: v[2] === "-" ? null : v[2], fr: v[4], nl: v[5] };
    }
  });
  function keten(code) { var uit = [], c = code; while (c) { var r = geldig[c]; if (!r) fout("REFNIS: onbekende code " + c); uit.push(r); c = r.boven; } return uit; }
  function provincieVan(code) { var k = keten(code).filter(function(r) { return r.niveau === 2; }); return k.length ? k[0].code : null; }
  function gewestVan(code) { var k = keten(code).filter(function(r) { return r.niveau === 1; }); return k.length === 1 ? k[0].code : fout("REFNIS: geen gewest voor " + code); }
  return { geldig: geldig, keten: keten, provincieVan: provincieVan, gewestVan: gewestVan };
}

// ---- de statistische sectoren: per gemeente de provincie en het gewest, en de sleutels ----
export function leesSectoren(buf) {
  var g = leesGeojson(buf, ["cd_sector", "cd_munty_refnis", "cd_prov_refnis", "cd_rgn_refnis", "dt_situation"]);
  if (g.crs !== "EPSG:3812") fout("sectoren: onverwacht CRS " + g.crs);
  return g;
}

export async function bouw(paden) {
  var gpkg = openBron(paden.gpkg, "CBSGEB", GEB.gpkg.bestand);
  if (gpkg.sha256 !== GEB.gpkg.sha256) fout("SHA-256 van CBSGEB wijkt af van cbsGebiedsindelingen2026");
  var refnisBron = openBron(paden.refnis, "STB", STB.refnis.txt.bestand);
  if (refnisBron.sha256 !== STB.refnis.txt.sha256) fout("SHA-256 van REFNIS wijkt af van statbel.refnis");
  var sectBron = openBron(paden.sectoren, "STB", STB.sectoren.geojson.bestand);
  if (sectBron.sha256 !== STB.sectoren.geojson.sha256) fout("SHA-256 van de sectoren wijkt af van statbel.sectoren");
  var ovrBron = openBron(path.join(HIER, "ov-rollen-nlbe.json"), "tabellenNlbe", "tools/topo/ov-rollen-nlbe.json");
  var sbeBron = openBron(path.join(HIER, "steden-be.json"), "tabellenNlbe", "tools/topo/steden-be.json");
  var snlBron = openBron(path.join(HIER, "steden-nl.json"), "besluiten", "tools/topo/steden-nl.json");
  var OVR = JSON.parse(ovrBron.buf.toString("utf8")), SBE = JSON.parse(sbeBron.buf.toString("utf8")), SNL = JSON.parse(snlBron.buf.toString("utf8"));
  var SNLITEMS = (await import(pathToFileURL(path.join(ROOT, "src/core/topo/items/steden-nl.js")).href)).STEDEN;
  var LANDEN = (await import(pathToFileURL(path.join(ROOT, "src/core/topo/items/landen.js")).href)).LANDEN;

  // ---- Nederland: CBS Gebiedsindelingen 2026 ----
  var prov = await leesGpkg(gpkg.buf, "provincie_gegeneraliseerd", ["statcode", "statnaam", "jrstatcode"], "geom", "statcode");
  if (prov.crs !== GEB.gpkg.crs) fout("CBSGEB: onverwacht CRS " + prov.crs);
  if (prov.records.length !== GEB.lagen.provincie_gegeneraliseerd) fout("CBSGEB: niet 12 provincies maar " + prov.records.length);
  var reg = await leesGpkg(gpkg.buf, "gebiedsindelingen_register", ["gm_code", "pv_code", "pv_naam"], "fid", "gm_code");
  if (reg.records.length !== GEB.lagen.gebiedsindelingen_register) fout("CBSGEB: register heeft niet 342 gemeenten");
  var pvNaam = {};
  reg.records.forEach(function(r) { var k = r.kenmerken; if (pvNaam[k.pv_code] && pvNaam[k.pv_code] !== k.pv_naam) fout("CBSGEB: twee namen voor " + k.pv_code); pvNaam[k.pv_code] = k.pv_naam; });
  var cbsBron = { id: "CBSGEB", bestand: GEB.gpkg.bestand, sha256: GEB.gpkg.sha256, laag: "provincie_gegeneraliseerd", jaargang: GEB.jaargang, gedownload: GEB.gedownload };
  var nlVlak = {}, PROV = [];
  prov.records.forEach(function(r) {
    var k = r.kenmerken;
    if (!/^PV[0-9]{2}$/.test(k.statcode) || k.jrstatcode !== GEB.jaargang + k.statcode) fout("CBSGEB: onverwachte code " + k.statcode + " " + k.jrstatcode);
    if (pvNaam[k.statcode] !== k.statnaam) fout("CBSGEB: naam in het register wijkt af voor " + k.statcode);
    if (!SNL.provinciehoofdsteden.lijst[k.statnaam]) fout("CBSGEB: provincie niet in steden-nl.json: " + k.statnaam);
    nlVlak[k.statcode] = alleRingen(leesGeometrie(r.geom));
    var naam = k.statnaam === "Fryslân"
      ? { waarde: "Friesland", varianten: ["Fryslân"], herkomst: "besluit", status: "vastgesteld", besluit: BESLUIT_K3, controle: { id: "CBSGEB", waarde: k.statnaam } }
      : { waarde: k.statnaam, varianten: [], herkomst: "bron", status: "vastgesteld", bron: cbsBron };
    PROV.push({
      id: "prov-nl-" + k.statcode.toLowerCase(), soort: "provincie", naam: naam,
      feiten: { land: { waarde: "NLD", herkomst: "bron", status: "vastgesteld", bron: cbsBron }, code: { waarde: k.statcode, herkomst: "bron", status: "vastgesteld", bron: cbsBron } },
      geometrie: { bron: { bronId: "CBSGEB", bestand: GEB.gpkg.bestand, sha256: GEB.gpkg.sha256, laag: "provincie_gegeneraliseerd", sleutel: "statcode", waarde: k.statcode, crs: GEB.gpkg.crs }, kaart: {} },
      relaties: []
    });
  });
  if (Object.keys(pvNaam).length !== 12) fout("CBSGEB: register noemt niet 12 provincies");

  // ---- Belgie: REFNIS en de statistische sectoren ----
  var RF = leesRefnis(refnisBron.buf);
  var niveau = function(n) { return sorteer(Object.keys(RF.geldig).map(function(c) { return RF.geldig[c]; }).filter(function(r) { return r.niveau === n; }), "code"); };
  var gewesten = niveau(1), provBe = niveau(2);
  if (gewesten.length !== 3 || provBe.length !== 10) fout("REFNIS: niet 3 gewesten en 10 provincies");
  var sect = leesSectoren(sectBron.buf);
  var gemProv = {}, gemGew = {}, sleutelsProv = {}, sleutelsGew = {};
  sect.records.forEach(function(r) {
    var k = r.kenmerken, g = k.cd_munty_refnis;
    if (k.dt_situation !== "2024/01/01") fout("sectoren: andere situatie " + k.dt_situation + " bij " + k.cd_sector);
    if (gemProv[g] !== undefined && (gemProv[g] !== k.cd_prov_refnis || gemGew[g] !== k.cd_rgn_refnis)) fout("sectoren: gemeente " + g + " in twee provincies of gewesten");
    gemProv[g] = k.cd_prov_refnis; gemGew[g] = k.cd_rgn_refnis;
    if (k.cd_prov_refnis !== null) sleutelsProv[k.cd_prov_refnis] = (sleutelsProv[k.cd_prov_refnis] || 0) + 1;
    sleutelsGew[k.cd_rgn_refnis] = (sleutelsGew[k.cd_rgn_refnis] || 0) + 1;
  });
  // elke gemeente uit de sectoren bestaat in REFNIS en heeft daar dezelfde provincie en hetzelfde gewest
  Object.keys(gemProv).forEach(function(g) {
    if (!RF.geldig[g] || RF.geldig[g].niveau !== 4) fout("sectoren: gemeente niet geldig in REFNIS: " + g);
    if (RF.provincieVan(g) !== gemProv[g]) fout("sectoren en REFNIS: andere provincie voor " + g);
    if (RF.gewestVan(g) !== gemGew[g]) fout("sectoren en REFNIS: ander gewest voor " + g);
    if (gemProv[g] === null && gemGew[g] !== "04000") fout("sectoren: gemeente zonder provincie buiten Brussel: " + g);
  });
  if (Object.keys(sleutelsProv).sort().join() !== provBe.map(function(r) { return r.code; }).join()) fout("sectoren: de provinciesleutels zijn niet de 10 REFNIS-provincies");
  if (Object.keys(sleutelsGew).sort().join() !== gewesten.map(function(r) { return r.code; }).join()) fout("sectoren: de gewestsleutels zijn niet de 3 REFNIS-gewesten");
  var refnisBronFeit = { id: "STB", bestand: STB.refnis.txt.bestand, sha256: STB.refnis.txt.sha256, geldigOp: PEIL_REFNIS, laatsteWijziging: STB.refnis.laatsteWijziging, gedownload: STB.refnis.gedownload };
  function sectRef(sleutel, waarde) { return { bronId: "STB", bestand: STB.sectoren.geojson.bestand, sha256: STB.sectoren.geojson.sha256, sleutel: sleutel, waarde: waarde, crs: STB.sectoren.geojson.crs, aggregatie: "de vereniging van de statistische sectoren met deze sleutel", situatie: STB.sectoren.situatie }; }
  provBe.forEach(function(r) {
    var naam = r.nl.replace(/^Provincie /, "");
    if (naam === r.nl) fout("REFNIS: provincienaam zonder Provincie: " + r.nl);
    var art = ART5[r.boven];
    if (!art || art.provincies.indexOf(naam) < 0) fout("Grondwet art. 5: " + naam + " niet bij gewest " + r.boven);
    var grondwet = {}; Object.keys(GRONDWET).forEach(function(k) { grondwet[k] = GRONDWET[k]; }); grondwet.passage = art.passage;
    PROV.push({
      id: "prov-be-" + r.code, soort: "provincie",
      naam: { waarde: naam, varianten: [], herkomst: "bron", status: "vastgesteld", bron: grondwet, controle: { id: "STB", waarde: r.nl } },
      feiten: { land: { waarde: "BEL", herkomst: "bron", status: "vastgesteld", bron: refnisBronFeit }, code: { waarde: r.code, herkomst: "bron", status: "vastgesteld", bron: refnisBronFeit } },
      geometrie: { bron: sectRef("cd_prov_refnis", r.code), kaart: {} },
      relaties: []
    });
  });
  // de Grondwet noemt precies deze 10
  [ "02000", "03000" ].forEach(function(gw) { var a = provBe.filter(function(r) { return r.boven === gw; }).map(function(r) { return r.nl.replace(/^Provincie /, ""); }).sort().join(); if (a !== ART5[gw].provincies.slice().sort().join()) fout("Grondwet art. 5 en REFNIS verschillen voor " + gw); });
  var GEW = gewesten.map(function(r) {
    return {
      id: "gewest-be-" + r.code, soort: "gewest",
      naam: { waarde: r.nl, varianten: [], herkomst: "bron", status: "vastgesteld", bron: refnisBronFeit },
      feiten: { land: { waarde: "BEL", herkomst: "bron", status: "vastgesteld", bron: refnisBronFeit }, code: { waarde: r.code, herkomst: "bron", status: "vastgesteld", bron: refnisBronFeit } },
      geometrie: { bron: sectRef("cd_rgn_refnis", r.code), kaart: {} },
      relaties: []
    };
  });

  // ---- de relaties (plan v1 par. 3) ----
  var REL = [];
  var perProvNl = {}; PROV.forEach(function(p) { perProvNl[p.id] = p; });
  function provNlVanNaam(cbsNaam) { var x = PROV.filter(function(p) { return p.feiten.land.waarde === "NLD" && (p.naam.waarde === cbsNaam || (p.naam.controle && p.naam.controle.waarde === cbsNaam)); }); return x.length === 1 ? x[0] : fout("geen unieke NL-provincie voor " + cbsNaam); }
  // R3, Nederland: 12 afgeleide koppelingen (H1 a)
  var R3 = OVR.rollen.R3, gezienNl = {};
  Object.keys(SNL.provinciehoofdsteden.lijst).sort().forEach(function(cbsNaam) {
    var kern = SNL.provinciehoofdsteden.lijst[cbsNaam];
    var st = SNLITEMS.filter(function(s) { return s.geometrie.bron.waarde === kern; });
    if (st.length !== 1) fout("R3: geen uniek stad-item voor kern " + kern);
    st = st[0];
    if (R3.steden.indexOf(st.naam.waarde) < 0) fout("R3: " + st.naam.waarde + " staat niet in de CBS-lijst van 2003");
    if (st.feiten.provincie.waarde !== cbsNaam || st.feiten.provincie.herkomst !== "bron") fout("R3: het CBS-feit provincie van " + st.id + " is niet " + cbsNaam);
    var p = provNlVanNaam(cbsNaam);
    var rd = st.geometrie.punt.rd;
    if (!binnenVlak(rd, nlVlak[p.feiten.code.waarde])) fout("R3: het punt van " + st.id + " ligt niet in het CBS-vlak van " + cbsNaam);
    if (gezienNl[st.id]) fout("R3: stad twee keer: " + st.id); gezienNl[st.id] = 1;
    REL.push({ type: "provinciehoofdstad-van", van: st.id, naar: p.id, kwalificaties: {}, herkomst: "afgeleid", status: "vastgesteld",
      afleiding: { script: SCRIPT, invoer: [{ bronId: "tabellenNlbe", sha256: ovrBron.sha256 }, { bronId: "CBS", sha256: st.feiten.provincie.bron.sha256 }, { bronId: "besluiten", sha256: snlBron.sha256 }, { bronId: "CBSGEB", sha256: gpkg.sha256 }],
        regel: "rol provinciehoofdstad uit CBS 2003 (ov-rollen-nlbe.json R3); de provincie uit het CBS-feit provincie van de kern (Bevolkingskernen 2021) en steden-nl.json; gecontroleerd: het punt ligt in het provincievlak van CBS Gebiedsindelingen 2026" } });
  });
  if (Object.keys(gezienNl).length !== 12 || R3.steden.length !== 12) fout("R3: niet 12 provinciehoofdsteden");
  // R9, Belgie: 5 Vlaamse (bron) en 5 Waalse (afgeleid)
  var VL = OVR.rollen["R9-VL"], WA = OVR.rollen["R9-WA"];
  Object.keys(VL.passages).sort().forEach(function(pc) {
    var x = VL.passages[pc], t = SBE.steden[x.stad];
    if (!t) fout("R9-VL: stad niet in steden-be.json: " + x.stad);
    if (RF.provincieVan(t.refnis) !== pc) fout("R9-VL: de gemeente van " + x.stad + " ligt volgens REFNIS niet in " + pc);
    if (x.kop !== RF.geldig[pc].nl) fout("R9-VL: de kop " + x.kop + " is niet de REFNIS-naam van " + pc);
    var b = { id: "OV", uitgever: VL.bron.uitgever, document: VL.bron.document, url: VL.bron.url, kop: x.kop, passage: x.passage, geraadpleegd: OVR.geraadpleegd };
    REL.push({ type: "provinciehoofdstad-van", van: x.stad, naar: "prov-be-" + pc, kwalificaties: {}, herkomst: "bron", status: "vastgesteld", bron: b });
  });
  Object.keys(WA.steden).sort().forEach(function(sid) {
    var t = SBE.steden[sid];
    if (!t) fout("R9-WA: stad niet in steden-be.json: " + sid);
    var pc = RF.provincieVan(t.refnis);
    if (!pc || RF.gewestVan(pc) !== "03000") fout("R9-WA: geen Waalse provincie voor " + sid);
    if (gemProv[t.refnis] !== pc) fout("R9-WA: de sectoren van " + sid + " liggen niet in " + pc);
    if (RF.geldig[t.refnis].fr !== WA.steden[sid]) fout("R9-WA: de Franse REFNIS-naam van " + sid + " is niet " + WA.steden[sid]);
    REL.push({ type: "provinciehoofdstad-van", van: sid, naar: "prov-be-" + pc, kwalificaties: {}, herkomst: "afgeleid", status: "vastgesteld",
      afleiding: { script: SCRIPT, invoer: [{ bronId: "tabellenNlbe", sha256: ovrBron.sha256 }, { bronId: "tabellenNlbe", sha256: sbeBron.sha256 }, { bronId: "STB", sha256: refnisBron.sha256 }, { bronId: "STB", sha256: sectBron.sha256 }],
        regel: "chef-lieu de province uit IWEPS (ov-rollen-nlbe.json R9-WA); de provincie uit Statbel REFNIS (gemeente, arrondissement, provincie, geldig op " + PEIL_REFNIS + "), gecontroleerd met de statistische sectoren 2024" } });
  });
  // elke provincie precies een hoofdstad
  PROV.forEach(function(p) { var n = REL.filter(function(r) { return r.type === "provinciehoofdstad-van" && r.naar === p.id; }).length; if (n !== 1) fout("provincie met " + n + " hoofdsteden: " + p.id); });
  // R6: Namen, hoofdstad van het Waals Gewest (bron)
  var R6 = OVR.rollen.R6, namen = SBE.steden[R6.stad];
  if (!namen || RF.gewestVan(namen.refnis) !== R6.doel.replace("gewest-be-", "")) fout("R6: Namen ligt niet in het Waals Gewest");
  REL.push({ type: "gewesthoofdstad-van", van: R6.stad, naar: R6.doel, kwalificaties: {}, herkomst: "bron", status: "vastgesteld", bron: { id: "OV", uitgever: R6.bron.uitgever, document: R6.bron.document, url: R6.bron.url, passage: R6.bron.passage, geraadpleegd: OVR.geraadpleegd } });
  // R1: Amsterdam, hoofdstad van Nederland (koppeling aan het item, afgeleid)
  var R1 = OVR.rollen.R1, ams = SNLITEMS.filter(function(s) { return s.naam.waarde === "Amsterdam"; });
  if (ams.length !== 1 || ams[0].id !== R1.stad) fout("R1: geen uniek stad-item Amsterdam");
  var nld = LANDEN.filter(function(l) { return l.id === "NLD"; })[0];
  if (!nld.feiten.hoofdstad.rollen.some(function(r) { return r.rol === "hoofdstad" && r.stad === "Amsterdam" && r.bron.document === R1.bron.document; })) fout("R1: landen.js heeft niet dezelfde rol");
  REL.push({ type: "hoofdstad-van", van: R1.stad, naar: "NLD", kwalificaties: {}, herkomst: "afgeleid", status: "vastgesteld",
    afleiding: { script: SCRIPT, invoer: [{ bronId: "tabellenNlbe", sha256: ovrBron.sha256 }, { bronId: "CBS", sha256: ams[0].feiten.cbs.bron.sha256 }], regel: "rol hoofdstad uit de Grondwet, art. 32 (ov-rollen-nlbe.json R1, gelijk aan landen.js); het enige stad-item met de naam Amsterdam in Nederland" } });
  // open rollen leveren geen relatie
  Object.keys(OVR.open).forEach(function(k) { var o = OVR.open[k]; if (REL.some(function(r) { return r.type === o.rol && r.naar === o.doel; })) fout("open rol met een relatie: " + k); });
  REL = REL.slice().sort(function(a, b) { var x = a.type + "|" + a.van + "|" + a.naar, y = b.type + "|" + b.van + "|" + b.naar; return x < y ? -1 : x > y ? 1 : 0; });
  PROV = sorteer(PROV, "id");
  // ---- punten voor de open lijst ----
  var limburg = PROV.filter(function(p) { return p.naam.waarde === "Limburg"; }).map(function(p) { return p.id; });
  var AFW = [
    { id: "nlbe-refnis-2019", soort: "bron", tekst: "Statbel REFNIS: de laatste wijziging in het bestand is van " + STB.refnis.laatsteWijziging + "; " + STB.refnis.beperking + ". Gebruikt op " + PEIL_REFNIS + "; geen gevolg voor de 3 gewesten, de 10 provincies en de 11 steden" },
    { id: "nlbe-sectoren-2022", soort: "bron", tekst: "Statbel, statistische sectoren: situatie " + STB.sectoren.situatie + ", gemeentegrenzen " + STB.sectoren.gemeentegrenzen + " (A3: de peildatum van het eigen bronbestand)" },
    { id: "nlbe-provincie-gegeneraliseerd", soort: "bron", tekst: "CBS Gebiedsindelingen " + GEB.jaargang + ": " + GEB.beperking + "; de provincievlakken zijn de officiele gegeneraliseerde laag" },
    { id: "nlbe-peildata-h1", soort: "peildatum", tekst: "H1: de provincie van een hoofdstad komt uit de CBS-kern (2021-01-01) en is gecontroleerd tegen het provincievlak van CBS Gebiedsindelingen " + GEB.jaargang + " (A3: beide versies in de afleiding); alle 12 komen overeen" },
    { id: "nlbe-r2-regeringszetel-nl", soort: "rol", tekst: "R2 Den Haag, regeringszetel van Nederland: " + OVR.open.R2.status + "; " + OVR.open.R2.reden + ". Geen relatie, geen vraag" },
    { id: "nlbe-r8-hoofdstad-bhg", soort: "rol", tekst: "R8 hoofdstad van het Brussels Hoofdstedelijk Gewest: " + OVR.open.R8.status + "; " + OVR.open.R8.reden + ". Geen relatie, geen vraag" },
    { id: "nlbe-r7-vlaamse-gemeenschap", soort: "rol", tekst: "R7 Brussel, hoofdstad van de Vlaamse Gemeenschap: bewezen (Vlaamse overheid), " + OVR.zonderRelatie.R7.reden },
    { id: "nlbe-naam-limburg", soort: "naam", tekst: "Twee provincies met de voorkeursnaam Limburg (" + limburg.join(", ") + "): de namen zijn uniek per soort en land, niet per soort alleen (plan v2 par. 5.7); te beslissen hoe een vraag ze onderscheidt" }
  ];
  if (limburg.length !== 2) fout("verwacht twee provincies Limburg");
  return { PROV: PROV, GEW: GEW, REL: REL, AFW: AFW };
}

function regel(naam, waarde) { return "export var " + naam + " = " + JSON.stringify(waarde) + ";\n"; }
var KOP = "// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.\n";
export function schrijf(uit, r) {
  fs.mkdirSync(path.join(uit, "items"), { recursive: true });
  fs.mkdirSync(path.join(uit, "afgeleid"), { recursive: true });
  fs.writeFileSync(path.join(uit, "items", "provincies.js"), "// GEGENEREERD door tools/topo/maak-bestuur-nlbe.mjs uit CBS Gebiedsindelingen 2026, Statbel REFNIS en de statistische sectoren 2024 (SHA-256 in tools/topo/bronnen.json); niet met de hand bewerken.\n" + KOP + regel("PROVINCIES", r.PROV) + "// punten voor de open lijst (src/core/topo/open-vragen.md)\n" + regel("AFWIJKINGEN_BESTUUR", r.AFW));
  fs.writeFileSync(path.join(uit, "items", "gewesten.js"), "// GEGENEREERD door tools/topo/maak-bestuur-nlbe.mjs uit Statbel REFNIS en de statistische sectoren 2024 (SHA-256 in tools/topo/bronnen.json); niet met de hand bewerken.\n" + KOP + regel("GEWESTEN", r.GEW));
  fs.writeFileSync(path.join(uit, "afgeleid", "hoofdsteden-nlbe.js"), "// GEGENEREERD door tools/topo/maak-bestuur-nlbe.mjs uit tools/topo/ov-rollen-nlbe.json, steden-be.json, steden-nl.json en de bronnen; niet met de hand bewerken.\n// De hoofdstadrelaties van Nederland en Belgie (bouwplan T2b-2 fase 6.2 v3); per relatie de herkomst (bron of afgeleid).\n" + KOP + regel("HOOFDSTEDEN_NLBE", r.REL));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  var r = await bouw({ gpkg: process.argv[2], refnis: process.argv[3], sectoren: process.argv[4] });
  schrijf(process.argv[5], r);
  console.log(JSON.stringify({ provincies: r.PROV.length, gewesten: r.GEW.length, relaties: r.REL.length }));
}
