import { Screen, Card, Btn, ProgressBar, Badge, Heading } from "../components/UI.jsx";
import { A, T } from "../styles/tokens.js";
import { SUBJECTS } from "../core/subjects.js";
import { getTitel, getNextTitel } from "../core/save.js";
import { getSkillOrder } from "../core/subjects.js";

// NO BACKTICKS / TEMPLATE LITERALS anywhere. String concatenation only.

// Totalen voor een vak: beheerste skills, alle skills, goed en gemaakt over de gegeven modi
function boxTotals(save, subjects) {
  var t = { mastered: 0, max: 0, correct: 0, questions: 0 };
  subjects.forEach(function(s) {
    var d = (save.subjects && save.subjects[s.id]) || {};
    t.mastered  += d.totalSkillsMastered || 0;
    t.max       += getSkillOrder(s.id).length;
    t.correct   += d.totalCorrect || 0;
    t.questions += d.totalQuestions || 0;
  });
  t.pct = t.max > 0 ? Math.round(t.mastered / t.max * 100) : 0;
  return t;
}

// onAuto: start de Auto-modus; null als geen enkele modus nog een level kan opleveren
// openBoxes / onToggleBox: open of dicht per vak ({ rekenen: true, ... }), stand bewaard in App
// Vakken op Home. Elke modus hoort bij één vak via subject.group. Alleen Rekenen heeft Auto.
// Een vak zonder zichtbare modus wordt niet getoond.
var BOXES = [
  { id: "rekenen",   title: "Rekenen",           auto: true  },
  { id: "praktisch", title: "Praktisch rekenen", auto: false },
];

