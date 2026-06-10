"use client";

// Layar 4 (§8.4): slider nominal, ringkasan fee, tombol "Cairkan".

import { useMemo, useState } from "react";
import type { AppState } from "@/lib/types";
import { formatRp } from "@/lib/format";
import { REPAYMENT_RATE } from "@/lib/engine";

const STEP = 50_000;

export default function DisburseScreen({
  state,
  busy,
  onDisburse,
  onBack,
}: {
  state: AppState;
  busy: boolean;
  onDisburse: (amount: number) => void;
  onBack: () => void;
}) {
  const limit = state.score.limit;
  const [amount, setAmount] = useState(Math.min(limit, Math.max(STEP, Math.round(limit / 2 / STEP) * STEP)));
  const feeRate = state.score.tier.feeRate;

  const totalDue = Math.round(amount * (1 + feeRate));
  // estimasi hari lunas dari omzet harian rata-rata
  const estDays = useMemo(() => {
    const daily = state.score.input.avgDailySales * REPAYMENT_RATE;
    return daily > 0 ? Math.ceil(totalDue / daily) : 0;
  }, [state.score.input.avgDailySales, totalDue]);

  const fillPct = limit > STEP ? ((amount - STEP) / (limit - STEP)) * 100 : 100;

  return (
    <div className="frame-scroll flex-1 overflow-y-auto">
      <div className="bg-gradient-to-b from-deep to-deep-dark px-6 pb-14 pt-6 text-white">
        <button onClick={onBack} className="text-xs text-sky-200/70" disabled={busy}>
          ← kembali ke skor
        </button>
        <h3 className="mt-3 text-xl font-extrabold">Cairkan Modal Jalan</h3>
        <p className="mt-1 text-xs text-sky-100/80">
          Tier {state.score.tier.name} · plafon {formatRp(limit)}
        </p>
      </div>

      <div className="-mt-8 px-5 pb-8">
        <div className="anim-rise rounded-3xl bg-white p-6 shadow-[0_12px_32px_rgba(14,90,138,0.12)]">
          <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Nominal pencairan
          </p>
          <p className="mt-1 text-center text-3xl font-extrabold text-deep">
            {formatRp(amount)}
          </p>

          <input
            type="range"
            className="astra-slider mt-6"
            min={STEP}
            max={limit}
            step={STEP}
            value={amount}
            disabled={busy}
            onChange={(e) => setAmount(Number(e.target.value))}
            style={{ "--fill": `${fillPct}%` } as React.CSSProperties}
          />
          <div className="mt-1.5 flex justify-between text-[10px] font-semibold text-slate-400">
            <span>{formatRp(STEP)}</span>
            <span>{formatRp(limit)}</span>
          </div>

          <div className="mt-5 space-y-2.5 rounded-2xl bg-mist p-4 text-xs">
            <Row label="Pokok" value={formatRp(amount)} />
            <Row
              label={`Fee ${(feeRate * 100).toFixed(1).replace(".", ",")}%/bln*`}
              value={formatRp(totalDue - amount)}
            />
            <div className="border-t border-slate-200 pt-2.5">
              <Row label="Total dikembalikan" value={formatRp(totalDue)} bold />
            </div>
            <Row
              label="Cara bayar"
              value={`auto ${Math.round(REPAYMENT_RATE * 100)}% tiap penjualan`}
            />
            {estDays > 0 && (
              <Row label="Estimasi lunas" value={`±${estDays} hari jualan`} />
            )}
          </div>

          <button
            onClick={() => onDisburse(amount)}
            disabled={busy || amount < STEP}
            className="mt-5 w-full rounded-2xl bg-gradient-to-r from-deep to-teal py-3.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-70"
          >
            {busy ? "Memproses pencairan…" : `Cairkan ${formatRp(amount)} 💸`}
          </button>
          <p className="mt-3 text-center text-[10px] leading-relaxed text-slate-400">
            Tanpa jaminan. Tanpa tanggal jatuh tempo yang menakutkan — cicilan
            mengikuti ritme jualanmu.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={bold ? "font-extrabold text-deep" : "font-semibold text-slate-700"}>
        {value}
      </span>
    </div>
  );
}
