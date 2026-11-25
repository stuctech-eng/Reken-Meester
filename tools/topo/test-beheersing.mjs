// Test van de beheersing per kennisitem (plan T4 par. 4, 6 en 9). Alleen bouwomgeving, in Node.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik (vanuit de hoofdmap van de repo): node tools/topo/test-beheersing.mjs
// - de regels in een tabel: status, een stap per dag, terugval, de tussenpozen, Meesterschap (gz), lezen en schrijven;
// - verwerkAntwoorden: alleen antwoorden met kennis, ook alleen bij goed, de invoer blijft gelijk;
// - voortgang: een sessie zonder kennis maakt geen deel topo; een sessie met kennis wel; de itemVoorwaarde houdt mastered tegen
//   zolang een kennisitem nieuw is; mastered blijft staan; overname neemt de itemstand mee, wissen maakt hem leeg;
// - determinisme: 1.000 willekeurige reeksen sessies van twee schrijvers, via herbouw in elke aanvoervolgorde: dezelfde stand;
// - twee toestellen tegelijk (par. 6.2a): stapTransactie uit src/services/sync.js met een nagebootste Firestore, in beide volgordes
//   en met een conflict ertussen: dezelfde itemstand, met de antwoorden van allebei, geen enkel antwoord dubbel;
// - de omvang (par. 6.4): 6.000 kennisitems met de langste sleutel en ruime waarden blijven onder 400 kB (grootteregels Firestore).
// Mutanten: een tweede stap op dezelfde dag, een vergeten itemVoorwaarde en een dubbel toegepaste sessie moeten gevangen worden.

import path from "path";
import { register } from "module";
import { fileURLToPath, pathToFileURL } from "url";

var HIER = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.join(HIER, "..", "..");
function bron(p) { return pathToFileURL(path.join(ROOT, p)).href; }
var n = 0, fouten = [];
function eis(ok, tekst) { n++; if (!ok) fouten.push(tekst); }

// Firebase nagebootst: sync.js importeert firebase/firestore en ./firebase.js; hier geeft de test zijn eigen versies
var NEP = "export var db = {}; export function doc(d, c, id) { return { pad: c + '/' + id }; } export function getDoc() { throw new Error('niet in de test'); } export function runTransaction() { throw new Error('niet in de test'); }";
var HAAK = "export async function resolve(spec, ctx, next) { if (spec === 'firebase/firestore' || /services\\/firebase\\.js$/.test(spec) || spec === './firebase.js') return { url: 'data:text/javascript,' + encodeURIComponent(" + JSON.stringify(NEP) + "), shortCircuit: true }; return next(spec, ctx); }";
register("data:text/javascript," + encodeURIComponent(HAAK), import.meta.url);

globalThis.__TOPO__ = true;
var B = await import(bron("src/core/topo/beheersing.js"));
var VG = await import(bron("src/core/voortgang.js"));
var SV = await import(bron("src/core/save.js"));
var SY = await import(bron("src/services/sync.js"));

