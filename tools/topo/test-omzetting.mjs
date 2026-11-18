// Vergelijking oud en nieuw (bouwplan T2b-2 fase 6.1 v1.9, par. 4). Alleen bouwomgeving, niet in de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node test-omzetting.mjs [landen.js steden-nl.js]
// Leest de oude bestanden letterlijk uit git (d1f5eab) en vergelijkt elk blad van elk oud record met het nieuwe pad
// volgens de padtabel van par. 4.1. Elk nieuw blad is een overgenomen oud blad of een toegestane toevoeging (par. 4.2).
// Met twee argumenten (mutanten) worden die bestanden als "nieuw" gebruikt.

import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var ROOT = path.resolve(HIER, "..", "..");
var OUD_COMMIT = "d1f5eab";
var fouten = [], geslaagd = 0;
function eis(ok, tekst) { if (ok) geslaagd++; else fouten.push(tekst); }
function git(a) { return execFileSync("git", a, { cwd: ROOT }).toString(); }

var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "omzetting-"));
function oud(pad) { var f = path.join(tmp, path.basename(pad)); fs.writeFileSync(f, git(["show", OUD_COMMIT + ":" + pad])); return f; }
var OL = await import(pathToFileURL(oud("src/core/topo/items/landen.js")).href);
var OS = await import(pathToFileURL(oud("src/core/topo/items/steden-nl.js")).href);
var NL = await import(pathToFileURL(process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, "src/core/topo/items/landen.js")).href + "?" + Date.now());
var NS = await import(pathToFileURL(process.argv[3] ? path.resolve(process.argv[3]) : path.join(ROOT, "src/core/topo/items/steden-nl.js")).href + "?" + Date.now());

// ---- bladen ----
function bladen(o, pad, uit) {
  if (o === null || typeof o !== "object") { uit[pad] = o; return uit; }
  if (Array.isArray(o)) { if (!o.length) uit[pad] = "[]"; o.forEach(function(x, i) { bladen(x, pad + "[" + i + "]", uit); }); return uit; }
  var k = Object.keys(o);
  if (!k.length) uit[pad] = "{}";
  k.forEach(function(x) { bladen(o[x], pad ? pad + "." + x : x, uit); });
  return uit;
}
function zonderIndex(p) { return p.replace(/\[[0-9]+\]/g, "[]"); }

