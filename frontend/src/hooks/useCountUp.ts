import { useEffect, useRef, useState } from 'react';

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function useCountUp(target: number | null, duration = 800): number | null {
  const [value, setValue] = useState<number | null>(target);
  const prevTarget = useRef<number | null>(null);

  useEffect(() => {
    if (target === null) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const from = prevTarget.current ?? 0;
    prevTarget.current = target;

    if (reduceMotion || from === target) {
      setValue(target);
      return;
    }

    let frame: number;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(Math.round(from + (target - from) * easeOutCubic(progress)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}
