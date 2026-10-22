// Onderdeel Aftrekken: skills, volgorde en aftrek-specifieke generatoren.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Vraagverloop:
// - Alle aanroepen van generate() in hetzelfde synchrone rekenmoment tellen als één getoonde vraag.
//   Dat dekt de herkansing in PracticeScreen.generateNext en de dubbele start in React StrictMode.
// - Geschiedenis per skill: geen herhaling binnen de laatste 10 getoonde vragen. Bij skills met
//   minder mogelijke sommen: zo lang mogelijk geen herhaling (de generator stopt altijd).
// - a37: geschudde ronde langs blok 1-10, binnen elk blok een geschudde ronde langs de skills.
//   Deze garantie geldt voor normale vraagovergangen en herkansingen, niet als het oefenscherm
//   wordt verlaten terwijl de timer van 0,9 s na een goed antwoord nog loopt.

import { rnd, shuffle, wrongChoices } from "./helpers.js";

var MIN    = "−";
var SP_MIN = " − ";
var APPROX = "≈";

// ─────────────────────────────────────────────────────────────────
// VRAAGVERLOOP: rekenmoment, geschiedenis en subtypen
// ─────────────────────────────────────────────────────────────────

var tickId   = 0;
var tickOpen = false;

function currentTick() {
  if (!tickOpen) {
    tickOpen = true;
    tickId++;
    Promise.resolve().then(function() { tickOpen = false; });
  }
  return tickId;
}

// Een vraag wordt herkend aan vraagtekst + antwoord (ook bij fout spotten, waar de tekst vast is)
function qKey(q) {
  return q.question + "|" + String(q.answer);
}

var HIST_MAX  = 10;
var MAX_TRIES = 40;
var HISTORY   = {};
var SUBTYPE   = {};

// Subtypen wisselen per getoonde vraag (binnen hetzelfde moment blijft het subtype gelijk)
function pickSubtype(skillId, count, t) {
  var s = SUBTYPE[skillId];
  if (s && s.tick === t) return s.index;
  var index = s ? (s.index + 1) % count : rnd(0, count - 1);
  SUBTYPE[skillId] = { tick: t, index: index };
  return index;
}

function noRepeat(skillId, makeFn, subtypes) {
  return function() {
    var t        = currentTick();
    var sub      = subtypes ? pickSubtype(skillId, subtypes, t) : 0;
    var h        = HISTORY[skillId] || (HISTORY[skillId] = []);
    var sameTick = h.length > 0 && h[h.length - 1].tick === t;
    // Een eerdere vraag uit hetzelfde moment is weggegooid en telt niet als getoond
    var shown    = (sameTick ? h.slice(0, h.length - 1) : h).slice(-HIST_MAX);
    var best     = null;
    var bestIdx  = Infinity;
    for (var i = 0; i < MAX_TRIES; i++) {
      var q   = makeFn(sub);
      var k   = qKey(q);
      var idx = -1;
      for (var j = shown.length - 1; j >= 0; j--) {
        if (shown[j].key === k) { idx = j; break; }
      }
      if (idx === -1) { best = q; break; }
      if (idx < bestIdx) { bestIdx = idx; best = q; }
    }
    var entry = { tick: t, key: qKey(best) };
    if (sameTick) { h[h.length - 1] = entry; } else { h.push(entry); }
    // Eén plaats extra: een herkansing in hetzelfde moment moet nog met 10 getoonde vragen vergelijken
    if (h.length > HIST_MAX + 1) h.shift();
    return best;
  };
}

// ─────────────────────────────────────────────────────────────────
// VRAAG-HELPERS
// ─────────────────────────────────────────────────────────────────

// Vier unieke keuzes, nooit negatief; typische fouten (extras) gaan voor
function makeChoices(answer, extras) {
  var list = [answer];
  var seen = {};
  seen[String(answer)] = true;
  function add(x) {
    if (list.length < 4 && typeof x === "number" && x >= 0 && !seen[String(x)]) {
      seen[String(x)] = true;
      list.push(x);
    }
  }
  (extras || []).forEach(add);
  if (list.length < 4) wrongChoices(answer, 6, 0).forEach(add);
  var f = answer + 1;
  while (list.length < 4) { add(f); f++; }
  return shuffle(list);
}

function plainQ(terms, answer, extras) {
  return { terms: terms, question: terms.join(SP_MIN) + " =", answer: answer, choices: makeChoices(answer, extras) };
}

// Kolomsom: twee regels, PracticeScreen lijnt rechts uit en zet een streep eronder
function columnQ(a, b, extras) {
  return { terms: [a, b], question: a + "\n" + MIN + " " + b, answer: a - b, choices: makeChoices(a - b, extras) };
}

// Cijfers van rechts naar links: 402 -> [2, 0, 4]
function digitsOf(n) {
  var d = [];
  do { d.push(n % 10); n = Math.floor(n / 10); } while (n > 0);
  return d;
}

function hasZeroDigit(n) {
  return digitsOf(n).indexOf(0) !== -1;
}

function borrowCount(a, b) {
  var da = digitsOf(a);
  var db = digitsOf(b);
  var borrow = 0;
  var count  = 0;
  for (var i = 0; i < da.length; i++) {
    var x = da[i] - borrow - (db[i] || 0);
    if (x < 0) { count++; borrow = 1; } else { borrow = 0; }
  }
  return count;
}

// Typische fout "lenen vergeten": per kolom het kleinste cijfer van het grootste aftrekken
function noBorrowResult(a, b) {
  var da = digitsOf(a);
  var db = digitsOf(b);
  var r  = 0;
  var p  = 1;
  for (var i = 0; i < da.length; i++) {
    r += Math.abs(da[i] - (db[i] || 0)) * p;
    p *= 10;
  }
  return r;
}

function round10(n)  { return Math.round(n / 10) * 10; }
function round100(n) { return Math.round(n / 100) * 100; }

// Schatkeuzes: alleen veelvouden van step, allemaal groter dan 0
function estimateChoices(answer, step) {
  var opts = [answer - 2 * step, answer - step, answer + step, answer + 2 * step].filter(function(v) { return v > 0; });
  var extra = 3;
  while (opts.length < 3) { opts.push(answer + extra * step); extra++; }
  return shuffle([answer].concat(shuffle(opts).slice(0, 3)));
}

function randomWith(fn) {
  for (var i = 0; i < 500; i++) {
    var r = fn();
    if (r) return r;
  }
  return null;
}

