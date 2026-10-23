// Onderdeel Delen: skills, volgorde en deel-specifieke generatoren.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Het vraagverloop (rekenmoment, geschiedenis, subtypen, stapels, gemengde ronde) staat in ./flow.js.
// Elke skill trekt uit een vaste lijst van mogelijke sommen (vastgelegd in D1), zodat het aantal
// verschillende sommen exact bekend en toetsbaar is.
// Antwoord 0 komt alleen voor bij d05 (0 : n). Nooit delen door 0. Alleen gehele getallen;
// bij de rest-skills (d27, d28) is het antwoord een tekst als "5 rest 3".

import { rnd, shuffle } from "./helpers.js";
import {
  makeChoices, digitsOf, estimateChoices,
  registerSkillId, createSkills, createMixer, deckPick,
} from "./flow.js";

var DIV      = " : ";
var SP_TIMES = " × ";
var APPROX   = "≈";
var DOT      = "●";

// ─────────────────────────────────────────────────────────────────
// DEEL-SPECIFIEKE VRAAG-HELPERS
// ─────────────────────────────────────────────────────────────────

function plainQ(a, d, answer, extras) {
  return { terms: [a, d], question: a + DIV + d + " =", answer: answer, choices: makeChoices(answer, extras) };
}

function pickFrom(list) {
  return list[rnd(0, list.length - 1)];
}

// Lijst [deeltal, deler] voor alle delers in divs en uitkomsten qMin t/m qMax
function tableList(divs, qMin, qMax) {
  var items = [];
  divs.forEach(function(d) {
    for (var q = qMin; q <= qMax; q++) items.push([d * q, d]);
  });
  return items;
}

// Typische fouten bij een deeltafelsom: een rij ernaast, deeltal min deler, vermenigvuldigd
function divErrors(a, d) {
  var q = a / d;
  return [q + 1, q - 1, a - d, a * d];
}

function tableDivQ(skillId, items) {
  var p = deckPick(skillId, items);
  return plainQ(p[0], p[1], p[0] / p[1], divErrors(p[0], p[1]));
}

// Overloop: bij cijfer voor cijfer delen (van links) blijft na een tussenstap een rest over
function hasOverloop(a, d) {
  var ds = digitsOf(a).reverse();
  var r  = 0;
  for (var i = 0; i < ds.length - 1; i++) {
    r = (r * 10 + ds[i]) % d;
    if (r !== 0) return true;
  }
  return false;
}

// Typische fout bij overloop: elk cijfer los delen en de rest vergeten
function forgetOverloop(a, d) {
  var ds = digitsOf(a).reverse();
  var r  = 0;
  for (var i = 0; i < ds.length; i++) r = r * 10 + Math.floor(ds[i] / d);
  return r;
}

// Typische fout zonder overloop: één cijfer niet gedeeld (alleen cijfers die niet 0 zijn)
function notDivided(a, d) {
  var da  = digitsOf(a);
  var dq  = digitsOf(a / d);
  var out = [];
  for (var i = 0; i < da.length; i++) {
    if (da[i] === 0) continue;
    var r = 0;
    var p = 1;
    for (var j = 0; j < da.length; j++) {
      r += (j === i ? da[j] : (dq[j] || 0)) * p;
      p *= 10;
    }
    out.push(r);
  }
  return out;
}

// Typische fout bij hapjes: de 0 in het midden van de uitkomst vergeten
function dropZero(q) {
  var s = String(q).replace(/0+$/, "");
  var t = String(q).slice(0, s.length).replace(/0/g, "") + String(q).slice(s.length);
  return Number(t);
}

function restStr(q, r) {
  return q + " rest " + r;
}

// Rest-antwoord: vier unieke teksten; de typische fouten gaan voor
function restQ(a, d) {
  var q      = Math.floor(a / d);
  var r      = a % d;
  var answer = restStr(q, r);
  var cands  = [];
  // Rest groter dan de deler (er past nog een groepje in)
  if (q - 1 >= 1) cands.push(restStr(q - 1, r + d));
  cands.push(restStr(q, r + 1));
  cands.push(restStr(q + 1, r));
  if (r - 1 >= 1) cands.push(restStr(q, r - 1));
  cands.push(restStr(q + 2, r));
  cands.push(restStr(q, r + 2));
  var wrong = [];
  var seen  = {};
  seen[answer] = true;
  for (var i = 0; i < cands.length && wrong.length < 3; i++) {
    if (!seen[cands[i]]) { seen[cands[i]] = true; wrong.push(cands[i]); }
  }
  return { terms: [a, d], question: a + DIV + d + " =", answer: answer, choices: shuffle([answer].concat(wrong)) };
}

// Fout spotten: vier verschillende deeltafelsommen, precies één met een typische fout
function makeDeelFout() {
  var used = {};
  var sums = [];
  while (sums.length < 4) {
    var d = rnd(2, 9);
    var q = rnd(2, 9);
    var k = d + "_" + q;
    if (used[k]) continue;
    used[k] = true;
    sums.push([d * q, d, q]);
  }
  var w        = sums[0];
  var wrongVal = [w[2] + 1, w[2] - 1, w[2] * 10][rnd(0, 2)];
  var wrongStr = w[0] + DIV + w[1] + " = " + wrongVal;
  var others   = sums.slice(1).map(function(s) { return s[0] + DIV + s[1] + " = " + s[2]; });
  return {
    question:       "Welke som is FOUT?",
    answer:         wrongStr,
    choices:        shuffle([wrongStr].concat(others)),
    isErrorSpotter: true,
  };
}

// ─────────────────────────────────────────────────────────────────
// VASTE LIJSTEN MET MOGELIJKE SOMMEN (D1)
// ─────────────────────────────────────────────────────────────────

var D2_TO_9 = [2, 3, 4, 5, 6, 7, 8, 9];

var ITEMS_VERDELEN = tableList([2, 3, 4, 5], 2, 10);
var ITEMS_OMGEKEERD = tableList([2, 3, 4, 5, 10], 2, 10);

