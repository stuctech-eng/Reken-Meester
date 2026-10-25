// Onderdelen + adaptieve skill engine (onderdeel-onafhankelijk)
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.

import { OPTELLEN_SKILLS, OPTELLEN_ORDER } from "./skills/optellen.js";
import { AFTREK_SKILLS, AFTREK_ORDER } from "./skills/aftrekken.js";
import { MAAL_SKILLS, MAAL_ORDER } from "./skills/vermenigvuldigen.js";
import { DEEL_SKILLS, DEEL_ORDER } from "./skills/delen.js";
import { BREUK_SKILLS, BREUK_ORDER } from "./skills/breuken.js";
import { GELD_SKILLS, GELD_ORDER } from "./skills/geld.js";
import { KOMMA_SKILLS, KOMMA_ORDER } from "./skills/kommagetallen.js";
import { METEN_SKILLS, METEN_ORDER } from "./skills/meten.js";

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
    group: "rekenen",
  },
  {
    id: "aftrekken",
    label: "Aftrekken",
    icon: "−",
    color: "#0891b2",
    lightColor: "#ecfeff",
    description: "Getallen van elkaar aftrekken",
    available: true,
    levels: 10,
    group: "rekenen",
  },
  {
    id: "vermenigvuldigen",
    label: "Vermenigvuldigen",
    icon: "×",
    color: "#059669",
    lightColor: "#ecfdf5",
    description: "Tafels en vermenigvuldigen",
    available: true,
    levels: 10,
    group: "rekenen",
  },
  {
    id: "delen",
    label: "Delen",
    icon: "÷",
    color: "#d97706",
    lightColor: "#fffbeb",
    description: "Delen en verdelen",
    available: true,
    levels: 10,
    group: "rekenen",
  },
  {
    id: "breuken",
    label: "Breuken",
    icon: "½",
    color: "#c026d3",
    lightColor: "#fdf4ff",
    description: "Breuken begrijpen en rekenen",
    available: true,
    levels: 10,
    group: "rekenen",
  },
  {
    id: "geld",
    label: "Geld",
    icon: "€",
    color: "#e11d48",
    lightColor: "#fff1f2",
    description: "Rekenen met euro's en centen",
    available: true,
    levels: 10,
    group: "rekenen",
  },
  {
    id: "kommagetallen",
    label: "Kommagetallen",
    icon: "0,1",
    color: "#7c3aed",
    lightColor: "#f5f3ff",
    description: "Tienden en honderdsten",
    available: true,
    levels: 10,
    group: "rekenen",
  },
];

export function getSubject(id) {
  return SUBJECTS.find(function(s) { return s.id === id; }) || SUBJECTS[0];
}

// ─────────────────────────────────────────────────────────────────
// SKILL-REGISTER PER ONDERDEEL
//
// Elk onderdeel levert zijn eigen skills en volgorde aan.
// Nieuw onderdeel = eigen bestand in ./skills/ + één regel hier.
// Onbekend onderdeel valt terug op optellen (zelfde gedrag als getSubject).
// ─────────────────────────────────────────────────────────────────

export var SUBJECT_SKILLS = {
  optellen: { skills: OPTELLEN_SKILLS, order: OPTELLEN_ORDER },
  aftrekken: { skills: AFTREK_SKILLS, order: AFTREK_ORDER },
  vermenigvuldigen: { skills: MAAL_SKILLS, order: MAAL_ORDER },
  delen: { skills: DEEL_SKILLS, order: DEEL_ORDER },
  breuken: { skills: BREUK_SKILLS, order: BREUK_ORDER },
  geld: { skills: GELD_SKILLS, order: GELD_ORDER },
  kommagetallen: { skills: KOMMA_SKILLS, order: KOMMA_ORDER },
  // Meten: geregistreerd maar nog niet in SUBJECTS (onzichtbaar tot fase B3).
  // B3: groep "praktisch", icoon "m", teal #0d9488 / #f0fdfa, niet in Auto.
  meten: { skills: METEN_SKILLS, order: METEN_ORDER },
};

