import { Screen, Card, Btn, ProgressBar, Badge, Heading, Body } from "../components/UI.jsx";
import { T } from "../styles/tokens.js";
import { SUBJECTS } from "../core/subjects.js";
import { getAccuracy } from "../core/save.js";

export default function HomeScreen({ save, uid, onSubject, onLeaderboard, onSettings }) {
  const optData = save.subjects?.optellen || {};
  const acc     = getAccuracy(optData);
  const xp      = optData.xp || 0;
  const level   = optData.currentLevel || 1;
  const streak  = save.streak || 0;

  // XP needed for next level (roughly)
  const xpForNext = level * 30;
  const xpInLevel = xp - (level > 1 ? (level - 1) * 30 : 0);

  const displayName = save.displayName || "Leerling";

  return (
    <Screen>
      {/* Header */}
      <div style={{
        background: T.white,
        borderBottom: "1px solid " + T.border,
        padding: "20px 20px 16px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: T.sm, color: T.textSoft, marginBottom: 2 }}>
              Welkom terug,
            </div>
            <Heading size={T.xxl}>{displayName}</Heading>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onLeaderboard}
              style={{
                width: 40, height: 40,
                borderRadius: T.r12,
                background: T.primaryLight,
                border: "1px solid " + T.border,
                color: T.primary,
                fontSize: 18,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              #
            </button>
            <button
              onClick={onSettings}
              style={{
                width: 40, height: 40,
                borderRadius: T.r12,
                background: T.bg,
                border: "1px solid " + T.border,
                color: T.textMid,
                fontSize: 18,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              &#9881;
            </button>
          </div>
        </div>

        {/* Streak bar */}
        {streak > 0 && (
          <div style={{
            marginTop: 12,
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            borderRadius: T.r8,
            padding: "6px 10px",
          }}>
            <span style={{ fontSize: 16 }}>&#128293;</span>
            <span style={{ fontSize: T.sm, color: "#c2410c", fontWeight: 600 }}>
              {streak} dag{streak !== 1 ? "en" : ""} op rij!
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        padding: "20px 20px 40px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}>

        {/* XP Progress card */}
        <Card style={{ background: T.primary }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: T.xs, color: "rgba(255,255,255,0.7)", marginBottom: 2 }}>
                TOTALE VOORTGANG
              </div>
              <div style={{ fontSize: T.xxl, fontWeight: 800, color: T.white }}>
                {xp} XP
              </div>
            </div>
            <div style={{
              width: 52, height: 52,
              borderRadius: T.r12,
              background: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: T.xxxl,
              fontWeight: 900,
              color: T.white,
            }}>
              {level}
            </div>
          </div>
          <ProgressBar
            value={Math.max(xpInLevel, 0)}
            max={xpForNext}
            color="rgba(255,255,255,0.9)"
            height={6}
            style={{ background: "rgba(255,255,255,0.2)" }}
          />
          <div style={{ fontSize: T.xs, color: "rgba(255,255,255,0.65)", marginTop: 6 }}>
            Niveau {level} - nog {Math.max(0, xpForNext - Math.max(xpInLevel, 0))} XP naar niveau {level + 1}
          </div>
        </Card>

        {/* Quick stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Card style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: T.xs, color: T.textSoft, marginBottom: 4 }}>NAUWKEURIGHEID</div>
            <div style={{ fontSize: T.xxl, fontWeight: 800, color: acc >= 80 ? T.success : acc >= 60 ? T.warning : T.error }}>
              {acc}%
            </div>
          </Card>
          <Card style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: T.xs, color: T.textSoft, marginBottom: 4 }}>SESSIES</div>
            <div style={{ fontSize: T.xxl, fontWeight: 800, color: T.text }}>
              {save.totalSessions || 0}
            </div>
          </Card>
        </div>

        {/* Subjects section */}
        <div>
          <div style={{ fontSize: T.sm, fontWeight: 700, color: T.textSoft, letterSpacing: 0.5, marginBottom: 10 }}>
            ONDERDELEN
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {SUBJECTS.map(subject => {
              const data    = save.subjects?.[subject.id] || {};
              const subjAcc = getAccuracy(data);
              const subjLvl = data.currentLevel || 1;
              const isAvail = subject.available;

              return (
                <Card
                  key={subject.id}
                  onClick={isAvail ? () => onSubject(subject.id) : undefined}
                  style={{
                    opacity: isAvail ? 1 : 0.55,
                    borderColor: isAvail ? subject.color + "30" : T.border,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {/* Icon */}
                    <div style={{
                      width: 48, height: 48,
                      borderRadius: T.r12,
                      background: isAvail ? subject.lightColor : T.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      fontWeight: 900,
                      color: isAvail ? subject.color : T.textSoft,
                      flexShrink: 0,
                    }}>
                      {subject.icon}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <div style={{ fontWeight: 700, fontSize: T.md, color: T.text }}>
                          {subject.label}
                        </div>
                        {!isAvail && (
                          <Badge label="Binnenkort" color={T.textSoft} bg={T.bg} />
                        )}
                        {isAvail && (
                          <Badge
                            label={"Lvl " + subjLvl}
                            color={subject.color}
                            bg={subject.lightColor}
                          />
                        )}
                      </div>
                      <div style={{ fontSize: T.sm, color: T.textSoft }}>
                        {subject.description}
                      </div>
                      {isAvail && data.totalQuestions > 0 && (
                        <ProgressBar
                          value={subjAcc}
                          max={100}
                          color={subject.color}
                          height={3}
                          style={{ marginTop: 8 }}
                        />
                      )}
                    </div>

                    {/* Arrow */}
                    {isAvail && (
                      <div style={{
                        color: subject.color,
                        fontSize: 20,
                        fontWeight: 300,
                        flexShrink: 0,
                      }}>
                        &#8250;
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Tip card */}
        <Card style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}>
          <div style={{ fontSize: T.sm, color: "#166534", fontWeight: 600, marginBottom: 4 }}>
            &#128218; Tip
          </div>
          <Body size={T.sm} color="#15803d">
            Oefen elke dag een beetje — consistentie is beter dan lange sessies!
          </Body>
        </Card>

      </div>
    </Screen>
  );
}
