// Wiskunde, domein Functies: assenstelsel, functies, lineaire, kwadratische en exponentiële verbanden.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Afspraken (plan FN v2):
// - Gehele getallen in de notatie van Wiskunde: minteken U+2212, groepjes van drie met een vaste spatie
//   vanaf 10 000. Een kommagetal heeft hoogstens 2 decimalen, zonder eindnul ("1,05", "0,8").
// - Een punt typen: het paar van de stelsels, "x = 3, y = −6" (tussen "stelsel"). Twee nulpunten:
//   "x = −2 of x = 3" (tussen "of", kleinste eerst). Coördinaten zijn gehele getallen van −9 tot 9.
// - Elke vraag heeft vier verschillende keuzes: het antwoord en drie foute keuzes (de valkuilen van het
//   plan, zie q.valkuilen). Een valkuil is nooit gelijk aan het antwoord: geeft een typische fout bij bepaalde
//   getallen toevallig het goede antwoord, dan komt er een andere vraag. Valt een valkuil samen met een andere
//   keuze of is hij ongeldig (geen geheel getal, meer dan 2 decimalen), dan vult een vaste reserve aan: het
//   antwoord plus of min een stap.
// - Fase F1: de 23 vaardigheden zonder tekening. F2 voegt de vaardigheden met een tekening toe op hun plek in
//   de volgorde (fn01, fn03, fn04, fn09, fn12-fn15, fn20, fn27, fn30, fn31, fn34); bestaande ids veranderen niet.

import { rnd, shuffle } from "./helpers.js";
import { createSkills } from "./flow.js";

var MIN = "−";
var DOT = "·";
var SQ  = "²";
var NB  = "\u00a0";

function pickOne(list) { return list[rnd(0, list.length - 1)]; }
function nz(min, max) { var x = 0; while (x === 0) x = rnd(min, max); return x; }
function teken() { return rnd(0, 1) ? 1 : -1; }

// ── Schrijven ─────────────────────────────────────────────────────
// Geheel getal; vanaf 10 000 in groepjes van drie (zoals writeAnswerInteger); geen geheel getal -> null
function int(x) {
  if (typeof x !== "number" || !isFinite(x) || Math.floor(x) !== x) return null;
  var s = String(Math.abs(x));
  if (s.length > 4) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, NB);
  return (x < 0 ? MIN : "") + s;
}
// Honderdsten (geheel getal) als kommagetal zonder eindnul: 105 -> "1,05", 80 -> "0,8", 500 -> "5";
// alleen positief (het kommavak heeft geen teken), anders null
function dec2(h) {
  if (typeof h !== "number" || !(h > 0) || Math.floor(h) !== h) return null;
  var heel = Math.floor(h / 100), rest = h % 100;
  if (rest === 0) return String(heel);
  var d = rest < 10 ? "0" + rest : String(rest);
  return heel + "," + d.replace(/0$/, "");
}
// Een coëfficiënt in een formule: geheel, of een kommagetal met hoogstens 2 decimalen ("0,5", "0,25")
function getal(v) {
  var h = Math.round(Math.abs(v) * 100);
  if (Math.abs(Math.abs(v) * 100 - h) > 1e-9) return null;
  return h % 100 === 0 ? String(h / 100) : dec2(h);
}
// Een veelterm uit termen [coëfficiënt, letterdeel], in de gegeven volgorde: "3x " + MIN + " 4", "7 " + MIN + " 2x"
function veelterm(termen) {
  var uit = "";
  for (var i = 0; i < termen.length; i++) {
    var c = termen[i][0], body = termen[i][1];
    if (!c) continue;
    var g = getal(c);
    if (g === null) return null;
    var t = body === "" ? g : (g === "1" ? "" : g) + body;
    if (uit === "") uit = (c < 0 ? MIN : "") + t;
    else uit += (c < 0 ? " " + MIN + " " : " + ") + t;
  }
  return uit === "" ? "0" : uit;
}
function lijn(a, b) { var v = veelterm([[a, "x"], [b, ""]]); return v === null ? null : "y = " + v; }
function kwadr(a, b, c) { return "y = " + veelterm([[a, "x" + SQ], [b, "x"], [c, ""]]); }
// Topvorm y = a(x − p)² + q
function topvorm(a, p, q) {
  var voor = a === 1 ? "" : a === -1 ? MIN : int(a);
  var binnen = p === 0 ? "x" : "(x " + (p > 0 ? MIN + " " + p : "+ " + (-p)) + ")";
  var t = "y = " + voor + (p === 0 ? "x" : binnen) + SQ;
  if (q) t += (q < 0 ? " " + MIN + " " : " + ") + Math.abs(q);
  return t;
}
function punt(x, y) { return "(" + int(x) + "," + NB + int(y) + ")"; }
// Een formule in een vraag of bewering breekt niet midden in een term af: vaste spaties
function vast(t) { return t.replace(/ /g, NB); }
// Een punt als antwoord: het stelsel-paar; elk deel geheel en hoogstens 2 cijfers, anders null
function pt(x, y) {
  if (int(x) === null || int(y) === null || Math.abs(x) > 99 || Math.abs(y) > 99) return null;
  return "x = " + int(x) + ", y = " + int(y);
}
// Twee verschillende oplossingen, kleinste eerst; elk geheel en hoogstens 2 cijfers, anders null
function twee(r, s) {
  if (int(r) === null || int(s) === null || r === s || Math.abs(r) > 99 || Math.abs(s) > 99) return null;
  var a = Math.min(r, s), b = Math.max(r, s);
  return "x = " + int(a) + " of x = " + int(b);
}
function xis(v) { return int(v) === null ? null : "x = " + int(v); }
// Exacte deling: a : b als het een geheel getal is, anders null
function deel(a, b) { return (b !== 0 && a % b === 0) ? a / b : null; }

// ── Keuzes en vraag ───────────────────────────────────────────────
// Eerste item is het goede antwoord; dubbele en lege items vallen af; minder dan 4 -> null
function choose4(items) {
  var uit = [];
  items.forEach(function(it) {
    if (it === null || it === undefined || uit.length >= 4) return;
    if (uit.indexOf(it) >= 0) return;
    uit.push(it);
  });
  if (uit.length < 4) return null;
  return { answer: uit[0], choices: shuffle(uit) };
}
// Reserve per soort: het antwoord plus of min een stap
function reserveInt(a) { return [int(a + 1), int(a - 1), int(a + 2), int(a - 2), int(a + 3), int(a - 3)]; }
function reserveX(a) { return [xis(a + 1), xis(a - 1), xis(a + 2), xis(a - 2), xis(a + 3)]; }
function reservePt(x, y) { return [pt(x + 1, y), pt(x - 1, y), pt(x, y + 1), pt(x, y - 1), pt(x + 1, y + 1), pt(x - 1, y - 1)]; }
function reserveTwee(r, s) { return [twee(r, s + 1), twee(r - 1, s), twee(r, s - 1), twee(r + 1, s), twee(r - 2, s), twee(r, s + 2)]; }
function reserveDec(h, stap) { return [dec2(h + stap), dec2(h - stap), dec2(h + 2 * stap), dec2(h - 2 * stap), dec2(h + 3 * stap)]; }
function reserveLijn(a, b) { return [lijn(a, b + 1), lijn(a, b - 1), lijn(a + 1, b), lijn(a - 1, b), lijn(a, b + 2)]; }
// Keuzes: antwoord, de drie valkuilen van het plan, daarna de reserve. Is een valkuil gelijk aan het antwoord,
// dan geen keuzes (c null): Q geeft dan geen vraag en retry maakt een andere
function keuzes(antwoord, valkuilen, reserve) {
  if (valkuilen.indexOf(antwoord) >= 0) return { c: null, valkuilen: valkuilen };
  return { c: choose4([antwoord].concat(valkuilen, reserve)), valkuilen: valkuilen };
}