// Fout spotten: vier unieke aftreksommen, precies één fout (vaak de typische lenen-fout van 10)
function makeAftrekFout() {
  var used = {};
  var sums = [];
  while (sums.length < 4) {
    var a = rnd(31, 99);
    var b = rnd(12, a - 10);
    var k = a + "_" + b;
    if (used[k]) continue;
    used[k] = true;
    sums.push([a, b]);
  }
  var w        = sums[0];
  var correct0 = w[0] - w[1];
  var offsets  = [10, -10, 10, 1, -1, 2].filter(function(o) { return correct0 + o >= 0; });
  var wrongVal = correct0 + offsets[rnd(0, offsets.length - 1)];
  var wrongStr = w[0] + SP_MIN + w[1] + " = " + wrongVal;
  var others   = sums.slice(1).map(function(p) { return p[0] + SP_MIN + p[1] + " = " + (p[0] - p[1]); });
  return {
    question:       "Welke aftreksom is FOUT?",
    answer:         wrongStr,
    choices:        shuffle([wrongStr].concat(others)),
    isErrorSpotter: true,
  };
}

// ─────────────────────────────────────────────────────────────────
// SKILL DEFINITIONS
// ─────────────────────────────────────────────────────────────────

var G1  = "Tot 20";
var G2  = "Tientallen";
var G3  = "Tot 100 zonder overschrijding";
var G4  = "Tot 100 met overschrijding";
var G5  = "Meerdere aftrekkers";
var G6  = "Driecijferig uit het hoofd";
var G7  = "Kolomsgewijs";
var G8  = "Duizendtallen en grote getallen";
var G9  = "Schatten";
var G10 = "Omgekeerd en controleren";
var G11 = "Slot";

var BLOCK_GROUPS = [G1, G2, G3, G4, G5, G6, G7, G8, G9, G10];

