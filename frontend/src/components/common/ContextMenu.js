import React from "react";
import { createPortal } from "react-dom";

/**
 * Simple context menu rendered in a portal, positioned near cursor.
 * Props: open, x, y (client coords), onClose, children (menu items)
 */
export default function ContextMenu({ open, x = 0, y = 0, onClose, children }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    // Delay attaching outside handlers to avoid triggering from the opening event
    let cleanupFn = null;
    const t = setTimeout(() => {
      const onMouseDown = (e) => {
        if (ref.current && ref.current.contains(e.target)) return;
        onClose?.();
      };
      const onKeyDown = (e) => {
        if (e.key === 'Escape') onClose?.();
      };
      const onScrollOrResize = () => onClose?.();
      window.addEventListener('mousedown', onMouseDown);
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('scroll', onScrollOrResize, { passive: true });
      window.addEventListener('resize', onScrollOrResize);
      // Cleanup
      cleanupFn = () => {
        window.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('scroll', onScrollOrResize);
        window.removeEventListener('resize', onScrollOrResize);
      };
    }, 0);
    return () => {
      clearTimeout(t);
      if (cleanupFn) cleanupFn();
    };
  }, [open, onClose]);

  if (!open) return null;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 0;
  // Approx width/height used for clamping to keep menu onscreen
  const approxW = 200;
  const approxH = 60;
  // Slight offset so the pointer isn’t directly over the menu
  const left = Math.max(8, Math.min(x + 4, Math.max(8, vw - approxW - 8)));
  const top = Math.max(8, Math.min(y + 4, Math.max(8, vh - approxH - 8)));

  const menu = (
    <div
      role="menu"
      ref={ref}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: 'fixed',
        top,
        left,
        background: '#fff',
        color: '#111',
        border: '1px solid #ddd',
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        padding: 4,
        zIndex: 10000,
        minWidth: 160,
        userSelect: 'none'
      }}
    >
      {children}
    </div>
  );

  const container = typeof document !== 'undefined' ? document.body : null;
  return container ? createPortal(menu, container) : menu;
}

export function ContextMenuItem({ onClick, children }) {
  return (
    <div
      role="menuitem"
      onClick={onClick}
      style={{
        padding: '8px 12px',
        cursor: 'pointer',
        borderRadius: 6
      }}
      onMouseDown={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(e);
        }
      }}
    >
      {children}
    </div>
  );
}
