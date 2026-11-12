// Wiskunde, domein Functies: assenstelsel, functies, lineaire, kwadratische en exponentiële verbanden.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Afspraken (plan FN v2, fase F2: plan F2 v4):
// - Gehele getallen in de notatie van Wiskunde: minteken U+2212, groepjes van drie met een vaste spatie
//   vanaf 10 000. Een kommagetal heeft hoogstens 2 decimalen, zonder eindnul ("1,05", "0,8").
// - Een punt typen: het paar van de stelsels, "x = 3, y = −6" (tussen "stelsel"). Twee nulpunten:
//   "x = −2 of x = 3" (tussen "of", kleinste eerst). Coördinaten zijn gehele getallen van −9 tot 9.
// - Elke vraag heeft vier verschillende keuzes: het antwoord en drie foute keuzes (de valkuilen van het
//   plan, zie q.valkuilen). Een valkuil is nooit gelijk aan het antwoord: geeft een typische fout bij bepaalde
//   getallen toevallig het goede antwoord, dan komt er een andere vraag. Valt een valkuil samen met een andere
//   keuze of is hij ongeldig (geen geheel getal, meer dan 2 decimalen), dan vult een vaste reserve aan: het
//   antwoord plus of min een stap.
// - Fase F1: de 23 vaardigheden zonder tekening. Fase F2: de 13 vaardigheden met een tekening (fn01, fn03, fn04,
//   fn09, fn12-fn15, fn20, fn27, fn30, fn31, fn34) op hun plek in de volgorde; bestaande ids veranderen niet.
//   De tekening: q.figuur = { soort, gegeven }, getekend door VraagFiguur ("assenstelsel", "grafiek", "fntabel").
//   In F2 zijn de drie foute keuzes altijd de drie valkuilen, geldig, verschillend en fout (keuzesStreng).
// - Een richtingscoëfficiënt als antwoord (fn12, fn13) is geheel of een positieve halve; een halve typ je in het
//   kommavak (invoer per vraag). Een negatieve halve komt nog niet voor: het kommavak heeft geen −/+-toets
//   (tijdelijke beperking van de invoer, niet van de stof).

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
// Een formule in een vraag, bewering of keuze breekt niet midden in een term af: vaste spaties. Na een minteken
// voor een haakje ("−(x + 3)²") breekt een browser anders af; daar komt een vaste spatie tussen ("− (x + 3)²").
function vast(t) { return t.replace(/ /g, NB).split(MIN + "(").join(MIN + NB + "("); }
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

