import { useState, useEffect } from "react";
import { DEFAULT_SAVE, dClone, dMerge, calcXp, getTitel } from "./core/save.js";
import { checkLevelUnlock, updateSkillStats, getNextSkill, getSkillOrder } from "./core/subjects.js";
import { initAuth } from "./services/firebase.js";
import { loadFromFirestore, saveToFirestore } from "./services/sync.js";
import { claimUsername, updateGlobalLeaderboard, updateSubjectLeaderboard } from "./services/leaderboard.js";
import { T, D } from "./styles/tokens.js";

import HomeScreen        from "./screens/HomeScreen.jsx";
import SubjectScreen     from "./screens/SubjectScreen.jsx";
import PracticeScreen    from "./screens/PracticeScreen.jsx";
import ResultScreen      from "./screens/ResultScreen.jsx";
import LeaderboardScreen from "./screens/LeaderboardScreen.jsx";
import SettingsScreen    from "./screens/SettingsScreen.jsx";
import UsernameScreen    from "./screens/UsernameScreen.jsx";
import BottomSheet       from "./components/BottomSheet.jsx";

var SHEET_TABS = [
  { id: "leaderboard", label: "Scores", icon: "🏆" },
  { id: "more",        label: "Meer",   icon: "⋯"       },
];

export default function App() {
  var uidState     = useState(null);
  var uid          = uidState[0];
  var setUid       = uidState[1];

  var saveState    = useState(dClone(DEFAULT_SAVE));
  var save         = saveState[0];
  var setSave      = saveState[1];

  var loadState    = useState(true);
  var loading      = loadState[0];
  var setLoading   = loadState[1];

  var nameState    = useState(false);
  var needsName    = nameState[0];
  var setNeedsName = nameState[1];

  var screenState  = useState("home");
  var screen       = screenState[0];
  var setScreen    = screenState[1];

  var subjState    = useState("optellen");
  var subjectId    = subjState[0];
  var setSubjectId = subjState[1];

  var lvlState     = useState(1);
  var practiceLevel = lvlState[0];
  var setPracticeLevel = lvlState[1];

  var resState     = useState(null);
  var lastResult   = resState[0];
  var setLastResult = resState[1];

  var sheetTabState = useState("leaderboard");
  var sheetTab      = sheetTabState[0];
  var setSheetTab   = sheetTabState[1];

  // ── Init ─────────────────────────────────────────────────────────
  useEffect(function() {
    initAuth()
      .then(async function(userId) {
        setUid(userId);
        var data = await loadFromFirestore(userId);
        setSave(data);
        if (!data.username) setNeedsName(true);
        setLoading(false);
      })
      .catch(function() {
        try {
          var local = localStorage.getItem("cumlaude_save");
          if (local) setSave(dMerge(dClone(DEFAULT_SAVE), JSON.parse(local)));
        } catch(e) {}
        setLoading(false);
      });
  }, []);

  // ── Save helper ───────────────────────────────────────────────────
  function upSave(patch) {
    setSave(function(prev) {
      var next = dMerge(dClone(prev), patch);
      if (uid) saveToFirestore(uid, next);
      else {
        try { localStorage.setItem("cumlaude_save", JSON.stringify(next)); } catch(e) {}
      }
      return next;
    });
  }

  // ── Username ──────────────────────────────────────────────────────
  function handleUsernameDone(name) {
    var slug = name.toLowerCase().replace(/\s+/g, "_");
    upSave({ username: slug, displayName: name });
    setNeedsName(false);
    if (uid) updateGlobalLeaderboard(uid, name, 0, "Beginner");
  }

  // ── Practice finish ───────────────────────────────────────────────
  function handleFinish(result) {
    setSave(function(prev) {
      var next = dClone(prev);
      var subj = next.subjects[result.subjectId] || dClone(DEFAULT_SAVE.subjects.optellen);

      subj.totalCorrect   += result.totalCorrect;
      subj.totalQuestions += result.totalQuestions;
      subj.xp              = (subj.xp || 0) + result.totalXp;

      // ── Skill stats bijwerken ────────────────────────────────────
      var currentSkillStats = subj.skillStats || {};
      var sessionSkills     = result.sessionSkillStats || {};
      var skillId;
      for (skillId in sessionSkills) {
        var ss = sessionSkills[skillId];
        currentSkillStats = updateSkillStats(result.subjectId, currentSkillStats, skillId, ss.correct, ss.total);
      }
      subj.skillStats = currentSkillStats;

      // Bereken volgende skill
      var nextSkillInfo   = getNextSkill(result.subjectId, currentSkillStats);
      subj.currentSkillId = nextSkillInfo.skillId;

      // Totaal beheerste skills — alleen skills in de actieve skillvolgorde tellen
      var skillOrder    = getSkillOrder(result.subjectId);
      var masteredCount = 0;
      for (var sid in currentSkillStats) {
        if (currentSkillStats[sid].mastered && skillOrder.indexOf(sid) !== -1) masteredCount++;
      }
      subj.totalSkillsMastered = masteredCount;

      // ── Legacy level unlock (XP-gebaseerd) ──────────────────────
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
      next.totalSessions = (next.totalSessions || 0) + 1;

      // Streak
      var today     = new Date().toISOString().slice(0, 10);
      if (next.lastSessionDate !== today) {
        var yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        if (next.lastSessionDate === yesterday) {
          next.streak = (next.streak || 0) + 1;
        } else {
          next.streak = 1;
        }
        next.lastSessionDate = today;
        next.bestStreak = Math.max(next.bestStreak || 0, next.streak);
      }

      if (uid) saveToFirestore(uid, next);
      else {
        try { localStorage.setItem("cumlaude_save", JSON.stringify(next)); } catch(e) {}
      }

      if (uid && next.displayName) {
        var titelNu = getTitel(next.subjects.optellen ? (next.subjects.optellen.totalSkillsMastered || 0) : 0);
        updateGlobalLeaderboard(uid, next.displayName, next.totalXp, titelNu.label);
        var subjData = next.subjects[result.subjectId];
        var subAcc   = subjData.totalQuestions > 0
          ? Math.round(subjData.totalCorrect / subjData.totalQuestions * 100) : 0;
        updateSubjectLeaderboard(uid, next.displayName, result.subjectId, subjData.currentLevel || 1, subAcc);
      }

      return next;
    });

    setLastResult(result);
    setScreen("result");
  }

  // ── Reset ─────────────────────────────────────────────────────────
  function handleReset() {
    if (!window.confirm("Weet je zeker dat je alles wilt wissen?")) return;
    var fresh = dClone(DEFAULT_SAVE);
    setSave(fresh);
    if (uid) saveToFirestore(uid, fresh);
    else {
      try { localStorage.removeItem("cumlaude_save"); } catch(e) {}
    }
    setNeedsName(true);
    setScreen("home");
  }

  // ── Loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: D.bg,
        gap: 16,
      }}>
        <div style={{
          width: 64, height: 64,
          borderRadius: 18,
          background: D.primaryLight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
        }}>
          +
        </div>
        <div style={{ fontSize: 15, color: D.textSoft }}>Reken Meester laden...</div>
      </div>
    );
  }

  if (needsName) {
    return <UsernameScreen uid={uid} onDone={handleUsernameDone} />;
  }

  if (screen === "subject") {
    return (
      <SubjectScreen
        subjectId={subjectId}
        save={save}
        onBack={function() { setScreen("home"); }}
        onStartLevel={function(sId, lvl) {
          setSubjectId(sId);
          setPracticeLevel(lvl);
          setScreen("practice");
        }}
      />
    );
  }

  if (screen === "practice") {
    var practiceSubjData = (save.subjects && save.subjects[subjectId]) || {};
    var practiceSkillStats = practiceSubjData.skillStats || {};
    return (
      <PracticeScreen
        subjectId={subjectId}
        level={practiceLevel}
        skillStats={practiceSkillStats}
        onBack={function() { setScreen("subject"); }}
        onFinish={handleFinish}
      />
    );
  }

  if (screen === "result") {
    var subjData = (save.subjects && save.subjects[lastResult && lastResult.subjectId]) || {};
    var nextLvl  = ((lastResult && lastResult.level) || 1) + 1;
    var hasNext  = nextLvl <= 10 && (subjData.unlockedLevels || [1]).indexOf(nextLvl) !== -1;

    return (
      <ResultScreen
        result={lastResult}
        save={save}
        onHome={function() { setScreen("home"); }}
        onRepeat={function() { setScreen("practice"); }}
        onNext={hasNext ? function() { setPracticeLevel(nextLvl); setScreen("practice"); } : null}
      />
    );
  }

  if (screen === "settings") {
    return (
      <SettingsScreen
        save={save}
        onBack={function() { setScreen("home"); }}
        onReset={handleReset}
      />
    );
  }

  // ── Home + bottom sheet ───────────────────────────────────────────
  return (
    <div style={{ position: "relative", minHeight: "100dvh", background: T.bg }}>
      <HomeScreen
        save={save}
        uid={uid}
        onSubject={function(id) { setSubjectId(id); setScreen("subject"); }}
        onSettings={function() { setScreen("settings"); }}
      />

      <BottomSheet
        tipText="Oefen elke dag een beetje — consistentie is beter dan lange sessies!"
        tabs={SHEET_TABS}
        activeTab={sheetTab}
        onTabChange={setSheetTab}
      >
        {sheetTab === "leaderboard" && (
          <LeaderboardScreen
            uid={uid}
            save={save}
            embedded={true}
          />
        )}
        {sheetTab === "more" && (
          <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: T.xs, fontWeight: 700, color: T.textSoft, letterSpacing: 0.5 }}>
              MEER
            </div>
            <div style={{
              background: T.white,
              border: "1px solid " + T.border,
              borderRadius: T.r16,
              padding: "16px 18px",
              color: T.textSoft,
              fontSize: T.sm,
              textAlign: "center",
            }}>
              Meer onderdelen komen binnenkort!
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