var RAW_SKILLS = [

  // ── BLOK 1: TOT 20 ─────────────────────────────────────────────

  {
    id: "a01_tot_10",
    label: "Aftrekken tot 10",
    group: G1,
    desc: "7 − 3, terugtellen",
    strategy: "terugtellen",
    tip: function(t) { return "Begin bij " + t[0] + " en tel " + t[1] + " terug."; },
    uitleg: "Aftrekken is terugtellen. Bij 7 − 3 begin je bij 7 en tel je 3 stappen terug: 6, 5, 4. Haal je alles weg, zoals bij 6 − 6, dan blijft er 0 over.",
    voorbeeld: "7 − 3 = ?\nTel terug vanaf 7: 6, 5, 4.\nAntwoord: 4.",
    minCorrect: 8,
    make: function() {
      var a = rnd(2, 10);
      var b = rnd(1, a);
      return plainQ([a, b], a - b);
    },
  },

  {
    id: "a02_van_10",
    label: "Van 10 af",
    group: G1,
    desc: "10 − 4, splitsingen van 10",
    strategy: "splitsen",
    tip: function(t) { return "Welk getal hoort bij " + t[1] + " om samen 10 te maken?"; },
    uitleg: "Als je weet welke getallen samen 10 maken, kun je meteen van 10 aftrekken. 6 en 4 maken samen 10, dus 10 − 4 = 6.",
    voorbeeld: "10 − 3 = ?\n3 en 7 maken samen 10.\nAntwoord: 7.",
    minCorrect: 8,
    make: function() {
      var x = rnd(1, 9);
      return plainQ([10, x], 10 - x);
    },
  },

  {
    id: "a03_tot_20_zonder",
    label: "Tot 20, zonder tiental-overgang",
    group: G1,
    desc: "17 − 4, alleen de eenheden",
    strategy: "eenheden",
    tip: function(t) { var e = t[0] % 10; return "Kijk alleen naar de eenheden: " + e + SP_MIN + t[1] + " = " + (e - t[1]) + ". Het tiental blijft staan."; },
    uitleg: "Als de eenheden groot genoeg zijn, hoef je het tiental niet aan te raken. Bij 17 − 4 reken je 7 − 4 = 3, en het tiental blijft: 13.",
    voorbeeld: "18 − 5 = ?\n8 − 5 = 3, het tiental blijft.\nAntwoord: 13.",
    minCorrect: 10,
    make: function() {
      var u = rnd(2, 9);
      var b = rnd(1, u - 1);
      return plainQ([10 + u, b], 10 + u - b);
    },
  },

  {
    id: "a04_naar_tiental",
    label: "Naar het tiental",
    group: G1,
    desc: "17 − 7 = 10, 17 − 10 = 7",
    strategy: "patroon",
    tip: function(t) { return t[1] === 10 ? "Haal het tiental weg: alleen de eenheden blijven over." : "Haal alle eenheden weg: je komt precies op 10."; },
    uitleg: "Een getal tussen 10 en 20 bestaat uit een tiental en eenheden. Haal je de eenheden weg (17 − 7), dan blijft 10 over. Haal je het tiental weg (17 − 10), dan blijven de eenheden over.",
    voorbeeld: "14 − 4 = 10\n14 − 10 = 4",
    minCorrect: 8,
    make: function() {
      var u = rnd(1, 9);
      var b = rnd(0, 1) === 0 ? u : 10;
      return plainQ([10 + u, b], 10 + u - b);
    },
  },

  {
    id: "a05_tot_20_met",
    label: "Tot 20, over het tiental",
    group: G1,
    desc: "13 − 5 via 10",
    strategy: "via tien",
    tip: function(t) { var e = t[0] % 10; return "Eerst naar 10: " + t[0] + SP_MIN + e + " = 10. Dan nog " + (t[1] - e) + " eraf: " + (10 - (t[1] - e)) + "."; },
    uitleg: "Moet je over het tiental heen, splits dan de aftrekker. Bij 13 − 5 haal je eerst 3 weg (dan ben je bij 10) en daarna nog 2: 8.",
    voorbeeld: "14 − 6 = ?\n14 − 4 = 10, dan nog 2 eraf.\nAntwoord: 8.",
    minCorrect: 12,
    subtypes: 3,
    // Subtypen: aftrektal 11-12, 13-14, 15-18 (elk 10 sommen). Uitkomst 5-9 (kleinere verschillen zijn a06)
    make: function(sub) {
      var ranges = [[11, 12], [13, 14], [15, 18]];
      var r = ranges[sub];
      return randomWith(function() {
        var a = rnd(r[0], r[1]);
        var u = a % 10;
        var b = rnd(u + 1, 9);
        var d = a - b;
        if (d < 5 || d > 9) return null;
        // Typische fout: in de verkeerde richting rekenen (13 - 5 -> 5 - 3 = 2 -> 12)
        return plainQ([a, b], d, [10 + (b - u)]);
      });
    },
  },

  {
    id: "a06_aanvullen_klein",
    label: "Aanvullen bij kleine verschillen",
    group: G1,
    desc: "13 − 9: van 9 naar 13",
    strategy: "aanvullen",
    tip: function(t) { return "Liggen de getallen dicht bij elkaar? Tel op van " + t[1] + " naar " + t[0] + "."; },
    uitleg: "Als de twee getallen dicht bij elkaar liggen, is optellen vaak sneller dan terugtellen. Bij 13 − 9 denk je: van 9 naar 13 is 4 stappen.",
    voorbeeld: "15 − 12 = ?\nVan 12 naar 15 is 3.\nAntwoord: 3.",
    minCorrect: 10,
    make: function() {
      if (rnd(0, 1) === 0) {
        // Over het tiental: 13 - 9 (verschil 1 kan niet over het tiental)
        var d = rnd(2, 4);
        var b = rnd(Math.max(6, 11 - d), 9);
        return plainQ([b + d, b], d);
      }
      // Beide boven de 10: 15 - 12
      var a  = rnd(12, 19);
      var d2 = rnd(1, Math.min(4, a - 11));
      return plainQ([a, a - d2], d2);
    },
  },

  // ── BLOK 2: TIENTALLEN ─────────────────────────────────────────

  {
    id: "a07_ronde_tientallen",
    label: "Ronde tientallen",
    group: G2,
    desc: "80 − 30",
    strategy: "patroon",
    tip: function(t) { return "Reken met tientallen: " + (t[0] / 10) + SP_MIN + (t[1] / 10) + " = " + ((t[0] - t[1]) / 10) + ", dus " + (t[0] - t[1]) + "."; },
    uitleg: "Ronde tientallen aftrekken is net zo makkelijk als kleine sommen: 80 − 30 is 8 − 3 tientallen, dus 5 tientallen = 50.",
    voorbeeld: "90 − 40 = ?\n9 − 4 = 5, dus 50.",
    minCorrect: 8,
    make: function() {
      var ta = rnd(2, 9);
      var tb = rnd(1, ta - 1);
      return plainQ([ta * 10, tb * 10], (ta - tb) * 10);
    },
  },

  {
    id: "a08_min_tiental",
    label: "Min een tiental",
    group: G2,
    desc: "74 − 30, alleen de tientallen",
    strategy: "tientallen",
    tip: function(t) { var ta = Math.floor(t[0] / 10); var tb = t[1] / 10; return "Alleen de tientallen veranderen: " + ta + SP_MIN + tb + " = " + (ta - tb) + ". De eenheden blijven " + (t[0] % 10) + "."; },
    uitleg: "Trek je een rond tiental af, dan veranderen alleen de tientallen. Bij 74 − 30 wordt de 7 een 4, en de 4 eenheden blijven staan: 44.",
    voorbeeld: "86 − 50 = ?\n8 − 5 = 3 tientallen, de 6 blijft.\nAntwoord: 36.",
    minCorrect: 10,
    make: function() {
      var ta = rnd(2, 9);
      var u  = rnd(1, 9);
      var tb = rnd(1, ta - 1);
      var a  = ta * 10 + u;
      return plainQ([a, tb * 10], a - tb * 10);
    },
  },

  // ── BLOK 3: TOT 100 ZONDER OVERSCHRIJDING ──────────────────────

  {
    id: "a09_tot_100_min_een",
    label: "Tweecijferig min eencijferig",
    group: G3,
    desc: "47 − 5",
    strategy: "eenheden",
    tip: function(t) { var e = t[0] % 10; return "Alleen de eenheden: " + e + SP_MIN + t[1] + " = " + (e - t[1]) + ". Het tiental blijft staan."; },
    uitleg: "Zijn de eenheden groot genoeg, dan blijft het tiental gewoon staan. Bij 47 − 5 reken je 7 − 5 = 2, dus 42.",
    voorbeeld: "68 − 3 = ?\n8 − 3 = 5, de 60 blijft.\nAntwoord: 65.",
    minCorrect: 10,
    make: function() {
      var ta = rnd(2, 9);
      var u  = rnd(2, 9);
      var b  = rnd(1, u - 1);
      var a  = ta * 10 + u;
      return plainQ([a, b], a - b);
    },
  },

  {
    id: "a10_tot_100_zonder",
    label: "Tweecijferig, zonder overschrijding",
    group: G3,
    desc: "78 − 34, splitsen",
    strategy: "splitsen",
    tip: function(t) { var tb = Math.floor(t[1] / 10) * 10; var eb = t[1] % 10; return "Eerst de tientallen: " + t[0] + SP_MIN + tb + " = " + (t[0] - tb) + ". Dan de eenheden: " + (t[0] - tb) + SP_MIN + eb + " = " + (t[0] - t[1]) + "."; },
    uitleg: "Splits de aftrekker in tientallen en eenheden. Bij 78 − 34 haal je eerst 30 weg (48) en daarna 4 (44).",
    voorbeeld: "65 − 23 = ?\n65 − 20 = 45, 45 − 3 = 42.\nAntwoord: 42.",
    minCorrect: 10,
    make: function() {
      var ta = rnd(2, 9);
      var ua = rnd(2, 9);
      var tb = rnd(1, ta - 1);
      var ub = rnd(1, ua - 1);
      var a  = ta * 10 + ua;
      var b  = tb * 10 + ub;
      return plainQ([a, b], a - b);
    },
  },

  // ── BLOK 4: TOT 100 MET OVERSCHRIJDING EN STRATEGIEËN ──────────

  {
    id: "a11_min_een_met",
    label: "Min eencijferig, over het tiental",
    group: G4,
    desc: "43 − 7 via 40",
    strategy: "via tiental",
    tip: function(t) {
      var e = t[0] % 10;
      if (e === 0) return "Ga terug naar het vorige tiental: " + t[0] + SP_MIN + t[1] + " = " + (t[0] - t[1]) + ".";
      return "Eerst naar het tiental: " + t[0] + SP_MIN + e + " = " + (t[0] - e) + ". Dan nog " + (t[1] - e) + " eraf.";
    },
    uitleg: "Zijn de eenheden te klein, ga dan eerst naar het ronde tiental. Bij 43 − 7: eerst 3 eraf (40), dan nog 4 (36).",
    voorbeeld: "52 − 8 = ?\n52 − 2 = 50, 50 − 6 = 44.\nAntwoord: 44.",
    minCorrect: 10,
    make: function() {
      var ta = rnd(2, 9);
      var ua = rnd(0, 8);
      var b  = rnd(ua + 1, 9);
      var a  = ta * 10 + ua;
      return plainQ([a, b], a - b, [a - b + 10]);
    },
  },

  {
    id: "a12_tot_100_met",
    label: "Tweecijferig, over het tiental",
    group: G4,
    desc: "72 − 38, rijgen",
    strategy: "rijgen",
    tip: function(t) { var tb = Math.floor(t[1] / 10) * 10; var eb = t[1] % 10; return "Rijgen: " + t[0] + SP_MIN + tb + " = " + (t[0] - tb) + ", dan " + (t[0] - tb) + SP_MIN + eb + " = " + (t[0] - t[1]) + "."; },
    uitleg: "Haal eerst de tientallen weg en dan de eenheden. Bij 72 − 38: 72 − 30 = 42, dan 42 − 8 = 34. Let op: bij de eenheden ga je door het tiental heen.",
    voorbeeld: "64 − 27 = ?\n64 − 20 = 44, 44 − 7 = 37.\nAntwoord: 37.",
    minCorrect: 12,
    subtypes: 3,
    // Subtypen: gewoon lenen (72 - 38), rond aftrektal (70 - 38), uitkomst onder 10 (52 - 47)
    make: function(sub) {
      var ta, ua, tb, ub;
      if (sub === 0) {
        ta = rnd(3, 9); ua = rnd(1, 8); ub = rnd(ua + 1, 9); tb = rnd(1, ta - 2);
      } else if (sub === 1) {
        ta = rnd(3, 9); ua = 0; ub = rnd(1, 9); tb = rnd(1, ta - 2);
      } else {
        ta = rnd(2, 9); tb = ta - 1; ua = rnd(0, 8); ub = rnd(ua + 1, 9);
      }
      var a = ta * 10 + ua;
      var b = tb * 10 + ub;
      return plainQ([a, b], a - b, [noBorrowResult(a, b), a - b + 10]);
    },
  },

  {
    id: "a13_compenseren",
    label: "Compenseren",
    group: G4,
    desc: "72 − 29 = 72 − 30 + 1",
    strategy: "compenseren",
    tip: function(t) { var r = Math.ceil(t[1] / 10) * 10; var d = r - t[1]; return "Trek " + r + " af in plaats van " + t[1] + ": " + t[0] + SP_MIN + r + " = " + (t[0] - r) + ". Je hebt " + d + " te veel weggehaald, dus tel " + d + " erbij."; },
    uitleg: "Eindigt de aftrekker op 8 of 9, rond hem dan af naar boven. Bij 72 − 29 trek je 30 af (42) en tel je die ene te veel weer op: 43.",
    voorbeeld: "65 − 38 = ?\n65 − 40 = 25, plus 2 terug.\nAntwoord: 27.",
    minCorrect: 10,
    make: function() {
      return randomWith(function() {
        var a = rnd(41, 99);
        var d = rnd(1, 2);
        var b = rnd(2, 9) * 10 - d;
        if (a - b < 10) return null;
        // Typische fouten: niet terugtellen (a - r) of de verkeerde kant op (a - r - d)
        return plainQ([a, b], a - b, [a - b - d, a - b - 2 * d]);
      });
    },
  },

  {
    id: "a14_verschil_aanvullen",
    label: "Verschil door aanvullen",
    group: G4,
    desc: "82 − 78: van 78 naar 82",
    strategy: "aanvullen",
    tip: function(t) { var r = Math.ceil(t[1] / 10) * 10; return "Tel op van " + t[1] + " naar " + r + " (" + (r - t[1]) + ") en dan naar " + t[0] + " (" + (t[0] - r) + ")."; },
    uitleg: "Liggen twee getallen dicht bij elkaar, tel dan op in plaats van af te trekken. Bij 82 − 78: van 78 naar 80 is 2, van 80 naar 82 is 2, samen 4.",
    voorbeeld: "61 − 57 = ?\n57 naar 60 is 3, 60 naar 61 is 1.\nAntwoord: 4.",
    minCorrect: 10,
    make: function() {
      return randomWith(function() {
        var a = rnd(31, 99);
        var d = rnd(2, 7);
        if (a % 10 >= d) return null;
        return plainQ([a, a - d], d);
      });
    },
  },

  {
    id: "a15_van_100",
    label: "Van 100 af",
    group: G4,
    desc: "100 − 37, honderdvrienden",
    strategy: "aanvullen",
    tip: function(t) { return "Welk getal hoort bij " + t[1] + " om samen 100 te maken? Vul eerst aan tot het tiental, dan tot 100."; },
    uitleg: "Getallen die samen 100 maken heten honderdvrienden. Bij 100 − 37: van 37 naar 40 is 3, van 40 naar 100 is 60, samen 63.",
    voorbeeld: "100 − 64 = ?\n64 naar 70 is 6, 70 naar 100 is 30.\nAntwoord: 36.",
    minCorrect: 10,
    make: function() {
      var b = randomWith(function() { var x = rnd(11, 89); return x % 10 !== 0 ? x : null; });
      // Typische fout: beide cijfers aanvullen tot 10 (100 - 37 -> 73)
      var wrong = (10 - Math.floor(b / 10)) * 10 + (10 - b % 10);
      return plainQ([100, b], 100 - b, [wrong, 100 - b - 10]);
    },
  },

  // ── BLOK 5: MEERDERE AFTREKKERS ────────────────────────────────

  {
    id: "a16_rijgen",
    label: "Twee keer aftrekken",
    group: G5,
    desc: "45 − 12 − 3, op volgorde",
    strategy: "rijgen",
    tip: function(t) { return "Werk van links naar rechts: eerst " + t[0] + SP_MIN + t[1] + " = " + (t[0] - t[1]) + ", dan nog " + t[2] + " eraf."; },
    uitleg: "Bij twee aftrekkers reken je gewoon stap voor stap. Bij 45 − 12 − 3: 45 − 12 = 33, dan 33 − 3 = 30.",
    voorbeeld: "58 − 21 − 4 = ?\n58 − 21 = 37, 37 − 4 = 33.\nAntwoord: 33.",
    minCorrect: 10,
    make: function() {
      return randomWith(function() {
        var a  = rnd(30, 99);
        var b1 = rnd(11, a - 15);
        var b2 = rnd(2, 9);
        if ((b1 + b2) % 10 === 0) return null;
        if (a - b1 - b2 < 5) return null;
        return plainQ([a, b1, b2], a - b1 - b2);
      });
    },
  },

  {
    id: "a17_slim_groeperen",
    label: "Slim groeperen",
    group: G5,
    desc: "64 − 18 − 16: eerst 18 + 16",
    strategy: "groeperen",
    tip: function(t) { return "Tel eerst de aftrekkers op: " + t[1] + " + " + t[2] + " = " + (t[1] + t[2]) + ". Trek dat in één keer af."; },
    uitleg: "Vormen de aftrekkers samen een rond getal, tel ze dan eerst op. Bij 64 − 18 − 16 is 18 + 16 = 34, dus 64 − 34 = 30.",
    voorbeeld: "75 − 27 − 13 = ?\n27 + 13 = 40, 75 − 40 = 35.\nAntwoord: 35.",
    minCorrect: 10,
    make: function() {
      return randomWith(function() {
        var T  = rnd(2, 6) * 10;
        var b1 = rnd(11, T - 11);
        var a  = rnd(T + 5, 99);
        if (b1 % 10 === 0 || a % 10 === 0) return null;
        return plainQ([a, b1, T - b1], a - T);
      });
    },
  },

  {
    id: "a18_drie_aftrekkers",
    label: "Drie keer aftrekken",
    group: G5,
    desc: "100 − 25 − 15 − 10",
    strategy: "groeperen",
    tip: "Zoek aftrekkers die samen een rond getal maken, of werk stap voor stap van links naar rechts.",
    uitleg: "Bij drie aftrekkers kun je ze eerst bij elkaar optellen en dan één keer aftrekken. Bij 100 − 25 − 15 − 10: 25 + 15 + 10 = 50, dus 100 − 50 = 50.",
    voorbeeld: "90 − 12 − 8 − 20 = ?\n12 + 8 + 20 = 40, 90 − 40 = 50.\nAntwoord: 50.",
    minCorrect: 10,
    make: function() {
      return randomWith(function() {
        var a  = rnd(60, 100);
        var b1 = rnd(5, 30);
        var b2 = rnd(5, 25);
        var b3 = rnd(5, 20);
        if (a - b1 - b2 - b3 < 5) return null;
        return plainQ([a, b1, b2, b3], a - b1 - b2 - b3);
      });
    },
  },

  // ── BLOK 6: DRIECIJFERIG UIT HET HOOFD ─────────────────────────

  {
    id: "a19_ronde_honderdtallen",
    label: "Ronde honderdtallen",
    group: G6,
    desc: "700 − 300",
    strategy: "patroon",
    tip: function(t) { return (t[0] / 100) + SP_MIN + (t[1] / 100) + " = " + ((t[0] - t[1]) / 100) + ", dus " + (t[0] - t[1]) + "."; },
    uitleg: "Ronde honderdtallen aftrekken gaat net als kleine sommen: 700 − 300 is 7 − 3 honderd, dus 400.",
    voorbeeld: "900 − 500 = ?\n9 − 5 = 4, dus 400.",
    minCorrect: 8,
    make: function() {
      var ha = rnd(2, 9);
      var hb = rnd(1, ha - 1);
      return plainQ([ha * 100, hb * 100], (ha - hb) * 100);
    },
  },

  {
    id: "a20_door_honderd",
    label: "Terug door het honderdtal",
    group: G6,
    desc: "132 − 45 via 100",
    strategy: "via honderd",
    tip: function(t) { var d = t[0] - 100; return "Eerst terug naar 100: " + t[0] + SP_MIN + d + " = 100. Dan nog " + (t[1] - d) + " eraf: " + (100 - (t[1] - d)) + "."; },
    uitleg: "Kom je onder de 100 uit, ga dan eerst terug naar 100. Bij 132 − 45: eerst 32 eraf (100), dan nog 13 (87).",
    voorbeeld: "124 − 38 = ?\n124 − 24 = 100, 100 − 14 = 86.\nAntwoord: 86.",
    minCorrect: 10,
    make: function() {
      var a = rnd(101, 189);
      var b = rnd(Math.max(11, a - 99), Math.min(99, a - 10));
      return plainQ([a, b], a - b, [a - b + 10, a - b + 100]);
    },
  },

  {
    id: "a21_drie_min_twee_zonder",
    label: "Driecijferig min tweecijferig",
    group: G6,
    desc: "486 − 53, zonder overschrijding",
    strategy: "splitsen",
    tip: function(t) { var tb = Math.floor(t[1] / 10) * 10; var eb = t[1] % 10; return "Eerst " + tb + " eraf, dan " + eb + ". Het honderdtal blijft staan."; },
    uitleg: "Zijn de tientallen en eenheden groot genoeg, dan verandert het honderdtal niet. Bij 486 − 53: 486 − 50 = 436, dan 436 − 3 = 433.",
    voorbeeld: "758 − 24 = ?\n758 − 20 = 738, 738 − 4 = 734.\nAntwoord: 734.",
    minCorrect: 10,
    make: function() {
      var h  = rnd(2, 9);
      var t  = rnd(1, 9);
      var u  = rnd(2, 9);
      var tb = rnd(1, t);
      var ub = rnd(1, u - 1);
      var a  = h * 100 + t * 10 + u;
      var b  = tb * 10 + ub;
      return plainQ([a, b], a - b);
    },
  },

  {
    id: "a22_drie_min_twee_met",
    label: "Driecijferig min tweecijferig, met lenen",
    group: G6,
    desc: "352 − 27, 431 − 56",
    strategy: "rijgen",
    tip: function(t) { var tb = Math.floor(t[1] / 10) * 10; var eb = t[1] % 10; return "Rijgen: " + t[0] + SP_MIN + tb + " = " + (t[0] - tb) + ", dan " + (t[0] - tb) + SP_MIN + eb + " = " + (t[0] - t[1]) + "."; },
    uitleg: "Haal eerst de tientallen weg en dan de eenheden. Bij 352 − 27: 352 − 20 = 332, dan 332 − 7 = 325 (door het tiental heen).",
    voorbeeld: "431 − 56 = ?\n431 − 50 = 381, 381 − 6 = 375.\nAntwoord: 375.",
    minCorrect: 10,
    make: function() {
      return randomWith(function() {
        var a = rnd(200, 999);
        var b = rnd(12, 99);
        if (b % 10 === 0 || borrowCount(a, b) < 1 || a - b < 100) return null;
        return plainQ([a, b], a - b, [noBorrowResult(a, b), a - b + 10]);
      });
    },
  },

  // ── BLOK 7: KOLOMSGEWIJS, DE BASIS ─────────────────────────────

  {
    id: "a23_kolom_intro",
    label: "Kolomsgewijs, tweecijferig",
    group: G7,
    desc: "72 − 38 onder elkaar, lenen",
    strategy: "kolomsgewijs",
    tip: "Begin rechts bij de eenheden. Is het bovenste cijfer te klein? Leen 1 tiental van links.",
    uitleg: "Zet de getallen onder elkaar, eenheden onder eenheden. Begin rechts. Is het bovenste cijfer kleiner dan het onderste, leen dan 1 tiental: de eenheden worden 10 groter en het tiental links wordt 1 kleiner.",
    voorbeeld: "72\n− 38\nEenheden: 2 − 8 kan niet, leen 1: 12 − 8 = 4.\nTientallen: 6 − 3 = 3.\nAntwoord: 34.",
    minCorrect: 10,
    make: function() {
      var ta = rnd(3, 9);
      var ua = rnd(0, 8);
      var ub = rnd(ua + 1, 9);
      var tb = rnd(1, ta - 2);
      var a  = ta * 10 + ua;
      var b  = tb * 10 + ub;
      return columnQ(a, b, [noBorrowResult(a, b), a - b + 10]);
    },
  },

  {
    id: "a24_kolom_3x3_een_keer",
    label: "Kolomsgewijs, één keer lenen",
    group: G7,
    desc: "563 − 238",
    strategy: "kolomsgewijs",
    tip: "Werk van rechts naar links. Na het lenen is het cijfer links 1 kleiner.",
    uitleg: "Bij driecijferige getallen werk je kolom voor kolom van rechts naar links. Bij deze sommen hoef je maar één keer te lenen.",
    voorbeeld: "563\n− 238\nEenheden: 3 − 8 kan niet, leen: 13 − 8 = 5.\nTientallen: 5 − 3 = 2.\nHonderdtallen: 5 − 2 = 3.\nAntwoord: 325.",
    minCorrect: 10,
    make: function() {
      return randomWith(function() {
        var a = rnd(300, 999);
        var b = rnd(101, a - 100);
        if (hasZeroDigit(a) || borrowCount(a, b) !== 1) return null;
        return columnQ(a, b, [noBorrowResult(a, b), a - b + 10, a - b + 100]);
      });
    },
  },

  {
    id: "a25_kolom_3x3_twee_keer",
    label: "Kolomsgewijs, twee keer lenen",
    group: G7,
    desc: "524 − 258",
    strategy: "kolomsgewijs",
    tip: "Let op: na het lenen is het cijfer links 1 kleiner. Soms moet je daarna opnieuw lenen.",
    uitleg: "Soms moet je in twee kolommen lenen. Na de eerste keer is het tiental 1 kleiner geworden; is het daarna nog te klein, leen dan ook bij de honderdtallen.",
    voorbeeld: "524\n− 258\nEenheden: 14 − 8 = 6 (geleend).\nTientallen: 1 − 5 kan niet, leen: 11 − 5 = 6.\nHonderdtallen: 4 − 2 = 2.\nAntwoord: 266.",
    minCorrect: 12,
    subtypes: 3,
    // Subtypen: gewoon twee keer lenen, tiental 1 dat 0 wordt (513 - 248), uitkomst onder 100
    make: function(sub) {
      return randomWith(function() {
        var a = rnd(200, 999);
        var b = rnd(101, a - 1);
        var r = a - b;
        if (hasZeroDigit(a) || borrowCount(a, b) !== 2) return null;
        if (sub === 0 && r < 100) return null;
        if (sub === 1 && (Math.floor(a / 10) % 10 !== 1 || r < 100)) return null;
        if (sub === 2 && (r >= 100 || r < 10)) return null;
        return columnQ(a, b, [noBorrowResult(a, b), r + 10, r + 100]);
      });
    },
  },

  {
    id: "a26_kolom_een_nul",
    label: "Kolomsgewijs, lenen over een nul",
    group: G7,
    desc: "402 − 167",
    strategy: "kolomsgewijs",
    tip: "Staat er een 0 waar je wilt lenen? Leen dan eerst bij het cijfer daarnaast: de 0 wordt 10, en na het lenen 9.",
    uitleg: "Bij 402 − 167 kun je niet lenen bij de 0. Leen daarom bij de 4: die wordt 3 en de 0 wordt 10. Leen daarna 1 van die 10: die wordt 9 en de 2 wordt 12.",
    voorbeeld: "402\n− 167\n12 − 7 = 5, 9 − 6 = 3, 3 − 1 = 2.\nAntwoord: 235.",
    minCorrect: 10,
    make: function() {
      var h  = rnd(3, 9);
      var u  = rnd(1, 8);
      var hb = rnd(1, h - 2);
      var tb = rnd(1, 9);
      var ub = rnd(u + 1, 9);
      var a  = h * 100 + u;
      var b  = hb * 100 + tb * 10 + ub;
      return columnQ(a, b, [noBorrowResult(a, b), a - b + 10, a - b + 100]);
    },
  },

  // ── BLOK 8: DUIZENDTALLEN EN GROTE GETALLEN ────────────────────

  {
    id: "a27_ronde_duizendtallen",
    label: "Ronde duizendtallen",
    group: G8,
    desc: "5000 − 2000",
    strategy: "patroon",
    tip: function(t) { return (t[0] / 1000) + SP_MIN + (t[1] / 1000) + " = " + ((t[0] - t[1]) / 1000) + ", dus " + (t[0] - t[1]) + "."; },
    uitleg: "Ronde duizendtallen aftrekken gaat net als kleine sommen: 5000 − 2000 is 5 − 2 duizend, dus 3000.",
    voorbeeld: "8000 − 3000 = ?\n8 − 3 = 5, dus 5000.",
    minCorrect: 8,
    make: function() {
      var da = rnd(2, 9);
      var db = rnd(1, da - 1);
      return plainQ([da * 1000, db * 1000], (da - db) * 1000);
    },
  },

  {
    id: "a28_kolom_vier_cijfers",
    label: "Kolomsgewijs, viercijferig",
    group: G8,
    desc: "5432 − 2789",
    strategy: "kolomsgewijs",
    tip: "Werk rustig van rechts naar links en houd bij waar je geleend hebt.",
    uitleg: "Ook bij vier cijfers werk je kolom voor kolom van rechts naar links. Leen waar nodig en vergeet niet dat het cijfer links daarna 1 kleiner is.",
    voorbeeld: "5432\n− 2789\n12 − 9 = 3, 12 − 8 = 4, 13 − 7 = 6, 4 − 2 = 2.\nAntwoord: 2643.",
    minCorrect: 10,
    make: function() {
      return randomWith(function() {
        var a = rnd(2000, 9999);
        var b = rnd(1000, a - 100);
        if (hasZeroDigit(a) || borrowCount(a, b) < 1) return null;
        return columnQ(a, b, [noBorrowResult(a, b), a - b + 10, a - b + 100]);
      });
    },
  },

  {
    id: "a29_meerdere_nullen",
    label: "Kolomsgewijs, lenen over meerdere nullen",
    group: G8,
    desc: "5000 − 1846, 3002 − 1457",
    strategy: "kolomsgewijs",
    tip: "Bij meerdere nullen leen je bij het eerste cijfer dat geen 0 is. De nullen daartussen worden 9.",
    uitleg: "Bij 5000 − 1846 leen je bij de 5: die wordt 4. De nullen ertussen worden 9 en de laatste 0 wordt 10. Daarna reken je gewoon kolom voor kolom.",
    voorbeeld: "5000\n− 1846\nWordt: 4, 9, 9, 10.\n10 − 6 = 4, 9 − 4 = 5, 9 − 8 = 1, 4 − 1 = 3.\nAntwoord: 3154.",
    minCorrect: 12,
    subtypes: 3,
    // Subtypen: X000 (5000 - 1846), X00U (3002 - 1457), XY00 (4300 - 1856)
    make: function(sub) {
      return randomWith(function() {
        var x = rnd(2, 9);
        var a;
        if (sub === 0) a = x * 1000;
        else if (sub === 1) a = x * 1000 + rnd(1, 8);
        else a = x * 1000 + rnd(1, 9) * 100;
        var b = rnd(1000, a - 100);
        if (b % 10 <= a % 10 && sub === 1) return null;
        if (b % 10 === 0 && sub !== 1) return null;
        if (borrowCount(a, b) < 2) return null;
        return columnQ(a, b, [noBorrowResult(a, b), a - b + 10, a - b + 100]);
      });
    },
  },

  {
    id: "a30_kolom_vijf_cijfers",
    label: "Kolomsgewijs, vijfcijferig",
    group: G8,
    desc: "12450 − 8376",
    strategy: "kolomsgewijs",
    tip: "Zet eenheden onder eenheden: het kortere getal schuift naar rechts.",
    uitleg: "Bij een groot getal min een kleiner getal zet je ze rechts uitgelijnd onder elkaar. Werk van rechts naar links en leen waar nodig.",
    voorbeeld: "12450\n− 8376\n10 − 6 = 4, 14 − 7 = 7, 3 − 3 = 0, 12 − 8 = 4.\nAntwoord: 4074.",
    minCorrect: 10,
    make: function() {
      return randomWith(function() {
        var a = rnd(10000, 19999);
        var b = rnd(1000, 9999);
        if (a - b < 1000 || borrowCount(a, b) < 1) return null;
        return columnQ(a, b, [noBorrowResult(a, b), a - b + 10, a - b + 1000]);
      });
    },
  },

  // ── BLOK 9: SCHATTEN ───────────────────────────────────────────

  {
    id: "a31_schatten_100",
    label: "Verschil schatten tot 100",
    group: G9,
    desc: "82 − 39 ≈ 80 − 40 = 40",
    strategy: "schatten",
    tip: function(t) { return "Rond af op tientallen: " + t[0] + " wordt " + round10(t[0]) + ", " + t[1] + " wordt " + round10(t[1]) + ". Trek die af."; },
    uitleg: "Bij schatten reken je niet precies. Rond elk getal af op het dichtstbijzijnde tiental (bij een 5 naar boven) en trek de ronde getallen af. Het antwoord is een benadering.",
    voorbeeld: "Schat: 82 − 39 ≈ ?\n80 − 40 = 40.\n(Precies is het 43.)",
    minCorrect: 8,
    make: function() {
      return randomWith(function() {
        var a = rnd(21, 99);
        var b = rnd(11, a - 1);
        if (a % 10 === 0 || b % 10 === 0 || a % 10 === b % 10) return null;
        var est = round10(a) - round10(b);
        if (est <= 0) return null;
        return { terms: [a, b], question: "Schat: " + a + SP_MIN + b + " " + APPROX + " ?", answer: est, choices: estimateChoices(est, 10) };
      });
    },
  },

  {
    id: "a32_schatten_1000",
    label: "Verschil schatten tot 1000",
    group: G9,
    desc: "612 − 289 ≈ 600 − 300 = 300",
    strategy: "schatten",
    tip: function(t) { return "Rond af op honderdtallen: " + t[0] + " wordt " + round100(t[0]) + ", " + t[1] + " wordt " + round100(t[1]) + ". Trek die af."; },
    uitleg: "Rond elk getal af op het dichtstbijzijnde honderdtal (bij 50 of meer naar boven) en trek de ronde getallen af. Zo weet je snel ongeveer hoe groot het verschil is.",
    voorbeeld: "Schat: 612 − 289 ≈ ?\n600 − 300 = 300.\n(Precies is het 323.)",
    minCorrect: 8,
    make: function() {
      return randomWith(function() {
        var a = rnd(201, 999);
        var b = rnd(101, a - 1);
        if (a % 100 === 0 || b % 100 === 0 || a % 100 === b % 100) return null;
        var est = round100(a) - round100(b);
        if (est <= 0) return null;
        return { terms: [a, b], question: "Schat: " + a + SP_MIN + b + " " + APPROX + " ?", answer: est, choices: estimateChoices(est, 100) };
      });
    },
  },

  // ── BLOK 10: OMGEKEERD EN CONTROLEREN ──────────────────────────

  {
    id: "a33_missend_aftrekker",
    label: "Wat gaat eraf?",
    group: G10,
    desc: "15 − ? = 8",
    strategy: "terugrekenen",
    tip: function(t) { return "Hoeveel moet je van " + t[0] + " afhalen om op " + t[1] + " te komen? Reken " + t[0] + SP_MIN + t[1] + "."; },
    uitleg: "Bij 15 − ? = 8 zoek je wat eraf is gegaan. Dat is het verschil tussen 15 en 8: 15 − 8 = 7. Controle: 15 − 7 = 8.",
    voorbeeld: "13 − ? = 6\n13 − 6 = 7.\nAntwoord: 7.",
    minCorrect: 10,
    make: function() {
      var a = rnd(11, 19);
      var x = rnd(2, 9);
      var c = a - x;
      return { terms: [a, c], question: a + SP_MIN + "? = " + c, answer: x, choices: makeChoices(x, [c]) };
    },
  },

  {
    id: "a34_missend_aftrektal",
    label: "Waar begon je?",
    group: G10,
    desc: "? − 7 = 9",
    strategy: "terugrekenen",
    tip: function(t) { return "Tel terug op: " + t[1] + " + " + t[0] + " = " + (t[0] + t[1]) + "."; },
    uitleg: "Bij ? − 7 = 9 zoek je het getal waarmee je begon. Tel de twee getallen op: 9 + 7 = 16. Controle: 16 − 7 = 9.",
    voorbeeld: "? − 5 = 8\n8 + 5 = 13.\nAntwoord: 13.",
    minCorrect: 10,
    make: function() {
      var b = rnd(2, 9);
      var c = rnd(2, 9);
      // Typische fout: aftrekken in plaats van optellen
      return { terms: [b, c], question: "?" + SP_MIN + b + " = " + c, answer: b + c, choices: makeChoices(b + c, [Math.abs(c - b)]) };
    },
  },

  {
    id: "a35_missend_groot",
    label: "Missende term, groot",
    group: G10,
    desc: "83 − ? = 47, 600 − ? = 245",
    strategy: "aanvullen",
    tip: function(t) { return "Reken " + t[0] + SP_MIN + t[1] + ", of tel op van " + t[1] + " naar " + t[0] + "."; },
    uitleg: "Bij 83 − ? = 47 zoek je het verschil tussen 83 en 47. Tel op van 47 naar 83: 3 naar 50, dan 33 naar 83, samen 36.",
    voorbeeld: "600 − ? = 245\n245 naar 250 is 5, 250 naar 300 is 50, 300 naar 600 is 300.\nSamen: 355.",
    minCorrect: 10,
    subtypes: 2,
    // Subtypen: tweecijferig (83 - ? = 47) en van een rond honderdtal (600 - ? = 245)
    make: function(sub) {
      return randomWith(function() {
        var a, c;
        if (sub === 0) { a = rnd(41, 99); c = rnd(11, a - 11); }
        else { a = rnd(3, 9) * 100; c = rnd(101, a - 11); }
        if (c % 10 === 0) return null;
        var x = a - c;
        return { terms: [a, c], question: a + SP_MIN + "? = " + c, answer: x, choices: makeChoices(x, [noBorrowResult(a, c), x + 10]) };
      });
    },
  },

  {
    id: "a36_fout_spotten",
    label: "Fout spotten",
    group: G10,
    desc: "Welke aftreksom klopt niet?",
    strategy: "controleren",
    tip: "Controleer met optellen: uitkomst + aftrekker moet het eerste getal geven.",
    uitleg: "Elke aftreksom kun je controleren met een optelsom. Bij 72 − 38 = 34 reken je 34 + 38 = 72: klopt. Eén van de vier sommen klopt niet.",
    voorbeeld: "64 − 27 = 47?\n47 + 27 = 74, niet 64.\nDeze som is fout (het moet 37 zijn).",
    minCorrect: 10,
    make: makeAftrekFout,
  },
];