// ── Rooster voor de tekeningen (fase F2) ──────────────────────────
// Eén indeling voor de generator (passen de getallen en letters?) en voor VraagFiguur (tekenen), zodat er
// maar één rekening is. Maten in eenheden van het tekenvak (300 bij 140): hokjes van 12, het rooster
// hoogstens 22 hokjes breed (x 30..294) en precies 10 hoog (y 4..124), gecentreerd als het smaller is.
// r = { xa, xb, ya, yb (venster in hokjes), sx, sy (stap per hokje), elke (getal bij elke 2e of 4e lijn),
//       punten: [{ x, y, letter }], namen: [{ grafiek, tekst }], vrij: [{ x, y }] }. De oorsprong ligt altijd in beeld.
// De maat van tekst is die van de getekende tekst in Nunito vet (gemeten met getBBox, dominant-baseline middle):
// per teken een breedte in em, van 0,758 em boven tot 0,6 em onder het midden. De witte rand (stroke 4) telt mee:
// 2 aan elke kant, plus 0,5 marge (de letter wordt op het scherm iets anders afgerond). Een stip: straal 4, plus 0,5.
export var ROOSTER = { cel: 12, links: 30, boven: 4, breed: 22, hoog: 10, vakB: 300, vakH: 140, fs: 14, letterFs: 15 };
var EM = { "4": 0.643, x: 0.585, y: 0.585, l: 0.36, m: 0.88, A: 0.79, B: 0.69, C: 0.68, D: 0.77, P: 0.67 }, RAND = 2.5, STIP = 4.5;
function tekstVak(x, y, tekst, anker, fs) {
  var w = String(tekst).split("").reduce(function(t, k) { return t + (EM[k] || 0.6) * fs; }, 0);
  var x1 = anker === "end" ? x - w : anker === "start" ? x : x - w / 2;
  return { x1: x1 - RAND, x2: x1 + w + RAND, y1: y - 0.758 * fs - RAND, y2: y + 0.6 * fs + RAND };
}
function binnen(v) { return v.x1 >= 0 && v.x2 <= ROOSTER.vakB && v.y1 >= 0 && v.y2 <= ROOSTER.vakH; }
function raakt(a, b) { return a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2; }
function asGetal(v) { return (v < 0 ? MIN : "") + getal(v); }
export function roosterIndeling(r) {
  var c = ROOSTER.cel, nx = r.xb - r.xa, ny = r.yb - r.ya;
  var links = ROOSTER.links + (ROOSTER.breed - nx) * c / 2, boven = ROOSTER.boven;
  var px = function(x) { return links + (x / r.sx - r.xa) * c; };
  var py = function(y) { return boven + (r.yb - y / r.sy) * c; };
  var ax = px(0), ay = py(0), vakken = [], ok = nx > 0 && nx <= ROOSTER.breed && ny === ROOSTER.hoog && r.xa <= 0 && r.xb >= 0 && r.ya <= 0 && r.yb >= 0;
  function zet(lijst, x, y, tekst, anker, fs) {
    var v = tekstVak(x, y, tekst, anker, fs);
    if (!binnen(v) || vakken.some(function(w) { return raakt(v, w); })) ok = false;
    vakken.push(v);
    lijst.push({ x: x, y: y, tekst: tekst, anker: anker });
  }
  var xLabels = [], yLabels = [], i;
  // Geen getal op de rand van het rooster (de buitenste lijnen links, rechts en boven): daar past het niet in het vak
  for (i = r.xa + 1; i < r.xb; i++) if (i !== 0 && i % r.elke === 0) zet(xLabels, px(i * r.sx), ay + 11, asGetal(i * r.sx), "middle", ROOSTER.fs);
  for (i = r.ya; i < r.yb; i++) if (i !== 0 && i % r.elke === 0) zet(yLabels, ax - 5, py(i * r.sy), asGetal(i * r.sy), "end", ROOSTER.fs);
  // De 0 één keer, rechtsonder de oorsprong (links ervan staat het getal van de x-as)
  var nul = []; zet(nul, ax + 3, ay + 11, "0", "start", ROOSTER.fs);
  // De letters x en y aan het eind van de assen: boven of onder de x-as, rechts of links van de y-as
  var asLetters = [];
  function asLetter(opties, tekst) {
    for (var k = 0; k < opties.length; k++) {
      var v = tekstVak(opties[k][0], opties[k][1], tekst, opties[k][2], ROOSTER.fs);
      if (binnen(v) && !vakken.some(function(w) { return raakt(v, w); })) { vakken.push(v); asLetters.push({ x: opties[k][0], y: opties[k][1], tekst: tekst, anker: opties[k][2] }); return; }
    }
    ok = false;
  }
  asLetter([[links + nx * c - 3, ay - 13, "end"], [links + nx * c - 3, ay + 11, "end"]], "x");
  asLetter([[ax + 7, boven + 11, "start"], [ax - 7, boven + 11, "end"]], "y");
  // Plekken die vrij moeten blijven van tekst (r.vrij, niet getekend: bijvoorbeeld het snijpunt bij fn20)
  (r.vrij || []).forEach(function(p) { var v = { x1: px(p.x) - 6, x2: px(p.x) + 6, y1: py(p.y) - 6, y2: py(p.y) + 6 }; if (vakken.some(function(w) { return raakt(v, w); })) ok = false; });
  // Stippen (straal 4), niet onder een getal; daarna hun letter op de eerste vrije plek rondom
  var stippen = (r.punten || []).map(function(p) {
    var v = { x1: px(p.x) - STIP, x2: px(p.x) + STIP, y1: py(p.y) - STIP, y2: py(p.y) + STIP };
    if (!binnen(v) || vakken.some(function(w) { return raakt(v, w); })) ok = false;
    vakken.push(v); return { cx: px(p.x), cy: py(p.y), letter: p.letter };
  });
  var PLEK = [[13, -11], [-13, -11], [13, 11], [-13, 11], [16, 0], [-16, 0], [0, -15], [0, 15]];
  // Een letter staat duidelijk bij zijn eigen stip: elke andere stip ligt minstens 6 verder van de letter
  function eenduidig(lx, ly, x, y) {
    var eigen = Math.hypot(lx - x, ly - y);
    return stippen.every(function(s) { return (s.cx === x && s.cy === y) || Math.hypot(lx - s.cx, ly - s.cy) >= eigen + 6; });
  }
  function plaats(x, y, tekst) {
    for (var k = 0; k < PLEK.length; k++) {
      var lx = x + PLEK[k][0], ly = y + PLEK[k][1], v = tekstVak(lx, ly, tekst, "middle", ROOSTER.letterFs);
      if (binnen(v) && !vakken.some(function(w) { return raakt(v, w); }) && eenduidig(lx, ly, x, y)) { vakken.push(v); return { lx: lx, ly: ly }; }
    }
    return null;
  }
  stippen.forEach(function(s) { var q = plaats(s.cx, s.cy, s.letter); if (!q) { ok = false; q = { lx: s.cx, ly: s.cy }; } s.lx = q.lx; s.ly = q.ly; });
  // De naam van een grafiek (l, m) bij een roosterpunt van die grafiek binnen het rooster, zo ver mogelijk naar rechts
  var namen = (r.namen || []).map(function(n) {
    for (var x = r.xb - 1; x > r.xa; x--) {
      var y = grafiekWaarde(n.grafiek, x * r.sx);
      if (y === null || y <= r.ya * r.sy || y >= r.yb * r.sy) continue;
      var q = plaats(px(x * r.sx), py(y), n.tekst);
      if (q) return { lx: q.lx, ly: q.ly, tekst: n.tekst };
    }
    ok = false; return { lx: 0, ly: 0, tekst: n.tekst };
  });
  return { ok: ok, cel: c, links: links, boven: boven, nx: nx, ny: ny, px: px, py: py, ax: ax, ay: ay,
    xLabels: xLabels, yLabels: yLabels, nul: nul[0], asLetters: asLetters, stippen: stippen, namen: namen };
}
// Venster om de gegeven waarden (met de oorsprong), zo mogelijk met een hokje marge en minstens 12 hokjes breed; elke 2e lijn een getal,
// anders elke 4e. Geen passend venster: null.
function rooster(xs, ys, sx, sy, punten, namen, vrij) {
  var xv = xs.concat([0]).map(function(x) { return x / sx; }), yv = ys.concat([0]).map(function(y) { return y / sy; });
  if (xv.concat(yv).some(function(v) { return Math.floor(v) !== v; })) return null;
  var x1 = Math.min.apply(null, xv), x2 = Math.max.apply(null, xv), y1 = Math.min.apply(null, yv), y2 = Math.max.apply(null, yv);
  if (x2 - x1 > ROOSTER.breed || y2 - y1 > ROOSTER.hoog) return null;
  var xa = x1 - 1, xb = x2 + 1;
  if (xb - xa > ROOSTER.breed) { xa = x1; xb = x2; }
  // Minstens 12 hokjes breed, zodat er genoeg van de grafiek te zien is
  while (xb - xa < 12) { if ((xb - xa) % 2) xa--; else xb++; }
  // De x-as niet op de onderrand (daar past geen getal onder): ya hoogstens -1
  var extra = ROOSTER.hoog - (y2 - y1), ya = Math.min(y1 - Math.floor(extra / 2), y2 - ROOSTER.hoog < 0 ? -1 : 0), yb = ya + ROOSTER.hoog;
  var opties = [2, 4];
  for (var k = 0; k < opties.length; k++) {
    var r = { xa: xa, xb: xb, ya: ya, yb: yb, sx: sx, sy: sy, elke: opties[k], punten: punten || [], namen: namen || [], vrij: vrij || [] };
    if (roosterIndeling(r).ok) return r;
  }
  return null;
}
// De waarde van een grafiek bij x (null als er geen is): lijn, parabool (topvorm), exponentieel, hyperbool, gebroken lijn
export function grafiekWaarde(g, x) {
  if (g.soort === "lijn") return g.a * x + g.b;
  if (g.soort === "parabool") return g.a * (x - g.p) * (x - g.p) + g.q;
  if (g.soort === "expo") return g.s * Math.pow(g.g, x);
  if (g.soort === "hyperbool") return x === 0 ? null : g.k / x;
  if (g.soort === "gebroken") {
    var k = g.knik;
    for (var i = 0; i + 1 < k.length; i++) if (x >= k[i][0] && x <= k[i + 1][0]) return k[i][1] + (k[i + 1][1] - k[i][1]) * (x - k[i][0]) / (k[i + 1][0] - k[i][0]);
    return null;
  }
  return null;
}

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

