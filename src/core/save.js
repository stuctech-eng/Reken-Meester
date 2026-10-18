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
