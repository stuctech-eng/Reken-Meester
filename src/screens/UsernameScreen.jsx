import { useState } from "react";
import { Screen, Card, Btn, Heading, Body } from "../components/UI.jsx";
import { T, D } from "../styles/tokens.js";
import { claimUsername } from "../services/leaderboard.js";
import AccountForm from "../components/AccountForm.jsx";

export default function UsernameScreen({ uid, onDone, onInlog, onVergeten, inlogUit }) {
  var formState    = useState(false);
  var toonForm     = formState[0];
  var setToonForm  = formState[1];

  var inputState   = useState("");
  var input        = inputState[0];
  var setInput     = inputState[1];

  var errorState   = useState(null);
  var error        = errorState[0];
  var setError     = errorState[1];

  var loadingState = useState(false);
  var loading      = loadingState[0];
  var setLoading   = loadingState[1];

  async function handleSubmit() {
    var name = input.trim();
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
    <Screen bg={D.bg} style={{ justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{
          width: 72, height: 72,
          borderRadius: T.r20,
          background: D.primaryLight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 36,
          margin: "0 auto 16px",
        }}>
          &#127891;
        </div>
        <Heading size={T.xxxl} color={D.text} style={{ marginBottom: 8 }}>
          Kies je naam
        </Heading>
        <Body color={D.textMid}>
          Deze naam verschijnt op het leaderboard. Je kiest hem eenmalig.
        </Body>
      </div>

      <Card style={{ padding: 20, background: D.bgCard }}>
        <input
          type="text"
          value={input}
          onChange={function(e) { setInput(e.target.value); setError(null); }}
          onKeyDown={function(e) { if (e.key === "Enter") handleSubmit(); }}
          placeholder="Jouw naam..."
          maxLength={20}
          autoFocus
          style={{
            width: "100%",
            padding: "14px 16px",
            background: D.bg,
            border: "2px solid " + (error ? D.errorBorder : D.border),
            borderRadius: T.r12,
            color: D.text,
            fontSize: T.xl,
            fontWeight: 700,
            outline: "none",
            textAlign: "center",
            boxSizing: "border-box",
          }}
        />

        {error && (
          <div style={{
            marginTop: 10,
            color: D.error,
            fontSize: T.sm,
            textAlign: "center",
            fontWeight: 600,
          }}>
            &#9888;&#65039; {error}
          </div>
        )}

        <div style={{ marginTop: 8, fontSize: T.xs, color: D.textSoft, textAlign: "center" }}>
          2-20 tekens &middot; Uniek &middot; Niet meer aan te passen
        </div>

        <Btn
          onClick={handleSubmit}
          color={D.primary}
          size="lg"
          disabled={!input.trim() || loading}
          style={{ width: "100%", marginTop: 16 }}
        >
          {loading ? "Controleren..." : "Bevestigen"}
        </Btn>
      </Card>

      {onInlog && (
        <div style={{ marginTop: 16 }}>
          {toonForm ? (
            <Card style={{ padding: 20, background: D.bgCard }}>
              <AccountForm start="inloggen" donker={true} onInlog={onInlog} onVergeten={onVergeten} onTerug={function() { setToonForm(false); }} />
            </Card>
          ) : (
            <button
              onClick={function() { if (!inlogUit) setToonForm(true); }}
              disabled={!!inlogUit}
              style={{
                width: "100%",
                minHeight: 44,
                background: "transparent",
                border: "none",
                color: D.primary,
                fontSize: T.md,
                fontWeight: 800,
                cursor: "pointer",
                opacity: inlogUit ? 0.55 : 1,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {"Ik heb al een account"}
            </button>
          )}
          {inlogUit && !toonForm && <div style={{ fontSize: T.sm, color: D.textSoft, textAlign: "center" }}>{inlogUit}</div>}
        </div>
      )}
    </Screen>
  );
}
