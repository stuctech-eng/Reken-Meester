// Subject definitions

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

// ── Optellen niveaus ──────────────────────────────────────────
//
// FILOSOFIE: leerapp, niet een spel. Rustige opbouw.
// Elk niveau heeft zijn eigen vraag-generator die past bij het leerdoel.
// Pas bij niveau 7+ komen sommen met 3 getallen.
// Keuzes zijn altijd plausibel (niet random rommel).
//
// Niveau  1 — enkelvoudige cijfers (1-9 + 1-9)
// Niveau  2 — tot 20, geen overstap (bijv. 13+5)
// Niveau  3 — tot 20 MET overstap (bijv. 8+7)
// Niveau  4 — tientallen erbij (20+30, 14+10)
// Niveau  5 — tot 50, gemengd
// Niveau  6 — tot 100, tweedelig (bijv. 34+25)
// Niveau  7 — tot 100 MET overstap (bijv. 47+36)
// Niveau  8 — 3 getallen tot 30 (bijv. 12+8+5)
// Niveau  9 — tot 1000, stapsgewijs
// Niveau 10 — grote getallen, 3-4 termen

export var OPTELLEN_LEVELS = [
  { level: 1,  label: "Niveau 1",  desc: "Enkelvoudige cijfers"         },
  { level: 2,  label: "Niveau 2",  desc: "Getallen tot 20"              },
  { level: 3,  label: "Niveau 3",  desc: "Tot 20 met tiental overstap"  },
  { level: 4,  label: "Niveau 4",  desc: "Met tientallen"               },
  { level: 5,  label: "Niveau 5",  desc: "Gemengd tot 50"               },
  { level: 6,  label: "Niveau 6",  desc: "Twee cijfers tot 100"         },
  { level: 7,  label: "Niveau 7",  desc: "Tot 100 met overstap"         },
  { level: 8,  label: "Niveau 8",  desc: "Drie getallen"                },
  { level: 9,  label: "Niveau 9",  desc: "Tot 1000"                     },
  { level: 10, label: "Niveau 10", desc: "Grote sommen"                 },
];