export default function HomeScreen({ save, uid, onSubject, onSettings, onAuto, autoAll, openBoxes, onToggleBox }) {
  // Bovenste kaart: de laatst geoefende modus (lastSubjectId); zonder die waarde de eerste modus
  var availSubjects = SUBJECTS.filter(function(s) { return s.available; });
  var heroSubject   = availSubjects.filter(function(s) { return s.id === save.lastSubjectId; })[0] || availSubjects[0];
  var optData       = save.subjects && save.subjects[heroSubject.id] ? save.subjects[heroSubject.id] : {};
  var totalMastered = optData.totalSkillsMastered || 0;
  var heroMax       = getSkillOrder(heroSubject.id).length;
  // Nauwkeurigheid over alle zichtbare modi samen
  var accAll        = boxTotals(save, availSubjects);
  var acc           = accAll.questions > 0 ? Math.round(accAll.correct / accAll.questions * 100) : 0;

  var titelObj      = getTitel(totalMastered);
  var nextTitelObj  = getNextTitel(totalMastered);

  var displayName = save.displayName || "Leerling";
  var initials    = displayName.slice(0, 2).toUpperCase();

  return (
    <Screen bg={A.bg}>
      {/* Header */}
      <div style={{
        background: A.bgCard,
        borderBottom: "1.5px solid " + A.border,
        padding: "env(safe-area-inset-top, 0px) 0 0 0",
        boxShadow: A.shadow,
        flexShrink: 0,
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px 16px",
        }}>
          <div>
            <div style={{ fontSize: T.xs, color: A.textSoft, fontWeight: 600, marginBottom: 2 }}>
              {"Welkom terug,"}
            </div>
            <Heading size={T.xxl} color={A.text}>{displayName}</Heading>
          </div>

          {/* Profiel avatar */}
          <button
            onClick={onSettings}
            style={{
              width: 44,
              height: 44,
              borderRadius: A.r999,
              background: A.primary,
              border: "none",
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
              letterSpacing: 0.5,
              boxShadow: A.shadowMd,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {initials}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        padding: "20px 20px 96px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}>

        {/* Progressie hero card */}
        <div
          role="button"
          aria-label={"Verder met " + heroSubject.label}
          onClick={function() { onSubject(heroSubject.id); }}
          style={{
          background: heroSubject.color,
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
          borderRadius: A.r20,
          padding: "22px 20px 18px",
          boxShadow: A.shadowLg,
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Decoratieve cirkel */}
          <div style={{
            position: "absolute",
            right: -20,
            top: -20,
            width: 120,
            height: 120,
            borderRadius: A.r999,
            background: "rgba(255,255,255,0.08)",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute",
            right: 30,
            bottom: -30,
            width: 80,
            height: 80,
            borderRadius: A.r999,
            background: "rgba(255,255,255,0.06)",
            pointerEvents: "none",
          }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, position: "relative" }}>
            <div>
              <div style={{ fontSize: T.xs, color: "rgba(255,255,255,0.70)", fontWeight: 700, letterSpacing: 0.8, marginBottom: 4 }}>
                {heroSubject.icon + "  " + heroSubject.label.toUpperCase() + " \u00b7 JOUW TITEL"}
              </div>
              <div style={{ fontSize: T.xxl, fontWeight: 900, color: "#ffffff", lineHeight: 1.1 }}>
                {titelObj.label}
              </div>
            </div>
            <div style={{
              background: "rgba(255,255,255,0.18)",
              borderRadius: A.r12,
              padding: "8px 14px",
              textAlign: "center",
              flexShrink: 0,
            }}>
              <div style={{ fontSize: T.xxl, fontWeight: 900, color: "#ffffff", lineHeight: 1 }}>
                {totalMastered}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.70)", fontWeight: 700, marginTop: 1 }}>
                {"/ " + heroMax + " skills"}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{
            height: 8,
            background: "rgba(255,255,255,0.22)",
            borderRadius: A.r999,
            overflow: "hidden",
            marginBottom: 8,
          }}>
            <div style={{
              height: "100%",
              width: Math.round((totalMastered / heroMax) * 100) + "%",
              background: "#ffffff",
              borderRadius: A.r999,
              transition: "width 0.5s ease",
            }} />
          </div>

          <div style={{ fontSize: T.xs, color: "rgba(255,255,255,0.65)", fontWeight: 600, position: "relative" }}>
            {nextTitelObj
              ? ((nextTitelObj.minSkills - totalMastered) + ((nextTitelObj.minSkills - totalMastered) === 1 ? " skill voor " : " skills voor ") + nextTitelObj.label)
              : ("Alle skills beheerst! \U0001F393")
            }
            {"  \u00b7  Tik om verder te gaan \u203a"}
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{
            background: A.bgCard,
            border: "1.5px solid " + A.border,
            borderRadius: A.r16,
            padding: "16px 18px",
            boxShadow: A.shadow,
          }}>
            <div style={{ fontSize: T.xs, color: A.textSoft, fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>
              {"NAUWKEURIGHEID"}
            </div>
            <div style={{
              fontSize: T.xxl,
              fontWeight: 900,
              color: acc >= 80 ? A.success : acc >= 60 ? A.gold : A.error,
            }}>
              {acc + "%"}
            </div>
          </div>
          <div style={{
            background: A.bgCard,
            border: "1.5px solid " + A.border,
            borderRadius: A.r16,
            padding: "16px 18px",
            boxShadow: A.shadow,
          }}>
            <div style={{ fontSize: T.xs, color: A.textSoft, fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>
              {"SESSIES"}
            </div>
            <div style={{ fontSize: T.xxl, fontWeight: 900, color: A.text }}>
              {save.totalSessions || 0}
            </div>
          </div>
        </div>

        {/* Onderdelen: één inklapbaar vak per groep (Rekenen met Auto, Praktisch rekenen zonder) */}
        <div>
        <div style={{ fontSize: T.xs, fontWeight: 800, color: A.textSoft, letterSpacing: 0.8, marginBottom: 12 }}>
          {"ONDERDELEN"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {BOXES.map(function(bx) {
          var subjects = SUBJECTS.filter(function(s) { return s.group === bx.id; });
          var visible  = subjects.filter(function(s) { return s.available; });
          if (visible.length === 0) return null;
          var isOpen   = !!(openBoxes && openBoxes[bx.id]);
          // Groene totaalbalk: alleen de zichtbare modi van dit vak
          var totals   = boxTotals(save, visible);
          return (
          <div key={bx.id}>
            <div style={{
              background: A.bgCardHigh,
              border: "1.5px solid " + A.border,
              borderRadius: A.r20,
              padding: isOpen ? "14px 12px 12px" : "12px",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: isOpen ? "0 4px 12px" : "0 4px" }}>
                <button
                  onClick={function() { onToggleBox(bx.id); }}
                  aria-expanded={isOpen}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    minHeight: 44,
                    background: "none",
                    border: "none",
                    padding: 0,
                    textAlign: "left",
                    cursor: "pointer",
                    color: A.text,
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <div style={{ fontSize: T.xl, fontWeight: 900, color: A.text, lineHeight: 1.1 }}>
                    {(isOpen ? "▾ " : "▸ ") + bx.title}
                  </div>
                  {/* Groene totaalbalk van dit vak, altijd zichtbaar; opengeklapt ook de Auto-tekst */}
                  <div style={{ marginTop: 8 }}>
                    <div style={{ height: 8, background: A.border, borderRadius: A.r999, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: totals.pct + "%", background: A.success, borderRadius: A.r999, transition: "width 0.5s ease" }} />
                    </div>
                    <div style={{ fontSize: T.xs, color: A.textSoft, fontWeight: 700, marginTop: 5 }}>
                      {totals.mastered + " van " + totals.max + " skills \u00b7 " + totals.pct + "%"}
                    </div>
                    {isOpen && bx.auto && (
                      <div style={{ fontSize: T.xs, color: A.textSoft, fontWeight: 600, marginTop: 2 }}>
                        {autoAll
                          ? (onAuto ? "Auto wisselt tussen alle modi na elk behaald level" : "Auto: alle modi beheerst")
                          : (onAuto ? "Auto wisselt tussen + − × ÷ na elk behaald level" : "Auto: + − × ÷ beheerst")}
                      </div>
                    )}
                  </div>
                </button>
                {bx.auto && (
                <button
                    onClick={onAuto || undefined}
                    disabled={!onAuto}
                    aria-label={"Auto: oefen alle rekenmodi om de beurt"}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: A.r999,
                      background: onAuto ? A.primary : A.border,
                      color: onAuto ? "#ffffff" : A.textSoft,
                      border: "none",
                      fontSize: T.sm,
                      fontWeight: 900,
                      letterSpacing: 0.3,
                      flexShrink: 0,
                      cursor: onAuto ? "pointer" : "default",
                      boxShadow: onAuto ? A.shadowMd : "none",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    {"Auto"}
                  </button>
                )}
              </div>
              {isOpen && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {subjects.map(function(subject) {
                  var data     = (save.subjects && save.subjects[subject.id]) ? save.subjects[subject.id] : {};
                  var mastered = data.totalSkillsMastered || 0;
                  var isAvail  = subject.available;

                  return (
                    <div
                      key={subject.id}
                      onClick={isAvail ? function() { onSubject(subject.id); } : undefined}
                      style={{
                        background: A.bgCard,
                        border: "1.5px solid " + (isAvail ? subject.color + "35" : A.border),
                        borderRadius: A.r16,
                        padding: "16px 18px",
                        boxShadow: A.shadow,
                        opacity: isAvail ? 1 : 0.5,
                        cursor: isAvail ? "pointer" : "default",
                        WebkitTapHighlightColor: "transparent",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        {/* Icon */}
                        <div style={{
                          width: 50,
                          height: 50,
                          borderRadius: A.r16,
                          background: isAvail ? subject.color + "18" : A.bgCardHigh,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 24,
                          flexShrink: 0,
                        }}>
                          {subject.icon}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                            <div style={{ fontWeight: 800, fontSize: T.md, color: A.text }}>
                              {subject.label}
                            </div>
                            {!isAvail && (
                              <Badge label={"Binnenkort"} color={A.textSoft} bg={A.bgCardHigh} />
                            )}
                            {isAvail && (
                              <Badge
                                label={mastered + "/" + getSkillOrder(subject.id).length}
                                color={subject.color}
                                bg={subject.color + "18"}
                              />
                            )}
                          </div>
                          <div style={{ fontSize: T.sm, color: A.textSoft }}>
                            {subject.description}
                          </div>
                          {isAvail && (
                            <div style={{ fontSize: T.xs, color: subject.color, fontWeight: 700, marginTop: 3 }}>
                              {"Titel: " + getTitel(mastered).label}
                            </div>
                          )}
                          {isAvail && data.totalQuestions > 0 && (
                            <div style={{
                              height: 4,
                              background: A.border,
                              borderRadius: A.r999,
                              overflow: "hidden",
                              marginTop: 8,
                            }}>
                              <div style={{
                                height: "100%",
                                width: Math.round((mastered / getSkillOrder(subject.id).length) * 100) + "%",
                                background: subject.color,
                                borderRadius: A.r999,
                                transition: "width 0.4s ease",
                              }} />
                            </div>
                          )}
                        </div>

                        {isAvail && (
                          <div style={{
                            color: subject.color,
                            fontSize: 22,
                            fontWeight: 300,
                            flexShrink: 0,
                            opacity: 0.7,
                          }}>
                            {"›"}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          </div>
          );
        })}
        </div>
        </div>

      </div>
    </Screen>
  );
}
