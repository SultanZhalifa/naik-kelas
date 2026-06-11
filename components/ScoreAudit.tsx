"use client";

// Panel audit untuk juri: data mentah → normalisasi → bobot → kontribusi → skor.
// Setiap angka di sini bisa dicek ulang dengan kalkulator.

import { useState } from "react";
import type { ScoreResult } from "@/lib/engine";
import { formatRp } from "@/lib/format";

export default function ScoreAudit({ score }: { score: ScoreResult }) {
  const [open, setOpen] = useState(false);
  const i = score.input;

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition active:scale-[0.99]"
      >
        <span className="text-xs font-bold text-deep">
          🔍 Audit perhitungan (untuk juri)
        </span>
        <span className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {open && (
        <div className="anim-rise mt-2 space-y-4 rounded-2xl bg-white p-4 text-[11px] shadow-[0_8px_24px_rgba(14,90,138,0.08)]">
          <div>
            <p className="mb-1.5 font-bold uppercase tracking-wide text-slate-400">
              1 · Data input (turunan transaksi 90 hari)
            </p>
            <AuditRow k="Omzet QRIS / bulan" v={formatRp(i.avgMonthlyQrisSales)} />
            <AuditRow k="Rata-rata harian" v={formatRp(i.avgDailySales)} />
            <AuditRow k="Stdev harian (winsorized 3×)" v={formatRp(i.stdevDailySales)} />
            <AuditRow k="Transaksi 30 hari" v={String(i.txCountLast30d)} />
            <AuditRow
              k="Angsuran FIF tepat waktu"
              v={`${Math.round(i.fifOnTimeRatio * 100)}%`}
            />
            <AuditRow k="Tenure · KYC" v={`${i.tenureMonths} bln · ${i.kycLevel}`} />
            <AuditRow
              k="Pertumbuhan 3 bulan"
              v={`${i.salesGrowth3m >= 0 ? "+" : ""}${Math.round(i.salesGrowth3m * 100)}%`}
            />
            <AuditRow k="Modal Jalan lunas tepat waktu" v={`${i.loansRepaidOnTime}×`} />
          </div>

          <div>
            <p className="mb-1.5 font-bold uppercase tracking-wide text-slate-400">
              2 · Normalisasi × bobot × 550
            </p>
            {score.features.map((f) => (
              <div
                key={f.key}
                className="flex items-baseline justify-between gap-2 border-b border-slate-50 py-1"
              >
                <span className="text-slate-500">{f.label}</span>
                <span className="shrink-0 font-mono font-semibold text-slate-700">
                  {f.value.toFixed(3)} × {f.weight} × 550 ={" "}
                  <span className="text-deep">{f.contribution}</span>
                </span>
              </div>
            ))}
          </div>

          <div>
            <p className="mb-1.5 font-bold uppercase tracking-wide text-slate-400">
              3 · Skor akhir
            </p>
            <AuditRow
              k="300 dasar + total kontribusi"
              v={`${score.baseScore}`}
            />
            <AuditRow
              k="Bonus pelunasan (maks 40)"
              v={`+${score.bonus}`}
            />
            <div className="mt-1 flex items-baseline justify-between rounded-xl bg-teal-light px-3 py-2">
              <span className="font-bold text-deep">AstraScore</span>
              <span className="font-mono text-sm font-extrabold text-deep">
                {score.score}
              </span>
            </div>
          </div>

          <p className="leading-relaxed text-slate-400">
            Deterministik: data yang sama selalu menghasilkan skor yang sama.
            Mesin yang identik dipakai server, simulasi what-if, dan unit test.
          </p>
        </div>
      )}
    </div>
  );
}

function AuditRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-slate-50 py-1">
      <span className="text-slate-500">{k}</span>
      <span className="shrink-0 font-mono font-semibold text-slate-700">{v}</span>
    </div>
  );
}
