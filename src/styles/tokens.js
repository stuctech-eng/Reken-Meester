// Design tokens — clean, professional, light theme
export const T = {
  // Colors
  white:    "#ffffff",
  bg:       "#f8f9fa",
  bgCard:   "#ffffff",
  border:   "#e8eaed",
  borderFocus: "#4f46e5",

  text:     "#1a1a2e",
  textMid:  "#4b5563",
  textSoft: "#9ca3af",

  primary:  "#4f46e5",   // indigo
  primaryLight: "#eef2ff",
  primaryDark:  "#3730a3",

  success:  "#10b981",
  successLight: "#d1fae5",
  error:    "#ef4444",
  errorLight: "#fee2e2",
  warning:  "#f59e0b",
  warningLight: "#fef3c7",

  // Radius
  r4:  4,
  r8:  8,
  r12: 12,
  r16: 16,
  r20: 20,
  r999: 999,

  // Shadows
  shadow:     "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd:   "0 4px 6px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)",
  shadowLg:   "0 10px 25px rgba(0,0,0,0.08), 0 4px 10px rgba(0,0,0,0.05)",

  // Font sizes
  xs:   11,
  sm:   13,
  md:   15,
  lg:   17,
  xl:   20,
  xxl:  24,
  xxxl: 32,
  hero: 42,

  // Spacing
  gap4:  4,
  gap8:  8,
  gap12: 12,
  gap16: 16,
  gap20: 20,
  gap24: 24,
  gap32: 32,
};

// Dark theme tokens (ORBIT-stijl)
export var D = {
  bg:             "#0d1b2a",
  bgCard:         "#112240",
  bgCardHigh:     "#1a3a6b",
  border:         "#1e3a5f",
  borderHigh:     "#2563eb",
  text:           "#e8f4fd",
  textMid:        "#94b8d4",
  textSoft:       "#4a7a9b",
  primary:        "#3b82f6",
  primaryLight:   "#1e3a5f",
  success:        "#22c55e",
  successBg:      "#052e16",
  successBorder:  "#166534",
  error:          "#ef4444",
  errorBg:        "#450a0a",
  errorBorder:    "#991b1b",
  gold:           "#f59e0b",
  goldBg:         "#451a03",
  white:          "#112240",
  // Feedback blokken
  tipGreenBg:     "#052e16",
  tipGreenBorder: "#166534",
  tipGreenTxt:    "#4ade80",
  uitlegBg:       "#0c1a3a",
  uitlegBorder:   "#1e3a5f",
  uitlegTxt:      "#93c5fd",
  voorbeeldBg:    "#451a03",
  voorbeeldBorder:"#92400e",
  voorbeeldTxt:   "#fcd34d",
  // Leaderboard ranks
  rankGoldBg:     "#451a03",
  rankGoldTxt:    "#f59e0b",
  rankSilverBg:   "#1a3a6b",
  rankSilverTxt:  "#94b8d4",
  rankBronzeBg:   "#2d1a00",
  rankBronzeTxt:  "#f97316",
  // Radius en shadows (zelfde schaal als T)
  r4:   4,
  r8:   8,
  r12:  12,
  r16:  16,
  r20:  20,
  r999: 999,
  shadow:   "0 1px 3px rgba(0,0,0,0.40), 0 1px 2px rgba(0,0,0,0.30)",
  shadowMd: "0 4px 6px rgba(0,0,0,0.35), 0 2px 4px rgba(0,0,0,0.25)",
  shadowLg: "0 10px 25px rgba(0,0,0,0.45), 0 4px 10px rgba(0,0,0,0.30)",
};

// Academy theme tokens (licht, professioneel, Duolingo-stijl)
export var A = {
  bg:             "#f0f4ff",
  bgCard:         "#ffffff",
  bgCardHigh:     "#e8edf8",
  border:         "#dde3f5",
  borderHigh:     "#5b5ef6",
  text:           "#1a1d3a",
  textMid:        "#4a5068",
  textSoft:       "#9099bb",
  primary:        "#5b5ef6",
  primaryLight:   "#eef0ff",
  primaryDark:    "#3f42d4",
  success:        "#16a34a",
  successBg:      "#f0fdf4",
  successBorder:  "#86efac",
  successTxt:     "#15803d",
  error:          "#dc2626",
  errorBg:        "#fef2f2",
  errorBorder:    "#fca5a5",
  errorTxt:       "#b91c1c",
  gold:           "#d97706",
  goldBg:         "#fffbeb",
  // Feedback blokken
  tipBg:          "#f0fdf4",
  tipBorder:      "#86efac",
  tipTxt:         "#15803d",
  uitlegBg:       "#eff6ff",
  uitlegBorder:   "#93c5fd",
  uitlegTxt:      "#1d4ed8",
  voorbeeldBg:    "#fffbeb",
  voorbeeldBorder:"#fde68a",
  voorbeeldTxt:   "#92400e",
  // Leaderboard ranks
  rankGoldBg:     "#fffbeb",
  rankGoldTxt:    "#d97706",
  rankSilverBg:   "#f8fafc",
  rankSilverTxt:  "#64748b",
  rankBronzeBg:   "#fff7ed",
  rankBronzeTxt:  "#c2410c",
  // Radius en shadows
  r4:   4,
  r8:   8,
  r12:  12,
  r16:  16,
  r20:  20,
  r999: 999,
  shadow:   "0 1px 4px rgba(91,94,246,0.08), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd: "0 4px 16px rgba(91,94,246,0.10), 0 2px 4px rgba(0,0,0,0.04)",
  shadowLg: "0 10px 32px rgba(91,94,246,0.12), 0 4px 10px rgba(0,0,0,0.06)",
};

// Subject colors
export const SUBJECT_COLORS = {
  optellen:         { main: "#4f46e5", light: "#eef2ff", dark: "#3730a3" },
  aftrekken:        { main: "#0891b2", light: "#ecfeff", dark: "#0e7490" },
  vermenigvuldigen: { main: "#059669", light: "#ecfdf5", dark: "#047857" },
  delen:            { main: "#d97706", light: "#fffbeb", dark: "#b45309" },
};