// extra: velden die bij de vraag horen (isErrorSpotter, feiten)
// Een korte vraag zonder woorden ("f(x) = 3x − 4") breekt niet af: vaste spaties.
function Q(question, k, stappen, extra) {
  if (!k.c) return null;
  if (question.length <= 22 && !/[a-wzA-Z]{2,}/.test(question.replace(/f\(x\)/g, ""))) question = question.replace(/ /g, NB);
  var q = { question: question, answer: k.c.answer, choices: k.c.choices, terms: [stappen], valkuilen: k.valkuilen };
  if (question.length > 22) q.tekstVraag = true;
  if (k.c.choices.some(function(t) { return String(t).length > 9; })) q.smallChoices = true;
  if (extra) { for (var key in extra) q[key] = extra[key]; }
  return q;
}
function retry(fn) { for (var i = 0; i < 400; i++) { var q = fn(); if (q) return q; } throw new Error("geen geldige vraag"); }

var GEN = {};

// ── G1 Assenstelsel en grafiek lezen ──────────────────────────────
var KWADRANT = ["kwadrant I", "kwadrant II", "kwadrant III", "kwadrant IV"];
GEN.fn02 = function(sub) {
  // sub kiest het kwadrant, zodat alle vier evenveel voorkomen
  var sx = sub === 0 || sub === 3 ? 1 : -1, sy = sub < 2 ? 1 : -1;
  var x = sx * rnd(1, 9), y = sy * rnd(1, 9), ans = KWADRANT[sub];
  var anderen = KWADRANT.filter(function(k) { return k !== ans; });
  return Q("In welk kwadrant ligt " + punt(x, y) + "?", keuzes(ans, anderen, []),
    "x is " + (x > 0 ? "positief (rechts)" : "negatief (links)") + ", y is " + (y > 0 ? "positief (boven)" : "negatief (onder)") +
    ". Tegen de klok in vanaf rechtsboven: I, II, III, IV. Dus " + ans + ".");
};

// ── G2 Wat is een functie ─────────────────────────────────────────
var FN_JA = "ja", FN_X = "nee, één x heeft twee y's", FN_Y = "nee, één y heeft twee x's", FN_NEG = "nee, er staat een negatief getal in";
GEN.fn05 = function(sub) {
  var xs = shuffle([-4, -3, -2, -1, 1, 2, 3, 4, 5, 6]).slice(0, sub === 2 ? 3 : 4);
  var ys = xs.map(function() { return rnd(-9, 9); });
  var ans, stap;
  if (sub === 0) {
    // functie: alle x verschillend, alle y verschillend
    if (new Set(ys).size !== 4) return null;
    ans = FN_JA;
    stap = "Elke x komt één keer voor, dus bij elke x hoort precies één y. Dat is een functie.";
  } else if (sub === 1) {
    // functie met twee keer dezelfde y (mag): de valkuil "één y heeft twee x's"
    ys[2] = ys[0];
    if (new Set(ys).size !== 3) return null;
    ans = FN_JA;
    stap = "Elke x komt één keer voor. Dat twee x-waarden dezelfde y hebben, mag. Dus het is een functie.";
  } else {
    // geen functie: een x twee keer, met een andere y
    var i0 = rnd(0, 2), ander = rnd(-9, 9);
    if (ander === ys[i0]) return null;
    xs.push(xs[i0]); ys.push(ander);
    ans = FN_X;
    stap = "Bij x = " + int(xs[i0]) + " horen twee verschillende y's. Een functie geeft bij elke x precies één uitkomst, dus het is geen functie.";
  }
  var paren = xs.map(function(x, i) { return [x, ys[i]]; }).sort(function(p, q) { return p[0] - q[0]; });
  var anderen = [FN_JA, FN_X, FN_Y, FN_NEG].filter(function(k) { return k !== ans; });
  return Q("Is dit een functie? " + paren.map(function(p) { return punt(p[0], p[1]); }).join(", "), keuzes(ans, anderen, []), stap);
};

GEN.fn06 = function() {
  var a = pickOne([-5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8, 9]), b = nz(-9, 9), x = rnd(1, 9);
  var ans = a * x + b;
  // valkuilen: verkeerde volgorde a · (x + b), alleen ax, het teken van het losse getal omgedraaid
  var vk = [int(a * (x + b)), int(a * x), int(a * x - b)];
  return Q(vast("f(x) = " + veelterm([[a, "x"], [b, ""]]) + ". f(" + x + ") ="), keuzes(int(ans), vk, reserveInt(ans)),
    "Vul x = " + x + " in: " + int(a) + " " + DOT + " " + x + (b < 0 ? " " + MIN + " " + (-b) : " + " + b) + " = " + int(a * x) + (b < 0 ? " " + MIN + " " + (-b) : " + " + b) + " = " + int(ans) + ". Eerst keer, dan plus of min.");
};

GEN.fn07 = function() {
  var p = rnd(1, 9) * teken(), k = rnd(2, 9);
  if (Math.abs(p) === k) return null;
  // f(x) = x² + px, x = −k: (−k)² + p · (−k) = k² − pk
  var ans = k * k - p * k;
  // valkuilen: (−k)² als −k²; x = k ingevuld; beide fouten samen
  var vk = [int(-k * k - p * k), int(k * k + p * k), int(-k * k + p * k)];
  return Q(vast("f(x) = " + veelterm([[1, "x" + SQ], [p, "x"]]) + ". f(" + MIN + k + ") ="), keuzes(int(ans), vk, reserveInt(ans)),
    "Met haakjes invullen: (" + MIN + k + ")" + SQ + (p < 0 ? " " + MIN + " " + (-p) : " + " + p) + " " + DOT + " (" + MIN + k + ") = " + (k * k) + (p * k > 0 ? " " + MIN + " " + (p * k) : " + " + (-p * k)) + " = " + int(ans) + ". Min keer min is plus: (" + MIN + k + ")" + SQ + " = " + (k * k) + ".");
};

GEN.fn08 = function() {
  var a = rnd(2, 9), x = rnd(-9, 9), b = rnd(0, 1) ? a * nz(-3, 3) : nz(-9, 9);
  if (Math.abs(b) > 27) return null;
  var y = a * x + b;
  // valkuilen: y : a (het losse getal vergeten), (y + b) : a (verkeerde teken), a · y + b (ingevuld in plaats van teruggezocht)
  var vk = [xis(deel(y, a)), xis(deel(y + b, a)), xis(a * y + b)];
  return Q(vast("f(x) = " + veelterm([[a, "x"], [b, ""]])) + ". Voor welke x is " + vast("f(x) = " + int(y)) + "?", keuzes(xis(x), vk, reserveX(x)),
    veelterm([[a, "x"], [b, ""]]) + " = " + int(y) + ". " + (b < 0 ? "Tel " + (-b) + " op" : "Trek " + b + " af") + ": " + a + "x = " + int(y - b) + ". Deel door " + a + ": x = " + int(x) + ".");
};

// ── G3 Lineaire verbanden ─────────────────────────────────────────
// Formule in een van twee vormen: y = ax + b of (sub 1) met het getal vooraan, y = b + ax
function linTekst(a, b, vooraan) { return "y = " + veelterm(vooraan ? [[b, ""], [a, "x"]] : [[a, "x"], [b, ""]]); }
GEN.fn10 = function(sub) {
  var a = nz(-9, 9), b = nz(-9, 9);
  if (Math.abs(a) === Math.abs(b)) return null;
  // valkuilen: de rc, het startgetal met het andere teken, 0
  return Q(vast(linTekst(a, b, sub === 1)) + ". Startgetal?", keuzes(int(b), [int(a), int(-b), int(0)], reserveInt(b)),
    "Het startgetal is de waarde bij x = 0: dan valt " + veelterm([[a, "x"]]) + " weg en blijft " + int(b) + " over.");
};
GEN.fn11 = function(sub) {
  var a = sub === 2 ? -1 : nz(-9, 9), b = nz(-9, 9);
  if (Math.abs(a) === Math.abs(b)) return null;
  // valkuilen: het startgetal, de rc met het andere teken, de waarde bij x = 1 (a + b)
  return Q(vast(linTekst(a, b, sub !== 0)) + ". Richtingscoëfficiënt?", keuzes(int(a), [int(b), int(-a), int(a + b)], reserveInt(a)),
    "De richtingscoëfficiënt is het getal bij x, met zijn teken: " + veelterm([[a, "x"]]) + " geeft " + int(a) + ". Zoveel komt er bij y bij als x 1 groter wordt.");
};

