// Onderdeel Optellen: skills, volgorde en optel-specifieke generatoren.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.

import {
  gcd,
  fracStr,
  centStr,
  tiendStr,
  honderdStr,
  timeStr,
  isValidQ,
  rnd,
  shuffle,
  wrongChoices,
} from "./helpers.js";
import { round10, estimateChoices, randomWith, fairEstimate } from "./flow.js";

// ─────────────────────────────────────────────────────────────────
// FOUT-SPOTTER (makeErrorQ)
// Vier unieke somstrings als keuzes. Precies 1 wiskundig fout, 3 correct.
// Answer is altijd de wiskundig foute som.
// Uniekheid per constructie: shuffle van 81 paren, vier unieke [a,b]-paren.
// ─────────────────────────────────────────────────────────────────

export function makeErrorQ() {
  // Bouw volledige paren-set 1..9 x 1..9 (81 paren)
  var allPairs = [];
  for (var a = 1; a <= 9; a++) {
    for (var b = 1; b <= 9; b++) {
      allPairs.push([a, b]);
    }
  }
  allPairs = shuffle(allPairs);

  // Pak vier unieke paren (altijd beschikbaar: 81 > 4)
  var p0 = allPairs[0];
  var p1 = allPairs[1];
  var p2 = allPairs[2];
  var p3 = allPairs[3];

  // p0 wordt de foute som: kies wrongC !== correctC via offset-lijst
  var correctC0 = p0[0] + p0[1];
  var offsets = [-2, -1, 1, 2].filter(function(o) { return correctC0 + o > 0; });
  var wrongC  = correctC0 + offsets[rnd(0, offsets.length - 1)];
  // wrongC !== correctC0 per constructie (offsets bevatten nooit 0) ✓

  var wrongStr = p0[0] + " + " + p0[1] + " = " + wrongC;
  var c1 = p1[0] + " + " + p1[1] + " = " + (p1[0] + p1[1]);
  var c2 = p2[0] + " + " + p2[1] + " = " + (p2[0] + p2[1]);
  var c3 = p3[0] + " + " + p3[1] + " = " + (p3[0] + p3[1]);
  // Vier strings uniek: paren zijn uniek => "a + b = c"-strings uniek ✓

  return {
    question:       "Welk antwoord is FOUT?",
    answer:         wrongStr,
    choices:        shuffle([wrongStr, c1, c2, c3]),
    isErrorSpotter: true,
  };
}

// ─────────────────────────────────────────────────────────────────
// DOMEIN-FALLBACKS (centrale fallback per domein, fase 1)
// Alle keuzes uniek per constructie. isValidQ screent uitvoer.
// ─────────────────────────────────────────────────────────────────

var DOMAIN_FALLBACKS = {
  // Gehele getallen: makeQ gebruikt wrongChoices → 4 unieke integers ✓
  "integer": function() {
    var a = rnd(1, 9), b = rnd(1, 9);
    return makeQ([a, b], a + b);
  },
  // Breuken: vaste set — "1/2","3/4","1/4","5/4" zijn vier unieke strings ✓
  "frac": function() {
    return {
      question: "1/4 + 1/4 =",
      answer:   fracStr(1, 2),
      choices:  shuffle([fracStr(1,2), fracStr(3,4), fracStr(1,4), fracStr(5,4)])
    };
  },
  // Decimalen (tienden): vaste set — "0,8","0,7","0,9","1,8" uniek ✓
  "dec": function() {
    return {
      question: "0,3 + 0,5 =",
      answer:   tiendStr(8),
      choices:  shuffle([tiendStr(8), tiendStr(7), tiendStr(9), tiendStr(18)])
    };
  },
  // Geld: centStr(75/100/50/125) → vier unieke eurostrings ✓
  "money": function() {
    return {
      question: centStr(25) + " + " + centStr(50) + " =",
      answer:   centStr(75),
      choices:  shuffle([centStr(75), centStr(100), centStr(50), centStr(125)])
    };
  },
  // Tijd: timeStr(30/25/20/60) → vier unieke tijdstrings ✓
  "time": function() {
    return {
      question: timeStr(15) + " + " + timeStr(15) + " =",
      answer:   timeStr(30),
      choices:  shuffle([timeStr(30), timeStr(25), timeStr(20), timeStr(60)])
    };
  },
  // Maten: vaste strings — "50 cm" etc. uniek ✓
  "measure": function() {
    return {
      question: "30 cm + 20 cm =",
      answer:   "50 cm",
      choices:  shuffle(["50 cm", "40 cm", "60 cm", "45 cm"])
    };
  },
};

// Domeinmapping: alleen skills met betrouwbaar uniform antwoordformaat
// "stop" = gecontroleerde stop (geen fallback mogelijk)
// Ontbrekende entry = default "integer" (voor s01-s33)
var SKILL_DOMAIN = {
  // Breuken — alleen homogene breukskills
  "s34_frac_same_denom":   "frac",
  "s35_frac_improper":     "frac",
  "s36_frac_diff_denom":   "frac",
  "s37_frac_gcd_reduce":   "frac",
  "s38_frac_mixed":        "stop",  // uitkomst kan geheel zijn
  "s39_frac_mixed_carry":  "stop",
  "s40_frac_whole":        "stop",
  "s41_frac_three":        "stop",
  // Decimalen
  "s42_dec_tenth":         "dec",
  "s43_dec_hundredth":     "dec",
  "s44_dec_carry":         "dec",
  "s45_dec_whole":         "stop",  // uitkomst kan geheel zijn
  "s46_dec_three":         "stop",
  // Geld
  "s47_money_small":       "money",
  "s48_money_medium":      "money",
  "s49_money_large":       "money",
  "s50_money_three":       "money",
  "s51_money_change":      "money",
  "s52_money_context":     "money",
  "s53_money_four":        "money",
  // Tijd
  "s54_time_minutes":      "time",
  "s55_time_hours_min":    "time",
  "s56_time_carry":        "time",
  "s57_time_context":      "time",
  // Maten
  "s58_measure_cm":        "measure",
  "s59_measure_m":         "measure",
  "s60_measure_kg":        "measure",
  // s61-s65: getallenlijn, schatten, afronden — variabel formaat
  "s61_number_line":       "stop",
  "s62_estimate":          "stop",
  "s63_round_10":          "stop",
  "s64_round_100":         "stop",
  "s65_mental_split":      "stop",
  // Context-sommen
  "s66_context_money":     "money",
  "s67_context_time":      "time",
  "s68_context_measure":   "measure",
  // Fout-spotter: integer-variant OK, domein-varianten te complex
  "s69_error_int":         "integer",
  "s70_error_frac":        "stop",
  "s71_error_dec":         "stop",
  "s72_error_money":       "stop",
  "s73_error_time":        "stop",
  // Missende term
  "s74_missing_int":       "integer",
  "s75_missing_frac":      "stop",
  "s76_missing_dec":       "stop",
  "s77_missing_money":     "money",
  "s78_missing_time":      "time",
  // Kolomoptelling
  "s79_column_2x2":        "integer",
  "s80_column_3x2":        "integer",
  "s81_column_4x2":        "integer",
  "s82_column_money":      "money",
  "s83_column_dec":        "stop",
  // Gevorderd
  "s84_frac_dec_link":     "stop",
  "s85_frac_error":        "stop",
  "s86_large_numbers":     "integer",
  "s87_large_context":     "integer",
  "s88_dec_complex":       "stop",
  "s89_missing_complex":   "stop",
  "s90_time_adv":          "time",
  "s91_measure_mix":       "stop",
  "s92_money_adv":         "money",
  "s93_context_mix":       "stop",
  // Masterniveau
  "s94_all_domains":       "stop",
  "s95_speed_int":         "integer",
  "s96_speed_frac":        "stop",
  "s97_speed_dec":         "stop",
  "s98_missing_adv":       "stop",
  "s99_bonus_mixed":       "stop",
  "s100_grand_master":     "stop",
};

export function domainFallback(skillId) {
  var domain = SKILL_DOMAIN[skillId];
  if (domain === undefined) domain = "integer"; // default voor s01-s33
  if (domain === "stop") return null;
  var fn = DOMAIN_FALLBACKS[domain];
  if (!fn) return null;
  var q = fn();
  return isValidQ(q) ? q : null;
}

// ─────────────────────────────────────────────────────────────────
// OPTELLEN 2.0 — SKILL ENGINE
//
// Skills zijn de bouwstenen, niet "niveaus".
// Elke skill heeft:
//   id, label, desc         — identiteit
//   group                   — groep voor weergave
//   strategy                — welke rekenstrategie hoort erbij
//   tip                     — snelle tip (groen blok, 1 zin)
//   uitleg                  — langere uitleg (blauw blok, 2-3 zinnen)
//   voorbeeld               — compleet doorgerekend voorbeeld
//   generate()              — geeft { terms, answer, question, choices }
//   minCorrect              — hoeveel goed voor 'beheerst'
// ─────────────────────────────────────────────────────────────────

function makeQ(terms, answer) {
  var q = terms.join(" + ") + " =";
  var wrongs  = wrongChoices(answer, 3, 0);
  var choices = shuffle([answer].concat(wrongs));
  return { terms: terms, question: q, answer: answer, choices: choices };
}

// ── SKILL DEFINITIONS ─────────────────────────────────────────────