// Hulpfunctie: willekeurig getal tussen min en max (inclusief)
function rnd(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Hulpfunctie: shuffle array
function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

// Genereer plausibele fout-antwoorden rond het juiste antwoord.
// Ze zitten dicht bij het antwoord zodat het uitdagend blijft.
function wrongChoices(answer, count, minVal) {
  var min = minVal || 1;
  var set = {};
  set[answer] = true;
  var result = [];
  var attempts = 0;
  while (result.length < count && attempts < 200) {
    attempts++;
    // Kies een delta: klein (1-3) of iets groter (4-9), afhankelijk van grootte
    var spread = answer > 50 ? 10 : answer > 20 ? 6 : 4;
    var delta  = rnd(1, spread);
    var sign   = Math.random() > 0.5 ? 1 : -1;
    var w      = answer + sign * delta;
    if (w >= min && !set[w]) {
      set[w] = true;
      result.push(w);
    }
  }
  // fallback als er te weinig unieke keuzes zijn
  var fallback = answer + result.length + 1;
  while (result.length < count) {
    if (!set[fallback]) { result.push(fallback); set[fallback] = true; }
    fallback++;
  }
  return result;
}

// Bouw question-string voor 2 of meer termen
function makeQuestion(terms) {
  return terms.join(" + ") + " =";
}

// Hoofdgenerator
export function generateOptellen(level) {
  var a, b, c, answer, terms, question;

  switch (level) {

    // ── Niveau 1: enkelvoudige cijfers ─────────────────────────
    case 1: {
      // Gevarieerd: soms kleine (1+1), soms groter (8+9)
      // Af en toe een "makkelijke" som (bijv. x+1, x+2) zodat het niet altijd grenswaarden zijn
      var variant = rnd(1, 3);
      if (variant === 1) {
        // Klein: 1-5 + 1-5
        a = rnd(1, 5); b = rnd(1, 5);
      } else if (variant === 2) {
        // Iets groter: 4-9 + 1-6
        a = rnd(4, 9); b = rnd(1, 6);
      } else {
        // + 1 of + 2 erbij voor beginners
        a = rnd(1, 8); b = rnd(1, 2);
      }
      answer = a + b;
      terms  = [a, b];
      break;
    }

    // ── Niveau 2: tot 20, geen tiental-overstap ────────────────
    case 2: {
      // A = 10-17, B zodanig dat A+B <= 20 en geen overstap
      // Of gewoon A <= 10, B <= 10 maar zonder overstap
      var t = rnd(1, 3);
      if (t === 1) {
        // Getallenrij 10-19 + klein getal
        a = rnd(10, 17); b = rnd(1, 20 - a);
      } else if (t === 2) {
        // Twee getallen beide <= 10, som <= 20, geen overstap (zelfde tiental)
        a = rnd(1, 9);
        // b zo dat a+b <= 9 (blijft in eerste tiental) of precies naar 20
        b = rnd(1, 9 - a);
        if (b < 1) b = 1;
      } else {
        // tiental + getal: 10+3, 10+7, 20+0 etc.
        a = 10; b = rnd(1, 9);
      }
      answer = a + b;
      terms  = [a, b];
      break;
    }

    // ── Niveau 3: tot 20 MET tiental-overstap ─────────────────
    case 3: {
      // Overstap = som gaat door tiental heen, bijv. 8+5=13
      // Kies A zodat A % 10 >= 5 en B maakt dat ze door het tiental gaan
      var base = rnd(1, 2) === 1 ? rnd(5, 9) : rnd(15, 19);
      a = base;
      // B moet groot genoeg zijn om over het tiental te gaan
      var rest = 10 - (a % 10);  // hoeveel er nog naar het volgende tiental
      b = rest + rnd(1, 5);      // ga er een paar voorbij
      if (a + b > 20) { a = rnd(5, 9); b = rnd(2, 14 - a + 1); }
      answer = a + b;
      terms  = [a, b];
      break;
    }

    // ── Niveau 4: tientallen ──────────────────────────────────
    case 4: {
      var t4 = rnd(1, 4);
      if (t4 === 1) {
        // Rond tiental + rond tiental
        a = rnd(1, 4) * 10; b = rnd(1, 4) * 10;
      } else if (t4 === 2) {
        // Getal + tiental: 14+10, 23+20
        a = rnd(11, 39); b = rnd(1, 3) * 10;
      } else if (t4 === 3) {
        // Klein getal + groot tiental
        a = rnd(1, 9); b = rnd(2, 4) * 10;
      } else {
        // Twee getallen, geen overstap, A en B zijn makkelijk
        a = rnd(10, 20); b = rnd(10, 20);
      }
      answer = a + b;
      terms  = [a, b];
      break;
    }

    // ── Niveau 5: gemengd tot 50 ──────────────────────────────
    case 5: {
      var t5 = rnd(1, 4);
      if (t5 === 1) {
        a = rnd(10, 30); b = rnd(5, 20);
      } else if (t5 === 2) {
        a = rnd(20, 40); b = rnd(1, 50 - a);
      } else if (t5 === 3) {
        // Met overstap rond tiental
        a = rnd(15, 45); var r5 = 10 - (a % 10); b = r5 + rnd(1, 8);
        if (a + b > 50) { a = rnd(20, 40); b = rnd(5, 10); }
      } else {
        a = rnd(1, 25); b = rnd(1, 25);
      }
      answer = a + b;
      terms  = [a, b];
      break;
    }

    // ── Niveau 6: twee cijfers tot 100, geen/lichte overstap ──
    case 6: {
      var t6 = rnd(1, 3);
      if (t6 === 1) {
        // Tientallen: 34+25
        a = rnd(10, 60); b = rnd(10, 100 - a);
        // vermijd overstap in eenheden
        var aE = a % 10; var bE = b % 10;
        if (aE + bE >= 10) { b = b - bE + rnd(0, 9 - aE); }
      } else if (t6 === 2) {
        // een van beide is een tiental
        a = rnd(1, 8) * 10; b = rnd(10, 90 - a);
      } else {
        a = rnd(20, 70); b = rnd(10, 90 - a);
      }
      if (b < 1) b = 1;
      answer = a + b;
      terms  = [a, b];
      break;
    }

    // ── Niveau 7: tot 100 met overstap ───────────────────────
    case 7: {
      // Zorg voor overstap in eenheden
      var t7 = rnd(1, 3);
      if (t7 === 1) {
        a = rnd(24, 68);
        var ae7 = a % 10;
        var rest7 = 10 - ae7;
        b = rnd(10, 30) + rest7; // garandeert overstap
        if (a + b > 99) { b = 99 - a; if (b < 5) b = 5; }
      } else if (t7 === 2) {
        a = rnd(36, 58); b = rnd(27, 63);
        if (a + b > 99) { b = 99 - a; }
      } else {
        a = rnd(45, 75); b = rnd(18, 54);
        if (a + b > 99) { b = 99 - a; if (b < 5) b = 5; }
      }
      answer = a + b;
      terms  = [a, b];
      break;
    }

    // ── Niveau 8: drie getallen ───────────────────────────────
    case 8: {
      var t8 = rnd(1, 3);
      if (t8 === 1) {
        // Klein: 3 + 4 + 5
        a = rnd(2, 8); b = rnd(2, 8); c = rnd(2, 8);
      } else if (t8 === 2) {
        // Groter: 12 + 8 + 15
        a = rnd(5, 20); b = rnd(5, 20); c = rnd(5, 15);
      } else {
        // Met tientallen: 20 + 13 + 7
        a = rnd(1, 3) * 10; b = rnd(5, 15); c = rnd(5, 10);
      }
      answer = a + b + c;
      terms  = [a, b, c];
      break;
    }

    // ── Niveau 9: tot 1000 ────────────────────────────────────
    case 9: {
      var t9 = rnd(1, 4);
      if (t9 === 1) {
        // Honderdtallen: 200+300
        a = rnd(1, 7) * 100; b = rnd(1, 9 - a / 100) * 100;
      } else if (t9 === 2) {
        // Hondertal + getal: 300+45
        a = rnd(1, 8) * 100; b = rnd(10, 99);
        if (a + b > 999) b = 999 - a;
      } else if (t9 === 3) {
        // Twee driecijferige getallen
        a = rnd(100, 500); b = rnd(50, 999 - a);
      } else {
        // Drie getallen tot 300
        a = rnd(50, 200); b = rnd(50, 200); c = rnd(20, 100);
        if (a + b + c > 999) { c = 999 - a - b; if (c < 1) c = 1; }
        answer = a + b + c;
        terms  = [a, b, c];
        break;
      }
      answer = a + b;
      terms  = [a, b];
      break;
    }

    // ── Niveau 10: grote sommen ───────────────────────────────
    default: {
      var t10 = rnd(1, 4);
      if (t10 === 1) {
        // Twee grote getallen
        a = rnd(100, 900); b = rnd(50, 999 - a);
        answer = a + b; terms = [a, b];
      } else if (t10 === 2) {
        // Drie middelgrote getallen
        a = rnd(100, 400); b = rnd(100, 400); c = rnd(50, 200);
        if (a + b + c > 9999) c = 200;
        answer = a + b + c; terms = [a, b, c];
      } else if (t10 === 3) {
        // Vier kleine getallen
        var d10 = rnd(10, 50);
        a = rnd(10, 50); b = rnd(10, 50); c = rnd(10, 50);
        answer = a + b + c + d10; terms = [a, b, c, d10];
      } else {
        // Honderden + tientallen mix
        a = rnd(200, 700); b = rnd(30, 90); c = rnd(5, 50);
        answer = a + b + c; terms = [a, b, c];
      }
      break;
    }
  }

  question = makeQuestion(terms);

  var wrongs  = wrongChoices(answer, 3, 1);
  var choices = shuffle([answer].concat(wrongs));

  return {
    terms:    terms,
    question: question,
    answer:   answer,
    choices:  choices,
  };
}

// XP drempels per niveau — ruimer zodat je meer oefent per niveau
export var LEVEL_XP = [0, 50, 110, 190, 290, 410, 550, 710, 890, 1090];

// Check of niveaus ontgrendeld moeten worden op basis van XP
export function checkLevelUnlock(subjectData) {
  var xp = subjectData.xp || 0;
  var current = (subjectData.unlockedLevels || [1]).slice();
  for (var lvl = 2; lvl <= 10; lvl++) {
    var threshold = LEVEL_XP[lvl - 1];
    if (current.indexOf(lvl) === -1 && xp >= threshold) {
      current.push(lvl);
    }
  }
  return current;
}