// ── Vragen met een tekening (fase F2) ─────────────────────────────
// Strenger dan F1 (plan F2 §3): de drie foute keuzes zijn altijd de drie valkuilen van het plan, geldig,
// onderling verschillend en fout. Lukt dat niet, dan een andere vraag (geen reserve).
function keuzesStreng(antwoord, valkuilen) {
  var alle = [antwoord].concat(valkuilen);
  if (alle.some(function(v) { return v === null || v === undefined; })) return { c: null, valkuilen: valkuilen };
  if (alle.some(function(v, i) { return alle.indexOf(v) !== i; })) return { c: null, valkuilen: valkuilen };
  return { c: { answer: antwoord, choices: shuffle(alle) }, valkuilen: valkuilen };
}
function figuur(soort, gegeven) { return { soort: soort, gegeven: gegeven }; }
// Een geheel getal als antwoord: het cijferblok (met −/+); een positieve halve: het kommavak (per vraag, plan F2 §4)
function rcInvoer(a) { return Math.floor(a) === a ? undefined : { inputType: "decimal", inputConfig: { maxDecimals: 1 } }; }
function metExtra(a, b) { var u = {}, k; for (k in a) u[k] = a[k]; if (b) { for (k in b) u[k] = b[k]; } return u; }
var LETTERS = ["A", "B", "C", "D"];

GEN.fn01 = function(sub) {
  // sub kiest het kwadrant van het gevraagde punt
  var sx = sub === 0 || sub === 3 ? 1 : -1, sy = sub < 2 ? 1 : -1;
  var x = sx * rnd(1, 9), y = sy * rnd(1, 4);
  if (Math.abs(x) === Math.abs(y)) return null;
  var n = rnd(3, 4), gevraagd = rnd(0, n - 1), punten = [], bezet = {};
  for (var i = 0; i < n; i++) {
    var p = i === gevraagd ? [x, y] : [nz(-9, 9), nz(-4, 4)];
    if (bezet[p[0] + "," + p[1]]) return null;
    bezet[p[0] + "," + p[1]] = true;
    punten.push({ x: p[0], y: p[1], letter: LETTERS[i] });
  }
  var r = rooster(punten.map(function(p) { return p.x; }), [-4, 4], 1, 1, punten);
  if (!r) return null;
  var L = LETTERS[gevraagd];
  return Q("Wat zijn de coördinaten van " + L + "?", keuzesStreng(pt(x, y), [pt(y, x), pt(-x, y), pt(x, -y)]),
    "Vanuit de oorsprong: " + Math.abs(x) + " naar " + (x > 0 ? "rechts" : "links") + " en " + Math.abs(y) + " naar " + (y > 0 ? "boven" : "beneden") + ". Eerst x, dan y: " + punt(x, y) + ".",
    { figuur: figuur("assenstelsel", { rooster: r, gevraagd: L }) });
};

GEN.fn03 = function() {
  // Gekozen vanuit de x waar de lijn de waarde k heeft (x1), zodat die een roosterpunt is
  var a = pickOne([-3, -2, 2, 3]), k = nz(-6, 6), x1 = rnd(-6, 6), b = k - a * x1, y = a * k + b;
  if (x1 === k || Math.abs(b) > 9) return null;
  var g = { soort: "lijn", a: a, b: b };
  var r = rooster([k, x1], [y, k], 1, 1, [], [], [{ x: k, y: y }]);
  if (!r) return null;
  // valkuilen: x en y verwisseld (de x waar de lijn k is), één hokje te hoog, de waarde bij x + 1
  return Q("Wat is y als x = " + int(k) + "?", keuzesStreng(int(y), [int(x1), int(y + 1), int(y + a)]),
    "Ga bij x = " + int(k) + " recht " + (y >= 0 ? "omhoog" : "omlaag") + " naar de lijn en dan opzij naar de y-as: y = " + int(y) + ".",
    { figuur: figuur("grafiek", { rooster: r, grafieken: [g] }) });
};

GEN.fn04 = function(sub) {
  var soorten = shuffle(["stijgt", "daalt", "constant"]), x = rnd(-9, -4), y = rnd(-3, 3), knik = [[x, y]];
  for (var i = 0; i < 3; i++) {
    var w = rnd(2, 5), d = soorten[i] === "constant" ? 0 : (soorten[i] === "stijgt" ? 1 : -1) * rnd(1, 4);
    x += w; y += d; knik.push([x, y]);
  }
  var vraag = ["stijgt", "daalt", "constant"][sub], j = soorten.indexOf(vraag);
  var stuk = function(i) { return "van x = " + int(knik[i][0]) + " tot x = " + int(knik[i + 1][0]); };
  var r = rooster(knik.map(function(p) { return p[0]; }), knik.map(function(p) { return p[1]; }), 1, 1);
  if (!r) return null;
  var anderen = [0, 1, 2].filter(function(i) { return i !== j; }).map(stuk).concat(["de hele grafiek"]);
  return Q("Op welk stuk " + (vraag === "constant" ? "is de grafiek constant" : (vraag === "stijgt" ? "stijgt" : "daalt") + " de grafiek") + "?", keuzesStreng(stuk(j), anderen),
    "Lees van links naar rechts. " + (vraag === "constant" ? "Constant is horizontaal" : vraag === "stijgt" ? "Stijgen is omhoog gaan" : "Dalen is omlaag gaan") + ": " + stuk(j) + ".",
    { figuur: figuur("grafiek", { rooster: r, grafieken: [{ soort: "gebroken", knik: knik }] }) });
};

GEN.fn09 = function() {
  var a = pickOne([-5, -4, -3, -2, 2, 3, 4, 5]), b = rnd(-9, 9), n = rnd(4, 5), x0 = rnd(-4, 6 - n), xs = [];
  for (var i = 0; i < n; i++) xs.push(x0 + i);
  var v = rnd(0, n - 1), xv = xs[v], xn = v < n - 1 ? xs[v + 1] : xs[v - 1];
  // plan F2 §3: het "?" en de kolom ernaast niet bij x = 0, en x bij het "?" niet gelijk aan het startgetal
  if (xv === 0 || xn === 0 || xv === b) return null;
  var ys = xs.map(function(x, i) { return i === v ? null : a * x + b; });
  return Q(vast(lijn(a, b)) + ". Welk getal hoort op de plek van ?", keuzesStreng(int(a * xv + b), [int(a * xn + b), int(xv), int(b)]),
    "Vul x = " + int(xv) + " in: " + int(a) + " " + DOT + " " + (xv < 0 ? "(" + int(xv) + ")" : int(xv)) + (b < 0 ? " " + MIN + " " + (-b) : " + " + b) + " = " + int(a * xv + b) + ".",
    { figuur: figuur("fntabel", { xs: xs, ys: ys }) });
};

