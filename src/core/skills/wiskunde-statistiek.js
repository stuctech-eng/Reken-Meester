// Wiskunde, domein Statistiek en kans: gegevens, centrummaten, spreiding, kans, tellen en kansen in stappen.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Afspraken (plan ST v4):
// - Een kans is een breuk in eenvoudigste vorm ("3/8"); nooit 0 of 1 als antwoord.
// - Een procent is een geheel getal met "%" ("25%"); een kommagetal heeft hoogstens 1 decimaal ("7,5").
// - Kwartielen: Q1 is de mediaan van de onderste helft, Q3 van de bovenste helft; bij een oneven aantal
//   telt de mediaan zelf niet mee. De lijsten zijn zo gekozen dat Q1 en Q3 hele getallen zijn.
// - Elke vraag heeft vier verschillende keuzes: het antwoord en drie foute keuzes (de valkuilen van het
//   plan, zie q.valkuilen). Valt een valkuil samen met het antwoord of is hij ongeldig, dan vult een vaste
//   reserve aan (het antwoord plus of min een stap).
// - Fase S1: alleen vaardigheden zonder tekening. De vaardigheden met een tekening (st02, st03, st05-st09,
//   st14, st20, st26, st27) komen in fase S2 op hun plek in de volgorde; bestaande ids veranderen niet.

import { rnd, shuffle } from "./helpers.js";
import { createSkills } from "./flow.js";

var MIN = "−";
var DOT = "·";

function pickOne(list) { return list[rnd(0, list.length - 1)]; }
function ggd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = b; b = a % b; a = t; } return a; }
function som(lijst) { return lijst.reduce(function(s, x) { return s + x; }, 0); }
function gesorteerd(lijst) { return lijst.slice().sort(function(a, b) { return a - b; }); }
function lijstTekst(lijst) { return lijst.join(", "); }
// Verschillende hele getallen van min tot en met max (aantal stuks)
function verschillend(aantal, min, max) {
  var uit = [];
  while (uit.length < aantal) { var x = rnd(min, max); if (uit.indexOf(x) < 0) uit.push(x); }
  return uit;
}

// ── Schrijven ─────────────────────────────────────────────────────
// Tienden zonder eindnul: 75 -> "7,5", 70 -> "7"; geen hele tienden -> null
function dec(t) {
  if (typeof t !== "number" || !(t > 0) || Math.floor(t) !== t) return null;
  return t % 10 === 0 ? String(t / 10) : Math.floor(t / 10) + "," + (t % 10);
}
// Kans als breuk in eenvoudigste vorm; alleen strikt tussen 0 en 1, anders null
function kans(teller, noemer) {
  if (!(teller > 0) || !(noemer > teller) || Math.floor(teller) !== teller || Math.floor(noemer) !== noemer) return null;
  var g = ggd(teller, noemer);
  return (teller / g) + "/" + (noemer / g);
}
// Procent: geheel getal van 0 tot en met 100, anders null
function pct(v) { return (typeof v === "number" && Math.floor(v) === v && v >= 0 && v <= 100) ? v + "%" : null; }

// ── Keuzes en vraag ───────────────────────────────────────────────
// Eerste item is het goede antwoord; dubbele, lege en ongeldige items vallen af; minder dan 4 -> null
function choose4(items) {
  var uit = [];
  items.forEach(function(it) {
    if (it === null || it === undefined || uit.length >= 4) return;
    if (typeof it === "number" && (!(it > 0) || Math.floor(it) !== it)) return;
    if (uit.some(function(u) { return String(u) === String(it); })) return;
    uit.push(it);
  });
  if (uit.length < 4) return null;
  return { answer: uit[0], choices: shuffle(uit) };
}
// Reserve per invoersoort: het antwoord plus of min een stap
function reserveGetal(a) { return [a + 1, a - 1, a + 2, a - 2, a + 3, a + 10]; }
function reserveTienden(t) { return [dec(t + 5), dec(t - 5), dec(t + 10), dec(t - 10), dec(t + 15)]; }
function reserveProcent(v) { return [pct(v + 1), pct(v - 1), pct(v + 5), pct(v - 5), pct(v + 10), pct(v - 10)]; }
function reserveKans(teller, noemer) { return [kans(teller + 1, noemer), kans(teller - 1, noemer), kans(teller, noemer + 1), kans(teller + 2, noemer), kans(teller, noemer + 2)]; }
// Keuzes: antwoord, de drie valkuilen van het plan, daarna de reserve
function keuzes(antwoord, valkuilen, reserve) { return { c: choose4([antwoord].concat(valkuilen, reserve)), valkuilen: valkuilen }; }

// extra: velden die bij de vraag horen (isErrorSpotter, feiten, inputType per vraag)
function Q(question, k, stappen, extra) {
  if (!k.c) return null;
  var q = { question: question, answer: k.c.answer, choices: k.c.choices, terms: [stappen], valkuilen: k.valkuilen };
  if (question.length > 22) q.tekstVraag = true;
  if (k.c.choices.some(function(t) { return String(t).length > 9; })) q.smallChoices = true;
  if (extra) { for (var key in extra) q[key] = extra[key]; }
  return q;
}
function retry(fn) { for (var i = 0; i < 400; i++) { var q = fn(); if (q) return q; } throw new Error("geen geldige vraag"); }

var GEN = {};

// ── G1 Gegevens ordenen ───────────────────────────────────────────
var SOORT_LABEL = ["telbare getallen", "meetbare getallen", "categorieën zonder volgorde", "categorieën met volgorde"];
var SOORT_VB = [
  ["Aantal broers en zussen", "Aantal doelpunten in een wedstrijd", "Aantal huisdieren thuis", "Aantal boeken in je tas"],
  ["Lengte in cm", "Gewicht van een appel", "Tijd op de 100 meter", "Temperatuur buiten"],
  ["Lievelingskleur", "Merk van je fiets", "Soort huisdier", "Favoriete sport"],
  ["Kledingmaat (S, M, L)", "Tevredenheid (slecht, matig, goed)", "Medaille (goud, zilver, brons)", "Pittigheid (mild, medium, heet)"],
];
var SOORT_WAAROM = [
  "het zijn aantallen die je telt: 0, 1, 2, ... (geen tussenwaarden)",
  "je meet het; er zijn ook tussenwaarden (152,5 cm)",
  "het zijn namen zonder vaste volgorde",
  "het zijn namen met een vaste volgorde, maar geen getallen",
];
GEN.st01 = function(sub) {
  var s = sub % 4;
  var item = pickOne(SOORT_VB[s]);
  var k = keuzes(SOORT_LABEL[s], SOORT_LABEL.filter(function(l, i) { return i !== s; }), []);
  return Q(item + ": wat voor gegevens?", k, item + ": " + SOORT_WAAROM[s] + ". Dus " + SOORT_LABEL[s] + ".");
};

