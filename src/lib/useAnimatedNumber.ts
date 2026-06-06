import { useEffect, useRef, useState } from 'react';

// Smoothly eases a displayed number toward `value` (easeOutCubic) using rAF.
export function useAnimatedNumber(value: number, duration = 700): number {
  const [disp, setDisp] = useState(value);
  const st = useRef({ from: value, to: value, start: 0, raf: 0, cur: value });

  useEffect(() => {
    const s = st.current;
    if (value === s.to) return;
    s.from = s.cur;
    s.to = value;
    s.start = performance.now();
    cancelAnimationFrame(s.raf);
    const tick = (t: number) => {
      const p = Math.min((t - s.start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      s.cur = s.from + (s.to - s.from) * e;
      setDisp(s.cur);
      if (p < 1) s.raf = requestAnimationFrame(tick);
      else s.cur = s.to;
    };
    s.raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(s.raf);
  }, [value, duration]);

  return disp;
}
