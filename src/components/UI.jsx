import { A, T } from "../styles/tokens.js";

// NO BACKTICKS / TEMPLATE LITERALS anywhere. String concatenation only.
// Academy theme — licht, wit, professioneel.

// ── Layout wrappers ──────────────────────────────────────────

export function Screen({ children, bg, style }) {
  return (
    <div style={{
      minHeight: "100dvh",
      background: bg || A.bg,
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Nunito', 'Inter', system-ui, sans-serif",
      ...style,
    }}>
      {children}
    </div>
  );
}

export function ScrollArea({ children, style }) {
  return (
    <div style={{
      flex: 1,
      overflowY: "auto",
      WebkitOverflowScrolling: "touch",
      padding: "0 20px 40px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Top navigation bar ───────────────────────────────────────

export function TopBar({ title, subtitle, onBack, rightEl, color }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      padding: "14px 20px 12px",
      gap: 12,
      borderBottom: "1px solid " + A.border,
      background: A.bg,
      position: "sticky",
      top: 0,
      zIndex: 10,
    }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{
            background: A.bgCard,
            border: "1.5px solid " + A.border,
            borderRadius: A.r999,
            width: 34,
            height: 34,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: color || A.primary,
            fontSize: 18,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: A.shadow,
            flexShrink: 0,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {"‹"}
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: T.lg, color: A.text, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: T.xs, color: A.textSoft, marginTop: 1, fontWeight: 600 }}>{subtitle}</div>
        )}
      </div>
      {rightEl && <div style={{ flexShrink: 0 }}>{rightEl}</div>}
    </div>
  );
}

// ── Cards ────────────────────────────────────────────────────

export function Card({ children, style, onClick, color }) {
  var isClickable = !!onClick;
  return (
    <div
      onClick={onClick}
      style={{
        background: A.bgCard,
        border: "1.5px solid " + (color ? color + "30" : A.border),
        borderRadius: A.r16,
        padding: "16px 18px",
        boxShadow: A.shadow,
        cursor: isClickable ? "pointer" : "default",
        WebkitTapHighlightColor: isClickable ? "transparent" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Buttons ──────────────────────────────────────────────────

export function Btn({ children, onClick, color, disabled, size, outline, style }) {
  var c   = color || A.primary;
  var pad = size === "sm" ? "10px 18px" : size === "lg" ? "17px 28px" : "14px 24px";
  var fs  = size === "sm" ? T.sm : size === "lg" ? T.lg : T.md;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: outline ? "transparent" : (disabled ? A.border : c),
        color: outline ? c : (disabled ? A.textSoft : "#ffffff"),
        border: outline ? ("2px solid " + c) : "none",
        borderRadius: A.r16,
        padding: pad,
        fontSize: fs,
        fontWeight: 800,
        letterSpacing: 0.2,
        boxShadow: !outline && !disabled ? A.shadowMd : "none",
        transition: "opacity 0.15s, transform 0.1s",
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? "default" : "pointer",
        WebkitTapHighlightColor: "transparent",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function IconBtn({ icon, onClick, color, size, style }) {
  var sz = size || 40;
  return (
    <button
      onClick={onClick}
      style={{
        width: sz,
        height: sz,
        borderRadius: A.r12,
        background: A.primaryLight,
        border: "1.5px solid " + A.border,
        color: color || A.primary,
        fontSize: T.lg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
        ...style,
      }}
    >
      {icon}
    </button>
  );
}

// ── Progress bar ─────────────────────────────────────────────

export function ProgressBar({ value, max, color, height, style }) {
  var pct = Math.min((value / Math.max(max, 1)) * 100, 100);
  var c = color || A.primary;
  return (
    <div style={{
      height: height || 8,
      background: A.border,
      borderRadius: A.r999,
      overflow: "hidden",
      ...style,
    }}>
      <div style={{
        height: "100%",
        width: pct + "%",
        background: c,
        borderRadius: A.r999,
        transition: "width 0.5s ease",
      }} />
    </div>
  );
}

// ── Badge / pill ─────────────────────────────────────────────

export function Badge({ label, color, bg, style }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: A.r999,
      background: bg || A.primaryLight,
      color: color || A.primary,
      fontSize: T.xs,
      fontWeight: 800,
      letterSpacing: 0.4,
      ...style,
    }}>
      {label}
    </span>
  );
}

// ── Text helpers ─────────────────────────────────────────────

export function Heading({ children, size, color, style }) {
  return (
    <div style={{
      fontSize: size || T.xxl,
      fontWeight: 900,
      color: color || A.text,
      lineHeight: 1.2,
      ...style,
    }}>
      {children}
    </div>
  );
}

export function Body({ children, color, size, style }) {
  return (
    <p style={{
      fontSize: size || T.md,
      color: color || A.textMid,
      lineHeight: 1.55,
      margin: 0,
      ...style,
    }}>
      {children}
    </p>
  );
}

// ── Divider ──────────────────────────────────────────────────

export function Divider({ style }) {
  return <div style={{ height: 1, background: A.border, margin: "4px 0", ...style }} />;
}

// ── Loader ───────────────────────────────────────────────────

export function Loader({ color }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flex: 1,
      minHeight: 200,
      fontSize: T.md,
      color: color || A.textSoft,
      fontWeight: 600,
    }}>
      {"Laden..."}
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────

export function Empty({ icon, title, body }) {
  return (
    <div style={{
      textAlign: "center",
      padding: "40px 20px",
      color: A.textSoft,
    }}>
      {icon && <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>}
      {title && <div style={{ fontSize: T.lg, fontWeight: 800, color: A.textMid, marginBottom: 6 }}>{title}</div>}
      {body && <div style={{ fontSize: T.sm, color: A.textSoft, lineHeight: 1.5 }}>{body}</div>}
    </div>
  );
}
