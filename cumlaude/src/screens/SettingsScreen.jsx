import { Screen, TopBar, Card, Btn, Divider, Body } from "../components/UI.jsx";
import { T } from "../styles/tokens.js";

export default function SettingsScreen({ save, onBack, onReset, displayName }) {
  const name = save.displayName || "—";

  return (
    <Screen>
      <TopBar title="Instellingen" onBack={onBack} />

      <div style={{
        flex: 1,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        padding: "20px 20px 40px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}>

        {/* Profile */}
        <div style={{ fontSize: T.xs, fontWeight: 700, color: T.textSoft, letterSpacing: 0.5, marginBottom: 4 }}>
          PROFIEL
        </div>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: T.sm, color: T.textSoft, marginBottom: 2 }}>Naam</div>
              <div style={{ fontWeight: 700, fontSize: T.lg, color: T.text }}>{name}</div>
            </div>
            <div style={{
              width: 44, height: 44,
              borderRadius: T.r999,
              background: T.primaryLight,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              color: T.primary,
            }}>
              &#128100;
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div style={{ fontSize: T.xs, fontWeight: 700, color: T.textSoft, letterSpacing: 0.5, marginTop: 8, marginBottom: 4 }}>
          STATISTIEKEN
        </div>
        <Card>
          <StatRow label="Totale XP"        value={(save.totalXp || 0) + " XP"} />
          <Divider style={{ margin: "10px 0" }} />
          <StatRow label="Sessies gespeeld" value={save.totalSessions || 0} />
          <Divider style={{ margin: "10px 0" }} />
          <StatRow label="Beste streak"     value={(save.bestStreak || 0) + " dagen"} />
          <Divider style={{ margin: "10px 0" }} />
          <StatRow label="Huidige streak"   value={(save.streak || 0) + " dagen"} />
        </Card>

        {/* Subject stats */}
        {save.subjects?.optellen && (
          <>
            <div style={{ fontSize: T.xs, fontWeight: 700, color: T.textSoft, letterSpacing: 0.5, marginTop: 8, marginBottom: 4 }}>
              OPTELLEN
            </div>
            <Card>
              <StatRow label="XP"            value={(save.subjects.optellen.xp || 0) + " XP"} />
              <Divider style={{ margin: "10px 0" }} />
              <StatRow label="Vragen beantwoord" value={save.subjects.optellen.totalQuestions || 0} />
              <Divider style={{ margin: "10px 0" }} />
              <StatRow
                label="Nauwkeurigheid"
                value={save.subjects.optellen.totalQuestions > 0
                  ? Math.round(save.subjects.optellen.totalCorrect / save.subjects.optellen.totalQuestions * 100) + "%"
                  : "—"
                }
              />
              <Divider style={{ margin: "10px 0" }} />
              <StatRow label="Niveau" value={save.subjects.optellen.currentLevel || 1} />
            </Card>
          </>
        )}

        {/* Danger zone */}
        <div style={{ fontSize: T.xs, fontWeight: 700, color: T.error, letterSpacing: 0.5, marginTop: 8, marginBottom: 4 }}>
          ACCOUNT
        </div>
        <Card style={{ borderColor: T.error + "30" }}>
          <Body size={T.sm} style={{ marginBottom: 12 }}>
            Hiermee wis je al je voortgang. Dit kan niet ongedaan gemaakt worden.
          </Body>
          <Btn
            onClick={onReset}
            outline
            color={T.error}
            style={{ width: "100%" }}
          >
            Voortgang wissen
          </Btn>
        </Card>

      </div>
    </Screen>
  );
}

function StatRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: T.sm, color: T.textMid }}>{label}</span>
      <span style={{ fontSize: T.sm, fontWeight: 700, color: T.text }}>{value}</span>
    </div>
  );
}
