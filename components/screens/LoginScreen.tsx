"use client";

// Layar 1 (§8.1): pilih profil merchant — mempercepat demo, tanpa ngetik.

import { PERSONAS, PERSONA_IDS } from "@/lib/personas";
import { formatRpShort } from "@/lib/format";
import type { PersonaId } from "@/lib/types";

export default function LoginScreen({
  onSelect,
  busy,
}: {
  onSelect: (id: PersonaId) => void;
  busy: boolean;
}) {
  return (
    <div className="frame-scroll flex-1 overflow-y-auto">
      <div className="bg-gradient-to-b from-deep to-deep-dark px-6 pb-10 pt-8 text-white">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-teal">
          AstraPay · Naik Kelas
        </p>
        <h2 className="mt-2 text-2xl font-extrabold leading-snug">
          Masuk sebagai
          <br />
          merchant demo
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-sky-100/80">
          4 persona dengan ±90 hari riwayat transaksi sintetis. Skor dihitung
          nyata dari data — bukan angka mati.
        </p>
      </div>

      <div className="-mt-5 space-y-3 px-5 pb-8">
        {PERSONA_IDS.map((id, i) => {
          const p = PERSONAS[id].profile;
          const g = PERSONAS[id].gen;
          return (
            <button
              key={id}
              disabled={busy}
              onClick={() => onSelect(id)}
              className="anim-rise flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-[0_8px_24px_rgba(14,90,138,0.10)] transition active:scale-[0.98] disabled:opacity-60"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-light text-2xl">
                {p.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-bold text-deep">
                    {p.name} · {p.business}
                  </span>
                  <span className="shrink-0 text-[11px] font-semibold text-slate-400">
                    ~{formatRpShort(g.avgMonthlyQrisSales)}/bln
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                  {p.tagline}
                </span>
              </span>
            </button>
          );
        })}
        <p className="px-2 pt-1 text-center text-[10px] text-slate-400">
          Prototype — data persona sintetis, fee & plafon ilustratif.
        </p>
      </div>
    </div>
  );
}