// Tabel met stappen van 2 in x, zonder x = 0: alle x even en met hetzelfde teken
function tabelStap2() { var n = rnd(4, 5), start = pickOne([2, 4, -2 * n, -2 * n - 2]), xs = []; for (var i = 0; i < n; i++) xs.push(start + 2 * i); return xs; }
GEN.fn12 = function() {
  var a = pickOne([-5, -4, -3, -1, 3, 4, 5, 0.5, 1.5, 2.5]), b = rnd(-9, 9), xs = tabelStap2();
  if (b === a || b === 2 * a || b === 2) return null;
  var ys = xs.map(function(x) { return a * x + b; });
  if (ys.some(function(y) { return Math.abs(y) > 99; })) return null;
  // valkuilen: het verschil in y zonder te delen, de stap in x, het startgetal
  return Q("Wat is de richtingscoëfficiënt?", keuzesStreng(asGetal(a), [asGetal(2 * a), "2", asGetal(b)]),
    "x gaat steeds 2 omhoog en y " + (a > 0 ? "omhoog" : "omlaag") + " met " + getal(Math.abs(2 * a)) + ". Per stap van 1 in x: " + asGetal(2 * a) + " : 2 = " + asGetal(a) + ".",
    metExtra({ figuur: figuur("fntabel", { xs: xs, ys: ys }) }, rcInvoer(a)));
};

GEN.fn13 = function() {
  var a = pickOne([-5, -4, -2, 2, 4, 5, 0.5, 2.5]), dx = Math.floor(a) === a ? rnd(2, 3) : pickOne([2, 4, 6]);
  if (a * dx === 1 / a) return null;
  var sy = Math.abs(a * dx) > 6 ? 2 : 1, x1 = rnd(-6, 6 - dx), y1 = sy * rnd(-4, 4), b = y1 - a * x1, x2 = x1 + dx, y2 = y1 + a * dx;
  if (y2 % sy !== 0 || (x1 === 0 && y1 === 0)) return null;
  var r = rooster([x1, x2], [y1, y2], 1, sy, [{ x: x1, y: y1, letter: "A" }, { x: x2, y: y2, letter: "B" }]);
  if (!r) return null;
  // valkuilen: Δx : Δy, het teken omgedraaid, Δy zonder te delen
  return Q("Wat is de richtingscoëfficiënt van de lijn door A en B?", keuzesStreng(asGetal(a), [asGetal(1 / a), asGetal(-a), asGetal(a * dx)]),
    "Van A naar B: " + dx + " naar rechts en " + getal(Math.abs(a * dx)) + (a > 0 ? " omhoog" : " omlaag") + ". rc = " + asGetal(a * dx) + " : " + dx + " = " + asGetal(a) + ".",
    metExtra({ figuur: figuur("grafiek", { rooster: r, grafieken: [{ soort: "lijn", a: a, b: b }] }) }, rcInvoer(a)));
};

GEN.fn14 = function() {
  var a = nz(-5, 5), b = nz(-9, 9), xs = rnd(0, 1) ? tabelStap2() : [-2, 0, 2, 4];
  if (a === b) return null;
  var ys = xs.map(function(x) { return a * x + b; });
  if (ys.some(function(y) { return Math.abs(y) > 99; })) return null;
  // valkuilen: rc en startgetal verwisseld, het startgetal met het andere teken, de rc niet gedeeld door 2
  return Q("Welke formule hoort bij de tabel?", keuzesStreng(lijn(a, b), [lijn(b, a), lijn(a, -b), lijn(2 * a, b)]),
    "Per stap van 2 in x verandert y met " + int(2 * a) + ", dus de rc is " + int(a) + ". Het startgetal (bij x = 0) is " + int(b) + ": " + lijn(a, b) + ".",
    { figuur: figuur("fntabel", { xs: xs, ys: ys }) });
};

GEN.fn15 = function() {
  var a = nz(-3, 3), x0 = nz(-6, 6), b = -a * x0;
  if (b === 0 || b === a || x0 === b || Math.abs(b) > 8) return null;
  var r = rooster([x0, 1], [b, a + b], 1, 1);
  if (!r) return null;
  // valkuilen: rc en startgetal verwisseld, het teken van de rc omgedraaid, het snijpunt met de x-as als startgetal
  return Q("Welke formule hoort bij de lijn?", keuzesStreng(lijn(a, b), [lijn(b, a), lijn(-a, b), lijn(a, x0)]),
    "De lijn snijdt de y-as bij " + int(b) + " (startgetal). Per hokje naar rechts gaat hij " + Math.abs(a) + (a > 0 ? " omhoog" : " omlaag") + " (rc " + int(a) + "): " + lijn(a, b) + ".",
    { figuur: figuur("grafiek", { rooster: r, grafieken: [{ soort: "lijn", a: a, b: b }] }) });
};

GEN.fn20 = function() {
  // Gekozen vanuit het snijpunt (X, Y) en het snijpunt x0 van l met de x-as, zodat alles roosterpunten zijn
  var X = nz(-5, 5), Y = nz(-4, 4), d = nz(-4, 4), x0 = X - d, a1 = deel(Y, d), a2 = nz(-3, 3);
  if (a1 === null || X === Y || a1 === a2) return null;
  var b1 = Y - a1 * X, b2 = Y - a2 * X;
  // plan F2 §3: l niet door de oorsprong (b1 ≠ 0, dus x0 ≠ 0) en niet horizontaal (a1 ≠ 0, want Y ≠ 0)
  if (b1 === 0 || Math.abs(a1) > 3 || Math.abs(b1) > 9 || Math.abs(b2) > 9) return null;
  var l = { soort: "lijn", a: a1, b: b1 }, m = { soort: "lijn", a: a2, b: b2 };
  var r = rooster([X, x0], [Y, b1], 1, 1, [], [{ grafiek: l, tekst: "l" }, { grafiek: m, tekst: "m" }], [{ x: X, y: Y }]);
  if (!r) return null;
  // valkuilen: x en y verwisseld, het snijpunt van l met de x-as, het snijpunt van l met de y-as
  return Q("l: " + vast(lijn(a1, b1)) + " en m: " + vast(lijn(a2, b2)) + ". Snijpunt van l en m?", keuzesStreng(pt(X, Y), [pt(Y, X), pt(x0, 0), pt(0, b1)]),
    "Stel gelijk: " + veelterm([[a1, "x"], [b1, ""]]) + " = " + veelterm([[a2, "x"], [b2, ""]]) + " geeft x = " + int(X) + ", en y = " + int(Y) + ". In de tekening snijden de lijnen elkaar daar.",
    { figuur: figuur("grafiek", { rooster: r, grafieken: [l, m] }) });
};

GEN.fn27 = function() {
  var a = pickOne([1, -1]), p = nz(-5, 5), q = rnd(-4, 4);
  var r = rooster([p - 2, p + 2], [q, q + 4 * a], 1, 1);
  if (!r) return null;
  // valkuilen: het teken van a omgedraaid, de top gespiegeld, een verkeerd losse getal. Met vaste spaties: een
  // topvorm past op 320 px niet altijd op één regel, en mag dan niet midden in een term afbreken (de letter wordt kleiner)
  return Q("Welke formule hoort bij de parabool?", keuzesStreng(vast(topvorm(a, p, q)), [vast(topvorm(-a, p, q)), vast(topvorm(a, -p, q)), vast(topvorm(a, p, q + pickOne([-1, 1])))]),
    (a > 0 ? "Een dalparabool: a = 1" : "Een bergparabool: a = " + MIN + "1") + ". De top is " + punt(p, q) + ", dus " + topvorm(a, p, q) + ".",
    { figuur: figuur("grafiek", { rooster: r, grafieken: [{ soort: "parabool", a: a, p: p, q: q }] }) });
};

