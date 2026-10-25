import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { DEFAULT_SAVE, dClone, dMerge, calcXp, getTitel } from "./core/save.js";
import { checkLevelUnlock, updateSkillStats, getNextSkill, getSkillOrder, getSubject } from "./core/subjects.js";
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

// ── Concept-sessie (vangnet bij afsluiten van de app) ───────────────
// Open concept: de lopende sessie, na elk antwoord bijgewerkt (nooit verstuurd).
// Wachtrij: verstuurde sessies waarvan nog niet bevestigd is dat de opslag is geslaagd;
// elk item bewaart het blok van de modus vóór en na de opslag (zoals handleFinish het verstuurde).
// Bij het opstarten wordt de wachtrij op volgorde afgehandeld: blok = na → al bewaard,
// blok = vóór → opnieuw opslaan, anders (conflict) → niet toepassen.
var CONCEPT_KEY     = "rekenmeester_concept";
var QUEUE_KEY       = "rekenmeester_wachtrij";
var CONCEPT_VERSION = 1;

function readLS(key) {
  try { var s = localStorage.getItem(key); return s ? JSON.parse(s) : null; } catch(e) { return null; }
}
function writeLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}
}
function removeLS(key) {
  try { localStorage.removeItem(key); } catch(e) {}
}
function readQueue() {
  var q = readLS(QUEUE_KEY);
  return Array.isArray(q) ? q : [];
}
function writeQueue(q) {
  if (q.length > 0) writeLS(QUEUE_KEY, q); else removeLS(QUEUE_KEY);
}

// JSON met gesorteerde sleutels: de volgorde van velden uit Firestore is niet gegarandeerd
function stableStr(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(stableStr).join(",") + "]";
  return "{" + Object.keys(v).sort().map(function(k) { return JSON.stringify(k) + ":" + stableStr(v[k]); }).join(",") + "}";
}

// ── Auto-modus ──────────────────────────────────────────────────────
// Vaste volgorde; na een behaald level gaat Auto naar de volgende modus die nog een level
// kan opleveren. Volledig beheerste (of niet-beschikbare) modi worden overgeslagen.
// Breuken, Geld en Kommagetallen doen pas mee als de basis er is: in vermenigvuldigen
// én delen zijn de eerste AUTO_BASIS_SKILLS skills (alle tafels) beheerst.
var AUTO_ORDER        = ["optellen", "aftrekken", "vermenigvuldigen", "delen"];
var AUTO_EXTRA        = ["breuken", "geld", "kommagetallen"];
var AUTO_BASIS_SKILLS = 18;

function autoBasisOk(saveObj) {
  return ["vermenigvuldigen", "delen"].every(function(id) {
    var stats = (saveObj.subjects && saveObj.subjects[id] && saveObj.subjects[id].skillStats) || {};
    return getSkillOrder(id).slice(0, AUTO_BASIS_SKILLS).every(function(sid) {
      return !!(stats[sid] && stats[sid].mastered);
    });
  });
}

function autoOrder(saveObj) {
  return autoBasisOk(saveObj) ? AUTO_ORDER.concat(AUTO_EXTRA) : AUTO_ORDER;
}

// Sessie-uitkomsten verwerken in skillStats (gedeeld door handleFinish en de voorlopige
// stand voor de Auto-knoptekst, zodat beide exact dezelfde regel gebruiken)
function mergeSessionSkills(subjectId, stats, result) {
  var out = stats;
  var sessionSkills = result.sessionSkillStats || {};
  for (var skillId in sessionSkills) {
    var ss = sessionSkills[skillId];
    out = updateSkillStats(subjectId, out, skillId, ss.correct, ss.total, (result.promotionSnapshots || {})[skillId]);
  }
  return out;
}

// Voorlopige stand: huidige opslag + de skills van deze sessie (niet opgeslagen)
function previewSave(saveObj, result) {
  var next = dClone(saveObj);
  next.subjects = next.subjects || {};
  var subj = next.subjects[result.subjectId] || {};
  subj.skillStats = mergeSessionSkills(result.subjectId, subj.skillStats || {}, result);
  next.subjects[result.subjectId] = subj;
  return next;
}

function canLevel(saveObj, id) {
  var subject = getSubject(id);
  if (!subject || subject.id !== id || !subject.available) return false;
  var stats = (saveObj.subjects && saveObj.subjects[id] && saveObj.subjects[id].skillStats) || {};
  return getNextSkill(id, stats).skillId !== null;
}

