import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'mecal_sidebar_pinned';

/**
 * State of the docked sidebar (logo + pin + navigation).
 * - `pinned`: the user pinned it, so it stays open and the page makes room for it (remembered).
 * - `visible`: pinned, or the cursor is currently on it / on its screen edge.
 * By default the sidebar is hidden.
 */
export function useSidebarDock() {
  const [pinned, setPinned] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [hovered, setHovered] = useState(false);
  const timer = useRef(null);

  const open = useCallback(() => {
    clearTimeout(timer.current);
    setHovered(true);
  }, []);

  const closeSoon = useCallback((delay = 250) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setHovered(false), delay);
  }, []);

  const togglePin = useCallback(() => {
    setPinned((current) => {
      const next = !current;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* storage unavailable: the choice just is not remembered */
      }
      return next;
    });
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { pinned, visible: pinned || hovered, open, closeSoon, togglePin };
}