// ─────────────────────────────────────────────────────────────────
// SKILLS MET VRAAGVERLOOP + a37 SNELHEIDSRONDE
// ─────────────────────────────────────────────────────────────────

var SKILL_BY_ID = {};

export var AFTREK_SKILLS = RAW_SKILLS.map(function(s) {
  var skill = {
    id:         s.id,
    label:      s.label,
    group:      s.group,
    desc:       s.desc,
    strategy:   s.strategy,
    tip:        s.tip,
    uitleg:     s.uitleg,
    voorbeeld:  s.voorbeeld,
    minCorrect: s.minCorrect,
    generate:   noRepeat(s.id, s.make, s.subtypes),
  };
  SKILL_BY_ID[s.id] = skill;
  return skill;
});

var A37 = { tick: -1, block: null, skillId: null, blockCycle: [], lastBlock: null, skillCycles: {} };

function skillsOfBlock(b) {
  var group = BLOCK_GROUPS[b - 1];
  return RAW_SKILLS.filter(function(s) { return s.group === group; }).map(function(s) { return s.id; });
}

function nextBlock() {
  if (A37.blockCycle.length === 0) {
    var c = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    if (c[0] === A37.lastBlock) { var tmp = c[0]; c[0] = c[1]; c[1] = tmp; }
    A37.blockCycle = c;
  }
  A37.lastBlock = A37.blockCycle.shift();
  return A37.lastBlock;
}