// includeFrom: fromId zelf eerst proberen (start). Anders eerst de volgende modi en als
// laatste fromId zelf (als alle andere modi volledig beheerst zijn).
function autoSubjectFrom(saveObj, fromId, includeFrom) {
  var order = autoOrder(saveObj);
  var start = order.indexOf(fromId);
  if (start === -1) start = 0;
  var first = includeFrom ? 0 : 1;
  var last  = includeFrom ? order.length - 1 : order.length;
  for (var k = first; k <= last; k++) {
    var id = order[(start + k) % order.length];
    if (canLevel(saveObj, id)) return id;
  }
  return null;
}

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

  // Auto: alleen in het geheugen. autoCountedRef: deze Auto-ronde telt al als sessie.
  var autoState       = useState(false);
  var autoActive      = autoState[0];
  var setAutoActive   = autoState[1];

  var pendingState    = useState(null);
  var pendingAuto     = pendingState[0];
  var setPendingAuto  = pendingState[1];

  var autoKeyState    = useState(0);
  var autoKey         = autoKeyState[0];
  var setAutoKey      = autoKeyState[1];

  var autoCountedRef  = useRef(false);

  // Scrollpositie bij schermwissel: de hele pagina scrolt, dus zonder dit opent een scherm
  // op de scrollpositie van het vorige scherm. Elk scherm begint bovenaan; Home krijgt bij
  // terugkeer zijn eigen laatste positie terug. Alleen in het geheugen, geen opslag.
  var screenRef       = useRef(screen);
  var homeScrollRef   = useRef(0);
  screenRef.current   = screen;

  useEffect(function() {
    function onScroll() {
      // Na een schermwissel kan de browser de positie bijstellen; dat telt niet als Home-positie
      if (screenRef.current === "home") homeScrollRef.current = window.scrollY;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return function() { window.removeEventListener("scroll", onScroll); };
  }, []);

  useLayoutEffect(function() {
    window.scrollTo(0, screen === "home" ? homeScrollRef.current : 0);
  }, [screen]);

  // Concept-sessie: herstel één keer na het laden; melding na een herstel
  var restoredRef     = useRef(false);
  // Herstelde sessies die nog bevestigd moeten worden: { ids: {id: true}, done: {id: true}, shown }
  var restoreWaitRef  = useRef(null);
  var noticeState     = useState(false);
  var restoreNotice   = noticeState[0];
  var setRestoreNotice = noticeState[1];

  // Vak Rekenen op Home: open of dicht, alleen in het geheugen (na herstart weer ingeklapt)
  var rekenenState    = useState(false);
  var rekenenOpen     = rekenenState[0];
  var setRekenenOpen  = rekenenState[1];

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
      var subj = next.subjects[result.subjectId] || dClone(DEFAULT_SAVE.subjects[result.subjectId] || DEFAULT_SAVE.subjects.optellen);

      subj.totalCorrect   += result.totalCorrect;
      subj.totalQuestions += result.totalQuestions;
      subj.xp              = (subj.xp || 0) + result.totalXp;

      // ── Skill stats bijwerken ────────────────────────────────────
      var currentSkillStats = mergeSessionSkills(result.subjectId, subj.skillStats || {}, result);
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
      // Een Auto-ronde telt als één sessie: volgende opslagen in dezelfde ronde tellen niet mee
      next.totalSessions = (next.totalSessions || 0) + (result.sameSession ? 0 : 1);

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

      var sendPromise;
      if (uid) sendPromise = saveToFirestore(uid, next);
      else {
        var lsOk = false;
        try { localStorage.setItem("cumlaude_save", JSON.stringify(next)); lsOk = true; } catch(e) {}
        sendPromise = Promise.resolve(lsOk);
      }
      noteSend(result, prev, next, sendPromise);

      if (uid && next.displayName) {
        var titelNu = getTitel(next.subjects.optellen ? (next.subjects.optellen.totalSkillsMastered || 0) : 0);
        updateGlobalLeaderboard(uid, next.displayName, next.totalXp, titelNu.label);
        var subjData = next.subjects[result.subjectId];
        var subAcc   = subjData.totalQuestions > 0
          ? Math.round(subjData.totalCorrect / subjData.totalQuestions * 100) : 0;
        var subSkills = subjData.totalSkillsMastered || 0;
        updateSubjectLeaderboard(uid, next.displayName, result.subjectId, subjData.currentLevel || 1, subAcc, subSkills, getTitel(subSkills).label);
      }

      return next;
    });

    setLastResult(result);
    setScreen("result");
  }

  // ── Concept-sessie ────────────────────────────────────────────────
  // Na elk antwoord: het open concept bijwerken (synchroon in localStorage)
  function handleProgress(result) {
    if (!result || !(result.totalQuestions > 0) || !result.conceptId) return;
    var r = JSON.parse(JSON.stringify(result));
    r.sameSession = autoActive ? autoCountedRef.current : false;
    writeLS(CONCEPT_KEY, { v: CONCEPT_VERSION, id: r.conceptId, uid: uid, result: r });
  }

  // Elke opslag via handleFinish: in de wachtrij (vóór/na-blok), open concept weg; pas bij
  // een geslaagde opslag dit item én alle oudere wissen (elke opslag schrijft het hele document)
  function noteSend(result, prev, next, sendPromise) {
    var sid = result.subjectId;
    var id  = result.conceptId || ("s" + Date.now());
    var q   = readQueue().filter(function(e) { return e && e.id !== id; });
    var seq = 1;
    q.forEach(function(e) { if (e.seq >= seq) seq = e.seq + 1; });
    q.push({
      v: CONCEPT_VERSION, id: id, seq: seq, uid: uid, subjectId: sid,
      pre:  stableStr((prev.subjects && prev.subjects[sid]) || null),
      post: stableStr(next.subjects[sid]),
      result: JSON.parse(JSON.stringify(result)),
    });
    writeQueue(q);
    var c = readLS(CONCEPT_KEY);
    if (c && c.id === id) removeLS(CONCEPT_KEY);
    sendPromise.then(function(ok) {
      if (!ok) return;
      // Herstelmelding pas als ALLE herstelde sessies van deze start bevestigd zijn
      var w = restoreWaitRef.current;
      if (w && !w.shown && w.ids[id]) {
        w.done[id] = true;
        if (Object.keys(w.ids).every(function(k) { return w.done[k]; })) {
          w.shown = true;
          setRestoreNotice(true);
        }
      }
      writeQueue(readQueue().filter(function(e) { return !(e && e.seq <= seq); }));
    });
  }

  // Na het laden: wachtrij op volgorde afhandelen, daarna een open concept; ongeldig → wissen
  function restorePending() {
    var apply  = [];
    var keep   = [];
    var blocks = {};
    function curBlock(sid) {
      if (Object.prototype.hasOwnProperty.call(blocks, sid)) return blocks[sid];
      return stableStr((save.subjects && save.subjects[sid]) || null);
    }
    readQueue().slice().sort(function(a, b) { return ((a && a.seq) || 0) - ((b && b.seq) || 0); }).forEach(function(e) {
      if (!e || e.v !== CONCEPT_VERSION || e.uid !== uid || !e.result || !e.subjectId) return;
      var b = curBlock(e.subjectId);
      if (b === e.post) return;
      if (b === e.pre) {
        var r = e.result;
        r.conceptId = e.id;
        apply.push(r);
        keep.push(e);
        blocks[e.subjectId] = e.post;
      }
    });
    writeQueue(keep);
    var c = readLS(CONCEPT_KEY);
    if (c && c.v === CONCEPT_VERSION && c.uid === uid && c.result && c.result.totalQuestions > 0 && c.result.conceptId === c.id) {
      apply.push(c.result);
    } else if (c) {
      removeLS(CONCEPT_KEY);
    }
    if (apply.length === 0) return;
    var wait = { ids: {}, done: {}, shown: false };
    apply.forEach(function(r) { wait.ids[r.conceptId] = true; });
    restoreWaitRef.current = wait;
    apply.forEach(function(r) { handleFinish(r); });
    setScreen("home");
  }

  useEffect(function() {
    if (loading || needsName || restoredRef.current) return;
    restoredRef.current = true;
    restorePending();
  }, [loading, needsName]);

  useEffect(function() {
    if (!restoreNotice) return;
    var t = setTimeout(function() { setRestoreNotice(false); }, 5000);
    return function() { clearTimeout(t); };
  }, [restoreNotice]);

  // ── Auto-modus ────────────────────────────────────────────────────
  function openPractice(saveObj, sId) {
    var d = (saveObj.subjects && saveObj.subjects[sId]) || {};
    setSubjectId(sId);
    setPracticeLevel(d.currentLevel || 1);
    setAutoKey(function(k) { return k + 1; });
    setScreen("practice");
  }

  function startAuto() {
    var sId = autoSubjectFrom(save, "optellen", true);
    if (!sId) return;
    autoCountedRef.current = false;
    setAutoActive(true);
    openPractice(save, sId);
  }

  // Elke opslag binnen een Auto-ronde loopt via de bestaande handleFinish
  function saveAutoPart(result) {
    result.sameSession = autoCountedRef.current;
    autoCountedRef.current = true;
    handleFinish(result);
  }

  // Behaald level in Auto: huidige modus opslaan, daarna (in het effect, met de bijgewerkte
  // voortgang) de volgende modus openen
  function handleAutoNext(result) {
    saveAutoPart(result);
    setPendingAuto(result.subjectId);
  }

  function handlePracticeFinish(result) {
    if (autoActive) {
      saveAutoPart(result);
      setAutoActive(false);
    } else {
      handleFinish(result);
    }
  }

  // ‹ in het oefenscherm: zelfde opslag als ✕ (als er sommen gemaakt zijn), daarna het
  // modusscherm in plaats van het resultaatscherm
  function handlePracticeBack(result) {
    if (result && result.totalQuestions > 0) {
      handlePracticeFinish(result);
    } else {
      setAutoActive(false);
    }
    setScreen("subject");
  }

  useEffect(function() {
    if (pendingAuto === null) return;
    var fromId = pendingAuto;
    setPendingAuto(null);
    var nextId = autoSubjectFrom(save, fromId, false);
    if (nextId) {
      openPractice(save, nextId);
    } else {
      // Alles beheerst: Auto stopt, het resultaatscherm van de laatste modus blijft staan
      setAutoActive(false);
    }
  }, [pendingAuto]);

  // ── Reset ─────────────────────────────────────────────────────────
  function handleReset() {
    if (!window.confirm("Weet je zeker dat je alles wilt wissen?")) return;
    var fresh = dClone(DEFAULT_SAVE);
    removeLS(CONCEPT_KEY);
    removeLS(QUEUE_KEY);
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

  // Tussenstap tijdens een Auto-wissel (één render, tot het effect de volgende modus opent)
  if (pendingAuto !== null) {
    return <div style={{ minHeight: "100dvh", background: T.bg }} />;
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
    // Knoptekst na een behaald level: berekend met de voorlopige stand (opslag + deze sessie),
    // dus dezelfde modus die handleAutoNext daarna opent — ook op het moment dat de basis
    // net gehaald wordt
    var autoNextLabel = null;
    if (autoActive) {
      autoNextLabel = function(result) {
        var autoNextId = autoSubjectFrom(previewSave(save, result), subjectId, false);
        return autoNextId && autoNextId !== subjectId
          ? "Door naar " + getSubject(autoNextId).label + " →"
          : "Ga verder →";
      };
    }
    return (
      <PracticeScreen
        key={subjectId + "-" + autoKey}
        subjectId={subjectId}
        level={practiceLevel}
        skillStats={practiceSkillStats}
        onBack={handlePracticeBack}
        onFinish={handlePracticeFinish}
        autoNextLabel={autoNextLabel}
        onAutoNext={autoActive ? handleAutoNext : null}
        onProgress={handleProgress}
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
      {restoreNotice && (
        <div
          role="status"
          onClick={function() { setRestoreNotice(false); }}
          style={{
            position: "fixed",
            top: "calc(env(safe-area-inset-top, 0px) + 12px)",
            left: 16,
            right: 16,
            zIndex: 200,
            background: "#ecfdf5",
            border: "1.5px solid #6ee7b7",
            color: "#065f46",
            borderRadius: 14,
            padding: "12px 16px",
            fontSize: 14,
            fontWeight: 800,
            textAlign: "center",
            boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
            cursor: "pointer",
          }}
        >
          {"Je vorige oefensessie is bewaard."}
        </div>
      )}
      <HomeScreen
        save={save}
        uid={uid}
        onSubject={function(id) { setSubjectId(id); setScreen("subject"); }}
        onAuto={autoSubjectFrom(save, "optellen", true) ? startAuto : null}
        autoAll={autoBasisOk(save)}
        rekenenOpen={rekenenOpen}
        onToggleRekenen={function() { setRekenenOpen(!rekenenOpen); }}
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