GEN.fn16 = function() {
  var a = nz(-4, 4), b = nz(-6, 6), x1 = nz(-4, 3), x2 = x1 + rnd(1, 3);
  if (x2 === 0) return null;
  var y1 = a * x1 + b, y2 = a * x2 + b;
  if (Math.abs(y1) > 9 || Math.abs(y2) > 9) return null;
  // valkuilen: het startgetal als y van het eerste punt, rc = Δx : Δy, startgetal met het verkeerde teken
  var omg = getal(1 / a) === null || Math.abs(a) === 1 ? null : lijn(1 / a, b);
  var vk = [lijn(a, y1), omg, lijn(a, -b)];
  return Q("Welke lijn gaat door " + punt(x1, y1) + " en " + punt(x2, y2) + "?", keuzes(lijn(a, b), vk, reserveLijn(a, b)),
    "rc = (" + int(y2) + " " + MIN + " " + (y1 < 0 ? "(" + int(y1) + ")" : int(y1)) + ") : (" + int(x2) + " " + MIN + " " + (x1 < 0 ? "(" + int(x1) + ")" : int(x1)) + ") = " + int(y2 - y1) + " : " + (x2 - x1) + " = " + int(a) +
    ". Startgetal: " + int(y1) + " = " + int(a) + " " + DOT + " " + (x1 < 0 ? "(" + int(x1) + ")" : int(x1)) + " + b, dus b = " + int(b) + ".");
};

// Prijzen per eenheid in centen
var VERHAAL = [
  { wat: "Een taxirit van x kilometer kost", per: "kilometer", vraag: "Hoeveel euro kost elke kilometer?", prijs: [150, 180, 200, 220, 250, 280, 300, 350] },
  { wat: "Bellen: x minuten per maand kost", per: "minuut", vraag: "Hoeveel euro kost elke minuut?", prijs: [5, 10, 12, 15, 20, 25, 30, 40] },
  { wat: "Een fiets huren voor x uur kost", per: "uur", vraag: "Hoeveel euro kost elk uur?", prijs: [150, 200, 250, 300, 350, 400, 450] },
];
GEN.fn17 = function() {
  var v = pickOne(VERHAAL), p = pickOne(v.prijs), s = rnd(2, 9);
  // valkuilen: het starttarief, de eerste eenheid met het starttarief erbij, het starttarief gedeeld door de prijs
  var vk = [dec2(100 * s), dec2(p + 100 * s), (100 * 100 * s) % p === 0 ? dec2(100 * 100 * s / p) : null];
  return Q(v.wat + " " + vast("y = " + dec2(p) + "x + " + s) + " euro. " + v.vraag, keuzes(dec2(p), vk, reserveDec(p, p < 100 ? 1 : 10)),
    "Het getal bij x komt er per " + v.per + " bij: " + dec2(p) + " euro. Het losse getal " + s + " betaal je altijd (het starttarief).");
};

// ── G4 Snijpunten ─────────────────────────────────────────────────
// Een lijn met een geheel snijpunt met de x-as: y = ax + b met b = −a · x0
function lijnMetNulpunt() {
  var a = nz(-4, 4), x0 = nz(-9, 9), b = -a * x0;
  if (Math.abs(b) > 9) return null;
  return { a: a, b: b, x0: x0 };
}
GEN.fn18 = function() {
  var l = lijnMetNulpunt();
  if (!l) return null;
  // valkuilen: x en y verwisseld, het teken van het startgetal vergeten, het snijpunt met de x-as
  var vk = [pt(l.b, 0), pt(0, -l.b), pt(l.x0, 0)];
  return Q("Snijpunt van " + vast(lijn(l.a, l.b)) + " met de y-as?", keuzes(pt(0, l.b), vk, reservePt(0, l.b)),
    "Op de y-as is x = 0. Dan is y = " + int(l.a) + " " + DOT + " 0" + (l.b < 0 ? " " + MIN + " " + (-l.b) : " + " + l.b) + " = " + int(l.b) + ": het startgetal.");
};
GEN.fn19 = function() {
  var l = lijnMetNulpunt();
  if (!l) return null;
  // valkuilen: x en y verwisseld, −b : a met het verkeerde teken, het snijpunt met de y-as
  var vk = [pt(0, l.x0), pt(-l.x0, 0), pt(0, l.b)];
  return Q("Snijpunt van " + vast(lijn(l.a, l.b)) + " met de x-as?", keuzes(pt(l.x0, 0), vk, reservePt(l.x0, 0)),
    "Op de x-as is y = 0. " + veelterm([[l.a, "x"], [l.b, ""]]) + " = 0, dus " + (l.a === 1 ? "" : veelterm([[l.a, "x"]]) + " = " + int(-l.b) + " en ") + "x = " + int(l.x0) + ".");
};

GEN.fn21 = function() {
  var a = pickOne([2, 4, 5]) * teken(), b = nz(-9, 9), c = nz(-9, 9), d = nz(-9, 9);
  if (c === b) return null;
  var e = pickOne([-5, -4, -3, -2, 2, 3, 4, 5].filter(function(t) { return t !== a && t !== -a; }));
  // valkuilen: dezelfde startwaarde met een andere rc, de rc met het andere teken, de omgekeerde rc
  var vk = [lijn(e, b), lijn(-a, c), lijn(1 / a, d)];
  return Q("Welke lijn is evenwijdig met " + vast(lijn(a, b)) + "?", keuzes(lijn(a, c), vk, [lijn(a + 1, c), lijn(a - 1, c)]),
    "Evenwijdige lijnen hebben dezelfde richtingscoëfficiënt (" + int(a) + ") en een ander startgetal. Het startgetal maakt niet uit.");
};

