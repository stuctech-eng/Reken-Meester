// Tests voor de Nederlandse steden (plan T2b par. 1.4 en 3.5; bouwplan D6-3). Alleen bouwomgeving, niet in de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node test-steden-nl.mjs <CBS_bevolkingskernen_2021.gpkg> <map met de Natural Earth-bestanden> [steden-nl.js]
// Zonder derde argument: test src/core/topo/items/steden-nl.js, controleert dat het script het byte-gelijk opnieuw maakt
// en dat de proefkaarten byte-gelijk blijven. Met een derde argument (mutanten): alleen de inhoudelijke controles.
// De test leest het GeoPackage zelf opnieuw in, met een eigen WKB-lezer en een eigen punt-in-vlak-controle.

import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { execFileSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";
import initSqlJs from "sql.js";
import proj4 from "proj4";
import { APP_BESTANDEN } from "./app-bestanden.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var ROOT = path.resolve(HIER, "..", "..");
var GPKG = process.argv[2], NE = process.argv[3];
var STANDAARD = path.join(ROOT, "src", "core", "topo", "items", "steden-nl.js");
var DOEL = process.argv[4] ? path.resolve(process.argv[4]) : STANDAARD;
var MUTANT = !!process.argv[4];
var STATUSSEN = ["onderzocht", "bevestigd verschil", "nog onbeslist", "gecorrigeerd"];
var fouten = [], geslaagd = 0;
function eis(ok, tekst) { if (ok) geslaagd++; else fouten.push(tekst); }
function sha(b) { return crypto.createHash("sha256").update(b).digest("hex"); }

var S = await import(pathToFileURL(DOEL).href + "?" + Date.now());
var BRONNEN = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8"));
var B = BRONNEN.cbsBevolkingskernen2021;
var T = JSON.parse(fs.readFileSync(path.join(HIER, "steden-nl.json"), "utf8"));

// ---- bron ----
var buf = fs.readFileSync(GPKG);
eis(sha(buf) === B.gpkg.sha256 && buf.length === B.gpkg.grootte, "SHA-256 en grootte van het GeoPackage");
["url", "pagina", "peildatum", "bestandsdatum", "gedownload", "licentie", "toelichting"].forEach(function(k) { eis(!!B[k], "bronnen.json: " + k); });
eis(B.peildatum === "2021-01-01" && /^[0-9a-f]{64}$/.test(B.zip.sha256) && B.zip.grootte > 0 && !!B.zip.bestand, "bronnen.json: peildatum en zip");

// ---- eigen inlezing ----
var SQL = await initSqlJs();
var db = new SQL.Database(new Uint8Array(buf));
var rijen = db.exec("select kernnummer, naam_2021, provincie, grootteklasse, aantal_inwoners, opp_land_ha, opp_water_ha, geom from bevolkingskernen")[0].values;
var lc = db.exec("select last_change from gpkg_contents where table_name = 'bevolkingskernen'")[0].values[0][0];
db.close();
eis(lc.slice(0, 10) === B.bestandsdatum, "bestandsdatum uit gpkg_contents");
// eigen WKB-lezer: geeft een lijst van polygonen, elk een lijst van ringen
function wkbVlak(b) {
  var dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  var env = { 0: 0, 1: 32, 2: 48, 3: 48, 4: 64 }[(b[3] >> 1) & 7];
  var pos = 8 + env, uit = [];
  function leesPolygoon() {
    var le = dv.getUint8(pos) === 1; pos += 5;
    var nr = dv.getUint32(pos, le); pos += 4;
    var poly = [];
    while (nr--) { var np = dv.getUint32(pos, le); pos += 4; var ring = new Array(np); for (var i = 0; i < np; i++) { ring[i] = [dv.getFloat64(pos, le), dv.getFloat64(pos + 8, le)]; pos += 16; } poly.push(ring); }
    return poly;
  }
  var le0 = dv.getUint8(pos) === 1, t = dv.getUint32(pos + 1, le0);
  if (t === 3) uit.push(leesPolygoon());
  else { pos += 5; var n = dv.getUint32(pos, le0); pos += 4; while (n--) uit.push(leesPolygoon()); }
  return { polygonen: uit, klaar: pos === b.length && (t === 3 || t === 6) };
}
function ringOpp(r) { var s = 0; for (var i = 1; i < r.length; i++) s += (r[i - 1][0] - r[i][0]) * (r[i - 1][1] + r[i][1]); return s / 2; }
function polyOpp(p) { return p.reduce(function(s, r, i) { return s + (i === 0 ? 1 : -1) * Math.abs(ringOpp(r)); }, 0); }
function inRing(x, y, r) { var c = false; for (var i = 1; i < r.length; i++) { var a = r[i - 1], b = r[i]; if ((a[1] <= y) !== (b[1] <= y)) { var xs = a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]); if (xs > x) c = !c; } } return c; }
function inVlak(x, y, polygonen) { var n = 0; polygonen.forEach(function(p) { p.forEach(function(r) { if (inRing(x, y, r)) n++; }); }); return n % 2 === 1; }
function randAfst(x, y, polygonen) {
  var m = Infinity;
  polygonen.forEach(function(p) { p.forEach(function(r) { for (var i = 1; i < r.length; i++) {
    var ax = r[i - 1][0], ay = r[i - 1][1], dx = r[i][0] - ax, dy = r[i][1] - ay, l = dx * dx + dy * dy;
    var t = l ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l)) : 0;
    m = Math.min(m, Math.hypot(ax + t * dx - x, ay + t * dy - y));
  } }); });
  return m;
}
var K = {};
rijen.forEach(function(v) { K[v[0]] = { kernnummer: v[0], naam: v[1], provincie: v[2], grootteklasse: v[3], inwoners: v[4], oppHa: v[5] + v[6], geom: v[7] }; });
eis(Object.keys(K).length === rijen.length && rijen.length === S.TELLING_STEDEN.kernenInBron, "kernnummers uniek; telling van de bron");