var RF_CONTEXT = ["leerlingen fietst naar school", "ballen is rood", "dagen regende het", "bezoekers kwam met de bus", "appels was rot"];
// Relatieve frequentie als procent (ook gebruikt door st36)
function relFreq(a, n) {
  var v = a * 100 / n;
  return { antwoord: pct(v), valkuilen: [pct(a), pct(n - a), pct(n)], reserve: reserveProcent(v),
    stappen: "Relatieve frequentie = aantal : totaal " + DOT + " 100%. " + a + " : " + n + " " + DOT + " 100 = " + v + "%." };
}
GEN.st04 = function() {
  var n = pickOne([20, 25, 40, 50, 200]);
  var stap = n / ggd(n, 100);
  var a = stap * rnd(1, n / stap - 1);
  var r = relFreq(a, n);
  return Q(a + " van de " + n + " " + pickOne(RF_CONTEXT) + ". Relatieve frequentie?", keuzes(r.antwoord, r.valkuilen, r.reserve), r.stappen);
};

// ── G3 Centrummaten ───────────────────────────────────────────────
GEN.st10 = function() {
  var n = rnd(5, 8), c = rnd(2, 3);
  // De lijst: de modus m (c keer), v (c - 1 keer) en de rest (elk 1 keer). waarden levert m, v en de rest,
  // dus 2 + (n - c - (c - 1)) verschillende getallen; samen precies n getallen
  var waarden = verschillend(2 + (n - c - (c - 1)), 1, 20);
  var m = waarden[0], v = waarden[1], rest = waarden.slice(2);
  var lijst = [];
  for (var i = 0; i < c; i++) lijst.push(m);
  for (var j = 0; j < c - 1; j++) lijst.push(v);
  lijst = shuffle(lijst.concat(rest));
  var midden = lijst[Math.floor(n / 2)];
  if (midden === m) return null;
  return Q("Modus van " + lijstTekst(lijst) + "?", keuzes(m, [midden, Math.max.apply(null, lijst), v], reserveGetal(m)),
    "De modus komt het vaakst voor: " + m + " staat er " + c + " keer in. Antwoord: " + m + ".");
};

GEN.st11 = function() {
  var n = pickOne([5, 7, 9]);
  var lijst = shuffle(verschillend(n, 1, 30)), s = gesorteerd(lijst), k = (n - 1) / 2;
  var med = s[k], midden = lijst[k];
  if (midden === med) return null;
  var gem = som(lijst) % n === 0 ? som(lijst) / n : null;
  return Q("Mediaan van " + lijstTekst(lijst) + "?", keuzes(med, [midden, gem, s[k + 1]], reserveGetal(med)),
    "Eerst sorteren: " + lijstTekst(s) + ". Het middelste getal is " + med + ".");
};

GEN.st12 = function() {
  var n = pickOne([4, 6, 8]);
  var lijst = shuffle(verschillend(n, 1, 30)), s = gesorteerd(lijst), k = n / 2;
  var a = s[k - 1], b = s[k], t = (a + b) * 5;
  var ua = lijst[k - 1], ub = lijst[k];
  if ((ua === a && ub === b) || (ua === b && ub === a)) return null;
  return Q("Mediaan van " + lijstTekst(lijst) + "?", keuzes(dec(t), [String(a), String(b), dec((ua + ub) * 5)], reserveTienden(t)),
    "Eerst sorteren: " + lijstTekst(s) + ". Twee middelste: " + a + " en " + b + ". (" + a + " + " + b + ") : 2 = " + dec(t) + ".");
};

// Gemiddelde van een lijst (ook gebruikt door st36)
function gemiddelde(lijst) {
  var n = lijst.length, s = som(lijst), sg = gesorteerd(lijst);
  if ((s * 10) % n !== 0) return null;
  var t = s * 10 / n;
  var med = n % 2 === 1 ? sg[(n - 1) / 2] * 10 : (sg[n / 2 - 1] + sg[n / 2]) * 5;
  var zonderEen = (s * 10) % (n - 1) === 0 ? dec(s * 10 / (n - 1)) : null;
  return { antwoord: dec(t), valkuilen: [String(s), zonderEen, dec(med)], reserve: reserveTienden(t),
    stappen: "Tel op: " + lijst.join(" + ") + " = " + s + ". Deel door het aantal (" + n + "): " + s + " : " + n + " = " + dec(t) + "." };
}
GEN.st13 = function() {
  var lijst = verschillend(rnd(4, 6), 1, 20);
  var g = gemiddelde(lijst);
  if (!g) return null;
  return Q("Gemiddelde van " + lijstTekst(lijst) + "?", keuzes(g.antwoord, g.valkuilen, g.reserve), g.stappen);
};

var RANG = { 4: "Vierde", 5: "Vijfde" };
GEN.st15 = function() {
  var n = pickOne([4, 5]), m = rnd(5, 15);
  var bekend = verschillend(n - 1, 1, 25), x = n * m - som(bekend);
  if (x < 1 || x > 30) return null;
  return Q("Gemiddelde van " + n + " getallen is " + m + ". Bekend: " + lijstTekst(bekend) + ". " + RANG[n] + " getal?",
    keuzes(x, [m, n * m, som(bekend)], reserveGetal(x)),
    "Samen moeten ze " + n + " " + DOT + " " + m + " = " + n * m + " zijn. Bekend samen: " + som(bekend) + ". " + n * m + " " + MIN + " " + som(bekend) + " = " + x + ".");
};

// "spreiding" en niet "spreidingsbreedte": dat woord past op 320 px niet in een keuzeknop (keuze B)
var MAAT_LABEL = ["gemiddelde", "mediaan", "modus", "spreiding"];
var MAAT_VB = [
  ["Een team deelt alle punten eerlijk: hoeveel punten per speler?", "Je cijfers zijn 6, 7 en 8 (geen uitschieter): welk getal zegt hoe je gemiddeld staat?", "Hoeveel liter water drinkt iemand per dag, als je de hele week eerlijk verdeelt?"],
  ["Huizenprijzen in een straat met één dure villa: wat zegt het meest over een gewoon huis?", "Salarissen in een bedrijf waar de directeur veel meer verdient: wat geeft het gewone salaris?", "Reistijden met één keer een grote file: wat is de gewone reistijd?"],
  ["Welke schoenmaat moet een winkel het meest inkopen?", "Welke kleur fiets komt het vaakst voor op het plein?", "Welk ijsje wordt het meest gekozen?"],
  ["Hoe ver liggen de hoogste en de laagste temperatuur van de week uit elkaar?", "Hoeveel scheelt de snelste tijd met de langzaamste tijd?", "Hoe groot is het verschil tussen de oudste en de jongste deelnemer?"],
];
var MAAT_WAAROM = [
  "eerlijk verdelen, zonder uitschieter: het gemiddelde",
  "één uitschieter trekt het gemiddelde omhoog; de mediaan (het middelste) heeft daar geen last van",
  "wat het vaakst voorkomt: de modus",
  "hoogste min laagste: de spreiding (spreidingsbreedte)",
];
GEN.st16 = function(sub) {
  var s = sub % 4;
  return Q(pickOne(MAAT_VB[s]), keuzes(MAAT_LABEL[s], MAAT_LABEL.filter(function(l, i) { return i !== s; }), []),
    "Hier past " + MAAT_WAAROM[s] + ".");
};

