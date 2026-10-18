import { Screen, TopBar, Card, Btn, ProgressBar, Badge } from "../components/UI.jsx";
import { T } from "../styles/tokens.js";
import { getSubject, OPTELLEN_SKILLS, SKILL_ORDER, getNextSkill } from "../core/subjects.js";
import { getAccuracy } from "../core/save.js";

export default function SubjectScreen({ subjectId, save, onBack, onStartLevel }) {
  var subject    = getSubject(subjectId);
  var data       = (save.subjects && save.subjects[subjectId]) || {
    unlockedLevels: [1], currentLevel: 1, xp: 0,
    totalCorrect: 0, totalQuestions: 0,
    skillStats: {}, currentSkillId: "s01_single_easy", totalSkillsMastered: 0,
  };

  var skillStats    = data.skillStats || {};
  var totalMastered = data.totalSkillsMastered || 0;
  var totalXp       = data.xp || 0;
  var acc           = getAccuracy(data);

  // Welke skill is actief?
  var nextSkillInfo = getNextSkill(skillStats);
  var activeSkillId = nextSkillInfo.skillId;

  function startPractice() {
    onStartLevel(subjectId, data.currentLevel || 1);
  }

  return (
    <Screen>
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
        <Card style={{ borderColor: subject.color + "30" }}>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <div style={{
              width: 56, height: 56,
              borderRadius: T.r16,
              background: subject.lightColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              fontWeight: 900,
              color: subject.color,
            }}>
              {subject.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 20, marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: T.xs, color: T.textSoft }}>XP</div>
                  <div style={{ fontSize: T.xl, fontWeight: 800, color: subject.color }}>{totalXp}</div>
                </div>
                <div>
                  <div style={{ fontSize: T.xs, color: T.textSoft }}>NAUWKEURIGHEID</div>
                  <div style={{ fontSize: T.xl, fontWeight: 800, color: T.text }}>{acc}%</div>
                </div>
                <div>
                  <div style={{ fontSize: T.xs, color: T.textSoft }}>SKILLS</div>
                  <div style={{ fontSize: T.xl, fontWeight: 800, color: T.text }}>
                    {totalMastered}/{SKILL_ORDER.length}
                  </div>
                </div>
              </div>
              <ProgressBar
                value={totalMastered}
                max={SKILL_ORDER.length}
                color={subject.color}
                height={5}
              />
            </div>
          </div>
        </Card>

        {/* Start knop */}
        <Btn
          onClick={startPractice}
          color={subject.color}
          size="lg"
          style={{ width: "100%" }}
        >
          {nextSkillInfo.reason === "nieuw"
            ? "Start nieuwe vaardigheid"
            : nextSkillInfo.reason === "herhaling"
              ? "Herhalen en versterken"
              : nextSkillInfo.reason === "verdiepen"
                ? "Verdiepen en combineren"
                : "Oefenen"
          }
        </Btn>

        {/* Skills overzicht */}
        <div>
          <div style={{ fontSize: T.sm, fontWeight: 700, color: T.textSoft, letterSpacing: 0.5, marginBottom: 10 }}>
            VAARDIGHEDEN
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

            {OPTELLEN_SKILLS.map(function(skill, i) {
              var stats    = skillStats[skill.id] || { correct: 0, attempts: 0, mastered: false };
              var mastered = stats.mastered;
              var active   = skill.id === activeSkillId;
              var started  = stats.attempts > 0;

              // Skill is beschikbaar als de vorige beheerst is (of het is de eerste)
              var available = i === 0
                || (skillStats[SKILL_ORDER[i - 1]] && skillStats[SKILL_ORDER[i - 1]].mastered)
                || mastered
                || active;

              var progress = mastered ? 1
                : (skill.minCorrect > 0 ? Math.min(stats.correct / skill.minCorrect, 0.99) : 0);

              return (
                <Card
                  key={skill.id}
                  style={{
                    opacity: available ? 1 : 0.4,
                    borderColor: mastered
                      ? T.success + "60"
                      : active
                        ? subject.color + "60"
                        : T.border,
                    background: mastered
                      ? "#f0fdf4"
                      : active
                        ? subject.lightColor
                        : T.white,
                    padding: "12px 14px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

                    {/* Status cirkel */}
                    <div style={{
                      width: 38, height: 38,
                      borderRadius: T.r999,
                      background: mastered
                        ? T.success
                        : active
                          ? subject.color
                          : available
                            ? subject.lightColor
                            : T.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: (mastered || active) ? T.white : available ? subject.color : T.textSoft,
                      fontSize: mastered ? 16 : T.sm,
                      fontWeight: 800,
                      flexShrink: 0,
                    }}>
                      {mastered ? "✓" : (i + 1)}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 700, fontSize: T.sm, color: T.text }}>
                          {skill.label}
                        </div>
                        {active && !mastered && (
                          <Badge label="Actief" color={subject.color} bg={subject.lightColor} />
                        )}
                        {mastered && (
                          <Badge label="Beheerst" color="#166534" bg="#dcfce7" />
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: T.textSoft, marginBottom: started && !mastered ? 5 : 0 }}>
                        {skill.desc}
                      </div>
                      {/* Mini progress bar */}
                      {started && !mastered && (
                        <div style={{ height: 3, background: T.border, borderRadius: 99, overflow: "hidden" }}>
                          <div style={{
                            height: "100%",
                            width: Math.round(progress * 100) + "%",
                            background: subject.color,
                            borderRadius: 99,
                            transition: "width 0.3s",
                          }} />
                        </div>
                      )}
                    </div>

                    {/* Strategy chip */}
                    <div style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: available ? subject.color : T.textSoft,
                      background: available ? subject.lightColor : T.bg,
                      borderRadius: T.r8,
                      padding: "3px 7px",
                      flexShrink: 0,
                      textTransform: "uppercase",
                      letterSpacing: 0.3,
                    }}>
                      {skill.strategy}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

      </div>
    </Screen>
  );
}
