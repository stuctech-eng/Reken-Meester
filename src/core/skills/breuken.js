// Onderdeel Breuken: skills, volgorde en breuk-specifieke generatoren (ontwerp B1).
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Het vraagverloop (rekenmoment, geschiedenis, subtypen, stapels, gemengde ronde) staat in ./flow.js.
// Notatie: breuk "3/4", gemengd getal "2 1/4", geheel getal "2". Min-teken − (U+2212).
// Antwoordtypen: G geheel getal (getal), B breuk < 1 in eenvoudigste vorm, M gemengd getal of
// geheel getal (nooit onecht), K kies 1 uit 4 getoonde breuken, F fout spotten.
// Elke vraag heeft 4 keuzes met 4 onderling verschillende waarden en precies één juist antwoord.
// Antwoorden en afleiders zijn hoogstens 5 tekens (past op één regel in een knop op 320 px).

import { rnd, shuffle, gcd } from "./helpers.js";
import { makeChoices, registerSkillId, createSkills, createMixer, deckPick, randomWith } from "./flow.js";

var MIN      = "−";
var SP_TIMES = " × ";
var APPROX   = "≈";
var FULL     = "■";
var EMPTY    = "□";
var MAX_LEN  = 5;

// ─────────────────────────────────────────────────────────────────
// BREUK-HELPERS (waarden als [teller, noemer])
// ─────────────────────────────────────────────────────────────────

function red(n, d) {
  var g = gcd(n, d);
  return [n / g, d / g];
}

function valKey(n, d) {
  var r = red(n, d);
  return r[0] + "/" + r[1];
}

// Breuk in eenvoudigste vorm; een geheel getal als getal
function fstr(n, d) {
  var r = red(n, d);
  return r[1] === 1 ? String(r[0]) : r[0] + "/" + r[1];
}

// Gemengd getal "w a/b" of geheel getal "w"
function mstr(n, d) {
  var r = red(n, d);
  var w = Math.floor(r[0] / r[1]);
  var rem = r[0] - w * r[1];
  if (rem === 0) return String(w);
  return (w > 0 ? w + " " : "") + rem + "/" + r[1];
}

function raw(a, b) { return a + "/" + b; }

function plus(a, b, c, d)  { return red(a * d + c * b, b * d); }
function minus(a, b, c, d) { return red(a * d - c * b, b * d); }

// Tellers 1..b-1 zonder gemeenschappelijke deler met b
function simple(b) {
  var out = [];
  for (var a = 1; a < b; a++) { if (gcd(a, b) === 1) out.push(a); }
  return out;
}

function pickFrom(list) { return list[rnd(0, list.length - 1)]; }

// Nabije breuken < 1 (noemer ≤ 12), gesorteerd op afstand; reserve-afleiders voor type B
function nearFrac(n, d) {
  var out = [];
  for (var q = 2; q <= 12; q++) {
    for (var p = 1; p < q; p++) {
      if (gcd(p, q) === 1 && p * d !== n * q) out.push({ n: p, d: q, dist: Math.abs(p / q - n / d) });
    }
  }
  out.sort(function(x, y) { return x.dist - y.dist; });
  return out.slice(0, 12);
}

// Nabije waarden voor type M: ±1, ±1/noemer, +2, ±1/2
function nearMixed(n, d) {
  var r = red(n, d);
  var s = r[1] > 1 ? [1, r[1]] : [1, 2];
  var steps = [[1, 1], [-1, 1], [s[0], s[1]], [-s[0], s[1]], [2, 1], [1, 2], [-1, 2]];
  var out = [];
  steps.forEach(function(st) {
    var v = plus(r[0], r[1], st[0], st[1]);
    if (v[0] > 0) out.push({ n: v[0], d: v[1] });
  });
  return out;
}

// Vier keuzes voor type B/M/K: het antwoord + de eerste 3 kandidaten die geldig zijn
// (andere waarde dan alle eerdere keuzes, ≤ 5 tekens, bij B tussen 0 en 1)
function fracChoices(kind, ans, cands) {
  var seen = {};
  seen[valKey(ans.n, ans.d)] = true;
  var out = [ans.s];
  for (var i = 0; i < cands.length && out.length < 4; i++) {
    var c = cands[i];
    if (!c || c.n <= 0 || c.d <= 0) continue;
    if (kind === "B" && c.n >= c.d) continue;
    var s = c.s || (kind === "M" ? mstr(c.n, c.d) : fstr(c.n, c.d));
    if (s.length > MAX_LEN) continue;
    var k = valKey(c.n, c.d);
    if (seen[k]) continue;
    seen[k] = true;
    out.push(s);
  }
  return shuffle(out);
}

function fracQ(kind, question, n, d, cands, terms) {
  var s = kind === "M" ? mstr(n, d) : fstr(n, d);
  var reserve = kind === "M" ? nearMixed(n, d) : nearFrac(n, d);
  return { terms: terms, question: question, answer: s, choices: fracChoices(kind, { n: n, d: d, s: s }, cands.concat(reserve)) };
}

function intQ(question, answer, extras, terms) {
  return { terms: terms, question: question, answer: answer, choices: makeChoices(answer, extras) };
}

// Keuzevraag: 4 getoonde breuken (strings), het antwoord is er één van
function pickQ(question, shown, answerIdx, terms) {
  return { terms: terms, question: question, answer: shown[answerIdx], choices: shuffle(shown.slice()) };
}

// ─────────────────────────────────────────────────────────────────
// VASTE LIJSTEN MET MOGELIJKE SOMMEN (B1)
// ─────────────────────────────────────────────────────────────────

var BASE_2_6 = [];
for (var bb = 2; bb <= 6; bb++) { simple(bb).forEach(function(a) { BASE_2_6.push([a, bb]); }); }

var ITEMS_STROOK = [];
for (var sn = 2; sn <= 6; sn++) { simple(sn).forEach(function(k) { ITEMS_STROOK.push([k, sn]); }); }

var ITEMS_TN = [];
for (var tb = 2; tb <= 12; tb++) { for (var ta = 1; ta < tb; ta++) ITEMS_TN.push([ta, tb]); }

var ITEMS_WHOLE = [];
for (var wn = 2; wn <= 12; wn++) ITEMS_WHOLE.push(wn);

var ITEMS_EQUIV = [];
BASE_2_6.forEach(function(p) { [2, 3, 4].forEach(function(m) { ITEMS_EQUIV.push([p[0], p[1], m]); }); });

var ITEMS_SIMPLIFY_1 = [];
BASE_2_6.forEach(function(p) { [2, 3, 5].forEach(function(g) { ITEMS_SIMPLIFY_1.push([p[0], p[1], g]); }); });

var ITEMS_SIMPLIFY_2 = [];
BASE_2_6.forEach(function(p) { [4, 6, 8, 9].forEach(function(g) { if (p[1] * g <= 48) ITEMS_SIMPLIFY_2.push([p[0], p[1], g]); }); });

// Keuzepools voor vergelijken
var GT1 = [], LT1 = [], GTH = [], LTH = [], POOL14 = [];
for (var cb = 2; cb <= 12; cb++) {
  for (var ca = 1; ca < 2 * cb; ca++) {
    if (gcd(ca, cb) !== 1) continue;
    if (cb <= 8 && ca > cb) GT1.push([ca, cb]);
    if (cb <= 8 && ca < cb) LT1.push([ca, cb]);
    if (cb >= 3 && ca < cb && 2 * ca > cb) GTH.push([ca, cb]);
    if (cb >= 3 && 2 * ca < cb) LTH.push([ca, cb]);
    if (ca < cb) POOL14.push([ca, cb]);
  }
}
var FAMILIES = [[2, 4, 8], [3, 6, 12], [2, 4, 12], [2, 6, 12]];

var ITEMS_DELING = [];
for (var db = 2; db <= 10; db++) { for (var dq = 2; dq <= 10; dq++) ITEMS_DELING.push([db * dq, db]); }

var ITEMS_ONECHT = [];
for (var ob = 2; ob <= 9; ob++) { for (var oa = ob + 1; oa < 10 * ob; oa++) { if (gcd(oa, ob) === 1) ITEMS_ONECHT.push([oa, ob]); } }

