import { T, D } from "../styles/tokens.js";

// ── Layout wrappers ──────────────────────────────────────────

export function Screen({ children, bg, style }) {
  return (
    <div style={{
      minHeight: "100dvh",
      background: bg || D.bg,
      display: "flex",
      flexDirection: "column",
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
      padding: "16px 20px 12px",
      gap: 12,
      borderBottom: "1px solid " + D.border,
      background: D.bg,
      position: "sticky",
      top: 0,
      zIndex: 10,
    }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            padding: "4px 8px 4px 0",
            color: color || D.primary,
            fontSize: T.lg,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span style={{ fontSize: 20 }}>&#8592;</span>
        </button>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: T.lg, color: D.text, lineHeight: 1.2 }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: T.xs, color: D.textSoft, marginTop: 1 }}>{subtitle}</div>
        )}
      </div>
      {rightEl && <div>{rightEl}</div>}
    </div>
  );
}

// ── Cards ────────────────────────────────────────────────────

export function Card({ children, style, onClick, color }) {
  const isClickable = !!onClick;
  return (
    <div
      onClick={onClick}
      style={{
        background: D.bgCard,
        border: "1px solid " + (color ? color + "30" : D.border),
        borderRadius: T.r16,
        padding: "16px 18px",
        boxShadow: T.shadow,
        cursor: isClickable ? "pointer" : "default",
        transition: isClickable ? "transform 0.1s, box-shadow 0.1s" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Buttons ──────────────────────────────────────────────────

export function Btn({ children, onClick, color, disabled, size, outline, style }) {
  const c = color || T.primary;
  const pad = size === "sm" ? "10px 18px" : size === "lg" ? "18px 32px" : "14px 24px";
  const fs  = size === "sm" ? T.sm : size === "lg" ? T.xl : T.md;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: outline ? "transparent" : (disabled ? D.border : c),
        color: outline ? c : (disabled ? D.textSoft : D.text),
        border: outline ? ("2px solid " + c) : "none",
        borderRadius: T.r12,
        padding: pad,
        fontSize: fs,
        fontWeight: 700,
        letterSpacing: 0.3,
        boxShadow: !outline && !disabled ? ("0 2px 8px " + c + "40") : "none",
        transition: "opacity 0.15s, transform 0.1s",
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function IconBtn({ icon, onClick, color, size, style }) {
  const sz = size || 40;
  return (
    <button
      onClick={onClick}
      style={{
        width: sz,
        height: sz,
        borderRadius: T.r12,
        background: D.primaryLight,
        border: "1px solid " + D.border,
        color: color || D.primary,
        fontSize: T.lg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      {icon}
    </button>
  );
}

// ── Progress bar ─────────────────────────────────────────────

export function ProgressBar({ value, max, color, height, style }) {
  const pct = Math.min((value / Math.max(max, 1)) * 100, 100);
  const c = color || T.primary;
  return (
    <div style={{
      height: height || 6,
      background: D.border,
      borderRadius: T.r999,
      overflow: "hidden",
      ...style,
    }}>
      <div style={{
        height: "100%",
        width: pct + "%",
        background: c,
        borderRadius: T.r999,
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
      borderRadius: T.r999,
      background: bg || D.primaryLight,
      color: color || D.primary,
      fontSize: T.xs,
      fontWeight: 700,
      letterSpacing: 0.5,
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
      fontWeight: 800,
      color: color || D.text,
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
      color: color || D.textMid,
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
  return <div style={{ height: 1, background: D.border, margin: "4px 0", ...style }} />;
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
      color: color || D.textSoft,
    }}>
      Laden...
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────

export function Empty({ icon, title, body }) {
  return (
    <div style={{
      textAlign: "center",
      padding: "40px 20px",
      color: D.textSoft,
    }}>
      {icon && <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>}
      {title && <div style={{ fontSize: T.lg, fontWeight: 700, color: D.textMid, marginBottom: 6 }}>{title}</div>}
      {body && <div style={{ fontSize: T.sm }}>{body}</div>}
    </div>
  );
}