// ── G5 Kwadratische verbanden ─────────────────────────────────────
var DAL_ZO = "dalparabool, want a > 0", BERG_ZO = "bergparabool, want a < 0", DAL_NEG = "dalparabool, want a < 0", BERG_POS = "bergparabool, want a > 0";
GEN.fn22 = function() {
  var a = nz(-5, 5), b = rnd(-9, 9), c = rnd(-9, 9);
  var ans = a > 0 ? DAL_ZO : BERG_ZO;
  var anderen = [DAL_ZO, BERG_ZO, DAL_NEG, BERG_POS].filter(function(k) { return k !== ans; });
  return Q(vast(kwadr(a, b, c)) + ": dal of berg?", keuzes(ans, anderen, []),
    "Alleen het getal bij x" + SQ + " telt: a = " + int(a) + (a > 0 ? " > 0, dus een dalparabool (open naar boven)." : " < 0, dus een bergparabool (open naar beneden).") + " b en c verschuiven de parabool alleen.");
};
// Een parabool met een gehele top: y = ax² + bx + c met b = −2a · xt
function parabool() {
  var a = pickOne([1, 1, -1, 2, -2]), xt = nz(-5, 5), yt = rnd(-9, 9);
  var b = -2 * a * xt, c = yt + a * xt * xt;
  return { a: a, b: b, c: c, xt: xt, yt: yt };
}
GEN.fn23 = function() {
  var p = parabool();
  // valkuilen: b : 2a zonder minteken, −b : a (de 2 vergeten), het losse getal
  var vk = [xis(-p.xt), xis(2 * p.xt), xis(p.c)];
  return Q(vast(kwadr(p.a, p.b, p.c)) + ". Symmetrieas?", keuzes(xis(p.xt), vk, reserveX(p.xt)),
    "x = " + MIN + "b : 2a = " + MIN + (p.b < 0 ? "(" + int(p.b) + ")" : int(p.b)) + " : " + (2 * p.a < 0 ? "(" + int(2 * p.a) + ")" : int(2 * p.a)) + " = " + int(p.xt) + ".");
};
GEN.fn24 = function() {
  var p = parabool();
  // valkuilen: het teken van de x van de top omgedraaid, de juiste x met y = het losse getal, x en y verwisseld
  var vk = [pt(-p.xt, p.yt), pt(p.xt, p.c), pt(p.yt, p.xt)];
  return Q(vast(kwadr(p.a, p.b, p.c)) + ". Top?", keuzes(pt(p.xt, p.yt), vk, reservePt(p.xt, p.yt)),
    "De top ligt op de symmetrieas: x = " + MIN + "b : 2a = " + int(p.xt) + ". Vul in: y = " + int(p.yt) + ".");
};
GEN.fn25 = function() {
  var a = pickOne([1, 1, 1, -1, 2, -2]), p = nz(-9, 9), q = nz(-9, 9);
  // valkuilen: het teken van p, het teken van q, p en q verwisseld
  var vk = [pt(-p, q), pt(p, -q), pt(q, p)];
  return Q(vast(topvorm(a, p, q)) + ". Top?", keuzes(pt(p, q), vk, reservePt(p, q)),
    "y = a(x " + MIN + " p)" + SQ + " + q heeft top (p, q). " + (p > 0 ? "x " + MIN + " " + p + " geeft p = " + p : "x + " + (-p) + " = x " + MIN + " (" + int(p) + "), dus p = " + int(p)) + "; q = " + int(q) + ".");
};
GEN.fn26 = function() {
  // r = −s (geen term met x) valt af: dan geeft "beide tekens omgedraaid" het antwoord
  var r = nz(-9, 9), s = nz(-9, 9);
  if (r === s || r === -s) return null;
  var b = -(r + s), c = r * s;
  if (Math.abs(c) > 40) return null;
  // valkuilen: beide tekens omgedraaid, één oplossing met het verkeerde teken, het losse getal vergeten (x² + bx = 0)
  var een = rnd(0, 1) ? twee(r, -s) : twee(-r, s);
  var vk = [twee(-r, -s), een, twee(0, -b)];
  var f1 = "(x " + (r > 0 ? MIN + " " + r : "+ " + (-r)) + ")", f2 = "(x " + (s > 0 ? MIN + " " + s : "+ " + (-s)) + ")";
  return Q("Nulpunten van " + vast(kwadr(1, b, c)) + "?", keuzes(twee(r, s), vk, reserveTwee(r, s)),
    "Ontbind: " + veelterm([[1, "x" + SQ], [b, "x"], [c, ""]]) + " = " + f1 + f2 + " = 0. Een factor is 0: x = " + int(r) + " of x = " + int(s) + ".");
};

// ── G6 Exponentiële groei ─────────────────────────────────────────
GEN.fn28 = function(sub) {
  var p = pickOne([2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40]);
  var groei = sub === 0, ans = groei ? 100 + p : 100 - p;
  // valkuilen: alleen het procent als kommagetal, het procent zelf, de groeifactor van de andere richting
  var vk = [dec2(p), dec2(100 * p), dec2(groei ? 100 - p : 100 + p)];
  return Q((groei ? "Groei" : "Afname") + " van " + p + "% per jaar. Groeifactor?", keuzes(dec2(ans), vk, reserveDec(ans, 1)),
    groei ? "Na een jaar is er 100% + " + p + "% = " + (100 + p) + "%, dus de groeifactor is " + dec2(ans) + "." : "Na een jaar is er 100% " + MIN + " " + p + "% = " + (100 - p) + "% over, dus de groeifactor is " + dec2(ans) + ".");
};

// Groeifactor als breuk teller/noemer (exact rekenen), met de tekst
var FACTOREN = [{ t: 2, n: 1 }, { t: 3, n: 1 }, { t: 3, n: 2 }, { t: 1, n: 2 }, { t: 6, n: 5 }, { t: 4, n: 5 }, { t: 5, n: 4 }, { t: 3, n: 4 }];
function macht(g, k) { var r = 1; for (var i = 0; i < k; i++) r *= g; return r; }
GEN.fn29 = function() {
  var f = pickOne(FACTOREN), n = rnd(2, 3);
  var basis = macht(f.n, n), s = basis * rnd(1, Math.max(1, Math.floor(2000 / basis)));
  if (s < 10 || s > 2000 || (s % 10 !== 0 && s % 25 !== 0)) return null;
  var ans = s * macht(f.t, n) / basis;
  var gtxt = dec2(100 * f.t / f.n);
  // valkuilen: lineair gerekend (start + n · (g − 1) · start), één stap te weinig, de factor opgeteld (start · n · g)
  var lin = deel(s * f.n + n * (f.t - f.n) * s, f.n), kort = deel(s * macht(f.t, n - 1), macht(f.n, n - 1)), som = deel(s * n * f.t, f.n);
  var vk = [lin > 0 ? int(lin) : null, int(kort), int(som)];
  return Q("Startwaarde " + s + ", groeifactor " + gtxt + " per stap. Waarde na " + n + " stappen?", keuzes(int(ans), vk, reserveInt(ans)),
    "Elke stap keer " + gtxt + ": " + s + (n === 2 ? " " + DOT + " " + gtxt + " " + DOT + " " + gtxt : " " + DOT + " " + gtxt + " " + DOT + " " + gtxt + " " + DOT + " " + gtxt) + " = " + int(ans) + ". Niet erbij optellen: keer.");
};

GEN.fn32 = function(sub) {
  var h = rnd(2, 4), n = rnd(3, 5), t = h * n;
  if (sub === 0) {
    var ans = macht(2, n);
    // valkuilen: het aantal stappen, 2 · het aantal stappen, 2 tot de macht van het aantal uren
    var vk = [int(n), int(2 * n), int(macht(2, t))];
    return Q("Een hoeveelheid verdubbelt elke " + h + " uur. Hoeveel keer zo veel is het na " + t + " uur?", keuzes(int(ans), vk, reserveInt(ans)),
      t + " : " + h + " = " + n + " keer verdubbelen: " + Array(n + 1).join("2 " + DOT + " ").slice(0, -3) + " = " + ans + ".");
  }
  var m = rnd(3, 25), s = m * macht(2, n);
  if (s > 1000) return null;
  // halveren: valkuilen delen door het aantal stappen, delen door 2 · het aantal stappen, één keer te weinig gehalveerd
  var vk2 = [int(deel(s, n)), int(deel(s, 2 * n)), int(2 * m)];
  return Q("Er is " + s + " mg van een stof. Die halveert elke " + h + " uur. Hoeveel mg is er na " + t + " uur?", keuzes(int(m), vk2, reserveInt(m)),
    t + " : " + h + " = " + n + " keer halveren: " + s + " " + Array(n + 1).join(": 2 ") + "= " + m + ".");
};

// ── G7 Andere verbanden ───────────────────────────────────────────
var OMGEKEERD = [
  { wie: "werkers", duur: "dagen", zin: function(w, d) { return w + " werkers doen er " + d + " dagen over."; } },
  { wie: "pompen", duur: "uur", zin: function(w, d) { return w + " pompen maken een kelder in " + d + " uur leeg."; } },
  { wie: "kranen", duur: "minuten", zin: function(w, d) { return w + " kranen vullen een bad in " + d + " minuten."; } },
];
GEN.fn33 = function() {
  var o = pickOne(OMGEKEERD), w1 = rnd(2, 8), d1 = rnd(2, 12), w2 = rnd(2, 8);
  if (w1 === w2) return null;
  var tot = w1 * d1, ans = deel(tot, w2);
  if (ans === null) return null;
  var dw = Math.abs(w1 - w2);
  // valkuilen: recht evenredig gerekend (d1 · w2 : w1), en zoveel erbij of eraf als er werkers af of bij komen
  var vk = [int(deel(d1 * w2, w1)), int(d1 + dw), int(d1 - dw)];
  return Q(o.zin(w1, d1) + " Hoeveel " + o.duur + " met " + w2 + " " + o.wie + "?", keuzes(int(ans), vk, reserveInt(ans)),
    "Het product blijft gelijk: " + w1 + " " + DOT + " " + d1 + " = " + tot + ". Met " + w2 + " " + o.wie + ": " + tot + " : " + w2 + " = " + ans + ". Minder " + o.wie + " is meer " + o.duur + ".");
};