function getSubjectSkills(subjectId) {
  if (Object.prototype.hasOwnProperty.call(SUBJECT_SKILLS, subjectId)) {
    return SUBJECT_SKILLS[subjectId];
  }
  return SUBJECT_SKILLS.optellen;
}

export function getSkillList(subjectId) {
  return getSubjectSkills(subjectId).skills;
}

export function getSkillOrder(subjectId) {
  return getSubjectSkills(subjectId).order;
}

export function getSkill(subjectId, id) {
  var skills = getSkillList(subjectId);
  return skills.find(function(s) { return s.id === id; }) || skills[0];
}

export function getSkillByIndex(subjectId, idx) {
  var id = getSkillOrder(subjectId)[idx];
  return id ? getSkill(subjectId, id) : null;
}

// ── ADAPTIVE: welke skill als volgende? ──────────────────────────
// skillStats: { [skillId]: { correct: n, attempts: n, mastered: bool } }
// Geeft terug: { skillId, reason }

export function getNextSkill(subjectId, skillStats) {
  skillStats = skillStats || {};
  var order = getSkillOrder(subjectId);

  // Zoek de eerste skill in de volgorde die nog niet beheerst is
  for (var i = 0; i < order.length; i++) {
    var id    = order[i];
    var skill = getSkill(subjectId, id);
    var stats = skillStats[id] || { correct: 0, attempts: 0, mastered: false };

    if (stats.mastered) continue;

    // Als vorige skill ook niet beheerst: herhaal die eerst
    if (i > 0) {
      var prevId    = order[i - 1];
      var prevStats = skillStats[prevId] || { correct: 0, attempts: 0, mastered: false };
      if (!prevStats.mastered) {
        return { skillId: prevId, reason: "herhaling" };
      }
    }

    return { skillId: id, reason: stats.attempts === 0 ? "nieuw" : "oefenen" };
  }

  // Alles beheerst: gecontroleerd stoppen
  return { skillId: null, reason: "voltooid" };
}

// ── PROGRESS CHECK ────────────────────────────────────────────────
// Controleer of een skill beheerst is na een sessie-update.
// Geeft de bijgewerkte skillStats terug.

// Masteryregel: minCorrect correct (opgeslagen + sessie) EN minstens 4 vragen in de sessie
// EN minstens 70% accuracy in de sessie (zelfde regel als de promotie in PracticeScreen)
function meetsMastery(skill, storedCorrect, sessionCorrect, sessionTotal) {
  var sessionAcc = sessionTotal > 0 ? (sessionCorrect / sessionTotal) : 0;
  return (storedCorrect + sessionCorrect) >= (skill.minCorrect || 8) && sessionTotal >= 4 && sessionAcc >= 0.70;
}

// promotionSnap (optioneel): { correct, total } van deze skill in de sessie op het moment
// van de live-promotie. De engine toetst die momentopname aan dezelfde masteryregel,
// zodat latere fouten in dezelfde sessie een geldige promotie niet ongedaan maken.
export function updateSkillStats(subjectId, skillStats, skillId, sessionCorrect, sessionTotal, promotionSnap) {
  skillStats = skillStats || {};
  var existing = skillStats[skillId] || { correct: 0, attempts: 0, mastered: false };
  var skill    = getSkill(subjectId, skillId);

  var newCorrect  = existing.correct  + sessionCorrect;
  var newAttempts = existing.attempts + sessionTotal;

  var mastered = existing.mastered
    || meetsMastery(skill, existing.correct, sessionCorrect, sessionTotal)
    || (promotionSnap ? meetsMastery(skill, existing.correct, promotionSnap.correct, promotionSnap.total) : false);

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

export function generateAdaptive(subjectId, skillStats) {
  var next  = getNextSkill(subjectId, skillStats);
  var skill = getSkill(subjectId, next.skillId);
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
  var skill = getSkill("optellen", skillMap[idx]);
  var q     = skill.generate();
  q.skillId = skill.id;
  q.skill   = skill;
  return q;
}