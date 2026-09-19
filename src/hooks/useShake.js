import { useCallback, useEffect, useRef, useState } from 'react';

/** Returns [shaking, trigger]: `trigger()` sets `shaking` to true for `ms` milliseconds. */
export function useShake(ms = 500) {
  const [shaking, setShaking] = useState(false);
  const timer = useRef(null);

  const trigger = useCallback(() => {
    setShaking(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShaking(false), ms);
  }, [ms]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return [shaking, trigger];
}