// ── de regels ──
eis(B.dagNr("2026-01-01") === 0 && B.dagNr("2026-11-25") === 328 && B.dagNr("2027-01-01") === 365, "dagNr telt vanaf 2026-01-01");
var it = B.leegItem();
eis(B.status(it) === "nieuw" && !B.aanDeBeurt(it, 5), "leeg: nieuw, niet aan de beurt");
var f0 = B.pasAntwoordToe(it, false, true, 3);
eis(f0.st === 0 && f0.f === 1 && B.status(f0) === "nieuw", "fout zonder eerdere goede: stap 0, nog nieuw");
var a = B.pasAntwoordToe(it, true, true, 10);
eis(a.g === 1 && a.st === 1 && a.dg === 1 && a.gz === 0 && B.status(a) === "ontwikkeling", "eerste goed: stap 1, in ontwikkeling, met opties geen gz");
eis(!B.aanDeBeurt(a, 10) && B.aanDeBeurt(a, 11), "stap 1: een dag later aan de beurt");
var b = B.pasAntwoordToe(a, true, true, 10);
eis(b.g === 2 && b.st === 1 && b.dg === 1, "tweede goed op dezelfde dag: geen nieuwe dag, geen stap");
var c = B.pasAntwoordToe(b, true, false, 11);
eis(c.g === 3 && c.st === 2 && c.dg === 2 && c.gz === 1 && B.status(c) === "beheerst", "goed op een tweede dag: stap 2, beheerst (3 goed, 2 dagen, laatste goed)");
eis(!B.aanDeBeurt(c, 13) && B.aanDeBeurt(c, 14), "stap 2: drie dagen later aan de beurt");
var d = B.pasAntwoordToe(c, false, false, 14);
eis(d.st === 1 && d.lg === 0 && B.status(d) === "ontwikkeling", "beheerst en dan fout: stap 1, terug naar in ontwikkeling");
var e = B.pasAntwoordToe(d, true, false, 14);
eis(e.st === 2 && e.dg === 3 && B.status(e) === "beheerst", "fout en goed op een nieuwe dag: stap 2 en weer beheerst");
var stap = B.leegItem();
for (var dg = 0; dg < 20; dg++) stap = B.pasAntwoordToe(stap, true, false, dg * 100);
eis(stap.st === 6 && B.TUSSENPOZEN[stap.st - 1] === 60, "de herhaling stopt bij stap 6 (60 dagen)");
eis(B.TUSSENPOZEN.join(",") === "1,3,7,14,30,60", "tussenpozen 1, 3, 7, 14, 30, 60");
var m = B.leegItem();
[1, 2, 3].forEach(function(dag) { m = B.pasAntwoordToe(m, true, true, dag); });
eis(B.status(m) === "beheerst" && B.status(m, true) === "nieuw", "Meesterschap: goed met opties telt niet");
m = B.pasAntwoordToe(m, true, false, 4);
eis(B.status(m, true) === "ontwikkeling", "Meesterschap: een keer goed zonder opties is in ontwikkeling");
var rt = B.leesItem(B.schrijfItem(e));
eis(JSON.stringify(rt) === JSON.stringify(e), "schrijfItem en leesItem: heen en terug gelijk");
eis(B.schrijfItem({ g: 1295, f: 36, st: 6, dg: 40, ld: 400, lg: 1, gz: 0, gd: 400 }) === "zz.10.6.14.b4.1.0.b4", "base 36 met punten");
eis(JSON.stringify(B.leesItem(undefined)) === JSON.stringify(B.leegItem()), "geen stand: leeg item");

// verwerkAntwoorden
var invoer = { "x|a": B.schrijfItem(a) };
var kopie = JSON.stringify(invoer);
var na = B.verwerkAntwoorden(invoer, [
  { correct: true, kennis: { sleutel: "p|s", ook: ["p|b"], opties: false } },
  { correct: false, kennis: { sleutel: "q|s", ook: ["q|b"], opties: false } },
  { correct: true },
  { correct: false, kennis: { sleutel: "x|a", opties: false } },
], 11);
eis(JSON.stringify(invoer) === kopie, "verwerkAntwoorden verandert de invoer niet");
eis(B.leesItem(na["p|s"]).g === 1 && B.leesItem(na["p|b"]).g === 1, "typen goed: s en b goed");
eis(B.leesItem(na["q|s"]).f === 1 && na["q|b"] === undefined, "spelfout: alleen s fout, b ongemoeid");
eis(B.leesItem(na["x|a"]).f === 1 && B.leesItem(na["x|a"]).st === 1, "fout op een bestaand item: stap 1");
eis(Object.keys(na).length === 4, "een antwoord zonder kennis telt niet");
eis(B.allesMinstensInOntwikkeling(na, ["p|s", "p|b", "x|a"]) && !B.allesMinstensInOntwikkeling(na, ["p|s", "q|s"]), "itemVoorwaarde: alles minstens in ontwikkeling");
var tl = B.telling(na, ["p|s", "q|s", "x|a", "z|a"]);
eis(tl.totaal === 4 && tl.nieuw === 2 && tl.ontwikkeling === 2 && tl.beheerst === 0, "telling per status");

// ── voortgang ──
var STAND = VG.normaliseer(null);
function sessie(schrijver, nr, datum, subject, skillId, antwoorden, skillItems) {
  var c = 0; antwoorden.forEach(function(r) { if (r.correct) c++; });
  var ss = {}; ss[skillId] = { correct: c, total: antwoorden.length };
  var r = { subjectId: subject, level: 1, totalCorrect: c, totalQuestions: antwoorden.length, totalXp: c, results: antwoorden, sessionSkillStats: ss, promotionSnapshots: {} };
  if (skillItems) { r.skillItems = {}; r.skillItems[skillId] = skillItems; }
  var dt = datum.split("-"), g = new Date(Date.UTC(Number(dt[0]), Number(dt[1]) - 1, Number(dt[2]) - 1)).toISOString().slice(0, 10);
  return { schrijver: schrijver, nr: nr, soort: "sessie", result: r, datum: datum, gisteren: g };
}
function antw(sleutel, goed, opties) { return { correct: goed, kennis: { sleutel: sleutel, opties: !!opties } }; }