// Groeifactor als breuk teller/noemer (plan F2 §3)
var FN30_G = [{ t: 5, n: 4 }, { t: 2, n: 1 }, { t: 5, n: 2 }, { t: 4, n: 1 }, { t: 4, n: 5 }, { t: 2, n: 5 }, { t: 1, n: 4 }];
GEN.fn30 = function() {
  var f = pickOne(FN30_G), basis = f.n * f.n * f.n, s = basis * rnd(1, Math.max(1, Math.floor(1000 / basis)));
  if (s < 10 || (basis < 8 && s % 10 !== 0)) return null;
  var ys = [0, 1, 2, 3].map(function(x) { return s * macht(f.t, x) / macht(f.n, x); });
  if (ys.some(function(y) { return y > 9999; })) return null;
  var h = 100 * f.t / f.n, groei = f.t > f.n;
  // valkuilen: het verschil van de eerste twee waarden, de omgekeerde factor, het procent als factor
  return Q("Wat is de groeifactor?", keuzesStreng(dec2(h), [dec2(Math.abs(ys[1] - ys[0]) * 100), dec2(100 * f.n / f.t), dec2(groei ? h - 100 : 100 - h)]),
    "Deel een waarde door de vorige: " + int(ys[1]) + " : " + int(ys[0]) + " = " + dec2(h) + ". Elke stap " + (groei ? "keer " + dec2(h) + " (groei)" : "keer " + dec2(h) + " (afname)") + ".",
    { figuur: figuur("fntabel", { xs: [0, 1, 2, 3], ys: ys }) });
};

// fn31: tabel uit één soort, x = 1..4; precies één van de vier rekeningen is constant
var VERBAND = ["lineair", "exponentieel", "kwadratisch", "omgekeerd evenredig"];
function verbandVan(xs, ys) {
  var d = ys.slice(1).map(function(y, i) { return y - ys[i]; }), q = ys.slice(1).map(function(y, i) { return ys[i] === 0 ? null : y / ys[i]; });
  var d2 = d.slice(1).map(function(y, i) { return y - d[i]; }), xy = xs.map(function(x, i) { return x * ys[i]; });
  var gelijk = function(l) { return l.every(function(v) { return v !== null && Math.abs(v - l[0]) < 1e-9; }); };
  return [gelijk(d) && d[0] !== 0, gelijk(q) && q[0] !== 1, gelijk(d2) && d2[0] !== 0, gelijk(xy)];
}
GEN.fn31 = function(sub) {
  var xs = [1, 2, 3, 4], ys;
  if (sub === 0) { var a = nz(-6, 6), b = rnd(-9, 9); ys = xs.map(function(x) { return a * x + b; }); }
  else if (sub === 1) { var g = pickOne([2, 3]), s = rnd(1, 5); ys = rnd(0, 1) ? xs.map(function(x) { return s * macht(g, x); }) : xs.map(function(x) { return s * macht(g, 5 - x); }); }
  else if (sub === 2) { var k = pickOne([1, -1, 2]), c = rnd(-9, 9); ys = xs.map(function(x) { return k * x * x + c; }); }
  else { var m = pickOne([12, 24, 36, 48]); ys = xs.map(function(x) { return m / x; }); }
  var v = verbandVan(xs, ys);
  if (v.filter(Boolean).length !== 1 || !v[sub]) return null;
  var anderen = VERBAND.filter(function(n, i) { return i !== sub; });
  var uitleg = ["De verschillen zijn steeds gelijk (elke stap hetzelfde erbij)", "De quotiënten zijn steeds gelijk (elke stap hetzelfde keer)", "De verschillen van de verschillen zijn gelijk", "x keer y is steeds hetzelfde"][sub];
  return Q("Wat voor verband is dit?", keuzesStreng(VERBAND[sub], anderen), uitleg + ": " + VERBAND[sub] + ".",
    { figuur: figuur("fntabel", { xs: xs, ys: ys }) });
};

// fn34: formules per soort (plan F2 §3), met vaste spaties zoals bij fn27
function fnFormule(g) {
  if (g.soort === "lijn") return vast(lijn(g.a, g.b));
  if (g.soort === "parabool") return vast(topvorm(g.a, g.p, g.q));
  if (g.soort === "expo") return vast("y = " + g.s + " " + DOT + " " + g.g + "^x");
  return vast("y = " + int(g.k) + " : x");
}
// Een grafiek van een andere soort door P (xp, yp), of null als dat niet met hele getallen kan
// (met overzichtelijke getallen: een los getal tot 12, k tot 36)
function doorP(soort, xp, yp) {
  if (soort === "lijn") { var a = nz(-3, 3), b = yp - a * xp; return Math.abs(b) <= 12 ? { soort: "lijn", a: a, b: b } : null; }
  if (soort === "parabool") { var p = rnd(-3, 3), a2 = pickOne([1, -1]), q = yp - a2 * (xp - p) * (xp - p); return Math.abs(q) <= 12 ? { soort: "parabool", a: a2, p: p, q: q } : null; }
  if (soort === "expo") { if (xp < 1) return null; var g = pickOne([2, 3]), s = deel(yp, macht(g, xp)); return s && s > 0 ? { soort: "expo", s: s, g: g } : null; }
  return Math.abs(xp * yp) <= 36 ? { soort: "hyperbool", k: xp * yp } : null;
}
var SOORTEN34 = ["lijn", "parabool", "expo", "hyperbool"];
GEN.fn34 = function(sub) {
  var soort = SOORTEN34[sub], g, fout, xp, sy = 1;
  if (soort === "lijn") { g = { soort: "lijn", a: nz(-3, 3), b: rnd(-4, 4) }; xp = nz(-4, 4); fout = { soort: "lijn", a: -g.a, b: g.b }; }
  else if (soort === "parabool") { g = { soort: "parabool", a: pickOne([1, -1]), p: nz(-3, 3), q: rnd(-3, 3) }; xp = nz(-4, 4); fout = { soort: "parabool", a: g.a, p: -g.p, q: g.q }; }
  else if (soort === "expo") { g = { soort: "expo", s: rnd(2, 4), g: pickOne([2, 3]) }; xp = 2; fout = { soort: "expo", s: g.g, g: g.s }; }
  else { g = { soort: "hyperbool", k: pickOne([-12, -8, -6, -4, 4, 6, 8, 12]) }; xp = pickOne([1, 2, 3, 4, 6]) * (g.k > 0 ? 1 : -1); fout = { soort: "hyperbool", k: -g.k }; }
  var yp = grafiekWaarde(g, xp);
  // plan F2 §3: P met x ≠ 0 en y > 0, op een roosterpunt
  if (yp === null || Math.floor(yp) !== yp || !(yp > 0) || xp === 0) return null;
  if (soort === "expo") sy = yp > 36 ? 10 : yp > 18 ? 5 : yp > 9 ? 2 : 1;
  if (yp % sy !== 0 || (fout.soort === g.soort && Math.abs(grafiekWaarde(fout, xp) - yp) < 1e-9)) return null;
  var anderen = shuffle(SOORTEN34.filter(function(s) { return s !== soort; })).map(function(s) { return doorP(s, xp, yp); }).filter(Boolean).slice(0, 2);
  if (anderen.length < 2) return null;
  var r = rooster([xp], [yp], 1, sy, [{ x: xp, y: yp, letter: "P" }]);
  if (!r) return null;
  return Q("Welke formule past bij deze grafiek?", keuzesStreng(fnFormule(g), [fnFormule(fout)].concat(anderen.map(fnFormule))),
    "De vorm is " + { lijn: "een rechte lijn", parabool: "een parabool", expo: "exponentieel (steeds sneller stijgend)", hyperbool: "een hyperbool" }[soort] + ", en de grafiek gaat door P " + punt(xp, yp) + ": " + fnFormule(g) + ".",
    { figuur: figuur("grafiek", { rooster: r, grafieken: [g] }) });
};

