import { useState, useEffect } from "react";
import { Screen, TopBar, Card, Loader, Empty } from "../components/UI.jsx";
import { T } from "../styles/tokens.js";
import { fetchGlobalTop10, fetchSubjectTop10, fetchMyRankGlobal } from "../services/leaderboard.js";

var MEDAL_GOLD   = "🥇";
var MEDAL_SILVER = "🥈";
var MEDAL_BRONZE = "🥉";
var STAR_GLOW    = "⭐";

var TABS = [
  { id: "global",   label: "Globaal" },
  { id: "optellen", label: "Optellen" },
];

export default function LeaderboardScreen({ uid, save, onBack, embedded }) {
  var tabState    = useState("global");
  var tab         = tabState[0];
  var setTab      = tabState[1];

  var dataState   = useState([]);
  var data        = dataState[0];
  var setData     = dataState[1];

  var rankState   = useState(null);
  var myRank      = rankState[0];
  var setMyRank   = rankState[1];

  var loadState   = useState(true);
  var loading     = loadState[0];
  var setLoading  = loadState[1];

  var displayName = save.displayName || "Jij";
  var myXp        = save.totalXp || 0;

  useEffect(function() { loadData(); }, [tab]);

  async function loadData() {
    setLoading(true);
    setMyRank(null);
    try {
      var rows = [];
      if (tab === "global") {
        rows = await fetchGlobalTop10();
        var rank = await fetchMyRankGlobal(uid, myXp);
        setMyRank(rank);
      } else {
        rows = await fetchSubjectTop10(tab);
      }
      setData(rows);
    } catch(e) {
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  function isMe(row) { return row.uid === uid; }

  function rankIcon(i) {
    if (i === 0) return MEDAL_GOLD;
    if (i === 1) return MEDAL_SILVER;
    if (i === 2) return MEDAL_BRONZE;
    return null;
  }

  function rankBg(i) {
    if (i === 0) return "#fef9c3";
    if (i === 1) return "#f1f5f9";
    if (i === 2) return "#fef3c7";
    return T.bg;
  }

  function rankColor(i) {
    if (i === 0) return "#a16207";
    if (i === 1) return "#475569";
    if (i === 2) return "#b45309";
    return T.textMid;
  }

  // ── Gedeelde inner content ────────────────────────────────────
  var inner = (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Tabs */}
      <div style={{
        display: "flex",
        padding: embedded ? "0 20px" : "12px 20px 0",
        background: T.white,
        borderBottom: "1px solid " + T.border,
      }}>
        {TABS.map(function(t) {
          return (
            <button
              key={t.id}
              onClick={function() { setTab(t.id); }}
              style={{
                flex: 1,
                padding: "10px 8px",
                background: "none",
                border: "none",
                borderBottom: "2px solid " + (tab === t.id ? T.primary : "transparent"),
                color: tab === t.id ? T.primary : T.textSoft,
                fontWeight: tab === t.id ? 700 : 500,
                fontSize: T.sm,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div style={{
        padding: "16px 20px 40px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}>
        {/* My position */}
        <Card style={{ borderColor: T.primary + "30", background: T.primaryLight }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: T.xs, color: T.primary, fontWeight: 600, marginBottom: 2 }}>
                JOUW POSITIE
              </div>
              <div style={{ fontWeight: 800, fontSize: T.lg, color: T.text }}>
                {displayName}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              {myRank && (
                <div style={{ fontSize: T.xxl, fontWeight: 900, color: T.primary }}>
                  {"#" + myRank}
                </div>
              )}
              {tab === "global" && (
                <div style={{ fontSize: T.sm, color: T.textSoft }}>{myXp} XP</div>
              )}
            </div>
          </div>
        </Card>

        {loading ? (
          <Loader />
        ) : data.length === 0 ? (
          <Empty
            icon="🏆"
            title="Nog geen scores"
            body="Speel een sessie om op het leaderboard te verschijnen!"
          />
        ) : (
          data.map(function(row, i) {
            var icon = rankIcon(i);
            var me   = isMe(row);
            return (
              <Card
                key={row.uid || i}
                style={{
                  background: me ? T.primaryLight : T.white,
                  borderColor: me ? T.primary + "40" : T.border,
                  padding: "12px 16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 36, height: 36,
                    borderRadius: T.r999,
                    background: rankBg(i),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: icon ? 22 : T.sm,
                    fontWeight: 800,
                    color: rankColor(i),
                    flexShrink: 0,
                  }}>
                    {icon ? icon : ("#" + (row.rank || (i + 1)))}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: me ? 800 : 600,
                      color: me ? T.primary : T.text,
                      fontSize: T.md,
                    }}>
                      {row.displayName}{me ? (" " + STAR_GLOW) : ""}
                    </div>
                    {row.tier && (
                      <div style={{ fontSize: T.xs, color: T.textSoft }}>{row.tier}</div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", fontWeight: 700, color: me ? T.primary : T.text }}>
                    {tab === "global" ? (row.xp + " XP") : ("Lvl " + (row.level || 1))}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );

  // Embedded in BottomSheet — geen extra Screen/TopBar
  if (embedded) return inner;

  // Standalone screen
  return (
    <Screen>
      <TopBar title="Leaderboard" onBack={onBack} />
      <div style={{
        flex: 1,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}>
        {inner}
      </div>
    </Screen>
  );
}
