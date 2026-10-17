import { Screen, TopBar, Card, Btn, ProgressBar, Badge, Heading, Body } from "../components/UI.jsx";
import { T } from "../styles/tokens.js";
import { getSubject, OPTELLEN_LEVELS, LEVEL_XP } from "../core/subjects.js";
import { getAccuracy } from "../core/save.js";

export default function SubjectScreen({ subjectId, save, onBack, onStartLevel }) {
  const subject = getSubject(subjectId);
  const data    = save.subjects?.[subjectId] || { unlockedLevels: [1], currentLevel: 1, xp: 0, totalCorrect: 0, totalQuestions: 0 };
  const unlocked = data.unlockedLevels || [1];
  const totalXp  = data.xp || 0;
  const acc      = getAccuracy(data);

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

        {/* Subject stats card */}
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
              <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: T.xs, color: T.textSoft }}>XP</div>
                  <div style={{ fontSize: T.xl, fontWeight: 800, color: subject.color }}>{totalXp}</div>
                </div>
                <div>
                  <div style={{ fontSize: T.xs, color: T.textSoft }}>NAUWKEURIGHEID</div>
                  <div style={{ fontSize: T.xl, fontWeight: 800, color: T.text }}>{acc}%</div>
                </div>
                <div>
                  <div style={{ fontSize: T.xs, color: T.textSoft }}>NIVEAU</div>
                  <div style={{ fontSize: T.xl, fontWeight: 800, color: T.text }}>{data.currentLevel || 1}</div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Levels */}
        <div>
          <div style={{ fontSize: T.sm, fontWeight: 700, color: T.textSoft, letterSpacing: 0.5, marginBottom: 10 }}>
            NIVEAUS
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {OPTELLEN_LEVELS.map((lvl, i) => {
              const isUnlocked = unlocked.includes(lvl.level);
              const isCurrent  = data.currentLevel === lvl.level;
              const isCompleted = unlocked.includes(lvl.level + 1) && lvl.level < 10;
              const xpNeeded   = LEVEL_XP[i] || 0;

              return (
                <Card
                  key={lvl.level}
                  onClick={isUnlocked ? () => onStartLevel(subjectId, lvl.level) : undefined}
                  style={{
                    opacity: isUnlocked ? 1 : 0.45,
                    borderColor: isCurrent
                      ? subject.color + "60"
                      : isCompleted
                        ? T.successLight
                        : T.border,
                    background: isCurrent ? subject.lightColor : T.white,
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {/* Level number circle */}
                    <div style={{
                      width: 40, height: 40,
                      borderRadius: T.r999,
                      background: isCompleted
                        ? T.success
                        : isCurrent
                          ? subject.color
                          : isUnlocked
                            ? subject.lightColor
                            : T.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: (isCompleted || isCurrent) ? T.white : isUnlocked ? subject.color : T.textSoft,
                      fontSize: isCompleted ? T.lg : T.md,
                      fontWeight: 800,
                      flexShrink: 0,
                    }}>
                      {isCompleted ? "✓" : lvl.level}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <div style={{ fontWeight: 700, fontSize: T.md, color: T.text }}>
                          {lvl.label}
                        </div>
                        {isCurrent && (
                          <Badge label="Actief" color={subject.color} bg={subject.lightColor} />
                        )}
                        {!isUnlocked && (
                          <Badge label={"&#128274; " + xpNeeded + " XP"} color={T.textSoft} bg={T.bg} />
                        )}
                      </div>
                      <div style={{ fontSize: T.sm, color: T.textSoft }}>
                        {lvl.desc}
                      </div>
                    </div>

                    {/* Arrow */}
                    {isUnlocked && (
                      <div style={{ color: subject.color, fontSize: 20, fontWeight: 300 }}>
                        &#8250;
                      </div>
                    )}
                    {!isUnlocked && (
                      <div style={{ fontSize: 16 }}>&#128274;</div>
                    )}
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