// ── G8 Toepassen en controle ──────────────────────────────────────
// fn35: 8 soorten beweringen, elk een juiste en een foute vorm met dezelfde getallen (plan §2c).
// Elke soort kiest getallen waarbij de foute vorm nooit toevallig waar is. p: de getallen (voor de test).
var BEWERING = {
  rc: function() {
    var a = nz(-9, 9), b = nz(-9, 9);
    if (a === b) return null;
    var f = vast(lijn(a, b));
    // "rc" in plaats van "richtingscoëfficiënt": dat woord past niet in een halve knop op 320 px
    return { p: { a: a, b: b }, waar: f + " heeft rc " + int(a), fout: f + " heeft rc " + int(b) };
  },
  yas: function() {
    var a = nz(-9, 9), b = nz(-9, 9), f = vast(lijn(a, b));
    return { p: { a: a, b: b }, waar: f + " snijdt de y-as in " + punt(0, b), fout: f + " snijdt de y-as in " + punt(b, 0) };
  },
  kwadraat: function() {
    var k = rnd(2, 9), voor = "Als " + vast("f(x) = x" + SQ) + ", dan is " + vast("f(" + MIN + k + ") =") + NB;
    return { p: { k: k }, waar: voor + (k * k), fout: voor + int(-k * k) };
  },
  groei: function() {
    var p = pickOne([2, 3, 4, 5, 6, 8, 10, 15, 20]), voor = "Groei van " + p + "% per jaar geeft groeifactor ";
    return { p: { p: p }, waar: voor + dec2(100 + p), fout: voor + dec2(p) };
  },
  afname: function() {
    var p = pickOne([2, 5, 10, 15, 20, 25, 30]), voor = "Afname van " + p + "% per jaar geeft groeifactor ";
    return { p: { p: p }, waar: voor + dec2(100 - p), fout: voor + dec2(100 + p) };
  },
  top: function() {
    var p = nz(-9, 9), q = nz(-9, 9), f = vast(topvorm(1, p, q));
    return { p: { p: p, q: q }, waar: f + " heeft top " + punt(p, q), fout: f + " heeft top " + punt(-p, q) };
  },
  evenwijdig: function() {
    var a = nz(-9, 9), b = nz(-9, 9), c = nz(-9, 9);
    if (b === c) return null;
    return { p: { a: a, b: b, c: c }, waar: vast(lijn(a, b)) + " en " + vast(lijn(a, c)) + " zijn evenwijdig", fout: vast(lijn(a, b)) + " en " + vast(lijn(-a, b)) + " zijn evenwijdig" };
  },
  nulpunten: function() {
    var k = rnd(1, 9), f = vast(kwadr(1, 0, -k * k)) + " snijdt de x-as ";
    return { p: { k: k }, waar: f + "in " + vast("x = " + k) + " en " + vast("x = " + MIN + k), fout: f + "alleen in " + vast("x = " + k) };
  },
};
var BEWERING_NAMEN = Object.keys(BEWERING);
GEN.fn35 = function() {
  var namen = shuffle(BEWERING_NAMEN.slice()).slice(0, 4), welk = rnd(0, 3), teksten = [], feiten = [];
  for (var i = 0; i < 4; i++) {
    var b = BEWERING[namen[i]](), isFout = i === welk;
    if (!b || b.waar === b.fout) return null;
    teksten.push(isFout ? b.fout : b.waar);
    feiten.push({ soort: namen[i], p: b.p, tekst: isFout ? b.fout : b.waar, waar: !isFout });
  }
  var anderen = teksten.filter(function(t, j) { return j !== welk; });
  return Q("Welke bewering is FOUT?", keuzes(teksten[welk], anderen, []),
    "Controleer elke bewering. Fout: \"" + teksten[welk] + "\".", { isErrorSpotter: true, smallChoices: true, feiten: feiten });
};

// fn36: twee abonnementen, A met lage vaste kosten en een hoge prijs per minuut. Prijzen in centen.
GEN.fn36 = function() {
  var pB = pickOne([5, 10, 15, 20, 25]), dp = pickOne([5, 10, 15, 20, 25]), pA = pB + dp;
  var x = 10 * rnd(2, 30), verschil = x * dp;
  if (verschil % 100 !== 0) return null;
  var vA = rnd(2, 15), vB = vA + verschil / 100;
  if (vB > 60) return null;
  var centen = function(c) { return c % 100 === 0 ? String(c / 100) : Math.floor(c / 100) + "," + (c % 100 < 10 ? "0" : "") + (c % 100); };
  var eur = function(c) { return "\u20ac" + NB + centen(c); };
  // valkuilen: het verschil van de vaste kosten zonder te delen, gedeeld door de som van de prijzen, de vaste kosten van A gedeeld door het verschil
  var vk = [int(vB - vA), int(deel(100 * (vB - vA), pA + pB)), int(deel(100 * vA, dp))];
  return Q("Abonnement A: " + eur(100 * vA) + " per maand plus " + eur(pA) + " per minuut. B: " + eur(100 * vB) + " plus " + eur(pB) + " per minuut. Bij hoeveel minuten zijn ze even duur?",
    keuzes(int(x), vk, [int(x + 10), int(x - 10), int(x + 20), int(x - 20)]),
    "Stel gelijk: " + vA + " + " + centen(pA) + "x = " + vB + " + " + centen(pB) + "x. Dan " + centen(dp) + "x = " + (vB - vA) + ", dus x = " + (vB - vA) + " : " + centen(dp) + " = " + x + " minuten.");
};

// ── Groepen, theorie en vaardigheden ──────────────────────────────
var G1 = "Assenstelsel en grafiek lezen", G2 = "Wat is een functie", G3 = "Lineaire verbanden", G4 = "Snijpunten",
    G5 = "Kwadratische verbanden", G6 = "Exponentiële groei", G7 = "Andere verbanden", G8 = "Toepassen en controle";

var THEORIE = {};
THEORIE[G1] =
  "Een assenstelsel bestaat uit twee getallenlijnen die elkaar loodrecht snijden in de oorsprong (0, 0): de x-as loopt horizontaal, de y-as verticaal. Zo krijgt elk punt van het vlak precies één paar getallen.\n" +
  "• Een punt (x, y): eerst x (hoe ver naar rechts, of naar links als x negatief is), dan y (hoe ver omhoog, of omlaag als y negatief is). De volgorde ligt vast, want (2, 5) en (5, 2) zijn verschillende punten.\n" +
  "• De assen verdelen het vlak in vier kwadranten, genummerd tegen de klok in vanaf rechtsboven: I (x en y positief), II (x negatief, y positief), III (beide negatief) en IV (x positief, y negatief). Een punt op een as ligt in geen enkel kwadrant.\n" +
  "• Een grafiek aflezen: ga bij de gegeven x recht omhoog of omlaag tot de grafiek, en dan opzij naar de y-as.\n" +
  "• Loopt de grafiek van links naar rechts omhoog, dan is hij stijgend; omlaag dalend; horizontaal constant.";