var ITEMS_GEMENGD_ONECHT = [];
for (var gb = 2; gb <= 10; gb++) { simple(gb).forEach(function(r) { for (var w = 1; w <= 5; w++) ITEMS_GEMENGD_ONECHT.push([w, r, gb]); }); }

// Gelijke noemer: [a, c, b]
var ITEMS_PLUS_1 = [], ITEMS_MIN_1 = [], ITEMS_PLUS_M = [];
for (var eb = 3; eb <= 12; eb++) {
  for (var ea = 1; ea < eb; ea++) {
    for (var ec = 1; ec < eb; ec++) {
      if (ea + ec < eb && gcd(ea + ec, eb) === 1) ITEMS_PLUS_1.push([ea, ec, eb]);
      if (ea > ec && gcd(ea - ec, eb) === 1) ITEMS_MIN_1.push([ea, ec, eb]);
      if (eb <= 9 && (ea + ec >= eb || gcd(ea + ec, eb) > 1)) ITEMS_PLUS_M.push([ea, ec, eb]);
    }
  }
}

var ITEMS_AANVUL = [];
for (var vb = 2; vb <= 12; vb++) { for (var va = 1; va < vb; va++) { if (gcd(vb - va, vb) === 1) ITEMS_AANVUL.push([va, vb]); } }

// Ongelijke noemers: [a, b, c, d]
function twoList(related, op, cond, maxRes) {
  var out = [];
  for (var b = 2; b <= 12; b++) {
    for (var d = 2; d <= 12; d++) {
      if (b === d) continue;
      var rel = (d % b === 0 || b % d === 0);
      if (rel !== related) continue;
      if (b * d / gcd(b, d) > 24) continue;
      simple(b).forEach(function(a) {
        simple(d).forEach(function(c) {
          var v = op === "+" ? plus(a, b, c, d) : minus(a, b, c, d);
          if (!cond(v) || v[1] > maxRes) return;
          out.push([a, b, c, d]);
        });
      });
    }
  }
  return out;
}
var ITEMS_REL_PLUS  = twoList(true,  "+", function(v) { return v[0] < v[1]; }, 12);
var ITEMS_REL_MIN   = twoList(true,  "-", function(v) { return v[0] > 0; }, 12);
var ITEMS_FREE_PLUS = twoList(false, "+", function(v) { return v[0] < v[1]; }, 24);
var ITEMS_FREE_MIN  = twoList(false, "-", function(v) { return v[0] > 0; }, 24);
var ITEMS_OVER_1    = twoList(false, "+", function(v) { return v[0] > v[1]; }, 9)
  .concat(twoList(true, "+", function(v) { return v[0] > v[1]; }, 9));

// Gemengde getallen, zelfde noemer: [w1, r1, w2, r2, b]
function mixedList(kind) {
  var out = [];
  for (var b = 2; b <= 9; b++) {
    simple(b).forEach(function(r1) {
      simple(b).forEach(function(r2) {
        for (var w1 = 1; w1 <= 5; w1++) {
          for (var w2 = 1; w2 <= 5; w2++) {
            if (kind === "zonder" && !(r1 + r2 < b)) continue;
            if (kind === "met" && !(r1 + r2 > b)) continue;
            if (kind === "lenen" && !(r1 < r2 && w1 > w2)) continue;
            var tot = kind === "lenen" ? (w1 - w2) * b + (r1 - r2) : (w1 + w2) * b + r1 + r2;
            if (tot >= 10 * b) continue;
            out.push([w1, r1, w2, r2, b]);
          }
        }
      });
    });
  }
  return out;
}
var ITEMS_MIX_ZONDER = mixedList("zonder");
var ITEMS_MIX_MET    = mixedList("met");
var ITEMS_MIX_LENEN  = mixedList("lenen");

var ITEMS_STAM_VAN = [];
for (var hb = 2; hb <= 10; hb++) { for (var hq = 2; hq <= 10; hq++) ITEMS_STAM_VAN.push([hb, hq]); }

var ITEMS_BREUK_VAN = [];
for (var ib = 3; ib <= 10; ib++) { for (var ia = 2; ia < ib; ia++) { if (gcd(ia, ib) !== 1) continue; for (var iq = 2; iq <= 10; iq++) ITEMS_BREUK_VAN.push([ia, ib, iq]); } }

var ITEMS_TERUG = [];
for (var jb = 2; jb <= 10; jb++) { simple(jb).forEach(function(a) { for (var q = 2; q <= 10; q++) ITEMS_TERUG.push([a, jb, q]); }); }

var ITEMS_KEER = [];
for (var kn = 2; kn <= 6; kn++) { for (var kb = 2; kb <= 9; kb++) { simple(kb).forEach(function(a) { ITEMS_KEER.push([kn, a, kb]); }); } }

var ITEMS_TELLER = [];
BASE_2_6.forEach(function(p) {
  [2, 3].forEach(function(m) {
    var d = p[1] * m;
    for (var e = p[0] * m + 1; e < d; e++) ITEMS_TELLER.push([p[0], p[1], d, e]);
  });
});

// Fout spotten: foute sommen (type 1 en 2) en juiste sommen, elk ≤ 16 tekens.
// De foute uitkomst staat onvereenvoudigd, zodat het foutpatroon zichtbaar blijft
// (1/10 + 1/2 = 2/12, niet 1/6). Alle foute sommen samen vormen één pool waaruit gelijk
// wordt gekozen: elke foute som komt even vaak voor, ongeacht het fouttype.
function sumStr(a, b, c, d, rn, rd) { return a + "/" + b + " + " + c + "/" + d + " = " + fstr(rn, rd); }
var FOUT = [], GOED = [];
ITEMS_REL_PLUS.concat(ITEMS_FREE_PLUS).forEach(function(t) {
  var v = plus(t[0], t[1], t[2], t[3]);
  // Type 1: tellers én noemers opgeteld
  if ((t[0] + t[2]) * v[1] !== v[0] * (t[1] + t[3])) {
    var s = t[0] + "/" + t[1] + " + " + t[2] + "/" + t[3] + " = " + raw(t[0] + t[2], t[1] + t[3]);
    if (s.length <= 16) FOUT.push({ t: t, s: s, type: 1 });
  }
});
ITEMS_REL_PLUS.forEach(function(t) {
  var v = plus(t[0], t[1], t[2], t[3]);
  var big = Math.max(t[1], t[3]);
  // Type 2: de breuk met de kleinste noemer niet omgezet (tellers opgeteld, grootste noemer)
  var s = t[0] + "/" + t[1] + " + " + t[2] + "/" + t[3] + " = " + raw(t[0] + t[2], big);
  if ((t[0] + t[2]) * v[1] !== v[0] * big && s.length <= 16) FOUT.push({ t: t, s: s, type: 2 });
});
ITEMS_PLUS_1.forEach(function(t) {
  var s = sumStr(t[0], t[2], t[1], t[2], t[0] + t[1], t[2]);
  if (s.length <= 16) GOED.push(s);
});
ITEMS_REL_PLUS.concat(ITEMS_FREE_PLUS).forEach(function(t) {
  var v = plus(t[0], t[1], t[2], t[3]);
  var s = sumStr(t[0], t[1], t[2], t[3], v[0], v[1]);
  if (s.length <= 16) GOED.push(s);
});

