// Tests voor de provincies, gewesten en hoofdsteden van Nederland en Belgie (bouwplan T2b-2 fase 6.2 v3, deel 1).
// Alleen bouwomgeving, niet in de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node --max-old-space-size=6000 test-bestuur-nlbe.mjs <cbsgebiedsindelingen2026.gpkg> <TU_COM_REFNIS.txt> <sectoren.geojson>
// Twee soorten geometrische controles, apart gemeld:
// - EXACT: berekend op de oorspronkelijke punten en lijnstukken van de bron (doorsneden met polygon-clipping 0.15.7, het
//   samenvoegen van de sectoren via gedeelde randen met topojson, punt-in-vlak). Dit is bewijs voor de bron zoals ze is,
//   op rekenafronding na (de doorsnede-oppervlakte moet onder 1 m2 blijven);
// - STEEKPROEF: punt-in-vlak op een raster met een vaste stap. Dit is geen sluitend bewijs van nul overlap of nul gaten:
//   een opening of overlap smaller dan de stap kan ertussen vallen.
// Daarna de mutanten: elke mutant moet gevangen worden door de groep die erbij hoort.

import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";
import pc from "polygon-clipping";
import { topology } from "topojson-server";
import { merge } from "topojson-client";
import { openBron } from "./bronnen/bron.mjs";
import { leesGpkg, leesGeometrie } from "./bronnen/lees-gpkg.mjs";
import { leesRefnis, leesSectoren } from "./maak-bestuur-nlbe.mjs";
import { binnenVlak } from "./vlakpunt.mjs";
import proj4 from "proj4";
import { CRS_GEOJSON } from "./bronnen/lees-geojson.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var ROOT = path.resolve(HIER, "..", "..");
var GPKG = process.argv[2], REFNIS = process.argv[3], SECT = process.argv[4];
var BRONNEN = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8"));
var OVR = JSON.parse(fs.readFileSync(path.join(HIER, "ov-rollen-nlbe.json"), "utf8"));
var P = await import(pathToFileURL(path.join(ROOT, "src/core/topo/items/provincies.js")).href);
var G = await import(pathToFileURL(path.join(ROOT, "src/core/topo/items/gewesten.js")).href);
var H = await import(pathToFileURL(path.join(ROOT, "src/core/topo/afgeleid/hoofdsteden-nlbe.js")).href);
var SNL = (await import(pathToFileURL(path.join(ROOT, "src/core/topo/items/steden-nl.js")).href)).STEDEN;
var SBE = (await import(pathToFileURL(path.join(ROOT, "src/core/topo/items/steden-be.js")).href)).STEDEN_BE;
var STATUSSEN = ["onderzocht", "bevestigd verschil", "nog onbeslist", "gecorrigeerd"];
var MAX_M2 = 1, RASTER_M = 2000;
function kopie(x) { return JSON.parse(JSON.stringify(x)); }