THEORIE[G2] =
  "Een functie werkt als een machine: je stopt er een getal x in en er komt precies één uitkomst uit, f(x). Bij f(x) = 3x " + MIN + " 4 geeft x = 5 de uitkomst f(5) = 3 " + DOT + " 5 " + MIN + " 4 = 11.\n" +
  "• Twee keer dezelfde x met een andere y kan niet: dan weet de machine niet welke uitkomst hij moet geven. Zo'n tabel hoort niet bij een functie.\n" +
  "• Twee verschillende x-waarden met dezelfde y mag wel: bij f(x) = x" + SQ + " geven 3 en " + MIN + "3 allebei 9.\n" +
  "• Een negatief getal vul je in tussen haakjes. f(x) = x" + SQ + " " + MIN + " 2x geeft f(" + MIN + "3) = (" + MIN + "3)" + SQ + " " + MIN + " 2 " + DOT + " (" + MIN + "3) = 9 + 6 = 15. Min keer min is plus, dus (" + MIN + "3)" + SQ + " = 9 en niet " + MIN + "9.\n" +
  "• Terugzoeken: weet je de uitkomst, dan los je een vergelijking op. f(x) = 2x + 1 = 13 geeft 2x = 12, dus x = 6. Controleer door in te vullen: 2 " + DOT + " 6 + 1 = 13.";
THEORIE[G3] =
  "Bij een lineair verband komt er bij elke stap van 1 in x hetzelfde bij (of af). Daarom is de grafiek een rechte lijn. De formule is y = ax + b.\n" +
  "• b is het startgetal: de waarde bij x = 0, want dan valt ax weg. Daar snijdt de lijn de y-as.\n" +
  "• a is de richtingscoëfficiënt (rc): wat er bij y bijkomt als x 1 groter wordt. Is a positief, dan stijgt de lijn; negatief: dalend; 0: horizontaal.\n" +
  "• Staat het getal vooraan, zoals y = 7 " + MIN + " 2x, dan is het startgetal 7 en de rc " + MIN + "2: het getal bij x hoort bij x, met zijn teken.\n" +
  "• Door twee punten: rc = verschil in y : verschil in x. Door (1, 5) en (3, 11): (11 " + MIN + " 5) : (3 " + MIN + " 1) = 3. Dan het startgetal: 5 = 3 " + DOT + " 1 + b, dus b = 2 en y = 3x + 2.\n" +
  "• In een verhaal is het startgetal wat je altijd betaalt (ook bij 0), en de rc wat er per kilometer, per minuut of per stuk bijkomt.";
THEORIE[G4] =
  "Een snijpunt ligt op beide grafieken, dus het voldoet aan beide formules.\n" +
  "• Snijpunt met de y-as: daar is x = 0. Bij y = 2x " + MIN + " 6 is dat (0, " + MIN + "6), het startgetal.\n" +
  "• Snijpunt met de x-as: daar is y = 0. Los 2x " + MIN + " 6 = 0 op: x = 3, dus (3, 0).\n" +
  "• Twee lijnen: stel de formules aan elkaar gelijk. 2x + 1 = " + MIN + "x + 7 geeft 3x = 6, dus x = 2, en y = 2 " + DOT + " 2 + 1 = 5. Het snijpunt is (2, 5). Dat is hetzelfde als een stelsel oplossen (Algebra 2).\n" +
  "• Lijnen met dezelfde rc en een ander startgetal zijn evenwijdig: ze stijgen even snel en snijden elkaar nooit. Twee lijnen met een andere rc snijden elkaar precies één keer.\n" +
  "Een punt typ je in deze app als x = …, y = …, net als de oplossing van een stelsel.";
THEORIE[G5] =
  "Een kwadratisch verband heeft een x" + SQ + ": y = ax" + SQ + " + bx + c. De grafiek is een parabool.\n" +
  "• Het teken van a bepaalt de vorm. a > 0 geeft een dalparabool (open naar boven, met een laagste punt); a < 0 een bergparabool (open naar beneden, met een hoogste punt). Voor grote x wint ax" + SQ + " het altijd van bx + c; b en c verschuiven de parabool alleen.\n" +
  "• Een parabool is symmetrisch. De symmetrieas is de verticale lijn x = " + MIN + "b : 2a, en de top ligt op die lijn. Bij y = x" + SQ + " " + MIN + " 6x + 5 is dat x = 6 : 2 = 3, en de top is (3, 9 " + MIN + " 18 + 5) = (3, " + MIN + "4).\n" +
  "• De topvorm y = a(x " + MIN + " p)" + SQ + " + q heeft top (p, q). Let op het teken: y = (x + 2)" + SQ + " + 3 heeft top (" + MIN + "2, 3), want x + 2 = x " + MIN + " (" + MIN + "2).\n" +
  "• Nulpunten zijn de snijpunten met de x-as: los ax" + SQ + " + bx + c = 0 op. Ontbinden: x" + SQ + " " + MIN + " x " + MIN + " 6 = (x " + MIN + " 3)(x + 2) = 0, dus x = 3 of x = " + MIN + "2. Een product is 0 als een van de factoren 0 is. Een dalparabool met een top onder de x-as heeft er twee.";
THEORIE[G6] =
  "Bij exponentiële groei komt er niet elke stap hetzelfde bij, maar wordt het elke stap met hetzelfde getal vermenigvuldigd: de groeifactor.\n" +
  "• Groei van p% per stap: groeifactor 1 + p : 100. Er komt 5% bij: 100% + 5% = 105%, dus 1,05.\n" +
  "• Afname van p%: groeifactor 1 " + MIN + " p : 100. Er gaat 20% af: 80% blijft over, dus 0,8. Een groeifactor groter dan 1 is groei, tussen 0 en 1 afname.\n" +
  "• Na n stappen vermenigvuldig je n keer: startwaarde 200 met groeifactor 1,5 geeft na 2 stappen 200 " + DOT + " 1,5 " + DOT + " 1,5 = 450. Lineair rekenen (200 + 100 + 100 = 400) is hier fout.\n" +
  "• Verdubbelen is groeifactor 2, halveren 0,5. Verdubbelt iets elke 3 uur, dan zijn 12 uur 4 stappen: 2 " + DOT + " 2 " + DOT + " 2 " + DOT + " 2 = 16 keer zo veel; niet 4 keer en niet 8 keer.\n" +
  "• Lineair of exponentieel? In een tabel met gelijke stappen in x: zijn de verschillen gelijk, dan is het lineair; zijn de quotiënten (nieuw : oud) gelijk, dan exponentieel.";
THEORIE[G7] =
  "Omgekeerd evenredig: wordt de ene grootheid twee keer zo groot, dan wordt de andere twee keer zo klein. Het product x " + DOT + " y blijft gelijk.\n" +
  "• 4 werkers doen 6 dagen over een klus: dat is 4 " + DOT + " 6 = 24 werkdagen. Met 3 werkers duurt het 24 : 3 = 8 dagen. Minder werkers is meer dagen, maar niet één dag per werker.\n" +
  "• De formule is y = k : x. De grafiek is een hyperbool: hij komt steeds dichter bij de assen, maar raakt ze nooit.\n" +
  "De vier soorten grafieken uit elkaar houden:\n" +
  "• rechte lijn: lineair, y = ax + b;\n" +
  "• parabool (dal of berg): kwadratisch, y = ax" + SQ + " + bx + c;\n" +
  "• steeds sneller stijgend (of steeds langzamer dalend), altijd boven de x-as: exponentieel, y = b " + DOT + " g^x;\n" +
  "• hyperbool in twee delen: omgekeerd evenredig, y = k : x.";