// Schatten: gemengde getallen met breukdeel ≤ 1/4 of ≥ 3/4
function clearParts(dens) {
  var out = [];
  dens.forEach(function(b) {
    simple(b).forEach(function(a) { if (4 * a <= b || 4 * a >= 3 * b) out.push([a, b]); });
  });
  return out;
}
var PARTS_A = clearParts([4, 5, 6, 7, 8, 9, 10, 11, 12]);
var PARTS_B = clearParts([4, 6, 8, 12]);
var ITEMS_SCHAT = [];
for (var s1 = 1; s1 <= 5; s1++) {
  for (var s2 = 1; s2 <= 5; s2++) {
    PARTS_A.forEach(function(f1) {
      PARTS_B.forEach(function(f2) {
        var A = [s1 * f1[1] + f1[0], f1[1]];
        var B = [s2 * f2[1] + f2[0], f2[1]];
        var est = s1 + (4 * f1[0] >= 3 * f1[1] ? 1 : 0) + s2 + (4 * f2[0] >= 3 * f2[1] ? 1 : 0);
        var sum = plus(A[0], A[1], B[0], B[1]);
        // |som − schatting| ≤ 2/5
        if (5 * Math.abs(sum[0] - est * sum[1]) > 2 * sum[1]) return;
        ITEMS_SCHAT.push([A, B, est]);
      });
    });
  }
}

// ─────────────────────────────────────────────────────────────────
// SKILL DEFINITIONS
// ─────────────────────────────────────────────────────────────────

var G1  = "Begrijpen";
var G2  = "Gelijkwaardig";
var G3  = "Vergelijken";
var G4  = "Onechte breuken";
var G5  = "Gelijke noemer";
var G6  = "Ongelijke noemers";
var G7  = "Gemengde getallen";
var G8  = "Breuk van een hoeveelheid";
var G9  = "Toepassen en controleren";
var G10 = "Slot";

var BLOCK_GROUPS = [G1, G2, G3, G4, G5, G6, G7, G8, G9];

// Kies 4 verschillende elementen uit een lijst
function pick4(list) { return shuffle(list).slice(0, 4); }

function biggestOrSmallest(sub, vals) {
  var idx = 0;
  for (var i = 1; i < vals.length; i++) {
    var c = vals[i][0] * vals[idx][1] - vals[idx][0] * vals[i][1];
    if (sub === 0 ? c > 0 : c < 0) idx = i;
  }
  return idx;
}

var Q_BIG   = "Welke is het grootst?";
var Q_SMALL = "Welke is het kleinst?";