var ITEMS_ROOSTER = [];
for (var rr = 2; rr <= 5; rr++) { for (var rc = 2; rc <= 5; rc++) { ITEMS_ROOSTER.push([rr, rc]); } }

var ITEMS_REGELS = [[], [], []];
for (var rn = 2; rn <= 10; rn++) { ITEMS_REGELS[0].push([rn, 1]); ITEMS_REGELS[1].push([rn, rn]); }
for (var rz = 1; rz <= 10; rz++) { ITEMS_REGELS[2].push([0, rz]); }

var ITEMS_MIX_BASIS = tableList([1, 2, 5, 10], 1, 10);
var ITEMS_MIX_T_M_5 = tableList([2, 3, 4, 5, 10], 1, 10);
var ITEMS_GEMENGD   = [tableList([2, 3, 4, 5], 2, 9), tableList([6, 7, 8, 9], 2, 9)];
var ITEMS_2_9       = tableList(D2_TO_9, 2, 9);

var ITEMS_DOOR_10_100 = [tableList([10], 2, 99), tableList([100], 2, 99), tableList([1000], 2, 9)];

var ITEMS_ROND_EEN  = [[], []];
var ITEMS_ROND_ROND = [[], []];
D2_TO_9.forEach(function(d) {
  for (var q = 2; q <= 9; q++) {
    ITEMS_ROND_EEN[0].push([d * q * 10, d]);
    ITEMS_ROND_EEN[1].push([d * q * 100, d]);
    ITEMS_ROND_ROND[0].push([d * q * 100, d * 10]);
    ITEMS_ROND_ROND[1].push([d * q * 10, d * 10]);
  }
});

// d23 splitsen zonder overloop en d30 met overloop: tweecijferig, uitkomst minstens 11
var ITEMS_SPLITSEN = [];
var ITEMS_TWEE_MET = [];
D2_TO_9.forEach(function(d) {
  for (var a = 10; a <= 99; a++) {
    if (a % d !== 0 || a / d < 11) continue;
    var tens  = Math.floor(a / 10);
    var units = a % 10;
    if (hasOverloop(a, d)) ITEMS_TWEE_MET.push([a, d]);
    else if (units > 0 && tens % d === 0 && units % d === 0) ITEMS_SPLITSEN.push([a, d]);
  }
});

var ITEMS_HALVEREN = [];
for (var h4 = 100; h4 <= 200; h4 += 4) ITEMS_HALVEREN.push([h4, 4]);
for (var h8 = 104; h8 <= 200; h8 += 8) ITEMS_HALVEREN.push([h8, 8]);

var ITEMS_DOOR_5     = tableList([5], 11, 50);
var ITEMS_20_25_50   = tableList([20, 25, 50], 2, 20);
var ITEMS_TWEECIJFER = tableList([11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 24], 2, 20);

// Per deler een lijst: eerst de deler kiezen (elke deler even vaak), dan een som
var REST_TAFEL = {};
var REST_GROOT = {};
var ALLEEN_REST = {};
var DRIE_ZONDER = [];
var DRIE_MET    = {};
var SCHATTEN    = {};
var MISSEND_GROOT = [];
D2_TO_9.forEach(function(d) {
  REST_TAFEL[d] = [];
  for (var q = 1; q <= 9; q++) { for (var r = 1; r < d; r++) REST_TAFEL[d].push([d * q + r, d]); }

  if (d >= 3) {
    REST_GROOT[d] = [];
    for (var g = 50; g <= 99; g++) { if (g % d !== 0) REST_GROOT[d].push([g, d]); }
  }

  ALLEEN_REST[d] = [];
  for (var n = 10; n <= 99; n++) { if (n % d !== 0) ALLEEN_REST[d].push([n, d]); }

  DRIE_MET[d] = [];
  for (var t = 100; t <= 999; t++) {
    if (t % d !== 0) continue;
    if (hasOverloop(t, d)) { if (t % 10 !== 0) DRIE_MET[d].push([t, d]); }
    else if (t % 100 !== 0) DRIE_ZONDER.push([t, d]);
  }

  SCHATTEN[d] = [];
  for (var sq = 2; sq <= 9; sq++) {
    [-4, -3, -2, -1, 1, 2, 3, 4].forEach(function(o) {
      var s = d * sq * 10 + o;
      if (s % d !== 0) SCHATTEN[d].push([s, d]);
    });
  }

  for (var mq = 11; mq <= 99; mq++) { if (mq % 10 !== 0) MISSEND_GROOT.push([d, mq]); }
});

function pickPerDeler(byDeler) {
  var keys = Object.keys(byDeler);
  return pickFrom(byDeler[keys[rnd(0, keys.length - 1)]]);
}

// ─────────────────────────────────────────────────────────────────
// SKILL DEFINITIONS
// ─────────────────────────────────────────────────────────────────

var G1  = "Begrijpen";
var G2  = "Basisdeeltafels";
var G3  = "Deeltafels 3 en 4";
var G4  = "Deeltafels 6 tot en met 9";
var G5  = "Omgekeerd";
var G6  = "Nullen en plaatswaarde";
var G7  = "Slim rekenen";
var G8  = "Delen met rest";
var G9  = "Grotere getallen";
var G10 = "Schatten en controleren";
var G11 = "Slot";

var BLOCK_GROUPS = [G1, G2, G3, G4, G5, G6, G7, G8, G9, G10];

function tableTip(n) {
  return function(t) { return "Zoek in de tafel van " + n + ": welk getal keer " + n + " is " + t[0] + "? " + (t[0] / n) + SP_TIMES + n + " = " + t[0] + "."; };
}

