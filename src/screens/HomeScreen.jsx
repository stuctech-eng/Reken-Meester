import { Screen, Card, Btn, ProgressBar, Badge, Heading, Body } from "../components/UI.jsx";
import { T } from "../styles/tokens.js";
import { SUBJECTS } from "../core/subjects.js";
import { getAccuracy } from "../core/save.js";

export default function HomeScreen({ save, uid, onSubject, onSettings }) {
  var optData = save.subjects && save.subjects.optellen ? save.subjects.optellen : {};
  var acc     = getAccuracy(optData);
  var xp      = optData.xp || 0;
  var level   = optData.currentLevel || 1;
  var streak  = save.streak || 0;

  var xpForNext = level * 30;
  var xpInLevel = xp - (level > 1 ? (level - 1) * 30 : 0);

  var displayName = save.displayName || "Leerling";
  var initials    = displayName.slice(0, 2).toUpperCase();

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

          {/* Profiel knop rechts boven */}
          <button
            onClick={onSettings}
            style={{
              width: 44, height: 44,
              borderRadius: T.r999,
              background: T.primary,
              border: "none",
              color: T.white,
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

      {/* Content — extra padding-bottom voor de bottom sheet peek */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        padding: "20px 20px 96px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}>

        {/* XP Progress card */}
        <Card style={{ background: T.primary, border: "none" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: T.xs, color: "rgba(255,255,255,0.7)", marginBottom: 2 }}>
                TOTALE VOORTGANG
              </div>
              <div style={{ fontSize: T.xxl, fontWeight: 800, color: T.white }}>
                {save.totalXp || 0} XP
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
            {"Niveau " + level + " – nog " + Math.max(0, xpForNext - Math.max(xpInLevel, 0)) + " XP naar niveau " + (level + 1)}
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
            {SUBJECTS.map(function(subject) {
              var data    = (save.subjects && save.subjects[subject.id]) ? save.subjects[subject.id] : {};
              var subjAcc = getAccuracy(data);
              var subjLvl = data.currentLevel || 1;
              var isAvail = subject.available;

              return (
                <Card
                  key={subject.id}
                  onClick={isAvail ? function() { onSubject(subject.id); } : undefined}
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

      </div>
    </Screen>
  );
}
