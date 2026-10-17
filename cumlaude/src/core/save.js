// Default save structure for the new app
export const DEFAULT_SAVE = {
  // Identity
  username: null,
  displayName: null,

  // Progress per subject
  subjects: {
    optellen: {
      unlockedLevels: [1],      // which levels user can access
      currentLevel: 1,
      bestLevel: 1,
      totalCorrect: 0,
      totalQuestions: 0,
      xp: 0,
      sessions: [],             // last 10 session results
    }
    // aftrekken, vermenigvuldigen, etc. will be added later
  },

  // Overall stats
  totalXp: 0,
  totalSessions: 0,
  streak: 0,               // days in a row
  lastSessionDate: null,
  bestStreak: 0,

  // Settings
  sound: true,
};

export function dClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function dMerge(base, patch) {
  const result = { ...base };
  for (const key of Object.keys(patch)) {
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

// Get accuracy percentage for a subject
export function getAccuracy(subjectData) {
  if (!subjectData || subjectData.totalQuestions === 0) return 0;
  return Math.round((subjectData.totalCorrect / subjectData.totalQuestions) * 100);
}

// Calculate XP for correct answer based on level and speed
export function calcXp(level, isCorrect, timeMs) {
  if (!isCorrect) return 0;
  const base = level * 5;
  const speedBonus = timeMs < 3000 ? 3 : timeMs < 6000 ? 2 : 1;
  return base + speedBonus;
}
