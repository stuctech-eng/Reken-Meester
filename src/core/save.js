// Data model voor Reken Meester
// NO BACKTICKS / TEMPLATE LITERALS anywhere.

export var DEFAULT_SAVE = {
  // Identity
  username: null,
  displayName: null,

  // Progress per subject
  subjects: {
    optellen: {
      // Legacy level fields (backward compat)
      unlockedLevels: [1],
      currentLevel: 1,
      bestLevel: 1,
      totalCorrect: 0,
      totalQuestions: 0,
      xp: 0,
      sessions: [],

      // Optellen 2.0: skill-based adaptive engine
      // skillStats: { [skillId]: { correct, attempts, mastered } }
      skillStats: {},
      // currentSkillId: welke skill nu actief
      currentSkillId: "s01_single_easy",
      // totalSkillsMastered: teller
      totalSkillsMastered: 0,
      // bonusStats: statistieken voor bonus-modus (na alle 100 skills beheerst)
      bonusStats: {},
    },

    // Aftrekken: zelfde structuur als optellen, eigen voortgang
    aftrekken: {
      unlockedLevels: [1],
      currentLevel: 1,
      bestLevel: 1,
      totalCorrect: 0,
      totalQuestions: 0,
      xp: 0,
      sessions: [],
      skillStats: {},
      currentSkillId: "a01_tot_10",
      totalSkillsMastered: 0,
      bonusStats: {},
    },

    // Vermenigvuldigen: zelfde structuur, eigen voortgang
    vermenigvuldigen: {
      unlockedLevels: [1],
      currentLevel: 1,
      bestLevel: 1,
      totalCorrect: 0,
      totalQuestions: 0,
      xp: 0,
      sessions: [],
      skillStats: {},
      currentSkillId: "v01_groepjes",
      totalSkillsMastered: 0,
      bonusStats: {},
    },

    // Delen: zelfde structuur, eigen voortgang
    delen: {
      unlockedLevels: [1],
      currentLevel: 1,
      bestLevel: 1,
      totalCorrect: 0,
      totalQuestions: 0,
      xp: 0,
      sessions: [],
      skillStats: {},
      currentSkillId: "d01_eerlijk_verdelen",
      totalSkillsMastered: 0,
      bonusStats: {},
    },

    // Breuken: zelfde structuur, eigen voortgang
    breuken: {
      unlockedLevels: [1],
      currentLevel: 1,
      bestLevel: 1,
      totalCorrect: 0,
      totalQuestions: 0,
      xp: 0,
      sessions: [],
      skillStats: {},
      currentSkillId: "b01_strook",
      totalSkillsMastered: 0,
      bonusStats: {},
    },

    // Geld: zelfde structuur, eigen voortgang (modus nog onzichtbaar tot fase B3)
    geld: {
      unlockedLevels: [1],
      currentLevel: 1,
      bestLevel: 1,
      totalCorrect: 0,
      totalQuestions: 0,
      xp: 0,
      sessions: [],
      skillStats: {},
      currentSkillId: "g01_munt_waarde",
      totalSkillsMastered: 0,
      bonusStats: {},
    },

    // Kommagetallen: zelfde structuur, eigen voortgang (modus nog onzichtbaar tot fase B3)
    kommagetallen: {
      unlockedLevels: [1],
      currentLevel: 1,
      bestLevel: 1,
      totalCorrect: 0,
      totalQuestions: 0,
      xp: 0,
      sessions: [],
      skillStats: {},
      currentSkillId: "k01_tienden_strook",
      totalSkillsMastered: 0,
      bonusStats: {},
    },

    // Meten (Praktisch rekenen): zelfde structuur, eigen voortgang (modus nog onzichtbaar tot fase B3)
    meten: {
      unlockedLevels: [1],
      currentLevel: 1,
      bestLevel: 1,
      totalCorrect: 0,
      totalQuestions: 0,
      xp: 0,
      sessions: [],
      skillStats: {},
      currentSkillId: "m01_eenheid_kiezen",
      totalSkillsMastered: 0,
      bonusStats: {},
    },

    // Tijd en kalender (Praktisch rekenen): zelfde structuur, eigen voortgang (modus nog onzichtbaar tot fase B3)
    tijd: {
      unlockedLevels: [1],
      currentLevel: 1,
      bestLevel: 1,
      totalCorrect: 0,
      totalQuestions: 0,
      xp: 0,
      sessions: [],
      skillStats: {},
      currentSkillId: "t01_half_heel",
      totalSkillsMastered: 0,
      bonusStats: {},
    },

    // Procenten en verhoudingen (Praktisch rekenen): zelfde structuur, eigen voortgang (modus nog onzichtbaar tot fase B3)
    procenten: {
      unlockedLevels: [1],
      currentLevel: 1,
      bestLevel: 1,
      totalCorrect: 0,
      totalQuestions: 0,
      xp: 0,
      sessions: [],
      skillStats: {},
      currentSkillId: "p01_van_de_100",
      totalSkillsMastered: 0,
      bonusStats: {},
    },

    // Reizen (Praktisch rekenen): zelfde structuur, eigen voortgang (modus nog onzichtbaar tot fase B3)
    reizen: {
      unlockedLevels: [1],
      currentLevel: 1,
      bestLevel: 1,
      totalCorrect: 0,
      totalQuestions: 0,
      xp: 0,
      sessions: [],
      skillStats: {},
      currentSkillId: "r01_route_optellen",
      totalSkillsMastered: 0,
      bonusStats: {},
    },

    // Wiskunde, domein Getallen en rekenregels (volwassenen): eigen voortgang
    wiskunde_getallen: {
      unlockedLevels: [1],
      currentLevel: 1,
      bestLevel: 1,
      totalCorrect: 0,
      totalQuestions: 0,
      xp: 0,
      sessions: [],
      skillStats: {},
      currentSkillId: "wg01_vergelijken",
      totalSkillsMastered: 0,
      bonusStats: {},
    }
  },

  // Overall stats
  totalXp: 0,
  totalSessions: 0,
  streak: 0,
  lastSessionDate: null,
  bestStreak: 0,

  // Settings
  sound: true,
};

