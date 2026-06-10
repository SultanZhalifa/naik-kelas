"use client";

// Panel explainability (§4.5): bar kontribusi tiap fitur terhadap skor.
// contribution = weight * value * 550; bar = persen dari kontribusi maksimum fitur.

import { useEffect, useState } from "react";
import type { FeatureBreakdown } from "@/lib/engine";

export default function ExplainBars({ features }: { features: FeatureBreakdown[] }) {
  const [grow, setGrow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGrow(true), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="space-y-3">
      {features.map((f, i) => {
        const pct = Math.round((f.contribution / f.maxContribution) * 100);
        return (
          <div key={f.key}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-600">{f.label}</span>
              <span className="shrink-0 text-[11px] font-bold text-deep">
                +{f.contribution}
                <span className="font-medium text-slate-400"> / {f.maxContribution}</span>
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-deep to-teal"
                style={{
                  width: grow ? `${pct}%` : "0%",
                  transition: `width 0.9s cubic-bezier(0.22, 1, 0.36, 1) ${i * 90}ms`,
                }}
              />
            </div>
          </div>
        );
      })}
      <p className="pt-1 text-[10px] leading-relaxed text-slate-400">
        Skor = 300 poin dasar + total kontribusi di atas. Bobot: angsuran FIF 35%,
        penjualan QRIS 30%, aktivitas 15%, tenure 10%, pertumbuhan 10%.
      </p>
    </div>
  );
}
