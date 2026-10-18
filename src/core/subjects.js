// Subject definitions + Optellen 2.0 adaptive skill engine
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.

export var SUBJECTS = [
  {
    id: "optellen",
    label: "Optellen",
    icon: "+",
    color: "#4f46e5",
    lightColor: "#eef2ff",
    description: "Getallen bij elkaar optellen",
    available: true,
    levels: 10,
  },
  {
    id: "aftrekken",
    label: "Aftrekken",
    icon: "−",
    color: "#0891b2",
    lightColor: "#ecfeff",
    description: "Getallen van elkaar aftrekken",
    available: false,
    levels: 10,
  },
  {
    id: "vermenigvuldigen",
    label: "Vermenigvuldigen",
    icon: "×",
    color: "#059669",
    lightColor: "#ecfdf5",
    description: "Tafels oefenen",
    available: false,
    levels: 10,
  },
  {
    id: "delen",
    label: "Delen",
    icon: "÷",
    color: "#d97706",
    lightColor: "#fffbeb",
    description: "Getallen delen",
    available: false,
    levels: 10,
  },
];

export function getSubject(id) {
  return SUBJECTS.find(function(s) { return s.id === id; }) || SUBJECTS[0];
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

function rnd(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

function wrongChoices(answer, count, minVal) {
  var min = minVal !== undefined ? minVal : 1;
  var set = {};
  set[answer] = true;
  var result = [];
  var attempts = 0;
  while (result.length < count && attempts < 300) {
    attempts++;
    var spread = answer > 100 ? 15 : answer > 50 ? 8 : answer > 20 ? 5 : 3;
    var delta  = rnd(1, spread);
    var sign   = Math.random() > 0.5 ? 1 : -1;
    var w      = answer + sign * delta;
    if (w >= min && !set[w]) {
      set[w] = true;
      result.push(w);
    }
  }
  var fallback = answer + result.length + 1;
  while (result.length < count) {
    if (!set[fallback]) { result.push(fallback); set[fallback] = true; }
    fallback++;
  }
  return result;
}

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
    tip: "Tel op je vingers of in je hoofd: 3 + 4 → 3, dan 4 verder tellen.",
    uitleg: "Begin met sommen waarbij beide getallen klein zijn (1 t/m 5). Je kan ze gewoon natellen. Probeer ze uiteindelijk uit je hoofd te leren — dat gaat later sneller!",
    voorbeeld: "2 + 3 = ?\nTel verder: 2 → 3, 4, 5. Antwoord: 5.",
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
    tip: "Maak van één getal een rond getal: 7 + 6 → 7 + 3 + 3 = 13.",
    uitleg: "Bij grotere cijfersommen loont het om te splitsen. Maak 8 + 6: splits de 6 in 2 + 4. Dan 8 + 2 = 10, en 10 + 4 = 14. Dit heet ‘aanvullen tot tien’.",
    voorbeeld: "8 + 7 = ?\nSplits 7 in 2 + 5. Dan: 8 + 2 = 10, en 10 + 5 = 15.",
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
    uitleg: "Tientallen optellen is makkelijk: alleen het getal vóór de nul verandert. 47 + 30: de 4 wordt een 7, de eenheden blijven 7. Dus: 77.",
    voorbeeld: "56 + 30 = ?\nTientallen: 5 + 3 = 8. Eenheden blijven 6. Antwoord: 86.",
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
    uitleg: "Bij ronde tientallen doe je eigenlijk de enkelvoudige som en zet je een nul achter het antwoord. 30 + 40: 3 + 4 = 7, dus 70.",
    voorbeeld: "60 + 20 = ?\n6 + 2 = 8, dus het antwoord is 80.",
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
    uitleg: "Als de eenheden samen minder dan 10 zijn, tel je de tientallen en eenheden apart op. 13 + 5: tientallen 1, eenheden 3 + 5 = 8, antwoord 18.",
    voorbeeld: "14 + 3 = ?\nEenheden: 4 + 3 = 7. Tientallen: 1. Antwoord: 17.",
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
    tip: "Vul eerst aan tot 10, tel dan de rest op: 8 + 5 → 8 + 2 + 3 = 13.",
    uitleg: "Dit is een cruciale vaardigheid! Splits het tweede getal zodat je eerst naar 10 springt. Dan tel je de rest erbij. 7 + 8: splits 8 in 3 + 5. Dan 7 + 3 = 10, en 10 + 5 = 15.",
    voorbeeld: "9 + 6 = ?\nSplits 6 in 1 + 5. Dan: 9 + 1 = 10, en 10 + 5 = 15.",
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
    tip: "Tel tientallen en eenheden apart op: 34 + 25 → 30+20=50, 4+5=9, samen 59.",
    uitleg: "Splits beide getallen in tientallen en eenheden. Reken die apart op, zet ze dan samen. 46 + 32: 40+30=70, 6+2=8, antwoord: 78. Let op: dit werkt alleen zonder overstap!",
    voorbeeld: "52 + 35 = ?\n50+30=80, 2+5=7. Antwoord: 87.",
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
    tip: "Rond af en compenseer: 47 + 36 → 47 + 40 − 4 = 83. Of: splits in tientallen + eenheden.",
    uitleg: "Er zijn twee manieren: (1) Compenseren: maak van 36 een 40, tel op, trek 4 af. 47+40=87, 87-4=83. (2) Splitsen: 47+36 = 47+30+6 = 77+6 = 83.",
    voorbeeld: "55 + 28 = ?\nManier 1: 55 + 30 − 2 = 83.\nManier 2: 55 + 20 + 8 = 75 + 8 = 83.",
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
    uitleg: "Je mag de volgorde veranderen! Zoek paren die samen 10 of 20 maken. 4+6+9: 4+6=10, 10+9=19. Dit heet hergroeperen en maakt rekenen veel sneller.",
    voorbeeld: "8 + 5 + 2 = ?\nHergroepeer: 8 + 2 = 10, dan 10 + 5 = 15.",
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
    uitleg: "Net als bij tientallen: kijk alleen naar het getal voor de honderd. 300 + 400: 3 + 4 = 7, dus 700. Met een getal erbij: 300 + 45 = 345.",
    voorbeeld: "400 + 300 = ?\n4 + 3 = 7, dus 700.",
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
    tip: "Splits in stappen: 267 + 31 → 267 + 30 = 297, en 297 + 1 = 298.",
    uitleg: "Reken grote sommen stap voor stap. Eerst de tientallen erbij, dan de eenheden. 156 + 43: 156 + 40 = 196, 196 + 3 = 199. Geen paniek bij grote getallen!",
    voorbeeld: "245 + 53 = ?\n245 + 50 = 295, 295 + 3 = 298.",
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
    uitleg: "Met vier termen zoek je slimme combinaties. 3+7+4+6: 3+7=10 en 4+6=10, dus 10+10=20. Groepeer slim!",
    voorbeeld: "5 + 8 + 5 + 2 = ?\n5+5=10 en 8+2=10. Dan 10+10=20.",
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
];

// ── SKILL SEQUENCE (volgorde van aanleren) ────────────────────────
// Dit bepaalt de volgorde waarin skills worden aangeboden.
// Elke skill moet de vorige "beheersen" (minCorrect bereikt).

export var SKILL_ORDER = [
  "s01_single_easy",
  "s02_single_medium",
  "s03_plus_ten",
  "s04_round_tens",
  "s05_no_carry_20",
  "s06_carry_10",
  "s07_no_carry_100",
  "s08_carry_100",
  "s09_three_terms",
  "s10_hundreds",
  "s11_mixed_large",
  "s12_four_terms",
];

export function getSkill(id) {
  return OPTELLEN_SKILLS.find(function(s) { return s.id === id; }) || OPTELLEN_SKILLS[0];
}

export function getSkillByIndex(idx) {
  var id = SKILL_ORDER[idx];
  return id ? getSkill(id) : null;
}

// ── ADAPTIVE: welke skill als volgende? ──────────────────────────
// skillStats: { [skillId]: { correct: n, attempts: n, mastered: bool } }
// Geeft terug: { skillId, reason }

export function getNextSkill(skillStats) {
  skillStats = skillStats || {};

  // Zoek de eerste skill in de volgorde die nog niet beheerst is
  for (var i = 0; i < SKILL_ORDER.length; i++) {
    var id    = SKILL_ORDER[i];
    var skill = getSkill(id);
    var stats = skillStats[id] || { correct: 0, attempts: 0, mastered: false };

    if (stats.mastered) continue;

    // Als vorige skill ook niet beheerst: herhaal die eerst
    if (i > 0) {
      var prevId    = SKILL_ORDER[i - 1];
      var prevStats = skillStats[prevId] || { correct: 0, attempts: 0, mastered: false };
      if (!prevStats.mastered) {
        return { skillId: prevId, reason: "herhaling" };
      }
    }

    return { skillId: id, reason: stats.attempts === 0 ? "nieuw" : "oefenen" };
  }

  // Alles beheerst: mix van de laatste 3 skills
  var lastIdx = SKILL_ORDER.length - 1;
  var pick    = SKILL_ORDER[Math.max(0, lastIdx - rnd(0, 2))];
  return { skillId: pick, reason: "verdiepen" };
}

// ── PROGRESS CHECK ────────────────────────────────────────────────
// Controleer of een skill beheerst is na een sessie-update.
// Geeft de bijgewerkte skillStats terug.

export function updateSkillStats(skillStats, skillId, sessionCorrect, sessionTotal) {
  skillStats = skillStats || {};
  var existing = skillStats[skillId] || { correct: 0, attempts: 0, mastered: false };
  var skill    = getSkill(skillId);

  var newCorrect  = existing.correct  + sessionCorrect;
  var newAttempts = existing.attempts + sessionTotal;

  // Beheerst als: minCorrect correct (cumulatief) EN minstens 70% accuracy in deze sessie
  var sessionAcc = sessionTotal > 0 ? (sessionCorrect / sessionTotal) : 0;
  var mastered   = existing.mastered
    || (newCorrect >= (skill.minCorrect || 8) && sessionAcc >= 0.70);

  var updated = {};
  for (var k in skillStats) { updated[k] = skillStats[k]; }
  updated[skillId] = {
    correct:  newCorrect,
    attempts: newAttempts,
    mastered: mastered,
  };
  return updated;
}

// ── LEGACY: niveau-gebaseerde structuur (voor SubjectScreen backward compat) ──
// We houden OPTELLEN_LEVELS als display-hulp maar de echte logica loopt via skills.

export var OPTELLEN_LEVELS = [
  { level: 1,  label: "Kleine sommen",         desc: "Optellen tot 10"                  },
  { level: 2,  label: "Sommen tot 18",          desc: "Enkelvoudige cijfers"             },
  { level: 3,  label: "Tientallen",             desc: "Plus 10, 20, 30…"            },
  { level: 4,  label: "Tot 20",                 desc: "Zonder en met tiental-overstap"   },
  { level: 5,  label: "Twee cijfers",           desc: "Tot 100, zonder overstap"         },
  { level: 6,  label: "Met overstap",           desc: "Tot 100, met overstap"            },
  { level: 7,  label: "Drie getallen",          desc: "Hergroeperen en slim rekenen"     },
  { level: 8,  label: "Grote getallen",         desc: "Honderdtallen en gemengd"         },
  { level: 9,  label: "Vier termen",            desc: "Tien-paren zoeken"               },
  { level: 10, label: "Alles gecombineerd",     desc: "Mix van alle vaardigheden"        },
];

export var LEVEL_XP = [0, 50, 110, 190, 290, 410, 550, 710, 890, 1090];

export function checkLevelUnlock(subjectData) {
  var xp      = subjectData.xp || 0;
  var current = (subjectData.unlockedLevels || [1]).slice();
  for (var lvl = 2; lvl <= 10; lvl++) {
    var threshold = LEVEL_XP[lvl - 1];
    if (current.indexOf(lvl) === -1 && xp >= threshold) {
      current.push(lvl);
    }
  }
  return current;
}

// ── GENERATE QUESTION (for backward compat + direct use) ─────────
// Kiest een skill op basis van de adaptive engine en genereert een vraag.
// Geeft terug: { ...question, skillId, skill }

export function generateAdaptive(skillStats) {
  var next  = getNextSkill(skillStats);
  var skill = getSkill(next.skillId);
  var q     = skill.generate();
  q.skillId = next.skillId;
  q.skill   = skill;
  q.reason  = next.reason;
  return q;
}

// Legacy wrapper — gebruikt adaptive engine
export function generateOptellen(level) {
  // Map legacy level 1-10 naar een skill
  var skillMap = [
    "s01_single_easy",   // 1
    "s02_single_medium", // 2
    "s03_plus_ten",      // 3
    "s04_round_tens",    // 4
    "s05_no_carry_20",   // 5
    "s06_carry_10",      // 6
    "s07_no_carry_100",  // 7
    "s08_carry_100",     // 8
    "s09_three_terms",   // 9
    "s10_hundreds",      // 10
  ];
  var idx   = Math.max(0, Math.min(level - 1, skillMap.length - 1));
  var skill = getSkill(skillMap[idx]);
  var q     = skill.generate();
  q.skillId = skill.id;
  q.skill   = skill;
  return q;
}