// ---- de WKB-lezer klopt: oppervlakte tegen de CBS-velden (afgerond op hele ha) ----
// Tolerantie: de twee CBS-velden zijn elk op hele hectaren afgerond, samen dus hoogstens 1 ha verschil; bij een
// enkele kern aan de kust wijkt de CBS-oppervlakte meer af (Den Helder 16,6 ha = 1,2%). Daarom voor alle kernen
// max(1 ha, 2%) als controle op de lezer; voor de 29 steden strenger: max(1 ha, 0,1%).
var opp = {}, oppFout = 0;
rijen.forEach(function(v) {
  var g = wkbVlak(v[7]), a = g.polygonen.reduce(function(s, p) { return s + polyOpp(p); }, 0) / 1e4;
  opp[v[0]] = { a: a, g: g };
  if (!g.klaar || Math.abs(a - (v[5] + v[6])) > Math.max(1, 0.02 * (v[5] + v[6]))) oppFout++;
});
eis(oppFout === 0, "oppervlakte van alle kernen binnen max(1 ha, 2%) van opp_land_ha + opp_water_ha (" + oppFout + " afwijkend)");

// ---- selectie, zelf berekend ----
var hs = T.provinciehoofdsteden.lijst, hsKern = {};
Object.keys(hs).forEach(function(p) { hsKern[hs[p]] = p; });
eis(Object.keys(hs).length === 12 && Object.keys(hsKern).length === 12, "12 provinciehoofdsteden, elk een eigen kern");
var grens = rijen.filter(function(v) { return v[4] !== -99997 && v[4] >= 100000; }).map(function(v) { return v[0]; });
eis(grens.length === 25, "25 kernen met minstens 100.000 inwoners");
var verwacht = grens.concat(Object.keys(hsKern).filter(function(n) { return grens.indexOf(n) < 0; }));
eis(verwacht.length === 29 && S.STEDEN.length === 29, "29 steden");
var perKern = {}, perId = {}, perNaam = {};
S.STEDEN.forEach(function(r) { perKern[r.feiten.cbs.waarde.kernnummer] = r; perId[r.id] = (perId[r.id] || 0) + 1; perNaam[r.naam.waarde] = (perNaam[r.naam.waarde] || 0) + 1; });
eis(Object.keys(perKern).sort().join() === verwacht.slice().sort().join(), "precies de geselecteerde kernnummers");
eis(Object.keys(perId).every(function(i) { return perId[i] === 1; }) && Object.keys(perNaam).every(function(n) { return perNaam[n] === 1; }) && Object.keys(perKern).length === 29, "geen dubbele id, naam of kernnummer");
eis(S.TELLING_STEDEN.steden === 29 && S.TELLING_STEDEN.grens === 25 && S.TELLING_STEDEN.alleenProvinciehoofdstad === 4 && S.TELLING_STEDEN.grootKernen === 15, "TELLING_STEDEN");
eis(rijen.filter(function(v) { return v[4] >= 99000 && v[4] <= 101000; }).length === 0, "de controleband 99.000 tot 101.000 is leeg");
eis(rijen.filter(function(v) { return v[4] === -99997; }).length === 3, "3 onderdrukte waarden in de bron");
var rdNaarWgs = proj4(S.STEDEN[0].geometrie.punt.bron.rdDefinitie, "EPSG:4326");
// referentiepunt: het RD-nulpunt Amersfoort, x 155000 y 463000 = 52,15517440 N, 5,38720621 O
// (Schreutelkamp en Strang van Hees, Benaderingsformules voor de transformatie tussen RD- en WGS84-kaartcoordinaten)
var ams = rdNaarWgs.forward([155000, 463000]);
eis(Math.abs(ams[0] - 5.38720621) < 1e-5 && Math.abs(ams[1] - 52.15517440) < 1e-5, "omzetting van het referentiepunt Amersfoort (" + ams.join(", ") + ")");
var ne = null;
if (NE) {
  ne = JSON.parse(fs.readFileSync(path.join(NE, "ne_10m_admin_1_states_provinces.geojson"), "utf8")).features.filter(function(f) { return f.properties.adm0_a3 === "NLD" && f.properties.type_en === "Province"; });
}
var open = {};
fs.readFileSync(path.join(ROOT, "src", "core", "topo", "open-vragen.md"), "utf8").split("\n").forEach(function(r) {
  var m = /^- ([a-zA-Z0-9-]+) \| ([a-z ]+) \| (.+)$/.exec(r);
  if (m) open[m[1]] = { status: m[2], uitleg: m[3] };
});

