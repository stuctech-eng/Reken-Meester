import { Screen, TopBar, Card, Btn, ProgressBar } from "../components/UI.jsx";
import { A, T } from "../styles/tokens.js";
import { getSubject, getSkill, SKILL_ORDER } from "../core/subjects.js";

// NO BACKTICKS / TEMPLATE LITERALS anywhere. String concatenation only.

export default function ResultScreen({ result, save, onHome, onRepeat, onNext }) {
  var subject  = getSubject(result.subjectId);
  var acc      = result.totalQuestions > 0
    ? Math.round((result.totalCorrect / result.totalQuestions) * 100)
    : 0;
  var avgSec   = result.avgTime ? (result.avgTime / 1000).toFixed(1) : "0.0";

  var stars    = acc >= 90 ? 3 : acc >= 70 ? 2 : acc >= 50 ? 1 : 0;
  var starRow  = "★★★".slice(0, stars * 3) + "☆☆☆".slice(stars * 3);

  var emojiUnicode = acc >= 90 ? "🎉" : acc >= 70 ? "😊" : "🙂";

  var message  = acc >= 90
    ? "Uitstekend! Je hebt dit goed begrepen!"
    : acc >= 70
      ? "Goed gedaan! Blijf oefenen!"
      : acc >= 50
        ? "Aardig bezig. Met wat meer oefening kom je er!"
        : "Geen zorgen, probeer het nog eens!";

  var sessionSkillStats = result.sessionSkillStats || {};
  var subjData          = (save && save.subjects && save.subjects[result.subjectId]) || {};
  var globalSkillStats  = subjData.skillStats || {};
  var totalMastered     = subjData.totalSkillsMastered || 0;

  var dominantSkill = null;
  var dominantTip   = null;
  if (result.dominantSkillId) {
    dominantSkill = getSkill(result.dominantSkillId);
    if (dominantSkill) {
      if (typeof dominantSkill.tip === "function") {
        // Zoek een vraag van deze skill in de resultaten om terms uit te halen
        var domResults = (result.results || []).filter(function(r) {
          return r.skillId === result.dominantSkillId && r.terms && r.terms.length > 0;
        });
        var domTerms = domResults.length > 0 ? domResults[domResults.length - 1].terms : null;
        dominantTip = domTerms ? dominantSkill.tip(domTerms) : dominantSkill.strategy;
      } else {
        dominantTip = dominantSkill.tip;
      }
    }
  }

  return (
    <Screen bg={A.bg}>
      <TopBar title={"Resultaat"} color={A.primary} />

      <div style={{
        flex: 1,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        padding: "20px 20px 40px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}>

        {/* Hero resultaat kaart */}
        <div style={{
          background: A.bgCard,
          border: "2px solid " + (acc >= 70 ? A.successBorder : A.errorBorder),
          borderRadius: A.r20,
          padding: "28px 20px 24px",
          textAlign: "center",
          boxShadow: A.shadowMd,
        }}>
          <div style={{ fontSize: 52, marginBottom: 8, lineHeight: 1 }}>
            {emojiUnicode}
          </div>
          <div style={{
            fontSize: 26,
            color: A.gold,
            letterSpacing: 6,
            marginBottom: 12,
            lineHeight: 1,
          }}>
            {starRow}
          </div>
          <div style={{
            fontSize: 56,
            fontWeight: 900,
            color: acc >= 70 ? A.success : A.error,
            marginBottom: 8,
            lineHeight: 1,
            letterSpacing: -2,
          }}>
            {acc + "%"}
          </div>
          <div style={{ fontSize: T.sm, color: A.textMid, fontWeight: 600, lineHeight: 1.4 }}>
            {message}
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{
            background: A.successBg,
            border: "1.5px solid " + A.successBorder,
            borderRadius: A.r16,
            padding: "14px 16px",
            textAlign: "center",
            boxShadow: A.shadow,
          }}>
            <div style={{ fontSize: T.xs, color: A.successTxt, fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>
              {"GOED"}
            </div>
            <div style={{ fontSize: T.xxl, fontWeight: 900, color: A.success }}>
              {result.totalCorrect + "/" + result.totalQuestions}
            </div>
          </div>
          <div style={{
            background: A.bgCard,
            border: "1.5px solid " + A.border,
            borderRadius: A.r16,
            padding: "14px 16px",
            textAlign: "center",
            boxShadow: A.shadow,
          }}>
            <div style={{ fontSize: T.xs, color: A.textSoft, fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>
              {"GEMID. TIJD"}
            </div>
            <div style={{ fontSize: T.xxl, fontWeight: 900, color: A.text }}>
              {avgSec + "s"}
            </div>
          </div>
          <div style={{
            background: A.bgCard,
            border: "1.5px solid " + A.border,
            borderRadius: A.r16,
            padding: "14px 16px",
            textAlign: "center",
            boxShadow: A.shadow,
          }}>
            <div style={{ fontSize: T.xs, color: A.textSoft, fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>
              {"NAUWKEURIGHEID"}
            </div>
            <div style={{ fontSize: T.xxl, fontWeight: 900, color: subject.color }}>
              {acc + "%"}
            </div>
          </div>
          <div style={{
            background: A.primaryLight,
            border: "1.5px solid " + A.border,
            borderRadius: A.r16,
            padding: "14px 16px",
            textAlign: "center",
            boxShadow: A.shadow,
          }}>
            <div style={{ fontSize: T.xs, color: A.primary, fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>
              {"SKILLS"}
            </div>
            <div style={{ fontSize: T.xxl, fontWeight: 900, color: A.primary }}>
              {totalMastered + "/" + SKILL_ORDER.length}
            </div>
          </div>
        </div>

        {/* Geoefende vaardigheid */}
        {dominantSkill && (
          <div style={{
            background: A.bgCard,
            border: "1.5px solid " + subject.color + "35",
            borderRadius: A.r16,
            padding: "16px 18px",
            boxShadow: A.shadow,
            borderLeft: "4px solid " + subject.color,
          }}>
            <div style={{ fontSize: T.xs, fontWeight: 800, color: subject.color, letterSpacing: 0.8, marginBottom: 8 }}>
              {"GEOEFENDE VAARDIGHEID"}
            </div>
            <div style={{ fontWeight: 800, color: A.text, marginBottom: 4 }}>
              {dominantSkill.label}
            </div>
            <div style={{ fontSize: T.sm, color: A.textSoft, marginBottom: 10, lineHeight: 1.45 }}>
              {dominantSkill.desc}
            </div>
            <div style={{
              fontSize: T.sm,
              color: A.tipTxt,
              background: A.tipBg,
              border: "1px solid " + A.tipBorder,
              borderRadius: A.r8,
              padding: "8px 12px",
              lineHeight: 1.45,
              fontWeight: 600,
            }}>
              {"💡 " + dominantTip}
            </div>
          </div>
        )}

        {/* Skill voortgang */}
        {totalMastered > 0 && (
          <div style={{
            background: A.bgCard,
            border: "1.5px solid " + A.border,
            borderRadius: A.r16,
            padding: "16px 18px",
            boxShadow: A.shadow,
          }}>
            <div style={{ fontSize: T.xs, fontWeight: 800, color: A.textSoft, letterSpacing: 0.8, marginBottom: 10 }}>
              {"VOORTGANG " + (subject ? subject.label.toUpperCase() : "OPTELLEN")}
            </div>
            <div style={{
              height: 10,
              background: A.border,
              borderRadius: A.r999,
              overflow: "hidden",
              marginBottom: 8,
            }}>
              <div style={{
                height: "100%",
                width: Math.round((totalMastered / SKILL_ORDER.length) * 100) + "%",
                background: subject.color,
                borderRadius: A.r999,
                transition: "width 0.5s ease",
              }} />
            </div>
            <div style={{ fontSize: T.sm, color: A.textSoft, fontWeight: 600 }}>
              {totalMastered + " van de " + SKILL_ORDER.length + " vaardigheden beheerst"}
            </div>
          </div>
        )}

        {/* Antwoorden overzicht */}
        <div style={{
          background: A.bgCard,
          border: "1.5px solid " + A.border,
          borderRadius: A.r16,
          padding: "16px 18px",
          boxShadow: A.shadow,
        }}>
          <div style={{ fontSize: T.xs, fontWeight: 800, color: A.textSoft, letterSpacing: 0.8, marginBottom: 12 }}>
            {"ANTWOORDEN"}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(result.results || []).map(function(r, i) {
              return (
                <div
                  key={i}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: A.r8,
                    background: r.correct ? A.successBg : A.errorBg,
                    border: "1.5px solid " + (r.correct ? A.successBorder : A.errorBorder),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 15,
                    fontWeight: 900,
                    color: r.correct ? A.successTxt : A.errorTxt,
                  }}
                >
                  {r.correct ? "✓" : "✗"}
                </div>
              );
            })}
          </div>
        </div>

        {/* Actie knoppen */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
          <button
            onClick={onRepeat}
            style={{
              width: "100%",
              padding: "17px 24px",
              background: A.primary,
              color: "#ffffff",
              border: "none",
              borderRadius: A.r16,
              fontSize: T.lg,
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: A.shadowMd,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {"Doorgaan met oefenen →"}
          </button>
          {onNext && (
            <button
              onClick={onNext}
              style={{
                width: "100%",
                padding: "17px 24px",
                background: "transparent",
                color: A.primary,
                border: "2px solid " + A.primary,
                borderRadius: A.r16,
                fontSize: T.lg,
                fontWeight: 800,
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {"Volgend niveau"}
            </button>
          )}
          <button
            onClick={onHome}
            style={{
              width: "100%",
              padding: "14px 24px",
              background: "transparent",
              color: A.textMid,
              border: "1.5px solid " + A.border,
              borderRadius: A.r16,
              fontSize: T.md,
              fontWeight: 700,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {"Terug naar home"}
          </button>
        </div>

      </div>
    </Screen>
  );
}
