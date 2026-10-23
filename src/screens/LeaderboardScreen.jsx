import { useState, useEffect } from "react";
import { Screen, TopBar, Loader, Empty } from "../components/UI.jsx";
import { A, T } from "../styles/tokens.js";
import { fetchGlobalTop10, fetchSubjectTop10, fetchMyRankGlobal } from "../services/leaderboard.js";
import { getSkillOrder } from "../core/subjects.js";

// NO BACKTICKS / TEMPLATE LITERALS anywhere. String concatenation only.

var MEDAL_GOLD   = "🥇";
var MEDAL_SILVER = "🥈";
var MEDAL_BRONZE = "🥉";
var STAR_GLOW    = "⭐";

var TABS = [
  { id: "global",   label: "Globaal" },
  { id: "optellen", label: "Optellen" },
  { id: "aftrekken", label: "Aftrekken" },
  { id: "vermenigvuldigen", label: "Vermenigvuldigen" },
];

export default function LeaderboardScreen({ uid, save, onBack, embedded }) {
  var tabState   = useState("global");
  var tab        = tabState[0];
  var setTab     = tabState[1];

  var dataState  = useState([]);
  var data       = dataState[0];
  var setData    = dataState[1];

  var rankState  = useState(null);
  var myRank     = rankState[0];
  var setMyRank  = rankState[1];

  var loadState  = useState(true);
  var loading    = loadState[0];
  var setLoading = loadState[1];

  var displayName = save.displayName || "Jij";

  useEffect(function() { loadData(); }, [tab]);

  async function loadData() {
    setLoading(true);
    setMyRank(null);
    try {
      var rows = [];
      if (tab === "global") {
        rows = await fetchGlobalTop10();
        var rank = await fetchMyRankGlobal(uid, save.totalXp || 0);
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
    if (i === 0) return A.rankGoldBg;
    if (i === 1) return A.rankSilverBg;
    if (i === 2) return A.rankBronzeBg;
    return A.bgCardHigh;
  }

  function rankTxt(i) {
    if (i === 0) return A.rankGoldTxt;
    if (i === 1) return A.rankSilverTxt;
    if (i === 2) return A.rankBronzeTxt;
    return A.textMid;
  }

  var inner = (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Info banner */}
      <div style={{
        padding: "8px 20px",
        background: A.primaryLight,
        borderBottom: "1px solid " + A.border,
        textAlign: "center",
        fontSize: T.xs,
        color: A.primary,
        fontWeight: 700,
        letterSpacing: 0.3,
      }}>
        {"Scores worden binnenkort vernieuwd"}
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex",
        padding: embedded ? "0 20px" : "0 20px",
        background: A.bgCard,
        borderBottom: "1.5px solid " + A.border,
      }}>
        {TABS.map(function(t) {
          var isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={function() { setTab(t.id); }}
              style={{
                flex: 1,
                padding: "14px 8px",
                background: "none",
                border: "none",
                borderBottom: "3px solid " + (isActive ? A.primary : "transparent"),
                color: isActive ? A.primary : A.textSoft,
                fontWeight: isActive ? 800 : 600,
                fontSize: T.sm,
                cursor: "pointer",
                transition: "all 0.15s",
                WebkitTapHighlightColor: "transparent",
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

        {/* Mijn positie kaart */}
        <div style={{
          background: A.primaryLight,
          border: "2px solid " + A.primary,
          borderRadius: A.r16,
          padding: "14px 18px",
          boxShadow: A.shadow,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: T.xs, color: A.primary, fontWeight: 800, letterSpacing: 0.5, marginBottom: 3 }}>
                {"JOUW POSITIE"}
              </div>
              <div style={{ fontWeight: 900, fontSize: T.lg, color: A.text }}>
                {displayName}
              </div>
            </div>
            {myRank && (
              <div style={{
                fontSize: T.xxl,
                fontWeight: 900,
                color: A.primary,
                letterSpacing: -1,
              }}>
                {"#" + myRank}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <Loader />
        ) : data.length === 0 ? (
          <Empty
            icon={"🏆"}
            title={"Nog geen scores"}
            body={"Speel een sessie om op het leaderboard te verschijnen!"}
          />
        ) : (
          data.map(function(row, i) {
            var icon = rankIcon(i);
            var me   = isMe(row);
            return (
              <div
                key={row.uid || i}
                style={{
                  background: me ? A.primaryLight : A.bgCard,
                  border: "1.5px solid " + (me ? A.primary : A.border),
                  borderRadius: A.r16,
                  padding: "12px 16px",
                  boxShadow: A.shadow,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: A.r999,
                    background: rankBg(i),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: icon ? 22 : T.sm,
                    fontWeight: 900,
                    color: rankTxt(i),
                    flexShrink: 0,
                  }}>
                    {icon ? icon : ("#" + (row.rank || (i + 1)))}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: me ? 900 : 700,
                      color: me ? A.primary : A.text,
                      fontSize: T.md,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {row.displayName}{me ? (" " + STAR_GLOW) : ""}
                    </div>
                    <div style={{ fontSize: T.xs, color: A.textSoft, fontWeight: 600, marginTop: 1 }}>
                      {tab === "global"
                        ? ((row.tier ? row.tier + " \u00b7 " : "") + (row.xp || 0) + " XP")
                        : ((row.titel ? row.titel + " \u00b7 " : "") + (row.skills || 0) + "/" + getSkillOrder(tab).length)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  if (embedded) return inner;

  return (
    <Screen bg={A.bg}>
      <TopBar title={"Leaderboard"} onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        {inner}
      </div>
    </Screen>
  );
}
