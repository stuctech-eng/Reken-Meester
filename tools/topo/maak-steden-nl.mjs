// De Nederlandse steden (plan T2b par. 1.4, D6; bouwplan D6-3). Alleen bouwomgeving, niet in de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node maak-steden-nl.mjs <CBS_bevolkingskernen_2021.gpkg> <uitvoermap>
// - controleert de SHA-256 van het GeoPackage tegen bronnen.json (cbsBevolkingskernen2021);
// - leest alle kernen, past de selectieregel toe (steden-nl.json) en controleert de tabel tegen het bestand;
// - bepaalt per stad een punt binnen het eigen CBS-vlak: de pool van ontoegankelijkheid (vlakpunt.mjs), in RD (meters);
// - zet dat punt om van EPSG:28992 naar EPSG:4326 met proj4, in de volgorde [lon, lat];
// - schrijft items/steden-nl.js; twee keer draaien geeft een byte-gelijk bestand.

import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import proj4 from "proj4";
import { pool, binnenVlak, getekendeAfstand, oppervlak } from "./vlakpunt.mjs";
import { openBron, CRS } from "./bronnen/bron.mjs";
import { leesGpkg, leesGeometrie, alleRingen } from "./bronnen/lees-gpkg.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var GPKG = process.argv[2];
var UIT = process.argv[3];
var require = createRequire(import.meta.url);
var BRON = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8")).cbsBevolkingskernen2021;
var TABEL_BRON = openBron(path.join(HIER, "steden-nl.json"), "besluiten", "tools/topo/steden-nl.json");
var TABEL = JSON.parse(TABEL_BRON.buf.toString("utf8"));
// besluitRegel: alleen bij een Groot-kern waarvan de weergavenaam afwijkt van de CBS-naam en die geen besluittekst heeft
// (bouwplan T2b-2 fase 6.1 v1.9, par. 3.0); naam.besluit blijft letterlijk
var BESLUITREGEL = "GPT 17-11-2026 D6-d: Groot-kern, weergavenaam = de hoofdplaats uit de CBS-naam";

// de CRS-definities staan in de bronlaag (bronnen/bron.mjs)
export var RD = CRS["EPSG:28992"];
export var WGS84 = "EPSG:4326";
export var PRECISIE_M = 1;

export async function leesKernen(gpkgPad) {
  var bron = openBron(gpkgPad, "CBS", BRON.gpkg.bestand);
  if (bron.sha256 !== BRON.gpkg.sha256) throw new Error("SHA-256 van het register wijkt af van cbsBevolkingskernen2021");
  var laag = await leesGpkg(bron.buf, "bevolkingskernen", ["kernnummer", "naam_2021", "provincie", "grootteklasse", "aantal_inwoners", "opp_land_ha", "opp_water_ha"], "geom", "kernnummer");
  var kernen = laag.records.map(function(r) {
    var v = r.kenmerken;
    return { kernnummer: v.kernnummer, naam: v.naam_2021, provincie: v.provincie, grootteklasse: v.grootteklasse, inwoners: v.aantal_inwoners, oppLandHa: v.opp_land_ha, oppWaterHa: v.opp_water_ha, geom: r.geom };
  });
  return { lastChange: laag.lastChange, srsId: Number(laag.crs.split(":")[1]), kernen: kernen };
}

