// Tests voor de Waddeneilanden (bouwplan T2b-2 fase 6.2 deel 2, versie 2). Alleen bouwomgeving, niet in de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node --max-old-space-size=6000 test-eilanden-nl.mjs <cbsgebiedsindelingen2026.gpkg>
// De test leest de CBS-gemeenten zelf opnieuw, met een eigen WKB-lezer (los van lees-gpkg.mjs), kiest opnieuw het grootste
// polygooncomponent op oppervlakte in RD en controleert EXACT dat het eilandvlak daarmee overeenkomt: hetzelfde rangnummer,
// dezelfde SHA-256 van de coordinaten en dezelfde oppervlakte. Ook de volgorde west naar oost wordt opnieuw berekend.

import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { execFileSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";
import initSqlJs from "sql.js";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var ROOT = path.resolve(HIER, "..", "..");
var GPKG = process.argv[2];
var BRONNEN = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8"));
var T = JSON.parse(fs.readFileSync(path.join(HIER, "water-nlbe.json"), "utf8")).eilanden;
var E = await import(pathToFileURL(path.join(ROOT, "src/core/topo/items/eilanden-nl.js")).href);
var STATUSSEN = ["onderzocht", "bevestigd verschil", "nog onbeslist", "gecorrigeerd"];
function kopie(x) { return JSON.parse(JSON.stringify(x)); }
function sha(b) { return crypto.createHash("sha256").update(b).digest("hex"); }

// ---- eigen lezing van de gemeenten ----
var buf = fs.readFileSync(GPKG);
var shaOk = sha(buf) === BRONNEN.cbsGebiedsindelingen2026.gpkg.sha256;
var SQL = await initSqlJs(), db = new SQL.Database(new Uint8Array(buf));
var rijen = db.exec("select statcode, statnaam, geom from gemeente_niet_gegeneraliseerd")[0].values; db.close();
function wkb(b) {
  var dv = new DataView(b.buffer, b.byteOffset, b.byteLength), o = 8 + [0, 32, 48, 48, 64][(b[3] >> 1) & 7];
  function poly(le, dim) { var nr = dv.getUint32(o, le); o += 4; var ringen = []; while (nr--) { var np = dv.getUint32(o, le); o += 4; var r = []; for (var i = 0; i < np; i++) { r.push([dv.getFloat64(o, le), dv.getFloat64(o + 8, le)]); o += 8 * dim; } ringen.push(r); } return ringen; }
  var le = b[o] === 1, t = dv.getUint32(o + 1, le); o += 5;
  var dim = t >= 1000 && t < 2000 ? 3 : 2;
  if (t % 1000 === 3) return [poly(le, dim)];
  var k = dv.getUint32(o, le); o += 4; var uit = [];
  for (var j = 0; j < k; j++) { var l2 = b[o] === 1; o += 5; uit.push(poly(l2, dim)); }
  return uit;
}
function opp(r) { var s = 0; for (var i = 0; i < r.length - 1; i++) s += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return Math.abs(s / 2); }
function oppComp(p) { return p.reduce(function(s, r, i) { return s + (i === 0 ? opp(r) : -opp(r)); }, 0); }
function zx(p) { var r = p[0], a = 0, cx = 0; for (var i = 0; i < r.length - 1; i++) { var k = r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; a += k; cx += (r[i][0] + r[i + 1][0]) * k; } return cx / (3 * a); }
var GEM = {};
rijen.forEach(function(r) { GEM[r[0]] = { naam: r[1], delen: wkb(r[2]) }; });
var REF = {};
Object.keys(T.lid).forEach(function(id) {
  var g = GEM[T.lid[id].statcode], best = -1, idx = -1;
  g.delen.forEach(function(p, i) { var a = oppComp(p); if (a > best) { best = a; idx = i; } });
  REF[id] = { naam: g.naam, deel: idx, delen: g.delen.length, opp: Math.round(best), sha: sha(JSON.stringify(g.delen[idx])), x: zx(g.delen[idx]), heelSha: sha(JSON.stringify(g.delen)) };
});
var VOLG = Object.keys(REF).sort(function(a, b) { return REF[a].x - REF[b].x; });

function controleer(items) {
  var fouten = [], n = 0;
  function eis(ok, groep, tekst) { n++; if (!ok) fouten.push({ groep: groep, tekst: tekst }); }
  var eil = items.filter(function(x) { return x.soort === "eiland"; }), groep = items.filter(function(x) { return x.soort === "eilandengroep"; });
  eis(eil.length === 5 && groep.length === 1 && groep[0].id === T.groep.id, "aantallen", "5 eilanden en de eilandengroep");
  eis(VOLG.join() === T.volgorde.join(), "volgorde", "de opnieuw berekende volgorde west naar oost is die van de tabel: " + VOLG.join(", "));
  eil.forEach(function(x) {
    var r = REF[x.id], g = x.geometrie.bron;
    if (!r) { eis(false, "aantallen", "onbekend eiland: " + x.id); return; }
    eis(x.naam.waarde === r.naam && x.naam.herkomst === "bron" && x.naam.bron.id === "CBSGEB", "namen", "naam = statnaam van CBS: " + x.id);
    eis(g.bronId === "CBSGEB" && g.sha256 === BRONNEN.cbsGebiedsindelingen2026.gpkg.sha256 && g.waarde === T.lid[x.id].statcode, "georef", "GEOREF naar de eigen gemeente: " + x.id);
    eis(g.deel === r.deel && g.delen === r.delen && g.deelOppervlakteM2 === r.opp && g.deelSha256 === r.sha, "component", "EXACT: het eilandvlak is het grootste component (rangnummer " + r.deel + ", " + r.opp + " m2, SHA gelijk): " + x.id);
    eis(g.deelSha256 !== r.heelSha, "component", "het eilandvlak is niet de hele gemeente: " + x.id);
    eis(x.feiten.volgorde.waarde === VOLG.indexOf(x.id) + 1 && x.feiten.volgorde.herkomst === "afgeleid", "volgorde", "volgorde afgeleid en gelijk aan de berekening: " + x.id);
    eis(x.feiten.land.waarde === "NLD", "land", "land NLD: " + x.id);
    var hb = x.relaties.filter(function(q) { return q.type === "hoort-bij"; });
    eis(x.relaties.length === 1 && hb.length === 1 && hb[0].naar === T.groep.id && hb[0].herkomst === "besluit" && /^T1 par\. 2\.1/.test(hb[0].besluit), "relaties", "precies een hoort-bij naar de Waddeneilanden (besluit T1): " + x.id);
  });
  var gr = groep[0];
  if (gr) eis(gr.geometrie.bron === null && /D3 a/.test(gr.geometrie.geen) && gr.relaties.length === 0, "groep", "de eilandengroep zonder eigen vlak (D3 a)");
  return { fouten: fouten, n: n };
}

var uit = controleer(kopie(E.EILANDEN_NL));
console.log((uit.fouten.length ? "FOUT" : "GOED") + ": " + (uit.n - uit.fouten.length) + " controles geslaagd, " + uit.fouten.length + " mislukt; SHA van het GeoPackage " + (shaOk ? "gelijk" : "ANDERS"));
uit.fouten.forEach(function(f) { console.log("  - [" + f.groep + "] " + f.tekst); });
console.log("EXACT: " + VOLG.map(function(id) { return REF[id].naam + " deel " + REF[id].deel + " van " + REF[id].delen + ", " + (REF[id].opp / 1e6).toFixed(1) + " km2"; }).join("; "));

// ---- open lijst ----
var open = {};
fs.readFileSync(path.join(ROOT, "src/core/topo/open-vragen.md"), "utf8").split("\n").forEach(function(r) { var m = /^- ([a-zA-Z0-9-]+) \| ([a-z ]+) \| (.+)$/.exec(r); if (m) open[m[1]] = { status: m[2], uitleg: m[3] }; });
var openFout = E.AFWIJKINGEN_EILANDEN.filter(function(a) { var o = open[a.id]; return !o || STATUSSEN.indexOf(o.status) < 0 || o.uitleg !== a.tekst; });
console.log("open lijst: " + (E.AFWIJKINGEN_EILANDEN.length - openFout.length) + " van " + E.AFWIJKINGEN_EILANDEN.length + " letterlijk op de lijst");

// ---- reproduceerbaar ----
var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "eilanden-")), herhaal = [];
[1, 2].forEach(function(k) { execFileSync("node", ["--max-old-space-size=6000", path.join(HIER, "maak-eilanden-nl.mjs"), GPKG, path.join(tmp, "r" + k)]); herhaal.push(fs.readFileSync(path.join(tmp, "r" + k, "items/eilanden-nl.js")).equals(fs.readFileSync(path.join(ROOT, "src/core/topo/items/eilanden-nl.js")))); });
var reproOk = herhaal.every(Boolean);
console.log("twee keer draaien: " + (reproOk ? "byte-gelijk" : "VERSCHIL"));

