// De wereldtest van de kennisbank (bouwplan T2b-2 fase 6.1 v1.12, par. 5). Alleen bouwomgeving, niet in de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node test-kennisbank.mjs
// Controleert alle items (landen, steden) en de afgeleide relaties uit randen.js, en daarna de mutanten: elke mutant
// moet gevangen worden door de groep controles die erbij hoort.

import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { execFileSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";
import * as L from "../../src/core/topo/items/landen.js";
import * as S from "../../src/core/topo/items/steden-nl.js";
import * as RANDEN from "../../src/core/topo/afgeleid/randen.js";
import { SOORT_PER_ID } from "../../src/core/topo/soorten.js";
import { RELATIES, maakRelaties, RELATIES_HEEN } from "../../src/core/topo/relaties.js";
import { REGISTER } from "../../src/core/topo/bronnen.js";
import * as IX from "../../src/core/topo/relatie-index.js";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var ROOT = path.resolve(HIER, "..", "..");
var BRONNEN = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8"));
var OVR = JSON.parse(fs.readFileSync(path.join(HIER, "ov-rollen.json"), "utf8"));
function sha(b) { return crypto.createHash("sha256").update(b).digest("hex"); }
function kopie(x) { return JSON.parse(JSON.stringify(x)); }
function gelijk(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
var GROOT_ZONDER_BESLUIT = ["stad-nl-amsterdam", "stad-nl-rotterdam", "stad-nl-utrecht", "stad-nl-eindhoven", "stad-nl-leiden", "stad-nl-dordrecht", "stad-nl-groningen", "stad-nl-haarlem", "stad-nl-heerlen", "stad-nl-nijmegen", "stad-nl-alkmaar"];

// ---- de FEITs van een item, met hun plaats (par. 3.1, 3.2, 3.6); containers en metadata apart ----
function feitenVan(it) {
  var f = [], m = [];
  f.push(["naam", it.naam]);
  if (it.soort === "land") {
    f.push(["feiten.vn", it.feiten.vn]);
    ["alpha3", "alpha2", "numeriek"].forEach(function(k) { f.push(["feiten.iso." + k, it.feiten.iso[k]]); });
    m.push(["feiten.iso", it.feiten.iso]);
    f.push(["feiten.werelddeel", it.feiten.werelddeel]);
    var h = it.feiten.hoofdstad;
    if (h.bijzonder) {
      m.push(["feiten.hoofdstad", h]);
      (h.notities || []).forEach(function(x, i) { m.push(["feiten.hoofdstad.notities[" + i + "]", x]); });
      (h.rollen || []).forEach(function(x, i) { f.push(["feiten.hoofdstad.rollen[" + i + "]", x]); });
      (h.open || []).forEach(function(x, i) { f.push(["feiten.hoofdstad.open[" + i + "]", x]); });
    } else f.push(["feiten.hoofdstad", h]);
    f.push(["feiten.modusEuropa", it.feiten.modusEuropa]);
  } else {
    ["selectie", "cbs", "inwoners", "provincie"].forEach(function(k) { f.push(["feiten." + k, it.feiten[k]]); });
    if (it.feiten.samenstelling) f.push(["feiten.samenstelling", it.feiten.samenstelling]);
    f.push(["geometrie.punt", it.geometrie.punt]);
    (it.feiten.notities || []).forEach(function(x, i) { m.push(["feiten.notities[" + i + "]", x]); });
    if (it.feiten.provinciehoofdstadSelectie) m.push(["feiten.provinciehoofdstadSelectie", it.feiten.provinciehoofdstadSelectie]);
  }
  m.push(["geometrie.bron", it.geometrie.bron]);
  return { feiten: f, metadata: m };
}
function registerSha(id, sha256) { var r = REGISTER[id] || (ctxRegister && ctxRegister[id]); return !!r && Object.keys(r.bestanden).some(function(b) { return r.bestanden[b] === sha256; }); }
var ctxRegister = null;

// ---- alle controles, op een context (zodat de mutanten dezelfde controles doorlopen) ----
function controleer(c) {
  var fouten = [], n = 0;
  function eis(ok, groep, tekst) { n++; if (!ok) fouten.push({ groep: groep, tekst: tekst }); }
  var F = c.fn, reg = c.register;
  ctxRegister = reg;
  function inReg(id) { return !!reg[id]; }
  function shaInReg(id, s) { var r = reg[id]; return !!r && Object.keys(r.bestanden).some(function(b) { return r.bestanden[b] === s; }); }
  var items = c.landen.concat(c.steden), perId = {};
  // ---- ids en hergebruik ----
  items.forEach(function(it) { eis(!perId[it.id], "hergebruik", "id een keer in de kennisbank: " + it.id); perId[it.id] = it; });
  // ---- soorten en geometrie ----
  items.forEach(function(it) {
    var s = SOORT_PER_ID[it.soort];
    eis(!!s, "soort", "bekende soort: " + it.id);
    if (it.soort === "land") eis(!!it.geometrie.bron && it.geometrie.punt === undefined, "soort", "land met een vlakverwijzing: " + it.id);
    if (it.soort === "stad") eis(!!it.geometrie.punt && !!it.geometrie.bron, "soort", "stad met een punt: " + it.id);
    eis(gelijk(it.geometrie.kaart, {}), "georef", "nog geen kaartverwijzingen: " + it.id);
    eis(Array.isArray(it.relaties), "soort", "relaties is een lijst: " + it.id);
  });
  // ---- register (voorwaarde 2) ----
  eis(gelijk(reg, BRONNEN.register.ids) || c.registerMutant, "register", "bronnen.js gelijk aan het blok register van bronnen.json");
  var ne = BRONNEN.naturalEarth.bestanden;
  eis(Object.keys(ne).every(function(b) { return reg.NE && reg.NE.bestanden[b] === ne[b]; }), "register", "register NE gelijk aan naturalEarth");
  eis(reg.TU && reg.TU.bestanden["tools/topo/bron/taalunie-landen.tsv"] === BRONNEN.lijsten["taalunie-landen.tsv"].sha256, "register", "register TU gelijk aan lijsten");
  eis(reg.M49 && reg.M49.bestanden["tools/topo/bron/m49-regio.txt"] === BRONNEN.lijsten["m49-regio.txt"].sha256, "register", "register M49 gelijk aan lijsten");
  eis(reg.CBS && reg.CBS.bestanden["CBS_bevolkingskernen_2021.gpkg"] === BRONNEN.cbsBevolkingskernen2021.gpkg.sha256, "register", "register CBS gelijk aan cbsBevolkingskernen2021");
  eis(reg.WC && reg.WC.bestanden["countries.json"] === BRONNEN.worldCountries.countriesJson, "register", "register WC gelijk aan worldCountries");
  [["UN", "tools/topo/vn-lidstaten.json"], ["besluiten", "tools/topo/steden-nl.json"], ["TU", "tools/topo/bron/taalunie-landen.tsv"], ["M49", "tools/topo/bron/m49-regio.txt"]].forEach(function(x) {
    var s = reg[x[0]] && reg[x[0]].bestanden[x[1]];
    eis(/^[0-9a-f]{64}$/.test(s || "") && s === sha(fs.readFileSync(path.join(ROOT, x[1]))), "register", "SHA-256 in het register klopt met het bestand: " + x[1]);
  });
  var telBron = {};
  function bronnenIn(o) { if (!o || typeof o !== "object") return; if (Array.isArray(o)) { o.forEach(bronnenIn); return; } Object.keys(o).forEach(function(k) { if (k === "bron" && o.bron && typeof o.bron === "object" && o.bron.id) telBron[o.bron.id] = (telBron[o.bron.id] || 0) + 1; bronnenIn(o[k]); }); }
  items.forEach(bronnenIn);
  Object.keys(telBron).forEach(function(id) { eis(inReg(id), "register", "bron-id in het register: " + id); });
  var verwachtTel = kopie(c.oudeBronTelling); verwachtTel.CBS += c.steden.length;
  function gesorteerd(o) { var u = {}; Object.keys(o).sort().forEach(function(k) { u[k] = o[k]; }); return u; }
  eis(gelijk(gesorteerd(telBron), gesorteerd(verwachtTel)), "register", "telling per bron-id gelijk aan d1f5eab plus cbs.bron per stad (" + JSON.stringify(telBron) + ")");
  // ---- FEITs: herkomst, status, bewijs ----
  var tal = { rolBewezen: 0, open: 0, openBewezen: 0, gewoonBewezen: 0, gnq: 0, containers: 0, notities: 0, modusBewezen: 0, libieNiet: 0, puntBewezen: 0 };
  items.forEach(function(it) {
    var x = feitenVan(it);
    x.feiten.forEach(function(p) {
      var plaats = p[0], f = p[1], wie = it.id + " " + plaats;
      if (!f || typeof f !== "object") { eis(false, "status", "FEIT is een object: " + wie); return; }
      eis(IX.HERKOMSTEN.indexOf(f.herkomst) >= 0, "herkomst", "herkomst geldig: " + wie);
      eis(IX.STATUSSEN.indexOf(f.status) >= 0, "status", "status geldig: " + wie);
      eis(IX.combinatieToegestaan(f.herkomst, f.status), "bewijs", "toegestane combinatie herkomst x status: " + wie);
      eis(IX.herkomstCompleet(f), "herkomst", "velden bij de herkomst compleet: " + wie);
      if (f.status === "vastgesteld") eis(!IX.isLeeg(F.waardeVan(f, plaats)), "status", "vastgesteld heeft een waarde: " + wie);
      if (f.herkomst === "bron") eis(f.afleiding === undefined, "bron-per-veld", "een leidende bron (geen afleiding ernaast): " + wie);
      if (plaats === "geometrie.punt" || plaats === "feiten.selectie") eis(f.herkomst === "afgeleid", "herkomst", "verplicht afgeleid: " + wie);
      var b = F.bewezen(f, plaats), v = F.isVraagbaar(f, plaats);
      if (f.status !== "vastgesteld" || f.herkomst === "onderzoek") eis(!b && !v, "vraagbaar", "niet vastgesteld of onderzoek is nooit bewezen of vraagbaar: " + wie);
      if (/rollen\[/.test(plaats) && b) tal.rolBewezen++;
      if (/open\[/.test(plaats)) { tal.open++; if (b) tal.openBewezen++; eis(f.herkomst === "onderzoek", "bewijs", "open rol met herkomst onderzoek: " + wie); }
      if (plaats === "feiten.hoofdstad" && b) tal.gewoonBewezen++;
      if (plaats === "feiten.hoofdstad" && f.status === "te verifiëren") tal.gnq++;
      if (plaats === "feiten.modusEuropa" && b) tal.modusBewezen++;
      if (it.id === "LBY" && /^feiten\.iso\.(alpha2|numeriek)$/.test(plaats) && f.status === "niet aangetoond") tal.libieNiet++;
      if (plaats === "geometrie.punt") {
        if (b) tal.puntBewezen++;
        var zonder = kopie(f); delete zonder.bron;
        eis(F.bewezen(zonder, plaats) === b, "punt", "bewezen van het punt hangt niet af van het oude .bron: " + wie);
        eis(f.waarde === undefined, "punt", "geen veld waarde op het punt: " + wie);
        var inv = f.afleiding && f.afleiding.invoer || [];
        eis(inv.length === 1 && inv[0].bronId === "CBS" && shaInReg("CBS", inv[0].sha256), "register", "invoer van het punt in het register: " + wie);
      }
      if (plaats === "feiten.selectie") {
        var iv = f.afleiding && f.afleiding.invoer || [];
        eis(iv.length === 2 && iv[0].bronId === "CBS" && shaInReg("CBS", iv[0].sha256) && iv[1].bronId === "besluiten" && shaInReg("besluiten", iv[1].sha256), "register", "invoer van selectie: gpkg en steden-nl.json, beide in het register: " + wie);
      }
      if (f.herkomst === "besluit") eis(IX.besluitVerwijzing(f) !== null, "besluit", "precies een geldige besluitverwijzing: " + wie);
      if (f.besluitRegel !== undefined) eis(plaats === "naam" && GROOT_ZONDER_BESLUIT.indexOf(it.id) >= 0, "besluit", "besluitRegel alleen bij de 11 Groot-kernen: " + wie);
      if (plaats === "feiten.iso.alpha3") eis(f.bron && f.bron.id === "M49" && f.controle && f.controle.id === "TU", "bron-per-veld", "alpha3: leidend M49, TU alleen controle: " + wie);
      if (/rollen\[/.test(plaats)) eis(f.bron && f.bron.id === "OV", "bron-per-veld", "rol met bron-id OV: " + wie);
      if (/open\[/.test(plaats)) {
        var o = OVR.landen[it.id] && OVR.landen[it.id].open[Number(plaats.match(/\[([0-9]+)\]/)[1])];
        eis(!!o && o.status === f.status, "bewijs", "status van de open rol letterlijk gelijk aan ov-rollen.json: " + wie);
      }
    });
    x.metadata.forEach(function(p) {
      var o = p[1], wie = it.id + " " + p[0];
      eis(o.herkomst === undefined && o.status === undefined, "metadata", "container of metadata zonder herkomst en status: " + wie);
      if (p[0] === "feiten.hoofdstad") { tal.containers++; eis(!F.bewezen(o, "feiten.hoofdstad"), "metadata", "een container is nooit bewezen: " + wie); }
      if (/notities\[/.test(p[0]) && it.soort === "land") tal.notities++;
    });
    var g = it.geometrie.bron;
    eis(inReg(g.bronId) && reg[g.bronId].bestanden[g.bestand] === g.sha256, "georef", "GEOREF verwijst naar een bestand in het register met dezelfde SHA: " + it.id);
    if (it.soort === "stad") eis(g.waarde === it.feiten.cbs.waarde.kernnummer, "georef", "GEOREF-sleutel gelijk aan het CBS-kernnummer: " + it.id);
    if (typeof it.feiten.beperking === "object" && it.feiten.beperking) eis(false, "metadata", "beperking is metadata: " + it.id);
  });
  eis(tal.rolBewezen === 9, "telling", "9 bewezen rollen (" + tal.rolBewezen + ")");
  eis(tal.open === 8 && tal.openBewezen === 0, "telling", "8 open rollen, geen bewezen (" + tal.open + ")");
  eis(tal.gewoonBewezen === 181, "telling", "181 bewezen gewone hoofdsteden (" + tal.gewoonBewezen + ")");
  eis(tal.gnq === 1, "telling", "1 hoofdstad te verifieren (GNQ)");
  eis(tal.containers === 12, "telling", "12 containers (" + tal.containers + ")");
  eis(tal.notities === 6, "telling", "6 notities bij de hoofdsteden");
  eis(tal.modusBewezen === 194, "telling", "modusEuropa bewezen bij alle 194, ook bij false (" + tal.modusBewezen + ")");
  eis(tal.libieNiet === 2, "telling", "Libie: alpha2 en numeriek niet aangetoond");
  eis(tal.puntBewezen === 29, "telling", "29 bewezen stadspunten (" + tal.puntBewezen + ")");
  // ---- niet-leeg en plaats ----
  eis(F.isLeeg(0) === false && F.isLeeg(false) === false && F.isLeeg([]) === false && F.isLeeg(null) && F.isLeeg(undefined) && F.isLeeg("  "), "leeg", "niet-leeg: 0, false en [] zijn niet leeg; null, undefined en lege tekst wel");
  var gooit = false; try { F.bewezen({ waarde: 1, herkomst: "bron", status: "vastgesteld", bron: { id: "TU" } }); } catch (e) { gooit = true; }
  eis(gooit, "plaats", "bewezen zonder plaats geeft een fout");
  // ---- vraagvoorraad ----
  eis(c.rollenMetVraag.length === 9, "vraagvoorraad", "9 rollen met een vraag");
  c.rollenMetVraag.forEach(function(q) {
    var it = perId[q.land], gevonden = false;
    if (it && it.feiten.hoofdstad.bijzonder) it.feiten.hoofdstad.rollen.forEach(function(r, i) { if (r.rol === q.rol && r.stad === q.stad && F.isVraagbaar(r, "feiten.hoofdstad.rollen[" + i + "]")) gevonden = true; });
    eis(gevonden, "vraagvoorraad", "element van ROLLEN_MET_VRAAG is een vraagbare rol: " + q.land + " " + q.stad);
  });
  var gnq = perId.GNQ;
  eis(gnq && !F.isVraagbaar(gnq.feiten.hoofdstad, "feiten.hoofdstad"), "vraagvoorraad", "GNQ-hoofdstad niet vraagbaar");
  // ---- namen ----
  var perNaam = {};
  items.forEach(function(it) { var k = it.soort + "|" + it.naam.waarde; eis(!perNaam[k], "namen", "voorkeursnaam uniek per soort: " + k); perNaam[k] = it.id; });
  items.forEach(function(it) { (it.naam.varianten || []).forEach(function(v) { var nm = typeof v === "string" ? v : v.naam, k = it.soort + "|" + nm; eis(!perNaam[k] || perNaam[k] === it.id, "namen", "variant is geen naam van een ander item: " + nm); }); });
  // ---- relaties (voorwaarde 3) ----
  var idx = IX.bouwIndex(items, c.afgeleid, c.relaties, c.inverseFn);
  var R = c.relaties || RELATIES;
  function soortVan(id) { return perId[id] ? perId[id].soort : (c.extraSoorten && c.extraSoorten[id]); }
  eis(idx.dubbel.length === 0, "index", "geen dubbele relaties (" + idx.dubbel.length + ")");
  eis(items.every(function(it) { return it.relaties.length === 0; }), "index", "geen relaties weggeschreven in de itembestanden (fase 6.1)");
  idx.heen.forEach(function(r) {
    var t = R[r.type], wie = r.type + " " + r.van + " " + r.naar;
    eis(!!t, "relatiesoort", "relatietype bekend: " + wie);
    if (!t) return;
    eis(!!t.inverse && !!R[t.inverse], "inverse", "relatietype heeft een inverse: " + wie);
    eis(t.bronSoorten.indexOf(soortVan(r.van)) >= 0 && t.doelSoorten.indexOf(soortVan(r.naar)) >= 0, "relatiesoort", "bron- en doelsoort toegestaan: " + wie);
    Object.keys(r.kwalificaties || {}).forEach(function(k) {
      var d = t.kwalificaties[k], w = r.kwalificaties[k];
      eis(!!d && (d.type === "getal" ? Number.isFinite(w) : d.waarden.indexOf(w) >= 0), "relatiesoort", "kwalificatie toegestaan: " + wie + " " + k);
    });
    eis(r.status === "vastgesteld" && F.bewezen(r, "relatie"), "relatiestatus", "relatie vastgesteld en bewezen: " + wie);
    var ik = (t.inverse || "?") + "|" + r.naar + "|" + r.van, lijst = idx.perSleutel[ik] || [];
    var inv = lijst.filter(function(x) { return x !== r; })[0] || (t.symmetrisch && r.van === r.naar ? r : undefined);
    eis(!!inv, "inverse", "inverse in de index: " + wie);
    if (inv) ["status", "herkomst", "afleiding", "kwalificaties"].forEach(function(k) { eis(gelijk(inv[k], r[k]), "inverse", "inverse heeft dezelfde " + k + ": " + wie); });
  });
  eis(c.afgeleidVerwacht === undefined || idx.heen.length === c.afgeleidVerwacht, "index", "309 grensrelaties in de index");
  if (c.afgeleidVerwacht !== undefined) {
    var omgezet = 0, andersOmgezet = 0;
    c.afgeleid.forEach(function(r, i) {
      var g = RANDEN.GRENST_AAN[i];
      eis(!!perId[r.van] && !!perId[r.naar] && perId[r.van].soort === "land" && perId[r.naar].soort === "land", "omzetting", "grensrelatie wijst naar bestaande land-id's: " + r.van + " " + r.naar);
      [[g.a, r.van], [g.b, r.naar]].forEach(function(p) { if (p[0] !== p[1]) { if (p[0] === "SDS" && p[1] === "SSD") omgezet++; else andersOmgezet++; } });
    });
    eis(omgezet === 6 && andersOmgezet === 0, "omzetting", "precies 6 codes omgezet, alle SDS naar SSD (" + omgezet + ", anders " + andersOmgezet + ")");
  }
  return { fouten: fouten, n: n };
}

// ---- de normale context ----
function telOudeBronnen() {
  var t = {};
  ["src/core/topo/items/landen.js", "src/core/topo/items/steden-nl.js"].forEach(function(p) {
    var s = execFileSync("git", ["show", "d1f5eab:" + p], { cwd: ROOT }).toString();
    var m = s.match(/"bron":\{"id":"([A-Za-z0-9]+)"/g) || [];
    m.forEach(function(x) { var id = x.split("\"")[5]; t[id] = (t[id] || 0) + 1; });
  });
  return t;
}
var OUD_TEL = telOudeBronnen();
function basis() {
  return {
    landen: kopie(L.LANDEN), steden: kopie(S.STEDEN), rollenMetVraag: kopie(L.ROLLEN_MET_VRAAG), register: kopie(REGISTER),
    afgeleid: IX.grensRelaties(RANDEN, L.LANDEN), afgeleidVerwacht: 309, relaties: undefined, inverseFn: undefined, oudeBronTelling: OUD_TEL,
    fn: { waardeVan: IX.waardeVan, bewezen: IX.bewezen, isVraagbaar: IX.isVraagbaar, isLeeg: IX.isLeeg }
  };
}
var uit = controleer(basis());
console.log((uit.fouten.length ? "FOUT" : "GOED") + ": " + (uit.n - uit.fouten.length) + " controles geslaagd, " + uit.fouten.length + " mislukt");
uit.fouten.slice(0, 20).forEach(function(f) { console.log("  - [" + f.groep + "] " + f.tekst); });

// ---- mutanten: [naam, verwachte groep, wijziging van de context] ----
function land(c, id) { return c.landen.filter(function(r) { return r.id === id; })[0]; }
function stad(c, id) { return c.steden.filter(function(r) { return r.id === id; })[0]; }
function fnMet(c, extra) { Object.keys(extra).forEach(function(k) { c.fn[k] = extra[k]; }); }
var MUT = [
  ["S1 open rol IDN in ROLLEN_MET_VRAAG", "vraagvoorraad", function(c) { c.rollenMetVraag.push({ land: "IDN", rol: "hoofdstad", label: "hoofdstad op de peildatum", stad: "Jakarta" }); }],
  ["S1b open rol IDN met herkomst bron in de voorraad", "vraagvoorraad", function(c) { land(c, "IDN").feiten.hoofdstad.open[0].herkomst = "bron"; c.rollenMetVraag.push({ land: "IDN", rol: "hoofdstad", label: "x", stad: "Jakarta" }); }],
  ["S2 isVraagbaar negeert te verifieren", "vraagvoorraad", function(c) { fnMet(c, { isVraagbaar: function(f, p, o) { var g = kopie(f); if (g.status === "te verifiëren") g.status = "vastgesteld"; return IX.isVraagbaar(g, p, o); } }); }],
  ["S3 bron met status onzeker vraagbaar", "vraagbaar", function(c) { fnMet(c, { isVraagbaar: function(f, p, o) { if (f.herkomst === "bron") { var g = kopie(f); g.status = "vastgesteld"; return IX.isVraagbaar(g, p, o); } return IX.isVraagbaar(f, p, o); } }); }],
  ["bewijs: open rol vastgesteld met herkomst onderzoek", "bewijs", function(c) { land(c, "NLD").feiten.hoofdstad.open[0].status = "vastgesteld"; }],
  ["bewijs: bewezen negeert de status", "vraagbaar", function(c) { fnMet(c, { bewezen: function(f, p) { var g = kopie(f); g.status = "vastgesteld"; return IX.bewezen(g, p); } }); }],
  ["bewijs: bewezen telt onderzoek als bewijs", "telling", function(c) { fnMet(c, { bewezen: function(f, p) { if (f && f.herkomst === "onderzoek") return true; return IX.bewezen(f, p); } }); }],
  ["bewijs: FEIT zonder status", "status", function(c) { delete land(c, "FRA").feiten.vn.status; }],
  ["bewijs: GNQ zonder te verifieren", "telling", function(c) { land(c, "GNQ").feiten.hoofdstad.status = "vastgesteld"; }],
  ["bewijs: status open rol gedeeltelijk naar onzeker", "bewijs", function(c) { land(c, "BDI").feiten.hoofdstad.open[0].status = "onzeker"; }],
  ["register: UN zonder SHA", "register", function(c) { c.register.UN.bestanden = {}; c.registerMutant = true; }],
  ["register: SHA van vn-lidstaten fout", "register", function(c) { c.register.UN.bestanden["tools/topo/vn-lidstaten.json"] = "0".repeat(64); c.registerMutant = true; }],
  ["register: bron-id niet in het register (OV naar DIRCO)", "register", function(c) { land(c, "ZAF").feiten.hoofdstad.rollen[0].bron.id = "DIRCO"; }],
  ["register: bestaand blok gewijzigd (TU-SHA)", "register", function(c) { c.register.TU.bestanden["tools/topo/bron/taalunie-landen.tsv"] = "1".repeat(64); c.registerMutant = true; }],
  ["register: besluiten weggelaten", "register", function(c) { delete c.register.besluiten; c.registerMutant = true; }],
  ["register: andere SHA voor steden-nl.json", "register", function(c) { c.register.besluiten.bestanden["tools/topo/steden-nl.json"] = "2".repeat(64); c.registerMutant = true; }],
  ["bron per veld: twee leidende bronnen", "bron-per-veld", function(c) { land(c, "DEU").feiten.vn.afleiding = { script: "x", regel: "x", invoer: [{ bronId: "NE", sha256: "a".repeat(64) }] }; }],
  ["bron per veld: alpha3 met bron TU", "bron-per-veld", function(c) { land(c, "DEU").feiten.iso.alpha3.bron.id = "TU"; }],
  ["bron per veld: aanvulling als bron", "herkomst", function(c) { var r = land(c, "ZAF").feiten.hoofdstad.rollen[1]; delete r.bron; }],
  ["index: randen-paar in beide richtingen", "index", function(c) { var g = c.afgeleid[0], x = kopie(g); x.van = g.naar; x.naar = g.van; c.afgeleid.push(x); c.afgeleid.push(kopie(g)); c.afgeleidVerwacht = undefined; }],
  ["index: relatie in een itembestand", "index", function(c) { land(c, "NLD").relaties.push({ type: "grenst-aan", naar: "BEL", kwalificaties: {}, herkomst: "afgeleid", status: "vastgesteld" }); }],
  ["relatie: type zonder inverse", "inverse", function(c) { var heen = kopie(RELATIES_HEEN); var R = maakRelaties(heen); delete R["grenst-aan"].inverse; c.relaties = R; }],
  ["relatie: inverseVan laat een kwalificatie weg", "inverse", function(c) { c.inverseFn = function(r, rel) { var i = kopie(IX.inverseVan(r, rel)); delete i.kwalificaties.km; return i; }; }],
  ["relatie: inverseVan wijzigt reikwijdte (bevoegd-in)", "inverse", function(c) {
    c.extraSoorten = { "test-vg": "gemeenschap", "test-bh": "taalgebied" };
    c.afgeleid.push({ type: "bevoegd-in", van: "test-vg", naar: "test-bh", kwalificaties: { reikwijdte: "instellingen" }, herkomst: "afgeleid", status: "vastgesteld", afleiding: { script: "test", regel: "test", invoer: [{ bronId: "OV", sha256: "b".repeat(64) }] } });
    c.afgeleidVerwacht = undefined;
    c.inverseFn = function(r, rel) { var i = kopie(IX.inverseVan(r, rel)); if (i.kwalificaties.reikwijdte === "instellingen") i.kwalificaties.reikwijdte = "taalgebied"; return i; };
  }],
  ["relatie: verkeerde doelsoort (land naar stad)", "relatiesoort", function(c) { c.afgeleid.push({ type: "grenst-aan", van: "NLD", naar: "stad-nl-amsterdam", kwalificaties: { km: 1, via: "land" }, herkomst: "afgeleid", status: "vastgesteld", afleiding: c.afgeleid[0].afleiding }); c.afgeleidVerwacht = undefined; }],
  ["relatie: grensrelatie zonder status", "relatiestatus", function(c) { delete c.afgeleid[5].status; }],
  ["relatie: inverse met andere status", "inverse", function(c) { c.inverseFn = function(r, rel) { var i = kopie(IX.inverseVan(r, rel)); i.status = "onzeker"; return i; }; }],
  ["v1.11: inverse mist afleiding", "inverse", function(c) { c.inverseFn = function(r, rel) { var i = kopie(IX.inverseVan(r, rel)); delete i.afleiding; return i; }; }],
  ["v1.11: inverse met gewijzigde afleiding", "inverse", function(c) { c.inverseFn = function(r, rel) { var i = kopie(IX.inverseVan(r, rel)); i.afleiding.invoer[0].sha256 = "c".repeat(64); return i; }; }],
  ["herkomst: punt met herkomst bron", "herkomst", function(c) { stad(c, "stad-nl-breda").geometrie.punt.herkomst = "bron"; }],
  ["herkomst: afgeleid feit zonder afleiding", "herkomst", function(c) { delete stad(c, "stad-nl-breda").feiten.selectie.afleiding; }],
  ["v1.5: waardeVan leest waarde bij een rol", "telling", function(c) { fnMet(c, { bewezen: function(f, p) { if (/rollen\[|open\[/.test(p)) return IX.bewezen(f, "feiten.hoofdstad"); return IX.bewezen(f, p); } }); }],
  ["v1.5: rol met lege stad", "telling", function(c) { land(c, "CIV").feiten.hoofdstad.rollen[0].stad = " "; }],
  ["v1.5: punt zonder herkomst", "herkomst", function(c) { delete stad(c, "stad-nl-zwolle").geometrie.punt.herkomst; }],
  ["v1.5: GEOREF met status", "metadata", function(c) { land(c, "FRA").geometrie.bron.status = "vastgesteld"; }],
  ["v1.6: punt zonder lat", "telling", function(c) { delete stad(c, "stad-nl-assen").geometrie.punt.lat; }],
  ["v1.6: lege afleiding, oud .bron aanwezig, bewezen leest .bron", "punt", function(c) { stad(c, "stad-nl-breda").geometrie.punt.afleiding = {}; fnMet(c, { bewezen: function(f, p) { if (p === "geometrie.punt" && f.bron) return f.status === "vastgesteld"; return IX.bewezen(f, p); } }); }],
  ["v1.7: bewezen zonder plaats gokt", "plaats", function(c) { fnMet(c, { bewezen: function(f, p) { return IX.bewezen(f, p || "naam"); } }); }],
  ["v1.7: truthy-controle (false is leeg)", "telling", function(c) { fnMet(c, { bewezen: function(f, p) { if (p === "feiten.modusEuropa" && !f.waarde) return false; return IX.bewezen(f, p); } }); }],
  ["v1.7: 0 als leeg", "leeg", function(c) { fnMet(c, { isLeeg: function(w) { return !w && w !== false; } }); }],
  ["v1.7: provinciehoofdstadSelectie met status", "metadata", function(c) { stad(c, "stad-nl-assen").feiten.provinciehoofdstadSelectie.status = "vastgesteld"; }],
  ["v1.7: selectie zonder volledige afleiding", "herkomst", function(c) { stad(c, "stad-nl-assen").feiten.selectie.afleiding.invoer = []; }],
  ["v1.8: Libie alpha2 vastgesteld", "status", function(c) { land(c, "LBY").feiten.iso.alpha2.status = "vastgesteld"; }],
  ["v1.8: cbs zonder bron", "herkomst", function(c) { delete stad(c, "stad-nl-tilburg").feiten.cbs.bron; }],
  ["v1.8: besluitRegel weg bij Amsterdam", "besluit", function(c) { delete stad(c, "stad-nl-amsterdam").naam.besluitRegel; }],
  ["v1.9: selectie alleen met de gpkg", "register", function(c) { stad(c, "stad-nl-assen").feiten.selectie.afleiding.invoer.pop(); }],
  ["v1.9: besluit en besluitRegel allebei", "besluit", function(c) { stad(c, "stad-nl-amsterdam").naam.besluit = "GPT 17-11-2026 D6-d: x"; }],
  ["v1.9: besluitverwijzing zonder herkenbaar begin", "besluit", function(c) { land(c, "BLR").naam.besluit = "besloten door iemand"; }],
  ["v1.9: besluitRegel buiten de 11", "besluit", function(c) { stad(c, "stad-nl-tilburg").naam.besluitRegel = "GPT 17-11-2026 D6-d: x"; }],
  ["v1.10: andere GEOREF-sleutel bij een stad", "georef", function(c) { stad(c, "stad-nl-arnhem").geometrie.bron.waarde = "BK01057"; }],
  ["structuur: container met herkomst en status", "metadata", function(c) { var h = land(c, "BOL").feiten.hoofdstad; h.herkomst = "bron"; h.status = "vastgesteld"; }],
  ["structuur: notitie met status", "metadata", function(c) { land(c, "BEN").feiten.hoofdstad.notities[0].status = "vastgesteld"; }],
  ["structuur: rol verplaatst van open naar rollen", "telling", function(c) { var h = land(c, "MYS").feiten.hoofdstad; var o = h.open.shift(); o.herkomst = "bron"; o.status = "vastgesteld"; o.bron = { id: "OV" }; h.rollen.push(o); }],
  ["hergebruik: twee items met dezelfde id", "hergebruik", function(c) { c.landen.push(kopie(land(c, "NLD"))); }]
];
// ---- mutanten op de omzetting van de grenscodes (v1.13): elk moet de verwachte fout geven ----
var GRENSMUT = [
  ["onbekende code in een kopie van GRENST_AAN", "onbekende grenscode: XXX", function() { var R = kopie({ BRON: RANDEN.BRON, GRENST_AAN: RANDEN.GRENST_AAN }); R.GRENST_AAN[0].a = "XXX"; return [R, kopie(L.LANDEN)]; }],
  ["twee landen met dezelfde GEOREF-sleutel", "dubbele GEOREF-sleutel: SDS (SSD, SDN)", function() { var l = kopie(L.LANDEN); l.filter(function(r) { return r.id === "SDN"; })[0].geometrie.bron.waarde = "SDS"; return [RANDEN, l]; }],
  ["land zonder GEOREF-sleutel", "GEOREF-sleutel ontbreekt: FRA", function() { var l = kopie(L.LANDEN); delete l.filter(function(r) { return r.id === "FRA"; })[0].geometrie.bron.waarde; return [RANDEN, l]; }]
];
var grensUit = GRENSMUT.map(function(m) {
  var a = m[2](), fout = null;
  try { IX.grensRelaties(a[0], a[1]); } catch (e) { fout = e.message; }
  return { naam: m[0], verwacht: m[1], fout: fout, ok: fout === m[1] };
});
var gevangen = 0, gemist = [];
MUT.forEach(function(m) {
  var c = basis();
  m[2](c);
  var r;
  try { r = controleer(c); } catch (e) { r = { fouten: [{ groep: /^geen inverse voor: /.test(e.message) ? "inverse" : "uitzondering", tekst: e.message }] }; }
  var hit = r.fouten.filter(function(f) { return f.groep === m[1]; }).length;
  if (hit) gevangen++; else gemist.push(m[0] + " (verwacht: " + m[1] + "; gevonden: " + (r.fouten.map(function(f) { return f.groep; }).filter(function(g, i, a) { return a.indexOf(g) === i; }).join(", ") || "niets") + ")");
});
// ---- mutanten op de omzetting: test-omzetting.mjs met gewijzigde bestanden moet falen ----
var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "kb-mut-"));
var bronL = fs.readFileSync(path.join(ROOT, "src/core/topo/items/landen.js"), "utf8"), bronS = fs.readFileSync(path.join(ROOT, "src/core/topo/items/steden-nl.js"), "utf8");
function schrijfMut(naam, fL, fS) {
  function zet(src, var1, f) { if (!f) return src; var m = src.match(new RegExp("export var " + var1 + " = (.*);\n")); var x = JSON.parse(m[1]); f(x); return src.replace(m[0], function() { return "export var " + var1 + " = " + JSON.stringify(x) + ";\n"; }); }
  var pl = path.join(tmp, naam + "-landen.js"), ps = path.join(tmp, naam + "-steden.js");
  fs.writeFileSync(pl, zet(bronL, "LANDEN", fL)); fs.writeFileSync(ps, zet(bronS, "STEDEN", fS));
  return [pl, ps];
}
function lid(x, id) { return x.filter(function(r) { return r.id === id; })[0]; }
var OMZ = [
  ["naam gewijzigd", function(x) { lid(x, "FRA").naam.waarde = "Frankrijkk"; }, null],
  ["variant weggehaald", function(x) { lid(x, "BLR").naam.varianten = []; }, null],
  ["rol gewijzigd", function(x) { lid(x, "BOL").feiten.hoofdstad.rollen[1].stad = "El Alto"; }, null],
  ["bron-URL gewijzigd", function(x) { lid(x, "NLD").feiten.vn.bron.url = "https://example.org"; }, null],
  ["bron-id OV naar DIRCO", function(x) { lid(x, "ZAF").feiten.hoofdstad.rollen[0].bron.id = "DIRCO"; }, null],
  ["item weg", function(x) { x.pop(); }, null],
  ["item extra", function(x) { var y = kopie(x[0]); y.id = "XXX"; x.push(y); }, null],
  ["punt 1 m verschoven", null, function(x) { lid(x, "stad-nl-breda").geometrie.punt.rd[0] += 1; }],
  ["onbekend extra veld", function(x) { lid(x, "FRA").feiten.vn.extra = 1; }, null],
  ["waarde op het punt", null, function(x) { var p = lid(x, "stad-nl-breda").geometrie.punt; p.waarde = [p.lon, p.lat]; }],
  ["samenstelling.tekst naast waarde", null, function(x) { var s = lid(x, "stad-nl-den-haag").feiten.samenstelling; s.tekst = s.waarde; }],
  ["selectie buiten het omhulsel", null, function(x) { var r = lid(x, "stad-nl-breda"); r.feiten.selectie = r.feiten.selectie.waarde; }],
  ["oud punt.bron gewijzigd", null, function(x) { lid(x, "stad-nl-breda").geometrie.punt.bron.methode = "anders"; }],
  ["besluitRegel buiten de 11", null, function(x) { lid(x, "stad-nl-tilburg").naam.besluitRegel = "GPT 17-11-2026 D6-d: x"; }],
  ["GEOREF-sleutel stad anders", null, function(x) { lid(x, "stad-nl-arnhem").geometrie.bron.waarde = "BK01057"; }],
  ["GEOREF-waarde land anders dan ne", function(x) { lid(x, "SOM").geometrie.bron.waarde = "SOL"; }, null],
  ["herkomst op een container", function(x) { lid(x, "BOL").feiten.hoofdstad.herkomst = "bron"; }, null]
];
var omzGevangen = 0, omzGemist = [];
OMZ.forEach(function(m, i) {
  var p = schrijfMut("m" + i, m[1], m[2]), faalt = false;
  try { execFileSync("node", [path.join(HIER, "test-omzetting.mjs"), p[0], p[1]], { stdio: "pipe" }); } catch (e) { faalt = true; }
  if (faalt) omzGevangen++; else omzGemist.push(m[0]);
});
console.log("mutanten kennisbank: " + gevangen + " van " + MUT.length + " gevangen door de verwachte groep");
gemist.forEach(function(g) { console.log("  - GEMIST: " + g); });
console.log("mutanten omzetting: " + omzGevangen + " van " + OMZ.length + " gevangen door test-omzetting");
omzGemist.forEach(function(g) { console.log("  - GEMIST: " + g); });
grensUit.forEach(function(g) { console.log("mutant grenscodes: " + g.naam + ": " + (g.ok ? "gevangen" : "GEMIST") + " (fout: " + g.fout + ")"); });
var grensGemist = grensUit.filter(function(g) { return !g.ok; }).length;
process.exit(uit.fouten.length || gemist.length || omzGemist.length || grensGemist ? 1 : 0);
