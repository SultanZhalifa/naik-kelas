"use client";

// "Perjalanan naik kelasmu": posisi di 5 tier + jarak poin ke tier berikutnya.

import { TIERS, type Tier } from "@/lib/engine";
import { formatRpShort } from "@/lib/format";

export default function TierJourney({ score, tier }: { score: number; tier: Tier }) {
  const currentIdx = TIERS.findIndex((t) => t.id === tier.id);
  const next = TIERS[currentIdx + 1];

  return (
    <div className="mt-4">
      <div className="flex gap-1">
        {TIERS.map((t, i) => (
          <div key={t.id} className="flex-1">
            <div
              className={`h-2 rounded-full ${
                i < currentIdx
                  ? "bg-teal/50"
                  : i === currentIdx
                    ? "bg-gradient-to-r from-deep to-teal"
                    : "bg-slate-100"
              }`}
            />
            <p
              className={`mt-1 text-center text-[8px] font-bold uppercase tracking-tight ${
                i === currentIdx ? "text-deep" : "text-slate-300"
              }`}
            >
              {t.id === "belum" ? "Mulai" : t.name}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-center text-[11px] font-semibold text-slate-500">
        {next ? (
          <>
            <span className="text-teal">{next.min - score} poin lagi</span> menuju{" "}
            {next.name}
            {next.cap > 0 && (
              <span className="text-slate-400">
                {" "}
                · plafon hingga {formatRpShort(next.cap)}
              </span>
            )}
          </>
        ) : (
          <>🏆 Kamu di tier tertinggi!</>
        )}
      </p>
    </div>
  );
}