// ---- mutanten ----
function it(items, id) { return items.filter(function(x) { return x.id === id; })[0]; }
var MUT = [
  ["7 omgedraaide volgorde (Texel en Schiermonnikoog)", "volgorde", function(I) { it(I, "eiland-nl-texel").feiten.volgorde.waarde = 5; it(I, "eiland-nl-schiermonnikoog").feiten.volgorde.waarde = 1; }],
  ["6 eiland met het hele gemeentevlak", "component", function(I) { var g = it(I, "eiland-nl-texel").geometrie.bron; g.deelSha256 = REF["eiland-nl-texel"].heelSha; }],
  ["ander component dan het grootste", "component", function(I) { var g = it(I, "eiland-nl-terschelling").geometrie.bron; g.deel = 0; }],
  ["hoort-bij ontbreekt", "relaties", function(I) { it(I, "eiland-nl-ameland").relaties = []; }],
  ["eilandengroep met een eigen vlak", "groep", function(I) { it(I, T.groep.id).geometrie.bron = kopie(it(I, "eiland-nl-texel").geometrie.bron); }],
  ["naam niet van CBS", "namen", function(I) { it(I, "eiland-nl-vlieland").naam.waarde = "Vlie"; }]
];
var gevangen = 0, gemist = [];
MUT.forEach(function(m) { var I = kopie(E.EILANDEN_NL); m[2](I); var r = controleer(I); if (r.fouten.some(function(f) { return f.groep === m[1]; })) gevangen++; else gemist.push(m[0]); });
console.log("mutanten: " + gevangen + " van " + MUT.length + " gevangen door de verwachte groep");
gemist.forEach(function(g) { console.log("  - GEMIST: " + g); });
process.exit(uit.fouten.length || gemist.length || openFout.length || !reproOk || !shaOk ? 1 : 0);
