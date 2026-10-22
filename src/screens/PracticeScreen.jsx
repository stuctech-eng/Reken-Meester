import { useState, useRef, useEffect } from "react";
import { Screen, ProgressBar } from "../components/UI.jsx";
import { A, T } from "../styles/tokens.js";
import { getSkill, getNextSkill, getSubject, getSkillOrder } from "../core/subjects.js";
import { getTitel, calcXp } from "../core/save.js";

// NO BACKTICKS / TEMPLATE LITERALS anywhere. String concatenation only.


export default function PracticeScreen({ subjectId, level, skillStats, onBack, onFinish }) {
  var skillOrder = getSkillOrder(subjectId);

  // ── Initialisatie helpers ─────────────────────────────────────
  function initSkillId() {
    var res = getNextSkill(subjectId, skillStats || {});
    return res ? res.skillId : skillOrder[0];
  }

  function makeQuestion(skillId) {
    var skill = getSkill(subjectId, skillId);
    if (!skill) skill = getSkill(subjectId, skillOrder[0]);
    var q = skill.generate();
    q.skillId = skillId;
    q.skill   = skill;
    return q;
  }

  // ── State ──────────────────────────────────────────────────────
  var startSkillId = initSkillId();

  var curQState         = useState(function() { return makeQuestion(startSkillId); });
  var currentQuestion   = curQState[0];
  var setCurrentQuestion = curQState[1];

  var selState    = useState(null);
  var selected    = selState[0];
  var setSelected = selState[1];

  var fbState     = useState(null);
  var feedback    = fbState[0];
  var setFeedback = fbState[1];

  var fbLvlState  = useState(0);
  var fbLevel     = fbLvlState[0];
  var setFbLevel  = fbLvlState[1];

  // uitlegVisible: kaart zichtbaar na fout (blijft staan tot "Volgende vraag" getikt)
  var uitlegVisState = useState(false);
  var uitlegVisible  = uitlegVisState[0];
  var setUitlegVisible = uitlegVisState[1];

  var resState    = useState([]);
  var results     = resState[0];
  var setResults  = resState[1];
  var totalXpRef  = useRef(0);

  var showLUState   = useState(false);
  var showLevelUp   = showLUState[0];
  var setShowLevelUp = showLUState[1];

  var luDataState   = useState(null);
  var levelUpData   = luDataState[0];
  var setLevelUpData = luDataState[1];

  // ── Refs (geen re-render) ─────────────────────────────────────
  var activeSkillIdRef           = useRef(startSkillId);
  var sessionSkillStatsRef       = useRef({});
  var skillErrorsRef             = useRef({});
  var recentRef                  = useRef({});
  var fallbackActiveRef          = useRef(false);
  var fallbackReturnSkillRef     = useRef(null);
  var liveCorrectOnFallbackRef   = useRef(0);
  var promotedThisSession        = useRef(new Set());
  var promotionSnapRef           = useRef({});
  var lastQuestionRef            = useRef(currentQuestion.question);
  var nextSkillIdRef             = useRef(startSkillId);
  var timeRef                    = useRef(Date.now());

  // Initialiseer sessionSkillStats voor alle skills
  useEffect(function() {
    skillOrder.forEach(function(id) {
      sessionSkillStatsRef.current[id] = { correct: 0, total: 0 };
    });
  }, []);

  // ── Helpers ───────────────────────────────────────────────────
  // Alleen skills in de actieve skillvolgorde tellen (zelfde regel als App.handleFinish)
  function getLiveTotal() {
    var stored = Object.keys(skillStats || {}).filter(function(id) {
      return skillStats[id] && skillStats[id].mastered && skillOrder.indexOf(id) !== -1;
    }).length;
    var genuinelyNew = 0;
    promotedThisSession.current.forEach(function(id) {
      if (skillOrder.indexOf(id) === -1) return;
      if (!(skillStats && skillStats[id] && skillStats[id].mastered)) {
        genuinelyNew++;
      }
    });
    return stored + genuinelyNew;
  }

  function generateNext(skillId) {
    var skill = getSkill(subjectId, skillId);
    if (!skill) skill = getSkill(subjectId, skillOrder[0]);
    var q = skill.generate();
    if (q.question === lastQuestionRef.current) {
      q = skill.generate();
    }
    q.skillId = skillId;
    q.skill   = skill;
    lastQuestionRef.current = q.question;
    return q;
  }

  function advanceToNext(nextSkillId) {
    var nextQ = generateNext(nextSkillId);
    setCurrentQuestion(nextQ);
    setSelected(null);
    setFeedback(null);
    setFbLevel(0);
    setUitlegVisible(false);
    timeRef.current = Date.now();
  }

  // ── Stop-functie ──────────────────────────────────────────────
  function handleStop() {
    var ss    = sessionSkillStatsRef.current;
    var total = 0;
    var cor   = 0;
    skillOrder.forEach(function(id) {
      total += (ss[id] ? ss[id].total : 0);
      cor   += (ss[id] ? ss[id].correct : 0);
    });
    var avgTime = 0;
    var rr = results;
    if (rr.length > 0) {
      avgTime = Math.round(rr.reduce(function(s, r) { return s + r.timeMs; }, 0) / rr.length);
    }
    onFinish({
      subjectId:         subjectId,
      level:             level,
      totalCorrect:      cor,
      totalQuestions:    total,
      totalXp:           totalXpRef.current,
      avgTime:           avgTime,
      results:           rr,
      sessionSkillStats: ss,
      dominantSkillId:   activeSkillIdRef.current,
      promotionSnapshots: promotionSnapRef.current,
    });
  }

  // ── Level-up overlay doorgaan ──────────────────────────────────
  function handleLevelUpContinue() {
    setShowLevelUp(false);
    advanceToNext(activeSkillIdRef.current);
  }

  // ── "Volgende vraag" knop (na fout) ───────────────────────────
  function handleNextQuestion() {
    advanceToNext(nextSkillIdRef.current);
  }

  // ── Antwoord verwerken ─────────────────────────────────────────
  function handleChoice(choice) {
    if (selected !== null) return;

    var answerSkillId = currentQuestion.skillId;
    var timeMs        = Date.now() - timeRef.current;
    var isCorrect     = choice === currentQuestion.answer;

    setSelected(choice);
    setFeedback(isCorrect ? "correct" : "wrong");

    if (!sessionSkillStatsRef.current[answerSkillId]) {
      sessionSkillStatsRef.current[answerSkillId] = { correct: 0, total: 0 };
    }
    sessionSkillStatsRef.current[answerSkillId].total += 1;
    if (isCorrect) sessionSkillStatsRef.current[answerSkillId].correct += 1;

    var earnedXp = calcXp(level, isCorrect, timeMs);
    totalXpRef.current += earnedXp;

    var newResults = results.concat([{
      correct:  isCorrect,
      timeMs:   timeMs,
      answer:   currentQuestion.answer,
      chosen:   choice,
      question: currentQuestion.question,
      skillId:  answerSkillId,
      terms:    currentQuestion.terms || null,
      xp:       earnedXp,
    }]);
    setResults(newResults);

    if (!isCorrect) {
      skillErrorsRef.current[answerSkillId] = (skillErrorsRef.current[answerSkillId] || 0) + 1;
      var errCount = skillErrorsRef.current[answerSkillId];
      setFbLevel(errCount >= 3 ? 3 : errCount >= 2 ? 2 : 1);
      setUitlegVisible(true);
    } else {
      setFbLevel(0);
      setUitlegVisible(false);
    }

    var recentList = (recentRef.current[answerSkillId] || []).concat([isCorrect]);
    if (recentList.length > 10) recentList = recentList.slice(recentList.length - 10);
    recentRef.current[answerSkillId] = recentList;

    // Next activeSkillId bepalen
    var nextSkillId = activeSkillIdRef.current;

    // Terugval-check
    if (!fallbackActiveRef.current) {
      var window5 = recentList.slice(-5);
      var foutInWindow = window5.filter(function(c) { return !c; }).length;
      if (foutInWindow >= 3) {
        var curIdx = skillOrder.indexOf(answerSkillId);
        if (curIdx > 0) {
          fallbackActiveRef.current       = true;
          fallbackReturnSkillRef.current  = answerSkillId;
          liveCorrectOnFallbackRef.current = 0;
          nextSkillId = skillOrder[curIdx - 1];
          activeSkillIdRef.current = nextSkillId;
        }
      }
    }

    // Terugkeer uit terugval
    if (fallbackActiveRef.current && isCorrect && answerSkillId === activeSkillIdRef.current) {
      liveCorrectOnFallbackRef.current++;
      if (liveCorrectOnFallbackRef.current >= 3) {
        fallbackActiveRef.current = false;
        nextSkillId = fallbackReturnSkillRef.current;
        activeSkillIdRef.current = nextSkillId;
        liveCorrectOnFallbackRef.current = 0;
        fallbackReturnSkillRef.current   = null;
      }
    }

    // Promotie-check
    if (!fallbackActiveRef.current && isCorrect && !promotedThisSession.current.has(answerSkillId)) {
      var storedSkill     = (skillStats && skillStats[answerSkillId]) || {};
      if (!storedSkill.mastered) {
        var storedCorrect   = storedSkill.correct || 0;
        var sessionCorrect  = sessionSkillStatsRef.current[answerSkillId].correct;
        var sessionTotal    = sessionSkillStatsRef.current[answerSkillId].total;
        var cumulativeC     = storedCorrect + sessionCorrect;
        var sessionAcc      = sessionTotal > 0 ? sessionCorrect / sessionTotal : 0;
        var checkSkill      = getSkill(subjectId, answerSkillId);
        var minC            = checkSkill ? (checkSkill.minCorrect || 8) : 8;

        if (cumulativeC >= minC && sessionTotal >= 4 && sessionAcc >= 0.70) {
          promotedThisSession.current.add(answerSkillId);
          promotionSnapRef.current[answerSkillId] = { correct: sessionCorrect, total: sessionTotal };

          var promIdx = skillOrder.indexOf(answerSkillId);
          var nextIdx = promIdx + 1;
          nextSkillId = nextIdx < skillOrder.length ? skillOrder[nextIdx] : answerSkillId;
          activeSkillIdRef.current = nextSkillId;
          nextSkillIdRef.current   = nextSkillId;

          var liveTotal   = getLiveTotal();
          var newTitelObj = getTitel(liveTotal);
          setLevelUpData({
            skillLabel: checkSkill ? checkSkill.label : answerSkillId,
            newTitel:   newTitelObj.label,
            liveTotal:  liveTotal,
          });
          setShowLevelUp(true);
          return;
        }
      }
    }

    nextSkillIdRef.current = nextSkillId;

    // Auto-advance alleen bij correct antwoord
    if (isCorrect) {
      setTimeout(function() {
        advanceToNext(nextSkillId);
      }, 900);
    }
    // Bij fout: wachten op "Volgende vraag" tik
  }

  // ── Afgeleide waarden ─────────────────────────────────────────
  var currentSkill = currentQuestion.skill || getSkill(subjectId, currentQuestion.skillId || skillOrder[0]);

  var storedCorrectForSkill  = (skillStats && skillStats[currentQuestion.skillId] && skillStats[currentQuestion.skillId].correct) || 0;
  var sessionCorrectForSkill = sessionSkillStatsRef.current[currentQuestion.skillId]
    ? sessionSkillStatsRef.current[currentQuestion.skillId].correct
    : 0;
  var skillTarget   = currentSkill ? (currentSkill.minCorrect || 8) : 8;
  var skillProgress = Math.min(storedCorrectForSkill + sessionCorrectForSkill, skillTarget);

  var showUitlegBlock = feedback === "wrong" && fbLevel > 0 && currentSkill && uitlegVisible;

  // ── Render ────────────────────────────────────────────────────
  return (
    <Screen bg={A.bg} style={{ fontFamily: "'Nunito', 'Inter', system-ui, sans-serif" }}>

      {/* Top bar */}
      <div style={{
        background: A.bg,
        padding: "env(safe-area-inset-top, 0px) 0 0 0",
        borderBottom: "1px solid " + A.border,
        flexShrink: 0,
      }}>
        {/* Nav rij */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
        }}>
          {/* Terug / Sluiten knop */}
          <button
            onClick={onBack}
            style={{
              background: A.bgCard,
              border: "1.5px solid " + A.border,
              borderRadius: A.r999,
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              color: A.textMid,
              cursor: "pointer",
              boxShadow: A.shadow,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {"‹"}
          </button>

          {/* Skill naam */}
          <div style={{ textAlign: "center", flex: 1, margin: "0 12px" }}>
            <div style={{ fontSize: T.sm, fontWeight: 800, color: A.primary, letterSpacing: 0.5 }}>
              {getSubject(subjectId) ? getSubject(subjectId).label.toUpperCase() : "OPTELLEN"}
            </div>
            {currentSkill && (
              <div style={{ fontSize: T.xs, color: A.textSoft, fontWeight: 600, marginTop: 1 }}>
                {currentSkill.label}
              </div>
            )}
          </div>

          {/* Stop knop */}
          <button
            onClick={handleStop}
            style={{
              background: A.bgCard,
              border: "1.5px solid " + A.border,
              borderRadius: A.r999,
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
              fontWeight: 700,
              color: A.textSoft,
              cursor: "pointer",
              boxShadow: A.shadow,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {"✕"}
          </button>
        </div>

        {/* Sessieteller — aantal goed deze sessie */}
        <div style={{ padding: "0 20px 12px" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
            <span style={{ fontSize: T.xs, color: A.primary, fontWeight: 800 }}>
              {results.filter(function(r) { return r.correct; }).length + " goed"}
            </span>
          </div>
        </div>
      </div>

      {/* Scrollbaar content */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "20px 20px 32px",
        gap: 16,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}>

        {/* Vraagkaart */}
        <div style={{
          background: A.bgCard,
          borderRadius: A.r20,
          padding: "36px 24px 28px",
          textAlign: "center",
          boxShadow: A.shadowMd,
          border: "2px solid " + (
            feedback === "correct" ? A.successBorder
            : feedback === "wrong"   ? A.errorBorder
            : A.border
          ),
          transition: "border-color 0.2s",
        }}>

          {/* Strategie label (voor antwoord) */}
          {currentSkill && currentSkill.strategy && !feedback && (
            <div style={{
              fontSize: 10,
              fontWeight: 800,
              color: A.primary,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              marginBottom: 14,
              opacity: 0.7,
            }}>
              {currentSkill.strategy}
            </div>
          )}

          {/* De som */}
          <div style={{
            fontSize: 60,
            fontWeight: 900,
            color: A.text,
            letterSpacing: -1.5,
            lineHeight: 1.05,
          }}>
            {currentQuestion.question}
          </div>

          {/* Feedback na antwoord */}
          {feedback && (
            <div style={{
              marginTop: 16,
              fontSize: T.xl,
              fontWeight: 800,
              color: feedback === "correct" ? A.success : A.error,
              animation: "acPopIn 0.18s ease",
            }}>
              {feedback === "correct"
                ? ("✓ Goed zo!")
                : ("✖  Antwoord: " + currentQuestion.answer)
              }
            </div>
          )}
        </div>

        {/* Antwoordgrid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}>
          {currentQuestion.choices.map(function(choice) {
            var isSelected   = selected === choice;
            var isCorrectAns = choice === currentQuestion.answer;
            var bg     = A.bgCard;
            var border = A.border;
            var color  = A.text;
            var shadow = A.shadow;

            if (feedback) {
              if (isCorrectAns) {
                bg = A.successBg; border = A.successBorder; color = A.successTxt; shadow = "none";
              } else if (isSelected) {
                bg = A.errorBg; border = A.errorBorder; color = A.errorTxt; shadow = "none";
              }
            }

            return (
              <button
                key={choice}
                onClick={function() { handleChoice(choice); }}
                disabled={selected !== null}
                style={{
                  padding: "20px 12px",
                  borderRadius: A.r16,
                  border: "2.5px solid " + border,
                  background: bg,
                  color: color,
                  fontSize: 38,
                  fontWeight: 900,
                  boxShadow: shadow,
                  transition: "background 0.15s, border-color 0.15s, transform 0.1s",
                  cursor: selected !== null ? "default" : "pointer",
                  WebkitTapHighlightColor: "transparent",
                  minHeight: 80,
                  transform: "scale(1)",
                  letterSpacing: -0.5,
                }}
              >
                {choice}
              </button>
            );
          })}
        </div>

        {/* Uitlegkaart — verschijnt na fout, blijft tot "Volgende vraag" */}
        {showUitlegBlock && (
          <div style={{
            animation: "acSlideUp 0.22s ease",
          }}>
            {/* TIP blok */}
            <div style={{
              borderRadius: A.r16,
              border: "1.5px solid " + A.tipBorder,
              background: A.tipBg,
              padding: "14px 16px",
              borderLeft: "4px solid " + A.success,
            }}>
              <div style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                marginBottom: fbLevel >= 2 ? 10 : 0,
              }}>
                <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{"💡"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: T.xs, fontWeight: 800, color: A.tipTxt, letterSpacing: 0.8, marginBottom: 3 }}>
                    {"TIP — " + currentSkill.strategy.toUpperCase()}
                  </div>
                  <div style={{ fontSize: T.sm, color: A.tipTxt, lineHeight: 1.55, fontWeight: 600 }}>
                    {typeof currentSkill.tip === "function" ? currentSkill.tip(currentQuestion.terms, currentQuestion.answer) : currentSkill.tip}
                  </div>
                </div>
              </div>

              {/* UITLEG (bij 2+ fouten op deze skill) */}
              {fbLevel >= 2 && (
                <div style={{
                  borderTop: "1px solid " + A.uitlegBorder,
                  paddingTop: 10,
                  marginTop: 2,
                }}>
                  <div style={{ fontSize: T.xs, fontWeight: 800, color: A.uitlegTxt, letterSpacing: 0.8, marginBottom: 4 }}>
                    {"UITLEG"}
                  </div>
                  <div style={{ fontSize: T.sm, color: A.uitlegTxt, lineHeight: 1.55 }}>
                    {currentSkill.uitleg}
                  </div>

                  {/* VOORBEELD (bij 3+ fouten) */}
                  {fbLevel >= 3 && (
                    <div style={{
                      marginTop: 10,
                      padding: "10px 12px",
                      background: A.voorbeeldBg,
                      border: "1.5px solid " + A.voorbeeldBorder,
                      borderRadius: A.r12,
                    }}>
                      <div style={{ fontSize: T.xs, fontWeight: 800, color: A.voorbeeldTxt, letterSpacing: 0.8, marginBottom: 4 }}>
                        {"VOORBEELD"}
                      </div>
                      <div style={{ fontSize: T.sm, color: A.voorbeeldTxt, lineHeight: 1.55, whiteSpace: "pre-line" }}>
                        {currentSkill.voorbeeld}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Volgende vraag knop */}
            <button
              onClick={handleNextQuestion}
              style={{
                marginTop: 12,
                width: "100%",
                padding: "17px 24px",
                background: A.primary,
                color: "#ffffff",
                border: "none",
                borderRadius: A.r16,
                fontSize: T.lg,
                fontWeight: 800,
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
                boxShadow: A.shadowMd,
                letterSpacing: 0.2,
              }}
            >
              {"Volgende vraag →"}
            </button>
          </div>
        )}

        {/* Bij correct: subtiele doorgaan-indicator */}
        {feedback === "correct" && (
          <div style={{
            textAlign: "center",
            fontSize: T.sm,
            color: A.success,
            fontWeight: 700,
            animation: "acFadeIn 0.3s ease",
          }}>
            {"✓ Volgende vraag..."}
          </div>
        )}
      </div>

      {/* Level-up overlay */}
      {showLevelUp && levelUpData && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(26,29,58,0.65)",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 24px",
          backdropFilter: "blur(4px)",
        }}>
          <div style={{
            background: A.bgCard,
            borderRadius: A.r20,
            padding: "40px 28px",
            textAlign: "center",
            boxShadow: A.shadowLg,
            maxWidth: 340,
            width: "100%",
            border: "2px solid " + A.primary,
            animation: "acPopIn 0.22s ease",
          }}>
            <div style={{ fontSize: 56, marginBottom: 14, lineHeight: 1 }}>
              {"🎓"}
            </div>
            <div style={{ fontSize: T.xxl, fontWeight: 900, color: A.text, marginBottom: 6 }}>
              {"Skill beheerst!"}
            </div>
            <div style={{
              fontSize: T.lg,
              fontWeight: 800,
              color: A.primary,
              marginBottom: 8,
            }}>
              {levelUpData.skillLabel}
            </div>
            <div style={{
              display: "inline-block",
              background: A.primaryLight,
              border: "1px solid " + A.border,
              borderRadius: A.r999,
              padding: "4px 14px",
              fontSize: T.sm,
              color: A.primary,
              fontWeight: 700,
              marginBottom: 24,
            }}>
              {levelUpData.liveTotal + " van " + skillOrder.length + " — " + levelUpData.newTitel + " " + (getSubject(subjectId) ? getSubject(subjectId).label.toLowerCase() : "optellen")}
            </div>
            <button
              onClick={handleLevelUpContinue}
              style={{
                background: A.primary,
                color: "#ffffff",
                border: "none",
                borderRadius: A.r16,
                padding: "17px 32px",
                fontSize: T.lg,
                fontWeight: 800,
                cursor: "pointer",
                width: "100%",
                boxShadow: A.shadowMd,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {"Ga verder →"}
            </button>
          </div>
        </div>
      )}

      <style>
        {"@keyframes acPopIn { from { transform: scale(0.82); opacity: 0; } to { transform: scale(1); opacity: 1; } }" +
        "@keyframes acSlideUp { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }" +
        "@keyframes acFadeIn { from { opacity: 0; } to { opacity: 1; } }" +
        "button:active { transform: scale(0.97) !important; }"}
      </style>
    </Screen>
  );
}