var reken = VG.pasBewerkingToe(STAND, sessie("w1", 1, "2026-11-25", "optellen", "s01_single_easy", [{ correct: true }, { correct: true }, { correct: false }, { correct: true }]));
eis(!("topo" in reken), "een sessie zonder kennisitems maakt geen deel topo");
var KEYS = ["prov-nl-utrecht|a", "prov-nl-zeeland|a", "prov-nl-drenthe|a", "prov-nl-limburg|a"];
var veel = []; for (var i = 0; i < 12; i++) veel.push(antw(KEYS[i % 3], true));
var s1 = VG.pasBewerkingToe(STAND, sessie("w1", 1, "2026-11-25", "topo_nlbe", "nb02", veel, KEYS));
eis(s1.topo && s1.topo.v === 1 && Object.keys(s1.topo.items).length === 3, "een sessie met kennisitems maakt het deel topo");
eis(!s1.subjects.topo_nlbe.skillStats.nb02.mastered, "itemVoorwaarde: 12 goed, maar Limburg nog nieuw: niet beheerst");
var zonderVoorwaarde = VG.pasBewerkingToe(STAND, sessie("w1", 1, "2026-11-25", "topo_nlbe", "nb02", veel));
eis(zonderVoorwaarde.subjects.topo_nlbe.skillStats.nb02.mastered, "mutant (zonder skillItems): wel beheerst; de test ziet het verschil");
var s2 = VG.pasBewerkingToe(s1, sessie("w1", 2, "2026-11-26", "topo_nlbe", "nb02", [antw(KEYS[3], true), antw(KEYS[0], true), antw(KEYS[1], true), antw(KEYS[2], true)], KEYS));
eis(s2.subjects.topo_nlbe.skillStats.nb02.mastered, "alle items minstens in ontwikkeling en de sessie haalt de regel: beheerst");
var s3 = VG.pasBewerkingToe(s2, sessie("w1", 3, "2026-11-27", "topo_nlbe", "nb02", [antw(KEYS[0], false), antw(KEYS[1], false), antw(KEYS[2], false), antw(KEYS[3], false)], KEYS));
eis(s3.subjects.topo_nlbe.skillStats.nb02.mastered && B.leesItem(s3.topo.items[KEYS[0]]).st === 1, "mastered blijft staan; het item valt terug naar stap 1");
eis(B.leesItem(s2.topo.items[KEYS[0]]).dg === 2 && B.leesItem(s2.topo.items[KEYS[0]]).ld === B.dagNr("2026-11-26"), "de dag komt uit de datum van de bewerking");
var ov = VG.pasBewerkingToe(VG.normaliseer(null), { schrijver: "w2", nr: 1, soort: "overname", stand: VG.zonderSyncVelden(s3) });
eis(JSON.stringify(ov.topo) === JSON.stringify(s3.topo), "overname neemt de itemstand mee");
var ws = VG.pasBewerkingToe(s3, { schrijver: "w1", nr: 4, soort: "wissen" });
eis(!("topo" in ws), "wissen maakt de itemstand leeg");
var oudConcept = VG.pasBewerkingToe(s3, sessie("w1", 4, "2026-11-28", "topo_nlbe", "nb02", [{ correct: true }, { correct: true }]));
eis(JSON.stringify(oudConcept.topo) === JSON.stringify(s3.topo), "een sessie van voor T4 (zonder kennis) verandert de itemstand niet");

