// Onderdeel Vermenigvuldigen: skills, volgorde en vermenigvuldig-specifieke generatoren.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Het vraagverloop (rekenmoment, geschiedenis, subtypen, stapels, gemengde ronde) staat in ./flow.js.
// Kleine sets (tafels, roosters) gebruiken een stapel: alle sommen komen langs voordat er één terugkomt.
// Antwoord 0 komt alleen voor bij v05 (tafels van 0 en 1).

import { rnd, shuffle } from "./helpers.js";
import {
  makeChoices, digitsOf, round10, estimateChoices, randomWith,
  registerSkillId, createSkills, createMixer, deckPick,
} from "./flow.js";

var TIMES    = "×";
var SP_TIMES = " × ";
var APPROX   = "≈";
var DOT      = "●";

// ─────────────────────────────────────────────────────────────────
// VERMENIGVULDIG-SPECIFIEKE VRAAG-HELPERS
// ─────────────────────────────────────────────────────────────────

function plainQ(terms, answer, extras) {
  return { terms: terms, question: terms.join(SP_TIMES) + " =", answer: answer, choices: makeChoices(answer, extras) };
}

// Kolomsom: twee regels, PracticeScreen lijnt rechts uit en zet een streep eronder
function columnQ(a, b, extras) {
  return { terms: [a, b], question: a + "\n" + TIMES + " " + b, answer: a * b, choices: makeChoices(a * b, extras) };
}

// Typische fouten bij een tafelsom: optellen, één rij ernaast
function tableErrors(a, b) {
  return [a + b, a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b];
}

// Alle sommen van één tafel, beide volgordes (1 t/m 10), zonder dubbelen
function tableItems(n) {
  var items = [];
  var seen  = {};
  for (var k = 1; k <= 10; k++) {
    [[n, k], [k, n]].forEach(function(p) {
      var key = p[0] + "x" + p[1];
      if (!seen[key]) { seen[key] = true; items.push(p); }
    });
  }
  return items;
}

function tableQ(skillId, items) {
  var p = deckPick(skillId, items);
  return plainQ([p[0], p[1]], p[0] * p[1], tableErrors(p[0], p[1]));
}

// Typische fout bij een eencijferige vermenigvuldiger: onthouden vergeten
function forgetCarry(a, b) {
  var d = digitsOf(a);
  var r = 0;
  var p = 1;
  for (var i = 0; i < d.length; i++) {
    var prod = d[i] * b;
    r += (i === d.length - 1 ? prod : prod % 10) * p;
    p *= 10;
  }
  return r;
}

function hasCarry(a, b) {
  return digitsOf(a).some(function(x) { return x * b >= 10; });
}

// Fout spotten: vier unieke sommen, precies één fout (typisch: een rij ernaast of optellen)
function makeMaalFout(sub) {
  var used = {};
  var sums = [];
  while (sums.length < 4) {
    var a = sub === 0 ? rnd(2, 10) : rnd(12, 49);
    var b = sub === 0 ? rnd(2, 10) : rnd(3, 9);
    var k = a + "_" + b;
    if (used[k]) continue;
    used[k] = true;
    sums.push([a, b]);
  }
  var w        = sums[0];
  var correct0 = w[0] * w[1];
  var wrongs   = [correct0 + w[0], correct0 - w[0], correct0 + w[1], correct0 + 10].filter(function(v) { return v > 0 && v !== correct0; });
  var wrongVal = wrongs[rnd(0, wrongs.length - 1)];
  var wrongStr = w[0] + SP_TIMES + w[1] + " = " + wrongVal;
  var others   = sums.slice(1).map(function(p) { return p[0] + SP_TIMES + p[1] + " = " + (p[0] * p[1]); });
  return {
    question:       "Welke som is FOUT?",
    answer:         wrongStr,
    choices:        shuffle([wrongStr].concat(others)),
    isErrorSpotter: true,
  };
}

// Kleine sets
var ITEMS_GROEPJES = [];
var ITEMS_ROOSTER  = [];
for (var ga = 2; ga <= 5; ga++) { for (var gb = 2; gb <= 5; gb++) { ITEMS_GROEPJES.push([ga, gb]); } }
for (var rr = 2; rr <= 4; rr++) { for (var rc = 2; rc <= 5; rc++) { ITEMS_ROOSTER.push([rr, rc]); } }

var ITEMS_0_1 = [];
(function() {
  var seen = {};
  for (var k = 1; k <= 10; k++) {
    [[0, k], [k, 0], [1, k], [k, 1]].forEach(function(p) {
      var key = p[0] + "x" + p[1];
      if (!seen[key]) { seen[key] = true; ITEMS_0_1.push(p); }
    });
  }
})();

var ITEMS_KWADRATEN = [];
for (var kq = 2; kq <= 10; kq++) { ITEMS_KWADRATEN.push([kq, kq]); }

var THINGS = ["dozen", "rijen", "zakjes", "pakken", "kratten", "bakjes"];

// ─────────────────────────────────────────────────────────────────
// SKILL DEFINITIONS
// ─────────────────────────────────────────────────────────────────

var G1  = "Begrijpen";
var G2  = "Basistafels";
var G3  = "Tafels 3 en 4";
var G4  = "Tafels 6 tot en met 9";
var G5  = "Omgekeerd";
var G6  = "Nullen en plaatswaarde";
var G7  = "Slim rekenen";
var G8  = "Grotere getallen uit het hoofd";
var G9  = "Kolomsgewijs";
var G10 = "Schatten en controleren";
var G11 = "Slot";

var BLOCK_GROUPS = [G1, G2, G3, G4, G5, G6, G7, G8, G9, G10];