// ---- het itemmodel (bouwplan T2b-2 fase 6.1 v1.9, par. 3.0 en 3.2): dezelfde waarden, met herkomst en status per FEIT ----
function metHS(feit, herkomst, status) { var x = {}; Object.keys(feit).forEach(function(k) { x[k] = feit[k]; }); x.herkomst = herkomst; x.status = status; return x; }
function naarItem(r, cbsBron) {
  var gpkgInvoer = { bronId: "CBS", sha256: BRON.gpkg.sha256 };
  var naamWijkt = r.naam.waarde !== r.cbs.naam;
  var naam = metHS(r.naam, naamWijkt ? "besluit" : "bron", "vastgesteld");
  if (naamWijkt && !(typeof r.naam.besluit === "string" && r.naam.besluit.trim())) {
    if (!r.naam.grootKern) throw new Error("afwijkende naam zonder besluit en geen Groot-kern: " + r.id);
    naam.besluitRegel = BESLUITREGEL;
  }
  var feiten = {
    selectie: { waarde: r.selectie, herkomst: "afgeleid", status: "vastgesteld", afleiding: { script: "tools/topo/maak-steden-nl.mjs", invoer: [gpkgInvoer, { bronId: "besluiten", sha256: TABEL_BRON.sha256 }], regel: "minstens " + TABEL.grens + " inwoners (" + TABEL.onderdrukt + " uitgesloten), plus de 12 provinciehoofdsteden" } },
    cbs: { waarde: r.cbs, herkomst: "bron", status: "vastgesteld", bron: cbsBron },
    inwoners: metHS(r.inwoners, "bron", "vastgesteld"),
    provincie: metHS(r.provincie, "bron", "vastgesteld"),
    beperking: r.beperking,
    samenstelling: r.samenstelling ? { waarde: r.samenstelling.tekst, bron: r.samenstelling.bron, herkomst: "bron", status: "vastgesteld" } : r.samenstelling,
    notities: r.notities
  };
  if (r.provinciehoofdstadSelectie) feiten.provinciehoofdstadSelectie = r.provinciehoofdstadSelectie;
  var punt = {};
  Object.keys(r.punt).forEach(function(k) { punt[k] = r.punt[k]; });
  punt.herkomst = "afgeleid";
  punt.status = "vastgesteld";
  punt.afleiding = { script: r.punt.bron.script, invoer: [gpkgInvoer], regel: "pool van ontoegankelijkheid, " + PRECISIE_M + " m, RD naar WGS84" };
  return {
    id: r.id,
    soort: r.soort,
    naam: naam,
    feiten: feiten,
    geometrie: { punt: punt, bron: { bronId: "CBS", bestand: BRON.gpkg.bestand, sha256: BRON.gpkg.sha256, sleutel: "kernnummer", waarde: r.cbs.kernnummer, crs: "EPSG:28992" }, kaart: {} },
    relaties: []
  };
}

function rond5(v) { return Math.round(v * 1e5) / 1e5; }

