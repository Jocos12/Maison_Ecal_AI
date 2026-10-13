import { useCallback, useEffect, useRef, useState } from 'react';

const POS_KEY = 'mecal-agent-widget-pos';

function readPos() {
  try {
    const raw = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
    if (raw && Number.isFinite(raw.x) && Number.isFinite(raw.y)) return { x: raw.x, y: raw.y };
  } catch {
    /* ignore */
  }
  return null;
}

function savePos(pos) {
  try {
    localStorage.setItem(POS_KEY, JSON.stringify(pos));
  } catch {
    /* ignore */
  }
}

export function clampWidgetPos(x, y, width, height) {
  const maxX = Math.max(0, window.innerWidth - width);
  const maxY = Math.max(0, window.innerHeight - height);
  return {
    x: Math.min(Math.max(0, x), maxX),
    y: Math.min(Math.max(0, y), maxY)
  };
}

export function defaultWidgetPos(width, height) {
  return clampWidgetPos(window.innerWidth - width - 24, window.innerHeight - height - 96, width, height);
}

export function useDraggableWidget({ width = 560, height = 640 } = {}) {
  const panelRef = useRef(null);
  const dragRef = useRef(null);
  const [pos, setPos] = useState(() => {
    if (typeof window === 'undefined') return { x: 24, y: 24 };
    const stored = readPos();
    if (stored) return clampWidgetPos(stored.x, stored.y, width, height);
    return defaultWidgetPos(width, height);
  });

  const reclamp = useCallback(() => {
    const el = panelRef.current;
    const w = el?.offsetWidth || width;
    const h = el?.offsetHeight || height;
    setPos((p) => {
      const next = clampWidgetPos(p.x, p.y, w, h);
      if (next.x !== p.x || next.y !== p.y) savePos(next);
      return next;
    });
  }, [height, width]);

  useEffect(() => {
    window.addEventListener('resize', reclamp);
    const t = window.setTimeout(reclamp, 50);
    return () => {
      window.removeEventListener('resize', reclamp);
      window.clearTimeout(t);
    };
  }, [reclamp]);

  const onHandlePointerDown = useCallback(
    (e) => {
      if (e.button != null && e.button !== 0) return;
      if (e.target?.closest?.('button, select, input, a, textarea')) return;
      const el = panelRef.current;
      const w = el?.offsetWidth || width;
      const h = el?.offsetHeight || height;
      dragRef.current = {
        dx: e.clientX - pos.x,
        dy: e.clientY - pos.y,
        w,
        h
      };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    [height, pos.x, pos.y, width]
  );

  const onHandlePointerMove = useCallback((e) => {
    if (!dragRef.current) return;
    const next = clampWidgetPos(
      e.clientX - dragRef.current.dx,
      e.clientY - dragRef.current.dy,
      dragRef.current.w,
      dragRef.current.h
    );
    setPos(next);
  }, []);

  const onHandlePointerUp = useCallback((e) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setPos((p) => {
      savePos(p);
      return p;
    });
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  return { panelRef, pos, onHandlePointerDown, onHandlePointerMove, onHandlePointerUp };
}
