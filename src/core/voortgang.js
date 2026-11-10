// Voortgang als reeks bewerkingen (plan IN, fase IN-1, §3g).
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Zuivere functies: ze veranderen hun invoer niet en doen geen opslag. Dezelfde rekenregels als de oude
// handleFinish en upSave in App.jsx (letterlijk overgenomen), zodat een sessie op elk toestel en bij elke
// herbouw precies hetzelfde oplevert.
//
// Een bewerking: { schrijver, nr, soort, ... }
//   soort "sessie": result (zoals PracticeScreen hem geeft), datum en gisteren (JJJJ-MM-DD, bij het maken)
//   soort "patch":  patch (samengevoegd met dMerge, zoals upSave deed)
//   soort "wissen": alles terug naar DEFAULT_SAVE, behalve rev en toegepastTot
// stand.toegepastTot: per schrijver het hoogste nummer dat in de stand zit (nooit vergeten, ook niet bij wissen).

import { DEFAULT_SAVE, dClone, dMerge } from "./save.js";
import { checkLevelUnlock, updateSkillStats, getNextSkill, getSkillOrder } from "./subjects.js";

// Sessie-uitkomsten verwerken in skillStats (ook gebruikt voor de voorlopige stand van de Auto-knoptekst)
export function mergeSessionSkills(subjectId, stats, result) {
  var out = stats;
  var sessionSkills = result.sessionSkillStats || {};
  for (var skillId in sessionSkills) {
    var ss = sessionSkills[skillId];
    out = updateSkillStats(subjectId, out, skillId, ss.correct, ss.total, (result.promotionSnapshots || {})[skillId]);
  }
  return out;
}

function pasSessieToe(stand, result, datum, gisteren) {
  var next = dClone(stand);
  var subj = next.subjects[result.subjectId] || dClone(DEFAULT_SAVE.subjects[result.subjectId] || DEFAULT_SAVE.subjects.optellen);

  subj.totalCorrect   += result.totalCorrect;
  subj.totalQuestions += result.totalQuestions;
  subj.xp              = (subj.xp || 0) + result.totalXp;

  // Laatst geoefende modus (voor de bovenste kaart op Home)
  next.lastSubjectId = result.subjectId;

  var currentSkillStats = mergeSessionSkills(result.subjectId, subj.skillStats || {}, result);
  subj.skillStats = currentSkillStats;

  // Volgende skill (alleen informatie; getNextSkill rekent de actieve skill altijd opnieuw uit)
  var nextSkillInfo   = getNextSkill(result.subjectId, currentSkillStats);
  subj.currentSkillId = nextSkillInfo.skillId;

  // Totaal beheerste skills: alleen skills in de actieve skillvolgorde tellen
  var skillOrder    = getSkillOrder(result.subjectId);
  var masteredCount = 0;
  for (var sid in currentSkillStats) {
    if (currentSkillStats[sid].mastered && skillOrder.indexOf(sid) !== -1) masteredCount++;
  }
  subj.totalSkillsMastered = masteredCount;

  // Legacy level unlock (XP-gebaseerd)
  var acc = Math.round((subj.totalCorrect / subj.totalQuestions) * 100);
  if (acc >= 80 && result.level === subj.currentLevel) {
    var nextLvl = subj.currentLevel + 1;
    if (nextLvl <= 10 && (subj.unlockedLevels || []).indexOf(nextLvl) === -1) {
      subj.unlockedLevels = (subj.unlockedLevels || [1]).concat([nextLvl]);
      subj.currentLevel   = nextLvl;
      subj.bestLevel      = Math.max(subj.bestLevel || 1, nextLvl);
    }
  }
  subj.unlockedLevels = checkLevelUnlock(subj);

  next.subjects[result.subjectId] = subj;
  next.totalXp       = (next.totalXp || 0) + result.totalXp;
  // Een Auto-ronde telt als één sessie: volgende opslagen in dezelfde ronde tellen niet mee
  next.totalSessions = (next.totalSessions || 0) + (result.sameSession ? 0 : 1);

  // Streak, met de dag waarop de sessie gemaakt is (niet de dag van het toepassen)
  if (next.lastSessionDate !== datum) {
    if (next.lastSessionDate === gisteren) {
      next.streak = (next.streak || 0) + 1;
    } else {
      next.streak = 1;
    }
    next.lastSessionDate = datum;
    next.bestStreak = Math.max(next.bestStreak || 0, next.streak);
  }
  return next;
}

// Eén bewerking toepassen; zet toegepastTot[schrijver] op haar nummer
export function pasBewerkingToe(stand, b) {
  var next;
  if (b.soort === "sessie") {
    next = pasSessieToe(stand, b.result, b.datum, b.gisteren);
  } else if (b.soort === "patch") {
    next = dMerge(dClone(stand), b.patch);
  } else if (b.soort === "wissen") {
    next = dClone(DEFAULT_SAVE);
    next.rev = stand.rev;
  } else {
    throw new Error("onbekende bewerking: " + b.soort);
  }
  var tt = {};
  var oud = stand.toegepastTot || {};
  for (var k in oud) tt[k] = oud[k];
  tt[b.schrijver] = b.nr;
  next.toegepastTot = tt;
  return next;
}

// Een stand opbouwen: op basis de bewerkingen uit de wachtrijen die er nog niet in zitten.
// wachtrijen: [{ schrijver, items: [bewerking, ...] }] (momentopnames, oplopende nummers).
// Per schrijver alleen een aansluitend stuk: het eerste nieuwe nummer moet toegepastTot[schrijver] + 1 zijn,
// anders wordt die schrijver deze keer overgeslagen (§3g punt 5, regel 3).
// Uitkomst: { stand, toegepast } met toegepast = aantal toegepaste bewerkingen.
export function herbouw(basis, wachtrijen) {
  var stand = basis;
  var toegepast = 0;
  var lijst = (wachtrijen || []).slice().sort(function(a, b) { return a.schrijver < b.schrijver ? -1 : a.schrijver > b.schrijver ? 1 : 0; });
  lijst.forEach(function(w) {
    var tot = (stand.toegepastTot && stand.toegepastTot[w.schrijver]) || 0;
    var nieuw = (w.items || []).filter(function(b) { return b.nr > tot; });
    if (nieuw.length === 0 || nieuw[0].nr !== tot + 1) return;
    for (var i = 0; i < nieuw.length; i++) {
      if (nieuw[i].nr !== tot + 1 + i) break;
      stand = pasBewerkingToe(stand, nieuw[i]);
      toegepast++;
    }
  });
  return { stand: stand, toegepast: toegepast };
}

// Vaste vorm van een stand uit Firestore of localStorage: DEFAULT_SAVE aangevuld, rev en toegepastTot gezet
export function normaliseer(data) {
  var s = dMerge(dClone(DEFAULT_SAVE), data || {});
  s.rev = typeof s.rev === "number" ? s.rev : 0;
  s.toegepastTot = (s.toegepastTot && typeof s.toegepastTot === "object") ? s.toegepastTot : {};
  return s;
}
