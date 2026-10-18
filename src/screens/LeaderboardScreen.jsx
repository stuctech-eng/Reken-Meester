import { useState, useEffect } from "react";
import { Screen, TopBar, Card, Loader, Empty } from "../components/UI.jsx";
import { T, D } from "../styles/tokens.js";
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

  function rankBgColor(i) {
    if (i === 0) return D.rankGoldBg;
    if (i === 1) return D.rankSilverBg;
    if (i === 2) return D.rankBronzeBg;
    return D.bgCardHigh;
  }

  function rankTxtColor(i) {
    if (i === 0) return D.rankGoldTxt;
    if (i === 1) return D.rankSilverTxt;
    if (i === 2) return D.rankBronzeTxt;
    return D.textMid;
  }

  var inner = (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Banner */}
      <div style={{
        padding: "8px 20px",
        background: D.bgCardHigh,
        borderBottom: "1px solid " + D.border,
        textAlign: "center",
        fontSize: T.xs,
        color: D.textSoft,
        fontWeight: 600,
      }}>
        Scores worden binnenkort vernieuwd
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex",
        padding: embedded ? "0 20px" : "12px 20px 0",
        background: D.bgCard,
        borderBottom: "1px solid " + D.border,
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
                borderBottom: "2px solid " + (tab === t.id ? D.primary : "transparent"),
                color: tab === t.id ? D.primary : D.textSoft,
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
        <Card style={{ borderColor: D.borderHigh, background: D.primaryLight }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: T.xs, color: D.primary, fontWeight: 600, marginBottom: 2 }}>
                JOUW POSITIE
              </div>
              <div style={{ fontWeight: 800, fontSize: T.lg, color: D.text }}>
                {displayName}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              {myRank && (
                <div style={{ fontSize: T.xxl, fontWeight: 900, color: D.primary }}>
                  {"#" + myRank}
                </div>
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
                  background: me ? D.primaryLight : D.bgCard,
                  borderColor: me ? D.borderHigh : D.border,
                  padding: "12px 16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 36, height: 36,
                    borderRadius: T.r999,
                    background: rankBgColor(i),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: icon ? 22 : T.sm,
                    fontWeight: 800,
                    color: rankTxtColor(i),
                    flexShrink: 0,
                  }}>
                    {icon ? icon : ("#" + (row.rank || (i + 1)))}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: me ? 800 : 600,
                      color: me ? D.primary : D.text,
                      fontSize: T.md,
                    }}>
                      {row.displayName}{me ? (" " + STAR_GLOW) : ""}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );

  if (embedded) return inner;

  return (
    <Screen bg={D.bg}>
      <TopBar title="Leaderboard" onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        {inner}
      </div>
    </Screen>
  );
}