var RAW_SKILLS = [

  // ── BLOK 1: BEGRIJPEN ──────────────────────────────────────────

  {
    id: "v01_groepjes",
    label: "Gelijke groepjes",
    group: G1,
    desc: "3 groepjes van 4 = ?",
    strategy: "groepjes",
    tip: function(t) { var s = []; for (var i = 0; i < t[0]; i++) s.push(t[1]); return t[0] + " groepjes van " + t[1] + " is " + s.join(" + ") + " = " + (t[0] * t[1]) + ". Dat schrijf je als " + t[0] + SP_TIMES + t[1] + "."; },
    uitleg: "Vermenigvuldigen is tellen in gelijke groepjes. 3 groepjes van 4 zijn samen 12. Dat schrijf je als 3 × 4 = 12: het eerste getal is het aantal groepjes, het tweede hoeveel er in elk groepje zitten.",
    voorbeeld: "4 groepjes van 5 = ?\n5 + 5 + 5 + 5 = 20\nDus 4 × 5 = 20.",
    minCorrect: 8,
    deck: true,
    make: function() {
      var p = deckPick("v01_groepjes", ITEMS_GROEPJES);
      return { terms: [p[0], p[1]], question: p[0] + " groepjes van " + p[1] + " = ?", answer: p[0] * p[1], choices: makeChoices(p[0] * p[1], [p[0] + p[1], (p[0] + 1) * p[1], (p[0] - 1) * p[1]]) };
    },
  },

  {
    id: "v02_herhaald_optellen",
    label: "Herhaald optellen",
    group: G1,
    desc: "4 + 4 + 4 = ? groepjes van 4",
    strategy: "groepjes tellen",
    tip: function(t) { return "Tel hoe vaak " + t[1] + " er staat. Dat is het aantal groepjes."; },
    uitleg: "Telkens hetzelfde getal optellen is vermenigvuldigen. Bij 4 + 4 + 4 staat de 4 er 3 keer: dat zijn 3 groepjes van 4, dus 3 × 4. Gevraagd wordt hoeveel groepjes het zijn.",
    voorbeeld: "6 + 6 + 6 + 6 = ? groepjes van 6\nDe 6 staat er 4 keer.\nAntwoord: 4 (dus 4 × 6).",
    minCorrect: 8,
    make: function() {
      var n = rnd(2, 5);
      var s = rnd(2, 6);
      var parts = [];
      for (var i = 0; i < n; i++) parts.push(s);
      // Typische fouten: de uitkomst of de groepsgrootte invullen
      return { terms: [n, s], question: parts.join(" + ") + " = ? groepjes van " + s, answer: n, choices: makeChoices(n, [n * s, s, n + 1, n - 1]) };
    },
  },

  {
    id: "v03_rooster",
    label: "Rooster",
    group: G1,
    desc: "Rijen en kolommen: 3 rijen van 4",
    strategy: "rooster",
    tip: function(t) { return "Tel de rijen (" + t[0] + ") en de stippen in één rij (" + t[1] + "): " + t[0] + SP_TIMES + t[1] + " = " + (t[0] * t[1]) + "."; },
    uitleg: "Een rooster bestaat uit gelijke rijen. 3 rijen van 4 stippen zijn 3 × 4 = 12 stippen. Draai je het rooster, dan zijn het 4 rijen van 3: ook 12. Daarom is 3 × 4 gelijk aan 4 × 3.",
    voorbeeld: "● ● ● ● ●\n● ● ● ● ●\n2 rijen van 5 = 2 × 5 = 10 stippen.",
    minCorrect: 8,
    deck: true,
    make: function() {
      var p = deckPick("v03_rooster", ITEMS_ROOSTER);
      var row = [];
      for (var i = 0; i < p[1]; i++) row.push(DOT);
      var rows = [];
      for (var j = 0; j < p[0]; j++) rows.push(row.join(" "));
      return { terms: [p[0], p[1]], question: rows.join("\n"), answer: p[0] * p[1], choices: makeChoices(p[0] * p[1], [p[0] + p[1], (p[0] + 1) * p[1], p[0] * (p[1] + 1)]) };
    },
  },

  {
    id: "v04_omdraaien",
    label: "Omdraaien",
    group: G1,
    desc: "3 × 8 = 8 × ?",
    strategy: "omdraaien",
    tip: function(t) { return t[0] + SP_TIMES + t[1] + " is hetzelfde als " + t[1] + SP_TIMES + t[0] + ". De getallen wisselen alleen van plaats."; },
    uitleg: "Bij vermenigvuldigen mag je de getallen omdraaien: 3 × 8 = 8 × 3. Denk aan een rooster: 3 rijen van 8 zijn evenveel als 8 rijen van 3. Handig, want dan kun je de makkelijkste tafel kiezen.",
    voorbeeld: "4 × 9 = 9 × ?\nDe getallen wisselen van plaats.\nAntwoord: 4.",
    minCorrect: 8,
    make: function() {
      return randomWith(function() {
        var a = rnd(2, 10);
        var b = rnd(2, 10);
        if (a === b) return null;
        return { terms: [a, b], question: a + SP_TIMES + b + " = " + b + SP_TIMES + "?", answer: a, choices: makeChoices(a, [b, a * b, a + 1]) };
      });
    },
  },

  // ── BLOK 2: BASISTAFELS ────────────────────────────────────────

  {
    id: "v05_tafel_0_1",
    label: "Tafels van 0 en 1",
    group: G2,
    desc: "0 × 7 = 0, 1 × 7 = 7",
    strategy: "patroon",
    tip: function(t) {
      if (t[0] === 0 || t[1] === 0) return "Keer 0 is altijd 0: nul groepjes (of groepjes van nul) is niets.";
      return "Keer 1 verandert niets: " + (t[0] === 1 ? t[1] : t[0]) + " blijft " + (t[0] * t[1]) + ".";
    },
    uitleg: "Met 0 vermenigvuldigen geeft altijd 0: 0 groepjes van 7 is niets. Met 1 vermenigvuldigen verandert niets: 1 groepje van 7 is 7.",
    voorbeeld: "0 × 9 = 0\n1 × 9 = 9\n9 × 1 = 9",
    minCorrect: 8,
    deck: true,
    make: function() {
      var p = deckPick("v05_tafel_0_1", ITEMS_0_1);
      var a = p[0];
      var b = p[1];
      return plainQ([a, b], a * b, [a + b, Math.max(a, b), 1, 0, 10]);
    },
  },

  {
    id: "v06_tafel_2",
    label: "Tafel van 2",
    group: G2,
    desc: "Verdubbelen",
    strategy: "verdubbelen",
    tip: function(t) { var n = t[0] === 2 ? t[1] : t[0]; return "Keer 2 is verdubbelen: " + n + " + " + n + " = " + (2 * n) + "."; },
    uitleg: "De tafel van 2 is verdubbelen: 2 × 7 is 7 + 7 = 14. Het maakt niet uit of de 2 voor of achter staat.",
    voorbeeld: "2 × 8 = ?\n8 + 8 = 16.\nAntwoord: 16.",
    minCorrect: 8,
    deck: true,
    make: function() { return tableQ("v06_tafel_2", tableItems(2)); },
  },

  {
    id: "v07_tafel_10",
    label: "Tafel van 10",
    group: G2,
    desc: "Een nul erachter",
    strategy: "patroon",
    tip: function(t) { var n = t[0] === 10 ? t[1] : t[0]; return "Keer 10: er komt een 0 achter. " + n + " wordt " + (n * 10) + "."; },
    uitleg: "Met 10 vermenigvuldigen maakt elk getal 10 keer zo groot: er komt een 0 achter. 7 × 10 = 70.",
    voorbeeld: "10 × 6 = ?\nEen 0 erachter: 60.",
    minCorrect: 8,
    deck: true,
    make: function() { return tableQ("v07_tafel_10", tableItems(10)); },
  },

  {
    id: "v08_tafel_5",
    label: "Tafel van 5",
    group: G2,
    desc: "De helft van keer 10",
    strategy: "halveren",
    tip: function(t) { var n = t[0] === 5 ? t[1] : t[0]; return "Keer 5 is de helft van keer 10: " + n + SP_TIMES + "10 = " + (n * 10) + ", de helft is " + (n * 5) + "."; },
    uitleg: "5 is de helft van 10. Reken dus eerst keer 10 en neem daarvan de helft. 8 × 5: 8 × 10 = 80, de helft is 40.",
    voorbeeld: "5 × 6 = ?\n10 × 6 = 60, de helft is 30.\nAntwoord: 30.",
    minCorrect: 8,
    deck: true,
    make: function() { return tableQ("v08_tafel_5", tableItems(5)); },
  },

  {
    id: "v09_mix_basis",
    label: "Basistafels door elkaar",
    group: G2,
    desc: "Tafels van 1, 2, 5 en 10 gemengd",
    strategy: "tafels",
    tip: function(t) { return "Welke tafel is het? Keer 2 is verdubbelen, keer 10 een 0 erachter, keer 5 de helft van keer 10."; },
    uitleg: "Nu komen de basistafels door elkaar. Kijk eerst welke tafel het is en gebruik dan de handigste aanpak.",
    voorbeeld: "5 × 9 = 45\n2 × 9 = 18\n10 × 9 = 90",
    minCorrect: 10,
    make: function() {
      var n = [1, 2, 5, 10][rnd(0, 3)];
      var k = rnd(1, 10);
      var p = rnd(0, 1) === 0 ? [n, k] : [k, n];
      return plainQ(p, p[0] * p[1], tableErrors(p[0], p[1]));
    },
  },

  // ── BLOK 3: TAFELS 3 EN 4 ──────────────────────────────────────

  {
    id: "v10_tafel_3",
    label: "Tafel van 3",
    group: G3,
    desc: "Tafel van 3",
    strategy: "tafel",
    tip: function(t) { var n = t[0] === 3 ? t[1] : t[0]; return "Keer 3 is keer 2 plus nog één keer: " + (2 * n) + " + " + n + " = " + (3 * n) + "."; },
    uitleg: "De tafel van 3 kun je opbouwen uit de tafel van 2: 3 × 7 = 2 × 7 + 7 = 14 + 7 = 21.",
    voorbeeld: "3 × 8 = ?\n2 × 8 = 16, plus 8 = 24.\nAntwoord: 24.",
    minCorrect: 10,
    deck: true,
    make: function() { return tableQ("v10_tafel_3", tableItems(3)); },
  },

  {
    id: "v11_tafel_4",
    label: "Tafel van 4",
    group: G3,
    desc: "Dubbel-dubbel",
    strategy: "verdubbelen",
    tip: function(t) { var n = t[0] === 4 ? t[1] : t[0]; return "Keer 4 is twee keer verdubbelen: " + n + " → " + (2 * n) + " → " + (4 * n) + "."; },
    uitleg: "4 is 2 × 2. Keer 4 is dus twee keer verdubbelen: 4 × 7: 7 verdubbeld is 14, nog eens verdubbeld is 28.",
    voorbeeld: "4 × 6 = ?\n6 → 12 → 24.\nAntwoord: 24.",
    minCorrect: 10,
    deck: true,
    make: function() { return tableQ("v11_tafel_4", tableItems(4)); },
  },

  {
    id: "v12_mix_t_m_5",
    label: "Tafels 1 t/m 5 en 10",
    group: G3,
    desc: "Tafels van 1 tot en met 5 en 10 gemengd",
    strategy: "tafels",
    tip: function(t) { return "Kies de tafel die je het best kent. Je mag de getallen ook omdraaien."; },
    uitleg: "Alle tafels die je tot nu toe kent komen door elkaar: 1, 2, 3, 4, 5 en 10.",
    voorbeeld: "3 × 9 = 27\n4 × 7 = 28\n10 × 4 = 40",
    minCorrect: 10,
    make: function() {
      var n = [1, 2, 3, 4, 5, 10][rnd(0, 5)];
      var k = rnd(1, 10);
      var p = rnd(0, 1) === 0 ? [n, k] : [k, n];
      return plainQ(p, p[0] * p[1], tableErrors(p[0], p[1]));
    },
  },

  // ── BLOK 4: TAFELS 6 TOT EN MET 9 ──────────────────────────────

  {
    id: "v13_tafel_6",
    label: "Tafel van 6",
    group: G4,
    desc: "Keer 5 plus nog één keer",
    strategy: "splitsen",
    tip: function(t) { var n = t[0] === 6 ? t[1] : t[0]; return "6 × " + n + " = 5 × " + n + " + " + n + " = " + (5 * n) + " + " + n + " = " + (6 * n) + "."; },
    uitleg: "6 is 5 + 1. Reken eerst keer 5 en tel er nog één keer het getal bij: 6 × 7 = 35 + 7 = 42.",
    voorbeeld: "6 × 8 = ?\n5 × 8 = 40, plus 8 = 48.\nAntwoord: 48.",
    minCorrect: 10,
    deck: true,
    make: function() { return tableQ("v13_tafel_6", tableItems(6)); },
  },

  {
    id: "v14_tafel_7",
    label: "Tafel van 7",
    group: G4,
    desc: "Keer 5 plus keer 2",
    strategy: "splitsen",
    tip: function(t) { var n = t[0] === 7 ? t[1] : t[0]; return "7 × " + n + " = 5 × " + n + " + 2 × " + n + " = " + (5 * n) + " + " + (2 * n) + " = " + (7 * n) + "."; },
    uitleg: "7 is 5 + 2. Reken keer 5 en keer 2 apart en tel ze op: 7 × 8 = 40 + 16 = 56.",
    voorbeeld: "7 × 6 = ?\n5 × 6 = 30, 2 × 6 = 12, samen 42.\nAntwoord: 42.",
    minCorrect: 12,
    deck: true,
    make: function() { return tableQ("v14_tafel_7", tableItems(7)); },
  },

  {
    id: "v15_tafel_8",
    label: "Tafel van 8",
    group: G4,
    desc: "Het dubbele van keer 4",
    strategy: "verdubbelen",
    tip: function(t) { var n = t[0] === 8 ? t[1] : t[0]; return "Keer 8 is het dubbele van keer 4: 4 × " + n + " = " + (4 * n) + ", verdubbeld " + (8 * n) + "."; },
    uitleg: "8 is het dubbele van 4. Reken eerst keer 4 en verdubbel dat: 8 × 7: 4 × 7 = 28, verdubbeld 56.",
    voorbeeld: "8 × 6 = ?\n4 × 6 = 24, verdubbeld 48.\nAntwoord: 48.",
    minCorrect: 10,
    deck: true,
    make: function() { return tableQ("v15_tafel_8", tableItems(8)); },
  },

  {
    id: "v16_tafel_9",
    label: "Tafel van 9",
    group: G4,
    desc: "Keer 10 min één keer",
    strategy: "compenseren",
    tip: function(t) { var n = t[0] === 9 ? t[1] : t[0]; return "9 × " + n + " = 10 × " + n + " − " + n + " = " + (10 * n) + " − " + n + " = " + (9 * n) + "."; },
    uitleg: "9 is 10 − 1. Reken keer 10 en haal er één keer het getal af: 9 × 7 = 70 − 7 = 63.",
    voorbeeld: "9 × 6 = ?\n10 × 6 = 60, min 6 = 54.\nAntwoord: 54.",
    minCorrect: 10,
    deck: true,
    make: function() { return tableQ("v16_tafel_9", tableItems(9)); },
  },

  {
    id: "v17_kwadraten",
    label: "Kwadraten",
    group: G4,
    desc: "6 × 6, 7 × 7, 8 × 8",
    strategy: "onthouden",
    tip: function(t) { return t[0] + SP_TIMES + t[0] + " is een vierkant rooster van " + t[0] + " bij " + t[0] + ": " + (t[0] * t[0]) + "."; },
    uitleg: "Een getal keer zichzelf heet een kwadraat. Het is een vierkant rooster: 7 rijen van 7 = 49. Deze sommen zijn handig om uit je hoofd te kennen.",
    voorbeeld: "8 × 8 = 64\n9 × 9 = 81",
    minCorrect: 8,
    deck: true,
    make: function() {
      var p = deckPick("v17_kwadraten", ITEMS_KWADRATEN);
      return plainQ([p[0], p[1]], p[0] * p[1], tableErrors(p[0], p[1]));
    },
  },

  {
    id: "v18_alle_tafels",
    label: "Alle tafels door elkaar",
    group: G4,
    desc: "Tafels van 1 tot en met 10 gemengd",
    strategy: "tafels",
    tip: function(t) { return "Gebruik de tafel die je het best kent: omdraaien mag altijd."; },
    uitleg: "Alle tafels komen door elkaar. Ken je een som niet meteen, gebruik dan een bekende: 7 × 8 = 5 × 8 + 2 × 8 = 40 + 16 = 56.",
    voorbeeld: "7 × 8 = 56\n6 × 9 = 54\n4 × 7 = 28",
    minCorrect: 12,
    subtypes: 3,
    // Subtypen: lage tafels (1-5), hoge tafels (6-9), beide factoren 6-9
    make: function(sub) {
      var a = sub === 0 ? rnd(1, 5) : rnd(6, 9);
      var b = sub === 2 ? rnd(6, 9) : rnd(1, 10);
      var p = rnd(0, 1) === 0 ? [a, b] : [b, a];
      return plainQ(p, p[0] * p[1], tableErrors(p[0], p[1]));
    },
  },

  // ── BLOK 5: OMGEKEERD ──────────────────────────────────────────

  {
    id: "v19_missende_factor",
    label: "Missende factor",
    group: G5,
    desc: "? × 6 = 42, 7 × ? = 63",
    strategy: "terugrekenen",
    tip: function(t) { return "Welk getal keer " + t[0] + " is " + t[1] + "? Zoek in de tafel van " + t[0] + "."; },
    uitleg: "Bij ? × 6 = 42 zoek je in de tafel van 6 welke som 42 geeft: 7 × 6 = 42, dus het antwoord is 7.",
    voorbeeld: "? × 8 = 56\nIn de tafel van 8: 7 × 8 = 56.\nAntwoord: 7.",
    minCorrect: 10,
    subtypes: 2,
    // Subtypen: ontbrekende factor voor of achter
    make: function(sub) {
      var known = rnd(2, 10);
      var x     = rnd(2, 10);
      var c     = known * x;
      var q     = sub === 0 ? ("?" + SP_TIMES + known + " = " + c) : (known + SP_TIMES + "? = " + c);
      return { terms: [known, c], question: q, answer: x, choices: makeChoices(x, [x + 1, x - 1, c - known]) };
    },
  },

  // ── BLOK 6: NULLEN EN PLAATSWAARDE ─────────────────────────────

  {
    id: "v20_x10_x100",
    label: "Keer 10 en keer 100",
    group: G6,
    desc: "34 × 10, 7 × 100",
    strategy: "plaatswaarde",
    tip: function(t) { var m = t[0] === 10 || t[0] === 100 ? t[0] : t[1]; return "Keer " + m + ": er " + (m === 10 ? "komt een 0" : "komen twee nullen") + " achter."; },
    uitleg: "Keer 10 maakt een getal 10 keer zo groot: elk cijfer schuift één plaats naar links en er komt een 0 achter. Keer 100: twee plaatsen, twee nullen. 34 × 100 = 3400.",
    voorbeeld: "34 × 10 = 340\n34 × 100 = 3400",
    minCorrect: 8,
    subtypes: 2,
    // Subtypen: keer 10, keer 100
    make: function(sub) {
      var n = rnd(2, 99);
      var m = sub === 0 ? 10 : 100;
      var p = rnd(0, 1) === 0 ? [n, m] : [m, n];
      return plainQ(p, n * m, [n * (m === 10 ? 100 : 10), n * m * 10, n + m]);
    },
  },

  {
    id: "v21_tiental_x_getal",
    label: "Tiental keer een getal",
    group: G6,
    desc: "30 × 4, 6 × 70",
    strategy: "plaatswaarde",
    tip: function(t) { var tt = t[0] % 10 === 0 ? t[0] : t[1]; var e = tt === t[0] ? t[1] : t[0]; return (tt / 10) + SP_TIMES + e + " = " + (tt / 10 * e) + ", en dan een 0 erachter: " + (tt * e) + "."; },
    uitleg: "30 × 4 is 3 tientallen keer 4 = 12 tientallen = 120. Reken dus 3 × 4 = 12 en zet de 0 erachter.",
    voorbeeld: "6 × 70 = ?\n6 × 7 = 42, een 0 erachter: 420.",
    minCorrect: 10,
    make: function() {
      var tt = rnd(2, 9) * 10;
      var e  = rnd(2, 9);
      var p  = rnd(0, 1) === 0 ? [tt, e] : [e, tt];
      return plainQ(p, tt * e, [tt * e / 10, tt * e * 10, tt + e]);
    },
  },

  {
    id: "v22_ronde_getallen",
    label: "Ronde getallen",
    group: G6,
    desc: "30 × 40, 200 × 30",
    strategy: "nullen tellen",
    tip: function(t) {
      var za = String(t[0]).length - String(t[0]).replace(/0+$/, "").length;
      var zb = String(t[1]).length - String(t[1]).replace(/0+$/, "").length;
      var ka = t[0] / Math.pow(10, za);
      var kb = t[1] / Math.pow(10, zb);
      return ka + SP_TIMES + kb + " = " + (ka * kb) + ", en dan " + (za + zb) + " nullen erachter: " + (t[0] * t[1]) + ".";
    },
    uitleg: "Haal de nullen weg, reken de kleine som en zet alle nullen er weer achter. 30 × 40: 3 × 4 = 12, twee nullen erachter: 1200. Let op: tel de nullen van beide getallen.",
    voorbeeld: "200 × 30 = ?\n2 × 3 = 6, drie nullen erachter: 6000.",
    minCorrect: 12,
    subtypes: 3,
    // Subtypen: tiental x tiental, honderdtal x tiental, tiental x honderdtal
    make: function(sub) {
      var a, b;
      if (sub === 0) { a = rnd(2, 9) * 10; b = rnd(2, 9) * 10; }
      else if (sub === 1) { a = rnd(2, 9) * 100; b = rnd(2, 9) * 10; }
      else { a = rnd(2, 9) * 10; b = rnd(2, 9) * 100; }
      // Typische fout: een nul vergeten of een nul te veel
      return plainQ([a, b], a * b, [a * b / 10, a * b * 10, a * b / 100]);
    },
  },

  // ── BLOK 7: SLIM REKENEN ───────────────────────────────────────

  {
    id: "v23_splitsen",
    label: "Splitsen",
    group: G7,
    desc: "7 × 12 = 7 × 10 + 7 × 2",
    strategy: "splitsen",
    tip: function(t) { var e = t[0] < 10 ? t[0] : t[1]; var g = t[0] < 10 ? t[1] : t[0]; return e + SP_TIMES + g + " = " + e + " × 10 + " + e + SP_TIMES + (g - 10) + " = " + (e * 10) + " + " + (e * (g - 10)) + " = " + (e * g) + "."; },
    uitleg: "Splits het grote getal in een tiental en de rest. 7 × 12 = 7 × 10 + 7 × 2 = 70 + 14 = 84. Zo maak je van een moeilijke som twee makkelijke.",
    voorbeeld: "6 × 14 = ?\n6 × 10 = 60, 6 × 4 = 24.\nSamen: 84.",
    minCorrect: 12,
    subtypes: 3,
    // Subtypen: 11-14, 15-19, het grote getal vooraan
    make: function(sub) {
      var e = rnd(2, 9);
      var g = sub === 0 ? rnd(11, 14) : rnd(15, 19);
      var p = sub === 2 ? [g, e] : [e, g];
      // Typische fouten: alleen het tiental of alleen de rest meenemen
      return plainQ(p, e * g, [e * 10 + (g - 10), e * 10, e * (g - 10) + 10, e + g]);
    },
  },

  {
    id: "v24_verdubbelen_halveren",
    label: "Verdubbelen en halveren",
    group: G7,
    desc: "5 × 16 = 10 × 8",
    strategy: "verdubbelen-halveren",
    tip: function(t) { var a = t[0]; var b = t[1]; return "Verdubbel " + a + " en halveer " + b + ": " + (2 * a) + SP_TIMES + (b / 2) + " = " + (a * b) + "."; },
    uitleg: "Maak het ene getal twee keer zo groot en het andere twee keer zo klein: de uitkomst blijft gelijk. 5 × 16 = 10 × 8 = 80.",
    voorbeeld: "25 × 12 = ?\n50 × 6 = 300.\nAntwoord: 300.",
    minCorrect: 10,
    make: function() {
      var a = [5, 25, 50][rnd(0, 2)];
      var b = rnd(6, 24) * 2;
      return plainQ([a, b], a * b, [a * b / 2, a * b * 2, a + b]);
    },
  },

  {
    id: "v25_compenseren",
    label: "Compenseren",
    group: G7,
    desc: "9 × 19 = 9 × 20 − 9",
    strategy: "compenseren",
    tip: function(t) { var r = Math.ceil(t[1] / 10) * 10; var d = r - t[1]; return t[0] + SP_TIMES + t[1] + " = " + t[0] + SP_TIMES + r + " − " + t[0] + SP_TIMES + d + " = " + (t[0] * r) + " − " + (t[0] * d) + " = " + (t[0] * t[1]) + "."; },
    uitleg: "Ligt een getal vlak onder een tiental, reken dan met het tiental en haal het teveel er weer af. 9 × 19 = 9 × 20 − 9 = 180 − 9 = 171.",
    voorbeeld: "6 × 29 = ?\n6 × 30 = 180, min 6 = 174.\nAntwoord: 174.",
    minCorrect: 10,
    make: function() {
      var a = rnd(2, 9);
      var d = rnd(1, 2);
      var r = rnd(2, 9) * 10;
      var b = r - d;
      // Typische fouten: niet terugrekenen, of alleen d aftrekken
      return plainQ([a, b], a * b, [a * r, a * r - d, a * b + a]);
    },
  },

  {
    id: "v26_x5_via_x10",
    label: "Keer 5 via keer 10",
    group: G7,
    desc: "48 × 5 = 480 : 2",
    strategy: "halveren",
    tip: function(t) { var n = t[0] === 5 ? t[1] : t[0]; return n + SP_TIMES + "10 = " + (n * 10) + ", de helft is " + (n * 5) + "."; },
    uitleg: "Keer 5 is de helft van keer 10. 48 × 5: 48 × 10 = 480, de helft is 240.",
    voorbeeld: "36 × 5 = ?\n36 × 10 = 360, de helft is 180.\nAntwoord: 180.",
    minCorrect: 10,
    make: function() {
      var n = rnd(12, 98);
      var p = rnd(0, 1) === 0 ? [n, 5] : [5, n];
      return plainQ(p, n * 5, [n * 10, n * 5 + 5, n * 5 - 5]);
    },
  },

  // ── BLOK 8: GROTERE GETALLEN UIT HET HOOFD ─────────────────────

  {
    id: "v27_twee_x_een_zonder",
    label: "Tweecijferig keer eencijferig",
    group: G8,
    desc: "23 × 3, zonder onthouden",
    strategy: "splitsen",
    tip: function(t) { var tt = Math.floor(t[0] / 10) * 10; var e = t[0] % 10; return tt + SP_TIMES + t[1] + " = " + (tt * t[1]) + " en " + e + SP_TIMES + t[1] + " = " + (e * t[1]) + ", samen " + (t[0] * t[1]) + "."; },
    uitleg: "Splits het tweecijferige getal in tientallen en eenheden en vermenigvuldig ze apart. 23 × 3 = 20 × 3 + 3 × 3 = 60 + 9 = 69.",
    voorbeeld: "32 × 3 = ?\n30 × 3 = 90, 2 × 3 = 6.\nAntwoord: 96.",
    minCorrect: 10,
    make: function() {
      return randomWith(function() {
        var a = rnd(11, 44);
        var b = rnd(2, 4);
        if (a % 10 === 0 || hasCarry(a, b)) return null;
        return plainQ([a, b], a * b, [a + b, a * b + 10, a * (b + 1)]);
      });
    },
  },

  {
    id: "v28_twee_x_een_met",
    label: "Tweecijferig keer eencijferig, met deelproducten",
    group: G8,
    desc: "47 × 6 = 240 + 42",
    strategy: "deelproducten",
    tip: function(t) { var tt = Math.floor(t[0] / 10) * 10; var e = t[0] % 10; return t[0] + SP_TIMES + t[1] + " = " + tt + SP_TIMES + t[1] + " + " + e + SP_TIMES + t[1] + " = " + (tt * t[1]) + " + " + (e * t[1]) + " = " + (t[0] * t[1]) + "."; },
    uitleg: "Uit het hoofd: maak twee deelproducten en tel ze op. 47 × 6 = 40 × 6 + 7 × 6 = 240 + 42 = 282. Je rekent met hele getallen (40, niet 4) en telt aan het eind op.",
    voorbeeld: "38 × 4 = ?\n30 × 4 = 120\n8 × 4 = 32\n120 + 32 = 152.",
    minCorrect: 12,
    subtypes: 3,
    // Subtypen: kleine tientallen (13-49), grote tientallen (51-98), uitkomst boven 400
    make: function(sub) {
      return randomWith(function() {
        var a = sub === 0 ? rnd(13, 49) : rnd(51, 98);
        var b = rnd(3, 9);
        if (a % 10 === 0 || (a % 10) * b < 10) return null;
        if (sub === 2 && a * b <= 400) return null;
        if (sub === 1 && a * b > 400) return null;
        var tt = Math.floor(a / 10) * 10;
        // Typische fouten: alleen het tiental, deelproducten niet goed opgeteld
        return plainQ([a, b], a * b, [tt * b, a * b - 10, a * b + 10, (a % 10) * b + Math.floor(a / 10) * b]);
      });
    },
  },

  {
    id: "v29_toepassen",
    label: "Toepassen",
    group: G8,
    desc: "4 dozen van 12 = ?",
    strategy: "toepassen",
    tip: function(t) { return "Hoeveel groepjes en hoeveel in elk groepje? " + t[0] + SP_TIMES + t[1] + " = " + (t[0] * t[1]) + "."; },
    uitleg: "In het dagelijks leven tel je vaak gelijke groepen: 4 dozen van 12 eieren zijn 4 × 12 = 48 eieren. Het aantal dozen is het eerste getal, de inhoud het tweede.",
    voorbeeld: "6 rijen van 24 = ?\n6 × 24 = 6 × 20 + 6 × 4 = 120 + 24 = 144.",
    minCorrect: 10,
    make: function() {
      var a = rnd(2, 9);
      var b = rnd(6, 25);
      var thing = THINGS[rnd(0, THINGS.length - 1)];
      return { terms: [a, b], question: a + " " + thing + " van " + b + " = ?", answer: a * b, choices: makeChoices(a * b, [a + b, (a + 1) * b, (a - 1) * b]) };
    },
  },

  // ── BLOK 9: KOLOMSGEWIJS ───────────────────────────────────────

  {
    id: "v30_kolom_2x1",
    label: "Kolomsgewijs, tweecijferig keer eencijferig",
    group: G9,
    desc: "23 × 4 en 47 × 6 onder elkaar",
    strategy: "kolomsgewijs",
    tip: function(t) { var e = t[0] % 10; var p = e * t[1]; return "Begin rechts: " + e + SP_TIMES + t[1] + " = " + p + ". Schrijf " + (p % 10) + (p >= 10 ? ", onthoud " + Math.floor(p / 10) + "." : "."); },
    uitleg: "Kolomsgewijs werk je cijfer voor cijfer, van rechts naar links. Vermenigvuldig de eenheden, schrijf het laatste cijfer op en onthoud de tientallen. Vermenigvuldig dan het volgende cijfer en tel wat je onthouden hebt erbij op.",
    voorbeeld: "47\n× 6\n7 × 6 = 42: schrijf 2, onthoud 4.\n4 × 6 = 24, plus 4 = 28.\nAntwoord: 282.",
    minCorrect: 10,
    subtypes: 2,
    // Subtypen: zonder onthouden (eerst), met onthouden
    make: function(sub) {
      return randomWith(function() {
        var a = rnd(12, 98);
        var b = rnd(2, 9);
        if (a % 10 === 0) return null;
        if (sub === 0 && hasCarry(a, b)) return null;
        if (sub === 1 && !hasCarry(a, b)) return null;
        return columnQ(a, b, [forgetCarry(a, b), a * b + 10, a + b]);
      });
    },
  },

  {
    id: "v31_kolom_3x1",
    label: "Kolomsgewijs, driecijferig keer eencijferig",
    group: G9,
    desc: "234 × 7",
    strategy: "kolomsgewijs",
    tip: "Werk van rechts naar links: eenheden, tientallen, honderdtallen. Tel telkens op wat je onthouden hebt.",
    uitleg: "Bij drie cijfers doe je hetzelfde als bij twee: cijfer voor cijfer van rechts naar links, en wat je onthoudt tel je bij het volgende product op.",
    voorbeeld: "234\n× 7\n4 × 7 = 28: schrijf 8, onthoud 2.\n3 × 7 = 21, plus 2 = 23: schrijf 3, onthoud 2.\n2 × 7 = 14, plus 2 = 16.\nAntwoord: 1638.",
    minCorrect: 10,
    make: function() {
      return randomWith(function() {
        var a = rnd(102, 999);
        var b = rnd(3, 9);
        if (!hasCarry(a, b)) return null;
        return columnQ(a, b, [forgetCarry(a, b), a * b + 10, a * b + 100]);
      });
    },
  },

  {
    id: "v32_kolom_2x2",
    label: "Kolomsgewijs, tweecijferig keer tweecijferig",
    group: G9,
    desc: "34 × 26",
    strategy: "kolomsgewijs",
    tip: function(t) { var e = t[1] % 10; var tt = t[1] - e; return "Twee deelproducten: " + t[0] + SP_TIMES + e + " = " + (t[0] * e) + " en " + t[0] + SP_TIMES + tt + " = " + (t[0] * tt) + ". Samen " + (t[0] * t[1]) + "."; },
    uitleg: "Bij twee cijfers onderaan maak je twee rijen: eerst het bovenste getal keer de eenheden, dan keer de tientallen (daarom schuift die rij één plaats op, met een 0 achteraan). Tel de twee rijen op.",
    voorbeeld: "34\n× 26\n34 × 6 = 204\n34 × 20 = 680\n204 + 680 = 884.",
    minCorrect: 12,
    subtypes: 3,
    // Subtypen: onderste getal 11-19, 21-49, 51-99
    make: function(sub) {
      return randomWith(function() {
        var a = rnd(12, 99);
        var b = sub === 0 ? rnd(11, 19) : sub === 1 ? rnd(21, 49) : rnd(51, 99);
        if (a % 10 === 0 || b % 10 === 0) return null;
        var e = b % 10;
        var tt = Math.floor(b / 10);
        // Typische fouten: alleen het eerste deelproduct, tweede rij niet opgeschoven
        return columnQ(a, b, [a * e, a * e + a * tt, a * b + 10]);
      });
    },
  },

  {
    id: "v33_kolom_3x2",
    label: "Kolomsgewijs, driecijferig keer tweecijferig",
    group: G9,
    desc: "128 × 23",
    strategy: "kolomsgewijs",
    tip: function(t) { var e = t[1] % 10; var tt = t[1] - e; return "Twee deelproducten: " + t[0] + SP_TIMES + e + " = " + (t[0] * e) + " en " + t[0] + SP_TIMES + tt + " = " + (t[0] * tt) + ". Samen " + (t[0] * t[1]) + "."; },
    uitleg: "Net als bij twee cijfers: eerst keer de eenheden, dan keer de tientallen (een plaats opgeschoven), en de twee rijen optellen.",
    voorbeeld: "128\n× 23\n128 × 3 = 384\n128 × 20 = 2560\n384 + 2560 = 2944.",
    minCorrect: 10,
    make: function() {
      return randomWith(function() {
        var a = rnd(102, 999);
        var b = rnd(12, 39);
        if (b % 10 === 0) return null;
        var e = b % 10;
        var tt = Math.floor(b / 10);
        return columnQ(a, b, [a * e, a * e + a * tt, a * b + 100]);
      });
    },
  },

  // ── BLOK 10: SCHATTEN EN CONTROLEREN ───────────────────────────

  {
    id: "v34_schatten",
    label: "Schatten",
    group: G10,
    desc: "48 × 7 ≈ 50 × 7, 49 × 21 ≈ 50 × 20",
    strategy: "schatten",
    tip: function(t) { var a = round10(t[0]); var b = t[1] >= 10 ? round10(t[1]) : t[1]; return "Rond af: " + t[0] + " wordt " + a + (t[1] >= 10 ? ", " + t[1] + " wordt " + b : "") + ". " + a + SP_TIMES + b + " = " + (a * b) + "."; },
    uitleg: "Bij schatten reken je niet precies. Rond de tweecijferige getallen af op tientallen (bij een 5 naar boven) en vermenigvuldig de ronde getallen. Het antwoord is een benadering.",
    voorbeeld: "Schat: 48 × 7 ≈ ?\n50 × 7 = 350.\n(Precies is het 336.)",
    minCorrect: 8,
    subtypes: 2,
    // Subtypen: tweecijferig x eencijferig, tweecijferig x tweecijferig
    make: function(sub) {
      return randomWith(function() {
        var a = rnd(21, 99);
        var b = sub === 0 ? rnd(3, 9) : rnd(21, 99);
        if (a % 10 === 0) return null;
        if (sub === 1 && b % 10 === 0) return null;
        var ra = round10(a);
        var rb = sub === 0 ? b : round10(b);
        var est = ra * rb;
        var step = sub === 0 ? 10 * b : 100;
        var exact = a * b;
        // Ondubbelzinnig: de exacte uitkomst is nooit gelijk aan of een veelvoud zoals de keuzes
        if (exact === est || exact % step === 0) return null;
        return { terms: [a, b], question: "Schat: " + a + SP_TIMES + b + " " + APPROX + " ?", answer: est, choices: estimateChoices(est, step) };
      });
    },
  },

  {
    id: "v35_fout_spotten",
    label: "Fout spotten",
    group: G10,
    desc: "Welke som klopt niet?",
    strategy: "controleren",
    tip: "Controleer met een bekende tafel of door af te ronden: past de uitkomst?",
    uitleg: "Een vermenigvuldiging kun je controleren met een bekende som. Bij 7 × 8 = 63: 7 × 8 = 56, en 63 hoort bij 7 × 9. Deze som is dus fout.",
    voorbeeld: "Welke som is FOUT?\n6 × 7 = 48? 6 × 7 = 42, dus fout.",
    minCorrect: 10,
    subtypes: 2,
    // Subtypen: tafelsommen, tweecijferig x eencijferig
    make: makeMaalFout,
  },

  {
    id: "v36_missende_factor_groot",
    label: "Missende factor, groot",
    group: G10,
    desc: "? × 7 = 168, 12 × ? = 96",
    strategy: "terugrekenen",
    tip: function(t) { return "Welk getal keer " + t[0] + " is " + t[1] + "? Schat eerst: " + t[0] + " × 10 = " + (t[0] * 10) + "."; },
    uitleg: "Zoek het getal dat je met de bekende factor moet vermenigvuldigen. Bij ? × 7 = 168: 7 × 20 = 140, er blijft 28 over, en 28 = 7 × 4. Dus 20 + 4 = 24.",
    voorbeeld: "12 × ? = 96\n12 × 8 = 96.\nAntwoord: 8.",
    minCorrect: 10,
    subtypes: 2,
    // Subtypen: grote ontbrekende factor (? x 7 = 168), kleine ontbrekende factor (12 x ? = 96)
    make: function(sub) {
      var known, x;
      if (sub === 0) { known = rnd(3, 9); x = rnd(11, 30); }
      else { known = rnd(11, 25); x = rnd(3, 9); }
      var c = known * x;
      var q = sub === 0 ? ("?" + SP_TIMES + known + " = " + c) : (known + SP_TIMES + "? = " + c);
      return { terms: [known, c], question: q, answer: x, choices: makeChoices(x, [x + 1, x - 1, x + 10, c - known]) };
    },
  },
];

