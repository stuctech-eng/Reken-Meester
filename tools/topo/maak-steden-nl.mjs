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
import crypto from "crypto";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import initSqlJs from "sql.js";
import proj4 from "proj4";
import { pool, binnenVlak, getekendeAfstand, oppervlak } from "./vlakpunt.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var GPKG = process.argv[2];
var UIT = process.argv[3];
var require = createRequire(import.meta.url);
var BRON = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8")).cbsBevolkingskernen2021;
var TABEL = JSON.parse(fs.readFileSync(path.join(HIER, "steden-nl.json"), "utf8"));

// EPSG:28992 (Amersfoort / RD New) met de 7-parametertransformatie naar WGS84, zoals EPSG die publiceert
export var RD = "+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=565.417,50.3319,465.552,-0.398957,0.343988,-1.8774,4.0725 +units=m +no_defs";
export var WGS84 = "EPSG:4326";
export var PRECISIE_M = 1;

function sha(buf) { return crypto.createHash("sha256").update(buf).digest("hex"); }

// ---- GeoPackage-geometrie (OGC GeoPackage 1.x): kop "GP", versie, vlaggen, srs_id, envelop; daarna WKB ----
export function leesGeometrie(b) {
  if (b[0] !== 0x47 || b[1] !== 0x50) throw new Error("geen GeoPackage-geometrie (magic)");
  var vlag = b[3], envelop = (vlag >> 1) & 7, leeg = (vlag >> 4) & 1;
  if (leeg) throw new Error("lege geometrie");
  var envLengte = [0, 32, 48, 48, 64][envelop];
  if (envLengte === undefined) throw new Error("ongeldige envelop-indicator " + envelop);
  var dv = new DataView(b.buffer, b.byteOffset, b.byteLength), o = 8 + envLengte;
  function byteOrde() { var le = b[o] === 1; o += 1; return le; }
  function u32(le) { var v = dv.getUint32(o, le); o += 4; return v; }
  function f64(le) { var v = dv.getFloat64(o, le); o += 8; return v; }
  function polygoon() {
    var le = byteOrde(), t = u32(le);
    if (t !== 3) throw new Error("verwacht Polygon (3), kreeg " + t);
    var n = u32(le), ringen = [];
    for (var i = 0; i < n; i++) {
      var m = u32(le), r = [];
      for (var j = 0; j < m; j++) { var x = f64(le), y = f64(le); r.push([x, y]); }
      ringen.push(r);
    }
    return ringen;
  }
  var le = byteOrde(), type = u32(le);
  var delen;
  if (type === 6) { var k = u32(le); delen = []; for (var i = 0; i < k; i++) delen.push(polygoon()); }
  else if (type === 3) { o -= 5; delen = [polygoon()]; }
  else throw new Error("alleen 2D Polygon of MultiPolygon, kreeg type " + type);
  if (o !== b.length) throw new Error("WKB niet volledig gelezen");
  delen.forEach(function(d) { d.forEach(function(r) { var a = r[0], z = r[r.length - 1]; if (r.length < 4 || a[0] !== z[0] || a[1] !== z[1]) throw new Error("ring niet gesloten"); }); });
  return delen;
}
// alle ringen van alle delen samen: even-oneven over het hele multivlak
export function alleRingen(delen) { var a = []; delen.forEach(function(d) { d.forEach(function(r) { a.push(r); }); }); return a; }

export async function leesKernen(gpkgPad) {
  var buf = fs.readFileSync(gpkgPad);
  if (sha(buf) !== BRON.gpkg.sha256) throw new Error("SHA-256 klopt niet voor " + gpkgPad);
  var SQL = await initSqlJs();
  var db = new SQL.Database(new Uint8Array(buf));
  var inhoud = db.exec("select last_change, srs_id from gpkg_contents where table_name = 'bevolkingskernen'")[0].values[0];
  var res = db.exec("select kernnummer, naam_2021, provincie, grootteklasse, aantal_inwoners, opp_land_ha, opp_water_ha, geom from bevolkingskernen order by kernnummer")[0];
  var kernen = res.values.map(function(v) {
    return { kernnummer: v[0], naam: v[1], provincie: v[2], grootteklasse: v[3], inwoners: v[4], oppLandHa: v[5], oppWaterHa: v[6], geom: v[7] };
  });
  db.close();
  return { lastChange: inhoud[0], srsId: inhoud[1], kernen: kernen };
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
    regel("STEDEN", STEDEN) +
    "// punten voor de open lijst (src/core/topo/open-vragen.md)\n" +
    regel("AFWIJKINGEN_STEDEN", AFW);
  fs.mkdirSync(UIT, { recursive: true });
  fs.writeFileSync(path.join(UIT, "steden-nl.js"), tekst);
  console.log(JSON.stringify({ telling: TELLING, afwijkingen: AFW.length }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await hoofd();
