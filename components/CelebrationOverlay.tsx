"use client";

// Layar 7 (§8.7): klimaks demo — pinjaman lunas, skor naik, plafon membesar,
// AstraPoints bertambah. Semua angka adalah hasil recompute nyata.

import type { Celebration } from "@/lib/types";
import { formatRp } from "@/lib/format";
import AnimatedNumber from "./AnimatedNumber";
import Confetti from "./Confetti";

export default function CelebrationOverlay({
  c,
  onSeeScore,
  onClose,
}: {
  c: Celebration;
  onSeeScore: () => void;
  onClose: () => void;
}) {
  const tierUp = c.newTierName !== c.oldTierName;
  const limitUp = c.newLimit > c.oldLimit;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden bg-gradient-to-b from-deep to-deep-darker p-6">
      <Confetti />
      <div className="anim-pop w-full text-center text-white">
        <p className="text-5xl">🎉</p>
        <h3 className="mt-3 text-2xl font-extrabold leading-snug">
          Selamat, kamu
          <br />
          Naik Kelas!
        </h3>
        <p className="mx-auto mt-2 max-w-[260px] text-xs leading-relaxed text-sky-100/80">
          Modal Jalan {formatRp(c.principal)} lunas dari hasil jualanmu sendiri.
          Rekam jejak barumu langsung dihitung ulang:
        </p>

        <div className="mx-auto mt-6 w-full max-w-[300px] space-y-3">
          <StatCard
            label="AstraScore"
            old={String(c.oldScore)}
            now={<AnimatedNumber value={c.newScore} from={c.oldScore} durationMs={1400} />}
            badge={tierUp ? `Tier ${c.oldTierName} → ${c.newTierName}!` : undefined}
          />
          <StatCard
            label="Plafon Modal Jalan"
            old={formatRp(c.oldLimit)}
            now={
              <AnimatedNumber
                value={c.newLimit}
                from={c.oldLimit}
                durationMs={1400}
                format={formatRp}
              />
            }
            badge={limitUp ? "Plafonmu naik! 📈" : undefined}
          />
          <StatCard
            label="AstraPoints"
            old=""
            now={
              <>
                +<AnimatedNumber value={c.pointsEarned} durationMs={1200} /> poin
              </>
            }
          />
        </div>

        <button
          onClick={onSeeScore}
          className="mt-7 w-full max-w-[300px] rounded-2xl bg-white py-3.5 text-sm font-extrabold text-deep transition active:scale-[0.98]"
        >
          Lihat skor baruku →
        </button>
        <button onClick={onClose} className="mt-3 block w-full text-xs text-sky-200/70">
          kembali ke dashboard
        </button>
      </div>
    </div>
  );
}

function StatCard({
  label,
  old,
  now,
  badge,
}: {
  label: string;
  old: string;
  now: React.ReactNode;
  badge?: string;
}) {
  return (
    <div className="rounded-2xl bg-white/10 px-5 py-3.5 backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wide text-sky-100/70">
          {label}
        </span>
        {badge && (
          <span className="rounded-full bg-gold/90 px-2 py-0.5 text-[10px] font-extrabold text-deep-darker">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-1 flex items-baseline justify-center gap-2">
        {old && <span className="text-sm text-sky-200/60 line-through">{old}</span>}
        <span className="text-2xl font-extrabold">{now}</span>
      </div>
    </div>
  );
}