export var OPTELLEN_SKILLS = [

  // ── GROEP 1: KLEINE GETALLEN ──────────────────────────────────

  {
    id: "s01_single_easy",
    label: "Kleine sommen",
    group: "Kleine getallen",
    desc: "Optellen tot 10",
    strategy: "tellen",
    tip: function(t) { var a = t[0]; var b = t[1]; return "Tel op je vingers of in je hoofd: " + a + " + " + b + " → " + a + ", dan " + b + " verder tellen."; },
    uitleg: "Begin bij het grootste getal en tel het kleine getal erbij. Bij 2 + 4 begin je dus bij 4 en tel je verder: 5, 6. Oefen deze kleine sommen totdat je ze steeds vaker direct uit je hoofd weet.",
    voorbeeld: "2 + 4 = ?\nBegin bij 4 en tel 2 verder: 5, 6\nAntwoord: 6",
    minCorrect: 8,
    generate: function() {
      var a = rnd(1, 5);
      var b = rnd(1, 5);
      return makeQ([a, b], a + b);
    },
  },

  {
    id: "s02_single_medium",
    label: "Sommen tot 18",
    group: "Kleine getallen",
    desc: "Enkelvoudige cijfers, grotere sommen",
    strategy: "splitsen",
    tip: function(t) { var a = t[0]; var b = t[1]; var x = (10 - a > 0 && 10 - a < b) ? (10 - a) : (10 - b > 0 && 10 - b < a ? (10 - b) : Math.ceil(b / 5) * 5 - b || 1); var y = b - x; if (y <= 0) { x = 1; y = b - 1; } return "Maak van één getal een rond getal: " + a + " + " + b + " → " + a + " + " + x + " + " + y + " = " + (a + b); },
    uitleg: "Gaat de som over de 10? Maak dan eerst 10. Bij 8 + 6 heeft 8 nog 2 nodig tot 10. Splits de 6 in 2 en 4: 8 + 2 = 10, en 10 + 4 = 14. Blijft de som onder de 10, dan weet je hem vaak al uit je hoofd.",
    voorbeeld: "8 + 7 = ?\nSplits 7 in 2 en 5\n8 + 2 = 10\n10 + 5 = 15",
    minCorrect: 10,
    generate: function() {
      // minstens één getal >= 5 voor echte oefening
      var a = rnd(4, 9);
      var b = rnd(4, 9);
      return makeQ([a, b], a + b);
    },
  },

  {
    id: "s03_plus_ten",
    label: "Plus tiental",
    group: "Tientallen",
    desc: "Getal + 10, 20, 30…",
    strategy: "patroon",
    tip: "Als je een tiental optelt verandert alleen het tientallen-cijfer: 34 + 20 = 54.",
    uitleg: "Tel je een rond tiental erbij, dan verandert alleen het tientallen-cijfer. De eenheden blijven staan. 47 + 30: de 4 tientallen worden 4 + 3 = 7 tientallen, de 7 eenheden blijven. Dus 77.",
    voorbeeld: "56 + 30 = ?\nTientallen: 5 + 3 = 8\nEenheden blijven 6\nAntwoord: 86",
    minCorrect: 8,
    generate: function() {
      var a = rnd(10, 69);
      var b = rnd(1, 5) * 10;
      if (a + b > 99) { b = 10; }
      return makeQ([a, b], a + b);
    },
  },

  {
    id: "s04_round_tens",
    label: "Ronde getallen",
    group: "Tientallen",
    desc: "10+20, 30+40, tientallen optellen",
    strategy: "patroon",
    tip: "Ronde getallen: 20 + 50 is hetzelfde als 2 + 5, maar dan ×10.",
    uitleg: "Laat de nullen even weg en reken met de kleine getallen. 30 + 40 wordt 3 + 4 = 7. Zet de nul er weer achter: 70. Je telt eigenlijk tientallen: 3 tientallen en 4 tientallen zijn samen 7 tientallen.",
    voorbeeld: "60 + 20 = ?\nZonder nul: 6 + 2 = 8\nNul erachter: 80",
    minCorrect: 8,
    generate: function() {
      var a = rnd(1, 8) * 10;
      var b = rnd(1, 9 - Math.floor(a / 10)) * 10;
      if (b < 10) b = 10;
      return makeQ([a, b], a + b);
    },
  },

  {
    id: "s05_no_carry_20",
    label: "Tot 20, geen overstap",
    group: "Tot 20",
    desc: "Optellen zonder door het tiental te gaan",
    strategy: "splitsen",
    tip: "Kijk of de eenheden samen minder dan 10 zijn: dan is er geen overstap nodig.",
    uitleg: "De eenheden samen blijven onder de 10, dus het aantal tientallen verandert niet. Tel alleen de eenheden op. 13 + 5: 3 + 5 = 8, dus 18.",
    voorbeeld: "14 + 3 = ?\nEenheden: 4 + 3 = 7\nDe 10 blijft staan\nAntwoord: 17",
    minCorrect: 8,
    generate: function() {
      var a = rnd(11, 17);
      var maxB = 19 - a;
      var b = rnd(1, maxB > 0 ? maxB : 1);
      // ensure no carry: eenheden must stay < 10
      while ((a % 10) + b >= 10) { b = rnd(1, 3); }
      return makeQ([a, b], a + b);
    },
  },

  {
    id: "s06_carry_10",
    label: "Tiental-overstap (tot 20)",
    group: "Tot 20",
    desc: "8+5, 9+4 — door het tiental heen",
    strategy: "aanvullen",
    tip: function(t) { var a = t[0]; var b = t[1]; var x = 10 - a; var y = b - x; return "Vul eerst aan tot 10, tel dan de rest op: " + a + " + " + b + " → " + a + " + " + x + " + " + y + " = " + (a + b); },
    uitleg: "Spring eerst naar 10 en tel daarna de rest erbij. Vraag jezelf: hoeveel heeft het eerste getal nog nodig tot 10? Bij 7 + 8 is dat 3. Van de 8 blijft dan 5 over: 10 + 5 = 15.",
    voorbeeld: "9 + 6 = ?\n9 heeft 1 nodig tot 10\n9 + 1 = 10, van de 6 blijft 5 over\n10 + 5 = 15",
    minCorrect: 12,
    generate: function() {
      // a + b > 10, both single digit
      var a = rnd(5, 9);
      var b = rnd(10 - a + 1, 9); // guarantees carry
      return makeQ([a, b], a + b);
    },
  },

  {
    id: "s07_no_carry_100",
    label: "Twee cijfers, geen overstap",
    group: "Tot 100",
    desc: "34 + 25, 41 + 38 — zonder overstap",
    strategy: "splitsen",
    tip: function(t) { var a = t[0]; var b = t[1]; var aT = Math.floor(a / 10) * 10; var aE = a % 10; var bT = Math.floor(b / 10) * 10; var bE = b % 10; return "Tel tientallen en eenheden apart op: " + a + " + " + b + " → " + aT + "+" + bT + "=" + (aT + bT) + ", " + aE + "+" + bE + "=" + (aE + bE) + ", samen " + (a + b); },
    uitleg: "Houd het eerste getal heel en tel het tweede er in twee stappen bij: eerst de tientallen, dan de eenheden. Zo hoef je maar één tussenstand te onthouden. 46 + 32: 46 + 30 = 76, en 76 + 2 = 78.",
    voorbeeld: "52 + 35 = ?\n52 + 30 = 82\n82 + 5 = 87",
    minCorrect: 10,
    generate: function() {
      var aT = rnd(1, 5) * 10;
      var aE = rnd(1, 8);
      var a  = aT + aE;
      var bT = rnd(1, Math.floor((9 - Math.floor(a / 10))) || 1) * 10;
      if (bT < 10) bT = 10;
      var bE = rnd(0, 9 - aE); // no carry in units
      var b  = bT + bE;
      if (a + b > 99) { b = 10; }
      return makeQ([a, b], a + b);
    },
  },

  {
    id: "s08_carry_100",
    label: "Twee cijfers, met overstap",
    group: "Tot 100",
    desc: "47 + 36, 58 + 28 — met overstap",
    strategy: "compenseren",
    tip: function(t) { var a = t[0]; var b = t[1]; var bRound = Math.ceil(b / 10) * 10; var diff = bRound - b; return "Rond af en compenseer: " + a + " + " + b + " → " + a + " + " + bRound + " − " + diff + " = " + (a + b) + ". Of: splits in tientallen + eenheden."; },
    uitleg: "Twee manieren uit je hoofd. Rijgen: tel eerst de tientallen erbij en dan de eenheden, 47 + 30 + 6 = 77 + 6 = 83. Compenseren: maak er een rond getal van en haal het verschil er weer af, 47 + 40 − 4 = 87 − 4 = 83.",
    voorbeeld: "55 + 28 = ?\nRijgen: 55 + 20 = 75\n75 + 8 = 83\nCompenseren: 55 + 30 = 85\n85 − 2 = 83",
    minCorrect: 12,
    generate: function() {
      var a = rnd(24, 68);
      var aE = a % 10;
      var bE = rnd(10 - aE + 1, 9); // forces carry in units
      var bT = rnd(1, Math.floor((99 - a) / 10) - 1 || 1) * 10;
      if (bT < 10) bT = 10;
      var b = bT + bE;
      if (a + b > 99) { b = 99 - a; if (b < 12) b = 12; }
      return makeQ([a, b], a + b);
    },
  },

  {
    id: "s09_three_terms",
    label: "Drie getallen",
    group: "Meerdere termen",
    desc: "3 + 4 + 5, 12 + 8 + 7",
    strategy: "hergroeperen",
    tip: "Zoek makkelijke paren: bij 3+7+8 eerst 3+7=10, dan 10+8=18.",
    uitleg: "Je mag de volgorde veranderen. Zoek eerst twee getallen die samen 10 of 20 maken en tel het derde getal daarna erbij. Bij 4 + 9 + 6: eerst 4 + 6 = 10, dan 10 + 9 = 19.",
    voorbeeld: "8 + 5 + 2 = ?\n8 + 2 = 10\n10 + 5 = 15",
    minCorrect: 10,
    generate: function() {
      var t = rnd(1, 3);
      var a, b, c;
      if (t === 1) {
        // small: 1-9 each
        a = rnd(2, 8); b = rnd(2, 8); c = rnd(2, 8);
      } else if (t === 2) {
        // medium: up to ~40
        a = rnd(5, 15); b = rnd(5, 15); c = rnd(2, 10);
      } else {
        // with a nice pair
        a = rnd(1, 9); b = 10 - a; c = rnd(2, 9);
      }
      return makeQ([a, b, c], a + b + c);
    },
  },

  {
    id: "s10_hundreds",
    label: "Honderdtallen",
    group: "Grotere getallen",
    desc: "200+300, 150+250",
    strategy: "patroon",
    tip: "Honderdtallen optellen: 200+500 is hetzelfde als 2+5, maar dan ×100.",
    uitleg: "Begin bij de honderden en werk naar klein. 300 + 400: 3 + 4 = 7, dus 700. Bij 313 + 141 tel je eerst de honderden erbij (413), dan de tientallen (453) en dan de eenheden (454).",
    voorbeeld: "246 + 152 = ?\n246 + 100 = 346\n346 + 50 = 396\n396 + 2 = 398",
    minCorrect: 8,
    generate: function() {
      var t = rnd(1, 3);
      var a, b;
      if (t === 1) {
        a = rnd(1, 7) * 100;
        b = rnd(1, 9 - Math.floor(a / 100)) * 100;
      } else if (t === 2) {
        a = rnd(1, 8) * 100;
        b = rnd(10, 80);
        if (a + b > 999) b = 10;
      } else {
        a = rnd(100, 400);
        b = rnd(100, 500 - a);
      }
      return makeQ([a, b], a + b);
    },
  },

  {
    id: "s11_mixed_large",
    label: "Gemengd groot",
    group: "Grotere getallen",
    desc: "134+52, 267+31, gevarieerd tot 999",
    strategy: "splitsen",
    tip: function(t) { var a = t[0]; var b = t[1]; var bT = Math.floor(b / 10) * 10; var bE = b % 10; if (bE === 0) { return "Splits in stappen: " + a + " + " + b + " → direct " + (a + b) + "."; } return "Splits in stappen: " + a + " + " + b + " → " + a + " + " + bT + " = " + (a + bT) + ", en + " + bE + " = " + (a + b); },
    uitleg: "Houd het eerste getal heel en tel het tweede er in stukken bij: eerst de honderden, dan de tientallen, dan de eenheden. 156 + 43: 156 + 40 = 196, en 196 + 3 = 199.",
    voorbeeld: "372 + 54 = ?\n372 + 50 = 422\n422 + 4 = 426",
    minCorrect: 10,
    generate: function() {
      var t = rnd(1, 4);
      var a, b;
      if (t === 1) {
        a = rnd(100, 600); b = rnd(10, 80);
        if (a + b > 999) b = 10;
      } else if (t === 2) {
        a = rnd(200, 500); b = rnd(100, 499 - (a - 200));
        if (a + b > 999) b = 100;
      } else if (t === 3) {
        a = rnd(50, 300); b = rnd(50, 300);
        if (a + b > 999) b = 50;
      } else {
        a = rnd(300, 700); b = rnd(10, 299);
        if (a + b > 999) b = 10;
      }
      return makeQ([a, b], a + b);
    },
  },

  {
    id: "s12_four_terms",
    label: "Vier termen",
    group: "Meerdere termen",
    desc: "Vier getallen optellen, tien-paren zoeken",
    strategy: "hergroeperen",
    tip: "Zoek altijd eerst paren die 10 maken — die kun je als steen in de schoorsteen leggen.",
    uitleg: "Zoek paren die samen 10 maken en tel die eerst op. Wat overblijft tel je er daarna bij. Vind je geen paar van 10, zoek dan een dubbel, zoals 8 + 8 = 16.",
    voorbeeld: "5 + 8 + 5 + 2 = ?\n5 + 5 = 10\n8 + 2 = 10\n10 + 10 = 20",
    minCorrect: 10,
    generate: function() {
      var t = rnd(1, 3);
      var a, b, c, d;
      if (t === 1) {
        // small, with nice pairs
        a = rnd(1, 9); b = 10 - a;
        c = rnd(1, 9); d = 10 - c;
        // shuffle so pairs aren’t always adjacent
        var shuffled = shuffle([a, b, c, d]);
        a = shuffled[0]; b = shuffled[1]; c = shuffled[2]; d = shuffled[3];
      } else if (t === 2) {
        // medium
        a = rnd(2, 8); b = rnd(2, 8); c = rnd(2, 8); d = rnd(2, 8);
      } else {
        // larger
        a = rnd(5, 20); b = rnd(5, 20); c = rnd(5, 15); d = rnd(5, 10);
      }
      return makeQ([a, b, c, d], a + b + c + d);
    },
  },

  // ── GROEP 2: GETALLEN TOT 1000 EN VERDER ─────────────────────────

  {
    id: "s13_carry_1000",
    label: "Optellen tot 1000",
    group: "Grotere getallen",
    desc: "456 + 237, met overstap naar honderdtal",
    strategy: "rijgen",
    tip: "Reken in stappen: eerst tientallen erbij, dan eenheden. Of gebruik de kolomsmethode.",
    uitleg: "Rijgen werkt ook bij grotere getallen: houd het eerste getal heel en tel het tweede er in stukken bij. 456 + 237: 456 + 200 = 656, 656 + 30 = 686, 686 + 7 = 693. Zit een getal vlak onder een rond getal, dan is compenseren sneller.",
    voorbeeld: "348 + 275 = ?\n348 + 200 = 548\n548 + 70 = 618\n618 + 5 = 623",
    minCorrect: 10,
    generate: function() {
      var a = rnd(100, 700);
      var b = rnd(100, 800);
      if (a + b > 999) b = rnd(10, 999 - a);
      if (b < 10) b = 10;
      return makeQ([a, b], a + b);
    },
  },

  {
    id: "s14_thousands",
    label: "Duizendtallen",
    group: "Grotere getallen",
    desc: "1000+2000, 3500+1500",
    strategy: "patroon",
    tip: "Net als honderdtallen: 2000 + 5000 is 2+5 keer duizend = 7000.",
    uitleg: "Werk van groot naar klein. 4000 + 254 = 4254: je hebt 4 duizend en daar tel je 254 bij op. Bij 3422 + 3762 tel je eerst de duizenden erbij (6422), dan de honderden (7122), de tientallen (7182) en de eenheden (7184).",
    voorbeeld: "3000 + 4000: 3 + 4 = 7, dus 7000\n2500 + 1500 = ?\n2500 + 1000 = 3500\n3500 + 500 = 4000",
    minCorrect: 8,
    generate: function() {
      var t = rnd(1, 3);
      var a, b;
      if (t === 1) {
        a = rnd(1, 7) * 1000;
        b = rnd(1, 9 - Math.floor(a / 1000)) * 1000;
        if (b < 1000) b = 1000;
      } else if (t === 2) {
        a = rnd(1, 8) * 1000;
        b = rnd(100, 900);
        if (a + b > 9999) b = 100;
      } else {
        a = rnd(1000, 5000);
        b = rnd(1000, 4000);
        if (a + b > 9999) b = 1000;
      }
      return makeQ([a, b], a + b);
    },
  },

  {
    id: "s15_five_terms",
    label: "Vijf getallen",
    group: "Meerdere termen",
    desc: "Vijf termen optellen, slim hergroeperen",
    strategy: "hergroeperen",
    tip: "Zoek meerdere paren die 10 of 100 maken — die zijn snel klaar.",
    uitleg: "Zoek zoveel mogelijk paren van 10 en tel die eerst op. De losse getallen tel je aan het eind erbij. Streep in je hoofd elk getal weg dat je al gebruikt hebt, dan tel je niets dubbel.",
    voorbeeld: "4 + 6 + 3 + 7 + 5 = ?\n4 + 6 = 10\n3 + 7 = 10\n10 + 10 + 5 = 25",
    minCorrect: 10,
    generate: function() {
      var t = rnd(1, 3);
      var a, b, c, d, e;
      if (t === 1) {
        a = rnd(1, 9); b = 10 - a;
        c = rnd(1, 9); d = 10 - c;
        e = rnd(1, 9);
        var arr = shuffle([a, b, c, d, e]);
        a = arr[0]; b = arr[1]; c = arr[2]; d = arr[3]; e = arr[4];
      } else if (t === 2) {
        a = rnd(2, 8); b = rnd(2, 8); c = rnd(2, 8); d = rnd(2, 8); e = rnd(2, 8);
      } else {
        a = rnd(5, 15); b = rnd(5, 15); c = rnd(5, 15); d = rnd(5, 10); e = rnd(5, 10);
      }
      return makeQ([a, b, c, d, e], a + b + c + d + e);
    },
  },

  {
    id: "s16_complement_100",
    label: "Aanvullen tot 100",
    group: "Tot 100",
    desc: "37 + ? = 100, aanvullen met twee stappen",
    strategy: "aanvullen",
    tip: function(t) { var a = t[0]; var b = t[1]; var aTiental = Math.ceil(a / 10) * 10; if (aTiental === a) aTiental = a + 10; var stap1 = aTiental - a; var stap2 = 100 - aTiental; return "Eerst aanvullen tot het volgende tiental, dan naar 100: " + a + " → " + aTiental + " (" + stap1 + " erbij) → 100 (" + stap2 + " erbij), samen " + b; },
    uitleg: "Van een getal naar 100 spring je in twee stappen: eerst naar het volgende tiental, dan naar 100. 46 → 50 is 4, 50 → 100 is 50, samen 54. Bij twee getallen die samen 100 zijn, maken de eenheden meestal samen 10. Zijn beide getallen ronde tientallen, dan zijn de eenheden samen 0.",
    voorbeeld: "73 + ? = 100\n73 → 80 is 7\n80 → 100 is 20\nSamen 27, dus 73 + 27 = 100",
    minCorrect: 10,
    generate: function() {
      var a = rnd(11, 89);
      var b = 100 - a;
      return makeQ([a, b], a + b);
    },
  },

  {
    id: "s17_bridge_hundred",
    label: "Door het honderdtal",
    group: "Tot 1000",
    desc: "75 + 45 = 120 — door 100 heen",
    strategy: "aanvullen",
    tip: function(t) { var a = t[0]; var b = t[1]; var x = 100 - a; var y = b - x; return "Vul eerst aan tot 100, tel dan de rest op: " + a + " + " + b + " → " + a + " + " + x + " + " + y + " = " + (a + b); },
    uitleg: "Vul eerst aan tot 100 en tel daarna de rest erbij. 68 + 47: 68 heeft 32 nodig tot 100. Van de 47 blijft dan 15 over: 100 + 15 = 115.",
    voorbeeld: "83 + 38 = ?\n83 + 17 = 100\n38 − 17 = 21 blijft over\n100 + 21 = 121",
    minCorrect: 10,
    generate: function() {
      var a = rnd(51, 89);
      var b = rnd(100 - a + 1, 79);
      if (a + b > 200) b = 100 - a + rnd(1, 20);
      return makeQ([a, b], a + b);
    },
  },

  {
    id: "s18_near_double",
    label: "Bijna-verdubbelen",
    group: "Strategieën",
    desc: "6+7 = 6+6+1, 8+9 = 8+8+1",
    strategy: "verdubbelen",
    tip: function(t) { var a = t[0]; var b = t[1]; var small = Math.min(a, b); var diff = Math.abs(a - b); return "Als twee getallen bijna gelijk zijn, verdubbel het kleinste en tel het verschil erbij: " + a + "+" + b + " = " + small + "+" + small + "+" + diff + " = " + (a + b); },
    uitleg: "Dubbelen weet je vaak al: 6 + 6 = 12. Liggen de getallen dicht bij elkaar, neem dan het dubbele van het kleinste getal en tel het verschil erbij. 6 + 7 = 6 + 6 + 1 = 13. En 8 + 10 = 8 + 8 + 2 = 18.",
    voorbeeld: "7 + 8 = ?\nDubbel: 7 + 7 = 14\n8 is 1 meer dan 7\n14 + 1 = 15",
    minCorrect: 10,
    generate: function() {
      var base = rnd(3, 12);
      var diff = rnd(1, 2);
      var a = base;
      var b = base + diff;
      return makeQ([a, b], a + b);
    },
  },

  {
    id: "s19_compensate",
    label: "Compenseren",
    group: "Strategieën",
    desc: "29+47 → 30+47−1, slim afronden",
    strategy: "compenseren",
    tip: function(t) { var a = t[0]; var b = t[1]; var aRound = Math.round(a / 10) * 10; var diff = aRound - a; return "Maak een getal rond, tel op, en compenseer het verschil: " + a + "+" + b + " = " + aRound + "+" + b + (diff > 0 ? "−" + diff : "+" + Math.abs(diff)) + " = " + (a + b); },
    uitleg: "Zit een getal net onder een tiental, maak het dan rond. Tel het ronde getal erbij en haal er daarna weer af wat je te veel deed. 38 + 54: 40 + 54 = 94. Je deed er 2 te veel bij, dus 94 − 2 = 92.",
    voorbeeld: "59 + 36 = ?\n59 is 1 minder dan 60\n60 + 36 = 96\n1 te veel, dus 96 − 1 = 95",
    minCorrect: 10,
    generate: function() {
      var nearRound = rnd(1, 5);
      var a = rnd(2, 9) * 10 - nearRound;
      var b = rnd(10, 60);
      if (a < 10) a = 9;
      if (a + b > 199) b = rnd(10, 30);
      return makeQ([a, b], a + b);
    },
  },

  {
    id: "s20_error_spotter_easy",
    label: "Fout spotten (makkelijk)",
    group: "Fout spotten",
    desc: "Welke som is wiskundig fout?",
    strategy: "controleren",
    tip: "Reken elke som snel na — één ervan klopt niet!",
    uitleg: "Soms staat er een foute som tussen correcte sommen. Controleer elke optelling snel. De antwoorden liggen dicht bij het juiste antwoord, dus je moet nauwkeurig kijken!",
    voorbeeld: "Welk antwoord is FOUT?\n3+4=8 → FOUT (moet 7 zijn)\n5+6=11 → correct\n2+9=11 → correct\n8+3=11 → correct",
    minCorrect: 10,
    generate: makeErrorQ,
  },

  // ── GROEP 3: GETALLENLIJN EN SCHATTEN ─────────────────────────────

  {
    id: "s21_number_line_10",
    label: "Getallenlijn tot 10",
    group: "Getallenlijn",
    desc: "Welk getal hoort op de stip? (0–10)",
    strategy: "tellen",
    tip: "Tel de stappen van links naar rechts en van rechts naar links.",
    uitleg: "Op een getallenlijn van 0 tot 10 staan de getallen op gelijke afstand. Als de stip tussen 3 en 5 staat midden erop, is het 4. Gebruik de bekende getallen als ankers.",
    voorbeeld: "Getallenlijn 0→10. De stip staat op de 7de streep. Welk getal? Antwoord: 7.",
    minCorrect: 8,
    generate: function() {
      var answer = rnd(1, 9);
      var ws = wrongChoices(answer, 3, 0);
      return { question: "Getallenlijn 0–10: de pijl wijst naar getal " + answer + ". Klopt dat? Kies het juiste getal.", answer: answer, choices: shuffle([answer].concat(ws)) };
    },
  },

  {
    id: "s22_number_line_100",
    label: "Getallenlijn tot 100",
    group: "Getallenlijn",
    desc: "Welk getal hoort op de stip? (0–100, tientallen)",
    strategy: "tellen",
    tip: "Elke grote streep is een tiental; kleine strepen zijn eenheden.",
    uitleg: "Op een lijn van 0 tot 100 kun je de tientallen als anker gebruiken. Ligt de stip twee strepen rechts van 60? Dan is het 62. Tel altijd vanaf het dichtstbijzijnde tiental.",
    voorbeeld: "Getallenlijn 0–100. Stip staat 3 verder dan 40. Antwoord: 43.",
    minCorrect: 8,
    generate: function() {
      var anchor = rnd(0, 9) * 10;
      var extra  = rnd(1, 9);
      var answer = anchor + extra;
      var ws = wrongChoices(answer, 3, 0);
      return { question: "Getallenlijn: het getal " + answer + " staat op de lijn. Kies het juiste getal.", answer: answer, choices: shuffle([answer].concat(ws)) };
    },
  },

  {
    id: "s23_round_10",
    label: "Afronden op tientallen",
    group: "Afronden en schatten",
    desc: "47 → 50, 23 → 20",
    strategy: "afronden",
    tip: "Kijk naar het eenheden-cijfer: 5 of meer → rond omhoog; 4 of minder → rond omlaag.",
    uitleg: "Kijk alleen naar het eenheden-cijfer. Is dat 5, 6, 7, 8 of 9, ga dan omhoog naar het volgende tiental. Is het 0, 1, 2, 3 of 4, ga dan omlaag. 47 wordt 50, want 7 is 5 of meer.",
    voorbeeld: "Rond 63 af op tientallen.\nEenheden-cijfer: 3, dat is minder dan 5\nOmlaag: 60",
    minCorrect: 10,
    generate: function() {
      var a = rnd(11, 99);
      while (a % 10 === 0) a = rnd(11, 99);
      var e = a % 10;
      var answer = e >= 5 ? a + (10 - e) : a - e;
      var ws = [answer - 10, answer + 10, answer - 20].filter(function(v){ return v >= 0; });
      while (ws.length < 3) ws.push(answer + ws.length * 10 + 10);
      var choices = shuffle([answer].concat(ws.slice(0, 3)));
      return { question: "Rond " + a + " af op tientallen.", answer: answer, choices: choices };
    },
  },

  {
    id: "s24_round_100",
    label: "Afronden op honderdtallen",
    group: "Afronden en schatten",
    desc: "347 → 300, 752 → 800",
    strategy: "afronden",
    tip: "Kijk naar het tiental-cijfer: 5 of meer → rond omhoog; minder dan 5 → rond omlaag.",
    uitleg: "Kijk alleen naar het tientallen-cijfer. Is dat 5 of meer, ga dan omhoog naar het volgende honderdtal. Is het 4 of minder, ga dan omlaag. 347 wordt 300, want 4 is minder dan 5. 752 wordt 800.",
    voorbeeld: "Rond 463 af op honderdtallen.\nTientallen-cijfer: 6, dat is 5 of meer\nOmhoog: 500",
    minCorrect: 10,
    generate: function() {
      var a = rnd(101, 999);
      while (a % 100 === 0) a = rnd(101, 999);
      var t = Math.floor((a % 100) / 10);
      var h = Math.floor(a / 100) * 100;
      var answer = t >= 5 ? h + 100 : h;
      if (answer > 999) answer = h;
      var ws = [answer - 100, answer + 100, answer - 200].filter(function(v){ return v >= 0; });
      while (ws.length < 3) ws.push(answer + (ws.length + 1) * 100);
      var choices = shuffle([answer].concat(ws.slice(0, 3)));
      return { question: "Rond " + a + " af op honderdtallen.", answer: answer, choices: choices };
    },
  },

  {
    id: "s25_estimate_sum",
    label: "Schatten van sommen",
    group: "Afronden en schatten",
    desc: "48 + 31 ≈ 50 + 30 = 80 (geschat)",
    strategy: "schatten",
    tip: function(t) { var a = round10(t[0]), b = round10(t[1]); return "Rond af op tientallen: " + t[0] + " wordt " + a + " en " + t[1] + " wordt " + b + ". " + a + " + " + b + " = " + (a + b) + "."; },
    uitleg: "Schatten is eerst afronden en dan rekenen. Rond elk getal af op tientallen (eenheden 5 of meer omhoog, 4 of minder omlaag) en tel de ronde getallen op. 48 + 31 wordt 50 + 30 = 80. Het echte antwoord, 79, ligt er dichtbij.",
    voorbeeld: "Schat: 67 + 24 ≈ ?\n67 wordt 70, 24 wordt 20\n70 + 20 = 90\nEcht antwoord: 91, dat ligt er dichtbij",
    minCorrect: 8,
    generate: function() {
      return randomWith(function() {
        var a = rnd(11, 89);
        var b = rnd(11, 89);
        // Geen grensgeval (eenheid 5) en de schatting moet ook de dichtstbijzijnde keuze zijn
        if (a % 10 === 5 || b % 10 === 5) return null;
        var answer = round10(a) + round10(b);
        if (!fairEstimate(a + b, answer, 10)) return null;
        return { terms: [a, b], question: "Schat: " + a + " + " + b + " ≈ ?", answer: answer, choices: estimateChoices(answer, 10) };
      });
    },
  },

  {
    id: "s26_mental_split",
    label: "Mentaal splitsen",
    group: "Strategieën",
    desc: "74 + 38 = 74 + 30 + 8, stap voor stap",
    strategy: "splitsen",
    tip: "Splits het tweede getal: eerst tientallen erbij, dan eenheden.",
    uitleg: "Mentaal splitsen: 74 + 38 = 74 + 30 + 8. Stap 1: 74 + 30 = 104. Stap 2: 104 + 8 = 112. Dit gaat snel als je de eerste stap kunt vasthouden!",
    voorbeeld: "56 + 47 = ?\n56 + 40 = 96, dan 96 + 7 = 103.",
    minCorrect: 10,
    generate: function() {
      var a = rnd(25, 75);
      var b = rnd(15, 55);
      if (a + b > 199) b = rnd(10, 30);
      return makeQ([a, b], a + b);
    },
  },

  {
    id: "s27_bridge_ten_adv",
    label: "Aanvullen tot tiental (gevorderd)",
    group: "Strategieën",
    desc: "87 + 14, 86 + 7 — tientallen en eenheden erbij, soms over het tiental",
    strategy: "aanvullen",
    tip: "Hoeveel moet erbij om het volgende tiental te bereiken? Kijk naar de eenheden.",
    uitleg: "Gaat de som over een tiental? Vul dan eerst aan tot dat tiental en tel daarna de rest erbij. 86 + 7: 86 heeft 4 nodig tot 90, van de 7 blijft 3 over: 90 + 3 = 93. Is het tweede getal groter dan 10, tel dan eerst de tientallen erbij.",
    voorbeeld: "87 + 14 = ?\nSplits 14 in 10 en 4\n87 + 10 = 97\nVan de 4 gebruik je 3: 97 + 3 = 100\nEr blijft 1 over: 100 + 1 = 101",
    minCorrect: 10,
    generate: function() {
      var roundTo = rnd(2, 9) * 10;
      var a = roundTo - rnd(1, 9);
      var extra = rnd(1, 15);
      var b = (roundTo - a) + extra;
      return makeQ([a, b], a + b);
    },
  },

  {
    id: "s28_column_2digit",
    label: "Kolomoptelling (2-cijferig)",
    group: "Kolomoptelling",
    desc: "Twee 2-cijferige getallen onder elkaar optellen",
    strategy: "kolomsgewijs",
    tip: "Reken eerst de eenheden, dan de tientallen. Vergeet de onthoud-één niet!",
    uitleg: "Kolomoptelling: schrijf getallen onder elkaar, zorg dat eenheden onder eenheden staan. Tel van rechts naar links op. Als de eenheden samen 10 of meer zijn, onthoud een 1 naar de tientallen.",
    voorbeeld: "  47\n+ 38\n----\n  85\n(7+8=15, schrijf 5 onthoud 1; 4+3+1=8)",
    minCorrect: 10,
    generate: function() {
      var a = rnd(12, 88);
      var b = rnd(12, 88);
      if (a + b > 99) b = rnd(10, 99 - a);
      if (b < 10) b = 10;
      return makeQ([a, b], a + b);
    },
  },

  {
    id: "s29_column_3digit",
    label: "Kolomoptelling (3-cijferig)",
    group: "Kolomoptelling",
    desc: "Drie-cijferige getallen optellen in kolommen",
    strategy: "kolomsgewijs",
    tip: "Werk kolom voor kolom van rechts naar links; draag elke onthoud-één mee.",
    uitleg: "Met drie kolommen (eenheden, tientallen, honderdtallen) ga je van rechts naar links. Elke keer als een kolom 10 of meer oplevert, schrijf je de eenheden op en draag je 1 naar de volgende kolom.",
    voorbeeld: "  347\n+ 285\n-----\n  632\n(7+5=12, schrijf 2 onthoud 1; 4+8+1=13, schrijf 3 onthoud 1; 3+2+1=6)",
    minCorrect: 10,
    generate: function() {
      var a = rnd(100, 700);
      var b = rnd(100, 800);
      if (a + b > 999) b = rnd(50, 999 - a);
      if (b < 10) b = 10;
      return makeQ([a, b], a + b);
    },
  },

  {
    id: "s30_three_addends",
    label: "Drie termen optellen (gevorderd)",
    group: "Meerdere termen",
    desc: "Drie 2-cijferige getallen optellen",
    strategy: "hergroeperen",
    tip: "Zoek eerst een makkelijk paar, tel het derde getal daarna erbij.",
    uitleg: "Met drie 2-cijferige getallen: zoek eerst twee getallen die makkelijk optellen (naar een rond getal), tel dan het derde erbij. 24 + 36 + 15: 24+36=60, dan 60+15=75.",
    voorbeeld: "32 + 48 + 25 = ?\n32 + 48 = 80, dan 80 + 25 = 105.",
    minCorrect: 10,
    generate: function() {
      var a = rnd(10, 40);
      var b = rnd(10, 40);
      var c = rnd(10, 40);
      if (a + b + c > 150) c = rnd(5, 20);
      return makeQ([a, b, c], a + b + c);
    },
  },

  {
    id: "s31_missing_term",
    label: "Missende term (eenvoudig)",
    group: "Missende term",
    desc: "? + 5 = 12 of 8 + ? = 15",
    strategy: "terug-rekenen",
    tip: "Trek het bekende getal af van de uitkomst om de missende term te vinden.",
    uitleg: "Vraag jezelf: hoeveel moet er bij het bekende getal om bij de uitkomst te komen? Bij ? + 5 = 12 spring je van 5 naar 10 (dat is 5) en van 10 naar 12 (dat is 2): samen 7. Terugrekenen mag ook: 12 − 5 = 7.",
    voorbeeld: "? + 6 = 14\n6 → 10 is 4\n10 → 14 is 4\nSamen 8. Controle: 8 + 6 = 14",
    minCorrect: 10,
    generate: function() {
      var b = rnd(2, 9);
      var answer = rnd(3, 9);
      var total = answer + b;
      var ws = wrongChoices(answer, 3, 1);
      return { question: "? + " + b + " = " + total, answer: answer, choices: shuffle([answer].concat(ws)) };
    },
  },

  {
    id: "s32_missing_term_2digit",
    label: "Missende term (tientallen)",
    group: "Missende term",
    desc: "? + 30 = 75 of 45 + ? = 80",
    strategy: "terug-rekenen",
    tip: "Trek het bekende getal af van de uitkomst om de missende term te vinden.",
    uitleg: "Trek het bekende tiental van de uitkomst af. De eenheden blijven daarbij gelijk. ? + 40 = 81: 81 − 40 = 41. Controleer door op te tellen: 41 + 40 = 81.",
    voorbeeld: "? + 30 = 73\n73 − 30 = 43\nControle: 43 + 30 = 73",
    minCorrect: 10,
    generate: function() {
      var b = rnd(1, 7) * 10;
      var answer = rnd(10, 60);
      var total = answer + b;
      var ws = wrongChoices(answer, 3, 1);
      return { question: "? + " + b + " = " + total, answer: answer, choices: shuffle([answer].concat(ws)) };
    },
  },

  {
    id: "s33_error_spotter_medium",
    label: "Fout spotten (middel)",
    group: "Fout spotten",
    desc: "Grotere sommen — welke klopt niet?",
    strategy: "controleren",
    tip: "Reken elke som snel na — let op de overstap!",
    uitleg: "Reken elke som snel na in je hoofd. Let vooral op sommen over de 10: vul eerst aan tot 10 en tel de rest erbij. Komt jouw uitkomst niet overeen met het antwoord in de som, dan heb je de foute som gevonden.",
    voorbeeld: "Welke som is FOUT?\n8 + 6 = 14: 8 + 2 = 10, nog 4 erbij is 14. Klopt.\n7 + 9 = 17: 7 + 3 = 10, nog 6 erbij is 16. Klopt niet!\nDus 7 + 9 = 17 is fout. Goed is 16.",
    minCorrect: 10,
    generate: makeErrorQ,
  },

  // ── GROEP 4: BREUKEN ─────────────────────────────────────────────

  {
    id: "s34_frac_same_denom",
    label: "Breuken: zelfde noemer",
    group: "Breuken",
    desc: "1/5 + 2/5, tellers optellen",
    strategy: "breuk-optellen",
    tip: "Zelfde noemer: alleen de tellers optellen, de noemer blijft gelijk.",
    uitleg: "Als beide breuken dezelfde noemer hebben, tel je alleen de tellers op. De noemer verandert niet! 3/8 + 4/8 = 7/8. Denk aan pizza's: 3 punten + 4 punten van dezelfde pizza.",
    voorbeeld: "2/9 + 5/9 = ?\nZelfde noemer: 2+5=7, noemer 9. Antwoord: 7/9.",
    minCorrect: 10,
    generate: function() {
      var d = rnd(3, 9);
      var n1 = rnd(1, d - 2);
      var n2 = rnd(1, d - 1 - n1);
      if (n2 < 1) n2 = 1;
      var answer = fracStr(n1 + n2, d);
      var ws = [
        fracStr(n1 + n2 + 1, d),
        fracStr(n1 + n2 - 1 > 0 ? n1 + n2 - 1 : n1 + n2 + 2, d),
        fracStr(n1 + n2, d + 1),
      ];
      var choices = shuffle([answer].concat(ws));
      return { question: fracStr(n1, d) + " + " + fracStr(n2, d) + " =", answer: answer, choices: choices };
    },
  },

  {
    id: "s35_frac_improper",
    label: "Breuken: onechte breuk",
    group: "Breuken",
    desc: "3/4 + 3/4 = 6/4 = 1 1/2",
    strategy: "breuk-optellen",
    tip: "Als de teller groter is dan de noemer, heb je een onechte breuk — die kun je omschrijven.",
    uitleg: "Als je twee breuken optelt en de teller wordt groter dan de noemer, is de uitkomst groter dan 1. 3/4 + 3/4 = 6/4. We vereenvoudigen: 6/4 = 3/2 = 1 1/2. Maar in dit spel noteren we 6/4 als 3/2.",
    voorbeeld: "5/6 + 5/6 = ?\n5+5=10, noemer 6. 10/6 vereenvoudigt: gcd(10,6)=2 → 5/3.",
    minCorrect: 10,
    generate: function() {
      var d = rnd(3, 6);
      var n1 = rnd(Math.ceil(d / 2), d - 1);
      var n2 = rnd(Math.ceil(d / 2), d - 1);
      // Garantie: n1 + n2 > d zodat uitkomst altijd een echte onechte breuk is (> 1)
      // Randgeval: d=3, n1=2, n2=1 → som=3=d → fracStr(3,3)="1" (geen onechte breuk)
      // Herberekenen tot som strikt groter is dan d
      var maxTries = 20;
      while (n1 + n2 <= d && maxTries-- > 0) {
        n1 = rnd(Math.ceil(d / 2), d - 1);
        n2 = rnd(Math.ceil(d / 2), d - 1);
      }
      // Harde fallback als herberekening niet lukt
      // Gebruik d-1 als maximale teller (altijd < d, dus geldige breuk) en controleer som > d
      if (n1 + n2 <= d) { n1 = d - 1; n2 = d - 1; }
      // Laatste zekerheid: som moet strikt > d zijn; d-1 + d-1 = 2d-2 >= d+1 voor alle d >= 3
      // Bewijs: 2d-2 > d  <=>  d > 2  — geldt voor d in [3..6] ✓
      var sumN = n1 + n2;
      var answer = fracStr(sumN, d);
      // Genereer unieke wrong choices — vermijd fracStr-collisions door offsets te gebruiken
      var seen = {}; seen[answer] = true;
      var ws = [];
      var offsets = [1, -1, 2, -2, 3];
      for (var oi = 0; oi < offsets.length && ws.length < 3; oi++) {
        var cand = fracStr(sumN + offsets[oi], d);
        if (!seen[cand]) { seen[cand] = true; ws.push(cand); }
      }
      // Fallback: andere noemer
      if (ws.length < 3) {
        var cand2 = fracStr(sumN, d + 1);
        if (!seen[cand2]) { seen[cand2] = true; ws.push(cand2); }
      }
      if (ws.length < 3) {
        var cand3 = fracStr(sumN + 4, d);
        if (!seen[cand3]) ws.push(cand3);
      }
      var choices = shuffle([answer].concat(ws.slice(0, 3)));
      return { question: fracStr(n1, d) + " + " + fracStr(n2, d) + " =", answer: answer, choices: choices };
    },
  },

  {
    id: "s36_frac_diff_denom",
    label: "Breuken: ongelijke noemer",
    group: "Breuken",
    desc: "1/2 + 1/4, gemeenschappelijke noemer zoeken",
    strategy: "breuk-optellen",
    tip: "Maak de noemers gelijk door de kleinste breuk om te schrijven, tel dan de tellers op.",
    uitleg: "Als de noemers verschillen, moet je ze gelijk maken. 1/2 + 1/4: de 2 gaat in de 4, dus 1/2 = 2/4. Dan 2/4 + 1/4 = 3/4. De gemeenschappelijke noemer is het kleinste gemene veelvoud.",
    voorbeeld: "1/3 + 1/6 = ?\n1/3 = 2/6. Dan 2/6 + 1/6 = 3/6 = 1/2.",
    minCorrect: 10,
    generate: function() {
      var pairs = [[2,4],[2,6],[2,8],[3,6],[3,9],[4,8]];
      var pair = pairs[rnd(0, pairs.length - 1)];
      var d1 = pair[0], d2 = pair[1];
      var n1 = rnd(1, d1 - 1);
      var n2 = rnd(1, d2 - 1);
      var lcm = d2;
      var rn1 = n1 * (lcm / d1);
      var rn2 = n2;
      var answer = fracStr(rn1 + rn2, lcm);
      var ws = [
        fracStr(rn1 + rn2 + 1, lcm),
        fracStr(rn1 + rn2 - 1 > 0 ? rn1 + rn2 - 1 : rn1 + rn2 + 2, lcm),
        fracStr(n1 + n2, d1 + d2),
      ];
      var seen = {}; seen[answer] = true;
      var cleanWs = [];
      for (var wi = 0; wi < ws.length; wi++) {
        if (!seen[ws[wi]]) { seen[ws[wi]] = true; cleanWs.push(ws[wi]); }
      }
      while (cleanWs.length < 3) { cleanWs.push(fracStr(rn1 + rn2 + cleanWs.length + 2, lcm)); }
      var choices = shuffle([answer].concat(cleanWs.slice(0, 3)));
      return { question: fracStr(n1, d1) + " + " + fracStr(n2, d2) + " =", answer: answer, choices: choices };
    },
  },

  {
    id: "s37_frac_gcd_reduce",
    label: "Breuken: vereenvoudigen",
    group: "Breuken",
    desc: "2/4 = 1/2, vereenvoudig het antwoord",
    strategy: "ggd",
    tip: "Deel teller en noemer allebei door hun ggd (grootste gemene deler).",
    uitleg: "Na het optellen van breuken vereenvoudig je het antwoord. 4/8: ggd(4,8)=4, dus 4/8 = 1/2. 6/9: ggd(6,9)=3, dus 6/9 = 2/3. Altijd vereenvoudigen als het kan!",
    voorbeeld: "2/6 + 2/6 = 4/6. Vereenvoudigen: ggd(4,6)=2, dus 4/6 = 2/3.",
    minCorrect: 10,
    generate: function() {
      var d = rnd(4, 9);
      var n1 = rnd(1, d - 2);
      var n2 = rnd(1, d - 1 - n1);
      if (n2 < 1) n2 = 1;
      var sumN = n1 + n2;
      var answer = fracStr(sumN, d);
      var wrong1 = String(sumN) + "/" + String(d);
      var wrong2 = fracStr(sumN + 1, d);
      var wrong3 = fracStr(sumN - 1 > 0 ? sumN - 1 : sumN + 2, d);
      var seen = {}; seen[answer] = true;
      var ws = [];
      var candidates = [wrong1, wrong2, wrong3];
      for (var ci = 0; ci < candidates.length; ci++) {
        if (!seen[candidates[ci]]) { seen[candidates[ci]] = true; ws.push(candidates[ci]); }
      }
      while (ws.length < 3) { ws.push(fracStr(sumN + ws.length + 2, d)); }
      var choices = shuffle([answer].concat(ws.slice(0, 3)));
      return { question: "Vereenvoudig: " + sumN + "/" + d + " =", answer: answer, choices: choices };
    },
  },

  {
    id: "s38_frac_mixed",
    label: "Gemengde getallen",
    group: "Breuken",
    desc: "1 1/2 + 2 1/4, gemengde getallen optellen",
    strategy: "breuk-optellen",
    tip: "Tel de gehele delen apart op, tel dan de breuken apart op (maak noemers gelijk).",
    uitleg: "Gemengde getallen: tel de gehele delen op, tel de breuken op. 1 1/4 + 2 1/4: gehelen 1+2=3, breuken 1/4+1/4=2/4=1/2. Samen: 3 1/2. Als de breuken samen ≥1, draag dan 1 over naar het geheel.",
    voorbeeld: "2 1/3 + 1 1/3 = ?\nGehelen: 2+1=3. Breuken: 1/3+1/3=2/3. Antwoord: 3 2/3.",
    minCorrect: 10,
    generate: function() {
      var d = rnd(3, 6);
      var w1 = rnd(1, 4), n1 = rnd(1, d - 1);
      var w2 = rnd(1, 4), n2 = rnd(1, d - 1);
      var totalN = n1 + n2;
      var carry = Math.floor(totalN / d);
      var remN  = totalN % d;
      var totalW = w1 + w2 + carry;
      var answer = remN === 0 ? String(totalW) : totalW + " " + fracStr(remN, d);
      var alt1 = totalW + " " + fracStr(remN + 1 < d ? remN + 1 : remN - 1, d);
      var alt2 = (totalW + 1) + " " + (remN > 0 ? fracStr(remN, d) : "0");
      var alt3 = (totalW - 1) + " " + fracStr(remN > 0 ? remN : d - 1, d);
      var seen = {}; seen[answer] = true;
      var ws = [];
      var cands = [alt1, alt2, alt3];
      for (var ci = 0; ci < cands.length; ci++) {
        if (!seen[cands[ci]]) { seen[cands[ci]] = true; ws.push(cands[ci]); }
      }
      while (ws.length < 3) ws.push(String(totalW + ws.length + 1));
      var choices = shuffle([answer].concat(ws.slice(0, 3)));
      return { question: w1 + " " + fracStr(n1, d) + " + " + w2 + " " + fracStr(n2, d) + " =", answer: answer, choices: choices };
    },
  },

  {
    id: "s39_frac_mixed_carry",
    label: "Gemengd getal met overdracht",
    group: "Breuken",
    desc: "1 3/4 + 2 3/4 = 4 1/2 (breuk-deel > 1)",
    strategy: "breuk-optellen",
    tip: "Als de breuken samen ≥ 1, draag dan 1 over naar het gehele deel.",
    uitleg: "Let op als de breuken samen 1 of meer zijn! 1 3/4 + 2 3/4: breuken 3/4+3/4=6/4=1 2/4=1 1/2. Dan: gehelen 1+2+1=4, rest 1/2. Antwoord: 4 1/2.",
    voorbeeld: "2 2/3 + 1 2/3 = ?\nBreuken: 2/3+2/3=4/3=1 1/3. Gehelen: 2+1+1=4. Antwoord: 4 1/3.",
    minCorrect: 10,
    generate: function() {
      var d = rnd(3, 6);
      var w1 = rnd(1, 3), n1 = rnd(Math.ceil(d / 2), d - 1);
      var w2 = rnd(1, 3), n2 = rnd(Math.ceil(d / 2), d - 1);
      var totalN = n1 + n2;
      var carry = Math.floor(totalN / d);
      var remN  = totalN % d;
      var totalW = w1 + w2 + carry;
      var answer = remN === 0 ? String(totalW) : totalW + " " + fracStr(remN, d);
      var alt1 = (totalW - 1) + " " + fracStr(remN > 0 ? remN : d - 1, d);
      var alt2 = totalW + " " + fracStr(remN + 1 < d ? remN + 1 : remN > 1 ? remN - 1 : d - 1, d);
      var alt3 = String(totalW + 1);
      var seen = {}; seen[answer] = true;
      var ws = [];
      var cands = [alt1, alt2, alt3];
      for (var ci = 0; ci < cands.length; ci++) {
        if (!seen[cands[ci]]) { seen[cands[ci]] = true; ws.push(cands[ci]); }
      }
      while (ws.length < 3) ws.push(String(totalW + ws.length + 1));
      var choices = shuffle([answer].concat(ws.slice(0, 3)));
      return { question: w1 + " " + fracStr(n1, d) + " + " + w2 + " " + fracStr(n2, d) + " =", answer: answer, choices: choices };
    },
  },

  {
    id: "s40_frac_whole",
    label: "Breuk + geheel getal",
    group: "Breuken",
    desc: "3 + 1/4, geheel en breuk combineren",
    strategy: "breuk-optellen",
    tip: "Een geheel getal bij een breuk: het gehele deel en de breuk blijven gewoon naast elkaar staan.",
    uitleg: "Een geheel getal bij een breuk optellen is eenvoudig: 5 + 2/3 = 5 2/3. De noemer verandert niet en het gehele deel wordt groter met dat getal.",
    voorbeeld: "4 + 3/8 = ?\nAntwoord: 4 3/8.",
    minCorrect: 8,
    generate: function() {
      var w = rnd(1, 9);
      var d = rnd(2, 8);
      var n = rnd(1, d - 1);
      var answer = w + " " + fracStr(n, d);
      var alt1 = w + " " + fracStr(n + 1 < d ? n + 1 : n - 1, d);
      var alt2 = (w + 1) + " " + fracStr(n, d);
      var alt3 = fracStr(w * d + n, d);
      var seen = {}; seen[answer] = true;
      var ws = [];
      var cands = [alt1, alt2, alt3];
      for (var ci = 0; ci < cands.length; ci++) {
        if (!seen[cands[ci]]) { seen[cands[ci]] = true; ws.push(cands[ci]); }
      }
      while (ws.length < 3) ws.push(String(w + ws.length + 1));
      var choices = shuffle([answer].concat(ws.slice(0, 3)));
      return { question: w + " + " + fracStr(n, d) + " =", answer: answer, choices: choices };
    },
  },

  {
    id: "s41_frac_three",
    label: "Drie breuken optellen",
    group: "Breuken",
    desc: "1/6 + 2/6 + 3/6",
    strategy: "breuk-optellen",
    tip: "Zelfde noemer: tel alle tellers bij elkaar op.",
    uitleg: "Met drie breuken met dezelfde noemer: tel alle tellers op. 1/5 + 2/5 + 1/5 = 4/5. Vereenvoudig daarna als het kan.",
    voorbeeld: "2/8 + 3/8 + 1/8 = 6/8 = 3/4.",
    minCorrect: 10,
    generate: function() {
      var d = rnd(4, 9);
      var n1 = rnd(1, 3);
      var n2 = rnd(1, 3);
      var n3 = rnd(1, d - n1 - n2 > 0 ? d - n1 - n2 : 1);
      var answer = fracStr(n1 + n2 + n3, d);
      var ws = [
        fracStr(n1 + n2 + n3 + 1, d),
        fracStr(n1 + n2 + n3 - 1 > 0 ? n1 + n2 + n3 - 1 : n1 + n2 + n3 + 2, d),
        fracStr(n1 + n2 + n3, d + 1),
      ];
      var seen = {}; seen[answer] = true;
      var cleanWs = [];
      for (var wi = 0; wi < ws.length; wi++) {
        if (!seen[ws[wi]]) { seen[ws[wi]] = true; cleanWs.push(ws[wi]); }
      }
      while (cleanWs.length < 3) cleanWs.push(fracStr(n1 + n2 + n3 + cleanWs.length + 2, d));
      var choices = shuffle([answer].concat(cleanWs.slice(0, 3)));
      return { question: fracStr(n1, d) + " + " + fracStr(n2, d) + " + " + fracStr(n3, d) + " =", answer: answer, choices: choices };
    },
  },

  // ── GROEP 5: DECIMALEN ────────────────────────────────────────────

  {
    id: "s42_dec_tenth",
    label: "Decimalen: tienden",
    group: "Decimalen",
    desc: "0,3 + 0,5 = 0,8",
    strategy: "decimalen",
    tip: "Tienden optellen: tel de cijfers achter de komma op als gewone getallen, zet dan de komma terug.",
    uitleg: "Een decimaal met één cijfer na de komma is een tiende. 0,3 = 3 tienden. 0,3 + 0,5 = 8 tienden = 0,8. Als de tienden samen 10 of meer worden, krijg je een geheel erbij: 0,7 + 0,6 = 1,3.",
    voorbeeld: "0,4 + 0,3 = ?\n4 tienden + 3 tienden = 7 tienden = 0,7.",
    minCorrect: 10,
    generate: function() {
      var a = rnd(1, 9);
      var b = rnd(1, 9);
      var answer = tiendStr(a + b);
      var ws = [tiendStr(a + b + 1), tiendStr(a + b - 1 > 0 ? a + b - 1 : a + b + 2), tiendStr(a + b + 2)];
      var seen = {}; seen[answer] = true;
      var cleanWs = [];
      for (var wi = 0; wi < ws.length; wi++) {
        if (!seen[ws[wi]]) { seen[ws[wi]] = true; cleanWs.push(ws[wi]); }
      }
      while (cleanWs.length < 3) cleanWs.push(tiendStr(a + b + cleanWs.length + 3));
      var choices = shuffle([answer].concat(cleanWs.slice(0, 3)));
      return { question: tiendStr(a) + " + " + tiendStr(b) + " =", answer: answer, choices: choices };
    },
  },

  {
    id: "s43_dec_hundredth",
    label: "Decimalen: honderdsten",
    group: "Decimalen",
    desc: "0,25 + 0,50 = 0,75",
    strategy: "decimalen",
    tip: "Honderdsten optellen: tel de twee cijfers achter de komma op als gewone getallen, draag over naar tienden als de som >= 100.",
    uitleg: "Twee cijfers na de komma zijn honderdsten. 0,25 + 0,50: tel de honderdsten op (25 + 50 = 75), schrijf als 0,75. Let op: 0,07 + 0,08 = 0,15 (carry naar de tienden!).",
    voorbeeld: "0,30 + 0,45 = ?\n30 + 45 = 75 honderdsten = 0,75.",
    minCorrect: 10,
    generate: function() {
      var a = rnd(1, 75);
      var b = rnd(1, 99 - a);
      if (b < 1) b = 1;
      var answer = honderdStr(a + b);
      var ws = [honderdStr(a + b + 5), honderdStr(a + b - 5 > 0 ? a + b - 5 : a + b + 10), honderdStr(a + b + 10)];
      var seen = {}; seen[answer] = true;
      var cleanWs = [];
      for (var wi = 0; wi < ws.length; wi++) {
        if (!seen[ws[wi]]) { seen[ws[wi]] = true; cleanWs.push(ws[wi]); }
      }
      while (cleanWs.length < 3) cleanWs.push(honderdStr(a + b + (cleanWs.length + 2) * 5));
      var choices = shuffle([answer].concat(cleanWs.slice(0, 3)));
      return { question: honderdStr(a) + " + " + honderdStr(b) + " =", answer: answer, choices: choices };
    },
  },

  {
    id: "s44_dec_carry",
    label: "Decimalen met overdracht",
    group: "Decimalen",
    desc: "0,7 + 0,6 = 1,3 — door 1 heen",
    strategy: "decimalen",
    tip: "Als tienden samen 10 of meer worden, draag dan 1 over naar de eenheden.",
    uitleg: "0,7 + 0,6 = 13 tienden = 1,3. De 10 tienden worden 1 geheel, de 3 tienden blijven. Dit is de 'carry' bij decimalen, net als bij gewone getallen.",
    voorbeeld: "0,8 + 0,5 = ?\n8 + 5 = 13 tienden. 10 tienden = 1. Restant: 3 tienden = 0,3. Antwoord: 1,3.",
    minCorrect: 10,
    generate: function() {
      var a = rnd(5, 9);
      var b = rnd(10 - a + 1, 9);
      var answer = tiendStr(a + b);
      var ws = [tiendStr(a + b + 1), tiendStr(a + b - 1 > 0 ? a + b - 1 : a + b + 2), tiendStr(a + b + 2)];
      var seen = {}; seen[answer] = true;
      var cleanWs = [];
      for (var wi = 0; wi < ws.length; wi++) {
        if (!seen[ws[wi]]) { seen[ws[wi]] = true; cleanWs.push(ws[wi]); }
      }
      while (cleanWs.length < 3) cleanWs.push(tiendStr(a + b + cleanWs.length + 3));
      var choices = shuffle([answer].concat(cleanWs.slice(0, 3)));
      return { question: tiendStr(a) + " + " + tiendStr(b) + " =", answer: answer, choices: choices };
    },
  },

  {
    id: "s45_dec_whole",
    label: "Decimaal + geheel",
    group: "Decimalen",
    desc: "2,5 + 3 = 5,5",
    strategy: "decimalen",
    tip: "Een geheel getal optellen bij een decimaal: tel gewoon de gehele delen op.",
    uitleg: "2,5 + 3: het gehele deel wordt 2 + 3 = 5, de decimale rest blijft 0,5. Antwoord: 5,5. Makkelijk zodra je het ziet!",
    voorbeeld: "3,7 + 4 = ?\nGehelen: 3 + 4 = 7. Tienden: 0,7. Antwoord: 7,7.",
    minCorrect: 8,
    generate: function() {
      var dec = rnd(1, 9);
      var whole = rnd(1, 7);
      var extra = rnd(1, 5);
      var totalTienden = dec;
      var totalWhole = whole + extra;
      var answer = tiendStr(totalWhole * 10 + totalTienden);
      var ws = [tiendStr(totalWhole * 10 + totalTienden + 1), tiendStr(totalWhole * 10 + totalTienden - 1 > 0 ? totalWhole * 10 + totalTienden - 1 : totalWhole * 10 + totalTienden + 2), tiendStr((totalWhole + 1) * 10 + totalTienden)];
      var seen = {}; seen[answer] = true;
      var cleanWs = [];
      for (var wi = 0; wi < ws.length; wi++) {
        if (!seen[ws[wi]]) { seen[ws[wi]] = true; cleanWs.push(ws[wi]); }
      }
      while (cleanWs.length < 3) cleanWs.push(tiendStr(totalWhole * 10 + totalTienden + cleanWs.length * 2 + 3));
      var choices = shuffle([answer].concat(cleanWs.slice(0, 3)));
      return { question: tiendStr(whole * 10 + dec) + " + " + String(extra) + " =", answer: answer, choices: choices };
    },
  },

  {
    id: "s46_dec_three",
    label: "Drie decimalen",
    group: "Decimalen",
    desc: "0,3 + 0,4 + 0,2 = 0,9",
    strategy: "decimalen",
    tip: "Tel alle tienden bij elkaar op, zorg voor de carry naar eenheden.",
    uitleg: "Drie decimalen: tel de tienden alle drie op. 0,3 + 0,4 + 0,2 = 9 tienden = 0,9. Als het meer dan 9 tienden worden: carry. 0,5 + 0,6 + 0,3 = 14 tienden = 1,4.",
    voorbeeld: "0,4 + 0,3 + 0,5 = ?\n4+3+5 = 12 tienden = 1,2.",
    minCorrect: 10,
    generate: function() {
      var a = rnd(1, 7);
      var b = rnd(1, 7);
      var c = rnd(1, 7);
      var answer = tiendStr(a + b + c);
      var sum = a + b + c;
      var ws = [tiendStr(sum + 1), tiendStr(sum - 1 > 0 ? sum - 1 : sum + 2), tiendStr(sum + 2)];
      var seen = {}; seen[answer] = true;
      var cleanWs = [];
      for (var wi = 0; wi < ws.length; wi++) {
        if (!seen[ws[wi]]) { seen[ws[wi]] = true; cleanWs.push(ws[wi]); }
      }
      while (cleanWs.length < 3) cleanWs.push(tiendStr(sum + cleanWs.length + 3));
      var choices = shuffle([answer].concat(cleanWs.slice(0, 3)));
      return { question: tiendStr(a) + " + " + tiendStr(b) + " + " + tiendStr(c) + " =", answer: answer, choices: choices };
    },
  },

  // ── GROEP 6: GELD ─────────────────────────────────────────────────

  {
    id: "s47_money_small",
    label: "Geld: kleine bedragen",
    group: "Geld",
    desc: "€ 0,25 + € 0,50 = € 0,75",
    strategy: "geld",
    tip: "Kleine geldbedragen: tel centen op alsof het gewone getallen zijn.",
    uitleg: "€ 0,25 + € 0,50: dat zijn 25 cent + 50 cent = 75 cent = € 0,75. Werk altijd in centen, zet het euroteken er daarna voor.",
    voorbeeld: "€ 0,30 + € 0,45 = ?\n30 cent + 45 cent = 75 cent = € 0,75.",
    minCorrect: 8,
    generate: function() {
      var coins = [5, 10, 20, 25, 50];
      var a = coins[rnd(0, coins.length - 1)];
      var b = coins[rnd(0, coins.length - 1)];
      while (a + b > 100) b = coins[rnd(0, 2)];
      var answer = centStr(a + b);
      var ws = [centStr(a + b + 5), centStr(a + b - 5 > 0 ? a + b - 5 : a + b + 10), centStr(a + b + 10)];
      var seen = {}; seen[answer] = true;
      var cleanWs = [];
      for (var wi = 0; wi < ws.length; wi++) {
        if (!seen[ws[wi]]) { seen[ws[wi]] = true; cleanWs.push(ws[wi]); }
      }
      while (cleanWs.length < 3) cleanWs.push(centStr(a + b + (cleanWs.length + 2) * 5));
      var choices = shuffle([answer].concat(cleanWs.slice(0, 3)));
      return { question: centStr(a) + " + " + centStr(b) + " =", answer: answer, choices: choices };
    },
  },

  {
    id: "s48_money_medium",
    label: "Geld: euro's en centen",
    group: "Geld",
    desc: "€ 1,25 + € 2,50 = € 3,75",
    strategy: "geld",
    tip: "Tel euro's bij euro's en centen bij centen; als centen ≥ 100, draag dan 1 euro over.",
    uitleg: "€ 1,25 + € 2,50: euro's 1+2=3, centen 25+50=75. Totaal: € 3,75. Als de centen samen 100 of meer zijn, wordt dat 1 euro extra: € 1,75 + € 1,50 = € 3,25 (75+50=125 cent = 1 euro 25 cent).",
    voorbeeld: "€ 2,30 + € 1,45 = ?\nEuro's: 2+1=3. Centen: 30+45=75. Totaal: € 3,75.",
    minCorrect: 10,
    generate: function() {
      var a = rnd(1, 5) * 100 + rnd(0, 9) * 10 + rnd(0, 1) * 5;
      var b = rnd(1, 5) * 100 + rnd(0, 9) * 10 + rnd(0, 1) * 5;
      if (a + b > 999) b = rnd(10, 50) * 10;
      if (b < 10) b = 50;
      var answer = centStr(a + b);
      var ws = [centStr(a + b + 10), centStr(a + b - 10 > 0 ? a + b - 10 : a + b + 20), centStr(a + b + 25)];
      var seen = {}; seen[answer] = true;
      var cleanWs = [];
      for (var wi = 0; wi < ws.length; wi++) {
        if (!seen[ws[wi]]) { seen[ws[wi]] = true; cleanWs.push(ws[wi]); }
      }
      while (cleanWs.length < 3) cleanWs.push(centStr(a + b + (cleanWs.length + 2) * 10));
      var choices = shuffle([answer].concat(cleanWs.slice(0, 3)));
      return { question: centStr(a) + " + " + centStr(b) + " =", answer: answer, choices: choices };
    },
  },

  {
    id: "s49_money_large",
    label: "Geld: grotere bedragen",
    group: "Geld",
    desc: "€ 12,50 + € 8,75 = € 21,25",
    strategy: "geld",
    tip: "Grotere bedragen: werk in centen om fouten te voorkomen.",
    uitleg: "€ 12,50 + € 8,75: schrijf als 1250 cent + 875 cent = 2125 cent = € 21,25. Door alles in centen te rekenen vermijd je kommafouten.",
    voorbeeld: "€ 15,00 + € 7,50 = ?\n1500 + 750 = 2250 cent = € 22,50.",
    minCorrect: 10,
    generate: function() {
      var a = (rnd(5, 20)) * 100 + rnd(0, 3) * 25;
      var b = (rnd(2, 15)) * 100 + rnd(0, 3) * 25;
      if (a + b > 5000) b = rnd(1, 5) * 100;
      var answer = centStr(a + b);
      var ws = [centStr(a + b + 25), centStr(a + b - 25 > 0 ? a + b - 25 : a + b + 50), centStr(a + b + 50)];
      var seen = {}; seen[answer] = true;
      var cleanWs = [];
      for (var wi = 0; wi < ws.length; wi++) {
        if (!seen[ws[wi]]) { seen[ws[wi]] = true; cleanWs.push(ws[wi]); }
      }
      while (cleanWs.length < 3) cleanWs.push(centStr(a + b + (cleanWs.length + 2) * 25));
      var choices = shuffle([answer].concat(cleanWs.slice(0, 3)));
      return { question: centStr(a) + " + " + centStr(b) + " =", answer: answer, choices: choices };
    },
  },

  {
    id: "s50_money_three",
    label: "Drie geldbedragen",
    group: "Geld",
    desc: "€ 1,00 + € 0,50 + € 2,25 = € 3,75",
    strategy: "geld",
    tip: "Tel de centen van alle drie de bedragen bij elkaar op; draag over als ≥100.",
    uitleg: "Drie geldbedragen optellen: tel ze gewoon alle drie bij elkaar op in centen. € 1,00 + € 0,50 + € 2,25 = 100 + 50 + 225 = 375 cent = € 3,75.",
    voorbeeld: "€ 2,00 + € 1,50 + € 0,75 = ?\n200 + 150 + 75 = 425 cent = € 4,25.",
    minCorrect: 10,
    generate: function() {
      var a = rnd(1, 5) * 100 + rnd(0, 3) * 25;
      var b = rnd(0, 3) * 100 + rnd(0, 3) * 25;
      var c = rnd(0, 3) * 100 + rnd(0, 3) * 25;
      if (b < 25) b = 25;
      if (c < 25) c = 25;
      if (a + b + c > 2000) { b = 50; c = 25; }
      var answer = centStr(a + b + c);
      var sum = a + b + c;
      var ws = [centStr(sum + 25), centStr(sum - 25 > 0 ? sum - 25 : sum + 50), centStr(sum + 50)];
      var seen = {}; seen[answer] = true;
      var cleanWs = [];
      for (var wi = 0; wi < ws.length; wi++) {
        if (!seen[ws[wi]]) { seen[ws[wi]] = true; cleanWs.push(ws[wi]); }
      }
      while (cleanWs.length < 3) cleanWs.push(centStr(sum + (cleanWs.length + 2) * 25));
      var choices = shuffle([answer].concat(cleanWs.slice(0, 3)));
      return { question: centStr(a) + " + " + centStr(b) + " + " + centStr(c) + " =", answer: answer, choices: choices };
    },
  },



  // ── FASE 3: s51–s98 ───────────────────────────────────────────────

  // ── GROEP: GELD GEVORDERD ─────────────────────────────────────────

  {
    id: "s51_money_change",
    label: "Wisselgeld",
    group: "Geld gevorderd",
    desc: "€ 5,00 - € 3,25 als optelling: hoeveel bij?",
    strategy: "aanvullen",
    tip: "Denk: hoeveel moet ik bij € 3,25 optellen om € 5,00 te krijgen?",
    uitleg: "Wisselgeld bereken je door aan te vullen: € 3,25 + ? = € 5,00. Eerst aanvullen naar € 4,00 (75 cent), dan van € 4,00 naar € 5,00 (€ 1,00). Totaal: € 1,75.",
    voorbeeld: "€ 4,50 betaald, kas € 10,00.\n€ 4,50 + € 0,50 = € 5,00; + € 5,00 = € 10,00. Wisselgeld: € 5,50.",
    minCorrect: 10,
    generate: function() {
      var betaald = (rnd(1, 8) * 100 + rnd(0, 3) * 25);
      var kas = rnd(2, 4) * 500;
      if (betaald >= kas) betaald = kas - 75;
      if (betaald < 25) betaald = 25;
      var wisselgeld = kas - betaald;
      var answer = centStr(wisselgeld);
      var ws = [centStr(wisselgeld + 25), centStr(wisselgeld - 25 > 0 ? wisselgeld - 25 : wisselgeld + 50), centStr(wisselgeld + 50)];
      var seen = {}; seen[answer] = true;
      var cleanWs = [];
      for (var i = 0; i < ws.length; i++) {
        if (!seen[ws[i]]) { seen[ws[i]] = true; cleanWs.push(ws[i]); }
      }
      while (cleanWs.length < 3) cleanWs.push(centStr(wisselgeld + (cleanWs.length + 2) * 25));
      var choices = shuffle([answer].concat(cleanWs.slice(0, 3)));
      return { question: centStr(betaald) + " + ? = " + centStr(kas), answer: answer, choices: choices };
    },
  },

  {
    id: "s52_money_context",
    label: "Geld in context",
    group: "Geld gevorderd",
    desc: "Brood kost € 2,40, melk € 1,60. Samen?",
    strategy: "geld",
    tip: "Zet de bedragen eerst om naar centen, tel op, zet terug naar euro.",
    uitleg: "Bij boodschappen tel je bedragen bij elkaar op. Werk in centen: € 2,40 = 240 cent, € 1,60 = 160 cent. 240 + 160 = 400 cent = € 4,00.",
    voorbeeld: "Appel € 0,75, banaan € 0,50, koek € 1,25.\n75 + 50 + 125 = 250 cent = € 2,50.",
    minCorrect: 10,
    generate: function() {
      var items = [
        [rnd(1, 4) * 100 + rnd(0, 3) * 25, rnd(0, 3) * 100 + rnd(1, 3) * 25],
        [rnd(0, 2) * 100 + rnd(1, 3) * 25, rnd(1, 3) * 100 + rnd(0, 3) * 25],
      ];
      var a = items[0][0]; var b = items[0][1];
      if (a + b > 1000) b = rnd(1, 3) * 25;
      var sum = a + b;
      var answer = centStr(sum);
      var seen = {}; seen[answer] = true;
      var offsets = [25, -25, 50, -50, 75];
      var ws = [];
      for (var oi = 0; oi < offsets.length && ws.length < 3; oi++) {
        var c = centStr(sum + offsets[oi]);
        if (!seen[c] && sum + offsets[oi] > 0) { seen[c] = true; ws.push(c); }
      }
      while (ws.length < 3) { ws.push(centStr(sum + (ws.length + 2) * 25)); }
      var choices = shuffle([answer].concat(ws.slice(0, 3)));
      return { question: centStr(a) + " + " + centStr(b) + " =", answer: answer, choices: choices };
    },
  },

  {
    id: "s53_money_four",
    label: "Vier geldbedragen",
    group: "Geld gevorderd",
    desc: "Vier bedragen bij elkaar optellen",
    strategy: "geld",
    tip: "Groepeer handige combinaties: bedragen die samen een rond getal maken.",
    uitleg: "Vier bedragen optellen: zoek eerst paren die samen een mooi rond getal geven. € 0,75 + € 0,25 = € 1,00. Dat maakt het makkelijker.",
    voorbeeld: "€ 1,25 + € 0,75 + € 2,00 + € 0,50 = ?\n€ 1,25 + € 0,75 = € 2,00; € 2,00 + € 2,00 = € 4,00; + € 0,50 = € 4,50.",
    minCorrect: 10,
    generate: function() {
      var a = rnd(0, 3) * 100 + rnd(1, 3) * 25;
      var b = rnd(0, 3) * 100 + rnd(1, 3) * 25;
      var c = rnd(0, 2) * 100 + rnd(1, 3) * 25;
      var d = rnd(0, 2) * 100 + rnd(1, 3) * 25;
      if (a < 25) a = 25; if (b < 25) b = 25; if (c < 25) c = 25; if (d < 25) d = 25;
      if (a + b + c + d > 1500) { c = 25; d = 25; }
      var sum = a + b + c + d;
      var answer = centStr(sum);
      var seen = {}; seen[answer] = true;
      var offsets = [25, -25, 50, -50, 75];
      var ws = [];
      for (var oi = 0; oi < offsets.length && ws.length < 3; oi++) {
        var cv = centStr(sum + offsets[oi]);
        if (!seen[cv] && sum + offsets[oi] > 0) { seen[cv] = true; ws.push(cv); }
      }
      while (ws.length < 3) ws.push(centStr(sum + (ws.length + 2) * 25));
      var choices = shuffle([answer].concat(ws.slice(0, 3)));
      return { question: centStr(a) + " + " + centStr(b) + " + " + centStr(c) + " + " + centStr(d) + " =", answer: answer, choices: choices };
    },
  },

  // ── GROEP: TIJD ───────────────────────────────────────────────────

  {
    id: "s54_time_minutes",
    label: "Minuten optellen",
    group: "Tijd",
    desc: "20 min + 35 min = ?",
    strategy: "tijd",
    tip: "Tel de minuten op; draag over naar uren als de som >= 60 minuten.",
    uitleg: "Minuten optellen: tel gewoon bij elkaar op. Als je >= 60 minuten krijgt, draag dan 60 min = 1 uur over. 40 + 35 = 75 min = 1 uur 15 min.",
    voorbeeld: "25 min + 40 min = 65 min = 1u05.",
    minCorrect: 10,
    generate: function() {
      var a = rnd(5, 55);
      var b = rnd(5, 55);
      var sum = a + b;
      var answer = timeStr(sum);
      var offsets = [5, -5, 10, -10, 15];
      var seen = {}; seen[answer] = true;
      var ws = [];
      for (var oi = 0; oi < offsets.length && ws.length < 3; oi++) {
        var t = timeStr(sum + offsets[oi]);
        if (!seen[t] && sum + offsets[oi] > 0) { seen[t] = true; ws.push(t); }
      }
      while (ws.length < 3) ws.push(timeStr(sum + (ws.length + 2) * 5));
      var choices = shuffle([answer].concat(ws.slice(0, 3)));
      return { question: a + " min + " + b + " min =", answer: answer, choices: choices };
    },
  },

  {
    id: "s55_time_hours_min",
    label: "Uren en minuten",
    group: "Tijd",
    desc: "1u30 + 0u45 = 2u15",
    strategy: "tijd",
    tip: "Tel uren en minuten apart op; draag 60 min over naar het uur.",
    uitleg: "Uren en minuten apart optellen: tel uren bij uren en minuten bij minuten. Als de minuten >= 60 zijn, draag dan 1 uur over en houd de rest.",
    voorbeeld: "2u15 + 1u50 = ?\nUren: 2 + 1 = 3. Min: 15 + 50 = 65 = 1u05 over. Totaal: 4u05.",
    minCorrect: 10,
    generate: function() {
      var h1 = rnd(0, 3); var m1 = rnd(0, 11) * 5;
      var h2 = rnd(0, 3); var m2 = rnd(0, 11) * 5;
      if (h1 === 0 && m1 === 0) m1 = 15;
      if (h2 === 0 && m2 === 0) m2 = 15;
      var totalMin = h1 * 60 + m1 + h2 * 60 + m2;
      if (totalMin > 720) { h2 = 0; m2 = 30; totalMin = h1 * 60 + m1 + 30; }
      var answer = timeStr(totalMin);
      var offsets = [5, -5, 10, -10, 15];
      var seen = {}; seen[answer] = true;
      var ws = [];
      for (var oi = 0; oi < offsets.length && ws.length < 3; oi++) {
        var t = timeStr(totalMin + offsets[oi]);
        if (!seen[t] && totalMin + offsets[oi] > 0) { seen[t] = true; ws.push(t); }
      }
      while (ws.length < 3) ws.push(timeStr(totalMin + (ws.length + 2) * 5));
      var choices = shuffle([answer].concat(ws.slice(0, 3)));
      return { question: timeStr(h1 * 60 + m1) + " + " + timeStr(h2 * 60 + m2) + " =", answer: answer, choices: choices };
    },
  },

  {
    id: "s56_time_carry",
    label: "Tijd met overgang",
    group: "Tijd",
    desc: "1u50 + 0u25 = 2u15 (overgang naar volgend uur)",
    strategy: "tijd",
    tip: "Vul eerst aan naar het volle uur, tel dan de rest erbij op.",
    uitleg: "Bij tijdoptelling met overgang: vul aan tot het volgende uur, tel dan de resterende minuten erbij. 1u50 + 0u25: tot 2u00 is 10 min, dan nog 15 min = 2u15.",
    voorbeeld: "3u45 + 0u35 = ?\n3u45 + 0u15 = 4u00; + 0u20 = 4u20.",
    minCorrect: 10,
    generate: function() {
      var h1 = rnd(1, 5); var m1 = rnd(7, 11) * 5;
      var addMin = rnd(2, 10) * 5 + rnd(1, 4) * 5;
      if (m1 + addMin < 60) addMin = 60 - m1 + rnd(1, 3) * 5;
      var totalMin = h1 * 60 + m1 + addMin;
      if (totalMin > 720) { m1 = 50; addMin = 25; totalMin = h1 * 60 + 75; }
      var answer = timeStr(totalMin);
      var offsets = [5, -5, 10, -10, 15];
      var seen = {}; seen[answer] = true;
      var ws = [];
      for (var oi = 0; oi < offsets.length && ws.length < 3; oi++) {
        var t = timeStr(totalMin + offsets[oi]);
        if (!seen[t] && totalMin + offsets[oi] > 0) { seen[t] = true; ws.push(t); }
      }
      while (ws.length < 3) ws.push(timeStr(totalMin + (ws.length + 2) * 5));
      var choices = shuffle([answer].concat(ws.slice(0, 3)));
      return { question: timeStr(h1 * 60 + m1) + " + " + timeStr(addMin) + " =", answer: answer, choices: choices };
    },
  },

  {
    id: "s57_time_context",
    label: "Tijd in context",
    group: "Tijd",
    desc: "Film begint om 14:30 en duurt 1u45. Hoe laat eindigt hij?",
    strategy: "tijd",
    tip: "Tel de duur bij de begintijd op, let op de overgang naar het volgende uur.",
    uitleg: "Eindtijd berekenen: begintijd (in minuten) + duur. 14:30 = 870 min, + 105 min = 975 min = 16u15.",
    voorbeeld: "Start 9:45, duur 1u30.\n9u45 + 1u30 = 11u15.",
    minCorrect: 10,
    generate: function() {
      var startH = rnd(8, 17); var startM = rnd(0, 3) * 15;
      var durH = rnd(0, 2); var durM = rnd(1, 3) * 15;
      if (durH === 0 && durM === 0) durM = 15;
      var startMin = startH * 60 + startM;
      var durMin = durH * 60 + durM;
      var endMin = startMin + durMin;
      if (endMin > 1440) { durH = 0; durM = 30; endMin = startMin + 30; }
      var answer = timeStr(endMin);
      var offsets = [15, -15, 30, -30];
      var seen = {}; seen[answer] = true;
      var ws = [];
      for (var oi = 0; oi < offsets.length && ws.length < 3; oi++) {
        var t = timeStr(endMin + offsets[oi]);
        if (!seen[t] && endMin + offsets[oi] > 0) { seen[t] = true; ws.push(t); }
      }
      while (ws.length < 3) ws.push(timeStr(endMin + (ws.length + 2) * 15));
      var choices = shuffle([answer].concat(ws.slice(0, 3)));
      return { question: timeStr(startMin) + " + " + timeStr(durMin) + " =", answer: answer, choices: choices };
    },
  },

  // ── GROEP: MATEN ──────────────────────────────────────────────────

  {
    id: "s58_measure_cm",
    label: "Centimeters",
    group: "Maten",
    desc: "35 cm + 48 cm = 83 cm",
    strategy: "meten",
    tip: "Tel gewoon op — centimeters zijn gewone getallen met een eenheid.",
    uitleg: "Lengtes in centimeters optellen werkt net als gewone sommen. 35 cm + 48 cm = 83 cm. Let op de eenheid in je antwoord.",
    voorbeeld: "120 cm + 85 cm = 205 cm.",
    minCorrect: 10,
    generate: function() {
      var a = rnd(10, 150);
      var b = rnd(10, 150);
      if (a + b > 300) b = rnd(10, 300 - a);
      var sum = a + b;
      var answer = sum + " cm";
      var ws = [(sum + 5) + " cm", (sum - 5 > 0 ? sum - 5 : sum + 10) + " cm", (sum + 10) + " cm"];
      var seen = {}; seen[answer] = true;
      var cleanWs = [];
      for (var wi = 0; wi < ws.length; wi++) {
        if (!seen[ws[wi]]) { seen[ws[wi]] = true; cleanWs.push(ws[wi]); }
      }
      while (cleanWs.length < 3) cleanWs.push((sum + (cleanWs.length + 2) * 5) + " cm");
      var choices = shuffle([answer].concat(cleanWs.slice(0, 3)));
      return { question: a + " cm + " + b + " cm =", answer: answer, choices: choices };
    },
  },

  {
    id: "s59_measure_m",
    label: "Meters en centimeters",
    group: "Maten",
    desc: "1 m 45 cm + 2 m 30 cm = 3 m 75 cm",
    strategy: "meten",
    tip: "Tel meters bij meters, cm bij cm. Draag over als cm >= 100.",
    uitleg: "Meters en centimeters apart optellen: meters bij meters, centimeters bij centimeters. Draag 100 cm = 1 m over als nodig.",
    voorbeeld: "2 m 70 cm + 1 m 50 cm = ?\n70 + 50 = 120 cm = 1 m 20 cm over. Totaal: 4 m 20 cm.",
    minCorrect: 10,
    generate: function() {
      var m1 = rnd(0, 5); var c1 = rnd(0, 9) * 10;
      var m2 = rnd(0, 5); var c2 = rnd(0, 9) * 10;
      if (m1 === 0 && c1 === 0) c1 = 30;
      if (m2 === 0 && c2 === 0) c2 = 30;
      var totalCm = (m1 * 100 + c1) + (m2 * 100 + c2);
      if (totalCm > 1000) { m2 = 0; c2 = 50; totalCm = m1 * 100 + c1 + 50; }
      var totalM = Math.floor(totalCm / 100);
      var restCm = totalCm % 100;
      var answer = totalM + " m " + (restCm < 10 ? "0" : "") + restCm + " cm";
      var alt1Cm = totalCm + 10; var alt2Cm = totalCm - 10 > 0 ? totalCm - 10 : totalCm + 20; var alt3Cm = totalCm + 20;
      function fmtMCm(tc) {
        var tm = Math.floor(tc / 100); var rc = tc % 100;
        return tm + " m " + (rc < 10 ? "0" : "") + rc + " cm";
      }
      var seen = {}; seen[answer] = true;
      var ws = [];
      var alts = [alt1Cm, alt2Cm, alt3Cm, totalCm + 30];
      for (var ai = 0; ai < alts.length && ws.length < 3; ai++) {
        var s = fmtMCm(alts[ai]);
        if (!seen[s]) { seen[s] = true; ws.push(s); }
      }
      while (ws.length < 3) ws.push(fmtMCm(totalCm + (ws.length + 2) * 10));
      var q1 = m1 + " m " + (c1 < 10 ? "0" : "") + c1 + " cm";
      var q2 = m2 + " m " + (c2 < 10 ? "0" : "") + c2 + " cm";
      var choices = shuffle([answer].concat(ws.slice(0, 3)));
      return { question: q1 + " + " + q2 + " =", answer: answer, choices: choices };
    },
  },

  {
    id: "s60_measure_kg",
    label: "Kilogram en gram",
    group: "Maten",
    desc: "1 kg 400 g + 0 kg 750 g = 2 kg 150 g",
    strategy: "meten",
    tip: "Tel alles om naar gram, tel op, zet terug naar kg en g.",
    uitleg: "Kilogram en gram optellen: alles naar gram omzetten, optellen, terugzetten. 1 kg 400 g = 1400 g; + 750 g = 2150 g = 2 kg 150 g.",
    voorbeeld: "2 kg 300 g + 1 kg 800 g = ?\n2300 + 1800 = 4100 g = 4 kg 100 g.",
    minCorrect: 10,
    generate: function() {
      var kg1 = rnd(0, 4); var g1 = rnd(0, 9) * 100;
      var kg2 = rnd(0, 4); var g2 = rnd(0, 9) * 100;
      if (kg1 === 0 && g1 === 0) g1 = 500;
      if (kg2 === 0 && g2 === 0) g2 = 500;
      var totalG = (kg1 * 1000 + g1) + (kg2 * 1000 + g2);
      if (totalG > 9000) { kg2 = 0; g2 = 500; totalG = kg1 * 1000 + g1 + 500; }
      var tKg = Math.floor(totalG / 1000); var rG = totalG % 1000;
      var answer = tKg + " kg " + rG + " g";
      function fmtKgG(tg) {
        var tk = Math.floor(tg / 1000); var rg = tg % 1000;
        return tk + " kg " + rg + " g";
      }
      var seen = {}; seen[answer] = true;
      var ws = [];
      var offsets = [100, -100, 200, -200, 300];
      for (var oi = 0; oi < offsets.length && ws.length < 3; oi++) {
        var s = fmtKgG(totalG + offsets[oi]);
        if (!seen[s] && totalG + offsets[oi] > 0) { seen[s] = true; ws.push(s); }
      }
      while (ws.length < 3) ws.push(fmtKgG(totalG + (ws.length + 2) * 100));
      var q1 = kg1 + " kg " + g1 + " g"; var q2 = kg2 + " kg " + g2 + " g";
      var choices = shuffle([answer].concat(ws.slice(0, 3)));
      return { question: q1 + " + " + q2 + " =", answer: answer, choices: choices };
    },
  },

  // ── GROEP: GETALLENLIJN / SCHATTEN / AFRONDEN ─────────────────────

  {
    id: "s61_number_line",
    label: "Getallenlijn groot",
    group: "Schatten en afronden",
    desc: "Welk getal staat op de stip? (getallenlijn 0–1000)",
    strategy: "schatten",
    tip: "Kijk hoeveel vakjes er zijn en bereken de stapgrootte.",
    uitleg: "Op een getallenlijn van 0 tot 1000 met 10 vakjes is elk vakje 100. Halverwege de getallenlijn staat 500.",
    voorbeeld: "Getallenlijn 0–200, 4 vakjes. Elke stap = 50. Stip op 3e streepje = 150.",
    minCorrect: 8,
    generate: function() {
      var step = rnd(1, 4) * 25;
      var steps = rnd(4, 8);
      var total = step * steps;
      var pos = rnd(1, steps - 1);
      var answer = pos * step;
      var ws = wrongChoices(answer, 3, 0);
      var choices = shuffle([answer].concat(ws));
      return { question: "Getallenlijn 0-" + total + " (" + steps + " vakjes). Stip op positie " + pos + " =", answer: answer, choices: choices };
    },
  },

  {
    id: "s62_estimate",
    label: "Schatten",
    group: "Schatten en afronden",
    desc: "Schat: 48 + 63 ≈ ?",
    strategy: "schatten",
    tip: "Rond beide getallen af naar tientallen en tel op.",
    uitleg: "Schatten: rond elk getal af naar het dichtstbijzijnde tiental en tel op. 48 ≈ 50, 63 ≈ 60. Schatting: 50 + 60 = 110.",
    voorbeeld: "193 + 308 ≈ ?\n200 + 300 = 500. Schatting: 500.",
    minCorrect: 8,
    generate: function() {
      var a = rnd(10, 190);
      var b = rnd(10, 190);
      var exact = a + b;
      var aR = Math.round(a / 10) * 10;
      var bR = Math.round(b / 10) * 10;
      var answer = aR + bR;
      var ws = wrongChoices(answer, 3, 10);
      var choices = shuffle([answer].concat(ws));
      return { question: a + " + " + b + " ≈", answer: answer, choices: choices };
    },
  },

  {
    id: "s63_round_10",
    label: "Afronden op tientallen",
    group: "Schatten en afronden",
    desc: "Rond 347 af op tientallen: 350",
    strategy: "afronden",
    tip: "Kijk naar het getal op de eenhedenpositie: < 5 → naar beneden, >= 5 → naar boven.",
    uitleg: "Kijk naar het eenheden-cijfer: 5 of meer betekent omhoog, 4 of minder omlaag. De honderden blijven gewoon staan. 347 wordt 350. Let op bij 96: omhoog wordt dat 100.",
    voorbeeld: "263 ≈ ?\nEenheden-cijfer: 3, dat is minder dan 5\nOmlaag: 260",
    minCorrect: 8,
    generate: function() {
      var a = rnd(11, 899);
      var afgerond = Math.round(a / 10) * 10;
      var ws = wrongChoices(afgerond, 3, 0);
      var choices = shuffle([afgerond].concat(ws));
      return { question: "Rond af op tientallen: " + a + " ≈", answer: afgerond, choices: choices };
    },
  },

  {
    id: "s64_round_100",
    label: "Afronden op honderdtallen",
    group: "Schatten en afronden",
    desc: "Rond 347 af op honderdtallen: 300",
    strategy: "afronden",
    tip: "Kijk naar het tientalcijfer: < 5 → naar beneden, >= 5 → naar boven.",
    uitleg: "Kijk naar het tientallen-cijfer: 5 of meer betekent omhoog, 4 of minder omlaag. Alles rechts ervan wordt 0. 347 wordt 300. Let op bij 1196: omhoog wordt dat 1200.",
    voorbeeld: "650 ≈ ?\nTientallen-cijfer: 5, dat is 5 of meer\nOmhoog: 700",
    minCorrect: 8,
    generate: function() {
      var a = rnd(101, 1899);
      var afgerond = Math.round(a / 100) * 100;
      var ws = wrongChoices(afgerond, 3, 0);
      var choices = shuffle([afgerond].concat(ws));
      return { question: "Rond af op honderdtallen: " + a + " ≈", answer: afgerond, choices: choices };
    },
  },

  {
    id: "s65_mental_split",
    label: "Splitsen gevorderd",
    group: "Schatten en afronden",
    desc: "237 + 456 door splitsen: 200+400, 30+50, 7+6",
    strategy: "splitsen",
    tip: "Splits elk getal in honderden, tientallen en eenheden. Tel elk deel apart op.",
    uitleg: "Splits allebei de getallen in honderden, tientallen en eenheden. Tel elk deel apart op en zet de stukken daarna samen. Begin bij de honderden, dan weet je meteen ongeveer hoe groot het antwoord wordt.",
    voorbeeld: "345 + 278 = ?\n300 + 200 = 500\n40 + 70 = 110\n5 + 8 = 13\n500 + 110 + 13 = 623",
    minCorrect: 10,
    generate: function() {
      var a = rnd(100, 600);
      var b = rnd(100, 600);
      if (a + b > 999) b = rnd(10, 999 - a);
      return makeQ([a, b], a + b);
    },
  },



  // ── GROEP: CONTEXT-SOMMEN ─────────────────────────────────────────

  {
    id: "s66_context_money",
    label: "Geld verhaal",
    group: "Context",
    desc: "Jasper heeft € 3,50. Hij krijgt € 2,25. Hoeveel heeft hij nu?",
    strategy: "geld",
    tip: "Zet de informatie uit de tekst om in een som en reken dan uit.",
    uitleg: "Verhaalsommen met geld: haal de bedragen uit de tekst, schrijf de som op en reken uit. Let op: vraag altijd of je moet optellen of aftrekken!",
    voorbeeld: "Lisa spaart € 4,00. Ze krijgt € 1,75 zakgeld. Totaal: € 4,00 + € 1,75 = € 5,75.",
    minCorrect: 10,
    generate: function() {
      var a = rnd(1, 8) * 100 + rnd(0, 3) * 25;
      var b = rnd(0, 4) * 100 + rnd(1, 3) * 25;
      if (a + b > 1500) b = rnd(1, 3) * 25;
      var sum = a + b;
      var answer = centStr(sum);
      var seen = {}; seen[answer] = true;
      var offsets = [25, -25, 50, -50];
      var ws = [];
      for (var oi = 0; oi < offsets.length && ws.length < 3; oi++) {
        var c = centStr(sum + offsets[oi]);
        if (!seen[c] && sum + offsets[oi] > 0) { seen[c] = true; ws.push(c); }
      }
      while (ws.length < 3) ws.push(centStr(sum + (ws.length + 2) * 25));
      var choices = shuffle([answer].concat(ws.slice(0, 3)));
      return { question: centStr(a) + " + " + centStr(b) + " =", answer: answer, choices: choices };
    },
  },

  {
    id: "s67_context_time",
    label: "Tijd verhaal",
    group: "Context",
    desc: "De trein rijdt 1u30. Dan nog 45 min. Hoe lang totaal?",
    strategy: "tijd",
    tip: "Tel de tijdsduren op in minuten, zet het antwoord dan om naar uren en minuten.",
    uitleg: "Tijdsduren optellen: zet alles om naar minuten, tel op, zet terug. 1u30 = 90 min, + 45 min = 135 min = 2u15.",
    voorbeeld: "Fietsen: 0u45 + 1u20 = 45 + 80 = 125 min = 2u05.",
    minCorrect: 10,
    generate: function() {
      var h1 = rnd(0, 3); var m1 = rnd(1, 11) * 5;
      var h2 = rnd(0, 2); var m2 = rnd(1, 11) * 5;
      var totalMin = h1 * 60 + m1 + h2 * 60 + m2;
      if (totalMin > 480) { h2 = 0; m2 = 30; totalMin = h1 * 60 + m1 + 30; }
      var answer = timeStr(totalMin);
      var seen = {}; seen[answer] = true;
      var offsets = [5, -5, 10, -10, 15];
      var ws = [];
      for (var oi = 0; oi < offsets.length && ws.length < 3; oi++) {
        var t = timeStr(totalMin + offsets[oi]);
        if (!seen[t] && totalMin + offsets[oi] > 0) { seen[t] = true; ws.push(t); }
      }
      while (ws.length < 3) ws.push(timeStr(totalMin + (ws.length + 2) * 5));
      var choices = shuffle([answer].concat(ws.slice(0, 3)));
      return { question: timeStr(h1 * 60 + m1) + " + " + timeStr(h2 * 60 + m2) + " =", answer: answer, choices: choices };
    },
  },

  {
    id: "s68_context_measure",
    label: "Maten verhaal",
    group: "Context",
    desc: "Twee planken: 125 cm en 80 cm. Samen hoe lang?",
    strategy: "meten",
    tip: "Zet de maten uit de tekst in een som en reken uit.",
    uitleg: "Verhaalsommen met maten: haal de lengtes/gewichten uit de tekst en tel op. Let op de eenheden!",
    voorbeeld: "Touw A = 3 m 40 cm, Touw B = 1 m 90 cm. Samen: 3m40 + 1m90 = 5m30.",
    minCorrect: 10,
    generate: function() {
      var a = rnd(10, 200);
      var b = rnd(10, 200);
      if (a + b > 400) b = rnd(10, 400 - a);
      var sum = a + b;
      var answer = sum + " cm";
      var seen = {}; seen[answer] = true;
      var offsets = [5, -5, 10, -10, 15];
      var ws = [];
      for (var oi = 0; oi < offsets.length && ws.length < 3; oi++) {
        var s = (sum + offsets[oi]) + " cm";
        if (!seen[s] && sum + offsets[oi] > 0) { seen[s] = true; ws.push(s); }
      }
      while (ws.length < 3) ws.push((sum + (ws.length + 2) * 5) + " cm");
      var choices = shuffle([answer].concat(ws.slice(0, 3)));
      return { question: a + " cm + " + b + " cm =", answer: answer, choices: choices };
    },
  },

  // ── GROEP: FOUT-SPOTTER GEVORDERD ────────────────────────────────

  {
    id: "s69_error_int",
    label: "Fout-spotter gehele getallen",
    group: "Fout-spotter",
    desc: "Welk antwoord klopt niet? (grotere getallen)",
    strategy: "controleren",
    tip: "Reken elke som snel na; je zoekt de som die fout is.",
    uitleg: "Controleer eerst de eenheden. Het laatste cijfer van hun som moet overeenkomen met het laatste cijfer van het antwoord. Houd bij een som van 10 of meer ook rekening met de overdracht naar de tientallen. Controleer daarna de tientallen. Tel bij de tientallen ook de overdracht van de eenheden op.",
    voorbeeld: "Welke som is FOUT?\n25 + 40 = 65: 5 + 0 = 5, en 65 eindigt op 5. Klopt.\n45 + 40 = 84: 5 + 0 = 5, maar 84 eindigt op 4. Klopt niet!\nDus 45 + 40 = 84 is fout. Goed is 85.",
    minCorrect: 10,
    generate: function() {
      var allPairs = [];
      for (var a = 10; a <= 50; a += 5) {
        for (var b = 10; b <= 50; b += 5) {
          allPairs.push([a, b]);
        }
      }
      allPairs = shuffle(allPairs);
      var p0 = allPairs[0]; var p1 = allPairs[1]; var p2 = allPairs[2]; var p3 = allPairs[3];
      var correctC0 = p0[0] + p0[1];
      var offsets = [-3, -2, -1, 1, 2, 3].filter(function(o) { return correctC0 + o > 0; });
      var wrongC = correctC0 + offsets[rnd(0, offsets.length - 1)];
      var wrongStr = p0[0] + " + " + p0[1] + " = " + wrongC;
      var c1 = p1[0] + " + " + p1[1] + " = " + (p1[0] + p1[1]);
      var c2 = p2[0] + " + " + p2[1] + " = " + (p2[0] + p2[1]);
      var c3 = p3[0] + " + " + p3[1] + " = " + (p3[0] + p3[1]);
      return { question: "Welk antwoord is FOUT?", answer: wrongStr, choices: shuffle([wrongStr, c1, c2, c3]), isErrorSpotter: true };
    },
  },

  {
    id: "s70_error_frac",
    label: "Fout-spotter breuken",
    group: "Fout-spotter",
    desc: "Welke breuksom klopt niet?",
    strategy: "controleren",
    tip: "Reken elke breuksom na; let op gelijke noemers.",
    uitleg: "Bij breuken met gelijke noemer: tel alleen de tellers op, de noemer blijft hetzelfde. Zoek de som die hier niet aan voldoet.",
    voorbeeld: "1/4 + 2/4 = 3/4 ✓, 1/3 + 1/3 = 3/3 FOUT (= 2/3).",
    minCorrect: 10,
    generate: function() {
      var d = rnd(3, 8);
      var pairs = [];
      for (var n1 = 1; n1 < d; n1++) {
        for (var n2 = 1; n2 < d; n2++) {
          if (n1 + n2 < 2 * d) pairs.push([n1, n2]);
        }
      }
      pairs = shuffle(pairs);
      var p0 = pairs[0]; var p1 = pairs[1]; var p2 = pairs[2]; var p3 = pairs[3] || [1, 1];
      var correctAns0 = fracStr(p0[0] + p0[1], d);
      var wrongAns = fracStr(p0[0] + p0[1] + (Math.random() > 0.5 ? 1 : -1), d);
      if (wrongAns === correctAns0) wrongAns = fracStr(p0[0] + p0[1] + 2, d);
      var wrongStr = fracStr(p0[0], d) + " + " + fracStr(p0[1], d) + " = " + wrongAns;
      var c1 = fracStr(p1[0], d) + " + " + fracStr(p1[1], d) + " = " + fracStr(p1[0] + p1[1], d);
      var c2 = fracStr(p2[0], d) + " + " + fracStr(p2[1], d) + " = " + fracStr(p2[0] + p2[1], d);
      var c3 = fracStr(p3[0], d) + " + " + fracStr(p3[1], d) + " = " + fracStr(p3[0] + p3[1], d);
      return { question: "Welk antwoord is FOUT?", answer: wrongStr, choices: shuffle([wrongStr, c1, c2, c3]), isErrorSpotter: true };
    },
  },

  {
    id: "s71_error_dec",
    label: "Fout-spotter decimalen",
    group: "Fout-spotter",
    desc: "Welke decimaalsom klopt niet?",
    strategy: "controleren",
    tip: "Let op de komma: tienden bij tienden optellen.",
    uitleg: "Decimalen optellen: de komma moet op dezelfde positie staan. Zoek de som die niet klopt.",
    voorbeeld: "0,3 + 0,4 = 0,7 ✓, 0,5 + 0,6 = 1,0 FOUT (= 1,1).",
    minCorrect: 10,
    generate: function() {
      var pairs = [];
      for (var a = 1; a <= 9; a++) {
        for (var b = 1; b <= 9; b++) {
          pairs.push([a, b]);
        }
      }
      pairs = shuffle(pairs);
      var p0 = pairs[0]; var p1 = pairs[1]; var p2 = pairs[2]; var p3 = pairs[3];
      var sum0 = p0[0] + p0[1];
      var wrongSum = sum0 + (Math.random() > 0.5 ? 1 : -1);
      if (wrongSum === sum0) wrongSum = sum0 + 2;
      var wrongStr = tiendStr(p0[0] * 10) + " + " + tiendStr(p0[1] * 10) + " = " + tiendStr(wrongSum * 10);
      var c1 = tiendStr(p1[0] * 10) + " + " + tiendStr(p1[1] * 10) + " = " + tiendStr((p1[0] + p1[1]) * 10);
      var c2 = tiendStr(p2[0] * 10) + " + " + tiendStr(p2[1] * 10) + " = " + tiendStr((p2[0] + p2[1]) * 10);
      var c3 = tiendStr(p3[0] * 10) + " + " + tiendStr(p3[1] * 10) + " = " + tiendStr((p3[0] + p3[1]) * 10);
      return { question: "Welk antwoord is FOUT?", answer: wrongStr, choices: shuffle([wrongStr, c1, c2, c3]), isErrorSpotter: true };
    },
  },

  {
    id: "s72_error_money",
    label: "Fout-spotter geld",
    group: "Fout-spotter",
    desc: "Welke geldbedragensom klopt niet?",
    strategy: "controleren",
    tip: "Reken elke geldsom na in centen.",
    uitleg: "Geld optellen: zet om naar centen, tel op, zet terug naar euro. Zoek de som die niet klopt.",
    voorbeeld: "€ 1,50 + € 0,75 = € 2,25 ✓, € 2,00 + € 1,50 = € 3,75 FOUT (= € 3,50).",
    minCorrect: 10,
    generate: function() {
      var pairs = [];
      for (var a = 1; a <= 8; a++) {
        for (var b = 1; b <= 8; b++) {
          pairs.push([a * 50, b * 50]);
        }
      }
      pairs = shuffle(pairs);
      var p0 = pairs[0]; var p1 = pairs[1]; var p2 = pairs[2]; var p3 = pairs[3];
      var sum0 = p0[0] + p0[1];
      var wrongSum = sum0 + (Math.random() > 0.5 ? 25 : -25);
      if (wrongSum === sum0 || wrongSum <= 0) wrongSum = sum0 + 50;
      var wrongStr = centStr(p0[0]) + " + " + centStr(p0[1]) + " = " + centStr(wrongSum);
      var c1 = centStr(p1[0]) + " + " + centStr(p1[1]) + " = " + centStr(p1[0] + p1[1]);
      var c2 = centStr(p2[0]) + " + " + centStr(p2[1]) + " = " + centStr(p2[0] + p2[1]);
      var c3 = centStr(p3[0]) + " + " + centStr(p3[1]) + " = " + centStr(p3[0] + p3[1]);
      return { question: "Welk antwoord is FOUT?", answer: wrongStr, choices: shuffle([wrongStr, c1, c2, c3]), isErrorSpotter: true };
    },
  },

  {
    id: "s73_error_time",
    label: "Fout-spotter tijd",
    group: "Fout-spotter",
    desc: "Welke tijdsom klopt niet?",
    strategy: "controleren",
    tip: "Reken elke tijdsom na in minuten.",
    uitleg: "Tijdoptelling controleren: zet om naar minuten, tel op, zet terug. Zoek de fout.",
    voorbeeld: "0u30 + 0u45 = 1u15 ✓, 1u20 + 0u50 = 2u20 FOUT (= 2u10).",
    minCorrect: 10,
    generate: function() {
      var pairs = [];
      for (var a = 1; a <= 6; a++) {
        for (var b = 1; b <= 6; b++) {
          pairs.push([a * 15, b * 15]);
        }
      }
      pairs = shuffle(pairs);
      var p0 = pairs[0]; var p1 = pairs[1]; var p2 = pairs[2]; var p3 = pairs[3];
      var sum0 = p0[0] + p0[1];
      var wrongSum = sum0 + (Math.random() > 0.5 ? 15 : -15);
      if (wrongSum === sum0 || wrongSum <= 0) wrongSum = sum0 + 30;
      var wrongStr = timeStr(p0[0]) + " + " + timeStr(p0[1]) + " = " + timeStr(wrongSum);
      var c1 = timeStr(p1[0]) + " + " + timeStr(p1[1]) + " = " + timeStr(p1[0] + p1[1]);
      var c2 = timeStr(p2[0]) + " + " + timeStr(p2[1]) + " = " + timeStr(p2[0] + p2[1]);
      var c3 = timeStr(p3[0]) + " + " + timeStr(p3[1]) + " = " + timeStr(p3[0] + p3[1]);
      return { question: "Welk antwoord is FOUT?", answer: wrongStr, choices: shuffle([wrongStr, c1, c2, c3]), isErrorSpotter: true };
    },
  },

  // ── GROEP: MISSENDE TERM GEVORDERD ───────────────────────────────

  {
    id: "s74_missing_int",
    label: "Missende term (honderden)",
    group: "Missende term",
    desc: "245 + ? = 600",
    strategy: "aanvullen",
    tip: "Trek het bekende getal af van de uitkomst om de missende term te vinden.",
    uitleg: "Reken niet terug, maar spring vooruit vanaf het bekende getal: eerst naar het volgende tiental, dan naar het volgende honderdtal, dan naar de uitkomst. Tel de sprongen daarna bij elkaar op.",
    voorbeeld: "245 + ? = 600\n245 → 250 is 5\n250 → 300 is 50\n300 → 600 is 300\nSamen: 5 + 50 + 300 = 355",
    minCorrect: 10,
    generate: function() {
      var total = rnd(3, 9) * 100;
      var a = rnd(50, total - 50);
      var missing = total - a;
      var answer = missing;
      var ws = wrongChoices(answer, 3, 1);
      var choices = shuffle([answer].concat(ws));
      return { question: a + " + ? = " + total, answer: answer, choices: choices };
    },
  },

  {
    id: "s75_missing_frac",
    label: "Missende breuk",
    group: "Missende term",
    desc: "1/4 + ? = 3/4",
    strategy: "aanvullen",
    tip: "Trek de bekende breuk af van de totale breuk.",
    uitleg: "Missende breuk: ? = totaal - bekende breuk. 1/4 + ? = 3/4 → ? = 3/4 - 1/4 = 2/4 = 1/2.",
    voorbeeld: "2/6 + ? = 5/6 → ? = 3/6 = 1/2.",
    minCorrect: 10,
    generate: function() {
      var d = rnd(3, 8);
      var n1 = rnd(1, d - 2);
      var nTotal = rnd(n1 + 1, d + d - 1);
      var nMissing = nTotal - n1;
      var answer = fracStr(nMissing, d);
      var seen = {}; seen[answer] = true;
      var ws = [];
      var offsets = [1, -1, 2, -2];
      for (var oi = 0; oi < offsets.length && ws.length < 3; oi++) {
        var c = fracStr(nMissing + offsets[oi], d);
        if (!seen[c] && nMissing + offsets[oi] > 0) { seen[c] = true; ws.push(c); }
      }
      while (ws.length < 3) ws.push(fracStr(nMissing + ws.length + 3, d));
      var choices = shuffle([answer].concat(ws.slice(0, 3)));
      return { question: fracStr(n1, d) + " + ? = " + fracStr(nTotal, d), answer: answer, choices: choices };
    },
  },

  {
    id: "s76_missing_dec",
    label: "Missende decimaal",
    group: "Missende term",
    desc: "0,4 + ? = 1,2",
    strategy: "aanvullen",
    tip: "Trek de bekende decimaal af van het totaal.",
    uitleg: "Missende decimaal: ? = totaal - bekende decimaal. 0,4 + ? = 1,2 → ? = 1,2 - 0,4 = 0,8.",
    voorbeeld: "1,5 + ? = 2,3 → ? = 0,8.",
    minCorrect: 10,
    generate: function() {
      var total = rnd(5, 25);
      var a = rnd(1, total - 1);
      var missing = total - a;
      var answer = tiendStr(missing * 10);
      var seen = {}; seen[answer] = true;
      var ws = [];
      var offsets = [1, -1, 2, -2];
      for (var oi = 0; oi < offsets.length && ws.length < 3; oi++) {
        var c = tiendStr((missing + offsets[oi]) * 10);
        if (!seen[c] && missing + offsets[oi] > 0) { seen[c] = true; ws.push(c); }
      }
      while (ws.length < 3) ws.push(tiendStr((missing + ws.length + 3) * 10));
      var choices = shuffle([answer].concat(ws.slice(0, 3)));
      return { question: tiendStr(a * 10) + " + ? = " + tiendStr(total * 10), answer: answer, choices: choices };
    },
  },

  {
    id: "s77_missing_money",
    label: "Missend geldbedrag",
    group: "Missende term",
    desc: "€ 1,50 + ? = € 4,00",
    strategy: "aanvullen",
    tip: "Hoeveel moet je bij het bekende bedrag optellen om het totaal te krijgen?",
    uitleg: "Missend bedrag: ? = totaal - bekend bedrag. € 1,50 + ? = € 4,00 → ? = € 4,00 - € 1,50 = € 2,50.",
    voorbeeld: "€ 3,25 + ? = € 5,00 → ? = € 1,75.",
    minCorrect: 10,
    generate: function() {
      var total = rnd(2, 8) * 100;
      var a = rnd(1, total / 100 - 1) * 100 + rnd(0, 3) * 25;
      if (a <= 0) a = 50; if (a >= total) a = total - 25;
      var missing = total - a;
      var answer = centStr(missing);
      var seen = {}; seen[answer] = true;
      var offsets = [25, -25, 50, -50];
      var ws = [];
      for (var oi = 0; oi < offsets.length && ws.length < 3; oi++) {
        var c = centStr(missing + offsets[oi]);
        if (!seen[c] && missing + offsets[oi] > 0) { seen[c] = true; ws.push(c); }
      }
      while (ws.length < 3) ws.push(centStr(missing + (ws.length + 2) * 25));
      var choices = shuffle([answer].concat(ws.slice(0, 3)));
      return { question: centStr(a) + " + ? = " + centStr(total), answer: answer, choices: choices };
    },
  },

  {
    id: "s78_missing_time",
    label: "Missende tijdsduur",
    group: "Missende term",
    desc: "0u45 + ? = 1u30",
    strategy: "aanvullen",
    tip: "Trek de bekende duur af van de totale tijd.",
    uitleg: "Missende duur: ? = totaal - bekende duur. 0u45 + ? = 1u30 → ? = 90 - 45 = 45 min = 0u45.",
    voorbeeld: "1u20 + ? = 2u00 → ? = 40 min = 0u40.",
    minCorrect: 10,
    generate: function() {
      var total = rnd(4, 12) * 30;
      var a = rnd(1, total / 30 - 1) * 30;
      if (a <= 0) a = 30; if (a >= total) a = total - 30;
      var missing = total - a;
      var answer = timeStr(missing);
      var seen = {}; seen[answer] = true;
      var offsets = [15, -15, 30, -30];
      var ws = [];
      for (var oi = 0; oi < offsets.length && ws.length < 3; oi++) {
        var t = timeStr(missing + offsets[oi]);
        if (!seen[t] && missing + offsets[oi] > 0) { seen[t] = true; ws.push(t); }
      }
      while (ws.length < 3) ws.push(timeStr(missing + (ws.length + 2) * 15));
      var choices = shuffle([answer].concat(ws.slice(0, 3)));
      return { question: timeStr(a) + " + ? = " + timeStr(total), answer: answer, choices: choices };
    },
  },

  // ── GROEP: KOLOMOPTELLING GEVORDERD ──────────────────────────────

  {
    id: "s79_column_2x2",
    label: "Kolomoptelling 2-cijferig",
    group: "Kolomoptelling",
    desc: "  47\n+ 38\n----",
    strategy: "kolomsgewijs",
    tip: "Begin rechts: eenheden optellen, dan tientallen. Draag over als > 9.",
    uitleg: "Kolomoptelling: zet de getallen onder elkaar, eenheden onder eenheden. Begin rechts. Is een kolom samen 10 of meer, schrijf dan alleen het laatste cijfer op en onthoud 1 voor de kolom links ervan.",
    voorbeeld: "47 + 38 = ?\nEenheden: 7 + 8 = 15, schrijf 5, onthoud 1\nTientallen: 4 + 3 + 1 = 8\nAntwoord: 85\nIn je hoofd kan het ook: 47 + 40 − 2 = 85",
    minCorrect: 10,
    generate: function() {
      var a = rnd(10, 89); var b = rnd(10, 89);
      if (a + b > 99) b = rnd(10, 99 - a);
      return makeQ([a, b], a + b);
    },
  },

  {
    id: "s80_column_3x2",
    label: "Kolomoptelling 3+2 cijferig",
    group: "Kolomoptelling",
    desc: "  145\n+  67\n----",
    strategy: "kolomsgewijs",
    tip: "Schrijf de getallen netjes onder elkaar en begin rechts.",
    uitleg: "Zet de getallen onder elkaar met de eenheden recht onder elkaar; het kleine getal schuift dus naar rechts. Begin rechts. Is een kolom 10 of meer, schrijf het laatste cijfer op en onthoud 1 voor de volgende kolom.",
    voorbeeld: "145 + 67 = ?\nEenheden: 5 + 7 = 12, schrijf 2, onthoud 1\nTientallen: 4 + 6 + 1 = 11, schrijf 1, onthoud 1\nHonderden: 1 + 1 = 2. Antwoord: 212\nIn je hoofd kan het ook: 145 + 70 − 3 = 212",
    minCorrect: 10,
    generate: function() {
      var a = rnd(100, 499); var b = rnd(10, 99);
      if (a + b > 599) b = rnd(10, 599 - a);
      return makeQ([a, b], a + b);
    },
  },

  {
    id: "s81_column_4x2",
    label: "Kolomoptelling 4-cijferig",
    group: "Kolomoptelling",
    desc: "  1456\n+  378\n-----",
    strategy: "kolomsgewijs",
    tip: "Vier kolommen: begin rechts bij de eenheden.",
    uitleg: "Vier kolommen: duizenden, honderden, tientallen en eenheden. Begin rechts bij de eenheden. Is een kolom 10 of meer, schrijf het laatste cijfer op en onthoud 1 voor de kolom links ervan.",
    voorbeeld: "1456 + 378 = ?\nEenheden: 6 + 8 = 14, schrijf 4, onthoud 1\nTientallen: 5 + 7 + 1 = 13, schrijf 3, onthoud 1\nHonderden: 4 + 3 + 1 = 8. Duizenden: 1. Antwoord: 1834\nIn je hoofd kan het ook: 1456 + 400 − 22 = 1834",
    minCorrect: 10,
    generate: function() {
      var a = rnd(1000, 4999); var b = rnd(100, 999);
      if (a + b > 5999) b = rnd(100, 5999 - a);
      return makeQ([a, b], a + b);
    },
  },

  {
    id: "s82_column_money",
    label: "Kolomoptelling geld",
    group: "Kolomoptelling",
    desc: "€ 3,45 + € 2,78 kolomsgewijs",
    strategy: "kolomsgewijs",
    tip: "Werk in centen, tel kolomsgewijs op.",
    uitleg: "Geld kolomsgewijs: € 3,45 = 345 cent. € 2,78 = 278 cent. 345 + 278 = 623 cent = € 6,23.",
    voorbeeld: "€ 4,56 + € 3,78 = 456 + 378 = 834 cent = € 8,34.",
    minCorrect: 10,
    generate: function() {
      var a = rnd(1, 9) * 100 + rnd(0, 9) * 10 + rnd(0, 9) * 1;
      var b = rnd(0, 8) * 100 + rnd(0, 9) * 10 + rnd(0, 9) * 1;
      if (a + b > 1999) b = rnd(0, 4) * 100 + 50;
      var sum = a + b;
      var answer = centStr(sum);
      var seen = {}; seen[answer] = true;
      var offsets = [1, -1, 10, -10, 100];
      var ws = [];
      for (var oi = 0; oi < offsets.length && ws.length < 3; oi++) {
        var c = centStr(sum + offsets[oi]);
        if (!seen[c] && sum + offsets[oi] > 0) { seen[c] = true; ws.push(c); }
      }
      while (ws.length < 3) ws.push(centStr(sum + (ws.length + 2) * 10));
      var choices = shuffle([answer].concat(ws.slice(0, 3)));
      return { question: centStr(a) + " + " + centStr(b) + " =", answer: answer, choices: choices };
    },
  },

  {
    id: "s83_column_dec",
    label: "Kolomoptelling decimalen",
    group: "Kolomoptelling",
    desc: "3,45 + 2,78 kolomsgewijs",
    strategy: "kolomsgewijs",
    tip: "Zet de komma's onder elkaar en tel kolomsgewijs op.",
    uitleg: "Decimalen kolomsgewijs: 3,45 + 2,78. Honderdsten: 5+8=13 (3,+1). Tienden: 4+7+1=12 (2,+1). Eenheden: 3+2+1=6. Antwoord: 6,23.",
    voorbeeld: "1,56 + 2,78 = ?\nHonderdsten: 6+8=14 (4,+1). Tienden: 5+7+1=13 (3,+1). Eenheden: 1+2+1=4. Antwoord: 4,34.",
    minCorrect: 10,
    generate: function() {
      var a = rnd(100, 999); var b = rnd(100, 999);
      if (a + b > 1999) b = rnd(100, 1999 - a);
      var sum = a + b;
      var answer = honderdStr(sum);
      var seen = {}; seen[answer] = true;
      var offsets = [1, -1, 10, -10, 100];
      var ws = [];
      for (var oi = 0; oi < offsets.length && ws.length < 3; oi++) {
        var c = honderdStr(sum + offsets[oi]);
        if (!seen[c] && sum + offsets[oi] > 0) { seen[c] = true; ws.push(c); }
      }
      while (ws.length < 3) ws.push(honderdStr(sum + (ws.length + 2) * 10));
      var choices = shuffle([answer].concat(ws.slice(0, 3)));
      return { question: honderdStr(a) + " + " + honderdStr(b) + " =", answer: answer, choices: choices };
    },
  },



  // ── GROEP: GEVORDERD ──────────────────────────────────────────────

  {
    id: "s84_frac_dec_link",
    label: "Breuken en decimalen",
    group: "Gevorderd",
    desc: "1/2 + 0,3 = ? (gemengd domein)",
    strategy: "omrekenen",
    tip: "Zet de breuk om naar een decimaal (of andersom) en tel dan op.",
    uitleg: "Breuken en decimalen combineren: zet alles om naar hetzelfde formaat. 1/2 = 0,5. Dan 0,5 + 0,3 = 0,8.",
    voorbeeld: "1/4 + 0,5 = 0,25 + 0,5 = 0,75 = 3/4.",
    minCorrect: 10,
    generate: function() {
      var fracPairs = [[1,2],[1,4],[3,4],[1,5],[2,5],[3,5],[4,5]];
      var fp = fracPairs[rnd(0, fracPairs.length - 1)];
      var decTienden = rnd(1, 9);
      var fracInTienden = Math.round(fp[0] / fp[1] * 10);
      var sumTienden = fracInTienden + decTienden;
      var answer = tiendStr(sumTienden);
      var seen = {}; seen[answer] = true;
      var offsets = [1, -1, 2, -2];
      var ws = [];
      for (var oi = 0; oi < offsets.length && ws.length < 3; oi++) {
        var c = tiendStr(sumTienden + offsets[oi]);
        if (!seen[c] && sumTienden + offsets[oi] > 0) { seen[c] = true; ws.push(c); }
      }
      while (ws.length < 3) ws.push(tiendStr(sumTienden + ws.length + 3));
      var choices = shuffle([answer].concat(ws.slice(0, 3)));
      return { question: fracStr(fp[0], fp[1]) + " + " + tiendStr(decTienden * 10) + " =", answer: answer, choices: choices };
    },
  },

  {
    id: "s85_frac_error",
    label: "Fout-spotter breuken gevorderd",
    group: "Gevorderd",
    desc: "Welke breuksom klopt niet? (grotere noemers)",
    strategy: "controleren",
    tip: "Reken elke breuksom na; zoek de som waarvan het antwoord niet klopt.",
    uitleg: "Fout-spotter breuken: drie sommen zijn correct, één klopt niet. Reken elke som na door de tellers op te tellen (noemer blijft hetzelfde).",
    voorbeeld: "2/5 + 1/5 = 3/5 ✓, 3/7 + 2/7 = 6/7 FOUT (= 5/7).",
    minCorrect: 10,
    generate: function() {
      // Gebruik alleen gelijke noemers voor voorspelbare unieke strings
      var d = rnd(5, 9);
      // Genereer 4 unieke (n1,n2)-paren met unieke somstrings
      var allPairs = [];
      for (var a = 1; a < d; a++) {
        for (var b = 1; b < d; b++) {
          allPairs.push([a, b]);
        }
      }
      allPairs = shuffle(allPairs);
      // Bouw keuzes met seen-check op de volledige keuzestring
      var seen = {};
      var chosen = [];
      for (var pi = 0; pi < allPairs.length && chosen.length < 4; pi++) {
        var pa = allPairs[pi][0]; var pb = allPairs[pi][1];
        var s = fracStr(pa, d) + " + " + fracStr(pb, d) + " = " + fracStr(pa + pb, d);
        if (!seen[s]) { seen[s] = true; chosen.push([pa, pb]); }
      }
      if (chosen.length < 4) {
        // Fallback: eenvoudige vaste paren met d=6
        d = 6;
        chosen = [[1,2],[2,1],[1,3],[3,1]];
      }
      // p0 wordt de foute som
      var p0 = chosen[0];
      var correctAns = fracStr(p0[0] + p0[1], d);
      var wrongN = p0[0] + p0[1] + (Math.random() > 0.5 ? 1 : -1);
      if (wrongN <= 0) wrongN = p0[0] + p0[1] + 2;
      var wrongAns = fracStr(wrongN, d);
      // Zorg dat wrongAns != correctAns na reductie
      var tries = 0;
      while (wrongAns === correctAns && tries++ < 10) {
        wrongN += 1;
        wrongAns = fracStr(wrongN, d);
      }
      var wrongStr = fracStr(p0[0], d) + " + " + fracStr(p0[1], d) + " = " + wrongAns;
      var c1 = fracStr(chosen[1][0], d) + " + " + fracStr(chosen[1][1], d) + " = " + fracStr(chosen[1][0] + chosen[1][1], d);
      var c2 = fracStr(chosen[2][0], d) + " + " + fracStr(chosen[2][1], d) + " = " + fracStr(chosen[2][0] + chosen[2][1], d);
      var c3 = fracStr(chosen[3][0], d) + " + " + fracStr(chosen[3][1], d) + " = " + fracStr(chosen[3][0] + chosen[3][1], d);
      // Final seen-check op de vier keuzestrings
      var finalSeen = {}; finalSeen[wrongStr] = true;
      if (finalSeen[c1] || finalSeen[c2] || finalSeen[c3]) {
        // Fallback naar makeErrorQ-stijl met integers
        return makeErrorQ();
      }
      return { question: "Welk antwoord is FOUT?", answer: wrongStr, choices: shuffle([wrongStr, c1, c2, c3]), isErrorSpotter: true };
    },
  },

  {
    id: "s86_large_numbers",
    label: "Grote getallen",
    group: "Gevorderd",
    desc: "3456 + 2789 = ?",
    strategy: "rijgen",
    tip: "Tel van groot naar klein erbij: eerst de duizenden, dan de honderden, tientallen en eenheden.",
    uitleg: "Houd het eerste getal heel en tel het tweede er stuk voor stuk bij, van groot naar klein. Zit het tweede getal vlak onder een rond getal? Tel dan het ronde getal erbij en haal er daarna af wat je te veel deed.",
    voorbeeld: "3456 + 2789 = ?\n3456 + 2000 = 5456\n5456 + 700 = 6156\n6156 + 80 = 6236\n6236 + 9 = 6245\nSneller: 2789 is 11 minder dan 2800. 3456 + 2800 = 6256, je deed 11 te veel, dus 6256 − 11 = 6245",
    minCorrect: 10,
    generate: function() {
      var a = rnd(1000, 7999); var b = rnd(1000, 7999);
      if (a + b > 9999) b = rnd(1000, 9999 - a);
      return makeQ([a, b], a + b);
    },
  },

  {
    id: "s87_large_context",
    label: "Grote getallen in context",
    group: "Gevorderd",
    desc: "Een stad heeft 12.450 + 8.320 inwoners. Totaal?",
    strategy: "rijgen",
    tip: "Haal de getallen uit de tekst en tel van groot naar klein erbij: duizenden, honderden, tientallen, eenheden.",
    uitleg: "Haal de twee getallen uit de tekst. Schat eerst: rond allebei af op duizenden en tel op. Reken daarna precies, van groot naar klein: duizenden, honderden, tientallen, eenheden. Je antwoord moet dicht bij je schatting liggen.",
    voorbeeld: "5680 boeken + 3470 boeken\nSchatting: 6000 + 3000 = 9000\n5680 + 3000 = 8680\n8680 + 400 = 9080\n9080 + 70 = 9150",
    minCorrect: 10,
    generate: function() {
      var a = rnd(1000, 9000);
      var b = rnd(1000, 9000);
      if (a + b > 19999) b = rnd(1000, 19999 - a);
      return makeQ([a, b], a + b);
    },
  },

  {
    id: "s88_dec_complex",
    label: "Decimalen complex",
    group: "Gevorderd",
    desc: "3,45 + 12,78 = ?",
    strategy: "kolomsgewijs",
    tip: "Zet de komma's onder elkaar en tel kolom voor kolom.",
    uitleg: "Complexe decimaaloptelling: schrijf getallen netjes onder elkaar (komma onder komma). Tel van rechts naar links op en draag over.",
    voorbeeld: "3,45 + 12,78: 5+8=13 (3,+1); 4+7+1=12 (2,+1); 3+2+1=6; 0+1=1. Antwoord: 16,23.",
    minCorrect: 10,
    generate: function() {
      var a = rnd(100, 1999); var b = rnd(100, 1999);
      if (a + b > 3999) b = rnd(100, 3999 - a);
      var sum = a + b;
      var answer = honderdStr(sum);
      var seen = {}; seen[answer] = true;
      var offsets = [1, -1, 10, -10];
      var ws = [];
      for (var oi = 0; oi < offsets.length && ws.length < 3; oi++) {
        var c = honderdStr(sum + offsets[oi]);
        if (!seen[c] && sum + offsets[oi] > 0) { seen[c] = true; ws.push(c); }
      }
      while (ws.length < 3) ws.push(honderdStr(sum + (ws.length + 2) * 10));
      var choices = shuffle([answer].concat(ws.slice(0, 3)));
      return { question: honderdStr(a) + " + " + honderdStr(b) + " =", answer: answer, choices: choices };
    },
  },

  {
    id: "s89_missing_complex",
    label: "Missende term complex",
    group: "Gevorderd",
    desc: "? + 3,45 = 7,00",
    strategy: "aanvullen",
    tip: "Trek het bekende getal af van het totaal.",
    uitleg: "Missende term bij decimalen: ? = totaal - bekend. ? + 3,45 = 7,00 → ? = 7,00 - 3,45 = 3,55.",
    voorbeeld: "? + 12,50 = 20,00 → ? = 7,50.",
    minCorrect: 10,
    generate: function() {
      var total = rnd(5, 20) * 100;
      var a = rnd(50, total - 50);
      if (a >= total) a = total - 100;
      var missing = total - a;
      var answer = honderdStr(missing);
      var seen = {}; seen[answer] = true;
      var offsets = [1, -1, 10, -10, 100];
      var ws = [];
      for (var oi = 0; oi < offsets.length && ws.length < 3; oi++) {
        var c = honderdStr(missing + offsets[oi]);
        if (!seen[c] && missing + offsets[oi] > 0) { seen[c] = true; ws.push(c); }
      }
      while (ws.length < 3) ws.push(honderdStr(missing + (ws.length + 2) * 10));
      var choices = shuffle([answer].concat(ws.slice(0, 3)));
      return { question: "? + " + honderdStr(a) + " = " + honderdStr(total), answer: answer, choices: choices };
    },
  },

  {
    id: "s90_time_adv",
    label: "Tijd gevorderd",
    group: "Gevorderd",
    desc: "Drie tijdsduren optellen: 0u45 + 1u30 + 0u50",
    strategy: "tijd",
    tip: "Tel alle minuten bij elkaar op en zet het resultaat om naar uren en minuten.",
    uitleg: "Drie tijdsduren: zet alles om naar minuten, tel op, zet terug. 0u45 + 1u30 + 0u50 = 45 + 90 + 50 = 185 min = 3u05.",
    voorbeeld: "1u15 + 0u40 + 1u10 = 75 + 40 + 70 = 185 min = 3u05.",
    minCorrect: 10,
    generate: function() {
      var a = rnd(1, 8) * 15; var b = rnd(1, 8) * 15; var c = rnd(1, 8) * 15;
      var total = a + b + c;
      if (total > 480) { c = 15; total = a + b + 15; }
      var answer = timeStr(total);
      var seen = {}; seen[answer] = true;
      var offsets = [5, -5, 10, -10, 15];
      var ws = [];
      for (var oi = 0; oi < offsets.length && ws.length < 3; oi++) {
        var t = timeStr(total + offsets[oi]);
        if (!seen[t] && total + offsets[oi] > 0) { seen[t] = true; ws.push(t); }
      }
      while (ws.length < 3) ws.push(timeStr(total + (ws.length + 2) * 5));
      var choices = shuffle([answer].concat(ws.slice(0, 3)));
      return { question: timeStr(a) + " + " + timeStr(b) + " + " + timeStr(c) + " =", answer: answer, choices: choices };
    },
  },

  {
    id: "s91_measure_mix",
    label: "Maten gemengd",
    group: "Gevorderd",
    desc: "1 km 400 m + 0 km 850 m = ?",
    strategy: "meten",
    tip: "Zet alles om naar de kleinste eenheid, tel op, zet terug.",
    uitleg: "Gemengde maten: zet km en m om naar meters. 1 km 400 m = 1400 m. + 850 m = 2250 m = 2 km 250 m.",
    voorbeeld: "3 km 700 m + 1 km 500 m = 4200 + 1500 = 5700 m = 5 km 700 m.",
    minCorrect: 10,
    generate: function() {
      var km1 = rnd(0, 5); var m1 = rnd(0, 9) * 100;
      var km2 = rnd(0, 5); var m2 = rnd(0, 9) * 100;
      if (km1 === 0 && m1 === 0) m1 = 500;
      if (km2 === 0 && m2 === 0) m2 = 500;
      var totalM = (km1 * 1000 + m1) + (km2 * 1000 + m2);
      if (totalM > 9000) { km2 = 0; m2 = 500; totalM = km1 * 1000 + m1 + 500; }
      var tKm = Math.floor(totalM / 1000); var rM = totalM % 1000;
      var answer = tKm + " km " + rM + " m";
      function fmtKmM(tm) {
        var tk = Math.floor(tm / 1000); var rm = tm % 1000;
        return tk + " km " + rm + " m";
      }
      var seen = {}; seen[answer] = true;
      var ws = [];
      var offsets = [100, -100, 200, -200, 300];
      for (var oi = 0; oi < offsets.length && ws.length < 3; oi++) {
        var s = fmtKmM(totalM + offsets[oi]);
        if (!seen[s] && totalM + offsets[oi] > 0) { seen[s] = true; ws.push(s); }
      }
      while (ws.length < 3) ws.push(fmtKmM(totalM + (ws.length + 2) * 100));
      var q1 = km1 + " km " + m1 + " m"; var q2 = km2 + " km " + m2 + " m";
      var choices = shuffle([answer].concat(ws.slice(0, 3)));
      return { question: q1 + " + " + q2 + " =", answer: answer, choices: choices };
    },
  },

  {
    id: "s92_money_adv",
    label: "Geld gevorderd",
    group: "Gevorderd",
    desc: "Boodschappensom: vijf artikelen bij elkaar optellen",
    strategy: "geld",
    tip: "Groepeer handige combinaties die samen een rond bedrag maken.",
    uitleg: "Meerdere bedragen optellen: zoek slimme combinaties. € 1,25 + € 0,75 = € 2,00. Dan de rest erbij.",
    voorbeeld: "€ 2,99 + € 1,01 + € 3,50 = € 3,00 + € 3,50 = € 6,50.",
    minCorrect: 10,
    generate: function() {
      var a = rnd(1, 5) * 100 + rnd(0, 3) * 25;
      var b = rnd(0, 4) * 100 + rnd(1, 3) * 25;
      var c = rnd(0, 3) * 100 + rnd(1, 3) * 25;
      if (a < 25) a = 25; if (b < 25) b = 25; if (c < 25) c = 25;
      if (a + b + c > 1500) { b = 75; c = 50; }
      var sum = a + b + c;
      var answer = centStr(sum);
      var seen = {}; seen[answer] = true;
      var offsets = [25, -25, 50, -50, 75];
      var ws = [];
      for (var oi = 0; oi < offsets.length && ws.length < 3; oi++) {
        var cv = centStr(sum + offsets[oi]);
        if (!seen[cv] && sum + offsets[oi] > 0) { seen[cv] = true; ws.push(cv); }
      }
      while (ws.length < 3) ws.push(centStr(sum + (ws.length + 2) * 25));
      var choices = shuffle([answer].concat(ws.slice(0, 3)));
      return { question: centStr(a) + " + " + centStr(b) + " + " + centStr(c) + " =", answer: answer, choices: choices };
    },
  },

  {
    id: "s93_context_mix",
    label: "Gemengde context",
    group: "Gevorderd",
    desc: "Combineer geld, tijd of maten in één verhaalsom",
    strategy: "kiezen",
    tip: "Lees goed welke eenheid gevraagd wordt en reken in die eenheid.",
    uitleg: "Gemengde contextsommen: identificeer welk domein (geld/tijd/maten) en reken consistent in die eenheid.",
    voorbeeld: "Wandeling duurt 1u15 + 0u50 = 2u05.",
    minCorrect: 10,
    generate: function() {
      var type = rnd(0, 2);
      if (type === 0) {
        var a = rnd(1, 6) * 100 + rnd(0, 3) * 25;
        var b = rnd(0, 4) * 100 + rnd(1, 3) * 25;
        if (a + b > 1200) b = 75;
        var sum = a + b;
        var answer = centStr(sum);
        var seen = {}; seen[answer] = true;
        var ws = [];
        var offsets = [25, -25, 50, -50];
        for (var oi = 0; oi < offsets.length && ws.length < 3; oi++) {
          var c = centStr(sum + offsets[oi]);
          if (!seen[c] && sum + offsets[oi] > 0) { seen[c] = true; ws.push(c); }
        }
        while (ws.length < 3) ws.push(centStr(sum + (ws.length + 2) * 25));
        return { question: centStr(a) + " + " + centStr(b) + " =", answer: answer, choices: shuffle([answer].concat(ws.slice(0, 3))) };
      } else if (type === 1) {
        var h1 = rnd(0, 2); var m1 = rnd(1, 11) * 5;
        var h2 = rnd(0, 2); var m2 = rnd(1, 11) * 5;
        var totalMin = h1 * 60 + m1 + h2 * 60 + m2;
        if (totalMin > 480) { h2 = 0; m2 = 20; totalMin = h1 * 60 + m1 + 20; }
        var tAnswer = timeStr(totalMin);
        var tSeen = {}; tSeen[tAnswer] = true;
        var tWs = [];
        var tOffsets = [5, -5, 10, -10, 15];
        for (var ti = 0; ti < tOffsets.length && tWs.length < 3; ti++) {
          var tt = timeStr(totalMin + tOffsets[ti]);
          if (!tSeen[tt] && totalMin + tOffsets[ti] > 0) { tSeen[tt] = true; tWs.push(tt); }
        }
        while (tWs.length < 3) tWs.push(timeStr(totalMin + (tWs.length + 2) * 5));
        return { question: timeStr(h1 * 60 + m1) + " + " + timeStr(h2 * 60 + m2) + " =", answer: tAnswer, choices: shuffle([tAnswer].concat(tWs.slice(0, 3))) };
      } else {
        var ca = rnd(10, 150); var cb = rnd(10, 150);
        if (ca + cb > 300) cb = rnd(10, 300 - ca);
        var cSum = ca + cb;
        var cAnswer = cSum + " cm";
        var cSeen = {}; cSeen[cAnswer] = true;
        var cWs = [];
        var cOffsets = [5, -5, 10, -10, 15];
        for (var ci = 0; ci < cOffsets.length && cWs.length < 3; ci++) {
          var cs = (cSum + cOffsets[ci]) + " cm";
          if (!cSeen[cs] && cSum + cOffsets[ci] > 0) { cSeen[cs] = true; cWs.push(cs); }
        }
        while (cWs.length < 3) cWs.push((cSum + (cWs.length + 2) * 5) + " cm");
        return { question: ca + " cm + " + cb + " cm =", answer: cAnswer, choices: shuffle([cAnswer].concat(cWs.slice(0, 3))) };
      }
    },
  },

  // ── GROEP: MASTERNIVEAU ───────────────────────────────────────────

  {
    id: "s94_all_domains",
    label: "Alle domeinen",
    group: "Master",
    desc: "Mix van getallen, breuken, decimalen, geld en tijd",
    strategy: "flexibel",
    tip: "Lees eerst welk type som het is en kies de juiste strategie.",
    uitleg: "Op masterniveau komen alle soorten sommen door elkaar. Herken het type en pas de juiste strategie toe.",
    voorbeeld: "Alle types kunnen verschijnen: 3/4 + 1/4, € 2,50 + € 1,75, 1u30 + 0u45, etc.",
    minCorrect: 12,
    generate: function() {
      var type = rnd(0, 3);
      if (type === 0) {
        var a = rnd(10, 500); var b = rnd(10, 500);
        if (a + b > 999) b = rnd(10, 999 - a);
        return makeQ([a, b], a + b);
      } else if (type === 1) {
        var d = rnd(3, 8); var n1 = rnd(1, d - 1); var n2 = rnd(1, d - 1);
        var sumN = n1 + n2; var answer = fracStr(sumN, d);
        var seen = {}; seen[answer] = true; var ws = [];
        var offsets = [1, -1, 2, -2, 3];
        for (var oi = 0; oi < offsets.length && ws.length < 3; oi++) {
          var c = fracStr(sumN + offsets[oi], d);
          if (!seen[c]) { seen[c] = true; ws.push(c); }
        }
        while (ws.length < 3) ws.push(fracStr(sumN + ws.length + 4, d));
        return { question: fracStr(n1, d) + " + " + fracStr(n2, d) + " =", answer: answer, choices: shuffle([answer].concat(ws.slice(0, 3))) };
      } else if (type === 2) {
        var fa = rnd(1, 9) * 100 + rnd(0, 9) * 10;
        var fb = rnd(1, 9) * 100 + rnd(0, 9) * 10;
        if (fa + fb > 1999) fb = rnd(1, 8) * 100;
        var fSum = fa + fb; var fAnswer = centStr(fSum);
        var fSeen = {}; fSeen[fAnswer] = true; var fWs = [];
        var fOffsets = [25, -25, 50, -50];
        for (var fi = 0; fi < fOffsets.length && fWs.length < 3; fi++) {
          var fc = centStr(fSum + fOffsets[fi]);
          if (!fSeen[fc] && fSum + fOffsets[fi] > 0) { fSeen[fc] = true; fWs.push(fc); }
        }
        while (fWs.length < 3) fWs.push(centStr(fSum + (fWs.length + 2) * 25));
        return { question: centStr(fa) + " + " + centStr(fb) + " =", answer: fAnswer, choices: shuffle([fAnswer].concat(fWs.slice(0, 3))) };
      } else {
        var ta = rnd(1, 8) * 15; var tb = rnd(1, 8) * 15;
        var tTotal = ta + tb;
        if (tTotal > 480) { tb = 15; tTotal = ta + 15; }
        var tAnswer = timeStr(tTotal);
        var tSeen = {}; tSeen[tAnswer] = true; var tWs = [];
        var tOffsets = [5, -5, 10, -10, 15];
        for (var ti2 = 0; ti2 < tOffsets.length && tWs.length < 3; ti2++) {
          var tt2 = timeStr(tTotal + tOffsets[ti2]);
          if (!tSeen[tt2] && tTotal + tOffsets[ti2] > 0) { tSeen[tt2] = true; tWs.push(tt2); }
        }
        while (tWs.length < 3) tWs.push(timeStr(tTotal + (tWs.length + 2) * 5));
        return { question: timeStr(ta) + " + " + timeStr(tb) + " =", answer: tAnswer, choices: shuffle([tAnswer].concat(tWs.slice(0, 3))) };
      }
    },
  },

  {
    id: "s95_speed_int",
    label: "Snelheidsronde gehele getallen",
    group: "Master",
    desc: "Zo snel mogelijk: gevarieerde gehele getallen",
    strategy: "snel",
    tip: "Probeer de sommen zo snel mogelijk uit je hoofd te rekenen.",
    uitleg: "Kies per som de snelste truc. Vlak onder een rond getal? Compenseren. Over een tiental of honderdtal? Eerst aanvullen. Grote getallen? Van groot naar klein erbij tellen. Kijk tot slot of het laatste cijfer klopt.",
    voorbeeld: "27 + 93: 93 is 7 minder dan 100\n27 + 100 = 127, en 127 − 7 = 120\n4582 + 1051: 4582 + 1000 = 5582\n5582 + 51 = 5633",
    minCorrect: 15,
    generate: function() {
      var level = rnd(0, 2);
      if (level === 0) {
        var a = rnd(10, 99); var b = rnd(10, 99);
        return makeQ([a, b], a + b);
      } else if (level === 1) {
        var a2 = rnd(100, 999); var b2 = rnd(100, 999);
        if (a2 + b2 > 9999) b2 = rnd(100, 9999 - a2);
        return makeQ([a2, b2], a2 + b2);
      } else {
        var a3 = rnd(1000, 9999); var b3 = rnd(1000, 9999);
        if (a3 + b3 > 99999) b3 = rnd(1000, 99999 - a3);
        return makeQ([a3, b3], a3 + b3);
      }
    },
  },

  {
    id: "s96_speed_frac",
    label: "Snelheidsronde breuken",
    group: "Master",
    desc: "Zo snel mogelijk: gevarieerde breuksommen",
    strategy: "snel",
    tip: "Herken snel of de noemers gelijk zijn of dat je moet omzetten.",
    uitleg: "Snelheidsronde breuken: gelijke en ongelijke noemers door elkaar. Reageer snel en nauwkeurig.",
    voorbeeld: "1/3 + 1/3, 1/2 + 1/4, 2/5 + 1/5, etc.",
    minCorrect: 15,
    generate: function() {
      var type = rnd(0, 1);
      if (type === 0) {
        var d = rnd(2, 8); var n1 = rnd(1, d - 1); var n2 = rnd(1, d - 1);
        var sumN = n1 + n2; var answer = fracStr(sumN, d);
        var seen = {}; seen[answer] = true; var ws = [];
        var offsets = [1, -1, 2, -2, 3];
        for (var oi = 0; oi < offsets.length && ws.length < 3; oi++) {
          var c = fracStr(sumN + offsets[oi], d);
          if (!seen[c]) { seen[c] = true; ws.push(c); }
        }
        while (ws.length < 3) ws.push(fracStr(sumN + ws.length + 4, d));
        return { question: fracStr(n1, d) + " + " + fracStr(n2, d) + " =", answer: answer, choices: shuffle([answer].concat(ws.slice(0, 3))) };
      } else {
        var d1 = rnd(2, 4); var d2 = rnd(2, 4);
        while (d2 === d1) d2 = rnd(2, 4);
        var na = rnd(1, d1 - 1); var nb = rnd(1, d2 - 1);
        var lcd = d1 * d2 / gcd(d1, d2);
        var nSum = na * (lcd / d1) + nb * (lcd / d2);
        var answer2 = fracStr(nSum, lcd);
        var seen2 = {}; seen2[answer2] = true; var ws2 = [];
        var offsets2 = [1, -1, 2, -2];
        for (var oi2 = 0; oi2 < offsets2.length && ws2.length < 3; oi2++) {
          var c2 = fracStr(nSum + offsets2[oi2], lcd);
          if (!seen2[c2]) { seen2[c2] = true; ws2.push(c2); }
        }
        while (ws2.length < 3) ws2.push(fracStr(nSum + ws2.length + 3, lcd));
        return { question: fracStr(na, d1) + " + " + fracStr(nb, d2) + " =", answer: answer2, choices: shuffle([answer2].concat(ws2.slice(0, 3))) };
      }
    },
  },

  {
    id: "s97_speed_dec",
    label: "Snelheidsronde decimalen",
    group: "Master",
    desc: "Zo snel mogelijk: decimalen met tienden en honderdsten",
    strategy: "snel",
    tip: "Let op de komma en draag netjes over.",
    uitleg: "Snelheidsronde decimalen: tienden en honderdsten door elkaar. Snel en nauwkeurig.",
    voorbeeld: "0,3 + 0,7, 1,25 + 2,75, 3,4 + 2,8, etc.",
    minCorrect: 15,
    generate: function() {
      var type = rnd(0, 1);
      if (type === 0) {
        var a = rnd(1, 19); var b = rnd(1, 19);
        var sum = a + b; var answer = tiendStr(sum * 10);
        var seen = {}; seen[answer] = true; var ws = [];
        var offsets = [1, -1, 2, -2];
        for (var oi = 0; oi < offsets.length && ws.length < 3; oi++) {
          var c = tiendStr((sum + offsets[oi]) * 10);
          if (!seen[c] && sum + offsets[oi] > 0) { seen[c] = true; ws.push(c); }
        }
        while (ws.length < 3) ws.push(tiendStr((sum + ws.length + 3) * 10));
        return { question: tiendStr(a * 10) + " + " + tiendStr(b * 10) + " =", answer: answer, choices: shuffle([answer].concat(ws.slice(0, 3))) };
      } else {
        var a2 = rnd(100, 999); var b2 = rnd(100, 999);
        if (a2 + b2 > 1999) b2 = rnd(100, 1999 - a2);
        var sum2 = a2 + b2; var answer2 = honderdStr(sum2);
        var seen2 = {}; seen2[answer2] = true; var ws2 = [];
        var offsets2 = [1, -1, 10, -10];
        for (var oi2 = 0; oi2 < offsets2.length && ws2.length < 3; oi2++) {
          var c2 = honderdStr(sum2 + offsets2[oi2]);
          if (!seen2[c2] && sum2 + offsets2[oi2] > 0) { seen2[c2] = true; ws2.push(c2); }
        }
        while (ws2.length < 3) ws2.push(honderdStr(sum2 + (ws2.length + 2) * 10));
        return { question: honderdStr(a2) + " + " + honderdStr(b2) + " =", answer: answer2, choices: shuffle([answer2].concat(ws2.slice(0, 3))) };
      }
    },
  },

  {
    id: "s98_missing_adv",
    label: "Missende term gevorderd",
    group: "Master",
    desc: "? + 3/4 = 2, of ? + 0,75 = 2,00",
    strategy: "aanvullen",
    tip: "Trek de bekende waarde af van het totaal; let op het domein.",
    uitleg: "Gevorderde missende term: kan in elk domein. Werk systematisch: totaal - bekend = missende term.",
    voorbeeld: "? + 1u45 = 3u00 → ? = 3u00 - 1u45 = 1u15.",
    minCorrect: 12,
    generate: function() {
      var type = rnd(0, 1);
      if (type === 0) {
        var total = rnd(5, 20) * 100;
        var a = rnd(50, total - 50);
        if (a >= total) a = total - 100;
        var missing = total - a;
        var answer = honderdStr(missing);
        var seen = {}; seen[answer] = true; var ws = [];
        var offsets = [1, -1, 10, -10, 100];
        for (var oi = 0; oi < offsets.length && ws.length < 3; oi++) {
          var c = honderdStr(missing + offsets[oi]);
          if (!seen[c] && missing + offsets[oi] > 0) { seen[c] = true; ws.push(c); }
        }
        while (ws.length < 3) ws.push(honderdStr(missing + (ws.length + 2) * 10));
        return { question: "? + " + honderdStr(a) + " = " + honderdStr(total), answer: answer, choices: shuffle([answer].concat(ws.slice(0, 3))) };
      } else {
        var total2 = rnd(4, 12) * 60;
        var a2 = rnd(1, total2 / 60 - 1) * 60 + rnd(0, 3) * 15;
        if (a2 <= 0) a2 = 30; if (a2 >= total2) a2 = total2 - 15;
        var missing2 = total2 - a2;
        var answer2 = timeStr(missing2);
        var seen2 = {}; seen2[answer2] = true; var ws2 = [];
        var offsets2 = [15, -15, 30, -30];
        for (var oi2 = 0; oi2 < offsets2.length && ws2.length < 3; oi2++) {
          var t = timeStr(missing2 + offsets2[oi2]);
          if (!seen2[t] && missing2 + offsets2[oi2] > 0) { seen2[t] = true; ws2.push(t); }
        }
        while (ws2.length < 3) ws2.push(timeStr(missing2 + (ws2.length + 2) * 15));
        return { question: "? + " + timeStr(a2) + " = " + timeStr(total2), answer: answer2, choices: shuffle([answer2].concat(ws2.slice(0, 3))) };
      }
    },
  },



  // ── FASE 4: s99–s100 ──────────────────────────────────────────────

  {
    id: "s99_bonus_mixed",
    label: "Bonus: gemengde uitdaging",
    group: "Master",
    desc: "Alle typen door elkaar — getallen, breuken, decimalen, geld en tijd",
    strategy: "flexibel",
    tip: "Herken het type som en kies de bijpassende strategie.",
    uitleg: "De bonusronde combineert alle domeinen. Lees elke vraag goed: is het een geheel getal, breuk, decimaal, geldsom of tijdsduur? Elke keer een andere aanpak.",
    voorbeeld: "3/4 + 1/4 = 1; € 2,50 + € 1,75 = € 4,25; 1u30 + 0u45 = 2u15.",
    minCorrect: 15,
    generate: function() {
      var type = rnd(0, 4);
      if (type === 0) {
        // Gehele getallen — gevarieerde moeilijkheid
        var level = rnd(0, 2);
        if (level === 0) { var a = rnd(10, 99); var b = rnd(10, 99); return makeQ([a, b], a + b); }
        if (level === 1) { var a2 = rnd(100, 999); var b2 = rnd(100, 999); if (a2 + b2 > 9999) b2 = rnd(100, 9999 - a2); return makeQ([a2, b2], a2 + b2); }
        var a3 = rnd(1000, 4999); var b3 = rnd(1000, 4999); if (a3 + b3 > 9999) b3 = rnd(1000, 9999 - a3); return makeQ([a3, b3], a3 + b3);
      }
      if (type === 1) {
        // Breuken — gelijke noemer
        var d = rnd(3, 9); var n1 = rnd(1, d - 1); var n2 = rnd(1, d - 1);
        var sumN = n1 + n2; var answer = fracStr(sumN, d);
        var seen = {}; seen[answer] = true; var ws = [];
        var offsets = [1, -1, 2, -2, 3];
        for (var oi = 0; oi < offsets.length && ws.length < 3; oi++) {
          var c = fracStr(sumN + offsets[oi], d);
          if (!seen[c]) { seen[c] = true; ws.push(c); }
        }
        while (ws.length < 3) ws.push(fracStr(sumN + ws.length + 4, d));
        return { question: fracStr(n1, d) + " + " + fracStr(n2, d) + " =", answer: answer, choices: shuffle([answer].concat(ws.slice(0, 3))) };
      }
      if (type === 2) {
        // Decimalen — tienden en honderdsten
        var sub = rnd(0, 1);
        if (sub === 0) {
          var ta = rnd(1, 19); var tb = rnd(1, 19);
          var tSum = ta + tb; var tAns = tiendStr(tSum * 10);
          var tSeen = {}; tSeen[tAns] = true; var tWs = [];
          var tOff = [1, -1, 2, -2];
          for (var ti = 0; ti < tOff.length && tWs.length < 3; ti++) {
            var tc = tiendStr((tSum + tOff[ti]) * 10);
            if (!tSeen[tc] && tSum + tOff[ti] > 0) { tSeen[tc] = true; tWs.push(tc); }
          }
          while (tWs.length < 3) tWs.push(tiendStr((tSum + tWs.length + 3) * 10));
          return { question: tiendStr(ta * 10) + " + " + tiendStr(tb * 10) + " =", answer: tAns, choices: shuffle([tAns].concat(tWs.slice(0, 3))) };
        }
        var ha = rnd(100, 999); var hb = rnd(100, 999);
        if (ha + hb > 1999) hb = rnd(100, 1999 - ha);
        var hSum = ha + hb; var hAns = honderdStr(hSum);
        var hSeen = {}; hSeen[hAns] = true; var hWs = [];
        var hOff = [1, -1, 10, -10];
        for (var hi = 0; hi < hOff.length && hWs.length < 3; hi++) {
          var hc = honderdStr(hSum + hOff[hi]);
          if (!hSeen[hc] && hSum + hOff[hi] > 0) { hSeen[hc] = true; hWs.push(hc); }
        }
        while (hWs.length < 3) hWs.push(honderdStr(hSum + (hWs.length + 2) * 10));
        return { question: honderdStr(ha) + " + " + honderdStr(hb) + " =", answer: hAns, choices: shuffle([hAns].concat(hWs.slice(0, 3))) };
      }
      if (type === 3) {
        // Geld
        var ga = rnd(1, 9) * 100 + rnd(0, 3) * 25;
        var gb = rnd(0, 8) * 100 + rnd(1, 3) * 25;
        if (ga + gb > 1999) gb = rnd(1, 3) * 25;
        var gSum = ga + gb; var gAns = centStr(gSum);
        var gSeen = {}; gSeen[gAns] = true; var gWs = [];
        var gOff = [25, -25, 50, -50];
        for (var gi = 0; gi < gOff.length && gWs.length < 3; gi++) {
          var gc = centStr(gSum + gOff[gi]);
          if (!gSeen[gc] && gSum + gOff[gi] > 0) { gSeen[gc] = true; gWs.push(gc); }
        }
        while (gWs.length < 3) gWs.push(centStr(gSum + (gWs.length + 2) * 25));
        return { question: centStr(ga) + " + " + centStr(gb) + " =", answer: gAns, choices: shuffle([gAns].concat(gWs.slice(0, 3))) };
      }
      // Tijd
      var xh1 = rnd(0, 3); var xm1 = rnd(1, 11) * 5;
      var xh2 = rnd(0, 3); var xm2 = rnd(1, 11) * 5;
      var xTotal = xh1 * 60 + xm1 + xh2 * 60 + xm2;
      if (xTotal > 480) { xh2 = 0; xm2 = 15; xTotal = xh1 * 60 + xm1 + 15; }
      var xAns = timeStr(xTotal);
      var xSeen = {}; xSeen[xAns] = true; var xWs = [];
      var xOff = [5, -5, 10, -10, 15];
      for (var xi = 0; xi < xOff.length && xWs.length < 3; xi++) {
        var xt = timeStr(xTotal + xOff[xi]);
        if (!xSeen[xt] && xTotal + xOff[xi] > 0) { xSeen[xt] = true; xWs.push(xt); }
      }
      while (xWs.length < 3) xWs.push(timeStr(xTotal + (xWs.length + 2) * 5));
      return { question: timeStr(xh1 * 60 + xm1) + " + " + timeStr(xh2 * 60 + xm2) + " =", answer: xAns, choices: shuffle([xAns].concat(xWs.slice(0, 3))) };
    },
  },

  {
    id: "s100_grand_master",
    label: "Groot Meester",
    group: "Master",
    desc: "De ultieme uitdaging: alle typen, hogere moeilijkheid",
    strategy: "flexibel",
    tip: "Je beheerst alle strategieen. Lees elke vraag aandachtig en reken nauwkeurig.",
    uitleg: "Het Groot Meester-niveau combineert alle domeinen op hoge moeilijkheid. Grote getallen, complexe breuken, geld tot € 20, tijd tot 8 uur — niets is uitgesloten.",
    voorbeeld: "4567 + 3891 = 8458; 3/8 + 5/8 = 1; € 12,75 + € 8,50 = € 21,25; 3u45 + 2u30 = 6u15.",
    minCorrect: 20,
    generate: function() {
      var type = rnd(0, 4);
      if (type === 0) {
        // Grote getallen
        var a = rnd(1000, 9999); var b = rnd(1000, 9999);
        if (a + b > 19999) b = rnd(1000, 19999 - a);
        return makeQ([a, b], a + b);
      }
      if (type === 1) {
        // Breuken — hogere noemers
        var d = rnd(6, 12); var n1 = rnd(1, d - 1); var n2 = rnd(1, d - 1);
        var sumN = n1 + n2; var answer = fracStr(sumN, d);
        var seen = {}; seen[answer] = true; var ws = [];
        var offsets = [1, -1, 2, -2, 3];
        for (var oi = 0; oi < offsets.length && ws.length < 3; oi++) {
          var c = fracStr(sumN + offsets[oi], d);
          if (!seen[c]) { seen[c] = true; ws.push(c); }
        }
        while (ws.length < 3) ws.push(fracStr(sumN + ws.length + 4, d));
        return { question: fracStr(n1, d) + " + " + fracStr(n2, d) + " =", answer: answer, choices: shuffle([answer].concat(ws.slice(0, 3))) };
      }
      if (type === 2) {
        // Decimalen honderdsten — hogere bedragen
        var a2 = rnd(500, 1999); var b2 = rnd(500, 1999);
        if (a2 + b2 > 3999) b2 = rnd(100, 3999 - a2);
        var sum2 = a2 + b2; var ans2 = honderdStr(sum2);
        var seen2 = {}; seen2[ans2] = true; var ws2 = [];
        var off2 = [1, -1, 10, -10, 100];
        for (var oi2 = 0; oi2 < off2.length && ws2.length < 3; oi2++) {
          var c2 = honderdStr(sum2 + off2[oi2]);
          if (!seen2[c2] && sum2 + off2[oi2] > 0) { seen2[c2] = true; ws2.push(c2); }
        }
        while (ws2.length < 3) ws2.push(honderdStr(sum2 + (ws2.length + 2) * 10));
        return { question: honderdStr(a2) + " + " + honderdStr(b2) + " =", answer: ans2, choices: shuffle([ans2].concat(ws2.slice(0, 3))) };
      }
      if (type === 3) {
        // Geld — hogere bedragen
        var ga = rnd(5, 19) * 100 + rnd(0, 3) * 25;
        var gb = rnd(5, 19) * 100 + rnd(0, 3) * 25;
        if (ga + gb > 3999) gb = rnd(1, 4) * 100 + rnd(0, 3) * 25;
        var gSum = ga + gb; var gAns = centStr(gSum);
        var gSeen = {}; gSeen[gAns] = true; var gWs = [];
        var gOff = [25, -25, 50, -50, 100];
        for (var gi = 0; gi < gOff.length && gWs.length < 3; gi++) {
          var gc = centStr(gSum + gOff[gi]);
          if (!gSeen[gc] && gSum + gOff[gi] > 0) { gSeen[gc] = true; gWs.push(gc); }
        }
        while (gWs.length < 3) gWs.push(centStr(gSum + (gWs.length + 2) * 25));
        return { question: centStr(ga) + " + " + centStr(gb) + " =", answer: gAns, choices: shuffle([gAns].concat(gWs.slice(0, 3))) };
      }
      // Tijd — langere duren
      var xh1 = rnd(1, 5); var xm1 = rnd(0, 11) * 5;
      var xh2 = rnd(1, 4); var xm2 = rnd(0, 11) * 5;
      var xTotal = xh1 * 60 + xm1 + xh2 * 60 + xm2;
      if (xTotal > 720) { xh2 = 1; xm2 = 0; xTotal = xh1 * 60 + xm1 + 60; }
      var xAns = timeStr(xTotal);
      var xSeen = {}; xSeen[xAns] = true; var xWs = [];
      var xOff = [5, -5, 10, -10, 15];
      for (var xi = 0; xi < xOff.length && xWs.length < 3; xi++) {
        var xt = timeStr(xTotal + xOff[xi]);
        if (!xSeen[xt] && xTotal + xOff[xi] > 0) { xSeen[xt] = true; xWs.push(xt); }
      }
      while (xWs.length < 3) xWs.push(timeStr(xTotal + (xWs.length + 2) * 5));
      return { question: timeStr(xh1 * 60 + xm1) + " + " + timeStr(xh2 * 60 + xm2) + " =", answer: xAns, choices: shuffle([xAns].concat(xWs.slice(0, 3))) };
    },
  },

];

