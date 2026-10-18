import { useState, useRef } from "react";
import { T } from "../styles/tokens.js";

var PEEK_H  = 80;   // altijd zichtbaar onderaan (tip + handles)
var FULL_H  = "88vh";

export default function BottomSheet({ tipText, tabs, activeTab, onTabChange, children }) {
  var openState = useState(false);
  var isOpen    = openState[0];
  var setIsOpen = openState[1];

  // Touch tracking voor soepel slepen
  var startY     = useRef(0);
  var startOpen  = useRef(false);
  var dragging   = useRef(false);
  var moved      = useRef(0);

  function onTouchStart(e) {
    startY.current    = e.touches[0].clientY;
    startOpen.current = isOpen;
    dragging.current  = true;
    moved.current     = 0;
  }

  function onTouchMove(e) {
    if (!dragging.current) return;
    moved.current = e.touches[0].clientY - startY.current;
  }

  function onTouchEnd() {
    if (!dragging.current) return;
    dragging.current = false;
    var delta = moved.current;
    // Drempel: 50px
    if (delta < -50) setIsOpen(true);
    else if (delta > 50) setIsOpen(false);
    moved.current = 0;
  }

  function handleTabClick(tabId, e) {
    e.stopPropagation();
    if (!isOpen) setIsOpen(true);
    if (onTabChange) onTabChange(tabId);
  }

  function handlePeekClick() {
    setIsOpen(function(v) { return !v; });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={function() { setIsOpen(false); }}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.3)",
          zIndex: 40,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.3s ease",
        }}
      />

      {/* Sheet */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          height: FULL_H,
          zIndex: 50,
          transform: isOpen
            ? "translateY(0)"
            : ("translateY(calc(100% - " + PEEK_H + "px))"),
          transition: "transform 0.42s cubic-bezier(0.22, 1, 0.36, 1)",
          display: "flex",
          flexDirection: "column",
          background: T.white,
          borderRadius: "20px 20px 0 0",
          boxShadow: "0 -2px 24px rgba(0,0,0,0.10), 0 -1px 0 " + T.border,
        }}
      >

        {/* ── Peek balk (altijd zichtbaar) ── */}
        <div style={{ flexShrink: 0 }}>

          {/* Drag handle */}
          <div
            onClick={handlePeekClick}
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "10px 0 6px",
              cursor: "pointer",
            }}
          >
            <div style={{
              width: 40,
              height: 4,
              borderRadius: T.r999,
              background: T.border,
              transition: "background 0.2s",
            }} />
          </div>

          {/* Tip tekst — altijd zichtbaar in peek */}
          {tipText && (
            <div
              onClick={handlePeekClick}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 20px 10px",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 16 }}>&#128218;</span>
              <span style={{
                fontSize: T.sm,
                color: "#15803d",
                fontWeight: 600,
                flex: 1,
              }}>
                {tipText}
              </span>
              <span style={{
                fontSize: 12,
                color: T.textSoft,
                transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.35s",
                display: "inline-block",
              }}>
                &#9650;
              </span>
            </div>
          )}

          {/* Tab balk — verschijnt als sheet open is */}
          {tabs && tabs.length > 0 && (
            <div style={{
              display: "flex",
              borderTop: "1px solid " + T.border,
              borderBottom: isOpen ? ("1px solid " + T.border) : "none",
              opacity: isOpen ? 1 : 0,
              maxHeight: isOpen ? "44px" : "0px",
              overflow: "hidden",
              transition: "opacity 0.25s ease, max-height 0.35s ease",
            }}>
              {tabs.map(function(tab) {
                var active = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    onClick={function(e) { handleTabClick(tab.id, e); }}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "10px 8px",
                      background: "none",
                      border: "none",
                      borderBottom: "2px solid " + (active ? T.primary : "transparent"),
                      color: active ? T.primary : T.textSoft,
                      fontWeight: active ? 700 : 500,
                      fontSize: T.sm,
                      cursor: "pointer",
                    }}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Scrollbare content ── */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          opacity: isOpen ? 1 : 0,
          transition: "opacity 0.2s ease",
        }}>
          {children}
        </div>
      </div>
    </>
  );
}