// ─────────────────────────────────────────────────────────────────
// SKILLS MET VRAAGVERLOOP + v37 SNELHEIDSRONDE
// ─────────────────────────────────────────────────────────────────

var SKILLS = createSkills("vermenigvuldigen", RAW_SKILLS);
var MIXER  = createMixer(RAW_SKILLS, BLOCK_GROUPS, SKILLS.byId);

export var MAAL_SKILLS = SKILLS.list;

registerSkillId("vermenigvuldigen", "v37_snelheid");

MAAL_SKILLS.push({
  id:         "v37_snelheid",
  label:      "Snelheidsronde",
  group:      G11,
  desc:       "Gemengd: alle soorten vermenigvuldigingen",
  strategy:   "snel",
  tip:        "Kijk eerst wat voor som het is en kies dan de handigste aanpak.",
  uitleg:     "In de snelheidsronde komen alle soorten vermenigvuldigingen door elkaar voorbij. Kies per som de aanpak die je hebt geleerd.",
  voorbeeld:  "Gemengd, bijvoorbeeld:\n7 × 8, 30 × 40, 47 × 6, Schat: 48 × 7 ≈ ?",
  minCorrect: 15,
  generate:   MIXER.generate,
});

export var MAAL_ORDER = MAAL_SKILLS.map(function(s) { return s.id; });
