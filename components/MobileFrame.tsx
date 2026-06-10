"use client";

// Bingkai mobile di tengah layar desktop (§2, §10) — demo via screen share.

export default function MobileFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center p-4 sm:p-8"
      style={{
        background:
          "radial-gradient(1200px 700px at 70% -10%, #12a0b8 0%, transparent 55%), radial-gradient(900px 600px at 10% 110%, #0e5a8a 0%, transparent 60%), #072f4b",
      }}
    >
      <div className="hidden flex-col gap-3 pr-12 lg:flex">
        <span className="text-sm font-bold uppercase tracking-[0.3em] text-teal">
          AstraPay × Tim Andalusia
        </span>
        <h1 className="max-w-sm text-4xl font-extrabold leading-tight text-white">
          Naik Kelas
        </h1>
        <p className="max-w-xs text-sm leading-relaxed text-sky-200/80">
          Jejak transaksi jadi AstraScore. AstraScore membuka Modal Jalan.
          Modal Jalan dicicil otomatis — <em>bayar sambil jualan</em>.
        </p>
        <p className="text-xs text-sky-200/50">
          Prototype Hackathon 2026 · angka fee & plafon ilustratif
        </p>
      </div>

      <div className="relative w-full max-w-[400px]">
        <div className="rounded-[2.6rem] bg-deep-darker/80 p-[10px] shadow-[0_30px_80px_rgba(2,20,35,0.55)]">
          <div className="relative flex h-[780px] max-h-[92vh] flex-col overflow-hidden rounded-[2rem] bg-mist">
            {/* status bar */}
            <div className="flex items-center justify-between bg-deep px-6 pb-2 pt-3 text-[11px] font-semibold text-white/90">
              <span>09.41</span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-teal" />
                AstraPay
              </span>
              <span>▮▮▮ 100%</span>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