// ---- geometrie: eenmaal inlezen ----
var gpkgBron = openBron(GPKG, "CBSGEB", BRONNEN.cbsGebiedsindelingen2026.gpkg.bestand);
var refnisBron = openBron(REFNIS, "STB", BRONNEN.statbel.refnis.txt.bestand);
var sectBron = openBron(SECT, "STB", BRONNEN.statbel.sectoren.geojson.bestand);
var RF = leesRefnis(refnisBron.buf);
var nlProv = {};
(await leesGpkg(gpkgBron.buf, "provincie_gegeneraliseerd", ["statcode"], "geom", "statcode")).records.forEach(function(r) { nlProv[r.kenmerken.statcode] = leesGeometrie(r.geom); });
// de gemeentelaag heeft ISO-WKB met Z (MultiPolygon Z, type 1006); de bronlezer kent alleen 2D en mag in 6.2 niet wijzigen,
// dus een eigen lezer in deze test (alleen voor de meting zonder eis); Z wordt overgeslagen
function wkbZ(b) {
  var dv = new DataView(b.buffer, b.byteOffset, b.byteLength), o = 8 + [0, 32, 48, 48, 64][(b[3] >> 1) & 7];
  function poly(le, dim) { var nr = dv.getUint32(o, le); o += 4; var ringen = []; while (nr--) { var np = dv.getUint32(o, le); o += 4; var r = []; for (var i = 0; i < np; i++) { r.push([dv.getFloat64(o, le), dv.getFloat64(o + 8, le)]); o += 8 * dim; } ringen.push(r); } return ringen; }
  var le = b[o] === 1, t = dv.getUint32(o + 1, le); o += 5;
  var dim = t >= 1000 && t < 2000 ? 3 : 2, basisType = t % 1000;
  if (basisType === 3) return [poly(le, dim)];
  if (basisType !== 6) throw new Error("onverwacht WKB-type " + t);
  var k = dv.getUint32(o, le); o += 4; var uit = [];
  for (var j = 0; j < k; j++) { var le2 = b[o] === 1; o += 5; uit.push(poly(le2, dim)); }
  if (o !== b.length) throw new Error("WKB niet volledig gelezen");
  return uit;
}
var nlGem = (await leesGpkg(gpkgBron.buf, "gemeente_niet_gegeneraliseerd", ["statcode"], "geom", "statcode")).records.map(function(r) { return wkbZ(r.geom); });
var sect = leesSectoren(sectBron.buf);
// topologie van alle sectoren, zonder kwantisering: randen zijn gedeeld als de coordinaten exact gelijk zijn
var objecten = sect.records.map(function(r, i) { return { type: "MultiPolygon", coordinates: r.delen, id: i }; });
var topo = topology({ s: { type: "GeometryCollection", geometries: objecten } });
var geoms = topo.objects.s.geometries;
function sleutelBe(r) { return r.kenmerken.cd_prov_refnis === null ? "bhg-" + r.kenmerken.cd_rgn_refnis : r.kenmerken.cd_prov_refnis; }
function groepen(extra) {
  var g = {};
  sect.records.forEach(function(r, i) { var k = sleutelBe(r); (g[k] = g[k] || []).push(i); });
  if (extra) extra(g);
  return g;
}
function samengevoegd(g) { var u = {}; Object.keys(g).sort().forEach(function(k) { u[k] = merge(topo, g[k].map(function(i) { return geoms[i]; })).coordinates; }); return u; }

// ---- oppervlak en hulpfuncties (vlak in meters: RD en Lambert 2008) ----
function oppRing(r) { var s = 0; for (var i = 0; i < r.length - 1; i++) s += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return Math.abs(s / 2); }
function oppMulti(m) { var s = 0; m.forEach(function(p) { p.forEach(function(r, i) { s += i === 0 ? oppRing(r) : -oppRing(r); }); }); return s; }
function bbox(m) { var b = [Infinity, Infinity, -Infinity, -Infinity]; m.forEach(function(p) { p[0].forEach(function(c) { b[0] = Math.min(b[0], c[0]); b[1] = Math.min(b[1], c[1]); b[2] = Math.max(b[2], c[0]); b[3] = Math.max(b[3], c[1]); }); }); return b; }
function raakt(a, b) { return a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3]; }
function inMulti(p, m) { return m.some(function(poly) { return binnenVlak(p, poly); }); }
function buitengrens(m) { return m.map(function(p) { return [p[0]]; }); }
function maxOverlap(vlakken) {
  var k = Object.keys(vlakken), bb = {}, uit = { max: 0, paar: null, paren: 0 };
  k.forEach(function(x) { bb[x] = bbox(vlakken[x]); });
  for (var i = 0; i < k.length; i++) for (var j = i + 1; j < k.length; j++) {
    if (!raakt(bb[k[i]], bb[k[j]])) continue;
    uit.paren++;
    var a = oppMulti(pc.intersection(vlakken[k[i]], vlakken[k[j]]));
    if (a > uit.max) { uit.max = a; uit.paar = k[i] + " x " + k[j]; }
  }
  return uit;
}
function raster(vlakken, referentie, stap) {
  var b = bbox(referentie), uit = { punten: 0, gat: 0, overlap: 0, buiten: 0 };
  var k = Object.keys(vlakken), bb = {};
  k.forEach(function(x) { bb[x] = bbox(vlakken[x]); });
  for (var x = Math.ceil(b[0] / stap) * stap; x <= b[2]; x += stap) for (var y = Math.ceil(b[1] / stap) * stap; y <= b[3]; y += stap) {
    var p = [x, y], ref = inMulti(p, referentie);
    var n = k.filter(function(v) { return x >= bb[v][0] && x <= bb[v][2] && y >= bb[v][1] && y <= bb[v][3] && inMulti(p, vlakken[v]); }).length;
    if (ref) { uit.punten++; if (n === 0) uit.gat++; if (n > 1) uit.overlap++; } else if (n > 0) uit.buiten++;
  }
  return uit;
}

