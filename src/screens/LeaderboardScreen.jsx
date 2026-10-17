import { useState, useEffect } from "react";
import { Screen, TopBar, Card, Badge, Loader, Empty } from "../components/UI.jsx";
import { T } from "../styles/tokens.js";
import { fetchGlobalTop10, fetchSubjectTop10, fetchMyRankGlobal } from "../services/leaderboard.js";

const TABS = [
  { id: "global",  label: "Globaal" },
  { id: "optellen", label: "Optellen" },
];

export default function LeaderboardScreen({ uid, save, onBack }) {
  const [tab, setTab]       = useState("global");
  const [data, setData]     = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);

  const displayName = save.displayName || "Jij";
  const myXp        = save.totalXp || 0;

  useEffect(() => {
    loadData();
  }, [tab]);

  async function loadData() {
    setLoading(true);
    setMyRank(null);
    try {
      let rows = [];
      if (tab === "global") {
        rows = await fetchGlobalTop10();
        const rank = await fetchMyRankGlobal(uid, myXp);
        setMyRank(rank);
      } else {
        rows = await fetchSubjectTop10(tab);
      }
      setData(rows);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  const isMe = (row) => row.uid === uid;

  return (
    <Screen>
      <TopBar title="Leaderboard" onBack={onBack} />

      {/* Tabs */}
      <div style={{
        display: "flex",
        gap: 0,
        padding: "12px 20px 0",
        background: T.white,
        borderBottom: "1px solid " + T.border,
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
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
        ))}
      </div>

      <div style={{
        flex: 1,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
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
                  #{myRank}
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
            icon="&#127942;"
            title="Nog geen scores"
            body="Speel een sessie om op het leaderboard te verschijnen!"
          />
        ) : (
          data.map((row, i) => (
            <Card
              key={row.uid || i}
              style={{
                background: isMe(row) ? T.primaryLight : T.white,
                borderColor: isMe(row) ? T.primary + "40" : T.border,
                padding: "12px 16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* Rank */}
                <div style={{
                  width: 36, height: 36,
                  borderRadius: T.r999,
                  background: i === 0 ? "#fef9c3" : i === 1 ? "#f1f5f9" : i === 2 ? "#fef3c7" : T.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: i < 3 ? 20 : T.sm,
                  fontWeight: 800,
                  color: i === 0 ? "#a16207" : i === 1 ? "#475569" : i === 2 ? "#b45309" : T.textMid,
                  flexShrink: 0,
                }}>
                  {i === 0 ? "&#127947;" : i === 1 ? "&#129352;" : i === 2 ? "&#129353;" : "#" + row.rank}
                </div>

                {/* Name */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: isMe(row) ? 800 : 600,
                    color: isMe(row) ? T.primary : T.text,
                    fontSize: T.md,
                  }}>
                    {row.displayName} {isMe(row) ? "&#11088;" : ""}
                  </div>
                  {row.tier && (
                    <div style={{ fontSize: T.xs, color: T.textSoft }}>{row.tier}</div>
                  )}
                </div>

                {/* Score */}
                <div style={{ textAlign: "right", fontWeight: 700, color: isMe(row) ? T.primary : T.text }}>
                  {tab === "global" && (row.xp + " XP")}
                  {tab !== "global" && ("Lvl " + (row.level || 1))}
                </div>
              </div>
            </Card>
          ))
        )}

      </div>
    </Screen>
  );
}
