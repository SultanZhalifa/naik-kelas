"use client";

// Simulator "what-if": proyeksi skor bila omzet berubah / FIF dirapikan.
// Dihitung live di klien oleh mesin skor yang SAMA dengan server — bukti
// bahwa skor deterministik dan transparan.

import { useMemo, useState } from "react";
import { computeScore, type ScoreResult } from "@/lib/engine";
import { formatRp } from "@/lib/format";

export default function WhatIf({ score }: { score: ScoreResult }) {
  const [pct, setPct] = useState(20);
  const [fixFif, setFixFif] = useState(false);
  const fifImperfect = score.input.fifOnTimeRatio < 0.999;

  const projected = useMemo(() => {
    const input = { ...score.input };
    const m = 1 + pct / 100;
    // skala proporsional: volume naik, profil konsistensi tetap
    input.avgMonthlyQrisSales *= m;
    input.avgDailySales *= m;
    input.stdevDailySales *= m;
    if (fixFif) input.fifOnTimeRatio = 1;
    return computeScore(input);
  }, [score.input, pct, fixFif]);

  const delta = projected.score - score.score;
  const tierUp = projected.tier.id !== score.tier.id;
  const fill = ((pct + 20) / 70) * 100;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold text-slate-600">
          Omzet bulanan{" "}
          <span className={pct >= 0 ? "text-teal" : "text-amber-600"}>
            {pct >= 0 ? "+" : ""}
            {pct}%
          </span>
        </span>
        <span className="text-[10px] text-slate-400">geser untuk simulasi</span>
      </div>
      <input
        type="range"
        className="astra-slider mt-2"
        min={-20}
        max={50}
        step={5}
        value={pct}
        onChange={(e) => setPct(Number(e.target.value))}
        style={{ "--fill": `${fill}%` } as React.CSSProperties}
      />

      {fifImperfect && (
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={fixFif}
            onChange={(e) => setFixFif(e.target.checked)}
            className="h-4 w-4 accent-[#12a0b8]"
          />
          Semua angsuran FIF tepat waktu
        </label>
      )}

      <div
        className={`mt-3 flex items-center justify-between rounded-2xl px-4 py-3 ${
          tierUp ? "bg-gold/15" : "bg-mist"
        }`}
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Proyeksi skor
          </p>
          <p className="text-xl font-extrabold text-deep">
            {projected.score}
            <span
              className={`ml-1.5 text-xs font-bold ${
                delta > 0 ? "text-emerald-600" : delta < 0 ? "text-amber-600" : "text-slate-400"
              }`}
            >
              {delta > 0 ? "+" : ""}
              {delta}
            </span>
          </p>
        </div>
        <div className="text-right">
          <p
            className={`text-xs font-extrabold ${tierUp ? "text-amber-600" : "text-teal"}`}
          >
            {tierUp ? `Naik tier → ${projected.tier.name}! 🚀` : projected.tier.name}
          </p>
          <p className="text-[10px] text-slate-500">plafon {formatRp(projected.limit)}</p>
        </div>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
        Dihitung live oleh mesin skor yang sama — bukan angka karangan.
      </p>
    </div>
  );
}