// ---- de metingen op de echte gegevens (eenmaal; de geometrische mutanten rekenen apart) ----
var BE = samengevoegd(groepen());
var BE_ALLES = merge(topo, geoms).coordinates;
var sectorOpp = 0; sect.records.forEach(function(r) { sectorOpp += oppMulti(r.delen); });
var NLM = {}; Object.keys(nlProv).forEach(function(k) { NLM[k] = nlProv[k]; });
var nlGemOpp = 0; nlGem.forEach(function(m) { nlGemOpp += oppMulti(m); });
var nlGemAlles = []; nlGem.forEach(function(m) { m.forEach(function(p) { nlGemAlles.push(p); }); });
function meetBe(vl) {
  var som = 0; Object.keys(vl).forEach(function(k) { som += oppMulti(vl[k]); });
  var bhg = vl["bhg-04000"], vbr = vl["20001"];
  return {
    aantal: Object.keys(vl).length, overlap: maxOverlap(vl), som: som, totaal: oppMulti(BE_ALLES), sectoren: sectorOpp,
    bhgInVbr: oppMulti(pc.intersection(bhg, vbr)), bhgBuitenVbrGrens: oppMulti(pc.difference(bhg, buitengrens(vbr)))
  };
}
var METING = { be: meetBe(BE), nl: { overlap: maxOverlap(NLM), som: Object.keys(NLM).reduce(function(s, k) { return s + oppMulti(NLM[k]); }, 0), gemeenten: nlGemOpp } };
METING.be.raster = raster(BE, BE_ALLES, RASTER_M);
METING.nl.raster = raster(NLM, nlGemAlles, RASTER_M);