// ── Groepen, theorie en vaardigheden ──────────────────────────────
var G1 = "Assenstelsel en grafiek lezen", G2 = "Wat is een functie", G3 = "Lineaire verbanden", G4 = "Snijpunten",
    G5 = "Kwadratische verbanden", G6 = "Exponentiële groei", G7 = "Andere verbanden", G8 = "Toepassen en controle";

var THEORIE = {};
THEORIE[G1] =
  "Een assenstelsel bestaat uit twee getallenlijnen die elkaar loodrecht snijden in de oorsprong (0, 0): de x-as loopt horizontaal, de y-as verticaal. Zo krijgt elk punt van het vlak precies één paar getallen.\n" +
  "• Een punt (x, y): eerst x (hoe ver naar rechts, of naar links als x negatief is), dan y (hoe ver omhoog, of omlaag als y negatief is). De volgorde ligt vast, want (2, 5) en (5, 2) zijn verschillende punten.\n" +
  "• De assen verdelen het vlak in vier kwadranten, genummerd tegen de klok in vanaf rechtsboven: I (x en y positief), II (x negatief, y positief), III (beide negatief) en IV (x positief, y negatief). Een punt op een as ligt in geen enkel kwadrant.\n" +
  "[fig:fn_assenstelsel]\n" +
  "• Een grafiek aflezen: ga bij de gegeven x recht omhoog of omlaag tot de grafiek, en dan opzij naar de y-as.\n" +
  "• Loopt de grafiek van links naar rechts omhoog, dan is hij stijgend; omlaag dalend; horizontaal constant.";
THEORIE[G2] =
  "Een functie werkt als een machine: je stopt er een getal x in en er komt precies één uitkomst uit, f(x). Bij f(x) = 3x " + MIN + " 4 geeft x = 5 de uitkomst f(5) = 3 " + DOT + " 5 " + MIN + " 4 = 11.\n" +
  "[fig:fn_machine]\n" +
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
  "[fig:fn_lijn]\n" +
  "• In een verhaal is het startgetal wat je altijd betaalt (ook bij 0), en de rc wat er per kilometer, per minuut of per stuk bijkomt.";
THEORIE[G4] =
  "Een snijpunt ligt op beide grafieken, dus het voldoet aan beide formules.\n" +
  "• Snijpunt met de y-as: daar is x = 0. Bij y = 2x " + MIN + " 6 is dat (0, " + MIN + "6), het startgetal.\n" +
  "• Snijpunt met de x-as: daar is y = 0. Los 2x " + MIN + " 6 = 0 op: x = 3, dus (3, 0).\n" +
  "• Twee lijnen: stel de formules aan elkaar gelijk. 2x + 1 = " + MIN + "x + 7 geeft 3x = 6, dus x = 2, en y = 2 " + DOT + " 2 + 1 = 5. Het snijpunt is (2, 5). Dat is hetzelfde als een stelsel oplossen (Algebra 2).\n" +
  "[fig:fn_snijpunt]\n" +
  "• Lijnen met dezelfde rc en een ander startgetal zijn evenwijdig: ze stijgen even snel en snijden elkaar nooit. Twee lijnen met een andere rc snijden elkaar precies één keer.\n" +
  "Een punt typ je in deze app als x = …, y = …, net als de oplossing van een stelsel.";
THEORIE[G5] =
  "Een kwadratisch verband heeft een x" + SQ + ": y = ax" + SQ + " + bx + c. De grafiek is een parabool.\n" +
  "• Het teken van a bepaalt de vorm. a > 0 geeft een dalparabool (open naar boven, met een laagste punt); a < 0 een bergparabool (open naar beneden, met een hoogste punt). Voor grote x wint ax" + SQ + " het altijd van bx + c; b en c verschuiven de parabool alleen.\n" +
  "[fig:fn_dalberg]\n" +
  "• Een parabool is symmetrisch. De symmetrieas is de verticale lijn x = " + MIN + "b : 2a, en de top ligt op die lijn. Bij y = x" + SQ + " " + MIN + " 6x + 5 is dat x = 6 : 2 = 3, en de top is (3, 9 " + MIN + " 18 + 5) = (3, " + MIN + "4). Deze parabool snijdt de x-as bij x = 1 en x = 5, want x" + SQ + " " + MIN + " 6x + 5 = (x " + MIN + " 1)(x " + MIN + " 5).\n" +
  "[fig:fn_parabool]\n" +
  "• De topvorm y = a(x " + MIN + " p)" + SQ + " + q heeft top (p, q). Let op het teken: y = (x + 2)" + SQ + " + 3 heeft top (" + MIN + "2, 3), want x + 2 = x " + MIN + " (" + MIN + "2).\n" +
  "• Nulpunten zijn de snijpunten met de x-as: los ax" + SQ + " + bx + c = 0 op. Ontbinden: x" + SQ + " " + MIN + " x " + MIN + " 6 = (x " + MIN + " 3)(x + 2) = 0, dus x = 3 of x = " + MIN + "2. Een product is 0 als een van de factoren 0 is. Een dalparabool met een top onder de x-as heeft er twee.";
