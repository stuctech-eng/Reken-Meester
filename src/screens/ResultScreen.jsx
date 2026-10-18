import { Screen, TopBar, Card, Btn, ProgressBar } from "../components/UI.jsx";
import { T } from "../styles/tokens.js";
import { getSubject, getSkill, SKILL_ORDER } from "../core/subjects.js";

export default function ResultScreen({ result, save, onHome, onRepeat, onNext }) {
  var subject  = getSubject(result.subjectId);
  var acc      = Math.round((result.totalCorrect / result.totalQuestions) * 100);
  var avgSec   = (result.avgTime / 1000).toFixed(1);

  var stars    = acc >= 90 ? 3 : acc >= 70 ? 2 : acc >= 50 ? 1 : 0;
  var starRow  = "★★★".slice(0, stars) + "☆☆☆".slice(stars);

  var emojiChar = acc >= 90 ? "🎉"
    : acc >= 70 ? "😊"
    : acc >= 50 ? "🙂"
    : "🙂";

  var message  = acc >= 90
    ? "Uitstekend! Je hebt dit goed begrepen!"
    : acc >= 70
      ? "Goed gedaan! Blijf oefenen!"
      : acc >= 50
        ? "Aardig bezig. Met wat meer oefening kom je er!"
        : "Geen zorgen, probeer het nog eens!";

  // Welke skills kwamen voor in deze sessie?
  var sessionSkillStats = result.sessionSkillStats || {};
  var skillIds = Object.keys(sessionSkillStats);

  // Skill voortgang tonen
  var subjData = save && save.subjects && save.subjects[result.subjectId] || {};
  var globalSkillStats = subjData.skillStats || {};
  var totalMastered = subjData.totalSkillsMastered || 0;

  // Dominant skill deze sessie (meest gespeeld)
  var dominantSkill = null;
  if (result.dominantSkillId) {
    dominantSkill = getSkill(result.dominantSkillId);
  }

  // Skill is net beheerst?
  var newlyMastered = [];
  skillIds.forEach(function(sid) {
    var global = globalSkillStats[sid] || {};
    if (global.mastered && !(subjData.skillStats && subjData.skillStats[sid] && subjData.skillStats[sid].mastered)) {
      // was not mastered before, now is — but we can't easily detect this here
      // instead check if sessionAcc was >=70 and cumulativeCorrect >= minCorrect
    }
    if (global.mastered) {
      newlyMastered.push(sid);
    }
  });

  return (
    <Screen>
      <TopBar
        title="Resultaat"
        color={subject.color}
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
          background: subject.lightColor,
        }}>
          <div style={{ fontSize: 48, marginBottom: 6 }}>{emojiChar}</div>
          <div style={{
            fontSize: 26,
            color: "#fbbf24",
            letterSpacing: 4,
            marginBottom: 10,
          }}>
            {starRow}
          </div>
          <div style={{ fontSize: 40, fontWeight: 900, color: subject.color, marginBottom: 6 }}>
            {acc}%
          </div>
          <div style={{ fontSize: T.sm, color: subject.color + "cc" }}>{message}</div>
        </Card>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Card style={{ padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: T.xs, color: T.textSoft, marginBottom: 4 }}>GOED</div>
            <div style={{ fontSize: T.xxl, fontWeight: 800, color: T.success }}>
              {result.totalCorrect}/{result.totalQuestions}
            </div>
          </Card>
          <Card style={{ padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: T.xs, color: T.textSoft, marginBottom: 4 }}>XP VERDIEND</div>
            <div style={{ fontSize: T.xxl, fontWeight: 800, color: subject.color }}>
              +{result.totalXp}
            </div>
          </Card>
          <Card style={{ padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: T.xs, color: T.textSoft, marginBottom: 4 }}>GEMID. TIJD</div>
            <div style={{ fontSize: T.xxl, fontWeight: 800, color: T.text }}>
              {avgSec}s
            </div>
          </Card>
          <Card style={{ padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: T.xs, color: T.textSoft, marginBottom: 4 }}>SKILLS</div>
            <div style={{ fontSize: T.xxl, fontWeight: 800, color: T.text }}>
              {totalMastered}/{SKILL_ORDER.length}
            </div>
          </Card>
        </div>

        {/* Huidige skill info */}
        {dominantSkill && (
          <Card style={{
            borderColor: subject.color + "30",
            background: subject.lightColor,
            padding: "14px 16px",
          }}>
            <div style={{ fontSize: T.xs, fontWeight: 700, color: subject.color, marginBottom: 6 }}>
              GEOEFENDE VAARDIGHEID
            </div>
            <div style={{ fontWeight: 700, color: T.text, marginBottom: 2 }}>
              {dominantSkill.label}
            </div>
            <div style={{ fontSize: T.sm, color: T.textSoft, marginBottom: 8 }}>
              {dominantSkill.desc}
            </div>
            <div style={{
              fontSize: T.xs,
              color: "#15803d",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: T.r8,
              padding: "6px 10px",
              lineHeight: 1.4,
            }}>
              {"💡 "}{dominantSkill.tip}
            </div>
          </Card>
        )}

        {/* Skill voortgang totaal */}
        {totalMastered > 0 && (
          <Card style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: T.xs, fontWeight: 700, color: T.textSoft, marginBottom: 8 }}>
              VOORTGANG OPTELLEN
            </div>
            <ProgressBar value={totalMastered} max={SKILL_ORDER.length} color={subject.color} height={8} />
            <div style={{ fontSize: T.sm, color: T.textSoft, marginTop: 6 }}>
              {totalMastered} van de {SKILL_ORDER.length} vaardigheden beheerst
            </div>
          </Card>
        )}

        {/* Antwoorden overzicht */}
        <Card>
          <div style={{ fontSize: T.sm, fontWeight: 700, color: T.textSoft, marginBottom: 10 }}>
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
                    background: r.correct ? T.successLight : T.errorLight,
                    border: "1px solid " + (r.correct ? T.success : T.error) + "60",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 15,
                    color: r.correct ? "#166534" : "#991b1b",
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
            color={subject.color}
            size="lg"
            style={{ width: "100%" }}
          >
            Opnieuw oefenen
          </Btn>
          {onNext && (
            <Btn
              onClick={onNext}
              color={subject.color}
              outline
              size="lg"
              style={{ width: "100%" }}
            >
              Volgend niveau
            </Btn>
          )}
          <Btn
            onClick={onHome}
            color={T.textMid}
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
