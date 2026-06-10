"use client";

// Gauge AstraScore 300-850: busur 240° dengan jarum nilai animasi.

import { useEffect, useState } from "react";
import { SCORE_MIN, SCORE_RANGE } from "@/lib/engine";
import AnimatedNumber from "./AnimatedNumber";

interface Props {
  score: number;
  tierName: string;
  /** animasikan dari skor lama (untuk layar Naik Kelas) */
  fromScore?: number;
}

const R = 84;
const CX = 100;
const CY = 100;
const SWEEP = 240; // derajat
const START = 150; // 0 poin di kiri-bawah

function polar(angleDeg: number, r: number): [number, number] {
  const rad = (Math.PI / 180) * angleDeg;
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
}

function arcPath(fromDeg: number, toDeg: number, r: number): string {
  const [x1, y1] = polar(fromDeg, r);
  const [x2, y2] = polar(toDeg, r);
  const large = toDeg - fromDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

export default function ScoreGauge({ score, tierName, fromScore }: Props) {
  const norm = Math.min(1, Math.max(0, (score - SCORE_MIN) / SCORE_RANGE));
  const [progress, setProgress] = useState(
    fromScore !== undefined
      ? Math.min(1, Math.max(0, (fromScore - SCORE_MIN) / SCORE_RANGE))
      : 0
  );

  useEffect(() => {
    const t = setTimeout(() => setProgress(norm), 150);
    return () => clearTimeout(t);
  }, [norm]);

  const arcLen = (Math.PI * R * SWEEP) / 180;

  return (
    <div className="relative mx-auto w-[230px]">
      <svg viewBox="0 0 200 160" className="w-full">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0e5a8a" />
            <stop offset="100%" stopColor="#12a0b8" />
          </linearGradient>
        </defs>
        {/* track */}
        <path
          d={arcPath(START, START + SWEEP, R)}
          fill="none"
          stroke="#dbe7ee"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* nilai */}
        <path
          d={arcPath(START, START + SWEEP, R)}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={arcLen}
          strokeDashoffset={arcLen * (1 - progress)}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
        <text x="32" y="152" fontSize="11" fill="#8aa4b5" fontWeight="600">
          300
        </text>
        <text x="152" y="152" fontSize="11" fill="#8aa4b5" fontWeight="600">
          850
        </text>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
        <AnimatedNumber
          value={score}
          from={fromScore ?? SCORE_MIN}
          durationMs={1100}
          className="text-[44px] font-extrabold leading-none text-deep"
        />
        <span className="mt-1 rounded-full bg-teal-light px-3 py-0.5 text-xs font-bold text-teal">
          {tierName}
        </span>
      </div>
    </div>
  );
}