// ── G4 Spreiding ──────────────────────────────────────────────────
GEN.st17 = function() {
  var n = rnd(5, 7);
  var lijst = shuffle(verschillend(n, 1, 40)), s = gesorteerd(lijst);
  var max = s[n - 1], min = s[0], eerste = lijst[0], laatste = lijst[n - 1];
  if ((eerste === min || eerste === max) && (laatste === min || laatste === max)) return null;
  var ans = max - min;
  return Q("Spreidingsbreedte van " + lijstTekst(lijst) + "?", keuzes(ans, [max, Math.abs(eerste - laatste), max - s[1]], reserveGetal(ans)),
    "Grootste " + MIN + " kleinste: " + max + " " + MIN + " " + min + " = " + ans + ".");
};

// Gesorteerde lijst van 7 of 11 verschillende getallen met Q1 en Q3 (de mediaan telt niet mee)
function kwartielLijst() {
  var n = pickOne([7, 11]);
  var s = gesorteerd(verschillend(n, 1, 60));
  var i1 = n === 7 ? 1 : 2, i3 = n === 7 ? 5 : 8, im = (n - 1) / 2;
  // Valkuil: met de mediaan meegeteld in de helften (alleen als dat een heel getal is)
  var q1m = (s[i1] + s[i1 + 1]) % 2 === 0 ? (s[i1] + s[i1 + 1]) / 2 : null;
  var q3m = (s[i3 - 1] + s[i3]) % 2 === 0 ? (s[i3 - 1] + s[i3]) / 2 : null;
  return { s: s, n: n, q1: s[i1], q3: s[i3], med: s[im], q1m: q1m, q3m: q3m };
}
function helften(k) {
  var h = (k.n - 1) / 2;
  return "Mediaan " + k.med + " (telt niet mee). Onderste helft: " + lijstTekst(k.s.slice(0, h)) + ", bovenste helft: " + lijstTekst(k.s.slice(h + 1)) + ".";
}
GEN.st18 = function(sub) {
  var k = kwartielLijst(), q3 = sub % 2 === 1;
  var ans = q3 ? k.q3 : k.q1;
  return Q("Gesorteerd: " + lijstTekst(k.s) + ". " + (q3 ? "Q3 (derde kwartiel)" : "Q1 (eerste kwartiel)") + "?",
    keuzes(ans, [k.med, q3 ? k.q1 : k.q3, q3 ? k.q3m : k.q1m], reserveGetal(ans)),
    helften(k) + " " + (q3 ? "Q3 is het middelste van de bovenste helft: " : "Q1 is het middelste van de onderste helft: ") + ans + ".");
};
GEN.st19 = function() {
  var k = kwartielLijst(), ans = k.q3 - k.q1;
  return Q("Gesorteerd: " + lijstTekst(k.s) + ". Kwartielafstand?", keuzes(ans, [k.s[k.n - 1] - k.s[0], k.q3, k.q1], reserveGetal(ans)),
    helften(k) + " Q1 = " + k.q1 + ", Q3 = " + k.q3 + ". Kwartielafstand = Q3 " + MIN + " Q1 = " + ans + ".");
};

// ── G5 Kans: de basis ─────────────────────────────────────────────
var SCHAAL = ["onmogelijk", "klein", "fifty-fifty", "groot", "zeker"];
var SCHAAL_VB = [
  ["Met één dobbelsteen 7 gooien", "Het wordt morgen 30 februari", "Uit een zak met alleen rode knikkers een blauwe pakken"],
  ["Met een dobbelsteen een 6 gooien", "De hoofdprijs in de loterij winnen", "Uit 10 kaartjes precies het jouwe trekken"],
  ["Kop gooien met een munt", "Met een dobbelsteen een even getal gooien", "Uit 5 rode en 5 blauwe knikkers een rode pakken"],
  ["Met een dobbelsteen géén 6 gooien", "Uit 9 rode en 1 blauwe knikker een rode pakken", "In juli is het overdag warmer dan 5 graden"],
  ["Met een dobbelsteen 1, 2, 3, 4, 5 of 6 gooien", "Na maandag komt dinsdag", "Uit een zak met alleen rode knikkers een rode pakken"],
];
GEN.st21 = function(sub) {
  var s = sub % 5;
  var andere = shuffle(SCHAAL.filter(function(l, i) { return i !== s; })).slice(0, 3);
  return Q(pickOne(SCHAAL_VB[s]) + ": hoe groot is de kans?", keuzes(SCHAAL[s], andere, []),
    "Kan het nooit, dan onmogelijk; altijd, dan zeker; precies de helft van de keren, dan fifty-fifty. Hier: " + SCHAAL[s] + ".");
};

var KLEUREN = ["rode", "blauwe", "groene", "gele"];
var KLEUR = ["rood", "blauw", "groen", "geel"];
// Zak met knikkers (ook gebruikt door st36): kans op de eerste kleur
function zakKans(aantallen, ding) {
  var t = som(aantallen), kx = aantallen[0], ander = aantallen[1];
  var tekst = aantallen.map(function(a, i) { return a + " " + KLEUREN[i]; }).join(aantallen.length === 2 ? " en " : ", ");
  return {
    tekst: tekst,
    antwoord: kans(kx, t),
    valkuilen: [kans(kx, t - kx), kans(1, aantallen.length), kans(ander, t)],
    reserve: reserveKans(kx, t),
    stappen: "Gunstig : mogelijk = " + kx + " : " + t + " = " + kans(kx, t) + " (mogelijk: " + ding + ", " + t + " samen).",
  };
}
GEN.st22 = function() {
  var nk = pickOne([2, 2, 3]), aantallen = [];
  for (var i = 0; i < nk; i++) aantallen.push(rnd(1, 7));
  var z = zakKans(aantallen, "alle knikkers");
  if (!z.antwoord) return null;
  return Q("Zak met " + z.tekst + " knikkers. Kans op " + KLEUR[0] + "?", keuzes(z.antwoord, z.valkuilen, z.reserve), z.stappen);
};