async function hoofd() {
  var bron = await leesKernen(GPKG);
  if (bron.srsId !== 28992) throw new Error("onverwacht CRS: " + bron.srsId);
  if (bron.lastChange.slice(0, 10) !== BRON.bestandsdatum) throw new Error("bestandsdatum wijkt af: " + bron.lastChange);
  var perKern = {};
  bron.kernen.forEach(function(k) {
    if (perKern[k.kernnummer]) throw new Error("dubbel kernnummer: " + k.kernnummer);
    if (!k.geom) throw new Error("geen geometrie: " + k.kernnummer);
    if (typeof k.inwoners !== "number" || (k.inwoners !== TABEL.onderdrukt && (k.inwoners < 0 || k.inwoners % 5 !== 0))) throw new Error("inwonertal niet op vijftallen: " + k.kernnummer + " " + k.inwoners);
    perKern[k.kernnummer] = k;
  });
  // ---- selectie ----
  var hs = TABEL.provinciehoofdsteden.lijst, hsKern = {};
  Object.keys(hs).forEach(function(p) { if (hsKern[hs[p]]) throw new Error("twee provincies met dezelfde kern"); hsKern[hs[p]] = p; });
  var gekozen = bron.kernen.filter(function(k) { return k.inwoners !== TABEL.onderdrukt && k.inwoners >= TABEL.grens; }).map(function(k) { return k.kernnummer; });
  Object.keys(hsKern).forEach(function(n) { if (!perKern[n]) throw new Error("hoofdstad-kern bestaat niet: " + n); if (gekozen.indexOf(n) < 0) gekozen.push(n); });
  var tabelKernen = Object.keys(TABEL.steden);
  if (gekozen.slice().sort().join() !== tabelKernen.slice().sort().join()) throw new Error("steden-nl.json bevat niet precies de geselecteerde kernen");
  var rdNaarWgs = proj4(RD, WGS84);
  var proj4Versie = JSON.parse(fs.readFileSync(require.resolve("proj4/package.json"), "utf8")).version;
  var cbsBron = { id: "CBS", url: BRON.url, bestand: BRON.gpkg.bestand, sha256: BRON.gpkg.sha256, peildatum: BRON.peildatum, gedownload: BRON.gedownload };
  var puntBron = { id: "script", script: "tools/topo/maak-steden-nl.mjs", methode: "pool van ontoegankelijkheid (vlakpunt.mjs), precisie " + PRECISIE_M + " m in RD, in het grootste deel; afgerond op hele meters", omzetting: "EPSG:28992 naar " + WGS84 + " met proj4 " + proj4Versie + ", volgorde [lon, lat], 5 decimalen", rdDefinitie: RD, bronSha256: BRON.gpkg.sha256 };
  var AFW = [];
  function afw(id, soort, tekst) { AFW.push({ id: id, soort: soort, tekst: tekst }); }
  var ids = {}, namen = {};
  var STEDEN = gekozen.slice().sort(function(a, b) { return perKern[b].inwoners - perKern[a].inwoners || (a < b ? -1 : 1); }).map(function(n) {
    var k = perKern[n], t = TABEL.steden[n];
    if (t.cbsNaam !== k.naam) throw new Error("CBS-naam in steden-nl.json wijkt af: " + n + " " + k.naam);
    if (ids[t.id] || namen[t.naam]) throw new Error("dubbele id of naam: " + t.id);
    ids[t.id] = 1; namen[t.naam] = 1;
    var delen = leesGeometrie(k.geom), ringen = alleRingen(delen);
    var grootste = delen.slice().sort(function(a, b) { return oppervlak(b) - oppervlak(a); })[0];
    var p = pool(grootste, PRECISIE_M), rd = [Math.round(p.x), Math.round(p.y)];
    if (!binnenVlak(rd, ringen) || getekendeAfstand(rd, ringen) <= 0) throw new Error("punt niet binnen het vlak: " + n);
    var ll = rdNaarWgs.forward(rd);
    var grootKern = k.naam.indexOf("Groot - ") === 0;
    var selectie = [];
    if (k.inwoners >= TABEL.grens) selectie.push("grens");
    if (hsKern[n]) selectie.push("provinciehoofdstad");
    var rec = {
      id: t.id,
      soort: "stad",
      selectie: selectie,
      naam: { waarde: t.naam, grootKern: grootKern, varianten: t.varianten || [], besluit: t.besluit || null, bron: cbsBron },
      cbs: { kernnummer: k.kernnummer, naam: k.naam, provincie: k.provincie, grootteklasse: k.grootteklasse },
      inwoners: { waarde: k.inwoners, eenheid: "bevolkingskern", afronding: "vijftallen", peildatum: BRON.peildatum, beperking: TABEL.beperkingAlgemeen, bron: cbsBron },
      provincie: { waarde: k.provincie, bron: cbsBron },
      punt: { lon: rond5(ll[0]), lat: rond5(ll[1]), rd: rd, bron: puntBron },
      beperking: grootKern ? TABEL.beperkingGrootKern : null,
      samenstelling: t.samenstelling || null,
      notities: (t.notities || []).map(function(x) {
        var z = perKern[x.kernnummer];
        if (!z || z.naam !== x.cbsNaam) throw new Error("notitie verwijst naar een onbekende kern: " + x.kernnummer);
        return { kernnummer: x.kernnummer, cbsNaam: z.naam, inwoners: z.inwoners, tekst: x.tekst, bron: cbsBron };
      })
    };
    if (hsKern[n]) rec.provinciehoofdstadSelectie = { provincie: hsKern[n], rol: false, toelichting: "alleen een selectiereden (T1 par. 2.1); geen bewezen rol; de relatie provinciehoofdstad-van komt in een latere stap" };
    var slug = t.id.replace("stad-nl-", "");
    if (t.kwestie === "naam") afw("steden-naam-" + slug, "naam", "weergavenaam " + t.naam + ", CBS-naam " + k.naam + " (" + n + "); " + t.besluit);
    if (t.kwestie === "notitie") afw("steden-notitie-" + slug, "notitie", t.naam + ": " + rec.notities.map(function(x) { return x.cbsNaam + " (" + x.kernnummer + ", " + x.inwoners + " inwoners) " + x.tekst; }).join("; ") + "; " + t.besluit);
    var band = TABEL.controleband;
    if (k.inwoners >= band[0] && k.inwoners <= band[1]) afw("steden-band-" + slug, "band", k.naam + ": " + k.inwoners + " inwoners, binnen de controleband " + band[0] + " tot " + band[1]);
    return rec;
  });
  // kernen in de controleband die niet geselecteerd zijn
  bron.kernen.forEach(function(k) { var band = TABEL.controleband; if (!TABEL.steden[k.kernnummer] && k.inwoners >= band[0] && k.inwoners <= band[1]) afw("steden-band-" + k.kernnummer, "band", k.naam + ": " + k.inwoners + " inwoners, binnen de controleband, niet geselecteerd"); });
  var groot = STEDEN.filter(function(r) { return r.naam.grootKern; });
  afw("steden-grootkernen", "grootkern", groot.length + " Groot-kernen: " + groot.map(function(r) { return r.cbs.naam; }).join(", ") + ". " + TABEL.beperkingGrootKern + ". Samenstelling alleen vermeld met een officiele bron (nu alleen Den Haag)");
  afw("steden-beperking-inwoners", "beperking", TABEL.beperkingAlgemeen + "; peildatum " + BRON.peildatum + ", afgerond op vijftallen");
  TABEL.nietAlsKern.namen.forEach(function(nm) { if (bron.kernen.some(function(k) { return k.naam === nm; })) throw new Error("staat wel als kernnaam in het bestand: " + nm); });
  afw("steden-niet-als-kern", "niet-als-kern", TABEL.nietAlsKern.namen.join(", ") + " komen niet als kernnaam voor. " + TABEL.nietAlsKern.toelichting);
  afw("steden-provinciehoofdstad-geen-rol", "selectiereden", TABEL.provinciehoofdsteden.toelichting);
  afw("steden-bestandsdatum", "bron", "bestandsdatum " + BRON.bestandsdatum + " (" + BRON.bestandsdatumBron + "); peildatum blijft " + BRON.peildatum);
  var onder = bron.kernen.filter(function(k) { return k.inwoners === TABEL.onderdrukt; });
  afw("steden-onderdrukt", "onderdrukt", onder.length + " kernen met de onderdrukte waarde " + TABEL.onderdrukt + ", niet als inwonertal gebruikt, alle buiten de selectie: " + onder.map(function(k) { return k.kernnummer + " " + k.naam; }).join(", "));
  AFW.sort(function(a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; });
  var TELLING = { kernenInBron: bron.kernen.length, steden: STEDEN.length, grens: STEDEN.filter(function(r) { return r.selectie.indexOf("grens") >= 0; }).length, alleenProvinciehoofdstad: STEDEN.filter(function(r) { return r.selectie.join() === "provinciehoofdstad"; }).length, grootKernen: groot.length };
  function regel(naam, waarde) { return "export var " + naam + " = " + JSON.stringify(waarde) + ";\n"; }
  var tekst = "// GEGENEREERD door tools/topo/maak-steden-nl.mjs uit CBS Bevolkingskernen 2021 (SHA-256 in tools/topo/bronnen.json) en tools/topo/steden-nl.json; niet met de hand bewerken.\n" +
    "// Peildatum van de bevolking: " + BRON.peildatum + ". Inwonertallen zijn die van de bevolkingskern, niet van de gemeente of woonplaats.\n" +
    "// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.\n" +
    regel("TELLING_STEDEN", TELLING) +
    regel("STEDEN", STEDEN.map(function(r) { return naarItem(r, cbsBron); })) +
    "// punten voor de open lijst (src/core/topo/open-vragen.md)\n" +
    regel("AFWIJKINGEN_STEDEN", AFW);
  fs.mkdirSync(UIT, { recursive: true });
  fs.writeFileSync(path.join(UIT, "steden-nl.js"), tekst);
  console.log(JSON.stringify({ telling: TELLING, afwijkingen: AFW.length }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await hoofd();