// ── SKILL SEQUENCE (volgorde van aanleren) ────────────────────────
// Dit bepaalt de volgorde waarin skills worden aangeboden.
// Elke skill moet de vorige "beheersen" (minCorrect bereikt).

export var OPTELLEN_ORDER = [
  // BLOK 1 — Eencijferige optelling (4)
  "s01_single_easy",
  "s02_single_medium",
  "s06_carry_10",
  "s18_near_double",
  // BLOK 2 — Tientallen (2)
  "s04_round_tens",
  "s03_plus_ten",
  // BLOK 3 — Twee-cijferig zonder overdracht + strategieën (5)
  "s05_no_carry_20",
  "s07_no_carry_100",
  "s16_complement_100",
  "s19_compensate",
  "s27_bridge_ten_adv",
  // BLOK 4 — Twee-cijferig mét overdracht (3)
  "s08_carry_100",
  "s17_bridge_hundred",
  "s65_mental_split",
  // BLOK 5 — Meerdere termen (3)
  "s09_three_terms",
  "s12_four_terms",
  "s15_five_terms",
  // BLOK 6 — Drie-cijferig en honderdtallen (4)
  "s10_hundreds",
  "s11_mixed_large",
  "s13_carry_1000",
  "s14_thousands",
  // BLOK 7 — Grote getallen (2)
  "s86_large_numbers",
  "s87_large_context",
  // BLOK 8 — Kolomoptelling (3)
  "s79_column_2x2",
  "s80_column_3x2",
  "s81_column_4x2",
  // BLOK 9 — Afronden en schatten (5)
  "s23_round_10",
  "s24_round_100",
  "s63_round_10",
  "s64_round_100",
  "s25_estimate_sum",
  // BLOK 10 — Missende term en fout-zoekers (5)
  "s31_missing_term",
  "s32_missing_term_2digit",
  "s33_error_spotter_medium",
  "s69_error_int",
  "s74_missing_int",
  // BLOK 11 — Slotblok (1)
  "s95_speed_int",
];