var DOB_GEBEURTENIS = [["een even getal", 3], ["een oneven getal", 3], ["meer dan 3", 3], ["minder dan 4", 3]];
GEN.st23 = function(sub) {
  if (sub % 2 === 0) {
    var g = pickOne(DOB_GEBEURTENIS);
    return Q("Dobbelsteen: kans op " + g[0] + " in procenten?", keuzes(pct(50), [pct(g[1]), pct(33), pct(17)], reserveProcent(50)),
      g[1] + " van de 6 uitkomsten zijn gunstig. 3 : 6 = 1/2 = 50%.");
  }
  var t = pickOne([4, 5, 10, 20, 25]);
  var k = rnd(1, t - 1);
  var v = k * 100 / t;
  return Q("Zak met " + t + " knikkers, waarvan " + k + " rode. Kans op rood in procenten?",
    keuzes(pct(v), [pct(k), pct(100 - v), pct(100 / t)], reserveProcent(v)),
    k + " van de " + t + " is gunstig. " + k + " : " + t + " " + DOT + " 100% = " + v + "%.");
};

GEN.st24 = function(sub) {
  if (sub % 2 === 0) {
    var g = pickOne([[1, "geen 6"], [1, "geen 1"], [2, "geen 1 en geen 2"], [2, "geen 5 en geen 6"]]);
    var wel = g[0], niet = 6 - wel;
    return Q("Dobbelsteen: kans op " + g[1] + "?",
      keuzes(kans(niet, 6), [kans(wel, 6), kans(1, niet), kans(niet - 1, niet)], reserveKans(niet, 6)),
      "Kans op wel: " + kans(wel, 6) + ". Kans op niet = 1 " + MIN + " " + kans(wel, 6) + " = " + kans(niet, 6) + ".");
  }
  var t = rnd(5, 12), c = rnd(1, t - 3), r = t - c;
  var foutNiet = [kans(c, t), kans(1, r), kans(r - 1, r)];
  // Plan: de drie foute keuzes zijn verschillend en nooit het antwoord (anders een andere zak)
  if (new Set(foutNiet.concat([kans(r, t)])).size !== 4) return null;
  return Q("Zak met " + c + " rode en " + r + " blauwe knikkers. Kans op geen rode?",
    keuzes(kans(r, t), foutNiet, reserveKans(r, t)),
    "Geen rode = blauw: " + r + " van de " + t + ". 1 " + MIN + " " + kans(c, t) + " = " + kans(r, t) + ".");
};

var EXPERIMENT = [["dobbelsteen", "een 6", 17, 6], ["munt", "kop", 50, 2]];
GEN.st25 = function() {
  var e = pickOne(EXPERIMENT), n = pickOne([50, 100, 200, 400, 500]);
  var stap = n / ggd(n, 100);
  var k = stap * Math.round((n / e[3]) / stap + rnd(-3, 3));
  if (k <= 0 || k >= n) return null;
  var v = k * 100 / n;
  return Q("Een " + e[0] + " " + n + " keer gegooid: " + k + " keer " + e[1] + ". Geschatte kans in procenten?",
    keuzes(pct(v), [pct(k), pct(e[2]), pct(100 - v)], reserveProcent(v)),
    "Relatieve frequentie als schatting van de kans: " + k + " : " + n + " " + DOT + " 100% = " + v + "%.");
};

// ── G6 Tellen ─────────────────────────────────────────────────────
var KEER_CONTEXT = [["broeken", "shirts", "outfits"], ["soorten brood", "soorten beleg", "broodjes"], ["voorgerechten", "hoofdgerechten", "menu's"], ["kleuren fiets", "soorten zadel", "fietsen"]];
// Keerregel (ook gebruikt door st36)
function keerregel(a, b, ctx) {
  return { vraag: a + " " + ctx[0] + " en " + b + " " + ctx[1] + ". Hoeveel " + ctx[2] + " kun je maken?",
    antwoord: a * b, valkuilen: [a + b, 2 * a * b, Math.max(a, b)], reserve: reserveGetal(a * b),
    stappen: "Bij elk van de " + a + " " + ctx[0] + " passen " + b + " " + ctx[1] + ": " + a + " " + DOT + " " + b + " = " + a * b + "." };
}
GEN.st28 = function() {
  var k = keerregel(rnd(2, 6), rnd(2, 6), pickOne(KEER_CONTEXT));
  return Q(k.vraag, keuzes(k.antwoord, k.valkuilen, k.reserve), k.stappen);
};

var VOLGORDE_CONTEXT = ["kinderen op een rij staan", "boeken naast elkaar op een plank zetten", "lopers in een andere volgorde finishen"];
GEN.st29 = function() {
  var n = pickOne([3, 4, 5]), f = 1, keten = [];
  for (var i = n; i >= 1; i--) { f *= i; keten.push(i); }
  return Q("Op hoeveel manieren kun je " + n + " " + pickOne(VOLGORDE_CONTEXT) + "?",
    keuzes(f, [n * n, n * (n + 1) / 2, n * (n - 1)], reserveGetal(f)),
    "Eerste plek: " + n + " keuzes, dan " + (n - 1) + ", enzovoort. " + keten.join(" " + DOT + " ") + " = " + f + ".");
};

GEN.st30 = function() {
  var L = pickOne([2, 3, 4]), ans = Math.pow(10, L), zonder = 1;
  for (var i = 0; i < L; i++) zonder *= 10 - i;
  return Q("Code van " + L + " cijfers (0 tot en met 9). Cijfers mogen herhalen en een 0 vooraan mag. Hoeveel codes?",
    keuzes(ans, [10 * L, zonder, 9 * Math.pow(10, L - 1)], reserveGetal(ans)),
    "Elke plek heeft 10 mogelijkheden: " + Array(L + 1).join("10 " + DOT + " ").replace(/ · $/, "") + " = " + ans + ".");
};

// ── G7 Kansen in stappen ──────────────────────────────────────────
var TWEE_KEER = [
  ["Twee keer met een dobbelsteen: kans op twee keer een 6?", 1, 6, 1, 6],
  ["Twee keer een munt: kans op twee keer kop?", 1, 2, 1, 2],
  ["Twee keer met een dobbelsteen: kans op twee keer een even getal?", 1, 2, 1, 2],
  ["Dobbelsteen en munt: kans op een 6 en kop?", 1, 6, 1, 2],
  ["Twee keer met een dobbelsteen: kans op twee keer meer dan 4?", 1, 3, 1, 3],
];
GEN.st31 = function() {
  var t = pickOne(TWEE_KEER), p = kans(t[1], t[2]), q = kans(t[3], t[4]);
  var tel = t[1] * t[3], noem = t[2] * t[4];
  var plus = t[1] * t[4] + t[3] * t[2];
  return Q(t[0], keuzes(kans(tel, noem), [kans(plus, noem), kans(1, t[2] + t[4]), p], reserveKans(tel, noem)),
    "Onafhankelijk: vermenigvuldigen. " + p + " " + DOT + " " + q + " = " + kans(tel, noem) + ".");
};