THEORIE[G6] =
  "Bij exponentiële groei komt er niet elke stap hetzelfde bij, maar wordt het elke stap met hetzelfde getal vermenigvuldigd: de groeifactor.\n" +
  "• Groei van p% per stap: groeifactor 1 + p : 100. Er komt 5% bij: 100% + 5% = 105%, dus 1,05.\n" +
  "• Afname van p%: groeifactor 1 " + MIN + " p : 100. Er gaat 20% af: 80% blijft over, dus 0,8. Een groeifactor groter dan 1 is groei, tussen 0 en 1 afname.\n" +
  "• Na n stappen vermenigvuldig je n keer: startwaarde 200 met groeifactor 1,5 geeft na 2 stappen 200 " + DOT + " 1,5 " + DOT + " 1,5 = 450. Lineair rekenen (200 + 100 + 100 = 400) is hier fout.\n" +
  "[fig:fn_groei]\n" +
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
  "• hyperbool in twee delen: omgekeerd evenredig, y = k : x.\n" +
  "[fig:fn_vier]";
THEORIE[G8] =
  "Verbanden vergelijken: twee abonnementen zijn even duur waar hun lijnen elkaar snijden. Dat vind je door de formules aan elkaar gelijk te stellen, zoals bij een snijpunt (Snijpunten). A: 10 + 0,20x en B: 25 + 0,05x geeft 0,15x = 15, dus x = 100 minuten. Vóór dat punt is A goedkoper (lagere vaste kosten), erna B (lagere prijs per minuut).\n" +
  "[fig:fn_abonnementen]\n" +
  "Een bewering controleer je door een getal in te vullen, door de rc te vergelijken, of door te kijken of de tekens kloppen. Typische fouten:\n" +
  "• het startgetal als richtingscoëfficiënt nemen, of het snijpunt met de y-as als (b, 0) schrijven in plaats van (0, b) (Lineaire verbanden, Snijpunten);\n" +
  "• (" + MIN + "3)" + SQ + " als " + MIN + "9 rekenen (Wat is een functie);\n" +
  "• bij 5% groei de groeifactor 0,05 nemen in plaats van 1,05, of bij afname 1 + p : 100 (Exponentiële groei);\n" +
  "• bij y = (x + 2)" + SQ + " de top bij x = 2 zoeken in plaats van x = " + MIN + "2 (Kwadratische verbanden);\n" +
  "• lijnen met een tegengestelde rc evenwijdig noemen (Snijpunten);\n" +
  "• bij x" + SQ + " = 9 alleen x = 3 noemen en x = " + MIN + "3 vergeten (Kwadratische verbanden).";

