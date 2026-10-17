import { useState } from "react";
import { Screen, Card, Btn, Heading, Body } from "../components/UI.jsx";
import { T } from "../styles/tokens.js";
import { claimUsername } from "../services/leaderboard.js";

export default function UsernameScreen({ uid, onDone }) {
  const [input, setInput]     = useState("");
  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const name = input.trim();
    if (!name) return;
    setLoading(true);
    setError(null);
    try {
      await claimUsername(uid, name);
      onDone(name);
    } catch (err) {
      setError(err.message || "Probeer een andere naam");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen style={{ justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{
          width: 72, height: 72,
          borderRadius: T.r20,
          background: T.primaryLight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 36,
          margin: "0 auto 16px",
        }}>
          &#127891;
        </div>
        <Heading size={T.xxxl} style={{ marginBottom: 8 }}>
          Kies je naam
        </Heading>
        <Body>
          Deze naam verschijnt op het leaderboard. Je kiest hem eenmalig.
        </Body>
      </div>

      <Card style={{ padding: 20 }}>
        <input
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value); setError(null); }}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          placeholder="Jouw naam..."
          maxLength={20}
          autoFocus
          style={{
            width: "100%",
            padding: "14px 16px",
            background: T.bg,
            border: "2px solid " + (error ? T.error : T.border),
            borderRadius: T.r12,
            color: T.text,
            fontSize: T.xl,
            fontWeight: 700,
            outline: "none",
            textAlign: "center",
          }}
        />

        {error && (
          <div style={{
            marginTop: 10,
            color: T.error,
            fontSize: T.sm,
            textAlign: "center",
            fontWeight: 600,
          }}>
            &#9888;&#65039; {error}
          </div>
        )}

        <div style={{ marginTop: 8, fontSize: T.xs, color: T.textSoft, textAlign: "center" }}>
          2-20 tekens · Uniek · Niet meer aan te passen
        </div>

        <Btn
          onClick={handleSubmit}
          color={T.primary}
          size="lg"
          disabled={!input.trim() || loading}
          style={{ width: "100%", marginTop: 16 }}
        >
          {loading ? "Controleren..." : "Bevestigen"}
        </Btn>
      </Card>
    </Screen>
  );
}