GEN.st32 = function() {
  var r = rnd(2, 5), b = rnd(2, 6), t = r + b;
  var ans = kans(r * (r - 1), t * (t - 1));
  return Q("Zak met " + r + " rode en " + b + " blauwe knikkers. Je pakt er 2 zonder terugleggen. Kans op twee rode?",
    keuzes(ans, [kans(r * r, t * t), kans(r, t), kans(r * (r - 1), t * t)], reserveKans(r * (r - 1), t * (t - 1))),
    "Eerste rood: " + r + "/" + t + ". Daarna nog " + (r - 1) + " rode van de " + (t - 1) + ": " + (r - 1) + "/" + (t - 1) + ". " + r + "/" + t + " " + DOT + " " + (r - 1) + "/" + (t - 1) + " = " + ans + ".");
};

var MINSTENS = [
  ["Twee keer een munt: kans op minstens één keer kop?", 1, 2, 2],
  ["Drie keer een munt: kans op minstens één keer kop?", 1, 2, 3],
  ["Twee keer met een dobbelsteen: kans op minstens één 6?", 1, 6, 2],
];
GEN.st33 = function() {
  var m = pickOne(MINSTENS), a = m[1], b = m[2], n = m[3];
  var noem = Math.pow(b, n), geen = Math.pow(b - a, n);
  var precies = n * a * Math.pow(b - a, n - 1);
  return Q(m[0], keuzes(kans(noem - geen, noem), [kans(precies, noem), kans(Math.pow(a, n), noem), kans(1, n + 1)], reserveKans(noem - geen, noem)),
    "Via \"geen enkele\": kans op geen = " + kans(geen, noem) + ". Minstens één = 1 " + MIN + " " + kans(geen, noem) + " = " + kans(noem - geen, noem) + ".");
};

var VERWACHT = [["Je gooit N keer met een dobbelsteen.", "een 6", 6, [60, 120, 300, 600]], ["Je gooit N keer met een munt.", "kop", 2, [50, 100, 200, 500]],
  ["Je draait N keer aan een draaischijf met 4 gelijke vakken.", "het rode vak", 4, [40, 100, 200]], ["Je draait N keer aan een draaischijf met 5 gelijke vakken.", "het blauwe vak", 5, [50, 100, 250]]];
GEN.st34 = function() {
  var v = pickOne(VERWACHT), n = pickOne(v[3]), ans = n / v[2];
  return Q(v[0].replace("N", n) + " Hoe vaak verwacht je " + v[1] + "?",
    keuzes(ans, [n % 100 === 0 ? n / 100 : null, n % 10 === 0 ? n / 10 : null, n - ans], reserveGetal(ans)),
    "Verwacht aantal = aantal keer " + DOT + " kans = " + n + " " + DOT + " 1/" + v[2] + " = " + ans + ".");
};

// ── G8 Toepassen en controle ──────────────────────────────────────
// Beweringen: waar en fout (precies één fout per vraag). p: de getallen om na te rekenen (test)
var BEWERING = {
  mediaan: function() {
    var l = shuffle(verschillend(3, 1, 20)), s = gesorteerd(l);
    if (l[1] === s[1]) return null;
    return { p: { lijst: l }, waar: "Mediaan van " + lijstTekst(l) + " is " + s[1], fout: "Mediaan van " + lijstTekst(l) + " is " + l[1] };
  },
  kansGroot: function() {
    var r = rnd(2, 6), b = rnd(1, 5), t = r + b;
    return { p: { rood: r, blauw: b }, waar: r + " rood, " + b + " blauw: kans op rood is " + kans(r, t), fout: r + " rood, " + b + " blauw: kans op rood is " + (t / ggd(r, t)) + "/" + (r / ggd(r, t)) };
  },
  gemiddelde: function() {
    var a = rnd(2, 10), c = a + 2 * rnd(1, 5);
    return { p: { a: a, b: c }, waar: "Gemiddelde van " + a + " en " + c + " is " + (a + c) / 2, fout: "Gemiddelde van " + a + " en " + c + " is " + (a + c) };
  },
  niet: function() {
    return { p: { wel: 1, totaal: 6 }, waar: "Kans op geen 6 met een dobbelsteen is 5/6", fout: "Kans op geen 6 met een dobbelsteen is 1/6" };
  },
  keer: function() {
    var a = rnd(2, 6), b = rnd(2, 6);
    return { p: { a: a, b: b }, waar: a + " broeken en " + b + " shirts: " + a * b + " outfits", fout: a + " broeken en " + b + " shirts: " + (a + b) + " outfits" };
  },
};
var BEWERING_NAMEN = Object.keys(BEWERING);
GEN.st35 = function() {
  var namen = shuffle(BEWERING_NAMEN.slice()).slice(0, 4), welk = rnd(0, 3), teksten = [], feiten = [];
  for (var i = 0; i < 4; i++) {
    var b = BEWERING[namen[i]](), isFout = i === welk;
    if (!b || b.waar === b.fout) return null;
    teksten.push(isFout ? b.fout : b.waar);
    feiten.push({ soort: namen[i], p: b.p, tekst: isFout ? b.fout : b.waar, waar: !isFout });
  }
  var anderen = teksten.filter(function(t, j) { return j !== welk; });
  return Q("Welke bewering is FOUT?", keuzes(teksten[welk], anderen, []),
    "Reken elke bewering na. Fout: \"" + teksten[welk] + "\".", { isErrorSpotter: true, smallChoices: true, feiten: feiten });
};

// Kort verhaal: per vraag een andere invoer (vraag.inputType; resolveInput kijkt eerst naar de vraag)
var NAMEN = ["Lisa", "Daan", "Noor", "Sem", "Emma", "Finn"];
GEN.st36 = function(sub) {
  var s = sub % 4;
  if (s === 0) {
    var lijst = verschillend(3, 4, 10), g = gemiddelde(lijst);
    if (!g) return null;
    return Q(pickOne(NAMEN) + " haalt een " + lijst.join(", een ").replace(/, een ([^,]*)$/, " en een $1") + ". Gemiddeld cijfer?",
      keuzes(g.antwoord, g.valkuilen, g.reserve), g.stappen, { inputType: "decimal", inputConfig: { maxDecimals: 1 } });
  }
  if (s === 1) {
    var z = zakKans([rnd(2, 7), rnd(2, 7)], "alle snoepjes");
    if (!z.antwoord) return null;
    return Q("In een zak zitten " + z.tekst.replace("rode", "rode snoepjes").replace("blauwe", "blauwe snoepjes") + ". Je pakt er blind één. Kans op rood?",
      keuzes(z.antwoord, z.valkuilen, z.reserve), z.stappen, { inputType: "fraction", inputConfig: {} });
  }
  if (s === 2) {
    var k = keerregel(rnd(2, 6), rnd(2, 6), pickOne(KEER_CONTEXT));
    return Q("Op een feest: " + k.vraag.charAt(0).toLowerCase() + k.vraag.slice(1), keuzes(k.antwoord, k.valkuilen, k.reserve), k.stappen,
      { inputType: "number", inputConfig: {} });
  }
  var n = pickOne([20, 25, 40, 50]), stap = n / ggd(n, 100), a = stap * rnd(1, n / stap - 1), r = relFreq(a, n);
  return Q("Van de " + n + " leerlingen in de klas sporten er " + a + ". Hoeveel procent is dat?", keuzes(r.antwoord, r.valkuilen, r.reserve), r.stappen,
    { inputType: "percent", inputConfig: {} });
};