THEORIE[G8] =
  "Verbanden vergelijken: twee abonnementen zijn even duur waar hun lijnen elkaar snijden. Dat vind je door de formules aan elkaar gelijk te stellen, zoals bij een snijpunt (Snijpunten). A: 10 + 0,20x en B: 25 + 0,05x geeft 0,15x = 15, dus x = 100 minuten. Vóór dat punt is A goedkoper (lagere vaste kosten), erna B (lagere prijs per minuut).\n" +
  "Een bewering controleer je door een getal in te vullen, door de rc te vergelijken, of door te kijken of de tekens kloppen. Typische fouten:\n" +
  "• het startgetal als richtingscoëfficiënt nemen, of het snijpunt met de y-as als (b, 0) schrijven in plaats van (0, b) (Lineaire verbanden, Snijpunten);\n" +
  "• (" + MIN + "3)" + SQ + " als " + MIN + "9 rekenen (Wat is een functie);\n" +
  "• bij 5% groei de groeifactor 0,05 nemen in plaats van 1,05, of bij afname 1 + p : 100 (Exponentiële groei);\n" +
  "• bij y = (x + 2)" + SQ + " de top bij x = 2 zoeken in plaats van x = " + MIN + "2 (Kwadratische verbanden);\n" +
  "• lijnen met een tegengestelde rc evenwijdig noemen (Snijpunten);\n" +
  "• bij x" + SQ + " = 9 alleen x = 3 noemen en x = " + MIN + "3 vergeten (Kwadratische verbanden).";

// [id, label, groep, korte omschrijving, strategie, uitleg, voorbeeld, minCorrect, subtypes]
var DEFS = [
  ["fn02_kwadrant", "Kwadrant", G1, "(" + MIN + "3, 5) ligt in kwadrant II", "tekens van x en y",
    "Kijk naar de tekens: x positief is rechts, negatief links; y positief is boven, negatief onder. De kwadranten gaan tegen de klok in vanaf rechtsboven: I (+, +), II (" + MIN + ", +), III (" + MIN + ", " + MIN + "), IV (+, " + MIN + ").",
    "(" + MIN + "3, 5)?\nx negatief (links), y positief (boven).\nAntwoord: kwadrant II.", 8, 4],
  ["fn05_functie_of_niet", "Functie of niet", G2, "Twee keer x = 2 met een andere y: geen functie", "één x, één y",
    "Een functie geeft bij elke x precies één y. Zoek of een x twee keer voorkomt met een andere y: dan is het geen functie. Dezelfde y bij twee x-waarden mag wel, en negatieve getallen ook.",
    "(1, 4), (2, 5), (2, 7), (3, 6)?\nBij x = 2 horen 5 en 7.\nAntwoord: nee, geen functie.", 8, 3],
  ["fn06_f_uitrekenen", "f(x) uitrekenen", G2, "f(x) = 3x " + MIN + " 4, f(5) = 11", "invullen",
    "Vervang x door het getal en reken uit met de gewone volgorde: eerst keer, dan plus of min. 3x betekent 3 " + DOT + " x.",
    "f(x) = 3x " + MIN + " 4, f(5)?\n3 " + DOT + " 5 " + MIN + " 4.\nAntwoord: 11.", 8],
  ["fn07_negatieve_x", "Met een negatieve x", G2, "f(x) = x" + SQ + " " + MIN + " 2x, f(" + MIN + "3) = 15", "haakjes om het negatieve getal",
    "Zet het negatieve getal tussen haakjes en reken uit. (" + MIN + "3)" + SQ + " = 9, want min keer min is plus. En " + MIN + "2 " + DOT + " (" + MIN + "3) = +6.",
    "f(x) = x" + SQ + " " + MIN + " 2x, f(" + MIN + "3)?\n(" + MIN + "3)" + SQ + " " + MIN + " 2 " + DOT + " (" + MIN + "3) = 9 + 6.\nAntwoord: 15.", 8],
  ["fn08_terugzoeken", "Terugzoeken", G2, "f(x) = 2x + 1 = 13: x = 6", "vergelijking oplossen",
    "Je weet de uitkomst en zoekt x: maak er een vergelijking van en los die op. Eerst het losse getal naar de andere kant (met het omgekeerde teken), dan delen door het getal bij x.",
    "2x + 1 = 13?\n2x = 12.\nAntwoord: x = 6.", 8],
  ["fn10_startgetal", "Startgetal", G3, "y = 4x + 7: startgetal 7", "waarde bij x = 0",
    "Het startgetal is het losse getal, met zijn teken: de waarde bij x = 0. Het maakt niet uit of het voor of achter de term met x staat.",
    "y = 7 " + MIN + " 2x?\nBij x = 0: y = 7.\nAntwoord: 7.", 8, 2],
  ["fn11_rc_formule", "Richtingscoëfficiënt uit de formule", G3, "y = " + MIN + "3x + 1: rc " + MIN + "3", "het getal bij x",
    "De richtingscoëfficiënt is het getal bij x, met zijn teken. Staat er alleen " + MIN + "x, dan is het " + MIN + "1. Valkuil: het losse getal nemen.",
    "y = 5 " + MIN + " x?\nBij x staat " + MIN + "1.\nAntwoord: " + MIN + "1.", 8, 3],
  ["fn16_formule_twee_punten", "Formule door twee punten", G3, "(1, 5) en (3, 11): y = 3x + 2", "eerst de rc, dan het startgetal",
    "Bereken de rc: verschil in y : verschil in x. Vul daarna één punt in y = ax + b in om b te vinden. Controleer met het andere punt.",
    "(1, 5) en (3, 11)?\nrc = 6 : 2 = 3; 5 = 3 + b, b = 2.\nAntwoord: y = 3x + 2.", 8],
  ["fn17_betekenis_verhaal", "Betekenis in een verhaal", G3, "Taxi: y = 2,5x + 4, per kilometer 2,5 euro", "getal bij x is per stuk",
    "Het getal bij x komt er per kilometer, minuut of uur bij: dat is de rc. Het losse getal betaal je altijd, ook bij 0: het starttarief.",
    "y = 2,5x + 4, prijs per kilometer?\nHet getal bij x.\nAntwoord: 2,5 euro.", 8],
  ["fn18_snijpunt_y_as", "Snijpunt met de y-as", G4, "y = 2x " + MIN + " 6: (0, " + MIN + "6)", "x = 0",
    "Op de y-as is x = 0. Vul x = 0 in: dan blijft het startgetal over. Het snijpunt is (0, startgetal); typ x = 0, y = startgetal.",
    "y = 2x " + MIN + " 6?\nx = 0 geeft y = " + MIN + "6.\nAntwoord: x = 0, y = " + MIN + "6.", 8],
  ["fn19_snijpunt_x_as", "Snijpunt met de x-as", G4, "y = 2x " + MIN + " 6: (3, 0)", "y = 0",
    "Op de x-as is y = 0. Los de vergelijking ax + b = 0 op. Het snijpunt is (x, 0).",
    "y = 2x " + MIN + " 6?\n2x " + MIN + " 6 = 0, x = 3.\nAntwoord: x = 3, y = 0.", 8],
  ["fn21_evenwijdig", "Evenwijdig of niet", G4, "Evenwijdig met y = 2x " + MIN + " 1: y = 2x + 5", "dezelfde rc",
    "Evenwijdige lijnen hebben dezelfde richtingscoëfficiënt; het startgetal mag anders zijn. Een tegengestelde of omgekeerde rc is niet evenwijdig.",
    "Evenwijdig met y = 2x " + MIN + " 1?\nZoek rc 2.\nAntwoord: y = 2x + 5.", 8],
  ["fn22_dal_of_berg", "Dal- of bergparabool", G5, "y = " + MIN + "2x" + SQ + " + 3x: berg", "het teken van a",
    "Kijk alleen naar a, het getal bij x" + SQ + ". a > 0: dalparabool (open naar boven). a < 0: bergparabool (open naar beneden). b en c doen er niet toe.",
    "y = " + MIN + "2x" + SQ + " + 3x?\na = " + MIN + "2 < 0.\nAntwoord: bergparabool.", 8],
  ["fn23_symmetrieas", "Symmetrieas", G5, "y = x" + SQ + " " + MIN + " 6x + 5: x = 3", "x = " + MIN + "b : 2a",
    "De symmetrieas is x = " + MIN + "b : 2a. Let op het minteken en op de 2. Het losse getal c speelt geen rol.",
    "y = x" + SQ + " " + MIN + " 6x + 5?\n" + MIN + "(" + MIN + "6) : 2.\nAntwoord: x = 3.", 8],
  ["fn24_top_formule", "Top uit de formule", G5, "y = x" + SQ + " " + MIN + " 6x + 5: top (3, " + MIN + "4)", "eerst de as, dan invullen",
    "Bereken eerst de x van de top met x = " + MIN + "b : 2a. Vul die x in de formule in voor de y van de top.",
    "y = x" + SQ + " " + MIN + " 6x + 5?\nx = 3; y = 9 " + MIN + " 18 + 5 = " + MIN + "4.\nAntwoord: x = 3, y = " + MIN + "4.", 8],
  ["fn25_top_topvorm", "Top uit de topvorm", G5, "y = (x " + MIN + " 2)" + SQ + " + 3: top (2, 3)", "let op het teken van p",
    "y = a(x " + MIN + " p)" + SQ + " + q heeft top (p, q). Bij (x + 2) is p = " + MIN + "2, want x + 2 = x " + MIN + " (" + MIN + "2). q neem je met zijn teken over.",
    "y = (x + 1)" + SQ + " " + MIN + " 4?\np = " + MIN + "1, q = " + MIN + "4.\nAntwoord: x = " + MIN + "1, y = " + MIN + "4.", 8],
  ["fn26_nulpunten", "Nulpunten", G5, "y = x" + SQ + " " + MIN + " x " + MIN + " 6: x = " + MIN + "2 of x = 3", "ontbinden",
    "Stel y = 0 en ontbind: zoek twee getallen met als product c en als som b. Elke factor is 0 geeft een oplossing; let op de tekens: (x " + MIN + " 3) = 0 geeft x = 3.",
    "x" + SQ + " " + MIN + " x " + MIN + " 6 = 0?\n(x " + MIN + " 3)(x + 2) = 0.\nAntwoord: x = " + MIN + "2 of x = 3.", 8],
  ["fn28_groeifactor_procent", "Groeifactor uit een procent", G6, "5% groei: 1,05; 20% afname: 0,8", "100% plus of min",
    "Bij groei komt het procent bij de 100%, bij afname gaat het eraf. Deel door 100: 105% is 1,05 en 80% is 0,8.",
    "Afname van 20%?\n100% " + MIN + " 20% = 80%.\nAntwoord: 0,8.", 8, 2],
  ["fn29_waarde_na_stappen", "Waarde na n stappen", G6, "200, factor 1,5, 2 stappen: 450", "elke stap keer de groeifactor",
    "Vermenigvuldig de startwaarde net zo vaak met de groeifactor als er stappen zijn. Niet erbij optellen en niet keer het aantal stappen.",
    "Start 200, factor 1,5, 2 stappen?\n200 " + DOT + " 1,5 " + DOT + " 1,5.\nAntwoord: 450.", 8],
  ["fn32_verdubbelen_halveren", "Verdubbelen en halveren", G6, "Elke 3 uur verdubbelen, na 12 uur: 16 keer", "eerst het aantal stappen",
    "Reken eerst uit hoeveel keer het verdubbelt of halveert: de tijd gedeeld door de tijd per stap. Vermenigvuldig dan zo vaak met 2 (of deel zo vaak door 2).",
    "Elke 3 uur verdubbelen, 12 uur?\n12 : 3 = 4 stappen; 2 " + DOT + " 2 " + DOT + " 2 " + DOT + " 2.\nAntwoord: 16 keer.", 8, 2],
  ["fn33_omgekeerd_evenredig", "Omgekeerd evenredig", G7, "4 werkers 6 dagen, 3 werkers: 8 dagen", "het product blijft gelijk",
    "Reken het product uit (werkers keer dagen): dat blijft gelijk. Deel het door het nieuwe aantal. Minder werkers is meer dagen.",
    "4 werkers 6 dagen, 3 werkers?\n4 " + DOT + " 6 = 24; 24 : 3.\nAntwoord: 8.", 8],
  ["fn35_fout_spotten", "Fout spotten: functies", G8, "y = 2x + 5 heeft rc 5: fout", "controleren",
    "Veel gemaakte fouten: het startgetal als rc, het snijpunt met de y-as als (b, 0), (" + MIN + "3)" + SQ + " = " + MIN + "9, groeifactor 0,05 bij 5% groei, het teken van p bij de top, een tegengestelde rc evenwijdig noemen, en bij x" + SQ + " = 9 de oplossing " + MIN + "3 vergeten.",
    "Welke is FOUT?\ny = 2x + 5 heeft rc 5 → goed is 2.\nDie is fout.", 8],
  ["fn36_twee_abonnementen", "Twee abonnementen", G8, "A: 10 + 0,20x, B: 25 + 0,05x: 100 minuten", "formules gelijkstellen",
    "Maak bij elk abonnement een formule (vaste kosten + prijs per minuut " + DOT + " x) en stel ze gelijk. Breng de x-en naar één kant: verschil in vaste kosten : verschil in prijs per minuut.",
    "10 + 0,20x = 25 + 0,05x?\n0,15x = 15.\nAntwoord: 100 minuten.", 8],
];

