import { Screen, TopBar, Card, Btn, Divider, Body } from "../components/UI.jsx";
import { A, T } from "../styles/tokens.js";
import { getTitel } from "../core/save.js";
import { getSkillOrder } from "../core/subjects.js";

// NO BACKTICKS / TEMPLATE LITERALS anywhere. String concatenation only.

export default function SettingsScreen({ save, onBack, onReset }) {
  var name          = save.displayName || "—";
  var optData       = (save.subjects && save.subjects.optellen) || {};
  var totalMastered = optData.totalSkillsMastered || 0;
  var titelObj      = getTitel(totalMastered);
  var activeSkillId = optData.currentSkillId || "s01";

  return (
    <Screen bg={A.bg}>
      <TopBar title={"Instellingen"} onBack={onBack} />

      <div style={{
        flex: 1,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        padding: "20px 20px 40px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}>

        {/* Profiel sectie */}
        <SectionLabel>{"PROFIEL"}</SectionLabel>
        <div style={{
          background: A.bgCard,
          border: "1.5px solid " + A.border,
          borderRadius: A.r16,
          padding: "16px 18px",
          boxShadow: A.shadow,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: T.xs, color: A.textSoft, fontWeight: 700, letterSpacing: 0.4, marginBottom: 3 }}>
                {"NAAM"}
              </div>
              <div style={{ fontWeight: 800, fontSize: T.lg, color: A.text }}>{name}</div>
            </div>
            <div style={{
              width: 46,
              height: 46,
              borderRadius: A.r999,
              background: A.primaryLight,
              border: "2px solid " + A.border,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              color: A.primary,
            }}>
              {"👤"}
            </div>
          </div>
        </div>

        {/* Statistieken */}
        <SectionLabel style={{ marginTop: 4 }}>{"STATISTIEKEN"}</SectionLabel>
        <div style={{
          background: A.bgCard,
          border: "1.5px solid " + A.border,
          borderRadius: A.r16,
          padding: "16px 18px",
          boxShadow: A.shadow,
        }}>
          <StatRow label={"Titel"}            value={titelObj.label} />
          <Divider style={{ margin: "12px 0" }} />
          <StatRow label={"Sessies gespeeld"} value={save.totalSessions || 0} />
        </div>

        {/* Optellen stats */}
        {optData.totalQuestions > 0 && (
          <>
            <SectionLabel style={{ marginTop: 4 }}>{"OPTELLEN"}</SectionLabel>
            <div style={{
              background: A.bgCard,
              border: "1.5px solid " + A.border,
              borderRadius: A.r16,
              padding: "16px 18px",
              boxShadow: A.shadow,
            }}>
              <StatRow
                label={"Skills beheerst"}
                value={totalMastered + " van " + getSkillOrder("optellen").length}
                highlight={true}
              />
              <Divider style={{ margin: "12px 0" }} />
              <StatRow label={"Vragen beantwoord"} value={optData.totalQuestions || 0} />
              <Divider style={{ margin: "12px 0" }} />
              <StatRow
                label={"Nauwkeurigheid"}
                value={optData.totalQuestions > 0
                  ? Math.round(optData.totalCorrect / optData.totalQuestions * 100) + "%"
                  : "—"
                }
              />
              <Divider style={{ margin: "12px 0" }} />
              <StatRow label={"Actieve skill"} value={activeSkillId} soft={true} />
            </div>
          </>
        )}

        {/* Danger zone */}
        <SectionLabel style={{ marginTop: 4, color: A.error }}>{"ACCOUNT"}</SectionLabel>
        <div style={{
          background: A.errorBg,
          border: "1.5px solid " + A.errorBorder,
          borderRadius: A.r16,
          padding: "16px 18px",
          boxShadow: A.shadow,
        }}>
          <div style={{ fontSize: T.sm, color: A.textMid, marginBottom: 14, lineHeight: 1.5 }}>
            {"Hiermee wis je al je voortgang. Dit kan niet ongedaan gemaakt worden."}
          </div>
          <button
            onClick={onReset}
            style={{
              width: "100%",
              padding: "14px 24px",
              background: "transparent",
              color: A.error,
              border: "2px solid " + A.errorBorder,
              borderRadius: A.r12,
              fontSize: T.md,
              fontWeight: 800,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {"Voortgang wissen"}
          </button>
        </div>

      </div>
    </Screen>
  );
}

function SectionLabel({ children, style }) {
  return (
    <div style={{
      fontSize: T.xs,
      fontWeight: 800,
      color: A.textSoft,
      letterSpacing: 0.8,
      ...style,
    }}>
      {children}
    </div>
  );
}

function StatRow({ label, value, highlight, soft }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: T.sm, color: A.textMid, fontWeight: 600 }}>{label}</span>
      <span style={{
        fontSize: T.sm,
        fontWeight: 800,
        color: highlight ? A.primary : soft ? A.textSoft : A.text,
      }}>
        {value}
      </span>
    </div>
  );
}
