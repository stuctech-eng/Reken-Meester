import { useState, useEffect, useRef } from "react";
import { Screen, TopBar, Card, Btn, ProgressBar, Badge } from "../components/UI.jsx";
import { T } from "../styles/tokens.js";
import { getSubject, generateOptellen, OPTELLEN_LEVELS } from "../core/subjects.js";
import { calcXp } from "../core/save.js";

const QUESTIONS_PER_SESSION = 10;

export default function PracticeScreen({ subjectId, level, onBack, onFinish }) {
  const subject = getSubject(subjectId);
  const levelCfg = OPTELLEN_LEVELS[Math.min(level - 1, OPTELLEN_LEVELS.length - 1)];

  const [questions]   = useState(() => Array.from({ length: QUESTIONS_PER_SESSION }, () => generateOptellen(level)));
  const [qIndex, setQIndex]   = useState(0);
  const [selected, setSelected] = useState(null);   // chosen answer
  const [feedback, setFeedback] = useState(null);    // "correct" | "wrong"
  const [results, setResults]   = useState([]);      // { correct, timeMs, xp }
  const [combo, setCombo]       = useState(0);
  const [startTime, setStartTime] = useState(Date.now());

  const current = questions[qIndex];
  const progress = qIndex / QUESTIONS_PER_SESSION;

  function handleChoice(choice) {
    if (selected !== null) return;   // already answered
    const timeMs  = Date.now() - startTime;
    const isCorrect = choice === current.answer;
    const xp = calcXp(level, isCorrect, timeMs);
    const newCombo = isCorrect ? combo + 1 : 0;

    setSelected(choice);
    setFeedback(isCorrect ? "correct" : "wrong");
    setCombo(newCombo);

    const newResults = [...results, { correct: isCorrect, timeMs, xp, answer: current.answer, chosen: choice }];
    setResults(newResults);

    // Auto-advance after short delay
    setTimeout(() => {
      if (qIndex + 1 >= QUESTIONS_PER_SESSION) {
        // Session done — calculate summary
        const totalCorrect  = newResults.filter(r => r.correct).length;
        const totalXp       = newResults.reduce((s, r) => s + r.xp, 0);
        const avgTime       = Math.round(newResults.reduce((s, r) => s + r.timeMs, 0) / newResults.length);
        onFinish({
          subjectId,
          level,
          totalCorrect,
          totalQuestions: QUESTIONS_PER_SESSION,
          totalXp,
          avgTime,
          results: newResults,
        });
      } else {
        setQIndex(i => i + 1);
        setSelected(null);
        setFeedback(null);
        setStartTime(Date.now());
      }
    }, 900);
  }

  const bgColor = feedback === "correct"
    ? "#f0fdf4"
    : feedback === "wrong"
      ? "#fef2f2"
      : T.bg;

  return (
    <Screen bg={bgColor} style={{ transition: "background 0.3s" }}>
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
        padding: "20px",
        gap: 20,
      }}>

        {/* Progress */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: T.sm, color: T.textSoft }}>
              Vraag {qIndex + 1} van {QUESTIONS_PER_SESSION}
            </span>
            {combo >= 2 && (
              <span style={{ fontSize: T.sm, color: "#f59e0b", fontWeight: 700 }}>
                &#128293; {combo} op rij!
              </span>
            )}
          </div>
          <ProgressBar value={qIndex} max={QUESTIONS_PER_SESSION} color={subject.color} height={6} />
        </div>

        {/* Question card */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 24 }}>
          <Card style={{
            textAlign: "center",
            padding: "40px 24px",
            borderColor: feedback === "correct"
              ? T.success + "60"
              : feedback === "wrong"
                ? T.error + "60"
                : subject.color + "20",
            boxShadow: T.shadowMd,
          }}>
            <div style={{
              fontSize: 48,
              fontWeight: 900,
              color: T.text,
              letterSpacing: -1,
              lineHeight: 1.1,
            }}>
              {current.question}
            </div>

            {feedback && (
              <div style={{
                marginTop: 16,
                fontSize: T.xl,
                fontWeight: 800,
                color: feedback === "correct" ? T.success : T.error,
              }}>
                {feedback === "correct"
                  ? "Goed zo! +" + results[results.length - 1]?.xp + " XP"
                  : "Helaas. Het was " + current.answer
                }
              </div>
            )}
          </Card>

          {/* Answer choices */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}>
            {current.choices.map(choice => {
              const isSelected = selected === choice;
              const isCorrectChoice = choice === current.answer;
              let bg = T.white;
              let borderColor = T.border;
              let textColor = T.text;

              if (feedback) {
                if (isCorrectChoice) {
                  bg = T.successLight;
                  borderColor = T.success;
                  textColor = "#166534";
                } else if (isSelected && !isCorrectChoice) {
                  bg = T.errorLight;
                  borderColor = T.error;
                  textColor = "#991b1b";
                }
              }

              return (
                <button
                  key={choice}
                  onClick={() => handleChoice(choice)}
                  disabled={selected !== null}
                  style={{
                    padding: "18px 12px",
                    borderRadius: T.r16,
                    border: "2px solid " + borderColor,
                    background: bg,
                    color: textColor,
                    fontSize: T.xxxl,
                    fontWeight: 800,
                    boxShadow: T.shadow,
                    transition: "all 0.15s",
                    cursor: selected !== null ? "default" : "pointer",
                  }}
                >
                  {choice}
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </Screen>
  );
}
