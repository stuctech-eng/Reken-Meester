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

export function getTitel(totalMastered) {
  var titel = TITEL_MILESTONES[0];
  for (var i = 0; i < TITEL_MILESTONES.length; i++) {
    if (totalMastered >= TITEL_MILESTONES[i].minSkills) {
      titel = TITEL_MILESTONES[i];
    }
  }
  return titel;
}

export function getNextTitel(totalMastered) {
  for (var i = 0; i < TITEL_MILESTONES.length; i++) {
    if (TITEL_MILESTONES[i].minSkills > totalMastered) {
      return TITEL_MILESTONES[i];
    }
  }
  return null;
}
