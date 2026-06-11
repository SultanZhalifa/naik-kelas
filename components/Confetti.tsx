"use client";

import { useMemo } from "react";
import { mulberry32 } from "@/lib/rng";

const COLORS = ["#12a0b8", "#0e5a8a", "#f5a623", "#7ed3c0", "#ffd166", "#ff8fa3"];

export default function Confetti({ count = 28 }: { count?: number }) {
  // PRNG deterministik agar render murni (posisi stabil antar re-render)
  const pieces = useMemo(() => {
    const rng = mulberry32(777);
    return Array.from({ length: count }, (_, i) => ({
      left: rng() * 100,
      delay: rng() * 0.8,
      duration: 2 + rng() * 1.6,
      size: 6 + rng() * 7,
      color: COLORS[i % COLORS.length],
      round: rng() > 0.5,
    }));
  }, [count]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 block"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * (p.round ? 1 : 0.5),
            backgroundColor: p.color,
            borderRadius: p.round ? "9999px" : "2px",
            animation: `confetti-fall ${p.duration}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
