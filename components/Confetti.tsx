"use client";

import { useMemo } from "react";

const COLORS = ["#12a0b8", "#0e5a8a", "#f5a623", "#7ed3c0", "#ffd166", "#ff8fa3"];

export default function Confetti({ count = 28 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        duration: 2 + Math.random() * 1.6,
        size: 6 + Math.random() * 7,
        color: COLORS[i % COLORS.length],
        round: Math.random() > 0.5,
      })),
    [count]
  );

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
