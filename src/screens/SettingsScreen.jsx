import { Fragment, useState } from "react";
import AccountForm from "../components/AccountForm.jsx";
import { Screen, TopBar, Card, Btn, Divider, Body } from "../components/UI.jsx";
import { A, T } from "../styles/tokens.js";
import { getTitel } from "../core/save.js";
import { SUBJECTS, getSkillOrder } from "../core/subjects.js";

// NO BACKTICKS / TEMPLATE LITERALS anywhere. String concatenation only.

export default function SettingsScreen({ save, opslag, account, onMaak, onInlog, onVergeten, onUitloggen, onBack, onReset }) {
  var uitFoutState = useState(null);
  var uitFout      = uitFoutState[0];
  var setUitFout   = uitFoutState[1];
  function uitloggen() {
    setUitFout(null);
    Promise.resolve(onUitloggen()).then(function(tekst) { if (tekst) setUitFout(tekst); });
  }
  var name          = save.displayName || "—";
  // Elke beschikbare rekenmodus heeft een eigen titel en eigen statistieken
  var availSubjects = SUBJECTS.filter(function(s) { return s.available; });
  function subjData(id) { return (save.subjects && save.subjects[id]) || {}; }

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
          {availSubjects.map(function(subject) {
            return (
              <Fragment key={subject.id}>
                <StatRow
                  label={"Titel " + subject.label.toLowerCase()}
                  value={getTitel(subjData(subject.id).totalSkillsMastered || 0, getSkillOrder(subject.id).length).label}
                />
                <Divider style={{ margin: "12px 0" }} />
              </Fragment>
            );
          })}
          <StatRow label={"Sessies gespeeld"} value={save.totalSessions || 0} />
        </div>

        {/* Statistieken per rekenmodus (alleen als er al geoefend is) */}
        {availSubjects.map(function(subject) {
          var data          = subjData(subject.id);
          var totalMastered = data.totalSkillsMastered || 0;
          if (!(data.totalQuestions > 0)) return null;
          return (
            <Fragment key={subject.id}>
              <SectionLabel style={{ marginTop: 4 }}>{subject.label.toUpperCase()}</SectionLabel>
              <div style={{
                background: A.bgCard,
                border: "1.5px solid " + A.border,
                borderRadius: A.r16,
                padding: "16px 18px",
                boxShadow: A.shadow,
              }}>
                <StatRow
                  label={"Skills beheerst"}
                  value={totalMastered + " van " + getSkillOrder(subject.id).length}
                  highlight={true}
                />
                <Divider style={{ margin: "12px 0" }} />
                <StatRow label={"Vragen beantwoord"} value={data.totalQuestions || 0} />
                <Divider style={{ margin: "12px 0" }} />
                <StatRow
                  label={"Nauwkeurigheid"}
                  value={data.totalQuestions > 0
                    ? Math.round(data.totalCorrect / data.totalQuestions * 100) + "%"
                    : "—"
                  }
                />
                <Divider style={{ margin: "12px 0" }} />
                <StatRow label={"Actieve skill"} value={data.currentSkillId || "—"} soft={true} />
              </div>
            </Fragment>
          );
        })}

        {/* Opslag (plan IN, fase IN-1): zichtbaar of alles bewaard is, en de laatste fout */}
        <SectionLabel style={{ marginTop: 4 }}>{"OPSLAG"}</SectionLabel>
        <div style={{
          background: A.bgCard,
          border: "1.5px solid " + A.border,
          borderRadius: A.r16,
          padding: "16px 18px",
          boxShadow: A.shadow,
        }}>
          <StatRow
            label={"Status"}
            value={!opslag ? "\u2014" : opslag.wachtend > 0 ? opslag.wachtend + " nog niet bewaard" : "alles bewaard"}
            highlight={!!opslag && opslag.wachtend === 0}
          />
          <Divider style={{ margin: "12px 0" }} />
          <StatRow
            label={"Laatste controle"}
            value={opslag && opslag.laatste ? new Date(opslag.laatste).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }) : "\u2014"}
            soft={true}
          />
          {opslag && opslag.fout && (
            <Fragment>
              <Divider style={{ margin: "12px 0" }} />
              <StatRow label={"Laatste fout"} value={String(opslag.fout)} soft={true} />
            </Fragment>
          )}
          <Divider style={{ margin: "12px 0" }} />
          <StatRow label={"Schrijfplek"} value={opslag && opslag.plek ? String(opslag.plek) : "\u2014"} soft={true} />
          {opslag && opslag.oudTabblad && (
            <Fragment>
              <Divider style={{ margin: "12px 0" }} />
              <div role="status" style={{ fontSize: T.sm, color: A.textMid, lineHeight: 1.5 }}>
                {"In een tabblad met de vorige versie is na het wisselen nog geoefend. Die voortgang hoort bij de vorige speler. Sluit oude tabbladen van Reken-Meester."}
              </div>
            </Fragment>
          )}
          {opslag && opslag.extern && (
            <Fragment>
              <Divider style={{ margin: "12px 0" }} />
              <div role="status" style={{ fontSize: T.sm, color: A.textMid, lineHeight: 1.5 }}>
                {"Je bent op een ander tabblad afgemeld of aangemeld. Je gegevens van de vorige speler blijven bij die speler."}
              </div>
            </Fragment>
          )}
        </div>

        {/* Account (plan IN, fase IN-2) */}
        <SectionLabel style={{ marginTop: 4 }}>{"ACCOUNT"}</SectionLabel>
        <div style={{
          background: A.bgCard,
          border: "1.5px solid " + A.border,
          borderRadius: A.r16,
          padding: "16px 18px",
          boxShadow: A.shadow,
        }}>
          {account && account.soort === "account" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: T.sm, color: A.textMid, lineHeight: 1.5, overflowWrap: "anywhere" }}>
                {"Ingelogd als "}<b style={{ color: A.text }}>{account.email || "\u2014"}</b>
              </div>
              <button
                onClick={uitloggen}
                disabled={!!account.inlogUit}
                style={{
                  width: "100%",
                  minHeight: 48,
                  padding: "12px 18px",
                  background: "transparent",
                  color: A.primary,
                  border: "2px solid " + A.primary,
                  borderRadius: A.r12,
                  fontSize: T.md,
                  fontWeight: 800,
                  cursor: "pointer",
                  opacity: account.inlogUit ? 0.55 : 1,
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {"Uitloggen"}
              </button>
              {account.inlogUit && <div style={{ fontSize: T.sm, color: A.textSoft }}>{account.inlogUit}</div>}
              {uitFout && <div role="alert" style={{ fontSize: T.sm, color: A.error, fontWeight: 700, lineHeight: 1.4 }}>{uitFout}</div>}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: T.sm, color: A.textMid, lineHeight: 1.5 }}>
                {account && account.soort === "lokaal"
                  ? "Er is geen verbinding met de server; je voortgang staat alleen op dit toestel."
                  : "Je voortgang staat alleen op dit toestel. Met een account kun je ook op een ander toestel verder."}
              </div>
              {account && account.soort === "anoniem" && (
                <AccountForm onMaak={onMaak} onInlog={onInlog} onVergeten={onVergeten} inlogUit={account.inlogUit} />
              )}
            </div>
          )}
        </div>

        {/* Danger zone */}
        <SectionLabel style={{ marginTop: 4, color: A.error }}>{"VOORTGANG WISSEN"}</SectionLabel>
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
