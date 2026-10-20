import { useState, useRef, useEffect } from "react";
import { T } from "../styles/tokens.js";

var PEEK_H  = 80;   // altijd zichtbaar onderaan (tip + handles)
var FULL_H  = "88vh";

// NO BACKTICKS / TEMPLATE LITERALS anywhere. String concatenation only.

export default function BottomSheet({ tipText, tabs, activeTab, onTabChange, children }) {
  var openState = useState(false);
  var isOpen    = openState[0];
  var setIsOpen = openState[1];

  // dragOffset: pixels die de sheet tijdens slepen extra verschoven is (positief = naar beneden)
  var dragOffsetState = useState(0);
  var dragOffset      = dragOffsetState[0];
  var setDragOffset   = dragOffsetState[1];

  var isDraggingState = useState(false);
  var isDragging      = isDraggingState[0];
  var setIsDragging   = isDraggingState[1];

  var startY       = useRef(0);
  var startOpen    = useRef(false);
  var currentDelta = useRef(0);
  var isOpenRef    = useRef(isOpen);
  var sheetRef     = useRef(null);

  // Houd isOpenRef synchroon met isOpen voor gebruik in DOM-listeners
  useEffect(function() { isOpenRef.current = isOpen; }, [isOpen]);

  // Registreer touchmove als non-passive zodat preventDefault werkt
  useEffect(function() {
    var el = sheetRef.current;
    if (!el) return;

    function handleMove(e) {
      if (!startY.current && startY.current !== 0) return;
      e.preventDefault();
      var delta = e.touches[0].clientY - startY.current;
      currentDelta.current = delta;
      if (isOpenRef.current) {
        setDragOffset(Math.max(0, delta));
      } else {
        setDragOffset(Math.min(0, delta));
      }
    }

    el.addEventListener("touchmove", handleMove, { passive: false });
    return function() { el.removeEventListener("touchmove", handleMove); };
  }, []);

  function onTouchStart(e) {
    startY.current       = e.touches[0].clientY;
    startOpen.current    = isOpen;
    currentDelta.current = 0;
    setIsDragging(true);
  }

  function onTouchEnd() {
    var delta = currentDelta.current;
    setIsDragging(false);
    setDragOffset(0);
    startY.current = null;
    if (delta < -50) setIsOpen(true);
    else if (delta > 50) setIsOpen(false);
    currentDelta.current = 0;
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
        ref={sheetRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          height: FULL_H,
          zIndex: 50,
          transform: isOpen
            ? ("translateY(" + dragOffset + "px)")
            : ("translateY(calc(100% - " + PEEK_H + "px - " + (-dragOffset) + "px))"),
          transition: isDragging ? "none" : "transform 0.42s cubic-bezier(0.22, 1, 0.36, 1)",
          display: "flex",
          flexDirection: "column",
          background: T.white,
          borderRadius: "20px 20px 0 0",
          boxShadow: "0 -2px 24px rgba(0,0,0,0.10), 0 -1px 0 " + T.border,
        }}
      >

        {/* ── Peek balk (altijd zichtbaar, volledig klikbaar en sleepbaar) ── */}
        <div style={{ flexShrink: 0 }}>

          {/* Tip tekst met streepje erboven — hele balk is drag-zone */}
          {tipText && (
            <div
              onClick={handlePeekClick}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                cursor: "grab",
                paddingBottom: 10,
              }}
            >
              {/* Drag-streepje bovenin de tipbalk */}
              <div style={{
                display: "flex",
                justifyContent: "center",
                padding: "10px 0 8px",
              }}>
                <div style={{
                  width: 40,
                  height: 4,
                  borderRadius: T.r999,
                  background: T.border,
                }} />
              </div>

              {/* Tekstrij: emoji — tip — pijltje */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                paddingLeft: 16,
                paddingRight: 16,
              }}>
                <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{"📚"}</span>
                <span style={{
                  fontSize: T.sm,
                  color: "#15803d",
                  fontWeight: 600,
                  flex: 1,
                  lineHeight: 1.35,
                }}>
                  {tipText}
                </span>
                <span style={{
                  fontSize: 13,
                  color: T.textSoft,
                  transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.35s",
                  display: "inline-block",
                  flexShrink: 0,
                  lineHeight: 1,
                }}>
                  {"▲"}
                </span>
              </div>
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
