"use client";

// Layar 4 (§8.4): slider nominal, ringkasan fee, tombol "Cairkan".

import { useMemo, useState } from "react";
import type { AppState } from "@/lib/types";
import { formatRp } from "@/lib/format";
import { REPAYMENT_RATE } from "@/lib/engine";
import { effectiveFeeRate, POINTS_REDEEM_COST } from "@/lib/state";

const STEP = 50_000;

const pct = (r: number) => (r * 100).toFixed(1).replace(".", ",");

export default function DisburseScreen({
  state,
  busy,
  onDisburse,
  onBack,
}: {
  state: AppState;
  busy: boolean;
  onDisburse: (amount: number, usePoints: boolean) => void;
  onBack: () => void;
}) {
  const limit = state.score.limit;
  const [amount, setAmount] = useState(Math.min(limit, Math.max(STEP, Math.round(limit / 2 / STEP) * STEP)));
  const [usePoints, setUsePoints] = useState(false);
  const canRedeem = state.points >= POINTS_REDEEM_COST;
  const baseFeeRate = state.score.tier.feeRate;
  const feeRate = effectiveFeeRate(baseFeeRate, usePoints && canRedeem);

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

          {canRedeem && (
            <button
              onClick={() => setUsePoints((v) => !v)}
              disabled={busy}
              className={`mt-5 flex w-full items-center justify-between rounded-2xl border-2 px-4 py-3 text-left transition active:scale-[0.99] ${
                usePoints ? "border-gold bg-gold/10" : "border-slate-200 bg-white"
              }`}
            >
              <span>
                <span className="block text-xs font-bold text-deep">
                  ✦ Tukar {POINTS_REDEEM_COST} AstraPoints
                </span>
                <span className="text-[10px] text-slate-500">
                  Fee turun {pct(baseFeeRate)}% → {pct(effectiveFeeRate(baseFeeRate, true))}% · sisa poinmu{" "}
                  {state.points - (usePoints ? POINTS_REDEEM_COST : 0)}
                </span>
              </span>
              <span
                className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${
                  usePoints ? "justify-end bg-gold" : "justify-start bg-slate-200"
                }`}
              >
                <span className="h-5 w-5 rounded-full bg-white shadow" />
              </span>
            </button>
          )}

          <div className="mt-4 space-y-2.5 rounded-2xl bg-mist p-4 text-xs">
            <Row label="Pokok" value={formatRp(amount)} />
            <Row
              label={
                usePoints && canRedeem
                  ? `Fee ${pct(feeRate)}%/bln* (✦ diskon poin)`
                  : `Fee ${pct(feeRate)}%/bln*`
              }
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
            onClick={() => onDisburse(amount, usePoints && canRedeem)}
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