// ── Groepen, theorie en vaardigheden ──────────────────────────────
var G1 = "Gegevens ordenen", G3 = "Centrummaten", G4 = "Spreiding", G5 = "Kans", G6 = "Tellen",
    G7 = "Kansen in stappen", G8 = "Toepassen en controle";

var THEORIE = {};
THEORIE[G1] =
  "Statistiek begint met gegevens: wat je meet of telt bij mensen, dingen of gebeurtenissen. Eerst bepaal je wat voor gegevens het zijn, want daarvan hangt af wat je ermee kunt.\n" +
  "• Telbare getallen (aantal broers, doelpunten): alleen hele getallen 0, 1, 2, ...\n" +
  "• Meetbare getallen (lengte, tijd, gewicht): ook tussenwaarden, zoals 152,5 cm.\n" +
  "• Categorieën zonder volgorde (kleur, merk): namen; rekenen kan niet, tellen wel.\n" +
  "• Categorieën met volgorde (S, M, L; slecht, matig, goed): wel een volgorde, maar geen getallen.\n" +
  "Een frequentie is hoe vaak iets voorkomt. De relatieve frequentie is dat aantal als deel van het geheel, meestal in procenten: aantal : totaal " + DOT + " 100%. 12 van de 40 is 12 : 40 " + DOT + " 100% = 30%. Zo kun je groepen van verschillende grootte eerlijk vergelijken.";
THEORIE[G3] =
  "Een centrummaat vat een rij getallen samen in één getal dat zegt waar het midden ligt. Er zijn er drie, en ze zeggen elk iets anders.\n" +
  "• Gemiddelde: alles optellen en delen door het aantal. Het is wat ieder krijgt als je eerlijk verdeelt. Ontbreekt er één getal, dan weet je het totaal (gemiddelde " + DOT + " aantal) en trek je de bekende getallen ervan af.\n" +
  "• Mediaan: eerst sorteren, dan het middelste getal. Bij een even aantal zijn er twee middelste; de mediaan ligt daar precies tussen (hun gemiddelde). Valkuil: het middelste getal nemen zonder te sorteren.\n" +
  "• Modus: het getal (of de categorie) dat het vaakst voorkomt.\n" +
  "Welke past? Een uitschieter (één heel groot of klein getal) trekt het gemiddelde mee, maar de mediaan nauwelijks. Bij inkomens of huizenprijzen zegt de mediaan daarom meer over het gewone geval. Bij categorieën (kleuren, maten) kan alleen de modus.";
THEORIE[G4] =
  "Twee klassen kunnen hetzelfde gemiddelde hebben en toch heel verschillend zijn: in de ene liggen alle cijfers dicht bij elkaar, in de andere ver uit elkaar. Spreiding meet dat.\n" +
  "• Spreidingsbreedte: grootste min kleinste. Snel, maar één uitschieter maakt hem groot.\n" +
  "• Kwartielen verdelen de gesorteerde rij in vier gelijke delen. Q1 (eerste kwartiel) is de mediaan van de onderste helft, Q3 (derde kwartiel) de mediaan van de bovenste helft. In deze app telt bij een oneven aantal de mediaan zelf niet mee in de helften. Er bestaan ook andere methoden (met de mediaan erbij, of met tussenwaarden zoals rekenmachines doen); die geven soms een iets ander getal.\n" +
  "• Kwartielafstand: Q3 " + MIN + " Q1. Dat is de breedte van de middelste helft van de gegevens; een uitschieter heeft daar geen invloed op.";
THEORIE[G5] =
  "Een kans zegt hoe groot de mogelijkheid is dat iets gebeurt, als getal van 0 (onmogelijk) tot 1 (zeker). Precies de helft is fifty-fifty: 1/2 of 50%.\n" +
  "Zijn alle uitkomsten even waarschijnlijk, dan is kans = gunstig : mogelijk. Bij 3 rode en 5 blauwe knikkers is de kans op rood 3/8: 3 gunstige van de 8 knikkers. Valkuil: 3/5 (rood tegen blauw); de noemer is altijd het totaal. Schrijf de breuk zo eenvoudig mogelijk.\n" +
  "Kans op niet: iets gebeurt of het gebeurt niet, samen is dat 1. Kans op geen 6 = 1 " + MIN + " 1/6 = 5/6.\n" +
  "Herhaal je een experiment vaak, dan komt de relatieve frequentie steeds dichter bij de kans (de wet van de grote aantallen). Daarom kun je een onbekende kans schatten met een experiment: 46 keer een 6 in 200 worpen geeft ongeveer 23%.";
THEORIE[G6] =
  "Voor een kans moet je weten hoeveel uitkomsten er mogelijk zijn. Tellen kan slim.\n" +
  "• Keerregel: kies je eerst uit a mogelijkheden en daarna uit b, dan zijn er a " + DOT + " b combinaties. 3 broeken en 4 shirts: bij elke broek passen 4 shirts, dus 3 " + DOT + " 4 = 12. Valkuil: optellen (3 + 4).\n" +
  "• Volgordes: 4 kinderen op een rij. De eerste plek heeft 4 keuzes, de tweede nog 3, dan 2, dan 1: 4 " + DOT + " 3 " + DOT + " 2 " + DOT + " 1 = 24.\n" +
  "• Codes: mogen cijfers herhalen en mag een 0 vooraan, dan heeft elke plek 10 mogelijkheden. Een code van 3 cijfers: 10 " + DOT + " 10 " + DOT + " 10 = 1000 (000 tot en met 999).";
THEORIE[G7] =
  "Bij twee stappen (twee worpen, twee keer pakken) vermenigvuldig je de kansen langs de route: dat is de keerregel voor kansen.\n" +
  "• Onafhankelijk (de eerste stap verandert niets aan de tweede, zoals twee keer gooien): kans op twee keer een 6 = 1/6 " + DOT + " 1/6 = 1/36. Valkuil: optellen.\n" +
  "• Zonder terugleggen verandert de tweede stap wel: bij 2 rode en 3 blauwe knikkers is de kans op twee rode 2/5 " + DOT + " 1/4 = 1/10, want na de eerste rode zijn er nog 1 rode van de 4.\n" +
  "• Minstens één: reken via het tegendeel. Kans op minstens één keer kop bij 2 worpen = 1 " + MIN + " kans op geen kop = 1 " + MIN + " 1/4 = 3/4.\n" +
  "• Verwacht aantal = aantal keer " + DOT + " kans: bij 600 worpen verwacht je 600 " + DOT + " 1/6 = 100 keer een 6.";
THEORIE[G8] =
  "Controleer een uitkomst altijd even: een kans ligt tussen 0 en 1; een gemiddelde ligt tussen het kleinste en het grootste getal; een mediaan vraagt eerst sorteren; bij combinaties vermenigvuldig je, je telt niet op.";

