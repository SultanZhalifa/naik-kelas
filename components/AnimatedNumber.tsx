"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  /** mulai animasi dari nilai ini (default: nilai sebelumnya / value) */
  from?: number;
  durationMs?: number;
  format?: (n: number) => string;
  className?: string;
}

export default function AnimatedNumber({
  value,
  from,
  durationMs = 900,
  format = (n) => Math.round(n).toString(),
  className,
}: Props) {
  const [display, setDisplay] = useState(from ?? value);
  const prevRef = useRef(from ?? value);

  useEffect(() => {
    const start = prevRef.current;
    const delta = value - start;
    if (delta === 0) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(start + delta * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else prevRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  return <span className={className}>{format(display)}</span>;
}