var RAW_SKILLS = [

  // ── BLOK 1: BEGRIJPEN ──────────────────────────────────────────

  {
    id: "d01_eerlijk_verdelen",
    label: "Eerlijk verdelen",
    group: G1,
    desc: "12 verdelen over 3 = ?",
    strategy: "verdelen",
    tip: function(t) { return "Verdeel " + t[0] + " eerlijk over " + t[1] + ": ieder krijgt " + (t[0] / t[1]) + ", want " + t[1] + SP_TIMES + (t[0] / t[1]) + " = " + t[0] + "."; },
    uitleg: "Delen is eerlijk verdelen: iedereen krijgt evenveel. 12 snoepjes verdelen over 3 kinderen: ieder krijgt er 4. Dat schrijf je als 12 : 3 = 4.",
    voorbeeld: "15 verdelen over 3 = ?\nIeder krijgt 5, want 3 × 5 = 15.\nDus 15 : 3 = 5.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_VERDELEN);
      var q = p[0] / p[1];
      return { terms: [p[0], p[1]], question: p[0] + " verdelen over " + p[1] + " = ?", answer: q, choices: makeChoices(q, [p[0] - p[1], q + 1, q - 1]) };
    },
  },

  {
    id: "d02_groepjes_maken",
    label: "Groepjes maken",
    group: G1,
    desc: "12 = ? groepjes van 4",
    strategy: "groepjes",
    tip: function(t) { return "Hoe vaak past " + t[1] + " in " + t[0] + "? " + (t[0] / t[1]) + " groepjes van " + t[1] + " is " + t[0] + "."; },
    uitleg: "Delen is ook: hoe vaak past het erin? 12 knikkers in groepjes van 4 geeft 3 groepjes. Dat schrijf je als 12 : 4 = 3.",
    voorbeeld: "20 = ? groepjes van 5\n5, 10, 15, 20: dat zijn 4 groepjes.\nDus 20 : 5 = 4.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_VERDELEN);
      var q = p[0] / p[1];
      return { terms: [p[0], p[1]], question: p[0] + " = ? groepjes van " + p[1], answer: q, choices: makeChoices(q, [p[1], q + 1, q - 1]) };
    },
  },

  {
    id: "d03_omgekeerd_maal",
    label: "Omgekeerd vermenigvuldigen",
    group: G1,
    desc: "3 × 4 = 12, dus 12 : 4 = ?",
    strategy: "terugrekenen",
    tip: function(t) { var q = t[0] / t[1]; return q + SP_TIMES + t[1] + " = " + t[0] + ", dus " + t[0] + DIV + t[1] + " = " + q + "."; },
    uitleg: "Delen is vermenigvuldigen andersom. Weet je dat 3 × 4 = 12, dan weet je ook 12 : 4 = 3 en 12 : 3 = 4.",
    voorbeeld: "5 × 6 = 30, dus 30 : 6 = ?\nAntwoord: 5.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_OMGEKEERD);
      var q = p[0] / p[1];
      return { terms: [p[0], p[1]], question: q + SP_TIMES + p[1] + " = " + p[0] + ", dus " + p[0] + DIV + p[1] + " = ?", answer: q, choices: makeChoices(q, [p[1], q + 1, q - 1]) };
    },
  },

  {
    id: "d04_rooster",
    label: "Rooster verdelen",
    group: G1,
    desc: "12 stippen in rijen van 4",
    strategy: "rooster",
    tip: function(t) { return "Tel de rijen van " + t[1] + ": het zijn er " + (t[0] / t[1]) + ". Dus " + t[0] + DIV + t[1] + " = " + (t[0] / t[1]) + "."; },
    uitleg: "In een rooster staan de stippen in gelijke rijen. 12 stippen in rijen van 4 zijn 3 rijen: 12 : 4 = 3.",
    voorbeeld: "● ● ● ●\n● ● ● ●\n● ● ● ●\n12 : 4 = 3 rijen.",
    minCorrect: 8,
    deck: true,
    make: function() {
      var p = deckPick("d04_rooster", ITEMS_ROOSTER);
      var row = [];
      for (var i = 0; i < p[1]; i++) row.push(DOT);
      var rows = [];
      for (var j = 0; j < p[0]; j++) rows.push(row.join(" "));
      var total = p[0] * p[1];
      return { terms: [total, p[1]], question: rows.join("\n") + "\n" + total + DIV + p[1] + " = ?", answer: p[0], choices: makeChoices(p[0], [p[1], p[0] + 1, p[0] - 1, total]) };
    },
  },

  // ── BLOK 2: BASISDEELTAFELS ────────────────────────────────────

  {
    id: "d05_regels",
    label: "Delen door 1 en door zichzelf",
    group: G2,
    desc: "7 : 1 = 7, 7 : 7 = 1, 0 : 7 = 0",
    strategy: "patroon",
    tip: function(t) {
      if (t[0] === 0) return "0 verdelen geeft niets: 0 : " + t[1] + " = 0.";
      if (t[1] === 1) return "Delen door 1 verandert niets: " + t[0] + " : 1 = " + t[0] + ".";
      return "Een getal gedeeld door zichzelf is 1: " + t[0] + " past precies 1 keer in " + t[0] + ".";
    },
    uitleg: "Drie regels: delen door 1 verandert niets (7 : 1 = 7). Een getal gedeeld door zichzelf is 1 (7 : 7 = 1). En 0 verdelen geeft altijd 0 (0 : 7 = 0).",
    voorbeeld: "9 : 1 = 9\n9 : 9 = 1\n0 : 9 = 0",
    minCorrect: 8,
    subtypes: 3,
    // Subtypen: door 1, door zichzelf, 0 gedeeld door een getal
    make: function(sub) {
      var p = pickFrom(ITEMS_REGELS[sub]);
      var q = p[0] / p[1];
      var extras = sub === 0 ? [1, 0, q + 1] : sub === 1 ? [p[0], 0, 2] : [p[1], 1, 10];
      return plainQ(p[0], p[1], q, extras);
    },
  },

  {
    id: "d06_deeltafel_2",
    label: "Delen door 2",
    group: G2,
    desc: "Halveren",
    strategy: "halveren",
    tip: function(t) { return "Delen door 2 is halveren: de helft van " + t[0] + " is " + (t[0] / 2) + "."; },
    uitleg: "Delen door 2 is de helft nemen: 14 : 2 = 7, want 7 + 7 = 14.",
    voorbeeld: "16 : 2 = ?\nDe helft van 16 is 8.\nAntwoord: 8.",
    minCorrect: 8,
    deck: true,
    make: function() { return tableDivQ("d06_deeltafel_2", tableList([2], 1, 10)); },
  },

  {
    id: "d07_deeltafel_10",
    label: "Delen door 10",
    group: G2,
    desc: "Een nul eraf",
    strategy: "patroon",
    tip: function(t) { return "Delen door 10: de 0 aan het eind gaat eraf. " + t[0] + " wordt " + (t[0] / 10) + "."; },
    uitleg: "Delen door 10 maakt een getal 10 keer zo klein: de 0 aan het eind gaat eraf. 70 : 10 = 7.",
    voorbeeld: "60 : 10 = ?\nDe 0 eraf: 6.",
    minCorrect: 8,
    deck: true,
    make: function() { return tableDivQ("d07_deeltafel_10", tableList([10], 1, 10)); },
  },

  {
    id: "d08_deeltafel_5",
    label: "Delen door 5",
    group: G2,
    desc: "Tellen in sprongen van 5",
    strategy: "tafel",
    tip: function(t) { return "Hoe vaak 5 is " + t[0] + "? " + (t[0] / 5) + SP_TIMES + "5 = " + t[0] + "."; },
    uitleg: "Bij delen door 5 zoek je in de tafel van 5: 35 : 5 = 7, want 7 × 5 = 35. Tip: het dubbele van de uitkomst is het deeltal zonder de 0 (35 : 5 → 70 : 10 = 7).",
    voorbeeld: "40 : 5 = ?\n8 × 5 = 40.\nAntwoord: 8.",
    minCorrect: 8,
    deck: true,
    make: function() { return tableDivQ("d08_deeltafel_5", tableList([5], 1, 10)); },
  },

  {
    id: "d09_mix_basis",
    label: "Basisdeeltafels door elkaar",
    group: G2,
    desc: "Delen door 1, 2, 5 en 10 gemengd",
    strategy: "tafels",
    tip: function(t) { return "Welke tafel hoort erbij? " + (t[0] / t[1]) + SP_TIMES + t[1] + " = " + t[0] + "."; },
    uitleg: "Nu komen de basisdeeltafels door elkaar. Kijk eerst door welk getal je deelt en zoek dan in die tafel.",
    voorbeeld: "18 : 2 = 9\n45 : 5 = 9\n90 : 10 = 9",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_MIX_BASIS);
      return plainQ(p[0], p[1], p[0] / p[1], divErrors(p[0], p[1]));
    },
  },

  // ── BLOK 3: DEELTAFELS 3 EN 4 ──────────────────────────────────

  {
    id: "d10_deeltafel_3",
    label: "Delen door 3",
    group: G3,
    desc: "Deeltafel van 3",
    strategy: "tafel",
    tip: tableTip(3),
    uitleg: "Bij delen door 3 zoek je in de tafel van 3: 21 : 3 = 7, want 7 × 3 = 21.",
    voorbeeld: "24 : 3 = ?\n8 × 3 = 24.\nAntwoord: 8.",
    minCorrect: 8,
    deck: true,
    make: function() { return tableDivQ("d10_deeltafel_3", tableList([3], 1, 10)); },
  },

  {
    id: "d11_deeltafel_4",
    label: "Delen door 4",
    group: G3,
    desc: "Twee keer halveren",
    strategy: "halveren",
    tip: function(t) { return "Delen door 4 is twee keer halveren: " + t[0] + " → " + (t[0] / 2) + " → " + (t[0] / 4) + "."; },
    uitleg: "4 is 2 × 2. Delen door 4 is dus twee keer halveren: 28 : 4: de helft van 28 is 14, de helft van 14 is 7.",
    voorbeeld: "32 : 4 = ?\n32 → 16 → 8.\nAntwoord: 8.",
    minCorrect: 8,
    deck: true,
    make: function() { return tableDivQ("d11_deeltafel_4", tableList([4], 1, 10)); },
  },

  {
    id: "d12_mix_t_m_5",
    label: "Deeltafels t/m 5 en 10",
    group: G3,
    desc: "Delen door 2, 3, 4, 5 en 10 gemengd",
    strategy: "tafels",
    tip: function(t) { return "Zoek in de tafel van " + t[1] + ": " + (t[0] / t[1]) + SP_TIMES + t[1] + " = " + t[0] + "."; },
    uitleg: "Alle deeltafels die je tot nu toe kent komen door elkaar: delen door 2, 3, 4, 5 en 10.",
    voorbeeld: "27 : 3 = 9\n28 : 4 = 7\n40 : 10 = 4",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_MIX_T_M_5);
      return plainQ(p[0], p[1], p[0] / p[1], divErrors(p[0], p[1]));
    },
  },

  // ── BLOK 4: DEELTAFELS 6 TOT EN MET 9 ──────────────────────────

  {
    id: "d13_deeltafel_6",
    label: "Delen door 6",
    group: G4,
    desc: "Deeltafel van 6",
    strategy: "tafel",
    tip: tableTip(6),
    uitleg: "Bij delen door 6 zoek je in de tafel van 6: 42 : 6 = 7, want 7 × 6 = 42.",
    voorbeeld: "48 : 6 = ?\n8 × 6 = 48.\nAntwoord: 8.",
    minCorrect: 8,
    deck: true,
    make: function() { return tableDivQ("d13_deeltafel_6", tableList([6], 1, 10)); },
  },

  {
    id: "d14_deeltafel_7",
    label: "Delen door 7",
    group: G4,
    desc: "Deeltafel van 7",
    strategy: "tafel",
    tip: tableTip(7),
    uitleg: "Bij delen door 7 zoek je in de tafel van 7: 56 : 7 = 8, want 8 × 7 = 56.",
    voorbeeld: "42 : 7 = ?\n6 × 7 = 42.\nAntwoord: 6.",
    minCorrect: 8,
    deck: true,
    make: function() { return tableDivQ("d14_deeltafel_7", tableList([7], 1, 10)); },
  },

  {
    id: "d15_deeltafel_8",
    label: "Delen door 8",
    group: G4,
    desc: "Drie keer halveren",
    strategy: "halveren",
    tip: function(t) { return "Delen door 8 is drie keer halveren: " + t[0] + " → " + (t[0] / 2) + " → " + (t[0] / 4) + " → " + (t[0] / 8) + "."; },
    uitleg: "8 is 2 × 2 × 2. Delen door 8 is dus drie keer halveren: 56 → 28 → 14 → 7. Of zoek in de tafel van 8.",
    voorbeeld: "64 : 8 = ?\n64 → 32 → 16 → 8.\nAntwoord: 8.",
    minCorrect: 8,
    deck: true,
    make: function() { return tableDivQ("d15_deeltafel_8", tableList([8], 1, 10)); },
  },

  {
    id: "d16_deeltafel_9",
    label: "Delen door 9",
    group: G4,
    desc: "Deeltafel van 9",
    strategy: "tafel",
    tip: tableTip(9),
    uitleg: "Bij delen door 9 zoek je in de tafel van 9: 63 : 9 = 7, want 7 × 9 = 63.",
    voorbeeld: "54 : 9 = ?\n6 × 9 = 54.\nAntwoord: 6.",
    minCorrect: 8,
    deck: true,
    make: function() { return tableDivQ("d16_deeltafel_9", tableList([9], 1, 10)); },
  },

  {
    id: "d17_gemengd_2_9",
    label: "Gemengde deeltafels 2–9",
    group: G4,
    desc: "Delen door 2 tot en met 9 gemengd",
    strategy: "tafels",
    tip: function(t) { return "Zoek in de tafel van " + t[1] + ": " + (t[0] / t[1]) + SP_TIMES + t[1] + " = " + t[0] + "."; },
    uitleg: "Alle deeltafels van 2 tot en met 9 komen door elkaar. Ken je een som niet meteen, denk dan aan de maalsom: 56 : 8 = 7, want 7 × 8 = 56.",
    voorbeeld: "56 : 8 = 7\n54 : 6 = 9\n28 : 4 = 7",
    minCorrect: 12,
    subtypes: 2,
    // Subtypen: deler 2-5, deler 6-9
    make: function(sub) {
      var p = pickFrom(ITEMS_GEMENGD[sub]);
      return plainQ(p[0], p[1], p[0] / p[1], divErrors(p[0], p[1]));
    },
  },

  // ── BLOK 5: OMGEKEERD ──────────────────────────────────────────

  {
    id: "d18_missend_deeltal",
    label: "Missend deeltal",
    group: G5,
    desc: "? : 6 = 7",
    strategy: "terugrekenen",
    tip: function(t) { return "Reken terug met keer: " + t[1] + SP_TIMES + t[0] + " = " + (t[0] * t[1]) + "."; },
    uitleg: "Bij ? : 6 = 7 zoek je het getal dat je deelt. Reken terug met vermenigvuldigen: 7 × 6 = 42, dus 42 : 6 = 7.",
    voorbeeld: "? : 8 = 4\n4 × 8 = 32.\nAntwoord: 32.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_2_9);
      var d = p[1];
      var q = p[0] / d;
      return { terms: [d, q], question: "?" + DIV + d + " = " + q, answer: p[0], choices: makeChoices(p[0], [d + q, p[0] + d, p[0] - d]) };
    },
  },

  {
    id: "d19_missende_deler",
    label: "Missende deler",
    group: G5,
    desc: "42 : ? = 6",
    strategy: "terugrekenen",
    tip: function(t) { return "Welk getal keer " + t[1] + " is " + t[0] + "? " + (t[0] / t[1]) + SP_TIMES + t[1] + " = " + t[0] + "."; },
    uitleg: "Bij 42 : ? = 6 zoek je door welk getal je deelt. Denk aan de tafel van 6: 7 × 6 = 42, dus 42 : 7 = 6.",
    voorbeeld: "35 : ? = 5\n7 × 5 = 35.\nAntwoord: 7.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_2_9);
      var d = p[1];
      var q = p[0] / d;
      return { terms: [p[0], q], question: p[0] + DIV + "? = " + q, answer: d, choices: makeChoices(d, [q, d + 1, d - 1]) };
    },
  },

  // ── BLOK 6: NULLEN EN PLAATSWAARDE ─────────────────────────────

  {
    id: "d20_door_10_100_1000",
    label: "Delen door 10, 100 en 1000",
    group: G6,
    desc: "560 : 10, 3400 : 100, 7000 : 1000",
    strategy: "plaatswaarde",
    tip: function(t) { var z = String(t[1]).length - 1; return "Delen door " + t[1] + ": er " + (z === 1 ? "gaat één 0" : "gaan " + z + " nullen") + " af. " + t[0] + " wordt " + (t[0] / t[1]) + "."; },
    uitleg: "Delen door 10 maakt een getal 10 keer zo klein: één 0 eraf. Door 100: twee nullen eraf. Door 1000: drie nullen eraf. 3400 : 100 = 34.",
    voorbeeld: "560 : 10 = 56\n3400 : 100 = 34\n7000 : 1000 = 7",
    minCorrect: 8,
    subtypes: 3,
    // Subtypen: door 10, door 100, door 1000
    make: function(sub) {
      var p = pickFrom(ITEMS_DOOR_10_100[sub]);
      var q = p[0] / p[1];
      return plainQ(p[0], p[1], q, [q * 10, q + 1, q - 1, q * 100]);
    },
  },

  {
    id: "d21_rond_door_een",
    label: "Rond getal delen",
    group: G6,
    desc: "240 : 6, 3500 : 7",
    strategy: "plaatswaarde",
    tip: function(t) {
      var z = t[0] % 100 === 0 && (t[0] / 100) % t[1] === 0 ? 100 : 10;
      return (t[0] / z) + DIV + t[1] + " = " + (t[0] / z / t[1]) + ", en dan " + (z === 10 ? "de 0" : "de twee nullen") + " erachter: " + (t[0] / t[1]) + ".";
    },
    uitleg: "240 : 6 is 24 tientallen gedeeld door 6 = 4 tientallen = 40. Reken dus 24 : 6 = 4 en zet de 0 erachter.",
    voorbeeld: "3500 : 7 = ?\n35 : 7 = 5, twee nullen erachter: 500.",
    minCorrect: 8,
    subtypes: 2,
    // Subtypen: tientallen (240 : 6), honderdtallen (3500 : 7)
    make: function(sub) {
      var p = pickFrom(ITEMS_ROND_EEN[sub]);
      var q = p[0] / p[1];
      return plainQ(p[0], p[1], q, [q / 10, q * 10, q + 10]);
    },
  },

  {
    id: "d22_rond_door_rond",
    label: "Rond gedeeld door rond",
    group: G6,
    desc: "2400 : 60, 240 : 60",
    strategy: "nullen wegstrepen",
    tip: function(t) { return "Streep bij allebei één 0 weg: " + (t[0] / 10) + DIV + (t[1] / 10) + " = " + (t[0] / t[1]) + "."; },
    uitleg: "Streep bij beide getallen evenveel nullen weg: de uitkomst blijft gelijk. 2400 : 60 = 240 : 6 = 40. Let op: alleen nullen wegstrepen die bij allebei staan.",
    voorbeeld: "2400 : 60 = ?\nStreep een 0 weg: 240 : 6 = 40.\nAntwoord: 40.",
    minCorrect: 12,
    subtypes: 2,
    // Subtypen: 2400 : 60, 240 : 60
    make: function(sub) {
      var p = pickFrom(ITEMS_ROND_ROND[sub]);
      var q = p[0] / p[1];
      var extras = [q * 10];
      if (q % 10 === 0) extras.push(q / 10);
      extras.push(q + 1, q - 1);
      return plainQ(p[0], p[1], q, extras);
    },
  },

  // ── BLOK 7: SLIM REKENEN ───────────────────────────────────────

  {
    id: "d23_splitsen",
    label: "Splitsen",
    group: G7,
    desc: "84 : 4 = 80 : 4 + 4 : 4",
    strategy: "splitsen",
    tip: function(t) { var tt = Math.floor(t[0] / 10) * 10; var e = t[0] - tt; return t[0] + DIV + t[1] + " = " + tt + DIV + t[1] + " + " + e + DIV + t[1] + " = " + (tt / t[1]) + " + " + (e / t[1]) + " = " + (t[0] / t[1]) + "."; },
    uitleg: "Splits het getal in tientallen en eenheden en deel ze apart. 84 : 4 = 80 : 4 + 4 : 4 = 20 + 1 = 21.",
    voorbeeld: "63 : 3 = ?\n60 : 3 = 20, 3 : 3 = 1.\nAntwoord: 21.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_SPLITSEN);
      var q = p[0] / p[1];
      return plainQ(p[0], p[1], q, [q + 10, q - 10, q + 1, q - 1]);
    },
  },

  {
    id: "d24_halveren",
    label: "Halveren en nog eens halveren",
    group: G7,
    desc: "136 : 4, 168 : 8",
    strategy: "halveren",
    tip: function(t) {
      var s = t[0] + " → " + (t[0] / 2) + " → " + (t[0] / 4);
      if (t[1] === 8) s += " → " + (t[0] / 8);
      return (t[1] === 4 ? "Twee" : "Drie") + " keer halveren: " + s + ".";
    },
    uitleg: "Delen door 4 is twee keer halveren, delen door 8 drie keer. 136 : 4: 136 → 68 → 34. Zo deel je ook grote getallen uit je hoofd.",
    voorbeeld: "168 : 8 = ?\n168 → 84 → 42 → 21.\nAntwoord: 21.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_HALVEREN);
      var q = p[0] / p[1];
      // Typische fout: een keer te weinig gehalveerd
      return plainQ(p[0], p[1], q, [q * 2, q + 1, q - 1]);
    },
  },

  {
    id: "d25_door_5",
    label: "Delen door 5 via 10",
    group: G7,
    desc: "85 : 5 = 170 : 10",
    strategy: "verdubbelen",
    tip: function(t) { return "Verdubbel allebei: " + t[0] + DIV + "5 = " + (t[0] * 2) + DIV + "10 = " + (t[0] / 5) + "."; },
    uitleg: "Verdubbel je beide getallen, dan blijft de uitkomst gelijk. 85 : 5 = 170 : 10 = 17. Delen door 10 is makkelijk: de 0 eraf.",
    voorbeeld: "95 : 5 = ?\n190 : 10 = 19.\nAntwoord: 19.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_DOOR_5);
      var q = p[0] / 5;
      var extras = [p[0] * 2];
      if (q % 2 === 0) extras.push(q / 2);
      extras.push(q + 1, q - 1);
      return plainQ(p[0], 5, q, extras);
    },
  },

  {
    id: "d26_door_20_25_50",
    label: "Delen door 20, 25 en 50",
    group: G7,
    desc: "140 : 20, 300 : 25, 350 : 50",
    strategy: "slim rekenen",
    tip: function(t) {
      if (t[1] === 25) return "25 past 4 keer in 100. " + t[0] + DIV + "25 = " + (t[0] / 25) + ".";
      if (t[1] === 50) return "50 past 2 keer in 100. " + t[0] + DIV + "50 = " + (t[0] / 50) + ".";
      return "Streep een 0 weg: " + (t[0] / 10) + DIV + "2 = " + (t[0] / 20) + ".";
    },
    uitleg: "Gebruik wat je weet: 25 past 4 keer in 100 en 50 past 2 keer in 100. 300 : 25 = 3 × 4 = 12. Bij delen door 20: streep een 0 weg en halveer.",
    voorbeeld: "300 : 25 = ?\n100 : 25 = 4, dus 300 : 25 = 12.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_20_25_50);
      var q = p[0] / p[1];
      var extras = [q * 2];
      if (q % 2 === 0) extras.push(q / 2);
      extras.push(q + 1, q - 1);
      return plainQ(p[0], p[1], q, extras);
    },
  },

  // ── BLOK 8: DELEN MET REST ─────────────────────────────────────

  {
    id: "d27_rest_tafel",
    label: "Delen met rest",
    group: G8,
    desc: "23 : 4 = 5 rest 3",
    strategy: "rest",
    tip: function(t) { var q = Math.floor(t[0] / t[1]); return q + SP_TIMES + t[1] + " = " + (q * t[1]) + ", er blijft " + (t[0] - q * t[1]) + " over. Dus " + q + " rest " + (t[0] - q * t[1]) + "."; },
    uitleg: "Past het niet precies, dan blijft er iets over: de rest. 23 : 4: 5 × 4 = 20, er blijft 3 over. Dus 23 : 4 = 5 rest 3. De rest is altijd kleiner dan het getal waardoor je deelt.",
    voorbeeld: "17 : 5 = ?\n3 × 5 = 15, er blijft 2 over.\nAntwoord: 3 rest 2.",
    minCorrect: 8,
    make: function() {
      var p = pickPerDeler(REST_TAFEL);
      return restQ(p[0], p[1]);
    },
  },

  {
    id: "d28_rest_groot",
    label: "Grotere getallen met rest",
    group: G8,
    desc: "87 : 4 = 21 rest 3",
    strategy: "rest",
    tip: function(t) { var q = Math.floor(t[0] / t[1]); return q + SP_TIMES + t[1] + " = " + (q * t[1]) + ", er blijft " + (t[0] - q * t[1]) + " over."; },
    uitleg: "Zoek het grootste getal dat in de tafel past en kijk wat er overblijft. 87 : 4: 21 × 4 = 84, er blijft 3 over. Dus 21 rest 3.",
    voorbeeld: "59 : 6 = ?\n9 × 6 = 54, er blijft 5 over.\nAntwoord: 9 rest 5.",
    minCorrect: 12,
    make: function() {
      var p = pickPerDeler(REST_GROOT);
      return restQ(p[0], p[1]);
    },
  },

  {
    id: "d29_alleen_rest",
    label: "Wat is de rest?",
    group: G8,
    desc: "Rest van 23 : 4 = 3",
    strategy: "rest",
    tip: function(t) { var q = Math.floor(t[0] / t[1]); return q + SP_TIMES + t[1] + " = " + (q * t[1]) + ", en " + t[0] + " − " + (q * t[1]) + " = " + (t[0] % t[1]) + "."; },
    uitleg: "Soms wil je alleen weten wat er overblijft. Rest van 23 : 4: 5 × 4 = 20, en 23 − 20 = 3. De rest is 3.",
    voorbeeld: "Rest van 38 : 5 = ?\n7 × 5 = 35, 38 − 35 = 3.\nAntwoord: 3.",
    minCorrect: 8,
    make: function() {
      var p = pickPerDeler(ALLEEN_REST);
      var r = p[0] % p[1];
      var q = Math.floor(p[0] / p[1]);
      return { terms: [p[0], p[1]], question: "Rest van " + p[0] + DIV + p[1] + " = ?", answer: r, choices: makeChoices(r, [q, r + 1, r - 1]) };
    },
  },

  // ── BLOK 9: GROTERE GETALLEN ───────────────────────────────────

  {
    id: "d30_twee_door_een",
    label: "Tweecijferig delen",
    group: G9,
    desc: "72 : 3, 96 : 4, 91 : 7",
    strategy: "splitsen",
    tip: function(t) {
      var d = t[1];
      var big = Math.floor(t[0] / (10 * d)) * 10 * d;
      return "Splits in een stuk uit de tafel: " + t[0] + " = " + big + " + " + (t[0] - big) + ". " + big + DIV + d + " = " + (big / d) + ", " + (t[0] - big) + DIV + d + " = " + ((t[0] - big) / d) + ". Samen " + (t[0] / d) + ".";
    },
    uitleg: "Splits het getal in een rond stuk dat je makkelijk deelt en de rest. 72 : 3: 72 = 60 + 12. 60 : 3 = 20 en 12 : 3 = 4, samen 24.",
    voorbeeld: "91 : 7 = ?\n91 = 70 + 21.\n70 : 7 = 10, 21 : 7 = 3.\nAntwoord: 13.",
    minCorrect: 12,
    make: function() {
      var p = pickFrom(ITEMS_TWEE_MET);
      var q = p[0] / p[1];
      return plainQ(p[0], p[1], q, [forgetOverloop(p[0], p[1]), q + 1, q - 1, q + 10]);
    },
  },

  {
    id: "d31_drie_zonder",
    label: "Driecijferig delen",
    group: G9,
    desc: "648 : 2, 936 : 3",
    strategy: "cijfer voor cijfer",
    tip: function(t) { return "Deel elk cijfer apart: " + digitsOf(t[0]).reverse().join(", ") + " gedeeld door " + t[1] + ". Dat geeft " + (t[0] / t[1]) + "."; },
    uitleg: "Zijn alle cijfers deelbaar, dan deel je ze een voor een. 648 : 2: 600 : 2 = 300, 40 : 2 = 20, 8 : 2 = 4. Samen 324.",
    voorbeeld: "936 : 3 = ?\n900 : 3 = 300, 30 : 3 = 10, 6 : 3 = 2.\nAntwoord: 312.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(DRIE_ZONDER);
      var q = p[0] / p[1];
      return plainQ(p[0], p[1], q, notDivided(p[0], p[1]));
    },
  },

  {
    id: "d32_drie_met",
    label: "Delen in hapjes",
    group: G9,
    desc: "744 : 8, 432 : 6",
    strategy: "hapjes",
    tip: function(t) {
      var d = t[1];
      var k = Math.floor(t[0] / (10 * d)) * 10;
      return "Neem een groot hapje: " + k + SP_TIMES + d + " = " + (k * d) + ". Er blijft " + (t[0] - k * d) + " over, en " + (t[0] - k * d) + DIV + d + " = " + ((t[0] - k * d) / d) + ". Samen " + (t[0] / d) + ".";
    },
    uitleg: "Haal er steeds een groot hapje af dat je makkelijk deelt. 744 : 8: 90 × 8 = 720, er blijft 24 over. 24 : 8 = 3. Samen 90 + 3 = 93.",
    voorbeeld: "432 : 6 = ?\n70 × 6 = 420, er blijft 12 over.\n12 : 6 = 2.\nAntwoord: 72.",
    minCorrect: 12,
    make: function() {
      var p = pickPerDeler(DRIE_MET);
      var q = p[0] / p[1];
      var extras = [];
      if (String(q).slice(0, -1).indexOf("0") !== -1) extras.push(dropZero(q));
      var f = forgetOverloop(p[0], p[1]);
      if (f > 0) extras.push(f);
      extras.push(q + 10, q - 10, q + 1);
      return plainQ(p[0], p[1], q, extras);
    },
  },

  {
    id: "d33_door_tweecijferig",
    label: "Delen door een tweecijferig getal",
    group: G9,
    desc: "156 : 12",
    strategy: "terugrekenen",
    tip: function(t) { var q = t[0] / t[1]; return "Probeer: " + t[1] + SP_TIMES + "10 = " + (t[1] * 10) + ". " + q + SP_TIMES + t[1] + " = " + t[0] + "."; },
    uitleg: "Schat eerst met keer 10: 12 × 10 = 120, dus 156 : 12 is iets meer dan 10. Probeer verder: 13 × 12 = 156. Antwoord: 13.",
    voorbeeld: "144 : 16 = ?\n10 × 16 = 160, te veel.\n9 × 16 = 144.\nAntwoord: 9.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_TWEECIJFER);
      var q = p[0] / p[1];
      return plainQ(p[0], p[1], q, [q + 1, q - 1, q * 10]);
    },
  },

  // ── BLOK 10: SCHATTEN EN CONTROLEREN ───────────────────────────

  {
    id: "d34_schatten",
    label: "Schatten",
    group: G10,
    desc: "318 : 8 ≈ 320 : 8",
    strategy: "schatten",
    tip: function(t) {
      var rnd10 = Math.round(t[0] / 10) * 10;
      var q = Math.floor(t[0] / t[1]);
      return "Rond " + t[0] + " af op " + rnd10 + ": " + rnd10 + DIV + t[1] + " = " + (rnd10 / t[1]) + ". Precies is het " + q + " rest " + (t[0] - q * t[1]) + ".";
    },
    uitleg: "Bij schatten reken je niet precies. Rond het getal af op een tiental dat goed deelbaar is en deel dat. 318 : 8 ≈ 320 : 8 = 40. Precies is het 39 rest 6.",
    voorbeeld: "Schat: 318 : 8 ≈ ?\n320 : 8 = 40.\n(Precies is het 39 rest 6.)",
    minCorrect: 8,
    make: function() {
      var p = pickPerDeler(SCHATTEN);
      var est = Math.round(p[0] / 10) * 10 / p[1];
      return { terms: [p[0], p[1]], question: "Schat: " + p[0] + DIV + p[1] + " " + APPROX + " ?", answer: est, choices: estimateChoices(est, 10) };
    },
  },

  {
    id: "d35_fout_spotten",
    label: "Fout spotten",
    group: G10,
    desc: "Welke deling klopt niet?",
    strategy: "controleren",
    tip: "Controleer met vermenigvuldigen: uitkomst keer deler moet het deeltal geven.",
    uitleg: "Een deling controleer je met vermenigvuldigen. Bij 42 : 6 = 8: 8 × 6 = 48, niet 42. Deze som is dus fout (42 : 6 = 7).",
    voorbeeld: "Welke som is FOUT?\n42 : 6 = 8? 8 × 6 = 48, dus fout.",
    minCorrect: 8,
    make: makeDeelFout,
  },

  {
    id: "d36_missend_groot",
    label: "Missend deeltal, groot",
    group: G10,
    desc: "? : 7 = 23",
    strategy: "terugrekenen",
    tip: function(t) { return "Reken terug met keer: " + t[1] + SP_TIMES + t[0] + " = " + (t[0] * t[1]) + "."; },
    uitleg: "Bij ? : 7 = 23 reken je terug met vermenigvuldigen: 23 × 7 = 20 × 7 + 3 × 7 = 140 + 21 = 161. Controle: 161 : 7 = 23.",
    voorbeeld: "? : 4 = 36\n36 × 4 = 144.\nAntwoord: 144.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(MISSEND_GROOT);
      var d = p[0];
      var q = p[1];
      return { terms: [d, q], question: "?" + DIV + d + " = " + q, answer: d * q, choices: makeChoices(d * q, [q + d, d * q + d, d * q - d]) };
    },
  },
];

// ─────────────────────────────────────────────────────────────────
// SKILLS MET VRAAGVERLOOP + d37 SNELHEIDSRONDE
// ─────────────────────────────────────────────────────────────────

var SKILLS = createSkills("delen", RAW_SKILLS);
var MIXER  = createMixer(RAW_SKILLS, BLOCK_GROUPS, SKILLS.byId);

export var DEEL_SKILLS = SKILLS.list;

registerSkillId("delen", "d37_snelheid");

DEEL_SKILLS.push({
  id:         "d37_snelheid",
  label:      "Snelheidsronde",
  group:      G11,
  desc:       "Gemengd: alle soorten delingen",
  strategy:   "snel",
  tip:        "Kijk eerst wat voor som het is en kies dan de handigste aanpak.",
  uitleg:     "In de snelheidsronde komen alle soorten delingen door elkaar voorbij. Kies per som de aanpak die je hebt geleerd.",
  voorbeeld:  "Gemengd, bijvoorbeeld:\n56 : 8, 2400 : 60, 23 : 4, Schat: 318 : 8 ≈ ?",
  minCorrect: 15,
  generate:   MIXER.generate,
});

export var DEEL_ORDER = DEEL_SKILLS.map(function(s) { return s.id; });