// [id, label, groep, korte omschrijving, strategie, uitleg, voorbeeld, minCorrect, subtypes]
var DEFS = [
  ["st01_soort_gegevens", "Soort gegevens", G1, "Schoenmaat: telbaar of meetbaar?", "tellen, meten of een naam",
    "Kijk wat je opschrijft: een aantal dat je telt (telbaar), iets wat je meet met tussenwaarden (meetbaar), of een naam (categorie). Heeft de naam een vaste volgorde, zoals S, M, L, dan is het een categorie met volgorde.",
    "Lievelingskleur?\nEen naam zonder vaste volgorde.\nAntwoord: categorieën zonder volgorde.", 8, 4],
  ["st04_relatieve_frequentie", "Relatieve frequentie", G1, "12 van de 40 is 30%", "aantal : totaal · 100%",
    "Deel het aantal door het totaal en vermenigvuldig met 100%. Zo vergelijk je groepen van verschillende grootte eerlijk. Valkuil: het aantal zelf als procent nemen.",
    "12 van de 40?\n12 : 40 = 0,3.\n0,3 · 100% = 30%.", 8],
  ["st10_modus", "Modus", G3, "4, 7, 7, 9, 3: modus 7", "wat komt het vaakst voor",
    "De modus is het getal dat het vaakst voorkomt. Tel per getal hoe vaak het erin staat. Het hoeft niet in het midden te staan en ook niet het grootste te zijn.",
    "4, 7, 7, 9, 3?\n7 staat er twee keer in, de rest één keer.\nAntwoord: 7.", 8],
  ["st11_mediaan_oneven", "Mediaan (oneven aantal)", G3, "8, 3, 9, 5, 4: mediaan 5", "eerst sorteren",
    "Sorteer de getallen van klein naar groot. De mediaan is het middelste getal. Valkuil: het middelste getal van de ongesorteerde rij nemen.",
    "8, 3, 9, 5, 4?\nGesorteerd: 3, 4, 5, 8, 9.\nAntwoord: 5.", 8],
  ["st12_mediaan_even", "Mediaan (even aantal)", G3, "2, 9, 4, 7: mediaan 5,5", "tussen de twee middelste",
    "Sorteer de getallen. Bij een even aantal zijn er twee middelste; de mediaan ligt precies daartussen: tel ze op en deel door 2.",
    "2, 9, 4, 7?\nGesorteerd: 2, 4, 7, 9.\n(4 + 7) : 2 = 5,5.", 8],
  ["st13_gemiddelde", "Gemiddelde", G3, "6, 8, 7, 9: gemiddelde 7,5", "optellen, delen door het aantal",
    "Tel alle getallen op en deel door het aantal getallen. Het gemiddelde is wat ieder krijgt als je eerlijk verdeelt. Valkuil: vergeten te delen, of door het verkeerde aantal delen.",
    "6, 8, 7, 9?\n6 + 8 + 7 + 9 = 30.\n30 : 4 = 7,5.", 8],
  ["st15_ontbrekend_getal", "Ontbrekend getal bij een gemiddelde", G3, "Gemiddelde 7 van 4 getallen: totaal 28", "eerst het totaal",
    "Het totaal is gemiddelde · aantal. Trek de bekende getallen daarvan af; wat overblijft is het ontbrekende getal.",
    "Gemiddelde van 4 getallen is 7; bekend 5, 8, 6?\nTotaal 4 · 7 = 28. Bekend 19.\n28 − 19 = 9.", 8],
  ["st16_welke_centrummaat", "Welke centrummaat past?", G3, "Een uitschieter: kies de mediaan", "wat wil je weten",
    "Eerlijk verdelen zonder uitschieter: gemiddelde. Eén uitschieter (een villa, een directeur): mediaan. Wat het vaakst voorkomt: modus. Hoe ver het uit elkaar ligt: spreiding (spreidingsbreedte: hoogste min laagste).",
    "Salarissen met één hoge uitschieter?\nHet gemiddelde wordt omhoog getrokken.\nAntwoord: mediaan.", 8, 4],
  ["st17_spreidingsbreedte", "Spreidingsbreedte", G4, "3, 11, 7, 15: 12", "grootste min kleinste",
    "Zoek het grootste en het kleinste getal (niet het eerste en het laatste van de rij) en trek ze van elkaar af.",
    "3, 11, 7, 15?\nGrootste 15, kleinste 3.\n15 − 3 = 12.", 8],
  ["st18_kwartielen", "Kwartielen Q1 en Q3", G4, "Q1: mediaan van de onderste helft", "helften zonder de mediaan",
    "Zoek de mediaan van de gesorteerde rij. De getallen eronder vormen de onderste helft, de getallen erboven de bovenste helft (de mediaan zelf telt niet mee). Q1 is het middelste van de onderste helft, Q3 het middelste van de bovenste helft.",
    "2, 5, 8, 11, 13, 17, 20: Q1?\nMediaan 11. Onderste helft: 2, 5, 8.\nAntwoord: 5.", 8, 2],
  ["st19_kwartielafstand", "Kwartielafstand", G4, "Q3 − Q1", "breedte van de middelste helft",
    "Bepaal Q1 en Q3 en trek ze af: Q3 − Q1. Dat is de breedte van de middelste helft. Valkuil: grootste min kleinste (dat is de spreidingsbreedte).",
    "2, 5, 8, 11, 13, 17, 20?\nQ1 = 5, Q3 = 17.\n17 − 5 = 12.", 8],
  ["st21_kansschaal", "Kansschaal", G5, "Kop gooien: fifty-fifty", "van onmogelijk tot zeker",
    "Kan het nooit? Onmogelijk. Altijd? Zeker. Precies de helft van de keren? Fifty-fifty. Daartussen: klein of groot.",
    "Met een dobbelsteen een 6 gooien?\n1 van de 6 uitkomsten.\nAntwoord: klein.", 8, 5],
  ["st22_kans_breuk", "Kans als breuk", G5, "3 rood, 5 blauw: kans op rood 3/8", "gunstig : mogelijk",
    "Tel de gunstige uitkomsten en alle mogelijke uitkomsten. Kans = gunstig : mogelijk, als breuk zo eenvoudig mogelijk. Valkuil: gunstig tegen ongunstig (3/5).",
    "3 rode en 5 blauwe knikkers, kans op rood?\n3 gunstig van de 8.\nAntwoord: 3/8.", 8],
  ["st23_kans_procent", "Kans als procent", G5, "Even getal gooien: 50%", "breuk keer 100%",
    "Bereken de kans als breuk (gunstig : mogelijk) en reken om naar procenten: keer 100%.",
    "Dobbelsteen, kans op even?\n3 van de 6 = 1/2.\nAntwoord: 50%.", 8, 2],
  ["st24_kans_niet", "Kans op niet", G5, "Geen 6: 5/6", "1 min de kans op wel",
    "Iets gebeurt of het gebeurt niet; samen is dat kans 1. Kans op niet = 1 − kans op wel. Of tel direct de uitkomsten die niet gunstig zijn.",
    "Dobbelsteen, kans op geen 6?\nKans op wel: 1/6.\n1 − 1/6 = 5/6.", 8, 2],
  ["st25_kans_schatten", "Kans schatten uit een experiment", G5, "46 keer een 6 in 200 worpen: 23%", "relatieve frequentie",
    "Weet je de kans niet, gooi dan vaak en tel. De relatieve frequentie (aantal : totaal · 100%) is een schatting van de kans; hoe vaker je gooit, hoe beter.",
    "46 keer een 6 in 200 worpen?\n46 : 200 = 0,23.\nAntwoord: 23%.", 8],
  ["st28_keerregel", "Keerregel", G6, "3 broeken en 4 shirts: 12", "vermenigvuldigen",
    "Kies je eerst uit a mogelijkheden en daarna uit b, dan zijn er a · b combinaties: bij elke eerste keuze passen alle tweede keuzes. Valkuil: optellen.",
    "3 broeken en 4 shirts?\nBij elke broek 4 shirts.\n3 · 4 = 12.", 8],
  ["st29_volgordes", "Volgordes", G6, "4 kinderen op een rij: 24", "steeds een keuze minder",
    "De eerste plek heeft n keuzes, de tweede n − 1, enzovoort tot 1. Vermenigvuldig ze: n · (n − 1) · ... · 1.",
    "4 kinderen op een rij?\n4 · 3 · 2 · 1.\nAntwoord: 24.", 8],
  ["st30_codes", "Codes", G6, "Code van 3 cijfers: 1000", "elke plek 10 mogelijkheden",
    "Mogen cijfers herhalen en mag een 0 vooraan, dan heeft elke plek 10 mogelijkheden (0 tot en met 9). Vermenigvuldig: 10 · 10 · ... per plek.",
    "Code van 3 cijfers?\n10 · 10 · 10.\nAntwoord: 1000.", 8],
  ["st31_twee_keer", "Twee keer, onafhankelijk", G7, "Twee keer een 6: 1/36", "kansen vermenigvuldigen",
    "Bij twee onafhankelijke stappen vermenigvuldig je de kansen: 1/6 · 1/6 = 1/36. Valkuil: optellen.",
    "Twee keer kop?\n1/2 · 1/2.\nAntwoord: 1/4.", 8],
  ["st32_zonder_terugleggen", "Zonder terugleggen", G7, "2 rood, 3 blauw: twee rode 1/10", "tweede stap verandert",
    "Pak je zonder terugleggen, dan is er bij de tweede keer één knikker minder, en van de gepakte kleur ook één minder. Vermenigvuldig de twee kansen.",
    "2 rode, 3 blauwe, twee rode zonder terugleggen?\n2/5 · 1/4.\nAntwoord: 1/10.", 8],
  ["st33_minstens_een", "Minstens één", G7, "Minstens één keer kop bij 2 worpen: 3/4", "via geen enkele",
    "Minstens één = alles behalve geen enkele. Reken de kans op geen enkele uit en trek die van 1 af.",
    "Minstens één keer kop bij 2 worpen?\nGeen kop: 1/2 · 1/2 = 1/4.\n1 − 1/4 = 3/4.", 8],
  ["st34_verwacht_aantal", "Verwacht aantal", G7, "600 worpen: 100 keer een 6", "aantal keer kans",
    "Het verwachte aantal is het aantal keer maal de kans. In het echt komt het er meestal dichtbij, niet precies.",
    "600 worpen, hoe vaak een 6?\n600 · 1/6.\nAntwoord: 100.", 8],
  ["st35_fout_spotten", "Fout spotten: statistiek en kans", G8, "Gemiddelde van 4 en 8 is 12: fout", "controleren",
    "Veel gemaakte fouten: de mediaan zonder sorteren, een kans groter dan 1, het gemiddelde zonder te delen, kans op niet gelijk aan kans op wel, en combinaties optellen in plaats van vermenigvuldigen.",
    "Welke is FOUT?\nGemiddelde van 4 en 8 is 12 → goed is 6.\nDie is fout.", 12],
  ["st36_kort_verhaal", "Kort verhaal", G8, "Lisa haalt 6, 7 en 8: gemiddeld 7", "eerst: wat wordt gevraagd",
    "Lees wat er gevraagd wordt: een gemiddelde, een kans, een aantal combinaties of een procent. Kies dan de bijpassende aanpak uit de eerdere blokken.",
    "Lisa haalt een 6, een 7 en een 8. Gemiddeld?\n6 + 7 + 8 = 21.\n21 : 3 = 7.", 8, 4],
];