// ---- alle controles op een context ----
// het NE-punt in Lambert 2008, voor de punt-in-vlak-controle in de sectoren
var naar3812 = proj4("EPSG:4326", CRS_GEOJSON["EPSG:3812"]);
function basis() {
  var c = { prov: kopie(P.PROVINCIES), gew: kopie(G.GEWESTEN), rel: kopie(H.HOOFDSTEDEN_NLBE), sbe: kopie(SBE), snl: kopie(SNL), meting: METING };
  c.sbe.forEach(function(s) { if (s.geometrie.punt.status === "vastgesteld") s.geometrie.punt.xy3812 = naar3812.forward([s.geometrie.punt.lon, s.geometrie.punt.lat]); });
  return c;
}
function controleer(c) {
  var fouten = [], n = 0;
  function eis(ok, groep, tekst) { n++; if (!ok) fouten.push({ groep: groep, tekst: tekst }); }
  var perId = {};
  c.prov.concat(c.gew, c.sbe, c.snl).forEach(function(it) { eis(!perId[it.id], "ids", "id uniek: " + it.id); perId[it.id] = it; });
  perId.NLD = { soort: "land" }; perId.BEL = { soort: "land" };
  // ---- items ----
  var nl = c.prov.filter(function(p) { return p.feiten.land.waarde === "NLD"; }), be = c.prov.filter(function(p) { return p.feiten.land.waarde === "BEL"; });
  eis(nl.length === 12 && be.length === 10 && c.gew.length === 3, "aantallen", "12 + 10 provincies en 3 gewesten");
  eis(nl.map(function(p) { return p.feiten.code.waarde; }).sort().join() === "PV20,PV21,PV22,PV23,PV24,PV25,PV26,PV27,PV28,PV29,PV30,PV31", "aantallen", "de 12 CBS-codes");
  eis(be.map(function(p) { return p.feiten.code.waarde; }).sort().join() === "10000,20001,20002,30000,40000,50000,60000,70000,80000,90000", "aantallen", "de 10 NIS-codes");
  eis(c.gew.map(function(g) { return g.id; }).sort().join() === "gewest-be-02000,gewest-be-03000,gewest-be-04000", "aantallen", "de 3 gewesten");
  c.prov.concat(c.gew).forEach(function(it) {
    var g = it.geometrie.bron, r = BRONNEN.register.ids[g.bronId];
    eis(!!r && r.bestanden[g.bestand] === g.sha256, "georef", "GEOREF in het register met dezelfde SHA: " + it.id);
    eis(g.waarde === it.feiten.code.waarde, "georef", "GEOREF-sleutel gelijk aan de code: " + it.id);
    var fr = it.naam;
    eis(fr.status === "vastgesteld" && (fr.herkomst === "bron" ? !!fr.bron : fr.herkomst === "besluit" && /^GPT /.test(fr.besluit || "")), "namen", "naam met bron of besluit: " + it.id);
    if (it.soort === "provincie" && it.feiten.land.waarde === "BEL") {
      var gw = RF.gewestVan(it.feiten.code.waarde);
      var art = gw === "02000" ? "Het Vlaamse Gewest omvat de provincies " : "Het Waalse Gewest omvat de provincies ";
      eis(fr.bron && fr.bron.id === "OV" && fr.bron.passage.indexOf(art) === 0 && fr.bron.passage.indexOf(fr.waarde) > 0, "namen", "BE-naam uit de Grondwet art. 5, bij het juiste gewest: " + it.id);
      eis(fr.controle && fr.controle.waarde === "Provincie " + fr.waarde, "namen", "BE-naam gelijk aan Statbel: " + it.id);
    }
  });
  var fries = perId["prov-nl-pv21"];
  eis(!!fries && fries.naam.waarde === "Friesland" && fries.naam.varianten.join() === "Fryslân" && fries.naam.herkomst === "besluit", "namen", "K3: Friesland, variant Fryslân");
  eis(!c.prov.some(function(p) { return p.feiten.code.waarde === "04000" || /bhg/.test(p.id); }), "brussel", "het Brussels Hoofdstedelijk Gewest is geen provincie");
  // ---- relaties ----
  var phs = c.rel.filter(function(r) { return r.type === "provinciehoofdstad-van"; });
  eis(c.rel.length === 24 && phs.length === 22, "aantallen", "24 relaties, waarvan 22 provinciehoofdstad-van (" + c.rel.length + ")");
  c.prov.forEach(function(p) { var k = phs.filter(function(r) { return r.naar === p.id; }).length; eis(k === 1, "hoofdstad", "precies een hoofdstad: " + p.id + " (" + k + ")"); });
  c.rel.forEach(function(r) {
    var wie = r.type + " " + r.van + " " + r.naar;
    eis(!!perId[r.van] && !!perId[r.naar], "relatie", "bron en doel bestaan: " + wie);
    eis(r.status === "vastgesteld", "relatie", "status vastgesteld: " + wie);
    if (r.herkomst === "bron") eis(!!r.bron && r.bron.id === "OV" && !!r.bron.url && r.afleiding === undefined, "herkomst", "bron met OV en zonder afleiding: " + wie);
    else eis(r.herkomst === "afgeleid" && !!r.afleiding && r.afleiding.invoer.length > 0 && r.bron === undefined, "herkomst", "afgeleid met afleiding en zonder bron: " + wie);
    (r.afleiding ? r.afleiding.invoer : []).forEach(function(x) { var reg = BRONNEN.register.ids[x.bronId]; eis(!!reg && Object.keys(reg.bestanden).some(function(b) { return reg.bestanden[b] === x.sha256; }), "herkomst", "invoer in het register: " + wie + " " + x.bronId); });
  });
  // herkomst per groep (H1 a, H3 c)
  var vl = Object.keys(OVR.rollen["R9-VL"].passages).map(function(k) { return OVR.rollen["R9-VL"].passages[k].stad; });
  var wa = Object.keys(OVR.rollen["R9-WA"].steden);
  phs.forEach(function(r) {
    var wie = r.van + " " + r.naar;
    if (/^stad-nl-/.test(r.van)) eis(r.herkomst === "afgeleid" && ["tabellenNlbe", "CBS", "besluiten", "CBSGEB"].every(function(b) { return r.afleiding && r.afleiding.invoer.some(function(x) { return x.bronId === b; }); }), "herkomst", "NL-koppeling afgeleid uit de tabel, de CBS-kern, steden-nl.json en CBSGEB: " + wie);
    if (vl.indexOf(r.van) >= 0) eis(r.herkomst === "bron" && r.bron.passage === "De hoofdplaats van de provincie is " + perId[r.van].naam.waarde + ".", "herkomst", "Vlaamse koppeling bron-direct met de letterlijke passage: " + wie);
    if (wa.indexOf(r.van) >= 0) eis(r.herkomst === "afgeleid" && r.afleiding && r.afleiding.invoer.filter(function(x) { return x.bronId === "STB"; }).length === 2, "statbel", "Waalse koppeling afgeleid met Statbel (REFNIS en sectoren): " + wie);
  });
  // de koppelingen kloppen met de bronnen
  phs.forEach(function(r) {
    var st = perId[r.van], p = perId[r.naar], wie = r.van + " " + r.naar;
    if (!st || !p) return;
    if (/^stad-nl-/.test(r.van)) {
      var cbsNaam = p.naam.controle ? p.naam.controle.waarde : p.naam.waarde;
      eis(st.feiten.provincie.waarde === cbsNaam, "provincienaam", "CBS-feit provincie van de kern gelijk aan de provincie: " + wie);
      eis(inMulti(st.geometrie.punt.rd, nlProv[p.feiten.code.waarde]), "ligging", "EXACT: het punt ligt in het CBS-provincievlak: " + wie);
      eis(OVR.rollen.R3.steden.indexOf(st.naam.waarde) >= 0, "hoofdstad", "in de CBS-lijst van 2003: " + wie);
    } else {
      eis(RF.provincieVan(st.feiten.refnis.waarde) === p.feiten.code.waarde, "ligging", "REFNIS: de gemeente ligt in de provincie: " + wie);
      if (st.geometrie.punt.status === "vastgesteld") eis(inMulti(st.geometrie.punt.xy3812, BE[p.feiten.code.waarde]), "ligging", "EXACT: het NE-punt ligt in het provincievlak (sectoren): " + wie);
    }
  });
  var r6 = c.rel.filter(function(r) { return r.type === "gewesthoofdstad-van"; });
  eis(r6.length === 1 && r6[0].van === "stad-be-namen" && r6[0].naar === "gewest-be-03000" && r6[0].bron.passage === OVR.rollen.R6.bron.passage, "rollen", "R6: alleen Namen, hoofdstad van het Waals Gewest (bron)");
  var r1 = c.rel.filter(function(r) { return r.type === "hoofdstad-van"; });
  eis(r1.length === 1 && r1[0].van === "stad-nl-amsterdam" && r1[0].naar === "NLD", "rollen", "R1: Amsterdam, hoofdstad van Nederland");
  Object.keys(OVR.open).forEach(function(k) { var o = OVR.open[k]; eis(!c.rel.some(function(r) { return r.type === o.rol && r.naar === o.doel; }), "open", "open rol zonder relatie: " + k); });
  eis(!c.rel.some(function(r) { return r.van === "stad-be-brussel" && /^gewest/.test(r.naar); }), "open", "R7 (K1 c) en R8: geen gewestrelatie voor Brussel");
  // Brussel en het Brussels Hoofdstedelijk Gewest hebben geen ligt-in of bevat met een provincie
  var alle = c.rel.slice(); c.sbe.concat(c.prov, c.gew).forEach(function(it) { (it.relaties || []).forEach(function(x) { var y = kopie(x); y.van = it.id; alle.push(y); }); });
  alle.forEach(function(r) {
    var bhgOfBrussel = ["gewest-be-04000", "stad-be-brussel"];
    var metProv = /^prov-/.test(r.van) || /^prov-/.test(r.naar);
    eis(!(metProv && (bhgOfBrussel.indexOf(r.van) >= 0 || bhgOfBrussel.indexOf(r.naar) >= 0)), "brussel", "geen relatie tussen Brussel of het Brussels Hoofdstedelijk Gewest en een provincie: " + r.type + " " + r.van + " " + r.naar);
  });
  // ---- geometrie (de metingen) ----
  var m = c.meting;
  eis(m.be.aantal === 11, "dekking", "EXACT: 11 Belgische vlakken uit de sectoren (10 provincies en het Brussels Hoofdstedelijk Gewest)");
  eis(m.be.overlap.max < MAX_M2, "overlap", "EXACT: geen overlap tussen de 11 Belgische vlakken (grootste doorsnede " + m.be.overlap.max.toFixed(3) + " m2, " + m.be.overlap.paar + ")");
  eis(Math.abs(m.be.som - m.be.sectoren) < MAX_M2 && Math.abs(m.be.totaal - m.be.sectoren) < MAX_M2, "dekking", "EXACT: de 11 samen = alle sectoren = het Belgische grondgebied van Statbel (" + (m.be.som / 1e6).toFixed(3) + " km2, sectoren " + (m.be.sectoren / 1e6).toFixed(3) + " km2)");
  eis(m.be.bhgInVbr < MAX_M2, "brussel", "EXACT: het Brussels Hoofdstedelijk Gewest overlapt Vlaams-Brabant bestuurlijk niet (" + m.be.bhgInVbr.toFixed(3) + " m2)");
  eis(m.be.bhgBuitenVbrGrens < MAX_M2, "brussel", "EXACT: Brussel ligt binnen de buitengrens van Vlaams-Brabant (" + m.be.bhgBuitenVbrGrens.toFixed(3) + " m2 erbuiten)");
  eis(m.nl.overlap.max < MAX_M2, "overlap", "EXACT: geen overlap tussen de 12 CBS-provincies (grootste doorsnede " + m.nl.overlap.max.toFixed(3) + " m2)");
  // steekproef: alleen gemeld, met een eis op de Belgische vlakken (dezelfde bron) en een meting voor NL (andere laag)
  eis(m.be.raster.gat === 0 && m.be.raster.overlap === 0 && m.be.raster.buiten === 0, "dekking", "STEEKPROEF (raster " + RASTER_M + " m): BE " + m.be.raster.punten + " punten, gat " + m.be.raster.gat + ", overlap " + m.be.raster.overlap + ", buiten " + m.be.raster.buiten);
  return { fouten: fouten, n: n };
}

