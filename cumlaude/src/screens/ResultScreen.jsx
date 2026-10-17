import { Screen, TopBar, Card, Btn, ProgressBar, Badge, Heading, Body } from "../components/UI.jsx";
import { T } from "../styles/tokens.js";
import { getSubject } from "../core/subjects.js";

export default function ResultScreen({ result, onHome, onRepeat, onNext }) {
  const subject  = getSubject(result.subjectId);
  const acc      = Math.round((result.totalCorrect / result.totalQuestions) * 100);
  const avgSec   = (result.avgTime / 1000).toFixed(1);

  const stars    = acc >= 90 ? 3 : acc >= 70 ? 2 : acc >= 50 ? 1 : 0;
  const starRow  = "★★★".slice(0, stars) + "☆☆☆".slice(stars);

  const emoji    = acc >= 90 ? "&#127881;" : acc >= 70 ? "&#128512;" : acc >= 50 ? "&#128521;" : "&#128522;";
  const message  = acc >= 90
    ? "Uitstekend! Je hebt dit niveau onder de knie!"
    : acc >= 70
      ? "Goed gedaan! Blijf oefenen!"
      : acc >= 50
        ? "Aardig bezig. Met wat meer oefening kom je er!"
        : "Geen zorgen, probeer het nog eens!";

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
        gap: 16,
        alignItems: "stretch",
      }}>

        {/* Hero */}
        <Card style={{
          textAlign: "center",
          padding: "32px 24px",
          borderColor: subject.color + "40",
          background: subject.lightColor,
        }}>
          <div style={{ fontSize: 52, marginBottom: 8 }} dangerouslySetInnerHTML={{ __html: emoji }} />
          <div style={{
            fontSize: 28,
            color: "#fbbf24",
            letterSpacing: 4,
            marginBottom: 12,
          }}>
            {starRow}
          </div>
          <Heading size={T.xxxl} color={subject.color} style={{ marginBottom: 8 }}>
            {acc}%
          </Heading>
          <Body color={subject.color + "cc"}>{message}</Body>
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
            <div style={{ fontSize: T.xs, color: T.textSoft, marginBottom: 4 }}>NIVEAU</div>
            <div style={{ fontSize: T.xxl, fontWeight: 800, color: T.text }}>
              {result.level}
            </div>
          </Card>
        </div>

        {/* Per-question breakdown */}
        <Card>
          <div style={{ fontSize: T.sm, fontWeight: 700, color: T.textSoft, marginBottom: 12 }}>
            ANTWOORDEN
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(result.results || []).map((r, i) => (
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
            ))}
          </div>
        </Card>

        {/* Action buttons */}
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
