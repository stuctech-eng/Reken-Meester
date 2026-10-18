import { Screen, TopBar, Card, Btn, Divider, Body } from "../components/UI.jsx";
import { T, D } from "../styles/tokens.js";
import { getTitel } from "../core/save.js";
import { SKILL_ORDER } from "../core/subjects.js";

export default function SettingsScreen({ save, onBack, onReset }) {
  var name          = save.displayName || "—";
  var optData       = (save.subjects && save.subjects.optellen) || {};
  var totalMastered = optData.totalSkillsMastered || 0;
  var titelObj      = getTitel(totalMastered);
  var activeSkillId = optData.currentSkillId || "s01";

  return (
    <Screen bg={D.bg}>
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
        <div style={{ fontSize: T.xs, fontWeight: 700, color: D.textSoft, letterSpacing: 0.5, marginBottom: 4 }}>
          PROFIEL
        </div>
        <Card style={{ background: D.bgCard }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: T.sm, color: D.textSoft, marginBottom: 2 }}>Naam</div>
              <div style={{ fontWeight: 700, fontSize: T.lg, color: D.text }}>{name}</div>
            </div>
            <div style={{
              width: 44, height: 44,
              borderRadius: T.r999,
              background: D.primaryLight,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              color: D.primary,
            }}>
              &#128100;
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div style={{ fontSize: T.xs, fontWeight: 700, color: D.textSoft, letterSpacing: 0.5, marginTop: 8, marginBottom: 4 }}>
          STATISTIEKEN
        </div>
        <Card style={{ background: D.bgCard }}>
          <StatRow label="Titel"            value={titelObj.label} />
          <Divider style={{ margin: "10px 0" }} />
          <StatRow label="Sessies gespeeld" value={save.totalSessions || 0} />
        </Card>

        {/* Optellen stats */}
        {optData.totalQuestions > 0 && (
          <>
            <div style={{ fontSize: T.xs, fontWeight: 700, color: D.textSoft, letterSpacing: 0.5, marginTop: 8, marginBottom: 4 }}>
              OPTELLEN
            </div>
            <Card style={{ background: D.bgCard }}>
              <StatRow
                label="Skills beheersd"
                value={totalMastered + " van " + SKILL_ORDER.length}
              />
              <Divider style={{ margin: "10px 0" }} />
              <StatRow label="Vragen beantwoord" value={optData.totalQuestions || 0} />
              <Divider style={{ margin: "10px 0" }} />
              <StatRow
                label="Nauwkeurigheid"
                value={optData.totalQuestions > 0
                  ? Math.round(optData.totalCorrect / optData.totalQuestions * 100) + "%"
                  : "—"
                }
              />
              <Divider style={{ margin: "10px 0" }} />
              <StatRow label="Actieve skill" value={activeSkillId} />
            </Card>
          </>
        )}

        {/* Danger zone */}
        <div style={{ fontSize: T.xs, fontWeight: 700, color: D.error, letterSpacing: 0.5, marginTop: 8, marginBottom: 4 }}>
          ACCOUNT
        </div>
        <Card style={{ borderColor: D.errorBorder, background: D.errorBg }}>
          <Body size={T.sm} color={D.textMid} style={{ marginBottom: 12 }}>
            Hiermee wis je al je voortgang. Dit kan niet ongedaan gemaakt worden.
          </Body>
          <Btn
            onClick={onReset}
            outline
            color={D.error}
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
      <span style={{ fontSize: T.sm, color: D.textMid }}>{label}</span>
      <span style={{ fontSize: T.sm, fontWeight: 700, color: D.text }}>{value}</span>
    </div>
  );
}