// ---- de padtabel (par. 4.1): oud pad -> nieuw pad ----
function nieuwPadLand(p) {
  if (p === "id") return "id";
  if (/^naam(\.|$)/.test(p)) return p;
  if (/^(vn|iso\.|werelddeel|hoofdstad)/.test(p)) return "feiten." + p;
  if (p === "modusEuropa") return "feiten.modusEuropa.waarde";
  if (p === "ne") return "geometrie.bron.waarde";
  return null;
}
function nieuwPadStad(p) {
  if (p === "id" || p === "soort") return p;
  if (/^naam(\.|$)/.test(p)) return p;
  if (/^selectie(\[|$)/.test(p)) return "feiten.selectie.waarde" + p.slice(8);
  if (/^cbs\./.test(p)) return "feiten.cbs.waarde." + p.slice(4);
  if (p === "samenstelling") return "feiten.samenstelling";
  if (p === "samenstelling.tekst") return "feiten.samenstelling.waarde";
  if (/^punt(\.|$)/.test(p)) return "geometrie." + p;
  if (/^(inwoners|provincie|samenstelling|beperking|notities|provinciehoofdstadSelectie)(\.|\[|$)/.test(p)) return "feiten." + p;
  return null;
}
// ---- toegestane toevoegingen (par. 4.2) ----
var GROOT_ZONDER_BESLUIT = ["stad-nl-amsterdam", "stad-nl-rotterdam", "stad-nl-utrecht", "stad-nl-eindhoven", "stad-nl-leiden", "stad-nl-dordrecht", "stad-nl-groningen", "stad-nl-haarlem", "stad-nl-heerlen", "stad-nl-nijmegen", "stad-nl-alkmaar"];
function toegestaanLand(p, rec) {
  var q = zonderIndex(p);
  if (q === "soort") return rec.soort === "land";
  if (/^naam\.(herkomst|status)$/.test(q)) return true;
  if (/^feiten\.(vn|iso\.(alpha3|alpha2|numeriek)|werelddeel)\.(herkomst|status)$/.test(q)) return true;
  if (/^feiten\.hoofdstad\.(herkomst|status)$/.test(q)) return rec.feiten.hoofdstad.bijzonder === false;
  if (/^feiten\.hoofdstad\.rollen\[\]\.(herkomst|status)$/.test(q)) return true;
  if (q === "feiten.hoofdstad.open[].herkomst") return true;
  if (/^feiten\.modusEuropa\.(herkomst|status|besluit)$/.test(q)) return true;
  if (/^geometrie\.bron\.(bronId|bestand|sha256|sleutel|crs)$/.test(q)) return true;
  if (q === "geometrie.kaart") return true;
  if (q === "relaties") return true;
  return false;
}
function toegestaanStad(p, rec) {
  var q = zonderIndex(p);
  if (/^naam\.(herkomst|status)$/.test(q)) return true;
  if (q === "naam.besluitRegel") return GROOT_ZONDER_BESLUIT.indexOf(rec.id) >= 0;
  if (/^feiten\.selectie\.(herkomst|status)$/.test(q) || /^feiten\.selectie\.afleiding\./.test(q)) return true;
  if (/^feiten\.cbs\.(herkomst|status)$/.test(q) || /^feiten\.cbs\.bron\./.test(q)) return true;
  if (/^feiten\.(inwoners|provincie)\.(herkomst|status)$/.test(q)) return true;
  if (/^feiten\.samenstelling\.(herkomst|status)$/.test(q)) return rec.id === "stad-nl-den-haag";
  if (/^geometrie\.punt\.(herkomst|status)$/.test(q) || /^geometrie\.punt\.afleiding\./.test(q)) return true;
  if (/^geometrie\.bron\.(bronId|bestand|sha256|sleutel|crs)$/.test(q)) return true;
  // v1.10: verwijzingssleutel, alleen als hij exact gelijk is aan het CBS-kernnummer
  if (q === "geometrie.bron.waarde") return rec.geometrie.bron.waarde === rec.feiten.cbs.waarde.kernnummer;
  if (q === "geometrie.kaart") return true;
  if (q === "relaties") return true;
  return false;
}

function vergelijk(soort, oudLijst, nieuwLijst, nieuwPad, toegestaan) {
  eis(oudLijst.length === nieuwLijst.length, soort + ": aantal items gelijk (" + oudLijst.length + ")");
  eis(oudLijst.map(function(r) { return r.id; }).join() === nieuwLijst.map(function(r) { return r.id; }).join(), soort + ": dezelfde ids in dezelfde volgorde");
  var tel = { oud: 0, gelijk: 0, toevoeging: 0 };
  oudLijst.forEach(function(o, i) {
    var n = nieuwLijst[i];
    if (!n || n.id !== o.id) return;
    var ob = bladen(o, "", {}), nb = bladen(n, "", {}), beeld = {};
    Object.keys(ob).forEach(function(p) {
      tel.oud++;
      var np = nieuwPad(p);
      if (np === null) { eis(false, soort + " " + o.id + ": oud blad zonder regel in de padtabel: " + p); return; }
      beeld[np] = 1;
      var gelijk = Object.prototype.hasOwnProperty.call(nb, np) && nb[np] === ob[p];
      if (gelijk) tel.gelijk++;
      eis(gelijk, soort + " " + o.id + ": " + p + " -> " + np + " letterlijk gelijk");
    });
    Object.keys(nb).forEach(function(p) {
      if (beeld[p]) return;
      var ok = toegestaan(p, n);
      if (ok) tel.toevoeging++;
      eis(ok, soort + " " + n.id + ": niet toegestane toevoeging: " + p);
    });
  });
  return tel;
}
var tL = vergelijk("land", OL.LANDEN, NL.LANDEN, nieuwPadLand, toegestaanLand);
var tS = vergelijk("stad", OS.STEDEN, NS.STEDEN, nieuwPadStad, toegestaanStad);

// ---- de lijsten ernaast ----
[["TELLING", OL.TELLING, NL.TELLING], ["ROLLEN_MET_VRAAG", OL.ROLLEN_MET_VRAAG, NL.ROLLEN_MET_VRAAG], ["AFWIJKINGEN_LANDEN", OL.AFWIJKINGEN_LANDEN, NL.AFWIJKINGEN_LANDEN], ["TELLING_STEDEN", OS.TELLING_STEDEN, NS.TELLING_STEDEN], ["AFWIJKINGEN_STEDEN", OS.AFWIJKINGEN_STEDEN, NS.AFWIJKINGEN_STEDEN]].forEach(function(x) {
  eis(JSON.stringify(x[1]) === JSON.stringify(x[2]), x[0] + " exact gelijk");
});
// ---- specifieke eisen (par. 3.0, 3.2) ----
var perOud = {}; OS.STEDEN.forEach(function(r) { perOud[r.id] = r; });
NS.STEDEN.forEach(function(r) {
  var o = perOud[r.id];
  if (!o) return;
  eis(JSON.stringify(r.feiten.cbs.bron) === JSON.stringify(o.inwoners.bron), "cbs.bron gelijk aan inwoners.bron: " + r.id);
  eis(r.geometrie.punt.waarde === undefined, "geen veld waarde op geometrie.punt: " + r.id);
  eis(JSON.stringify(r.geometrie.punt.bron) === JSON.stringify(o.punt.bron), "het oude punt.bron letterlijk gelijk: " + r.id);
  var a = r.geometrie.punt.afleiding || {};
  eis(a.script === o.punt.bron.script && Array.isArray(a.invoer) && a.invoer.length === 1 && a.invoer[0].bronId === "CBS" && a.invoer[0].sha256 === o.punt.bron.bronSha256, "afleiding van het punt noemt hetzelfde script en dezelfde bron-SHA als het oude punt.bron: " + r.id);
  eis(GROOT_ZONDER_BESLUIT.indexOf(r.id) < 0 ? r.naam.besluitRegel === undefined : r.naam.besluitRegel === "GPT 17-11-2026 D6-d: Groot-kern, weergavenaam = de hoofdplaats uit de CBS-naam", "besluitRegel alleen bij de 11 Groot-kernen zonder besluittekst: " + r.id);
  eis(r.feiten.samenstelling === null || r.feiten.samenstelling.tekst === undefined, "geen tweede kopie samenstelling.tekst: " + r.id);
  eis(r.geometrie.bron.waarde === r.feiten.cbs.waarde.kernnummer && r.geometrie.bron.waarde === o.cbs.kernnummer, "geometrie.bron.waarde gelijk aan het CBS-kernnummer: " + r.id);
  eis(r.geometrie.bron.herkomst === undefined && r.geometrie.bron.status === undefined, "GEOREF zonder herkomst en status: " + r.id);
});
// ---- bronnen.json: de bestaande blokken ongewijzigd ----
var bOud = JSON.parse(git(["show", OUD_COMMIT + ":tools/topo/bronnen.json"])), bNieuw = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8"));
Object.keys(bOud).forEach(function(k) { eis(JSON.stringify(bOud[k]) === JSON.stringify(bNieuw[k]), "bronnen.json: blok " + k + " ongewijzigd"); });
// fase 6.1 voegde het blok register toe; fase 6.2 (bouwplan v3, toestemming GPT 18-11-2026) alleen cbsGebiedsindelingen2026 en statbel,
// en in deel 2 (bouwplan deel 2 v2) alleen naturalEarthMarine
eis(Object.keys(bNieuw).filter(function(k) { return !(k in bOud); }).sort().join() === "cbsGebiedsindelingen2026,naturalEarthMarine,register,statbel", "bronnen.json: alleen de blokken register, cbsGebiedsindelingen2026, statbel en naturalEarthMarine erbij");

console.log("vergelijking landen: " + tL.oud + " oude bladen, " + tL.gelijk + " gelijk, " + tL.toevoeging + " toegestane toevoegingen");
console.log("vergelijking steden: " + tS.oud + " oude bladen, " + tS.gelijk + " gelijk, " + tS.toevoeging + " toegestane toevoegingen");
console.log((fouten.length ? "FOUT" : "GOED") + ": " + geslaagd + " controles geslaagd, " + fouten.length + " mislukt");
fouten.slice(0, 30).forEach(function(f) { console.log("  - " + f); });
process.exit(fouten.length ? 1 : 0);