// ---- per stad ----
var VAST = ["Groot - Amsterdam", "Groot - Rotterdam", "Groot - 's-Gravenhage", "Groot - Utrecht", "Groot - Eindhoven", "Groot - Leiden", "Groot - Dordrecht", "Groot - Groningen", "Groot - Haarlem", "Groot - Heerlen", "Groot - 's-Hertogenbosch", "Groot - Nijmegen", "Groot - Arnhem", "Groot - Sittard-Geleen", "Groot - Alkmaar"];
S.STEDEN.forEach(function(r) {
  var n = r.feiten.cbs.waarde.kernnummer, k = K[n];
  if (!k) { eis(false, "kern bestaat: " + n); return; }
  eis(r.feiten.cbs.waarde.naam === k.naam && r.feiten.cbs.waarde.provincie === k.provincie && r.feiten.cbs.waarde.grootteklasse === k.grootteklasse, "CBS-naam, provincie en klasse letterlijk: " + r.id);
  eis(r.feiten.inwoners.waarde === k.inwoners && r.feiten.inwoners.waarde > 0 && r.feiten.inwoners.waarde % 5 === 0 && r.feiten.inwoners.peildatum === "2021-01-01" && r.feiten.inwoners.eenheid === "bevolkingskern" && !!r.feiten.inwoners.beperking, "inwonertal ongewijzigd, peildatum en beperking: " + r.id);
  eis(r.feiten.provincie.waarde === k.provincie, "provincie uit CBS: " + r.id);
  [r.naam.bron, r.feiten.inwoners.bron, r.feiten.provincie.bron].forEach(function(b) { eis(b.id === "CBS" && b.sha256 === B.gpkg.sha256 && b.peildatum === "2021-01-01", "CBS-bron per feit: " + r.id); });
  eis(r.id === (T.steden[n] || {}).id && /^stad-nl-[a-z-]+$/.test(r.id), "vaste id uit de tabel: " + r.id);
  var sel = [];
  if (k.inwoners >= 100000) sel.push("grens");
  if (hsKern[n]) sel.push("provinciehoofdstad");
  eis(r.feiten.selectie.waarde.join() === sel.join(), "selectiereden: " + r.id);
  if (hsKern[n]) eis(r.feiten.provinciehoofdstadSelectie && r.feiten.provinciehoofdstadSelectie.rol === false && r.feiten.provinciehoofdstadSelectie.provincie === hsKern[n], "provinciehoofdstad alleen als selectiereden, geen rol: " + r.id);
  else eis(!r.feiten.provinciehoofdstadSelectie, "geen hoofdstadvermelding: " + r.id);
  // Groot-kern uit de CBS-naam, niet uit de weergavenaam
  var gk = /^Groot - /.test(k.naam);
  eis(r.naam.grootKern === gk && (gk ? r.feiten.beperking === T.beperkingGrootKern : r.feiten.beperking === null), "grootKern en beperking volgens de CBS-naam: " + r.id);
  // samenstelling alleen met een officiele bron
  if (r.feiten.samenstelling) eis(r.feiten.samenstelling.bron && r.feiten.samenstelling.bron.id === "CBS" && /^https:\/\//.test(r.feiten.samenstelling.bron.url) && r.feiten.samenstelling.bron.passage.length > 20 && !!r.feiten.samenstelling.bron.publicatiedatum, "samenstelling met bron: " + r.id);
  // varianten zijn geen naam van een ander record
  r.naam.varianten.forEach(function(v) { eis(!perNaam[v], "variant is geen naam van een andere stad: " + v); });
  // het punt: RD binnen het eigen vlak, met afstand tot de rand groter dan 0
  var g = opp[n].g, x = r.geometrie.punt.rd[0], y = r.geometrie.punt.rd[1];
  eis(Number.isInteger(x) && Number.isInteger(y) && inVlak(x, y, g.polygonen) && randAfst(x, y, g.polygonen) > 0, "RD-punt binnen het eigen CBS-vlak: " + r.id);
  // het grootste deel (plan par. 3.4)
  if (g.polygonen.length > 1) { var gr = g.polygonen.slice().sort(function(a, b) { return polyOpp(b) - polyOpp(a); })[0]; eis(inVlak(x, y, [gr]), "punt in het grootste deel: " + r.id); }
  // WGS84 reproduceerbaar uit RD, volgorde [lon, lat]
  var ll = rdNaarWgs.forward([x, y]);
  eis(r.geometrie.punt.lon === Math.round(ll[0] * 1e5) / 1e5 && r.geometrie.punt.lat === Math.round(ll[1] * 1e5) / 1e5, "WGS84 reproduceerbaar uit RD: " + r.id);
  eis(r.geometrie.punt.lon > 3.3 && r.geometrie.punt.lon < 7.3 && r.geometrie.punt.lat > 50.7 && r.geometrie.punt.lat < 53.6, "volgorde lon, lat en binnen Nederland: " + r.id);
  // oppervlakte van de 29 strenger
  eis(Math.abs(opp[n].a - k.oppHa) <= Math.max(1, 0.001 * k.oppHa), "oppervlakte binnen max(1 ha, 0,1%): " + r.id);
  // provincie volgens Natural Earth (aanvullende controle; afwijking moet op de open lijst)
  if (ne) {
    var nm = { "Fryslân": "Friesland" }[k.provincie] || k.provincie;
    var raak = ne.filter(function(f) {
      var polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
      return inVlak(r.geometrie.punt.lon, r.geometrie.punt.lat, polys);
    }).map(function(f) { return f.properties.name; });
    eis((raak.length === 1 && raak[0] === nm) || !!open["steden-provincie-ne-" + r.id.replace("stad-nl-", "")], "punt in de eigen provincie volgens Natural Earth, of op de open lijst: " + r.id + " (" + raak.join(", ") + ")");
  }
});
// ---- de vijf naamkwesties en de notitie (D6-d) ----
function st(id) { return S.STEDEN.filter(function(r) { return r.id === id; })[0] || { naam: {}, cbs: {}, notities: [] }; }
eis(st("stad-nl-ijmond").naam.waarde === "IJmond" && st("stad-nl-ijmond").feiten.cbs.waarde.naam === "IJmond", "IJmond: CBS-naam, geen hoofdplaats");
eis(st("stad-nl-almere").naam.waarde === "Almere" && st("stad-nl-almere").feiten.cbs.waarde.naam === "Almere-Stad/Almere-Buiten", "Almere: weergavenaam Almere (Claude 24-11-2026), CBS-naam bewaard");
eis(st("stad-nl-sittard-geleen").naam.waarde === "Sittard-Geleen" && st("stad-nl-sittard-geleen").naam.grootKern === true, "Sittard-Geleen: beide plaatsen, Groot-kern");
eis(st("stad-nl-lelystad").naam.waarde === "Lelystad" && st("stad-nl-lelystad").feiten.cbs.waarde.naam === "Lelystad-Kern", "Lelystad, CBS-naam bewaard");
eis(st("stad-nl-middelburg").naam.waarde === "Middelburg" && st("stad-nl-middelburg").feiten.cbs.waarde.naam === "Middelburg (Z.)", "Middelburg, CBS-naam bewaard");
var az = st("stad-nl-arnhem").feiten.notities.filter(function(x) { return x.kernnummer === "BK01057"; })[0];
eis(!!az && az.cbsNaam === K.BK01057.naam && az.inwoners === K.BK01057.inwoners && !perKern.BK01057, "Arnhem-Zuid: alleen notitie bij Arnhem, met inwonertal uit de bron");
eis(st("stad-nl-den-haag").naam.waarde === "Den Haag" && st("stad-nl-den-haag").naam.varianten.indexOf("'s-Gravenhage") >= 0 && !!st("stad-nl-den-haag").feiten.samenstelling, "Den Haag: variant 's-Gravenhage en samenstelling met bron");
eis(S.STEDEN.filter(function(r) { return r.feiten.samenstelling; }).length === 1, "samenstelling alleen bij Den Haag (de enige met een officiele bron)");
eis(S.STEDEN.filter(function(r) { return r.naam.grootKern; }).map(function(r) { return r.feiten.cbs.waarde.naam; }).sort().join() === VAST.slice().sort().join(), "precies de 15 Groot-kernen");
T.nietAlsKern.namen.forEach(function(nm) { eis(!rijen.some(function(v) { return v[1] === nm; }), "komt niet als kernnaam voor: " + nm); });
// ---- open lijst ----
var afwIds = {};
S.AFWIJKINGEN_STEDEN.forEach(function(a) { afwIds[a.id] = 1; var o = open[a.id]; eis(!!o && STATUSSEN.indexOf(o.status) >= 0 && o.uitleg.length > 10, "op de open lijst met status: " + a.id); });
["steden-grootkernen", "steden-beperking-inwoners", "steden-niet-als-kern", "steden-provinciehoofdstad-geen-rol", "steden-bestandsdatum", "steden-onderdrukt", "steden-naam-ijmond", "steden-naam-almere", "steden-naam-sittard-geleen", "steden-naam-lelystad", "steden-naam-middelburg", "steden-notitie-arnhem"].forEach(function(id) { eis(!!afwIds[id], "afwijking aanwezig: " + id); });
eis(/rol/.test((open["steden-provinciehoofdstad-geen-rol"] || {}).uitleg || "") && (open["steden-provinciehoofdstad-geen-rol"] || {}).status === "nog onbeslist", "open lijst: provinciehoofdstad is geen rol, nog onbeslist");

// ---- reproduceerbaar, proefkaarten en app onaangeroerd ----
if (!MUTANT) {
  var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "steden-"));
  [1, 2].forEach(function(n) {
    execFileSync("node", [path.join(HIER, "maak-steden-nl.mjs"), GPKG, path.join(tmp, "r" + n)]);
    eis(fs.readFileSync(path.join(tmp, "r" + n, "steden-nl.js")).equals(fs.readFileSync(STANDAARD)), "script geeft byte-gelijk steden-nl.js (run " + n + ")");
  });
  var pj = JSON.parse(fs.readFileSync(path.join(HIER, "package.json"), "utf8")).dependencies;
  eis(pj["sql.js"] === "1.14.2" && pj.proj4 === "2.22.0", "vaste versies sql.js 1.14.2 en proj4 2.22.0");
  if (NE) {
    execFileSync("node", [path.join(HIER, "maak-proefkaarten.mjs"), NE, path.join(tmp, "proef")]);
    var dir = path.join(ROOT, "public", "kaartproef", "data");
    fs.readdirSync(dir).forEach(function(f) { eis(fs.existsSync(path.join(tmp, "proef", f)) && fs.readFileSync(path.join(tmp, "proef", f)).equals(fs.readFileSync(path.join(dir, f))), "proefkaart byte-gelijk na de verhuizing naar vlakpunt.mjs: " + f); });
  }
  var git = function(a) { return execFileSync("git", a, { cwd: ROOT }).toString(); };
  git(["diff", "--name-only", "main"]).split("\n").concat(git(["ls-files", "--others", "--exclude-standard"]).split("\n")).filter(Boolean).forEach(function(f) {
    eis(/^(tools\/topo\/|src\/core\/topo\/|public\/kaartproef\/|public\/topoproef\/)/.test(f) || APP_BESTANDEN.indexOf(f) >= 0, "buiten de toegestane mappen gewijzigd: " + f);
  });
}

console.log((fouten.length ? "FOUT" : "GOED") + ": " + geslaagd + " controles geslaagd, " + fouten.length + " mislukt");
fouten.slice(0, 30).forEach(function(f) { console.log("  - " + f); });
process.exit(fouten.length ? 1 : 0);
