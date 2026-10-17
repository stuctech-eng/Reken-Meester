import { useState, useRef, useEffect } from "react";
import { T } from "../styles/tokens.js";

// Peek height = de balk die altijd zichtbaar is onderaan
var PEEK_H   = 72;
var SHEET_H  = "85vh";

export default function BottomSheet({ children, tabs, activeTab, onTabChange }) {
  var openState  = useState(false);
  var isOpen     = openState[0];
  var setIsOpen  = openState[1];

  var dragRef    = useRef(null);
  var startY     = useRef(0);
  var startOpen  = useRef(false);

  function toggle() { setIsOpen(function(v) { return !v; }); }

  // Touch-drag om sheet open/dicht te slepen
  function onTouchStart(e) {
    startY.current   = e.touches[0].clientY;
    startOpen.current = isOpen;
  }
  function onTouchEnd(e) {
    var delta = e.changedTouches[0].clientY - startY.current;
    if (delta < -40) setIsOpen(true);   // omhoog geveegd -> open
    if (delta >  40) setIsOpen(false);  // omlaag geveegd -> dicht
  }

  // Backdrop klik -> dicht
  function onBackdrop() { setIsOpen(false); }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={onBackdrop}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            zIndex: 40,
            animation: "fadeIn 0.2s ease",
          }}
        />
      )}

      {/* Sheet */}
      <div
        ref={dragRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          height: SHEET_H,
          zIndex: 50,
          transform: isOpen ? "translateY(0)" : ("translateY(calc(100% - " + PEEK_H + "px))"),
          transition: "transform 0.35s cubic-bezier(0.32,0.72,0,1)",
          display: "flex",
          flexDirection: "column",
          background: T.white,
          borderRadius: "20px 20px 0 0",
          boxShadow: "0 -4px 32px rgba(0,0,0,0.12)",
        }}
      >
        {/* Handle + tab bar = peek balk */}
        <div
          onClick={toggle}
          style={{
            height: PEEK_H,
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            justifyContent: "flex-start",
            cursor: "pointer",
            flexShrink: 0,
            userSelect: "none",
          }}
        >
          {/* Drag handle */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            paddingTop: 10,
            paddingBottom: 4,
          }}>
            <div style={{
              width: 36,
              height: 4,
              borderRadius: T.r999,
              background: T.border,
            }} />
          </div>

          {/* Tab rij */}
          <div style={{
            display: "flex",
            flex: 1,
            borderBottom: isOpen ? ("1px solid " + T.border) : "none",
          }}>
            {(tabs || []).map(function(tab) {
              var active = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={function(e) {
                    e.stopPropagation();
                    if (!isOpen) { setIsOpen(true); }
                    if (onTabChange) onTabChange(tab.id);
                  }}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    background: "none",
                    border: "none",
                    borderBottom: active ? ("2px solid " + T.primary) : "2px solid transparent",
                    padding: "4px 8px 6px",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{tab.icon}</span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: active ? 700 : 500,
                    color: active ? T.primary : T.textSoft,
                    letterSpacing: 0.3,
                  }}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}>
          {children}
        </div>
      </div>

      <style>{"\
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }\
      "}</style>
    </>
  );
}
