import { useState, useEffect, useRef } from "react";
import { Screen, TopBar, Card, ProgressBar } from "../components/UI.jsx";
import { T } from "../styles/tokens.js";
import { getSubject, generateAdaptive, generateOptellen, getSkill, SKILL_ORDER } from "../core/subjects.js";
import { calcSkillXp, calcXp } from "../core/save.js";

// Sessie van 12 vragen per keer (oneindig: na afloop direct opnieuw)
var SESSION_SIZE = 12;

// ── FEEDBACK LEVELS ───────────────────────────────────────────────
// Na 1 fout: tip (kort, groen)
// Na 2 fouten op zelfde skill: uitleg (blauw, iets langer)
// Na 3+ fouten op zelfde skill: voorbeeld (oranje, doorgerekend)

export default function PracticeScreen({ subjectId, level, skillStats, onBack, onFinish }) {
  var subject = getSubject(subjectId);

  // ── State ──────────────────────────────────────────────────────
  var qState       = useState(function() { return genQuestions(level, skillStats); });
  var questions    = qState[0];
  var setQuestions = qState[1];

  var idxState  = useState(0);
  var qIndex    = idxState[0];
  var setQIndex = idxState[1];

  var selState    = useState(null);
  var selected    = selState[0];
  var setSelected = selState[1];

  var fbState     = useState(null);   // "correct" | "wrong"
  var feedback    = fbState[0];
  var setFeedback = fbState[1];

  var resState    = useState([]);
  var results     = resState[0];
  var setResults  = resState[1];

  var comboState  = useState(0);
  var combo       = comboState[0];
  var setCombo    = comboState[1];

  // fouten per skill-id in deze sessie (voor feedback-escalatie)
  var skillErrState = useState({});
  var skillErrors   = skillErrState[0];
  var setSkillErrors = skillErrState[1];

  // Welk feedback-niveau tonen we? 0=geen, 1=tip, 2=uitleg, 3=voorbeeld
  var fbLvlState  = useState(0);
  var fbLevel     = fbLvlState[0];
  var setFbLevel  = fbLvlState[1];

  // Tip uitklappen
  var tipOpenState = useState(false);
  var tipOpen      = tipOpenState[0];
  var setTipOpen   = tipOpenState[1];

  var timeRef = useRef(Date.now());

  var current = questions[qIndex];

  // Haal skill op voor huidige vraag
  var currentSkill = current && current.skill ? current.skill : (current ? getSkill(current.skillId || "s01_single_easy") : null);
  var skillIdx     = currentSkill ? SKILL_ORDER.indexOf(currentSkill.id) : 0;

  function handleChoice(choice) {
    if (selected !== null) return;

    var timeMs    = Date.now() - timeRef.current;
    var isCorrect = choice === current.answer;
    var xp        = calcSkillXp(skillIdx >= 0 ? skillIdx : 0, isCorrect, timeMs);
    var newCombo  = isCorrect ? combo + 1 : 0;

    setSelected(choice);
    setFeedback(isCorrect ? "correct" : "wrong");
    setCombo(newCombo);

    // Feedback-niveau bepalen
    var newSkillErrors = {};
    for (var k in skillErrors) { newSkillErrors[k] = skillErrors[k]; }
    if (!isCorrect && currentSkill) {
      var sid = currentSkill.id;
      newSkillErrors[sid] = (newSkillErrors[sid] || 0) + 1;
      setSkillErrors(newSkillErrors);
      var errCount = newSkillErrors[sid];
      setFbLevel(errCount >= 3 ? 3 : errCount >= 2 ? 2 : 1);
    } else {
      setFbLevel(0);
    }
    setTipOpen(false);

    var newResults = results.concat([{
      correct:  isCorrect,
      timeMs:   timeMs,
      xp:       xp,
      answer:   current.answer,
      chosen:   choice,
      question: current.question,
      skillId:  current.skillId || (currentSkill ? currentSkill.id : ""),
    }]);
    setResults(newResults);

    // Auto-advance
    setTimeout(function() {
      var next = qIndex + 1;
      if (next >= SESSION_SIZE) {
        // Sessie klaar — stuur resultaten op
        var totalCorrect = newResults.filter(function(r) { return r.correct; }).length;
        var totalXp      = newResults.reduce(function(s, r) { return s + r.xp; }, 0);
        var avgTime      = Math.round(newResults.reduce(function(s, r) { return s + r.timeMs; }, 0) / newResults.length);

        // Skill-stats per skill-id verzamelen
        var sessionSkillStats = {};
        newResults.forEach(function(r) {
          var sid = r.skillId;
          if (!sid) return;
          if (!sessionSkillStats[sid]) { sessionSkillStats[sid] = { correct: 0, total: 0 }; }
          sessionSkillStats[sid].total += 1;
          if (r.correct) sessionSkillStats[sid].correct += 1;
        });

        onFinish({
          subjectId:      subjectId,
          level:          level,
          totalCorrect:   totalCorrect,
          totalQuestions: SESSION_SIZE,
          totalXp:        totalXp,
          avgTime:        avgTime,
          results:        newResults,
          sessionSkillStats: sessionSkillStats,
          dominantSkillId: current.skillId || "",
        });
      } else {
        setQIndex(next);
        setSelected(null);
        setFeedback(null);
        setFbLevel(0);
        setTipOpen(false);
        timeRef.current = Date.now();
      }
    }, isCorrect ? 900 : 1400);
  }

  // ── Kleuren op basis van feedback ─────────────────────────────
  var bgColor    = feedback === "correct" ? "#f0fdf4"
    : feedback === "wrong"   ? "#fef2f2"
    : T.bg;

  var cardBorder = feedback === "correct" ? T.success + "60"
    : feedback === "wrong"   ? T.error + "60"
    : subject.color + "20";

  var lastRes = results.length > 0 ? results[results.length - 1] : null;

  // ── Skill voortgang balk (hoeveel van de skill-correcten) ──────
  var skillCorrectSoFar = 0;
  if (currentSkill) {
    for (var i = 0; i < results.length; i++) {
      if (results[i].skillId === currentSkill.id && results[i].correct) skillCorrectSoFar++;
    }
  }
  var skillTarget = currentSkill ? (currentSkill.minCorrect || 8) : 8;

  // ── Welk feedback-blok tonen? ─────────────────────────────────
  var showFeedbackBlock = feedback === "wrong" && fbLevel > 0 && currentSkill;

  return (
    <Screen bg={bgColor} style={{ transition: "background 0.25s" }}>
      <TopBar
        title={"Optellen" + (currentSkill ? (" · " + currentSkill.label) : "")}
        subtitle={currentSkill ? currentSkill.desc : ""}
        onBack={onBack}
        color={subject.color}
      />

      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "16px 20px 28px",
        gap: 14,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}>

        {/* Progress + combo */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: T.sm, color: T.textSoft, fontWeight: 500 }}>
              {qIndex + 1} / {SESSION_SIZE}
            </span>
            {combo >= 2 && (
              <span style={{ fontSize: T.sm, color: "#f59e0b", fontWeight: 700 }}>
                {"🔥"} {combo} op rij!
              </span>
            )}
          </div>
          <ProgressBar value={qIndex} max={SESSION_SIZE} color={subject.color} height={4} />
        </div>

        {/* Vraag + feedback */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>

          <Card style={{
            textAlign: "center",
            padding: "40px 24px 32px",
            borderColor: cardBorder,
            boxShadow: T.shadowMd,
            transition: "border-color 0.2s",
          }}>

            {/* Strategie label (klein, boven de som) */}
            {currentSkill && currentSkill.strategy && !feedback && (
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: subject.color + "80",
                letterSpacing: 0.8,
                textTransform: "uppercase",
                marginBottom: 10,
              }}>
                {currentSkill.strategy}
              </div>
            )}

            {/* De som */}
            <div style={{
              fontSize: 52,
              fontWeight: 900,
              color: T.text,
              letterSpacing: -1,
              lineHeight: 1.1,
              marginBottom: feedback ? 18 : 0,
            }}>
              {current.question}
            </div>

            {/* Feedback na antwoord */}
            {feedback && lastRes && (
              <div style={{
                fontSize: T.lg,
                fontWeight: 700,
                color: feedback === "correct" ? T.success : T.error,
                animation: "popIn 0.2s ease",
              }}>
                {feedback === "correct"
                  ? ("+" + lastRes.xp + " XP" + (combo >= 3 ? "  🔥" : ""))
                  : ("✖  Antwoord: " + current.answer)
                }
              </div>
            )}
          </Card>

          {/* ── Feedback blok (tip / uitleg / voorbeeld) ── */}
          {showFeedbackBlock && (
            <div>
              {/* TIP (altijd tonen bij fout) */}
              <div
                onClick={function() { setTipOpen(function(v) { return !v; }); }}
                style={{
                  borderRadius: T.r12,
                  border: "1px solid #bbf7d0",
                  background: "#f0fdf4",
                  padding: "10px 14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  marginBottom: fbLevel >= 2 && tipOpen ? 0 : 0,
                }}
              >
                <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{"💡"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: T.xs, fontWeight: 700, color: "#166534", marginBottom: 2 }}>
                    {"TIP — " + currentSkill.strategy.toUpperCase()}
                  </div>
                  <div style={{ fontSize: T.sm, color: "#15803d", lineHeight: 1.4 }}>
                    {currentSkill.tip}
                  </div>
                </div>
                {fbLevel >= 2 && (
                  <span style={{
                    fontSize: 11,
                    color: "#166534",
                    transform: tipOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                    display: "inline-block",
                    marginTop: 2,
                  }}>
                    {"▼"}
                  </span>
                )}
              </div>

              {/* UITLEG (na 2 fouten, uitklapbaar) */}
              {fbLevel >= 2 && tipOpen && (
                <div style={{
                  borderRadius: "0 0 " + T.r12 + " " + T.r12,
                  border: "1px solid #bfdbfe",
                  borderTop: "none",
                  background: "#eff6ff",
                  padding: "10px 14px",
                }}>
                  <div style={{ fontSize: T.xs, fontWeight: 700, color: "#1e40af", marginBottom: 4 }}>
                    UITLEG
                  </div>
                  <div style={{ fontSize: T.sm, color: "#1d4ed8", lineHeight: 1.5 }}>
                    {currentSkill.uitleg}
                  </div>

                  {/* VOORBEELD (na 3 fouten) */}
                  {fbLevel >= 3 && (
                    <div style={{
                      marginTop: 10,
                      padding: "8px 10px",
                      background: "#fef3c7",
                      border: "1px solid #fde68a",
                      borderRadius: T.r8,
                    }}>
                      <div style={{ fontSize: T.xs, fontWeight: 700, color: "#92400e", marginBottom: 4 }}>
                        VOORBEELD
                      </div>
                      <div style={{
                        fontSize: T.sm,
                        color: "#78350f",
                        lineHeight: 1.5,
                        whiteSpace: "pre-line",
                      }}>
                        {currentSkill.voorbeeld}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Antwoordknoppen */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}>
            {current.choices.map(function(choice) {
              var isSelected   = selected === choice;
              var isCorrectAns = choice === current.answer;
              var bg           = T.white;
              var border       = T.border;
              var textColor    = T.text;

              if (feedback) {
                if (isCorrectAns) {
                  bg = T.successLight; border = T.success; textColor = "#166534";
                } else if (isSelected) {
                  bg = T.errorLight; border = T.error; textColor = "#991b1b";
                }
              }

              return (
                <button
                  key={choice}
                  onClick={function() { handleChoice(choice); }}
                  disabled={selected !== null}
                  style={{
                    padding: "18px 12px",
                    borderRadius: T.r16,
                    border: "2px solid " + border,
                    background: bg,
                    color: textColor,
                    fontSize: 36,
                    fontWeight: 900,
                    boxShadow: selected === null ? T.shadow : "none",
                    transition: "background 0.15s, border-color 0.15s",
                    cursor: selected !== null ? "default" : "pointer",
                    WebkitTapHighlightColor: "transparent",
                    minHeight: 76,
                  }}
                >
                  {choice}
                </button>
              );
            })}
          </div>

        </div>
      </div>

      <style>{"@keyframes popIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }"}</style>
    </Screen>
  );
}

// ── Vraag-batch genereren ─────────────────────────────────────────
// Genereert SESSION_SIZE vragen adaptief op basis van skillStats.
// Bij gebruik vanuit legacy level-flow: valt terug op level-gebaseerde gen.

function genQuestions(level, skillStats) {
  var questions = [];
  for (var i = 0; i < SESSION_SIZE; i++) {
    var q;
    if (skillStats && Object.keys(skillStats).length >= 0) {
      // Adaptive: gebruik skillStats
      // Af en toe wisselen we van skill (na 4 vragen) voor variatie
      q = generateAdaptive(skillStats);
    } else {
      q = generateOptellen(level || 1);
    }
    questions.push(q);
  }
  return questions;
}