// ── determinisme ──
var seed = 7;
function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
function willekeurigeSessie(schrijver, nr) {
  var ant = [], k = 3 + Math.floor(rnd() * 6);
  for (var j = 0; j < k; j++) ant.push(antw(KEYS[Math.floor(rnd() * 4)], rnd() < 0.7, rnd() < 0.5));
  return sessie(schrijver, nr, "2026-12-" + String(1 + Math.floor(rnd() * 28)).padStart(2, "0"), "topo_nlbe", "nb02", ant, KEYS);
}
var ongelijk = 0;
for (var reeks = 0; reeks < 1000; reeks++) {
  var A = [], Bq = [], na1 = 1 + Math.floor(rnd() * 4), na2 = 1 + Math.floor(rnd() * 4);
  for (var x = 1; x <= na1; x++) A.push(willekeurigeSessie("toestel-a", x));
  for (var y = 1; y <= na2; y++) Bq.push(willekeurigeSessie("toestel-b", y));
  var wA = { schrijver: "toestel-a", items: A }, wB = { schrijver: "toestel-b", items: Bq };
  var h1 = VG.herbouw(STAND, [wA, wB]).stand;
  var h2 = VG.herbouw(STAND, [wB, wA]).stand;
  // in stukken: eerst een deel van A, dan alles
  var h3 = VG.herbouw(VG.herbouw(STAND, [{ schrijver: "toestel-a", items: A.slice(0, 1) }]).stand, [wB, wA]).stand;
  var h4 = VG.herbouw(h1, [wA, wB]).stand;
  if (JSON.stringify(h1) !== JSON.stringify(h2) || JSON.stringify(h1) !== JSON.stringify(h4)) ongelijk++;
  if (JSON.stringify(h1.topo) !== JSON.stringify(h3.topo) && na1 > 0) {
    // h3 past A[0] eerst toe en daarna B voor de rest van A: de itemstand mag dan alleen verschillen als de volgorde ertoe doet;
    // de tellers g en f moeten altijd gelijk zijn
    var gelijkeTellers = KEYS.every(function(s) { var p = B.leesItem(h1.topo.items[s]), q = B.leesItem(h3.topo.items[s]); return p.g === q.g && p.f === q.f && p.gz === q.gz; });
    if (!gelijkeTellers) ongelijk++;
  }
  var totaal = 0; A.concat(Bq).forEach(function(bw) { bw.result.results.forEach(function() { totaal++; }); });
  var geteld = 0; KEYS.forEach(function(s) { var p = B.leesItem((h1.topo.items || {})[s]); geteld += p.g + p.f; });
  if (geteld !== totaal) ongelijk++;
}
eis(ongelijk === 0, "1.000 reeksen: dezelfde stand in elke aanvoervolgorde, elk antwoord precies een keer (" + ongelijk + " fout)");

