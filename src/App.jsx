import { useState, useEffect } from "react";
import { DEFAULT_SAVE, dClone, dMerge, calcXp } from "./core/save.js";
import { checkLevelUnlock } from "./core/subjects.js";
import { initAuth } from "./services/firebase.js";
import { loadFromFirestore, saveToFirestore } from "./services/sync.js";
import { claimUsername, updateGlobalLeaderboard, updateSubjectLeaderboard } from "./services/leaderboard.js";

import HomeScreen      from "./screens/HomeScreen.jsx";
import SubjectScreen   from "./screens/SubjectScreen.jsx";
import PracticeScreen  from "./screens/PracticeScreen.jsx";
import ResultScreen    from "./screens/ResultScreen.jsx";
import LeaderboardScreen from "./screens/LeaderboardScreen.jsx";
import SettingsScreen  from "./screens/SettingsScreen.jsx";
import UsernameScreen  from "./screens/UsernameScreen.jsx";

export default function App() {
  const [uid, setUid]             = useState(null);
  const [save, setSave]           = useState(dClone(DEFAULT_SAVE));
  const [loading, setLoading]     = useState(true);
  const [needsName, setNeedsName] = useState(false);

  // Navigation stack: [{screen, ...props}]
  const [screen, setScreen]       = useState("home");
  const [subjectId, setSubjectId] = useState("optellen");
  const [practiceLevel, setPracticeLevel] = useState(1);
  const [lastResult, setLastResult] = useState(null);

  // ── Init ─────────────────────────────────────────────────────
  useEffect(() => {
    initAuth()
      .then(async (userId) => {
        setUid(userId);
        const data = await loadFromFirestore(userId);
        setSave(data);
        if (!data.username) setNeedsName(true);
        setLoading(false);
      })
      .catch(() => {
        try {
          const local = localStorage.getItem("cumlaude_save");
          if (local) setSave(dMerge(dClone(DEFAULT_SAVE), JSON.parse(local)));
        } catch {}
        setLoading(false);
      });
  }, []);

  // ── Save helper ───────────────────────────────────────────────
  function upSave(patch) {
    setSave(prev => {
      const next = dMerge(dClone(prev), patch);
      if (uid) saveToFirestore(uid, next);
      else {
        try { localStorage.setItem("cumlaude_save", JSON.stringify(next)); } catch {}
      }
      return next;
    });
  }

  // ── Username ──────────────────────────────────────────────────
  function handleUsernameDone(name) {
    const slug = name.toLowerCase().replace(/\s+/g, "_");
    upSave({ username: slug, displayName: name });
    setNeedsName(false);
    if (uid) updateGlobalLeaderboard(uid, name, 0, "Beginner");
  }

  // ── Practice finish ───────────────────────────────────────────
  function handleFinish(result) {
    // Update subject data
    setSave(prev => {
      const next = dClone(prev);
      const subj = next.subjects[result.subjectId] || dClone(DEFAULT_SAVE.subjects.optellen);

      subj.totalCorrect   += result.totalCorrect;
      subj.totalQuestions += result.totalQuestions;
      subj.xp             = (subj.xp || 0) + result.totalXp;

      // Determine best level to use
      const acc = Math.round((subj.totalCorrect / subj.totalQuestions) * 100);
      if (acc >= 80 && result.level === subj.currentLevel) {
        // Good enough: unlock next if not already unlocked
        const nextLvl = subj.currentLevel + 1;
        if (nextLvl <= 10 && !(subj.unlockedLevels || []).includes(nextLvl)) {
          subj.unlockedLevels = [...(subj.unlockedLevels || [1]), nextLvl];
          // Advance current level
          subj.currentLevel = nextLvl;
          subj.bestLevel    = Math.max(subj.bestLevel || 1, nextLvl);
        }
      }

      // Also check XP-based unlocks
      subj.unlockedLevels = checkLevelUnlock(subj);

      next.subjects[result.subjectId] = subj;
      next.totalXp        = (next.totalXp || 0) + result.totalXp;
      next.totalSessions  = (next.totalSessions || 0) + 1;

      // Streak logic
      const today = new Date().toISOString().slice(0, 10);
      if (next.lastSessionDate !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
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
        try { localStorage.setItem("cumlaude_save", JSON.stringify(next)); } catch {}
      }

      // Push to leaderboards
      if (uid && next.displayName) {
        updateGlobalLeaderboard(uid, next.displayName, next.totalXp, "Leerling");
        const subjData = next.subjects[result.subjectId];
        const subAcc   = subjData.totalQuestions > 0
          ? Math.round(subjData.totalCorrect / subjData.totalQuestions * 100) : 0;
        updateSubjectLeaderboard(uid, next.displayName, result.subjectId, subjData.currentLevel || 1, subAcc);
      }

      return next;
    });

    setLastResult(result);
    setScreen("result");
  }

  // ── Reset ─────────────────────────────────────────────────────
  function handleReset() {
    if (!window.confirm("Weet je zeker dat je alles wilt wissen?")) return;
    const fresh = dClone(DEFAULT_SAVE);
    setSave(fresh);
    if (uid) saveToFirestore(uid, fresh);
    else {
      try { localStorage.removeItem("cumlaude_save"); } catch {}
    }
    setNeedsName(true);
    setScreen("home");
  }

  // ── Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8f9fa",
        gap: 16,
      }}>
        <div style={{
          width: 64, height: 64,
          borderRadius: 18,
          background: "#eef2ff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
        }}>
          +
        </div>
        <div style={{ fontSize: 15, color: "#9ca3af" }}>Reken Meester laden...</div>
      </div>
    );
  }

  // ── Username screen ───────────────────────────────────────────
  if (needsName) {
    return <UsernameScreen uid={uid} onDone={handleUsernameDone} />;
  }

  // ── Router ────────────────────────────────────────────────────
  if (screen === "home") {
    return (
      <HomeScreen
        save={save}
        uid={uid}
        onSubject={(id) => { setSubjectId(id); setScreen("subject"); }}
        onLeaderboard={() => setScreen("leaderboard")}
        onSettings={() => setScreen("settings")}
      />
    );
  }

  if (screen === "subject") {
    return (
      <SubjectScreen
        subjectId={subjectId}
        save={save}
        onBack={() => setScreen("home")}
        onStartLevel={(sId, lvl) => {
          setSubjectId(sId);
          setPracticeLevel(lvl);
          setScreen("practice");
        }}
      />
    );
  }

  if (screen === "practice") {
    return (
      <PracticeScreen
        subjectId={subjectId}
        level={practiceLevel}
        onBack={() => setScreen("subject")}
        onFinish={handleFinish}
      />
    );
  }

  if (screen === "result") {
    const subjData = save.subjects?.[lastResult?.subjectId] || {};
    const nextLvl  = (lastResult?.level || 1) + 1;
    const hasNext  = nextLvl <= 10 && (subjData.unlockedLevels || [1]).includes(nextLvl);

    return (
      <ResultScreen
        result={lastResult}
        onHome={() => setScreen("home")}
        onRepeat={() => setScreen("practice")}
        onNext={hasNext ? () => { setPracticeLevel(nextLvl); setScreen("practice"); } : null}
      />
    );
  }

  if (screen === "leaderboard") {
    return (
      <LeaderboardScreen
        uid={uid}
        save={save}
        onBack={() => setScreen("home")}
      />
    );
  }

  if (screen === "settings") {
    return (
      <SettingsScreen
        save={save}
        onBack={() => setScreen("home")}
        onReset={handleReset}
      />
    );
  }

  return null;
}
