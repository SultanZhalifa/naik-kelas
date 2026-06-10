"use client";

// Layar 5 & 6 (§8.5–8.6): dashboard arus kas + panel demo.
// Saldo, kartu pinjaman dengan progress cicilan real-time, riwayat transaksi,
// AstraPoints, dan tombol "Terima Pembayaran QRIS" / Reset untuk presentasi.

import { useState } from "react";
import type { AppState, Tx } from "@/lib/types";
import { formatRp, formatRpShort, formatDateTime } from "@/lib/format";
import AnimatedNumber from "../AnimatedNumber";

const PRESETS = [100_000, 250_000, 500_000, 1_000_000];

export default function DashboardScreen({
  state,
  busy,
  onReceiveQris,
  onReset,
  onViewScore,
}: {
  state: AppState;
  busy: boolean;
  onReceiveQris: (amount: number) => void;
  onReset: () => void;
  onViewScore: () => void;
}) {
  const [amount, setAmount] = useState(250_000);
  const [custom, setCustom] = useState("");
  const loan = state.loan;
  const paid = loan ? loan.totalDue - loan.outstanding : 0;
  const progress = loan ? Math.round((paid / loan.totalDue) * 100) : 0;

  const recentTx = [...state.transactions].sort((a, b) => b.ts - a.ts).slice(0, 10);

  const effAmount = custom ? Number(custom.replace(/\D/g, "")) || 0 : amount;

  return (
    <div className="frame-scroll flex-1 overflow-y-auto">
      <div className="bg-gradient-to-b from-deep to-deep-dark px-5 pb-14 pt-5 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-lg">
              {state.profile.emoji}
            </span>
            <div>
              <p className="text-sm font-bold leading-tight">{state.profile.name}</p>
              <p className="text-[10px] text-sky-100/70">{state.profile.business}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onViewScore}
              className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold"
            >
              ⭐ {state.score.score}
            </button>
            <span className="rounded-full bg-gold/20 px-3 py-1.5 text-[11px] font-bold text-amber-300">
              ✦ <AnimatedNumber value={state.points} /> poin
            </span>
          </div>
        </div>

        <p className="mt-5 text-[10px] font-semibold uppercase tracking-wide text-sky-100/70">
          Saldo merchant
        </p>
        <p className="text-3xl font-extrabold">
          <AnimatedNumber value={state.balance} format={formatRp} durationMs={700} />
        </p>
      </div>

      <div className="-mt-8 space-y-4 px-5 pb-8">
        {/* Kartu pinjaman aktif */}
        {loan && (
          <div className="anim-rise rounded-3xl bg-white p-5 shadow-[0_12px_32px_rgba(14,90,138,0.12)]">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-deep">🛵 Modal Jalan</h4>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  loan.status === "LUNAS"
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-teal-light text-teal"
                }`}
              >
                {loan.status === "LUNAS" ? "✓ LUNAS" : "AKTIF"}
              </span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal to-emerald-400"
                style={{ width: `${progress}%`, transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)" }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[11px]">
              <span className="font-semibold text-slate-500">
                Tercicil {formatRp(paid)} ({progress}%)
              </span>
              <span className="font-bold text-deep">sisa {formatRp(loan.outstanding)}</span>
            </div>
            <p className="mt-2 text-[10px] text-slate-400">
              Pokok {formatRp(loan.principal)} + fee → total {formatRp(loan.totalDue)} ·
              otomatis dipotong {Math.round(loan.repaymentRate * 100)}% dari tiap penjualan QRIS
            </p>
          </div>
        )}

        {/* Panel Demo */}
        <div className="anim-rise rounded-3xl border-2 border-dashed border-teal/40 bg-white p-5 shadow-[0_12px_32px_rgba(14,90,138,0.08)]">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-extrabold text-deep">🎛️ Panel Demo</h4>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                state.provider === "sandbox"
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {state.provider === "sandbox" ? "AstraPay Sandbox" : "Simulasi lokal"}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Simulasikan pembeli membayar lewat QRIS
          </p>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => {
                  setAmount(p);
                  setCustom("");
                }}
                className={`rounded-xl py-2 text-[11px] font-bold transition ${
                  !custom && amount === p
                    ? "bg-deep text-white"
                    : "bg-mist text-slate-600 active:scale-95"
                }`}
              >
                {formatRpShort(p)}
              </button>
            ))}
          </div>
          <input
            inputMode="numeric"
            placeholder="Atau ketik nominal lain, mis. 750000"
            value={custom}
            onChange={(e) => setCustom(e.target.value.replace(/\D/g, ""))}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-mist px-3 py-2.5 text-xs font-semibold text-deep placeholder:font-normal placeholder:text-slate-400 focus:border-teal focus:outline-none"
          />

          <button
            onClick={() => effAmount >= 1000 && onReceiveQris(effAmount)}
            disabled={busy || effAmount < 1000}
            className="mt-3 w-full rounded-2xl bg-gradient-to-r from-deep to-teal py-3.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? "Membuat QR…" : `📲 Terima Pembayaran QRIS ${formatRp(effAmount)}`}
          </button>

          <button
            onClick={onReset}
            disabled={busy}
            className="mt-2 w-full rounded-2xl border border-slate-200 py-2.5 text-xs font-bold text-slate-500 transition active:scale-[0.98]"
          >
            ↺ Reset demo
          </button>
        </div>

        {/* Riwayat transaksi */}
        <div className="anim-rise rounded-3xl bg-white p-5 shadow-[0_12px_32px_rgba(14,90,138,0.12)]">
          <h4 className="text-sm font-extrabold text-deep">Riwayat transaksi</h4>
          <div className="mt-2 divide-y divide-slate-100">
            {recentTx.map((tx) => (
              <TxRow key={tx.id} tx={tx} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const TX_META: Record<Tx["type"], { icon: string; label: string; sign: string; cls: string }> = {
  QRIS_IN: { icon: "🟢", label: "Penjualan QRIS", sign: "+", cls: "text-emerald-600" },
  TOPUP: { icon: "⬆️", label: "Top up saldo", sign: "+", cls: "text-slate-600" },
  FIF_PAYMENT: { icon: "🏍️", label: "Angsuran FIF", sign: "−", cls: "text-slate-600" },
  LOAN_IN: { icon: "💸", label: "Pencairan Modal Jalan", sign: "+", cls: "text-teal" },
  REPAY_CUT: { icon: "🔄", label: "Auto-cicil Modal Jalan", sign: "−", cls: "text-amber-600" },
};

function TxRow({ tx }: { tx: Tx }) {
  const m = TX_META[tx.type];
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="text-base">{m.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-slate-700">{tx.note ?? m.label}</p>
        <p className="text-[10px] text-slate-400">{formatDateTime(tx.ts)}</p>
      </div>
      <span className={`text-xs font-bold ${m.cls}`}>
        {m.sign}
        {formatRp(tx.amount)}
      </span>
    </div>
  );
}
