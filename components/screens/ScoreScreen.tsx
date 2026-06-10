"use client";

// Layar 3 (§8.3): gauge AstraScore + tier + plafon + panel explainability.

import type { AppState } from "@/lib/types";
import { formatRp } from "@/lib/format";
import ScoreGauge from "../ScoreGauge";
import ExplainBars from "../ExplainBars";

export default function ScoreScreen({
  state,
  fromScore,
  onApply,
  onDashboard,
}: {
  state: AppState;
  /** animasikan gauge dari skor lama (setelah Naik Kelas) */
  fromScore?: number;
  onApply: () => void;
  onDashboard: () => void;
}) {
  const s = state.score;
  const eligible = s.limit > 0;
  const hasActiveLoan = state.loan?.status === "ACTIVE";

  return (
    <div className="frame-scroll flex-1 overflow-y-auto">
      <div className="bg-gradient-to-b from-deep to-deep-dark px-6 pb-16 pt-6 text-center text-white">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-teal">
          AstraScore · {state.profile.name}
        </p>
      </div>

      <div className="-mt-12 px-5 pb-8">
        <div className="anim-rise rounded-3xl bg-white px-5 pb-5 pt-6 shadow-[0_12px_32px_rgba(14,90,138,0.12)]">
          <ScoreGauge score={s.score} tierName={s.tier.name} fromScore={fromScore} />
          {s.bonus > 0 && (
            <p className="mt-1 text-center text-[11px] font-semibold text-amber-600">
              termasuk bonus pelunasan +{s.bonus} poin
            </p>
          )}

          <div className="mt-4 flex items-center justify-between rounded-2xl bg-gradient-to-r from-deep to-teal px-5 py-4 text-white">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-100/80">
                Plafon Modal Jalan
              </p>
              <p className="text-xl font-extrabold">{formatRp(s.limit)}</p>
            </div>
            <div className="text-right text-[10px] leading-relaxed text-sky-100/90">
              fee {(s.tier.feeRate * 100).toFixed(1).replace(".", ",")}%/bln*
              <br />
              dicicil 20% dari tiap penjualan
            </div>
          </div>
          {eligible ? (
            <button
              onClick={onApply}
              disabled={hasActiveLoan}
              className="mt-4 w-full rounded-2xl bg-deep py-3.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:bg-slate-300"
            >
              {hasActiveLoan ? "Modal Jalan sedang berjalan" : "Ajukan Modal Jalan →"}
            </button>
          ) : (
            <p className="mt-4 rounded-2xl bg-mist p-4 text-center text-xs text-slate-500">
              Skormu belum membuka plafon. Ikuti saran di bawah dan coba lagi
              bulan depan ya!
            </p>
          )}
          {(hasActiveLoan || state.loan) && (
            <button
              onClick={onDashboard}
              className="mt-2 w-full rounded-2xl border border-slate-200 py-3 text-sm font-bold text-deep transition active:scale-[0.98]"
            >
              Lihat dashboard arus kas
            </button>
          )}
        </div>

        <div className="anim-rise mt-4 rounded-3xl bg-white p-5 shadow-[0_12px_32px_rgba(14,90,138,0.12)]" style={{ animationDelay: "120ms" }}>
          <h4 className="text-sm font-extrabold text-deep">Kenapa skormu segini?</h4>
          <p className="mb-4 mt-0.5 text-[11px] text-slate-400">
            Kontribusi tiap faktor — transparan & bisa diverifikasi
          </p>
          <ExplainBars features={s.features} />
        </div>

        <div className="anim-rise mt-4 rounded-3xl bg-teal-light p-5" style={{ animationDelay: "200ms" }}>
          <h4 className="text-sm font-extrabold text-deep">💡 Cara naik tier</h4>
          <ul className="mt-2 space-y-1.5">
            {s.advice.map((a) => (
              <li key={a} className="flex gap-2 text-xs leading-relaxed text-slate-600">
                <span className="text-teal">•</span> {a}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-3 px-2 text-center text-[10px] text-slate-400">
          *Angka fee & plafon adalah ilustrasi prototipe.
        </p>
      </div>
    </div>
  );
}
