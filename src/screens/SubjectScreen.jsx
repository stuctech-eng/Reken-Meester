import { useState } from "react";
import { Screen, TopBar, Card, Btn, ProgressBar, Badge } from "../components/UI.jsx";
import { A, T } from "../styles/tokens.js";
import { getSubject, getSkillList, getSkillOrder, getNextSkill } from "../core/subjects.js";
import { getAccuracy } from "../core/save.js";
import { typingAvailable } from "../core/answerCheck.js";

// NO BACKTICKS / TEMPLATE LITERALS anywhere. String concatenation only.

// onPracticeSkill (optioneel): tik op een vaardigheid = die ene vaardigheid los oefenen
// (telt nergens mee). Ook vaardigheden die in de leerlijn nog op slot staan.
// onAnswerMode (optioneel): schakelaar Kiezen | Typen voor deze modus. Alleen zichtbaar als de
// modus Typen ondersteunt (answerCheck.js); de keuze staat in save.answerModes.
export default function SubjectScreen({ subjectId, save, onBack, onStartLevel, onPracticeSkill, onAnswerMode }) {
  var subject    = getSubject(subjectId);
  var skillList  = getSkillList(subjectId);
  var skillOrder = getSkillOrder(subjectId);
  var data    = (save.subjects && save.subjects[subjectId]) || {
    unlockedLevels: [1], currentLevel: 1, xp: 0,
    totalCorrect: 0, totalQuestions: 0,
    skillStats: {}, currentSkillId: "s01_single_easy", totalSkillsMastered: 0,
  };

  var skillStats    = data.skillStats || {};
  var answerMode    = (save.answerModes && save.answerModes[subjectId] === "typen") ? "typen" : "kiezen";
  var totalMastered = data.totalSkillsMastered || 0;
  var acc           = getAccuracy(data);

  var nextSkillInfo = getNextSkill(subjectId, skillStats);
  var activeSkillId = nextSkillInfo.skillId;

  // Beheerste vaardigheden standaard ingeklapt; alleen de laatst behaalde (hoogste in de
  // volgorde) blijft zichtbaar. Elk bezoek aan dit scherm begint weer ingeklapt.
  var collapseState = useState(true);
  var collapsed     = collapseState[0];
  var setCollapsed  = collapseState[1];

  var masteredIdx = [];
  skillOrder.forEach(function(id, i) {
    if (skillStats[id] && skillStats[id].mastered) masteredIdx.push(i);
  });
  var lastMasteredIdx = masteredIdx.length > 0 ? masteredIdx[masteredIdx.length - 1] : -1;
  var hiddenCount     = masteredIdx.length - 1;
  var canCollapse     = masteredIdx.length >= 2;

  function startPractice() {
    onStartLevel(subjectId, data.currentLevel || 1);
  }

  var startLabel = nextSkillInfo.reason === "nieuw"
    ? "Start nieuwe vaardigheid"
    : nextSkillInfo.reason === "herhaling"
      ? "Herhalen en versterken"
      : nextSkillInfo.reason === "verdiepen"
        ? "Verdiepen en combineren"
        : "Oefenen";

  return (
    <Screen bg={A.bg}>
      <TopBar
        title={subject.label}
        subtitle={subject.description}
        onBack={onBack}
        color={subject.color}
      />

      <div style={{
        flex: 1,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        padding: "20px 20px 40px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}>

        {/* Stats card */}
        <div style={{
          background: A.bgCard,
          border: "1.5px solid " + subject.color + "35",
          borderRadius: A.r20,
          padding: "20px 18px",
          boxShadow: A.shadowMd,
        }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: A.r16,
              background: subject.color + "18",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              flexShrink: 0,
            }}>
              {subject.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 24, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: T.xs, color: A.textSoft, fontWeight: 700, letterSpacing: 0.5, marginBottom: 2 }}>
                    {"BEHEERST"}
                  </div>
                  <div style={{ fontSize: T.xl, fontWeight: 900, color: subject.color }}>
                    {totalMastered + "/" + skillOrder.length}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: T.xs, color: A.textSoft, fontWeight: 700, letterSpacing: 0.5, marginBottom: 2 }}>
                    {"NAUWKEURIGHEID"}
                  </div>
                  <div style={{ fontSize: T.xl, fontWeight: 900, color: A.text }}>
                    {acc + "%"}
                  </div>
                </div>
              </div>
              <div style={{
                height: 6,
                background: A.border,
                borderRadius: A.r999,
                overflow: "hidden",
              }}>
                <div style={{
                  height: "100%",
                  width: Math.round((totalMastered / skillOrder.length) * 100) + "%",
                  background: subject.color,
                  borderRadius: A.r999,
                  transition: "width 0.4s ease",
                }} />
              </div>
            </div>
          </div>
        </div>

        {/* Start knop */}
        <button
          onClick={startPractice}
          style={{
            width: "100%",
            padding: "18px 24px",
            background: subject.color,
            color: "#ffffff",
            border: "none",
            borderRadius: A.r16,
            fontSize: T.lg,
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 6px 20px " + subject.color + "40",
            WebkitTapHighlightColor: "transparent",
            letterSpacing: 0.2,
          }}
        >
          {startLabel + " →"}
        </button>

        {/* Antwoord: Kiezen | Typen (alleen bij modi die Typen ondersteunen) */}
        {onAnswerMode && typingAvailable(subjectId) && (
          <div>
            <div style={{ fontSize: T.xs, fontWeight: 800, color: A.textSoft, letterSpacing: 0.8, marginBottom: 8 }}>
              {"ANTWOORD"}
            </div>
            <div role="radiogroup" aria-label="Antwoord geven" style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 4,
              padding: 4,
              background: A.border,
              borderRadius: A.r16,
            }}>
              {[["kiezen", "Kiezen"], ["typen", "Typen"]].map(function(opt) {
                var on = answerMode === opt[0];
                return (
                  <button
                    key={opt[0]}
                    role="radio"
                    aria-checked={on}
                    onClick={function() { if (!on) onAnswerMode(subjectId, opt[0]); }}
                    style={{
                      minHeight: 44,
                      padding: "10px 12px",
                      border: "none",
                      borderRadius: A.r12,
                      background: on ? A.bgCard : "transparent",
                      color: on ? subject.color : A.textSoft,
                      fontSize: T.md,
                      fontWeight: 800,
                      boxShadow: on ? A.shadow : "none",
                      cursor: on ? "default" : "pointer",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    {opt[1]}
                  </button>
                );
              })}
            </div>
            {answerMode === "typen" && (
              <div style={{ fontSize: 11, color: A.textSoft, fontWeight: 600, marginTop: 6 }}>
                {"Je typt het antwoord met het cijferblok. Schatten en fout spotten blijven kiezen."}
              </div>
            )}
          </div>
        )}

        {/* Vaardigheden lijst */}
        <div>
          <div style={{ fontSize: T.xs, fontWeight: 800, color: A.textSoft, letterSpacing: 0.8, marginBottom: 12 }}>
            {"VAARDIGHEDEN"}
          </div>
          {onPracticeSkill && (
            <div style={{ fontSize: 11, color: A.textSoft, fontWeight: 600, marginTop: -6, marginBottom: 12 }}>
              {"Tik op een vaardigheid om die los te oefenen (telt niet mee)."}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

            {canCollapse && (
              <button
                onClick={function() { setCollapsed(!collapsed); }}
                aria-expanded={!collapsed}
                style={{
                  minHeight: 44,
                  padding: "10px 14px",
                  background: A.successBg,
                  border: "1.5px solid " + A.successBorder,
                  borderRadius: A.r16,
                  color: A.successTxt,
                  fontSize: T.sm,
                  fontWeight: 800,
                  textAlign: "left",
                  cursor: "pointer",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {collapsed
                  ? ("▸ " + hiddenCount + (hiddenCount === 1 ? " beheerste vaardigheid tonen" : " beheerste vaardigheden tonen"))
                  : "▾ Beheerste vaardigheden verbergen"}
              </button>
            )}

            {skillOrder.map(function(skillId, i) {
              var skill    = skillList.find(function(s) { return s.id === skillId; });
              if (!skill) return null;
              var stats    = skillStats[skill.id] || { correct: 0, attempts: 0, mastered: false };
              var mastered = stats.mastered;
              if (collapsed && canCollapse && mastered && i !== lastMasteredIdx) return null;
              var active   = skill.id === activeSkillId;
              var started  = (stats.attempts || 0) > 0 || (stats.total || 0) > 0;

              var available = i === 0
                || (skillStats[skillOrder[i - 1]] && skillStats[skillOrder[i - 1]].mastered)
                || mastered
                || active;

              var progress = mastered ? 1
                : (skill.minCorrect > 0 ? Math.min((stats.correct || 0) / skill.minCorrect, 0.99) : 0);

              var cardBg = mastered
                ? A.successBg
                : active
                  ? A.primaryLight
                  : A.bgCard;
              var cardBorder = mastered
                ? A.successBorder
                : active
                  ? subject.color + "50"
                  : A.border;

              return (
                <div
                  key={skill.id}
                  role={onPracticeSkill ? "button" : undefined}
                  tabIndex={onPracticeSkill ? 0 : undefined}
                  onClick={onPracticeSkill ? function() { onPracticeSkill(subjectId, skill.id); } : undefined}
                  style={{
                    cursor: onPracticeSkill ? "pointer" : undefined,
                    WebkitTapHighlightColor: onPracticeSkill ? "transparent" : undefined,
                    background: cardBg,
                    border: "1.5px solid " + cardBorder,
                    borderRadius: A.r16,
                    padding: "12px 14px",
                    opacity: available ? 1 : 0.38,
                    boxShadow: A.shadow,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

                    {/* Status indicator */}
                    <div style={{
                      width: 38,
                      height: 38,
                      borderRadius: A.r999,
                      background: mastered
                        ? A.success
                        : active
                          ? subject.color
                          : available
                            ? subject.color + "18"
                            : A.bgCardHigh,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: (mastered || active) ? "#ffffff" : available ? subject.color : A.textSoft,
                      fontSize: mastered ? 16 : T.sm,
                      fontWeight: 900,
                      flexShrink: 0,
                    }}>
                      {mastered ? "✓" : (i + 1)}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 800, fontSize: T.sm, color: A.text }}>
                          {skill.label}
                        </div>
                        {active && !mastered && (
                          <Badge label={"Actief"} color={subject.color} bg={subject.color + "18"} />
                        )}
                        {mastered && (
                          <Badge label={"Beheerst"} color={A.successTxt} bg={A.successBg} />
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: A.textSoft, marginBottom: started && !mastered ? 6 : 0, fontWeight: 500 }}>
                        {skill.desc}
                      </div>
                      {started && !mastered && (
                        <div style={{
                          height: 4,
                          background: A.border,
                          borderRadius: A.r999,
                          overflow: "hidden",
                        }}>
                          <div style={{
                            height: "100%",
                            width: Math.round(progress * 100) + "%",
                            background: subject.color,
                            borderRadius: A.r999,
                            transition: "width 0.3s",
                          }} />
                        </div>
                      )}
                    </div>

                    {/* Strategy chip */}
                    <div style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: available ? subject.color : A.textSoft,
                      background: available ? subject.color + "15" : A.bgCardHigh,
                      borderRadius: A.r8,
                      padding: "4px 8px",
                      flexShrink: 0,
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                    }}>
                      {skill.strategy}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </Screen>
  );
}
