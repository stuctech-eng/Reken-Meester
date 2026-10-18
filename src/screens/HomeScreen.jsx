import { Screen, Card, Btn, ProgressBar, Badge, Heading, Body } from "../components/UI.jsx";
import { T, D } from "../styles/tokens.js";
import { SUBJECTS } from "../core/subjects.js";
import { getAccuracy, getTitel, getNextTitel, TITEL_MILESTONES } from "../core/save.js";
import { SKILL_ORDER } from "../core/subjects.js";

export default function HomeScreen({ save, uid, onSubject, onSettings }) {
  var optData       = save.subjects && save.subjects.optellen ? save.subjects.optellen : {};
  var acc           = getAccuracy(optData);
  var totalMastered = optData.totalSkillsMastered || 0;
  var titelObj      = getTitel(totalMastered);
  var nextTitelObj  = getNextTitel(totalMastered);

  var displayName = save.displayName || "Leerling";
  var initials    = displayName.slice(0, 2).toUpperCase();

  return (
    <Screen bg={D.bg}>
      {/* Header */}
      <div style={{
        background: D.bgCard,
        borderBottom: "1px solid " + D.border,
        padding: "20px 20px 16px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: T.sm, color: D.textSoft, marginBottom: 2 }}>
              Welkom terug,
            </div>
            <Heading size={T.xxl} color={D.text}>{displayName}</Heading>
          </div>

          {/* Profiel knop */}
          <button
            onClick={onSettings}
            style={{
              width: 44, height: 44,
              borderRadius: T.r999,
              background: D.primary,
              border: "none",
              color: D.text,
              fontSize: 15,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
              letterSpacing: 0.5,
            }}
          >
            {initials}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        padding: "20px 20px 96px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}>

        {/* Titel card */}
        <Card style={{ background: D.primary, border: "none", boxShadow: D.shadowMd }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: T.xs, color: "rgba(255,255,255,0.7)", marginBottom: 2 }}>
                JOUW TITEL
              </div>
              <div style={{ fontSize: T.xxl, fontWeight: 800, color: "#ffffff" }}>
                {titelObj.label}
              </div>
            </div>
            <div style={{
              width: 52, height: 52,
              borderRadius: T.r12,
              background: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: T.md,
              fontWeight: 900,
              color: "#ffffff",
              textAlign: "center",
            }}>
              {totalMastered + "/" + SKILL_ORDER.length}
            </div>
          </div>
          <ProgressBar
            value={totalMastered}
            max={SKILL_ORDER.length}
            color="rgba(255,255,255,0.9)"
            height={6}
            style={{ background: "rgba(255,255,255,0.2)" }}
          />
          <div style={{ fontSize: T.xs, color: "rgba(255,255,255,0.65)", marginTop: 6 }}>
            {nextTitelObj
              ? (nextTitelObj.minSkills - totalMastered) + " skills voor " + nextTitelObj.label
              : "Alle skills beheerst! " + "🎓"
            }
          </div>
        </Card>

        {/* Quick stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Card style={{ padding: "14px 16px", background: D.bgCard, borderColor: D.border }}>
            <div style={{ fontSize: T.xs, color: D.textSoft, marginBottom: 4 }}>NAUWKEURIGHEID</div>
            <div style={{ fontSize: T.xxl, fontWeight: 800, color: acc >= 80 ? D.success : acc >= 60 ? D.gold : D.error }}>
              {acc}%
            </div>
          </Card>
          <Card style={{ padding: "14px 16px", background: D.bgCard, borderColor: D.border }}>
            <div style={{ fontSize: T.xs, color: D.textSoft, marginBottom: 4 }}>SESSIES</div>
            <div style={{ fontSize: T.xxl, fontWeight: 800, color: D.text }}>
              {save.totalSessions || 0}
            </div>
          </Card>
        </div>

        {/* Subjects */}
        <div>
          <div style={{ fontSize: T.sm, fontWeight: 700, color: D.textSoft, letterSpacing: 0.5, marginBottom: 10 }}>
            ONDERDELEN
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {SUBJECTS.map(function(subject) {
              var data    = (save.subjects && save.subjects[subject.id]) ? save.subjects[subject.id] : {};
              var mastered = data.totalSkillsMastered || 0;
              var isAvail = subject.available;

              return (
                <Card
                  key={subject.id}
                  onClick={isAvail ? function() { onSubject(subject.id); } : undefined}
                  style={{
                    opacity: isAvail ? 1 : 0.55,
                    borderColor: isAvail ? subject.color + "40" : D.border,
                    background: D.bgCard,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {/* Icon */}
                    <div style={{
                      width: 48, height: 48,
                      borderRadius: T.r12,
                      background: isAvail ? subject.color + "22" : D.bgCardHigh,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      fontWeight: 900,
                      color: isAvail ? subject.color : D.textSoft,
                      flexShrink: 0,
                    }}>
                      {subject.icon}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <div style={{ fontWeight: 700, fontSize: T.md, color: D.text }}>
                          {subject.label}
                        </div>
                        {!isAvail && (
                          <Badge label="Binnenkort" color={D.textSoft} bg={D.bgCardHigh} />
                        )}
                        {isAvail && (
                          <Badge
                            label={mastered + "/" + SKILL_ORDER.length}
                            color={subject.color}
                            bg={subject.color + "22"}
                          />
                        )}
                      </div>
                      <div style={{ fontSize: T.sm, color: D.textSoft }}>
                        {subject.description}
                      </div>
                      {isAvail && data.totalQuestions > 0 && (
                        <ProgressBar
                          value={mastered}
                          max={SKILL_ORDER.length}
                          color={subject.color}
                          height={3}
                          style={{ marginTop: 8 }}
                        />
                      )}
                    </div>

                    {isAvail && (
                      <div style={{ color: subject.color, fontSize: 20, fontWeight: 300, flexShrink: 0 }}>
                        &#8250;
                      </div>
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