var RAW_SKILLS = [

  // ── BLOK 1: BEGRIJPEN ──────────────────────────────────────────

  {
    id: "b01_strook",
    label: "Deel van een strook",
    group: G1,
    desc: "■■■□ = 3/4",
    strategy: "tellen",
    tip: function(t) { return "Tel de gekleurde vakjes (" + t[0] + ") en alle vakjes (" + t[1] + "). Gekleurd deel = " + t[0] + "/" + t[1] + "."; },
    uitleg: "Een breuk vertelt welk deel van een geheel je hebt. De noemer (onder de streep) is in hoeveel gelijke delen het geheel is verdeeld. De teller (boven de streep) is hoeveel van die delen je neemt. ■■■□: 3 van de 4 vakjes zijn gekleurd, dus 3/4.",
    voorbeeld: "■■□□□\n2 van de 5 vakjes gekleurd.\nAntwoord: 2/5.",
    minCorrect: 8,
    deck: true,
    make: function() {
      var p = deckPick("b01_strook", ITEMS_STROOK);
      var k = p[0], n = p[1];
      var q = FULL.repeat(k) + EMPTY.repeat(n - k) + "\nWelk deel?";
      var cands = [{ n: n - k, d: n }, { n: k, d: n - k }, { n: k, d: n + 1 }, { n: k + 1, d: n + 1 }, n - 1 > k ? { n: k, d: n - 1 } : { n: 1, d: n + 2 }, { n: n, d: k }];
      return fracQ("B", q, k, n, cands, [k, n]);
    },
  },

  {
    id: "b02_teller_noemer",
    label: "Teller en noemer",
    group: G1,
    desc: "Teller van 5/8 = 5, noemer = 8",
    strategy: "begrippen",
    tip: function(t) { return "In " + t[0] + "/" + t[1] + " staat de teller (" + t[0] + ") boven en de noemer (" + t[1] + ") onder de streep."; },
    uitleg: "De noemer staat onder de streep en noemt in hoeveel gelijke delen het geheel is verdeeld. De teller staat boven de streep en telt hoeveel delen je hebt. In 5/8 is 5 de teller en 8 de noemer.",
    voorbeeld: "Noemer van 3/7 = ?\nDe noemer staat onder: 7.",
    minCorrect: 8,
    subtypes: 2,
    // Subtypen: teller, noemer
    make: function(sub) {
      var p = pickFrom(ITEMS_TN);
      var a = p[0], b = p[1];
      if (sub === 0) return intQ("Teller van " + a + "/" + b + " = ?", a, [b, a + b, b - a, a + 1, a - 1], [a, b]);
      return intQ("Noemer van " + a + "/" + b + " = ?", b, [a, a + b, b - a, b + 1, b - 1], [a, b]);
    },
  },

  {
    id: "b03_stambreuken",
    label: "Stambreuken vergelijken",
    group: G1,
    desc: "1/2 is groter dan 1/5",
    strategy: "vergelijken",
    tip: function(t) { return "Hoe meer stukken, hoe kleiner elk stuk. De kleinste noemer geeft het grootste stuk."; },
    uitleg: "Een stambreuk heeft teller 1, zoals 1/2, 1/5 of 1/8. Verdeel je iets in meer stukken, dan wordt elk stuk kleiner. Daarom is 1/2 groter dan 1/5, en 1/8 kleiner dan 1/3.",
    voorbeeld: "Welke is het grootst?\n1/3, 1/5, 1/2, 1/8\nAntwoord: 1/2.",
    minCorrect: 8,
    subtypes: 2,
    // Subtypen: grootste, kleinste
    make: function(sub) {
      // Eerst het antwoord kiezen (elke mogelijke noemer even vaak), dan 3 andere noemers aan de
      // juiste kant; anders is het antwoord bij "grootst" meestal 1/2
      var key = sub === 0 ? rnd(2, 9) : rnd(5, 12);
      var rest = sub === 0 ? simpleRange(key + 1, 12) : simpleRange(2, key - 1);
      var ds = shuffle([key].concat(shuffle(rest).slice(0, 3)));
      var vals = ds.map(function(d) { return [1, d]; });
      var idx = biggestOrSmallest(sub, vals);
      return pickQ(sub === 0 ? Q_BIG : Q_SMALL, vals.map(function(v) { return raw(v[0], v[1]); }), idx, [sub]);
    },
  },

  {
    id: "b04_geheel",
    label: "Een geheel als breuk",
    group: G1,
    desc: "1 = 6/6",
    strategy: "geheel",
    tip: function(t) { return "Alle " + t[0] + " delen samen zijn het hele ding: " + t[0] + "/" + t[0] + " = 1."; },
    uitleg: "Neem je alle delen, dan heb je het geheel: 6/6 = 1, 8/8 = 1. Teller en noemer zijn dan gelijk. (En 0 delen is niets: 0/6 = 0.)",
    voorbeeld: "1 = ?/5\nAlle 5 delen: 5/5.\nAntwoord: 5.",
    minCorrect: 8,
    subtypes: 2,
    // Subtypen: 1 = ?/n, n/n = ?
    make: function(sub) {
      var n = pickFrom(ITEMS_WHOLE);
      if (sub === 0) return intQ("1 = ?/" + n, n, [1, n - 1, n + 1], [n]);
      return intQ(n + "/" + n + " = ?", 1, [n, 0, 2], [n]);
    },
  },

  // ── BLOK 2: GELIJKWAARDIG ──────────────────────────────────────

  {
    id: "b05_gelijkwaardig_maken",
    label: "Gelijkwaardig maken",
    group: G2,
    desc: "1/2 = 4/8",
    strategy: "vermenigvuldigen",
    tip: function(t) { var m = t[2] / t[1]; return t[1] + SP_TIMES + m + " = " + t[2] + ", dus ook de teller keer " + m + ": " + t[0] + SP_TIMES + m + " = " + (t[0] * m) + "."; },
    uitleg: "Vermenigvuldig je teller én noemer met hetzelfde getal, dan blijft de breuk even groot. 1/2 = 2/4 = 4/8: de stukken worden kleiner, maar je hebt er meer van.",
    voorbeeld: "2/3 = ?/12\n3 × 4 = 12, dus 2 × 4 = 8.\nAntwoord: 8.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_EQUIV);
      var a = p[0], b = p[1], m = p[2], c = b * m;
      return intQ(a + "/" + b + " = ?/" + c, a * m, [a + c - b, a * m + 1, a * m - 1, a], [a, b, c]);
    },
  },

  {
    id: "b06_gelijkwaardig_herkennen",
    label: "Gelijkwaardige herkennen",
    group: G2,
    desc: "2/3 = 8/12",
    strategy: "vermenigvuldigen",
    tip: function(t) { return "Zoek de breuk waarbij teller en noemer met hetzelfde getal zijn vermenigvuldigd: " + t[0] + "/" + t[1] + " × " + t[2] + "/" + t[2] + "."; },
    uitleg: "Twee breuken zijn gelijkwaardig als je de ene krijgt door teller en noemer met hetzelfde getal te vermenigvuldigen. 2/3 = 8/12, want 2 × 4 = 8 en 3 × 4 = 12. Let op: 3/4 is niet gelijk aan 2/3, ook al is het 'één meer'.",
    voorbeeld: "Gelijk aan 3/4?\n6/8 (want × 2).",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_EQUIV);
      var a = p[0], b = p[1], m = p[2];
      var ans = { n: a, d: b, s: raw(a * m, b * m) };
      var cands = [[a + m, b + m], [a * m, b * m + 1], [a * m + 1, b * m], [a, b * m], [a * m, b], [a + 1, b + 1], [a * m - 1, b * m]]
        .filter(function(x) { return x[0] > 0; })
        .map(function(x) { return { n: x[0], d: x[1], s: raw(x[0], x[1]) }; });
      return { terms: [a, b, m], question: "Gelijk aan " + a + "/" + b + "?", answer: ans.s, choices: fracChoices("K", ans, cands) };
    },
  },

  {
    id: "b07_vereenvoudigen",
    label: "Vereenvoudigen in één stap",
    group: G2,
    desc: "6/8 = 3/4",
    strategy: "delen",
    tip: function(t) { var g = gcd(t[0], t[1]); return "Deel teller en noemer door " + g + ": " + t[0] + " : " + g + " = " + (t[0] / g) + ", " + t[1] + " : " + g + " = " + (t[1] / g) + "."; },
    uitleg: "Vereenvoudigen is teller en noemer door hetzelfde getal delen. De breuk blijft even groot, maar de getallen worden kleiner. 6/8: allebei door 2 geeft 3/4.",
    voorbeeld: "10/15 = ?\nAllebei door 5: 2/3.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_SIMPLIFY_1);
      var a = p[0], b = p[1], g = p[2], A = a * g, B = b * g;
      var cands = [{ n: a, d: B }, A < b ? { n: A, d: b } : { n: a + 1, d: b }];
      return fracQ("B", A + "/" + B + " = ?", a, b, cands, [A, B]);
    },
  },

  {
    id: "b08_eenvoudigst",
    label: "Zo eenvoudig mogelijk",
    group: G2,
    desc: "12/18 = 2/3",
    strategy: "grootste deler",
    tip: function(t) { var g = gcd(t[0], t[1]); return "Het grootste getal dat in " + t[0] + " en " + t[1] + " past is " + g + ". " + t[0] + "/" + t[1] + " = " + (t[0] / g) + "/" + (t[1] / g) + "."; },
    uitleg: "Zo eenvoudig mogelijk betekent: delen tot het niet verder kan. Zoek het grootste getal dat in teller én noemer past. 12/18: 6 past in allebei, dus 12/18 = 2/3. Deel je eerst door 2 (6/9), dan moet je daarna nog door 3.",
    voorbeeld: "16/24 = ?\n8 past in allebei: 2/3.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_SIMPLIFY_2);
      var a = p[0], b = p[1], g = p[2], A = a * g, B = b * g;
      var h = g % 2 === 0 ? 2 : 3;
      return fracQ("B", A + "/" + B + " = ?", a, b, [{ n: A / h, d: B }], [A, B]);
    },
  },

  // ── BLOK 3: VERGELIJKEN ────────────────────────────────────────

  {
    id: "b09_gelijke_noemer",
    label: "Gelijke noemer vergelijken",
    group: G3,
    desc: "3/8, 5/8, 7/8",
    strategy: "vergelijken",
    tip: function(t) { return "Dezelfde noemer: de stukken zijn even groot. De grootste teller is de grootste breuk."; },
    uitleg: "Hebben breuken dezelfde noemer, dan zijn de stukken even groot. Kijk alleen naar de teller: 7/8 is meer dan 5/8, want 7 stukken is meer dan 5 stukken.",
    voorbeeld: "Welke is het grootst?\n3/8, 5/8, 1/8, 7/8\nAntwoord: 7/8.",
    minCorrect: 8,
    subtypes: 2,
    make: function(sub) {
      var b = rnd(5, 12);
      var ts = pick4(simpleRange(1, b - 1));
      var vals = ts.map(function(t) { return [t, b]; });
      return pickQ(sub === 0 ? Q_BIG : Q_SMALL, vals.map(function(v) { return raw(v[0], v[1]); }), biggestOrSmallest(sub, vals), [sub]);
    },
  },

  {
    id: "b10_gelijke_teller",
    label: "Gelijke teller vergelijken",
    group: G3,
    desc: "3/4 is groter dan 3/8",
    strategy: "vergelijken",
    tip: function(t) { return "Dezelfde teller: evenveel stukken. Hoe kleiner de noemer, hoe groter de stukken."; },
    uitleg: "Hebben breuken dezelfde teller, dan heb je evenveel stukken. Bij een kleinere noemer zijn die stukken groter. 3/4 is groter dan 3/8: vierden zijn groter dan achtsten.",
    voorbeeld: "Welke is het grootst?\n3/4, 3/8, 3/5, 3/10\nAntwoord: 3/4.",
    minCorrect: 8,
    subtypes: 2,
    make: function(sub) {
      var t = rnd(1, 5);
      var ds = pick4(simpleRange(t + 1, 12));
      var vals = ds.map(function(d) { return [t, d]; });
      return pickQ(sub === 0 ? Q_BIG : Q_SMALL, vals.map(function(v) { return raw(v[0], v[1]); }), biggestOrSmallest(sub, vals), [sub]);
    },
  },

  {
    id: "b11_groter_dan_1",
    label: "Groter dan 1",
    group: G3,
    desc: "7/4 is groter dan 1",
    strategy: "teller en noemer",
    tip: function(t) { return "Is de teller groter dan de noemer, dan is de breuk groter dan 1. Zijn ze gelijk, dan is hij precies 1."; },
    uitleg: "Vergelijk teller en noemer. Teller kleiner dan noemer: kleiner dan 1 (3/4). Teller gelijk aan noemer: precies 1 (4/4). Teller groter dan noemer: groter dan 1 (7/4).",
    voorbeeld: "Welke is groter dan 1?\n3/4, 7/4, 4/4, 2/5\nAntwoord: 7/4.",
    minCorrect: 8,
    make: function() {
      var g = pickFrom(GT1);
      var n = rnd(2, 8);
      var l = shuffle(LT1).slice(0, 2);
      var shown = [raw(g[0], g[1]), raw(n, n), raw(l[0][0], l[0][1]), raw(l[1][0], l[1][1])];
      return pickQ("Welke is groter dan 1?", shown, 0, [g[0], g[1]]);
    },
  },

  {
    id: "b12_groter_dan_half",
    label: "Groter dan 1/2",
    group: G3,
    desc: "5/9 is groter dan 1/2",
    strategy: "ijkpunt",
    tip: function(t) { return "Verdubbel de teller: is dat meer dan de noemer, dan is de breuk groter dan 1/2. " + t[0] + " × 2 = " + (2 * t[0]) + ", noemer " + t[1] + "."; },
    uitleg: "De helft van de noemer is het ijkpunt. Is de teller meer dan de helft van de noemer, dan is de breuk groter dan 1/2. 5/9: de helft van 9 is 4,5, en 5 is meer. 3/6 is precies 1/2.",
    voorbeeld: "Welke is groter dan 1/2?\n5/9, 3/6, 2/5, 1/4\nAntwoord: 5/9.",
    minCorrect: 8,
    make: function() {
      var g = pickFrom(GTH);
      var k = rnd(2, 6);
      var l = shuffle(LTH).slice(0, 2);
      var shown = [raw(g[0], g[1]), raw(k, 2 * k), raw(l[0][0], l[0][1]), raw(l[1][0], l[1][1])];
      return pickQ("Welke is groter dan 1/2?", shown, 0, [g[0], g[1]]);
    },
  },

  {
    id: "b13_verwante_noemers",
    label: "Vergelijken, verwante noemers",
    group: G3,
    desc: "1/2, 3/8, 5/8, 1/4",
    strategy: "gelijknamig maken",
    tip: function(t) { return "Maak alle noemers gelijk aan de grootste noemer en vergelijk dan de tellers."; },
    uitleg: "Zijn de noemers familie (2, 4, 8 of 3, 6, 12), maak ze dan gelijk. 1/2 = 4/8 en 1/4 = 2/8. Nu kun je de tellers vergelijken: 5/8 is het grootst.",
    voorbeeld: "Welke is het grootst?\n1/2, 3/8, 5/8, 1/4\n= 4/8, 3/8, 5/8, 2/8\nAntwoord: 5/8.",
    minCorrect: 8,
    subtypes: 2,
    make: function(sub) {
      var vals = randomWith(function() {
        var fam = pickFrom(FAMILIES);
        var pool = {};
        fam.forEach(function(d) { for (var a = 1; a < d; a++) { var r = red(a, d); pool[r[0] + "/" + r[1]] = r; } });
        var list = Object.keys(pool).map(function(k) { return pool[k]; });
        // Eerst het antwoord kiezen, dan 3 breuken aan de juiste kant (spreidt de antwoorden)
        var ans = pickFrom(list);
        var side = list.filter(function(v) { var c = v[0] * ans[1] - ans[0] * v[1]; return sub === 0 ? c < 0 : c > 0; });
        if (side.length < 3) return null;
        var four = shuffle([ans].concat(shuffle(side).slice(0, 3)));
        var dens = {};
        four.forEach(function(v) { dens[v[1]] = true; });
        return Object.keys(dens).length >= 2 ? four : null;
      });
      return pickQ(sub === 0 ? Q_BIG : Q_SMALL, vals.map(function(v) { return raw(v[0], v[1]); }), biggestOrSmallest(sub, vals), [sub]);
    },
  },

  {
    id: "b14_ordenen",
    label: "Ordenen, verschillende noemers",
    group: G3,
    desc: "3/4, 2/3, 5/6, 7/12",
    strategy: "gelijknamig maken",
    tip: function(t) { return "Maak de noemers gelijk (bijv. 12 of 24) of vergelijk met 1/2 en 1. Dan zie je welke het grootst of kleinst is."; },
    uitleg: "Bij verschillende noemers maak je de breuken gelijknamig: zoek een getal waar alle noemers in passen. 3/4, 2/3, 5/6, 7/12 worden 9/12, 8/12, 10/12, 7/12. Nu is 7/12 het kleinst.",
    voorbeeld: "Welke is het kleinst?\n3/4, 2/3, 5/6, 7/12\nAntwoord: 7/12.",
    minCorrect: 12,
    subtypes: 2,
    make: function(sub) {
      var vals = randomWith(function() {
        var four = pick4(POOL14);
        var dens = four.map(function(v) { return v[1]; });
        var uniq = {};
        dens.forEach(function(d) { uniq[d] = true; });
        if (Object.keys(uniq).length !== 4) return null;
        for (var i = 0; i < 4; i++) {
          for (var j = i + 1; j < 4; j++) {
            if (dens[i] % dens[j] !== 0 && dens[j] % dens[i] !== 0) return four;
          }
        }
        return null;
      });
      return pickQ(sub === 0 ? Q_BIG : Q_SMALL, vals.map(function(v) { return raw(v[0], v[1]); }), biggestOrSmallest(sub, vals), [sub]);
    },
  },

  // ── BLOK 4: ONECHTE BREUKEN ────────────────────────────────────

  {
    id: "b15_deling",
    label: "Breuk als deling",
    group: G4,
    desc: "12/4 = 12 : 4 = 3",
    strategy: "delen",
    tip: function(t) { return "Een breukstreep betekent gedeeld door: " + t[0] + "/" + t[1] + " = " + t[0] + " : " + t[1] + " = " + (t[0] / t[1]) + "."; },
    uitleg: "De breukstreep betekent 'gedeeld door'. 12/4 is 12 : 4 = 3. Daarom is een breuk met een grotere teller dan noemer meer dan 1.",
    voorbeeld: "20/5 = ?\n20 : 5 = 4.\nAntwoord: 4.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_DELING);
      var a = p[0], b = p[1], q = a / b;
      return intQ(a + "/" + b + " = ?", q, [a - b, b, q * 10, q + 1, q - 1], [a, b]);
    },
  },

  {
    id: "b16_onecht_gemengd",
    label: "Onecht naar gemengd",
    group: G4,
    desc: "7/3 = 2 1/3",
    strategy: "delen met rest",
    tip: function(t) { var w = Math.floor(t[0] / t[1]); var r = t[0] - w * t[1]; return t[0] + " : " + t[1] + " = " + w + " rest " + r + ". Dus " + w + " hele en " + r + "/" + t[1] + "."; },
    uitleg: "Een onechte breuk (teller groter dan noemer) schrijf je als gemengd getal. Deel de teller door de noemer: 7 : 3 = 2 rest 1. Dat zijn 2 hele en 1/3: 7/3 = 2 1/3.",
    voorbeeld: "11/4 = ?\n11 : 4 = 2 rest 3.\nAntwoord: 2 3/4.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_ONECHT);
      var a = p[0], b = p[1];
      var w = Math.floor(a / b), r = a - w * b;
      var cands = [{ n: a + b, d: b }, w > 1 ? { n: a - b, d: b } : { n: a + 2 * b, d: b }, { n: w * b + (b - r), d: b }];
      return fracQ("M", a + "/" + b + " = ?", a, b, cands, [a, b]);
    },
  },

  {
    id: "b17_gemengd_onecht",
    label: "Gemengd naar onecht",
    group: G4,
    desc: "2 3/4 = 11/4",
    strategy: "vermenigvuldigen",
    tip: function(t) { return t[0] + " hele = " + (t[0] * t[2]) + "/" + t[2] + ". Plus " + t[1] + "/" + t[2] + " = " + (t[0] * t[2] + t[1]) + "/" + t[2] + "."; },
    uitleg: "Elk geheel bestaat uit evenveel delen als de noemer. 2 3/4: 2 hele zijn 8 vierden, plus 3 vierden is 11 vierden. Dus 2 3/4 = 11/4.",
    voorbeeld: "3 1/5 = ?/5\n3 × 5 = 15, plus 1 = 16.\nAntwoord: 16.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_GEMENGD_ONECHT);
      var w = p[0], r = p[1], b = p[2], t = w * b + r;
      return intQ(w + " " + r + "/" + b + " = ?/" + b, t, [w + r, w * b, w * r + b, t - r, t + 1, t - 1], [w, r, b]);
    },
  },

  // ── BLOK 5: GELIJKE NOEMER ─────────────────────────────────────

  {
    id: "b18_plus_gelijk",
    label: "Optellen, gelijke noemer",
    group: G5,
    desc: "2/7 + 3/7 = 5/7",
    strategy: "tellers optellen",
    tip: function(t) { return "Tel alleen de tellers op: " + t[0] + " + " + t[1] + " = " + (t[0] + t[1]) + ". De noemer " + t[2] + " blijft."; },
    uitleg: "Bij dezelfde noemer tel je de tellers op; de noemer blijft hetzelfde. 2/7 + 3/7 = 5/7: twee zevende plus drie zevende is vijf zevende. De noemers tel je niet op.",
    voorbeeld: "3/10 + 4/10 = ?\n3 + 4 = 7.\nAntwoord: 7/10.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_PLUS_1);
      var a = p[0], c = p[1], b = p[2];
      var v = [a + c, b];
      return fracQ("B", a + "/" + b + " + " + c + "/" + b + " =", v[0], v[1], [{ n: a + c, d: 2 * b }], [a, c, b]);
    },
  },

  {
    id: "b19_min_gelijk",
    label: "Aftrekken, gelijke noemer",
    group: G5,
    desc: "5/8 − 2/8 = 3/8",
    strategy: "tellers aftrekken",
    tip: function(t) { return "Trek alleen de tellers af: " + t[0] + " − " + t[1] + " = " + (t[0] - t[1]) + ". De noemer " + t[2] + " blijft."; },
    uitleg: "Bij dezelfde noemer trek je de tellers af; de noemer blijft hetzelfde. 5/8 − 2/8 = 3/8.",
    voorbeeld: "7/9 − 3/9 = ?\n7 − 3 = 4.\nAntwoord: 4/9.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_MIN_1);
      var a = p[0], c = p[1], b = p[2];
      return fracQ("B", a + "/" + b + " " + MIN + " " + c + "/" + b + " =", a - c, b, [{ n: a - c, d: 2 * b }], [a, c, b]);
    },
  },

  {
    id: "b20_plus_vereenvoudigen",
    label: "Optellen met vereenvoudigen",
    group: G5,
    desc: "3/8 + 7/8 = 1 1/4",
    strategy: "optellen en vereenvoudigen",
    tip: function(t) { var s = t[0] + t[1]; return t[0] + "/" + t[2] + " + " + t[1] + "/" + t[2] + " = " + s + "/" + t[2] + " = " + mstr(s, t[2]) + "."; },
    uitleg: "Tel de tellers op en kijk dan naar de uitkomst. Is de teller groter dan of gelijk aan de noemer, haal er dan hele uit. Kan de breuk eenvoudiger, vereenvoudig dan. 3/8 + 7/8 = 10/8 = 1 2/8 = 1 1/4.",
    voorbeeld: "2/6 + 2/6 = ?\n4/6 = 2/3.\nAntwoord: 2/3.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_PLUS_M);
      var a = p[0], c = p[1], b = p[2];
      return fracQ("M", a + "/" + b + " + " + c + "/" + b + " =", a + c, b, [{ n: a + c, d: 2 * b }], [a, c, b]);
    },
  },

  {
    id: "b21_aanvullen",
    label: "Aanvullen tot 1",
    group: G5,
    desc: "3/5 + 2/5 = 1",
    strategy: "aanvullen",
    tip: function(t) { return "1 = " + t[1] + "/" + t[1] + ". Er ontbreken nog " + (t[1] - t[0]) + " delen: " + fstr(t[1] - t[0], t[1]) + "."; },
    uitleg: "Een geheel is n/n. Bij 3/5 + ? = 1 zoek je hoeveel vijfden er nog ontbreken tot 5/5: dat is 2/5.",
    voorbeeld: "5/8 + ? = 1\n8/8 − 5/8 = 3/8.\nAntwoord: 3/8.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_AANVUL);
      var a = p[0], b = p[1];
      var self = (2 * a === b) ? { n: 1, d: b } : { n: a, d: b };
      return fracQ("B", a + "/" + b + " + ? = 1", b - a, b, [self, { n: b - a, d: 2 * b }], [a, b]);
    },
  },

  // ── BLOK 6: ONGELIJKE NOEMERS ──────────────────────────────────

  {
    id: "b22_plus_veelvoud",
    label: "Optellen, noemer is veelvoud",
    group: G6,
    desc: "1/2 + 1/4 = 3/4",
    strategy: "gelijknamig maken",
    tip: function(t) { var L = Math.max(t[1], t[3]); return "Maak beide noemers " + L + ": " + raw(t[0] * L / t[1], L) + " + " + raw(t[2] * L / t[3], L) + " = " + fstr(t[0] * L / t[1] + t[2] * L / t[3], L) + "."; },
    uitleg: "Breuken met verschillende noemers kun je pas optellen als de noemers gelijk zijn. Is de ene noemer een veelvoud van de andere, dan zet je de kleinste om. 1/2 + 1/4: 1/2 = 2/4, dus 2/4 + 1/4 = 3/4. Tel nooit de noemers op.",
    voorbeeld: "1/3 + 1/6 = ?\n1/3 = 2/6, 2/6 + 1/6 = 3/6 = 1/2.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_REL_PLUS);
      var v = plus(p[0], p[1], p[2], p[3]);
      return fracQ("B", p[0] + "/" + p[1] + " + " + p[2] + "/" + p[3] + " =", v[0], v[1], [{ n: p[0] + p[2], d: p[1] + p[3] }], p);
    },
  },

  {
    id: "b23_min_veelvoud",
    label: "Aftrekken, noemer is veelvoud",
    group: G6,
    desc: "5/6 − 1/3 = 1/2",
    strategy: "gelijknamig maken",
    tip: function(t) { var L = Math.max(t[1], t[3]); return "Maak beide noemers " + L + ": " + raw(t[0] * L / t[1], L) + " " + MIN + " " + raw(t[2] * L / t[3], L) + " = " + fstr(t[0] * L / t[1] - t[2] * L / t[3], L) + "."; },
    uitleg: "Maak eerst de noemers gelijk en trek dan de tellers af. 5/6 − 1/3: 1/3 = 2/6, dus 5/6 − 2/6 = 3/6 = 1/2.",
    voorbeeld: "3/4 − 1/2 = ?\n1/2 = 2/4, 3/4 − 2/4 = 1/4.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_REL_MIN);
      var v = minus(p[0], p[1], p[2], p[3]);
      var wrong = p[0] !== p[2] ? { n: Math.abs(p[0] - p[2]), d: Math.abs(p[1] - p[3]) } : { n: 1, d: 12 };
      return fracQ("B", p[0] + "/" + p[1] + " " + MIN + " " + p[2] + "/" + p[3] + " =", v[0], v[1], [wrong], p);
    },
  },

  {
    id: "b24_plus_algemeen",
    label: "Optellen, gemeenschappelijke noemer",
    group: G6,
    desc: "1/3 + 1/4 = 7/12",
    strategy: "gelijknamig maken",
    tip: function(t) { var L = t[1] * t[3] / gcd(t[1], t[3]); return "Zoek een noemer waar " + t[1] + " en " + t[3] + " in passen: " + L + ". " + raw(t[0] * L / t[1], L) + " + " + raw(t[2] * L / t[3], L) + " = " + fstr(t[0] * L / t[1] + t[2] * L / t[3], L) + "."; },
    uitleg: "Zoek een getal waar beide noemers in passen (de gemeenschappelijke noemer). 1/3 + 1/4: 3 en 4 passen allebei in 12. 1/3 = 4/12 en 1/4 = 3/12, samen 7/12.",
    voorbeeld: "2/5 + 1/3 = ?\n6/15 + 5/15 = 11/15.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_FREE_PLUS);
      var v = plus(p[0], p[1], p[2], p[3]);
      return fracQ("B", p[0] + "/" + p[1] + " + " + p[2] + "/" + p[3] + " =", v[0], v[1], [{ n: p[0] + p[2], d: p[1] + p[3] }], p);
    },
  },

  {
    id: "b25_min_algemeen",
    label: "Aftrekken, gemeenschappelijke noemer",
    group: G6,
    desc: "3/4 − 2/3 = 1/12",
    strategy: "gelijknamig maken",
    tip: function(t) { var L = t[1] * t[3] / gcd(t[1], t[3]); return "Gemeenschappelijke noemer " + L + ": " + raw(t[0] * L / t[1], L) + " " + MIN + " " + raw(t[2] * L / t[3], L) + " = " + fstr(t[0] * L / t[1] - t[2] * L / t[3], L) + "."; },
    uitleg: "Maak de breuken gelijknamig en trek dan de tellers af. 3/4 − 2/3: 9/12 − 8/12 = 1/12.",
    voorbeeld: "1/2 − 1/5 = ?\n5/10 − 2/10 = 3/10.",
    minCorrect: 12,
    make: function() {
      var p = pickFrom(ITEMS_FREE_MIN);
      var v = minus(p[0], p[1], p[2], p[3]);
      var wrong = p[0] !== p[2] ? { n: Math.abs(p[0] - p[2]), d: Math.abs(p[1] - p[3]) } : { n: 1, d: 12 };
      return fracQ("B", p[0] + "/" + p[1] + " " + MIN + " " + p[2] + "/" + p[3] + " =", v[0], v[1], [wrong], p);
    },
  },

  {
    id: "b26_plus_over_1",
    label: "Optellen met uitkomst groter dan 1",
    group: G6,
    desc: "5/6 + 1/2 = 1 1/3",
    strategy: "gelijknamig maken",
    tip: function(t) { var L = t[1] * t[3] / gcd(t[1], t[3]); var s = t[0] * L / t[1] + t[2] * L / t[3]; return raw(t[0] * L / t[1], L) + " + " + raw(t[2] * L / t[3], L) + " = " + s + "/" + L + " = " + mstr(s, L) + "."; },
    uitleg: "Maak gelijknamig, tel op, en haal de hele eruit. 5/6 + 1/2 = 5/6 + 3/6 = 8/6 = 1 2/6 = 1 1/3.",
    voorbeeld: "3/4 + 1/2 = ?\n3/4 + 2/4 = 5/4 = 1 1/4.",
    minCorrect: 12,
    make: function() {
      var p = pickFrom(ITEMS_OVER_1);
      var v = plus(p[0], p[1], p[2], p[3]);
      return fracQ("M", p[0] + "/" + p[1] + " + " + p[2] + "/" + p[3] + " =", v[0], v[1], [{ n: p[0] + p[2], d: p[1] + p[3] }], p);
    },
  },

  // ── BLOK 7: GEMENGDE GETALLEN ──────────────────────────────────

  {
    id: "b27_gemengd_zonder",
    label: "Gemengd optellen zonder overgang",
    group: G7,
    desc: "2 1/5 + 1 2/5 = 3 3/5",
    strategy: "apart optellen",
    tip: function(t) { return "Hele getallen: " + t[0] + " + " + t[2] + " = " + (t[0] + t[2]) + ". Breuken: " + t[1] + "/" + t[4] + " + " + t[3] + "/" + t[4] + " = " + fstr(t[1] + t[3], t[4]) + "."; },
    uitleg: "Tel de hele getallen en de breuken apart op. 2 1/5 + 1 2/5: 2 + 1 = 3 en 1/5 + 2/5 = 3/5. Samen 3 3/5.",
    voorbeeld: "1 1/4 + 2 2/4 = ?\n1 + 2 = 3, 1/4 + 2/4 = 3/4.\nAntwoord: 3 3/4.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_MIX_ZONDER);
      var w1 = p[0], r1 = p[1], w2 = p[2], r2 = p[3], b = p[4];
      var tot = (w1 + w2) * b + r1 + r2;
      var wrong = plus(w1 + w2, 1, r1 + r2, 2 * b);
      return fracQ("M", w1 + " " + r1 + "/" + b + " + " + w2 + " " + r2 + "/" + b + " =", tot, b, [{ n: wrong[0], d: wrong[1] }], p);
    },
  },

  {
    id: "b28_gemengd_met",
    label: "Gemengd optellen met overgang",
    group: G7,
    desc: "1 2/3 + 1 2/3 = 3 1/3",
    strategy: "overgang",
    tip: function(t) { var s = t[1] + t[3]; return "Breuken: " + t[1] + "/" + t[4] + " + " + t[3] + "/" + t[4] + " = " + s + "/" + t[4] + " = 1 " + fstr(s - t[4], t[4]) + ". Die hele komt bij " + (t[0] + t[2]) + "."; },
    uitleg: "Zijn de breuken samen meer dan 1, dan krijg je er een hele bij. 1 2/3 + 1 2/3: 1 + 1 = 2 en 2/3 + 2/3 = 4/3 = 1 1/3. Samen 3 1/3.",
    voorbeeld: "2 3/4 + 1 2/4 = ?\n3/4 + 2/4 = 5/4 = 1 1/4.\n2 + 1 + 1 1/4 = 4 1/4.",
    minCorrect: 12,
    make: function() {
      var p = pickFrom(ITEMS_MIX_MET);
      var w1 = p[0], r1 = p[1], w2 = p[2], r2 = p[3], b = p[4];
      var tot = (w1 + w2) * b + r1 + r2;
      // Typische fout: de hele uit de breuken vergeten
      return fracQ("M", w1 + " " + r1 + "/" + b + " + " + w2 + " " + r2 + "/" + b + " =", tot, b, [{ n: tot - b, d: b }], p);
    },
  },

  {
    id: "b29_gemengd_lenen",
    label: "Gemengd aftrekken met lenen",
    group: G7,
    desc: "3 1/4 − 1 3/4 = 1 1/2",
    strategy: "lenen",
    tip: function(t) {
      return t[1] + "/" + t[4] + " is kleiner dan " + t[3] + "/" + t[4] + ", en omdraaien mag niet. Leen 1 hele: " + t[0] + " " + t[1] + "/" + t[4] + " = " + (t[0] - 1) + " " + (t[1] + t[4]) + "/" + t[4] + ". Dan " + (t[0] - 1) + " " + (t[1] + t[4]) + "/" + t[4] + " " + MIN + " " + t[2] + " " + t[3] + "/" + t[4] + " = " + mstr((t[0] - t[2]) * t[4] + t[1] - t[3], t[4]) + ".";
    },
    uitleg: "Is de eerste breuk kleiner dan de tweede, leen dan 1 hele. 3 1/4 − 1 3/4: 3 1/4 = 2 5/4. Dan 2 5/4 − 1 3/4 = 1 2/4 = 1 1/2. Fout is: de breuken omdraaien (3/4 − 1/4) en 2 1/2 opschrijven.",
    voorbeeld: "4 1/5 − 2 3/5 = ?\n4 1/5 = 3 6/5.\n3 6/5 − 2 3/5 = 1 3/5.",
    minCorrect: 12,
    make: function() {
      var p = pickFrom(ITEMS_MIX_LENEN);
      var w1 = p[0], r1 = p[1], w2 = p[2], r2 = p[3], b = p[4];
      var tot = (w1 - w2) * b + r1 - r2;
      // Typische fout (fouttype 3): breuken omgedraaid afgetrokken in plaats van lenen
      return fracQ("M", w1 + " " + r1 + "/" + b + " " + MIN + " " + w2 + " " + r2 + "/" + b + " =", tot, b, [{ n: (w1 - w2) * b + (r2 - r1), d: b }], p);
    },
  },

  // ── BLOK 8: BREUK VAN EEN HOEVEELHEID ──────────────────────────

  {
    id: "b30_stambreuk_van",
    label: "Stambreuk van een getal",
    group: G8,
    desc: "1/4 van 20 = 5",
    strategy: "delen",
    tip: function(t) { return "1/" + t[0] + " van " + t[1] + " is " + t[1] + " : " + t[0] + " = " + (t[1] / t[0]) + "."; },
    uitleg: "1/4 van iets is dat ding in 4 gelijke delen verdelen en er één nemen. 1/4 van 20 = 20 : 4 = 5.",
    voorbeeld: "1/3 van 18 = ?\n18 : 3 = 6.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_STAM_VAN);
      var b = p[0], q = p[1], N = b * q;
      return intQ("1/" + b + " van " + N + " =", q, [N - b, N * b, b, q + 1, q - 1], [b, N]);
    },
  },

  {
    id: "b31_breuk_van",
    label: "Breuk van een getal",
    group: G8,
    desc: "3/4 van 20 = 15",
    strategy: "delen en vermenigvuldigen",
    tip: function(t) { var e = t[2] / t[1]; return "1/" + t[1] + " van " + t[2] + " = " + e + ". Dan " + t[0] + SP_TIMES + e + " = " + (t[0] * e) + "."; },
    uitleg: "Reken eerst 1 deel uit en neem dan zoveel delen als de teller zegt. 3/4 van 20: 20 : 4 = 5, en 3 × 5 = 15.",
    voorbeeld: "2/5 van 30 = ?\n30 : 5 = 6, 2 × 6 = 12.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_BREUK_VAN);
      var a = p[0], b = p[1], q = p[2], N = b * q;
      return intQ(a + "/" + b + " van " + N + " =", a * q, [q, N - a * q, a * q + 1, a * q - 1], [a, b, N]);
    },
  },

  {
    id: "b32_terugrekenen",
    label: "Terugrekenen",
    group: G8,
    desc: "3/5 van ? = 12",
    strategy: "terugrekenen",
    tip: function(t) { var e = t[2] / t[0]; return t[0] + " delen zijn " + t[2] + ", dus 1 deel is " + e + ". Alle " + t[1] + " delen: " + t[1] + SP_TIMES + e + " = " + (t[1] * e) + "."; },
    uitleg: "Weet je hoeveel een paar delen zijn, reken dan eerst 1 deel uit. 3/5 van ? = 12: 3 delen zijn 12, dus 1 deel is 4. Het geheel is 5 delen: 20.",
    voorbeeld: "2/3 van ? = 10\n1 deel = 5, 3 delen = 15.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_TERUG);
      var a = p[0], b = p[1], q = p[2], P = a * q;
      return intQ(a + "/" + b + " van ? = " + P, b * q, [P * a, P + b, q, b * q + 1, b * q - 1], [a, b, P]);
    },
  },

  {
    id: "b33_keer_breuk",
    label: "Geheel getal keer breuk",
    group: G8,
    desc: "4 × 2/3 = 2 2/3",
    strategy: "vermenigvuldigen",
    tip: function(t) { return t[0] + SP_TIMES + t[1] + "/" + t[2] + " = " + (t[0] * t[1]) + "/" + t[2] + " = " + mstr(t[0] * t[1], t[2]) + ". Alleen de teller gaat keer " + t[0] + "."; },
    uitleg: "Een breuk keer een geheel getal: vermenigvuldig alleen de teller. 4 × 2/3 = 8/3 = 2 2/3. De noemer blijft, want de stukken blijven even groot.",
    voorbeeld: "3 × 3/4 = ?\n9/4 = 2 1/4.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_KEER);
      var n = p[0], a = p[1], b = p[2];
      return fracQ("M", n + SP_TIMES + a + "/" + b + " =", n * a, b, [{ n: n * a, d: n * b }], p);
    },
  },

  // ── BLOK 9: TOEPASSEN EN CONTROLEREN ───────────────────────────

  {
    id: "b34_ontbrekende_teller",
    label: "Ontbrekende teller",
    group: G9,
    desc: "1/4 + ?/8 = 7/8",
    strategy: "redeneren",
    tip: function(t) { var m = t[2] / t[1]; return t[0] + "/" + t[1] + " = " + (t[0] * m) + "/" + t[2] + ". " + t[3] + " " + MIN + " " + (t[0] * m) + " = " + (t[3] - t[0] * m) + "."; },
    uitleg: "Maak eerst alles gelijknamig. 1/4 + ?/8 = 7/8: 1/4 = 2/8. Dan 2 + ? = 7, dus ? = 5.",
    voorbeeld: "1/3 + ?/6 = 5/6\n1/3 = 2/6, 5 − 2 = 3.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_TELLER);
      var a = p[0], b = p[1], d = p[2], e = p[3], x = e - a * (d / b);
      return intQ(a + "/" + b + " + ?/" + d + " = " + e + "/" + d, x, [e - a, x + 1, x - 1], p);
    },
  },

  {
    id: "b35_fout_spotten",
    label: "Fout spotten",
    group: G9,
    desc: "Welke som klopt niet?",
    strategy: "controleren",
    tip: function(t) {
      var s = t[0];
      if (t[1] === 1) return "Noemers tel je niet op. Maak eerst gelijknamig: " + raw(s[0], s[1]) + " + " + raw(s[2], s[3]) + " = " + fstr(plus(s[0], s[1], s[2], s[3])[0], plus(s[0], s[1], s[2], s[3])[1]) + ".";
      return "De breuk met de kleinste noemer moet eerst worden omgezet. Goed is: " + raw(s[0], s[1]) + " + " + raw(s[2], s[3]) + " = " + fstr(plus(s[0], s[1], s[2], s[3])[0], plus(s[0], s[1], s[2], s[3])[1]) + ".";
    },
    uitleg: "Controleer elke som: zijn de noemers gelijk gemaakt? Is alleen de teller opgeteld? Twee bekende fouten: noemers optellen (1/2 + 1/3 = 2/5, goed is 5/6), en de breuk niet omzetten (1/2 + 1/4 = 2/4, goed is 3/4).",
    voorbeeld: "Welke som is FOUT?\n1/2 + 1/3 = 2/5? Goed is 5/6, dus fout.",
    minCorrect: 8,
    make: function() {
      var w = pickFrom(FOUT);
      var type = w.type;
      var good = [];
      var seen = {};
      seen[w.s] = true;
      while (good.length < 3) {
        var g = pickFrom(GOED);
        if (!seen[g]) { seen[g] = true; good.push(g); }
      }
      return {
        terms:          [w.t, type],
        question:       "Welke som is FOUT?",
        answer:         w.s,
        choices:        shuffle([w.s].concat(good)),
        isErrorSpotter: true,
      };
    },
  },

  {
    id: "b36_schatten",
    label: "Schatten",
    group: G9,
    desc: "2 7/8 + 1 1/12 ≈ 4",
    strategy: "afronden",
    tip: function(t) { return "Rond elk getal af op een heel getal: " + mstr(t[0][0], t[0][1]) + " ≈ " + Math.round(t[0][0] / t[0][1]) + " en " + mstr(t[1][0], t[1][1]) + " ≈ " + Math.round(t[1][0] / t[1][1]) + "."; },
    uitleg: "Bij schatten rond je af op hele getallen. Een breukdeel dicht bij 1 (zoals 7/8) rond je naar boven af, dicht bij 0 (zoals 1/12) naar beneden. 2 7/8 + 1 1/12 ≈ 3 + 1 = 4.",
    voorbeeld: "Ongeveer: 3 1/8 + 1 5/6 ≈ ?\n3 + 2 = 5.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_SCHAT);
      var A = p[0], B = p[1], est = p[2];
      return intQ("Ongeveer: " + mstr(A[0], A[1]) + " + " + mstr(B[0], B[1]) + " " + APPROX + " ?", est, [est + 1, est - 1, est + 2, est - 2], [A, B]);
    },
  },
];

