"use client";

// Layar 2 (§8.2): consent eksplisit "Hubungkan data transaksi saya".

import { useEffect, useState } from "react";
import { PERSONAS } from "@/lib/personas";
import type { PersonaId } from "@/lib/types";

const LOADING_STEPS = [
  "Mengambil riwayat QRIS 90 hari…",
  "Membaca catatan angsuran FIF…",
  "Menghitung AstraScore…",
];

export default function ConsentScreen({
  personaId,
  connecting,
  onConnect,
  onBack,
}: {
  personaId: PersonaId;
  connecting: boolean;
  onConnect: () => void;
  onBack: () => void;
}) {
  const p = PERSONAS[personaId].profile;
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!connecting) {
      setStep(0);
      return;
    }
    const iv = setInterval(
      () => setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)),
      600
    );
    return () => clearInterval(iv);
  }, [connecting]);

  return (
    <div className="frame-scroll flex flex-1 flex-col overflow-y-auto">
      <div className="bg-gradient-to-b from-deep to-deep-dark px-6 pb-12 pt-6 text-white">
        <button onClick={onBack} className="text-xs text-sky-200/70" disabled={connecting}>
          ← ganti profil
        </button>
        <div className="mt-4 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl">
            {p.emoji}
          </span>
          <div>
            <p className="font-bold">Halo, {p.name}! 👋</p>
            <p className="text-xs text-sky-100/80">{p.business}</p>
          </div>
        </div>
      </div>

      <div className="-mt-6 flex-1 px-5 pb-8">
        <div className="anim-rise rounded-3xl bg-white p-6 shadow-[0_12px_32px_rgba(14,90,138,0.12)]">
          <span className="inline-block rounded-full bg-gold/15 px-3 py-1 text-[11px] font-bold text-amber-600">
            ✨ Baru untukmu
          </span>
          <h3 className="mt-3 text-xl font-extrabold leading-snug text-deep">
            Aktifkan Naik Kelas
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Jejak usahamu selama ini punya nilai. Izinkan kami membacanya untuk
            menghitung <strong className="text-deep">AstraScore</strong> — skor yang membuka{" "}
            <strong className="text-deep">Modal Jalan</strong>, modal kerja kecil yang
            dicicil otomatis dari penjualan QRIS-mu.
          </p>

          <div className="mt-4 space-y-2.5 rounded-2xl bg-mist p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Data yang akan dibaca
            </p>
            {[
              ["📊", "Riwayat penjualan QRIS 90 hari terakhir"],
              ["🏍️", "Catatan ketepatan angsuran FIF"],
              ["👤", "Profil akun: tenure & level KYC"],
            ].map(([icon, label]) => (
              <p key={label} className="flex items-center gap-2.5 text-xs text-slate-600">
                <span>{icon}</span> {label}
              </p>
            ))}
          </div>

          <button
            onClick={onConnect}
            disabled={connecting}
            className="anim-pulse-ring mt-5 w-full rounded-2xl bg-gradient-to-r from-deep to-teal py-3.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-80"
          >
            {connecting ? LOADING_STEPS[step] : "Hubungkan data transaksi saya"}
          </button>
          <p className="mt-3 text-center text-[10px] leading-relaxed text-slate-400">
            Dengan menghubungkan, kamu menyetujui pemakaian data transaksimu
            untuk penilaian kredit. Bisa dicabut kapan saja.
          </p>
        </div>
      </div>
    </div>
  );
}