var uit = controleer(basis());
console.log((uit.fouten.length ? "FOUT" : "GOED") + ": " + (uit.n - uit.fouten.length) + " controles geslaagd, " + uit.fouten.length + " mislukt");
uit.fouten.slice(0, 30).forEach(function(f) { console.log("  - [" + f.groep + "] " + f.tekst); });
console.log("EXACT BE: 11 vlakken, " + METING.be.overlap.paren + " paren met rakende omhullende doorgerekend, grootste doorsnede " + METING.be.overlap.max.toFixed(3) + " m2; som " + (METING.be.som / 1e6).toFixed(3) + " km2 = sectoren " + (METING.be.sectoren / 1e6).toFixed(3) + " km2 = geheel " + (METING.be.totaal / 1e6).toFixed(3) + " km2; Brussel in VBR " + METING.be.bhgInVbr.toFixed(3) + " m2, buiten de buitengrens van VBR " + METING.be.bhgBuitenVbrGrens.toFixed(3) + " m2");
console.log("EXACT NL: " + METING.nl.overlap.paren + " paren doorgerekend, grootste doorsnede " + METING.nl.overlap.max.toFixed(3) + " m2");
console.log("MEETWAARDE NL (geen eis): 12 provincies (gegeneraliseerd) " + (METING.nl.som / 1e6).toFixed(1) + " km2, 342 gemeenten (niet gegeneraliseerd) " + (METING.nl.gemeenten / 1e6).toFixed(1) + " km2, verschil " + ((METING.nl.som - METING.nl.gemeenten) / METING.nl.gemeenten * 100).toFixed(2) + " %");
console.log("STEEKPROEF BE (raster " + RASTER_M + " m, referentie: alle sectoren): " + JSON.stringify(METING.be.raster));
console.log("STEEKPROEF NL (raster " + RASTER_M + " m, referentie: de 342 gemeenten; geen eis, de provincielaag is gegeneraliseerd): " + JSON.stringify(METING.nl.raster));