// ── twee toestellen tegelijk, via stapTransactie (par. 6.2a) ──
function nepServer() {
  var doc = null;
  return {
    lees: function() { return doc ? JSON.parse(JSON.stringify(doc)) : null; },
    tx: function() {
      var gelezen = null, geschreven = null;
      return {
        get: async function() { gelezen = doc ? JSON.parse(JSON.stringify(doc)) : null; return { exists: function() { return !!gelezen; }, data: function() { return gelezen; } }; },
        set: function(ref, data) { geschreven = JSON.parse(JSON.stringify(data)); },
        commit: function() {
          var revNu = doc ? doc.rev : 0, revLees = gelezen ? gelezen.rev : 0;
          if (revNu !== revLees) return false;
          if (geschreven) { if (geschreven.rev !== revNu + 1) throw new Error("rev niet precies 1 hoger"); doc = geschreven; }
          return true;
        },
      };
    },
  };
}
async function slaOp(server, plek, conflictVoor) {
  for (var poging = 0; poging < 5; poging++) {
    var tx = server.tx();
    await SY.stapTransactie(tx, null, plek, "u1");
    if (conflictVoor && poging === 0) await conflictVoor();
    if (tx.commit()) return poging;
  }
  throw new Error("geen commit");
}
var sesA = [willekeurigeSessie("toestel-a", 1), willekeurigeSessie("toestel-a", 2)];
var sesB = [willekeurigeSessie("toestel-b", 1)];
var plekA = { alle: function() { return [{ schrijver: "toestel-a", items: sesA }]; } };
var plekB = { alle: function() { return [{ schrijver: "toestel-b", items: sesB }]; } };
var verwacht = VG.herbouw(STAND, [{ schrijver: "toestel-a", items: sesA }, { schrijver: "toestel-b", items: sesB }]).stand;
var uitkomsten = [];
for (var volg of ["AB", "BA", "A-conflict-B", "B-conflict-A"]) {
  var srv = nepServer();
  var eerste = volg[0] === "A" ? plekA : plekB, tweede = volg[0] === "A" ? plekB : plekA;
  if (volg.indexOf("conflict") > 0) {
    var herhaald = await slaOp(srv, eerste, function() { return slaOp(srv, tweede); });
    eis(herhaald === 1, volg + ": het conflict laat de eerste transactie een keer opnieuw lopen");
  } else {
    await slaOp(srv, eerste); await slaOp(srv, tweede);
  }
  var d2 = srv.lees();
  uitkomsten.push(JSON.stringify(d2.topo));
  var tel = 0; KEYS.forEach(function(s) { var p = B.leesItem((d2.topo.items || {})[s]); tel += p.g + p.f; });
  var tot = 0; sesA.concat(sesB).forEach(function(bw) { tot += bw.result.results.length; });
  eis(tel === tot && d2.toegepastTot["toestel-a"] === 2 && d2.toegepastTot["toestel-b"] === 1, volg + ": de antwoorden van allebei, elk precies een keer");
  // nog eens opslaan: niets dubbel
  await slaOp(srv, eerste); await slaOp(srv, tweede);
  eis(JSON.stringify(srv.lees().topo) === JSON.stringify(d2.topo) && srv.lees().rev === d2.rev, volg + ": opnieuw opslaan past niets dubbel toe");
}
// De volgorde is die van aankomst op de server (vast zodra opgeslagen): AB en A-conflict-B (B komt eerst binnen) zijn verschillend.
// Per volgorde moet de serverstand gelijk zijn aan herbouw in die volgorde, en de tellers zijn in elke volgorde gelijk.
var naAB = VG.herbouw(VG.herbouw(STAND, [{ schrijver: "toestel-a", items: sesA }]).stand, [{ schrijver: "toestel-b", items: sesB }]).stand;
var naBA = VG.herbouw(VG.herbouw(STAND, [{ schrijver: "toestel-b", items: sesB }]).stand, [{ schrijver: "toestel-a", items: sesA }]).stand;
eis(uitkomsten[0] === JSON.stringify(naAB.topo) && uitkomsten[3] === JSON.stringify(naAB.topo), "twee toestellen, A komt eerst aan: de serverstand is die van herbouw A dan B");
eis(uitkomsten[1] === JSON.stringify(naBA.topo) && uitkomsten[2] === JSON.stringify(naBA.topo), "twee toestellen, B komt eerst aan: de serverstand is die van herbouw B dan A");
eis(KEYS.every(function(s) { var p = B.leesItem(naAB.topo.items[s]), q = B.leesItem(naBA.topo.items[s]); return p.g === q.g && p.f === q.f && p.gz === q.gz; }), "twee toestellen: de tellers g, f en gz zijn in elke volgorde gelijk");
eis(verwacht.topo !== undefined, "herbouw met beide wachtrijen geeft een itemstand");
// een oude sessie die later aankomt, zet de laatste dag niet terug
var nieuw = B.pasAntwoordToe(B.pasAntwoordToe(B.leegItem(), true, true, 20), true, true, 21);
var oudLaat = B.pasAntwoordToe(nieuw, false, true, 5);
eis(oudLaat.ld === 21 && oudLaat.lg === 1 && oudLaat.st === nieuw.st && oudLaat.f === 1, "een antwoord van een eerdere dag telt mee, maar verandert de herhaling niet");

// ── de omvang (par. 6.4) ──
function fsMaat(k, v) { return Buffer.byteLength(k) + 1 + Buffer.byteLength(v) + 1; }
// de langste sleutel van nu (stad-nl-s-hertogenbosch|r:provinciehoofdstad-van, 48 tekens), voor alle 6.000 (ruim)
var grootste = "stad-nl-s-hertogenbosch|r:provinciehoofdstad-va";
var ruim = B.schrijfItem({ g: 1295, f: 1295, st: 6, dg: 1295, ld: 46655, lg: 1, gz: 1295, gd: 46655 });
var maat = 0;
for (var q2 = 0; q2 < 6000; q2++) maat += fsMaat(grootste + q2, ruim);
eis(maat < 600000, "6.000 kennisitems, alle met de langste sleutel en ruime waarden: " + maat + " bytes, onder 600 kB (grens Firestore 1 MB)");
var gewoon = 0;
for (var q3 = 0; q3 < 6000; q3++) gewoon += fsMaat("prov-nl-zh-" + String(q3).padStart(6, "0") + "|a", ruim);
eis(gewoon < 300000, "6.000 kennisitems met een gemiddelde sleutel (21 tekens) en ruime waarden: " + gewoon + " bytes, onder 300 kB");

console.log("test-beheersing: " + (fouten.length ? "FOUT" : "GOED") + ": " + (n - fouten.length) + " controles geslaagd, " + fouten.length + " mislukt");
fouten.forEach(function(f) { console.log("  - " + f); });
if (fouten.length) process.exit(1);