// [id, label, groep, korte omschrijving, strategie, uitleg, voorbeeld, minCorrect, subtypes]
var DEFS = [
  ["fn01_coordinaten", "Coördinaten van een punt", G1, "A ligt 3 naar rechts en 2 omhoog: (3, 2)", "eerst x, dan y",
    "Begin in de oorsprong. Tel eerst hoeveel hokjes het punt naar rechts (+) of links (" + MIN + ") ligt: dat is x. Dan hoeveel omhoog (+) of omlaag (" + MIN + "): dat is y. Typ x = \u2026, y = \u2026.",
    "A: 3 naar rechts, 2 omlaag?\nx = 3, y = " + MIN + "2.\nAntwoord: x = 3, y = " + MIN + "2.", 8, 4],
  ["fn02_kwadrant", "Kwadrant", G1, "(" + MIN + "3, 5) ligt in kwadrant II", "tekens van x en y",
    "Kijk naar de tekens: x positief is rechts, negatief links; y positief is boven, negatief onder. De kwadranten gaan tegen de klok in vanaf rechtsboven: I (+, +), II (" + MIN + ", +), III (" + MIN + ", " + MIN + "), IV (+, " + MIN + ").",
    "(" + MIN + "3, 5)?\nx negatief (links), y positief (boven).\nAntwoord: kwadrant II.", 8, 4],
  ["fn03_waarde_aflezen", "Waarde aflezen", G1, "Bij x = 2 is y = 5", "omhoog naar de grafiek, opzij naar de y-as",
    "Zoek de gegeven x op de x-as. Ga recht omhoog of omlaag tot je de grafiek raakt, en dan opzij naar de y-as. Lees daar y af. Valkuil: de x en de y verwisselen.",
    "y bij x = 2?\nVan x = 2 omhoog naar de lijn, opzij naar de y-as.\nAntwoord: 5.", 8],
  ["fn04_stijgend_dalend", "Stijgend, dalend of constant", G1, "Waar gaat de grafiek omlaag?", "lees van links naar rechts",
    "Lees de grafiek altijd van links naar rechts. Gaat hij omhoog, dan stijgt hij; omlaag: dalend; horizontaal: constant. De knikpunten horen bij beide stukken.",
    "Van x = " + MIN + "2 tot x = 1 gaat de lijn omlaag.\nDat stuk daalt.", 8, 3],
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
  ["fn09_tabel_aanvullen", "Tabel aanvullen", G2, "y = 5x " + MIN + " 2, bij x = 3: 13", "invullen",
    "Kijk welke x boven het vraagteken staat en vul die in de formule in. Niet het getal van de kolom ernaast.",
    "y = 5x " + MIN + " 2, x = 3?\n5 " + DOT + " 3 " + MIN + " 2.\nAntwoord: 13.", 8],
  ["fn10_startgetal", "Startgetal", G3, "y = 4x + 7: startgetal 7", "waarde bij x = 0",
    "Het startgetal is het losse getal, met zijn teken: de waarde bij x = 0. Het maakt niet uit of het voor of achter de term met x staat.",
    "y = 7 " + MIN + " 2x?\nBij x = 0: y = 7.\nAntwoord: 7.", 8, 2],
  ["fn11_rc_formule", "Richtingscoëfficiënt uit de formule", G3, "y = " + MIN + "3x + 1: rc " + MIN + "3", "het getal bij x",
    "De richtingscoëfficiënt is het getal bij x, met zijn teken. Staat er alleen " + MIN + "x, dan is het " + MIN + "1. Valkuil: het losse getal nemen.",
    "y = 5 " + MIN + " x?\nBij x staat " + MIN + "1.\nAntwoord: " + MIN + "1.", 8, 3],
  ["fn12_rc_tabel", "Richtingscoëfficiënt uit een tabel", G3, "x steeds +2, y steeds +6: rc 3", "verschil in y : verschil in x",
    "Kijk hoeveel y verandert als x één stap verder gaat, en deel door de stap in x. Gaat x met 2 tegelijk, dan deel je door 2.",
    "x: 2, 4, 6; y: 5, 11, 17?\nPer 2 in x: +6.\n6 : 2 = 3.", 8],
  ["fn13_rc_grafiek", "Richtingscoëfficiënt uit een grafiek", G3, "Van A naar B: 2 opzij, 6 omhoog: rc 3", "omhoog : opzij",
    "Ga van A naar B: tel hoeveel je naar rechts gaat en hoeveel omhoog (+) of omlaag (" + MIN + "). rc = verschil in y : verschil in x. Let op de stap van de y-as.",
    "2 naar rechts, 6 omhoog?\n6 : 2.\nAntwoord: 3.", 8],
  ["fn14_formule_tabel", "Formule bij een tabel", G3, "Stap 2 in x, +6 in y, bij x = 0 y = 1: y = 3x + 1", "rc en startgetal",
    "Reken de rc uit (verschil in y : verschil in x) en zoek het startgetal: de y bij x = 0. Staat x = 0 er niet in, reken dan terug met de rc.",
    "x: 0, 2, 4; y: 1, 7, 13?\nrc = 6 : 2 = 3, startgetal 1.\nAntwoord: y = 3x + 1.", 8],
  ["fn15_formule_grafiek", "Formule bij een grafiek", G3, "Door (0, 2), per hokje 3 omhoog: y = 3x + 2", "startgetal op de y-as",
    "Het startgetal lees je af waar de lijn de y-as snijdt. De rc: ga één hokje naar rechts en kijk hoeveel de lijn omhoog of omlaag gaat.",
    "Snijpunt y-as bij 2, per stap 3 omhoog?\nrc 3, startgetal 2.\nAntwoord: y = 3x + 2.", 8],
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
  ["fn20_snijpunt_lijnen", "Snijpunt van twee lijnen", G4, "y = 2x + 1 en y = " + MIN + "x + 7: (2, 5)", "gelijkstellen",
    "Stel de formules gelijk en los x op; vul x in voor y. Controleer in de tekening: daar kruisen de lijnen elkaar.",
    "2x + 1 = " + MIN + "x + 7?\n3x = 6, x = 2, y = 5.\nAntwoord: x = 2, y = 5.", 8],
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
  ["fn27_parabool_grafiek", "Parabool bij een grafiek", G5, "Dal met top (2, " + MIN + "1): y = (x " + MIN + " 2)" + SQ + " " + MIN + " 1", "vorm en top",
    "Dal of berg geeft het teken van a. Lees de top (p, q) af en vul in: y = a(x " + MIN + " p)" + SQ + " + q. Let op het teken van p.",
    "Dalparabool, top (2, " + MIN + "1)?\na = 1.\nAntwoord: y = (x " + MIN + " 2)" + SQ + " " + MIN + " 1.", 8],
  ["fn28_groeifactor_procent", "Groeifactor uit een procent", G6, "5% groei: 1,05; 20% afname: 0,8", "100% plus of min",
    "Bij groei komt het procent bij de 100%, bij afname gaat het eraf. Deel door 100: 105% is 1,05 en 80% is 0,8.",
    "Afname van 20%?\n100% " + MIN + " 20% = 80%.\nAntwoord: 0,8.", 8, 2],
  ["fn29_waarde_na_stappen", "Waarde na n stappen", G6, "200, factor 1,5, 2 stappen: 450", "elke stap keer de groeifactor",
    "Vermenigvuldig de startwaarde net zo vaak met de groeifactor als er stappen zijn. Niet erbij optellen en niet keer het aantal stappen.",
    "Start 200, factor 1,5, 2 stappen?\n200 " + DOT + " 1,5 " + DOT + " 1,5.\nAntwoord: 450.", 8],
  ["fn30_groeifactor_tabel", "Groeifactor uit een tabel", G6, "100, 125, 156,25: factor 1,25", "nieuw : oud",
    "Deel een waarde door de waarde ervoor. Komt er elke stap hetzelfde uit, dan is dat de groeifactor. Niet het verschil nemen.",
    "x: 0, 1, 2; y: 64, 80, 100?\n80 : 64 = 1,25.\nAntwoord: 1,25.", 8],
  ["fn31_lineair_exponentieel", "Lineair of exponentieel", G6, "Steeds +3: lineair; steeds " + DOT + "2: exponentieel", "verschillen of quotiënten",
    "Bereken de verschillen: gelijk is lineair. Anders de quotiënten: gelijk is exponentieel. Zijn de verschillen van de verschillen gelijk: kwadratisch. Is x " + DOT + " y steeds gelijk: omgekeerd evenredig.",
    "y: 3, 6, 12, 24?\nSteeds keer 2.\nAntwoord: exponentieel.", 8, 4],
  ["fn32_verdubbelen_halveren", "Verdubbelen en halveren", G6, "Elke 3 uur verdubbelen, na 12 uur: 16 keer", "eerst het aantal stappen",
    "Reken eerst uit hoeveel keer het verdubbelt of halveert: de tijd gedeeld door de tijd per stap. Vermenigvuldig dan zo vaak met 2 (of deel zo vaak door 2).",
    "Elke 3 uur verdubbelen, 12 uur?\n12 : 3 = 4 stappen; 2 " + DOT + " 2 " + DOT + " 2 " + DOT + " 2.\nAntwoord: 16 keer.", 8, 2],
  ["fn33_omgekeerd_evenredig", "Omgekeerd evenredig", G7, "4 werkers 6 dagen, 3 werkers: 8 dagen", "het product blijft gelijk",
    "Reken het product uit (werkers keer dagen): dat blijft gelijk. Deel het door het nieuwe aantal. Minder werkers is meer dagen.",
    "4 werkers 6 dagen, 3 werkers?\n4 " + DOT + " 6 = 24; 24 : 3.\nAntwoord: 8.", 8],
  ["fn34_grafiek_herkennen", "Grafiek herkennen", G7, "Hyperbool door P (2, 3): y = 6 : x", "vorm en een punt",
    "Herken eerst de vorm: lijn, parabool, exponentieel of hyperbool. Vul daarna P in om te kiezen tussen de formules van die vorm.",
    "Hyperbool door P (2, 3)?\n2 " + DOT + " 3 = 6.\nAntwoord: y = 6 : x.", 8, 4],
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
// "x = … of x = …" (paar "of"). fn12 en fn13: een halve rc zet per vraag het kommavak (rcInvoer). Kiezen: kwadrant
// (fn02), stijgend of dalend (fn04), functie of niet (fn05), formules (fn14, fn15, fn16, fn27, fn34), evenwijdig (fn21),
// dal of berg (fn22), soort verband (fn31) en fout spotten (fn35).
var GETAL_NEG = { fn03: 1, fn06: 1, fn07: 1, fn09: 1, fn10: 1, fn11: 1, fn12: 1, fn13: 1 };
var GETAL     = { fn29: 1, fn32: 1, fn33: 1, fn36: 1 };
var LETTER_X  = { fn08: 1, fn23: 1 };
var KOMMA     = { fn17: 1, fn28: 1, fn30: 1 };
var PUNT      = { fn01: 1, fn18: 1, fn19: 1, fn20: 1, fn24: 1, fn25: 1 };
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