function nextSkillInBlock(b) {
  var c = A37.skillCycles[b];
  if (!c || c.length === 0) { c = A37.skillCycles[b] = shuffle(skillsOfBlock(b)); }
  return c.shift();
}

function generateA37() {
  var t = currentTick();
  if (A37.tick !== t) {
    A37.tick    = t;
    A37.block   = nextBlock();
    A37.skillId = nextSkillInBlock(A37.block);
  }
  return SKILL_BY_ID[A37.skillId].generate();
}

AFTREK_SKILLS.push({
  id:         "a37_snelheid",
  label:      "Snelheidsronde",
  group:      G11,
  desc:       "Gemengd: alle soorten aftreksommen",
  strategy:   "snel",
  tip:        "Kijk eerst wat voor som het is en kies dan de handigste aanpak.",
  uitleg:     "In de snelheidsronde komen alle soorten aftreksommen door elkaar voorbij. Kies per som de aanpak die je hebt geleerd.",
  voorbeeld:  "Gemengd, bijvoorbeeld:\n13 − 5, 72 − 29, 402 − 167, Schat: 82 − 39 ≈ ?",
  minCorrect: 15,
  generate:   generateA37,
});

export var AFTREK_ORDER = AFTREK_SKILLS.map(function(s) { return s.id; });