// ---- open lijst ----
var open = {};
fs.readFileSync(path.join(ROOT, "src/core/topo/open-vragen.md"), "utf8").split("\n").forEach(function(r) { var m = /^- ([a-zA-Z0-9-]+) \| ([a-z ]+) \| (.+)$/.exec(r); if (m) open[m[1]] = { status: m[2], uitleg: m[3] }; });
var openFout = P.AFWIJKINGEN_BESTUUR.filter(function(a) { var o = open[a.id]; return !o || STATUSSEN.indexOf(o.status) < 0 || o.uitleg !== a.tekst; });
console.log("open lijst: " + (P.AFWIJKINGEN_BESTUUR.length - openFout.length) + " van " + P.AFWIJKINGEN_BESTUUR.length + " afwijkingen letterlijk op de lijst");

// ---- reproduceerbaar: twee keer draaien, byte-gelijk aan de repository ----
var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bestuur-")), herhaal = [];
[1, 2].forEach(function(k) {
  execFileSync("node", ["--max-old-space-size=6000", path.join(HIER, "maak-bestuur-nlbe.mjs"), GPKG, REFNIS, SECT, path.join(tmp, "r" + k)]);
  ["items/provincies.js", "items/gewesten.js", "afgeleid/hoofdsteden-nlbe.js"].forEach(function(b) { herhaal.push(fs.readFileSync(path.join(tmp, "r" + k, b)).equals(fs.readFileSync(path.join(ROOT, "src/core/topo", b)))); });
});
var reproOk = herhaal.every(Boolean);
console.log("twee keer draaien: " + (reproOk ? "byte-gelijk" : "VERSCHIL") + " (" + herhaal.length + " vergelijkingen)");

