import { useState, useEffect, useRef } from "react";
import { Screen, TopBar, Card, ProgressBar } from "../components/UI.jsx";
import { T } from "../styles/tokens.js";
import { getSubject, generateOptellen, OPTELLEN_LEVELS } from "../core/subjects.js";
import { calcXp } from "../core/save.js";

// Sessie van 15 vragen; daarna resultaat maar je kan direct opnieuw
var SESSION_SIZE = 15;

export default function PracticeScreen({ subjectId, level, onBack, onFinish }) {
  var subject  = getSubject(subjectId);
  var levelCfg = OPTELLEN_LEVELS[Math.min(level - 1, OPTELLEN_LEVELS.length - 1)];

  // Genereer de eerste batch vragen
  var initQuestions = useState(function() {
    return Array.from({ length: SESSION_SIZE }, function() {
      return generateOptellen(level);
    });
  });
  var questions    = initQuestions[0];
  var setQuestions = initQuestions[1];

  var qState    = useState(0);
  var qIndex    = qState[0];
  var setQIndex = qState[1];

  var selState  = useState(null);
  var selected  = selState[0];
  var setSelected = selState[1];

  var fbState   = useState(null);   // "correct" | "wrong"
  var feedback  = fbState[0];
  var setFeedback = fbState[1];

  var resState  = useState([]);
  var results   = resState[0];
  var setResults = resState[1];

  var comboState = useState(0);
  var combo      = comboState[0];
  var setCombo   = comboState[1];

  var timeRef   = useRef(Date.now());

  var current   = questions[qIndex];
  var progress  = qIndex / SESSION_SIZE;

  function handleChoice(choice) {
    if (selected !== null) return;

    var timeMs    = Date.now() - timeRef.current;
    var isCorrect = choice === current.answer;
    var xp        = calcXp(level, isCorrect, timeMs);
    var newCombo  = isCorrect ? combo + 1 : 0;

    setSelected(choice);
    setFeedback(isCorrect ? "correct" : "wrong");
    setCombo(newCombo);

    var newResults = results.concat([{
      correct: isCorrect,
      timeMs:  timeMs,
      xp:      xp,
      answer:  current.answer,
      chosen:  choice,
      question: current.question,
    }]);
    setResults(newResults);

    // Auto-advance
    setTimeout(function() {
      var next = qIndex + 1;
      if (next >= SESSION_SIZE) {
        // Sessie klaar
        var totalCorrect = newResults.filter(function(r) { return r.correct; }).length;
        var totalXp      = newResults.reduce(function(s, r) { return s + r.xp; }, 0);
        var avgTime      = Math.round(newResults.reduce(function(s, r) { return s + r.timeMs; }, 0) / newResults.length);
        onFinish({
          subjectId: subjectId,
          level:     level,
          totalCorrect:   totalCorrect,
          totalQuestions: SESSION_SIZE,
          totalXp:   totalXp,
          avgTime:   avgTime,
          results:   newResults,
        });
      } else {
        setQIndex(next);
        setSelected(null);
        setFeedback(null);
        timeRef.current = Date.now();
      }
    }, feedback === null ? 1100 : 900);
  }

  // Achtergrond kleur feedback
  var bgColor = feedback === "correct"
    ? "#f0fdf4"
    : feedback === "wrong"
      ? "#fef2f2"
      : T.bg;

  // Kaart border kleur
  var cardBorder = feedback === "correct"
    ? T.success + "60"
    : feedback === "wrong"
      ? T.error + "60"
      : subject.color + "20";

  var lastRes = results.length > 0 ? results[results.length - 1] : null;

  return (
    <Screen bg={bgColor} style={{ transition: "background 0.25s" }}>
      <TopBar
        title={subject.label + " · Niveau " + level}
        subtitle={levelCfg.desc}
        onBack={onBack}
        color={subject.color}
      />

      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "20px 20px 32px",
        gap: 20,
      }}>

        {/* Progress balk + teller */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: T.sm, color: T.textSoft, fontWeight: 500 }}>
              {qIndex + 1} / {SESSION_SIZE}
            </span>
            {combo >= 2 && (
              <span style={{ fontSize: T.sm, color: "#f59e0b", fontWeight: 700 }}>
                {"🔥"} {combo} op rij!
              </span>
            )}
          </div>
          <ProgressBar value={qIndex} max={SESSION_SIZE} color={subject.color} height={5} />
        </div>

        {/* Vraag + feedback */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 20 }}>

          <Card style={{
            textAlign: "center",
            padding: "44px 28px 36px",
            borderColor: cardBorder,
            boxShadow: T.shadowMd,
            transition: "border-color 0.2s",
          }}>
            {/* Som */}
            <div style={{
              fontSize: 52,
              fontWeight: 900,
              color: T.text,
              letterSpacing: -1,
              lineHeight: 1.1,
              marginBottom: feedback ? 20 : 0,
            }}>
              {current.question}
            </div>

            {/* Feedback tekst */}
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

          {/* Antwoordknoppen */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}>
            {current.choices.map(function(choice) {
              var isSelected    = selected === choice;
              var isCorrectAns  = choice === current.answer;
              var bg           = T.white;
              var border       = T.border;
              var textColor    = T.text;
              var scale        = 1;

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
                    padding: "20px 12px",
                    borderRadius: T.r16,
                    border: "2px solid " + border,
                    background: bg,
                    color: textColor,
                    fontSize: 38,
                    fontWeight: 900,
                    boxShadow: selected === null ? T.shadow : "none",
                    transition: "background 0.15s, border-color 0.15s, transform 0.1s",
                    cursor: selected !== null ? "default" : "pointer",
                    transform: "scale(" + scale + ")",
                    WebkitTapHighlightColor: "transparent",
                    minHeight: 80,
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