function tipOf(terms) { return terms && terms[0] ? terms[0] : ""; }

// Typen per vaardigheid (plan FN, §2): G geheel getal (ook negatief), X "x = <geheel getal>" (vergelijking en
// symmetrieas), K kommagetal (hoogstens 2 decimalen), P punt "x = …, y = …" (paar "stelsel"), O twee nulpunten
// "x = … of x = …" (paar "of"). Kiezen: kwadrant (fn02), functie of niet (fn05), formule door twee punten (fn16),
// evenwijdig (fn21), dal of berg (fn22) en fout spotten (fn35).
var GETAL_NEG = { fn06: 1, fn07: 1, fn10: 1, fn11: 1 };
var GETAL     = { fn29: 1, fn32: 1, fn33: 1, fn36: 1 };
var LETTER_X  = { fn08: 1, fn23: 1 };
var KOMMA     = { fn17: 1, fn28: 1 };
var PUNT      = { fn18: 1, fn19: 1, fn24: 1, fn25: 1 };
var TWEE      = { fn26: 1 };

var RAW_SKILLS = DEFS.map(function(d) {
  var key = d[0].slice(0, 4), gen = GEN[key], subs = d[8];
  var skill = {
    id: d[0], label: d[1], group: d[2], desc: d[3], strategy: d[4], tip: tipOf,
    uitleg: d[5], voorbeeld: d[6], minCorrect: d[7], subtypes: subs || undefined,
    theorie: THEORIE[d[2]],
    make: function(s) { return retry(function() { return gen(s || 0); }); },
  };
  if (GETAL_NEG[key]) { skill.inputType = "number"; skill.inputConfig = { allowNegative: true }; }
  if (GETAL[key])     { skill.inputType = "number"; skill.inputConfig = {}; }
  if (LETTER_X[key])  { skill.inputType = "number"; skill.inputConfig = { allowNegative: true, letter: "x" }; }
  if (KOMMA[key])     { skill.inputType = "decimal"; skill.inputConfig = { maxDecimals: 2 }; }
  if (PUNT[key])      { skill.inputType = "pair"; skill.inputConfig = { tussen: "stelsel" }; }
  if (TWEE[key])      { skill.inputType = "pair"; skill.inputConfig = { tussen: "of" }; }
  return skill;
});

var SKILLS = createSkills("wiskunde_functies", RAW_SKILLS);

export var WISK_FUNCTIES_SKILLS = SKILLS.list;
export var WISK_FUNCTIES_ORDER  = SKILLS.list.map(function(s) { return s.id; });
export var WISK_FUNCTIES_GEN    = GEN;
export var WISK_FUNCTIES_THEORIE = THEORIE;