// ---- mutanten ----
function rel(c, van) { return c.rel.filter(function(r) { return r.van === van; })[0]; }
function geomMut(extra) { var vl = samengevoegd(groepen(extra)); var m = kopie(METING); m.be = meetBe(vl); m.be.raster = METING.be.raster; return m; }
var eersteVanProv = function(g, k) { return g[k][0]; };
var MUT = [
  ["1 afgeleide Waalse koppeling als bron gemarkeerd", "statbel", function(c) { var r = rel(c, "stad-be-bergen"); delete r.afleiding; r.herkomst = "bron"; r.bron = { id: "OV", url: "x" }; }],
  ["2 Waalse koppeling zonder Statbel, toch vastgesteld", "statbel", function(c) { var r = rel(c, "stad-be-luik"); r.afleiding.invoer = r.afleiding.invoer.filter(function(x) { return x.bronId !== "STB"; }); }],
  ["3 open rol R2 met een relatie", "open", function(c) { c.rel.push({ type: "regeringszetel-van", van: "stad-nl-den-haag", naar: "NLD", kwalificaties: {}, herkomst: "bron", status: "vastgesteld", bron: { id: "OV", url: "x" } }); }],
  ["3b open rol R8 met een relatie", "open", function(c) { c.rel.push({ type: "gewesthoofdstad-van", van: "stad-be-brussel", naar: "gewest-be-04000", kwalificaties: {}, herkomst: "bron", status: "vastgesteld", bron: { id: "OV", url: "x" } }); }],
  ["4 provincie met twee hoofdsteden", "hoofdstad", function(c) { var r = kopie(rel(c, "stad-nl-zwolle")); r.van = "stad-nl-enschede"; c.rel.push(r); }],
  ["5 hoofdstad buiten haar provincie", "ligging", function(c) { rel(c, "stad-nl-zwolle").naar = "prov-nl-pv20"; rel(c, "stad-nl-groningen").naar = "prov-nl-pv23"; }],
  ["6 Brussel ligt-in Vlaams-Brabant", "brussel", function(c) { c.rel.push({ type: "ligt-in", van: "stad-be-brussel", naar: "prov-be-20001", kwalificaties: {}, herkomst: "afgeleid", status: "vastgesteld", afleiding: { script: "x", regel: "x", invoer: [{ bronId: "STB", sha256: refnisBron.sha256 }] } }); }],
  ["9 onbekende provincienaam in het CBS-feit", "provincienaam", function(c) { c.snl.filter(function(s) { return s.id === "stad-nl-assen"; })[0].feiten.provincie.waarde = "Drente"; }],
  ["11a opening in een provinciegebied (een sector van Antwerpen weg)", "dekking", function(c) { c.meting = geomMut(function(g) { g["10000"] = g["10000"].slice(1); }); }],
  ["11b overlap: Antwerpen steekt uit over Oost-Vlaanderen", "overlap", function(c) { c.meting = geomMut(function(g) { g["10000"] = g["10000"].concat([eersteVanProv(g, "40000")]); }); }],
  ["12 Brussels Hoofdstedelijk Gewest gekoppeld aan een provincie", "brussel", function(c) { c.rel.push({ type: "ligt-in", van: "gewest-be-04000", naar: "prov-be-20001", kwalificaties: {}, herkomst: "afgeleid", status: "vastgesteld", afleiding: { script: "x", regel: "x", invoer: [{ bronId: "STB", sha256: refnisBron.sha256 }] } }); }],
  ["12b Brussel als provincie", "brussel", function(c) { var p = kopie(c.prov[0]); p.id = "prov-be-bhg"; p.feiten.code.waarde = "04000"; c.prov.push(p); }]
];
var gevangen = 0, gemist = [];
MUT.forEach(function(m) {
  var c = basis(); m[2](c);
  var r; try { r = controleer(c); } catch (e) { r = { fouten: [{ groep: "uitzondering", tekst: e.message }] }; }
  if (r.fouten.some(function(f) { return f.groep === m[1]; })) gevangen++; else gemist.push(m[0] + " (gevonden: " + r.fouten.map(function(f) { return f.groep; }).filter(function(g, i, a) { return a.indexOf(g) === i; }).join(", ") + ")");
});
// mutant 8: een bronbestand met een andere inhoud (een byte gewijzigd) wordt geweigerd door het script
var kapot = path.join(tmp, "TU_COM_REFNIS.txt"), b8 = Buffer.from(fs.readFileSync(REFNIS)); b8[b8.length - 3] = b8[b8.length - 3] ^ 1; fs.writeFileSync(kapot, b8);
var shaGevangen = false;
try { execFileSync("node", [path.join(HIER, "maak-bestuur-nlbe.mjs"), GPKG, kapot, SECT, path.join(tmp, "m8")], { stdio: "pipe" }); } catch (e) { shaGevangen = /SHA-256 klopt niet/.test(e.stderr.toString()); }
console.log("mutanten: " + gevangen + " van " + MUT.length + " gevangen door de verwachte groep; mutant 8 (SHA van D2): " + (shaGevangen ? "gevangen" : "GEMIST"));
gemist.forEach(function(g) { console.log("  - GEMIST: " + g); });
process.exit(uit.fouten.length || gemist.length || !shaGevangen || !reproOk || openFout.length ? 1 : 0);
