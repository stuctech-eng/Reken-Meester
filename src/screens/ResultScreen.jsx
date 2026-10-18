import { Screen, TopBar, Card, Btn, ProgressBar } from "../components/UI.jsx";
import { T, D } from "../styles/tokens.js";
import { getSubject, getSkill, SKILL_ORDER } from "../core/subjects.js";

export default function ResultScreen({ result, save, onHome, onRepeat, onNext }) {
  var subject  = getSubject(result.subjectId);
  var acc      = result.totalQuestions > 0
    ? Math.round((result.totalCorrect / result.totalQuestions) * 100)
    : 0;
  var avgSec   = result.avgTime ? (result.avgTime / 1000).toFixed(1) : "0.0";

  var stars    = acc >= 90 ? 3 : acc >= 70 ? 2 : acc >= 50 ? 1 : 0;
  var starRow  = "★★★".slice(0, stars * 1) + "☆☆☆".slice(stars);

  var emojiChar = acc >= 90 ? "🎉"
    : acc >= 70 ? "😊"
    : "🙂";

  var message  = acc >= 90
    ? "Uitstekend! Je hebt dit goed begrepen!"
    : acc >= 70
      ? "Goed gedaan! Blijf oefenen!"
      : acc >= 50
        ? "Aardig bezig. Met wat meer oefening kom je er!"
        : "Geen zorgen, probeer het nog eens!";

  var sessionSkillStats = result.sessionSkillStats || {};
  var subjData = (save && save.subjects && save.subjects[result.subjectId]) || {};
  var globalSkillStats  = subjData.skillStats || {};
  var totalMastered     = subjData.totalSkillsMastered || 0;

  var dominantSkill = null;
  if (result.dominantSkillId) {
    dominantSkill = getSkill(result.dominantSkillId);
  }

  return (
    <Screen bg={D.bg}>
      <TopBar
        title="Resultaat"
        color={D.primary}
      />

      <div style={{
        flex: 1,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        padding: "20px 20px 40px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}>

        {/* Hero */}
        <Card style={{
          textAlign: "center",
          padding: "28px 20px 24px",
          borderColor: subject.color + "40",
          background: subject.color + "18",
        }}>
          <div style={{ fontSize: 48, marginBottom: 6 }}>{emojiChar}</div>
          <div style={{ fontSize: 26, color: D.gold, letterSpacing: 4, marginBottom: 10 }}>
            {starRow}
          </div>
          <div style={{ fontSize: 40, fontWeight: 900, color: subject.color, marginBottom: 6 }}>
            {acc}%
          </div>
          <div style={{ fontSize: T.sm, color: D.textMid }}>{message}</div>
        </Card>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Card style={{ padding: "14px 16px", textAlign: "center", background: D.bgCard }}>
            <div style={{ fontSize: T.xs, color: D.textSoft, marginBottom: 4 }}>GOED</div>
            <div style={{ fontSize: T.xxl, fontWeight: 800, color: D.success }}>
              {result.totalCorrect + "/" + result.totalQuestions}
            </div>
          </Card>
          <Card style={{ padding: "14px 16px", textAlign: "center", background: D.bgCard }}>
            <div style={{ fontSize: T.xs, color: D.textSoft, marginBottom: 4 }}>NAUWKEURIGHEID</div>
            <div style={{ fontSize: T.xxl, fontWeight: 800, color: subject.color }}>
              {acc + "%"}
            </div>
          </Card>
          <Card style={{ padding: "14px 16px", textAlign: "center", background: D.bgCard }}>
            <div style={{ fontSize: T.xs, color: D.textSoft, marginBottom: 4 }}>GEMID. TIJD</div>
            <div style={{ fontSize: T.xxl, fontWeight: 800, color: D.text }}>
              {avgSec + "s"}
            </div>
          </Card>
          <Card style={{ padding: "14px 16px", textAlign: "center", background: D.bgCard }}>
            <div style={{ fontSize: T.xs, color: D.textSoft, marginBottom: 4 }}>SKILLS</div>
            <div style={{ fontSize: T.xxl, fontWeight: 800, color: D.text }}>
              {totalMastered + "/" + SKILL_ORDER.length}
            </div>
          </Card>
        </div>

        {/* Geoefende vaardigheid */}
        {dominantSkill && (
          <Card style={{
            borderColor: subject.color + "40",
            background: subject.color + "12",
            padding: "14px 16px",
          }}>
            <div style={{ fontSize: T.xs, fontWeight: 700, color: subject.color, marginBottom: 6 }}>
              GEOEFENDE VAARDIGHEID
            </div>
            <div style={{ fontWeight: 700, color: D.text, marginBottom: 2 }}>
              {dominantSkill.label}
            </div>
            <div style={{ fontSize: T.sm, color: D.textSoft, marginBottom: 8 }}>
              {dominantSkill.desc}
            </div>
            <div style={{
              fontSize: T.xs,
              color: D.tipGreenTxt,
              background: D.tipGreenBg,
              border: "1px solid " + D.tipGreenBorder,
              borderRadius: T.r8,
              padding: "6px 10px",
              lineHeight: 1.4,
            }}>
              {"💡 " + dominantSkill.tip}
            </div>
          </Card>
        )}

        {/* Skill voortgang totaal */}
        {totalMastered > 0 && (
          <Card style={{ padding: "14px 16px", background: D.bgCard }}>
            <div style={{ fontSize: T.xs, fontWeight: 700, color: D.textSoft, marginBottom: 8 }}>
              VOORTGANG OPTELLEN
            </div>
            <ProgressBar value={totalMastered} max={SKILL_ORDER.length} color={subject.color} height={8} />
            <div style={{ fontSize: T.sm, color: D.textSoft, marginTop: 6 }}>
              {totalMastered + " van de " + SKILL_ORDER.length + " vaardigheden beheerst"}
            </div>
          </Card>
        )}

        {/* Antwoorden overzicht */}
        <Card style={{ background: D.bgCard }}>
          <div style={{ fontSize: T.sm, fontWeight: 700, color: D.textSoft, marginBottom: 10 }}>
            ANTWOORDEN
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(result.results || []).map(function(r, i) {
              return (
                <div
                  key={i}
                  style={{
                    width: 32, height: 32,
                    borderRadius: T.r8,
                    background: r.correct ? D.successBg : D.errorBg,
                    border: "1px solid " + (r.correct ? D.successBorder : D.errorBorder),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 15,
                    color: r.correct ? D.success : D.error,
                  }}
                >
                  {r.correct ? "✓" : "✗"}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Actie knoppen */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
          <Btn
            onClick={onRepeat}
            color={D.primary}
            size="lg"
            style={{ width: "100%" }}
          >
            Doorgaan met oefenen
          </Btn>
          {onNext && (
            <Btn
              onClick={onNext}
              color={D.primary}
              outline
              size="lg"
              style={{ width: "100%" }}
            >
              Volgend niveau
            </Btn>
          )}
          <Btn
            onClick={onHome}
            color={D.textMid}
            outline
            style={{ width: "100%" }}
          >
            Terug naar home
          </Btn>
        </div>

      </div>
    </Screen>
  );
}