// Getallen lo..hi als lijst
function simpleRange(lo, hi) {
  var out = [];
  for (var i = lo; i <= hi; i++) out.push(i);
  return out;
}

// ─────────────────────────────────────────────────────────────────
// SKILLS MET VRAAGVERLOOP + b37 SNELHEIDSRONDE
// ─────────────────────────────────────────────────────────────────

var SKILLS = createSkills("breuken", RAW_SKILLS);
var MIXER  = createMixer(RAW_SKILLS, BLOCK_GROUPS, SKILLS.byId);

export var BREUK_SKILLS = SKILLS.list;

registerSkillId("breuken", "b37_snelheid");

BREUK_SKILLS.push({
  id:         "b37_snelheid",
  label:      "Snelheidsronde",
  group:      G10,
  desc:       "Gemengd: alle soorten breukensommen",
  strategy:   "snel",
  tip:        "Kijk eerst wat voor som het is en kies dan de handigste aanpak.",
  uitleg:     "In de snelheidsronde komen alle soorten breukensommen door elkaar voorbij. Kies per som de aanpak die je hebt geleerd.",
  voorbeeld:  "Gemengd, bijvoorbeeld:\n6/8 = ?, 1/2 + 1/4, 3/4 van 20",
  minCorrect: 15,
  generate:   MIXER.generate,
});

export var BREUK_ORDER = BREUK_SKILLS.map(function(s) { return s.id; });
