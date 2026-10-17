// Subject definitions — start with optellen, expand later

export const SUBJECTS = [
  {
    id: "optellen",
    label: "Optellen",
    icon: "+",
    color: "#4f46e5",       // indigo
    lightColor: "#eef2ff",
    description: "Getallen bij elkaar optellen",
    available: true,
    levels: 10,
  },
  {
    id: "aftrekken",
    label: "Aftrekken",
    icon: "-",
    color: "#0891b2",       // cyan
    lightColor: "#ecfeff",
    description: "Getallen van elkaar aftrekken",
    available: false,       // coming soon
    levels: 10,
  },
  {
    id: "vermenigvuldigen",
    label: "Vermenigvuldigen",
    icon: "x",
    color: "#059669",       // emerald
    lightColor: "#ecfdf5",
    description: "Tafels oefenen",
    available: false,
    levels: 10,
  },
  {
    id: "delen",
    label: "Delen",
    icon: "/",
    color: "#d97706",       // amber
    lightColor: "#fffbeb",
    description: "Getallen delen",
    available: false,
    levels: 10,
  },
];

// Get subject by id
export function getSubject(id) {
  return SUBJECTS.find(s => s.id === id) || SUBJECTS[0];
}

// Level config for optellen
export const OPTELLEN_LEVELS = [
  { level: 1, label: "Niveau 1",  desc: "Getallen tot 10",       maxA: 5,   maxB: 5,   carries: false },
  { level: 2, label: "Niveau 2",  desc: "Getallen tot 20",       maxA: 10,  maxB: 10,  carries: false },
  { level: 3, label: "Niveau 3",  desc: "Tot 20, met overstap",  maxA: 15,  maxB: 9,   carries: true  },
  { level: 4, label: "Niveau 4",  desc: "Getallen tot 50",       maxA: 25,  maxB: 25,  carries: false },
  { level: 5, label: "Niveau 5",  desc: "Tot 50, met overstap",  maxA: 40,  maxB: 30,  carries: true  },
  { level: 6, label: "Niveau 6",  desc: "Getallen tot 100",      maxA: 50,  maxB: 50,  carries: false },
  { level: 7, label: "Niveau 7",  desc: "Tot 100, met overstap", maxA: 80,  maxB: 60,  carries: true  },
  { level: 8, label: "Niveau 8",  desc: "Getallen tot 200",      maxA: 100, maxB: 100, carries: true  },
  { level: 9, label: "Niveau 9",  desc: "Tot 1000",              maxA: 500, maxB: 500, carries: true  },
  { level: 10,label: "Niveau 10", desc: "Grote getallen",        maxA: 999, maxB: 999, carries: true  },
];

// Generate a question for optellen at a given level
export function generateOptellen(level) {
  const cfg = OPTELLEN_LEVELS[Math.min(level - 1, OPTELLEN_LEVELS.length - 1)];
  const a = Math.floor(Math.random() * cfg.maxA) + 1;
  const b = Math.floor(Math.random() * cfg.maxB) + 1;
  const answer = a + b;

  // Generate 3 wrong choices
  const wrongs = new Set();
  while (wrongs.size < 3) {
    const delta = Math.floor(Math.random() * 5) + 1;
    const wrong = Math.random() > 0.5 ? answer + delta : answer - delta;
    if (wrong !== answer && wrong > 0) wrongs.add(wrong);
  }

  const choices = shuffle([answer, ...wrongs]);

  return {
    a, b,
    question: a + " + " + b + " =",
    answer,
    choices,
  };
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// XP thresholds per level (unlock next level when reached)
export const LEVEL_XP = [0, 30, 70, 120, 180, 250, 330, 420, 520, 630];

// Check if level should be unlocked
export function checkLevelUnlock(subjectData) {
  const xp = subjectData.xp || 0;
  const newUnlocked = [...(subjectData.unlockedLevels || [1])];
  for (let lvl = 2; lvl <= 10; lvl++) {
    if (!newUnlocked.includes(lvl) && xp >= LEVEL_XP[lvl - 1]) {
      newUnlocked.push(lvl);
    }
  }
  return newUnlocked;
}
