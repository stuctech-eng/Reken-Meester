// Tests voor de 194 landen (plan T2b §1.3 A en §3.5). Alleen bouwomgeving, niet in de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node test-landen.mjs <countries.json van world-countries 5.1.0> [landen.js]
// Zonder tweede argument: test src/core/topo/items/landen.js en controleert dat het script het byte-gelijk opnieuw maakt.
// Met een tweede argument (mutanten): alleen de inhoudelijke controles. De controles lezen de bronbestanden zelf opnieuw in.

import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { execFileSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var ROOT = path.resolve(HIER, "..", "..");
var WCF = process.argv[2];
var STANDAARD = path.join(ROOT, "src", "core", "topo", "items", "landen.js");
var DOEL = process.argv[3] ? path.resolve(process.argv[3]) : STANDAARD;
var MUTANT = !!process.argv[3];
var STATUSSEN = ["onderzocht", "bevestigd verschil", "nog onbeslist", "gecorrigeerd"];
var fouten = [], geslaagd = 0;
function eis(ok, tekst) { if (ok) geslaagd++; else fouten.push(tekst); }
function sha(b) { return crypto.createHash("sha256").update(b).digest("hex"); }

var R = await import(pathToFileURL(DOEL).href + "?" + Date.now());
var bronnen = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8"));
var VN = JSON.parse(fs.readFileSync(path.join(HIER, "vn-lidstaten.json"), "utf8"));
var WC = JSON.parse(fs.readFileSync(WCF, "utf8")), wcPer = {};
WC.forEach(function(w) { wcPer[w.cca3] = w; });

// ---- bronbestanden, eigen inlezing ----
["taalunie-landen.tsv", "m49-regio.txt"].forEach(function(n) {
  var b = bronnen.lijsten[n];
  eis(b && sha(fs.readFileSync(path.join(HIER, "bron", n))) === b.sha256, "SHA-256 van bron/" + n);
  eis(b && b.geraadpleegd && (b.url || b.basisUrl) && b.bron, "bronvermelding van bron/" + n);
});
var tuRegels = fs.readFileSync(path.join(HIER, "bron", "taalunie-landen.tsv"), "utf8").trim().split("\n");
eis(tuRegels[0].split("\t").length === 10, "kop van taalunie-landen.tsv");
var TU = {};
tuRegels.slice(1).forEach(function(r) { var k = r.split("\t"); eis(k.length === 10, "tien kolommen: " + k[0]); TU[k[0]] = k; });
var M49 = {};
fs.readFileSync(path.join(HIER, "bron", "m49-regio.txt"), "utf8").trim().split("\n").slice(1).forEach(function(r) { var k = r.split("|"); M49[k[0]] = k; });
function namen(v) { return v === "-" ? [] : v.split(" ; "); }

// ---- telling en ids ----
eis(R.LANDEN.length === 194, "194 landen");
var perId = {};
R.LANDEN.forEach(function(r) { eis(!perId[r.id], "id een keer: " + r.id); perId[r.id] = r; });
VN.landen.forEach(function(l) { eis(!!perId[l.wc || l.ne], "land uit de VN-lijst aanwezig: " + (l.wc || l.ne)); });
var DEEL = { Africa: "Afrika", Americas: "Amerika", Asia: "Azië", Europe: "Europa", Oceania: "Oceanië" };
var telling = {};
R.LANDEN.forEach(function(r) { telling[r.feiten.werelddeel.waarde] = (telling[r.feiten.werelddeel.waarde] || 0) + 1; });
eis(telling["Europa"] === 44 && telling["Azië"] === 47 && telling["Afrika"] === 54 && telling["Amerika"] === 35 && telling["Oceanië"] === 14, "verdeling 44 + 47 + 54 + 35 + 14 (§0.2)");
eis(JSON.stringify(R.TELLING) === JSON.stringify(telling), "TELLING klopt met de records");
var zes = R.LANDEN.filter(function(r) { return r.feiten.modusEuropa.waarde; }).map(function(r) { return r.id; }).sort();
eis(JSON.stringify(zes) === JSON.stringify(["ARM", "AZE", "CYP", "GEO", "KAZ", "TUR"]), "precies de zes aanvullende landen in de modus Europa");
eis(zes.every(function(c) { return perId[c].feiten.werelddeel.waarde === "Azië"; }), "de zes staan bij Azië (M49)");
eis(perId.RUS.feiten.werelddeel.waarde === "Europa" && !perId.RUS.feiten.modusEuropa.waarde, "Rusland bij de 44 van Europa");

// ---- per land: waarde uit de primaire bron, met bron per feit ----
var BIJZONDER = ["BDI", "BEN", "BOL", "CIV", "IDN", "ISR", "LKA", "MYS", "NLD", "NRU", "SWZ", "ZAF"];
VN.landen.forEach(function(l) {
  var id = l.wc || l.ne, r = perId[id], t = TU[l.tu], m = M49[id];
  if (!r || !t || !m) { eis(false, "records voor " + id); return; }
  var url = bronnen.lijsten["taalunie-landen.tsv"].basisUrl + l.tu;
  [r.naam.bron, r.feiten.hoofdstad.bron, r.feiten.iso.alpha2.bron, r.feiten.iso.numeriek.bron].forEach(function(b, i) { eis(b.id === "TU" && b.url === url && !!b.geraadpleegd, "bron TU (" + i + "): " + id); });
  eis(r.feiten.iso.alpha3.bron.id === "M49" && !!r.feiten.iso.alpha3.bron.url, "bron M49 bij alpha-3: " + id);
  eis(r.feiten.werelddeel.bron.id === "M49" && !!r.feiten.werelddeel.bron.url && !!r.feiten.werelddeel.bron.geraadpleegd, "bron M49: " + id);
  eis(r.feiten.vn.bron.id === "UN" && r.feiten.vn.waarde === l.vn, "bron UN: " + id);
  // de namen zijn die van de TU; een extra naam mag alleen de TU-naam ter onderscheiding zijn, letterlijk uit de opmerking
  var recNamen = [r.naam.waarde].concat(r.naam.varianten.map(function(v) { return v.naam; }));
  eis(namen(t[1]).every(function(n) { return recNamen.indexOf(n) >= 0; }), "alle TU-namen aanwezig: " + id);
  recNamen.filter(function(n) { return namen(t[1]).indexOf(n) < 0; }).forEach(function(n) { eis(t[2].indexOf("‘" + n + "’") >= 0, "extra naam staat letterlijk in de TU-opmerking: " + id + " " + n); });
  if (t[8] !== "-" && t[7] !== "-") eis(t[7].toLowerCase() === l.tu.replace("-0", ""), "TU-slug hoort bij de ISO alpha-2 van de pagina: " + id);
  eis(r.feiten.iso.alpha3.waarde === id && !!m, "alpha-3 uit M49 (de code in het M49-uittreksel): " + id);
  eis(r.feiten.iso.alpha3.controle.waarde === (t[8] === "-" ? null : t[8]) && r.feiten.iso.alpha3.controle.uitkomst === (t[8] === id ? "gelijk" : "afwijkend, zie open lijst"), "TU-alpha-3 als controle: " + id);
  eis(r.feiten.iso.alpha2.waarde === (t[7] === "-" ? null : t[7]) && r.feiten.iso.numeriek.waarde === (t[9] === "-" ? null : Number(t[9])), "alpha-2 en numeriek uit de TU: " + id);
  eis(r.feiten.werelddeel.waarde === DEEL[m[1]] && r.feiten.werelddeel.groep === m[2], "werelddeel en groep uit M49: " + id);
  if (BIJZONDER.indexOf(id) >= 0) eis(r.feiten.hoofdstad.bijzonder === true && r.feiten.hoofdstad.waarde === null, "bijzonder geval zonder automatische hoofdstad: " + id);
  else eis(r.feiten.hoofdstad.bijzonder === false && r.feiten.hoofdstad.waarde === namen(t[4])[0], "hoofdstad uit de TU: " + id);
});
eis(R.LANDEN.filter(function(r) { return r.feiten.hoofdstad.bijzonder; }).length === 12, "precies 12 bijzondere gevallen");
eis(R.LANDEN.filter(function(r) { return !r.feiten.hoofdstad.bijzonder; }).length === 182, "182 gewone hoofdsteden");
var teVer = R.LANDEN.filter(function(r) { return r.feiten.hoofdstad.teVerifieren; }).map(function(r) { return r.id; });
eis(JSON.stringify(teVer) === JSON.stringify(["GNQ"]) && !perId.GNQ.feiten.hoofdstad.bijzonder && perId.GNQ.feiten.hoofdstad.waarde === "Ciudad de la Paz", "alleen Equatoriaal-Guinea: gewone TU-hoofdstad met de markering teVerifieren (12 + 182 blijft)");
// ---- de rollen van de bijzondere gevallen (ov-rollen.json; besluiten GPT 17-11-2026, ronden 1 en 2) ----
var OVR = JSON.parse(fs.readFileSync(path.join(HIER, "ov-rollen.json"), "utf8"));
var VAST = ["hoofdstad", "regeringszetel", "bestuurlijke hoofdstad", "wetgevende hoofdstad", "gerechtelijke hoofdstad"];
eis(JSON.stringify(OVR.vasteRollen) === JSON.stringify(VAST), "vaste rollenlijst van T1 §3.6, niet uitgebreid");
var VERWACHT_ROLLEN = [
  "BEN|hoofdstad|officiële hoofdstad|Porto-Novo", "BOL|hoofdstad|grondwettelijke hoofdstad|Sucre", "BOL|regeringszetel|regeringszetel|La Paz",
  "CIV|hoofdstad|politieke hoofdstad|Yamoussoukro", "MYS|bestuurlijke hoofdstad|federaal bestuurscentrum|Putrajaya", "NLD|hoofdstad|hoofdstad|Amsterdam",
  "ZAF|bestuurlijke hoofdstad|bestuurlijke hoofdstad|Pretoria", "ZAF|wetgevende hoofdstad|wetgevende hoofdstad|Kaapstad", "ZAF|gerechtelijke hoofdstad|gerechtelijke hoofdstad|Bloemfontein"];
var gevonden = [];
R.LANDEN.forEach(function(r) {
  if (!r.feiten.hoofdstad.bijzonder) { eis(r.feiten.hoofdstad.rollen === undefined, "geen rollen bij een gewoon geval: " + r.id); return; }
  var o = OVR.landen[r.id];
  // itemmodel (fase 6.1): alleen herkomst en status zijn erbij gekomen; de rest moet letterlijk gelijk zijn aan ov-rollen.json
  function zonder(lijst, velden) { return lijst.map(function(x) { var y = {}; Object.keys(x).forEach(function(k) { if (velden.indexOf(k) < 0) y[k] = x[k]; }); return y; }); }
  eis(!!o && JSON.stringify(zonder(r.feiten.hoofdstad.rollen, ["herkomst", "status"])) === JSON.stringify(o.rollen) && JSON.stringify(zonder(r.feiten.hoofdstad.open, ["herkomst"])) === JSON.stringify(o.open) && JSON.stringify(r.feiten.hoofdstad.notities) === JSON.stringify(o.notities), "rollen, open en notities uit ov-rollen.json: " + r.id);
  eis(r.feiten.hoofdstad.rollen.every(function(x) { return x.herkomst === "bron" && x.status === "vastgesteld"; }) && r.feiten.hoofdstad.open.every(function(x) { return x.herkomst === "onderzoek"; }), "rollen bron/vastgesteld, open rollen onderzoek: " + r.id);
  r.feiten.hoofdstad.rollen.forEach(function(x) {
    gevonden.push(r.id + "|" + x.rol + "|" + x.label + "|" + x.stad);
    var b = x.bron || {};
    eis(VAST.indexOf(x.rol) >= 0, "rol uit de vaste lijst: " + r.id + " " + x.rol);
    eis(b.id === "OV" && /^https:\/\//.test(b.url) && b.passage.length > 10 && b.geraadpleegd === "2026-11-17" && !!b.document && /^[0-9]{4}(-[0-9]{2}-[0-9]{2})?$/.test(b.publicatiedatum || ""), "OV-bron met URL, passage, geldige publicatiedatum (jaar of volledige datum) en raadpleegdatum: " + r.id + " " + x.rol);
    eis((b.passage + " " + (b.context || "")).indexOf(x.stad === "Kaapstad" ? "Cape Town" : x.stad) >= 0, "de passage of haar context noemt de stad: " + r.id + " " + x.stad);
  });
  r.feiten.hoofdstad.open.forEach(function(x) {
    eis(VAST.indexOf(x.rol) >= 0 && ["niet aangetoond", "gedeeltelijk", "onzeker"].indexOf(x.status) >= 0 && x.reden.length > 20, "open rol met status en reden: " + r.id + " " + x.rol);
    eis(r.feiten.hoofdstad.rollen.every(function(y) { return y.stad !== x.stad; }), "een open rol is niet ook een rol: " + r.id + " " + x.stad);
  });
});
eis(gevonden.slice().sort().join() === VERWACHT_ROLLEN.slice().sort().join(), "precies de 9 rollen met een vraag");
eis(JSON.stringify(R.ROLLEN_MET_VRAAG.map(function(x) { return x.land + "|" + x.rol + "|" + x.label + "|" + x.stad; }).sort()) === JSON.stringify(VERWACHT_ROLLEN.slice().sort()), "ROLLEN_MET_VRAAG = de 9 rollen");
// de passages die de keuze van het label dragen
eis(perId.BOL.feiten.hoofdstad.rollen[0].bron.publicatiedatum === "2009-02-07" && /afkondigingsdatum/.test(perId.BOL.feiten.hoofdstad.rollen[0].bron.datumSoort || "") && /niet de datum van het geraadpleegde PDF/.test(perId.BOL.feiten.hoofdstad.rollen[0].bron.datumSoort || ""), "Sucre: afkondigingsdatum grondwet 2009-02-07, met datumSoort");
eis(perId.BOL.feiten.hoofdstad.rollen[1].bron.passage.indexOf("Sede de Gobierno") >= 0 && !!perId.BOL.feiten.hoofdstad.rollen[1].beperking, "La Paz: Sede de Gobierno, met de bronbeperking");
eis(perId.CIV.feiten.hoofdstad.rollen[0].bron.passage.indexOf("Political capital") >= 0, "Yamoussoukro: label volgt Political capital");
eis(perId.MYS.feiten.hoofdstad.rollen[0].bron.passage.indexOf("Federal Government Administrative Centre") >= 0 && perId.MYS.feiten.hoofdstad.rollen[0].bron.passage.indexOf("capital") < 0, "Putrajaya: bronterm federaal bestuurscentrum, niet administratieve hoofdstad");
// Kotte en Lobamba: alleen bronnotitie, geen rol
[["LKA", "Sri Jayewardenepura Kotte"], ["SWZ", "Lobamba"]].forEach(function(k) {
  var h = perId[k[0]].feiten.hoofdstad;
  eis(h.rollen.length === 0 && h.notities.some(function(n) { return n.stad === k[1] && n.tekst.indexOf("parlement gevestigd in " + k[1]) === 0; }), "alleen bronnotitie parlement: " + k[1]);
});
eis(perId.IDN.feiten.hoofdstad.open.length === 1 && perId.IDN.feiten.hoofdstad.open[0].status === "onzeker" && perId.IDN.feiten.hoofdstad.rollen.length === 0, "Indonesie: onzeker, geen vraag");
eis(perId.ISR.feiten.hoofdstad.rollen.length === 0 && perId.ISR.feiten.hoofdstad.open.length === 0, "Israel: geen gevraagde rol");
eis(perId.BEN.feiten.hoofdstad.notities.some(function(n) { return n.stad === "Cotonou" && n.tekst.indexOf("niet afwezig") >= 0; }), "Cotonou: niet aangetoond, niet afwezig");
[["BDI", "gedeeltelijk"], ["MYS", "gedeeltelijk"], ["NLD", "niet aangetoond"], ["NRU", "niet aangetoond"], ["SWZ", "niet aangetoond"]].forEach(function(k) { eis(perId[k[0]].feiten.hoofdstad.open.some(function(x) { return x.status === k[1]; }), "open rol " + k[1] + ": " + k[0]); });

// de besluiten van 17-11-2026
eis(perId.BLR.naam.waarde === "Wit-Rusland" && perId.GBR.naam.waarde === "Verenigd Koninkrijk" && perId.SAU.naam.waarde === "Saoedi-Arabië", "besluiten Wit-Rusland, Verenigd Koninkrijk, Saoedi-Arabië");
eis(perId.COG.naam.waarde === "Congo-Brazzaville" && perId.COD.naam.waarde === "Congo-Kinshasa" && perId.COG.naam.varianten.some(function(v) { return v.naam === "Congo"; }) && perId.COD.naam.varianten.some(function(v) { return v.naam === "Congo"; }), "besluit Congo-Brazzaville en Congo-Kinshasa, Congo als variant");
["BLR", "GBR", "SAU", "COG", "COD"].forEach(function(c) { eis(!!perId[c].naam.besluit, "besluit vastgelegd bij " + c); });

// ---- een variant met een gebied heeft die aantekening op de TU-pagina ----
R.LANDEN.forEach(function(r) {
  r.naam.varianten.forEach(function(v) {
    if (v.gebied) eis((r.naam.opmerking || "").indexOf("vrijwel alleen in " + v.gebied + " gebruikelijk") >= 0, "gebied van de variant staat bij de TU: " + r.id + " " + v.naam);
  });
});
// en omgekeerd: staat er zo'n aantekening bij de naam, dan heeft een variant dat gebied (de voorkeursnaam heeft er nooit een)
R.LANDEN.forEach(function(r) {
  ["Vlaanderen", "Nederland"].forEach(function(g) {
    if ((r.naam.opmerking || "").indexOf("vrijwel alleen in " + g + " gebruikelijk") >= 0) eis(r.naam.varianten.some(function(v) { return v.gebied === g; }), "aantekening " + g + " verwerkt als gebied van een variant: " + r.id);
  });
});
// ---- namen: geen dubbele voorkeursnamen buiten de open lijst; een variant is nooit de naam van een ander land ----
var perNaam = {};
R.LANDEN.forEach(function(r) { (perNaam[r.naam.waarde] = perNaam[r.naam.waarde] || []).push(r.id); });
var afwIds = {};
R.AFWIJKINGEN_LANDEN.forEach(function(a) { afwIds[a.id] = a; });
Object.keys(perNaam).forEach(function(n) { if (perNaam[n].length > 1) eis(!!afwIds["naam-dubbel-" + perNaam[n].join("-")], "dubbele voorkeursnaam staat op de open lijst: " + n); });
R.LANDEN.forEach(function(r) { r.naam.varianten.forEach(function(v) { eis(!perNaam[v.naam] || perNaam[v.naam].indexOf(r.id) >= 0, "variant is geen naam van een ander land: " + v.naam); }); });
// ---- ISO: uniek ----
var a2 = {}, a3 = {};
R.LANDEN.forEach(function(r) { var x2 = r.feiten.iso.alpha2.waarde, x3 = r.feiten.iso.alpha3.waarde; if (x2) { eis(!a2[x2], "alpha-2 uniek: " + x2); a2[x2] = 1; } eis(!a3[x3], "alpha-3 uniek: " + x3); a3[x3] = 1; });

// ---- vergelijking met WC (eigen code): elke afwijking staat in AFWIJKINGEN_LANDEN ----
function norm(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, ""); }
var verwacht = {};
R.LANDEN.forEach(function(r) {
  var w = wcPer[r.id];
  eis(!!w, "WC kent " + r.id);
  if (!w) return;
  if (r.feiten.iso.alpha3.controle.waarde !== r.id) verwacht["iso-" + r.id] = 1;
  if (w.translations.nld.common !== r.naam.waarde) verwacht["naam-wc-" + r.id] = 1;
  if (!r.feiten.hoofdstad.bijzonder && !(w.capital || []).some(function(c) { return [r.feiten.hoofdstad.waarde].concat(r.feiten.hoofdstad.varianten).map(norm).indexOf(norm(c)) >= 0; })) verwacht["hoofdstad-wc-" + r.id] = 1;
  if (DEEL[w.region] !== r.feiten.werelddeel.waarde) verwacht["werelddeel-wc-" + r.id] = 1;
  if (r.feiten.hoofdstad.bijzonder) verwacht["bijzonder-" + r.id] = 1;
  if (r.feiten.hoofdstad.bijzonder) r.feiten.hoofdstad.open.forEach(function(x) { verwacht["rol-open-" + r.id + "-" + x.rol.replace(/ /g, "")] = 1; });
  if (r.naam.besluit && ["COG", "COD"].indexOf(r.id) < 0) verwacht["naam-voorkeur-" + r.id] = 1;
});
Object.keys(verwacht).forEach(function(id) { eis(!!afwIds[id], "afwijking ontbreekt: " + id); });
eis(!!afwIds["werelddeel-wc-CYP"], "Cyprus: verschil M49 en WC gemeld");
eis(!!afwIds["naam-dubbel-COG-COD"], "dubbele TU-naam Congo gemeld");

// ---- de open lijst ----
var open = {};
fs.readFileSync(path.join(ROOT, "src", "core", "topo", "open-vragen.md"), "utf8").split("\n").forEach(function(r) {
  var m = /^- ([a-zA-Z0-9-]+) \| ([a-z ]+) \| (.+)$/.exec(r);
  if (m) open[m[1]] = { status: m[2], uitleg: m[3] };
});
R.AFWIJKINGEN_LANDEN.forEach(function(a) {
  var o = open[a.id];
  eis(!!o && STATUSSEN.indexOf(o.status) >= 0 && o.uitleg.length > 10, "op de open lijst met status: " + a.id);
});

// ---- reproduceerbaar en app onaangeroerd ----
if (!MUTANT) {
  var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "landen-"));
  [1, 2].forEach(function(n) {
    execFileSync("node", [path.join(HIER, "maak-landen.mjs"), WCF, path.join(tmp, "r" + n)]);
    eis(fs.readFileSync(path.join(tmp, "r" + n, "landen.js")).equals(fs.readFileSync(STANDAARD)), "script geeft byte-gelijk landen.js (run " + n + ")");
  });
  var git = function(a) { return execFileSync("git", a, { cwd: ROOT }).toString(); };
  git(["diff", "--name-only", "main"]).split("\n").concat(git(["ls-files", "--others", "--exclude-standard"]).split("\n")).filter(Boolean).forEach(function(f) {
    eis(/^(tools\/topo\/|src\/core\/topo\/|public\/kaartproef\/)/.test(f), "buiten de toegestane mappen gewijzigd: " + f);
  });
}

console.log((fouten.length ? "FOUT" : "GOED") + ": " + geslaagd + " controles geslaagd, " + fouten.length + " mislukt");
fouten.slice(0, 30).forEach(function(f) { console.log("  - " + f); });
process.exit(fouten.length ? 1 : 0);