export function dClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function dMerge(base, patch) {
  var result = {};
  var key;
  for (key in base) { result[key] = base[key]; }
  for (key in patch) {
    if (
      patch[key] !== null &&
      typeof patch[key] === "object" &&
      !Array.isArray(patch[key]) &&
      typeof base[key] === "object" &&
      base[key] !== null &&
      !Array.isArray(base[key])
    ) {
      result[key] = dMerge(base[key], patch[key]);
    } else if (patch[key] !== undefined) {
      result[key] = patch[key];
    }
  }
  return result;
}

export function getAccuracy(subjectData) {
  if (!subjectData || subjectData.totalQuestions === 0) return 0;
  return Math.round((subjectData.totalCorrect / subjectData.totalQuestions) * 100);
}

export function calcXp(level, isCorrect, timeMs) {
  if (!isCorrect) return 0;
  var base       = level * 5;
  var speedBonus = timeMs < 3000 ? 3 : timeMs < 6000 ? 2 : 1;
  return base + speedBonus;
}

// XP op basis van skill index (0-11) — hogere skills = meer XP
export function calcSkillXp(skillIndex, isCorrect, timeMs) {
  if (!isCorrect) return 0;
  var base       = (skillIndex + 1) * 4 + 4;  // 8 tot 52
  var speedBonus = timeMs < 4000 ? 3 : timeMs < 8000 ? 2 : 1;
  return base + speedBonus;
}

// Titel-progressie op basis van beheerste skills (8 mijlpalen voor 100 skills)
export var TITEL_MILESTONES = [
  { minSkills: 0,  label: "Leerling"      },
  { minSkills: 5,  label: "Rekenaar"      },
  { minSkills: 12, label: "Gevorderde"    },
  { minSkills: 20, label: "Expert"        },
  { minSkills: 28, label: "Professor"     },
  { minSkills: 33, label: "Meester"       },
  { minSkills: 36, label: "Reken-Meester" },
  { minSkills: 37, label: "Groot Meester" },
];

// total (optioneel): aantal vaardigheden van de modus. Zonder total (of bij 37) precies de
// grenzen hierboven; bij een ander aantal dezelfde titels naar verhouding (laatste = alles).
function milestonesFor(total) {
  if (!total || total === 37) return TITEL_MILESTONES;
  return TITEL_MILESTONES.map(function(m) {
    return { minSkills: m.minSkills === 37 ? total : Math.min(total, Math.round(m.minSkills * total / 37)), label: m.label };
  });
}

export function getTitel(totalMastered, total) {
  var ms    = milestonesFor(total);
  var titel = ms[0];
  for (var i = 0; i < ms.length; i++) {
    if (totalMastered >= ms[i].minSkills) {
      titel = ms[i];
    }
  }
  return titel;
}

export function getNextTitel(totalMastered, total) {
  var ms = milestonesFor(total);
  for (var i = 0; i < ms.length; i++) {
    if (ms[i].minSkills > totalMastered) {
      return ms[i];
    }
  }
  return null;
}