function tipOf(terms) { return terms && terms[0] ? terms[0] : ""; }

// Typen per vaardigheid (plan ST, §2): G geheel getal, K kommagetal (1 decimaal), P procent, B breuk
// (eenvoudigste vorm, breukvak). Kiezen: soort gegevens (st01), welke centrummaat (st16), kansschaal (st21),
// fout spotten (st35). Kort verhaal (st36) zet de invoer per vraag.
var GETAL  = { st10: 1, st11: 1, st15: 1, st17: 1, st18: 1, st19: 1, st28: 1, st29: 1, st30: 1, st34: 1 };
var KOMMA  = { st12: 1, st13: 1 };
var PROCENT = { st04: 1, st23: 1, st25: 1 };
var BREUK  = { st22: 1, st24: 1, st31: 1, st32: 1, st33: 1 };

var RAW_SKILLS = DEFS.map(function(d) {
  var key = d[0].slice(0, 4), gen = GEN[key], subs = d[8];
  var skill = {
    id: d[0], label: d[1], group: d[2], desc: d[3], strategy: d[4], tip: tipOf,
    uitleg: d[5], voorbeeld: d[6], minCorrect: d[7], subtypes: subs || undefined,
    theorie: THEORIE[d[2]],
    make: function(s) { return retry(function() { return gen(s || 0); }); },
  };
  if (GETAL[key])   { skill.inputType = "number"; skill.inputConfig = {}; }
  if (KOMMA[key])   { skill.inputType = "decimal"; skill.inputConfig = { maxDecimals: 1 }; }
  if (PROCENT[key]) { skill.inputType = "percent"; skill.inputConfig = {}; }
  if (BREUK[key])   { skill.inputType = "fraction"; skill.inputConfig = {}; }
  return skill;
});

var SKILLS = createSkills("wiskunde_statistiek", RAW_SKILLS);

export var WISK_STATISTIEK_SKILLS = SKILLS.list;
export var WISK_STATISTIEK_ORDER  = SKILLS.list.map(function(s) { return s.id; });
export var WISK_STATISTIEK_GEN    = GEN;
export var WISK_STATISTIEK_THEORIE = THEORIE;
