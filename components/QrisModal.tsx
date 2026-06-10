"use client";

// Modal QR pembayaran: tampilkan QR (asli dari Sandbox bila aktif),
// lalu "pembeli membayar" → split repayment berjalan.

import QRCode from "react-qr-code";
import { formatRp } from "@/lib/format";

export interface QrInfo {
  qrString: string;
  trxId: string;
  amount: number;
  provider: "mock" | "sandbox";
  fellBack?: boolean;
  status: "waiting" | "paid";
}

export default function QrisModal({ qr }: { qr: QrInfo }) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-deep-darker/70 p-6 backdrop-blur-sm">
      <div className="anim-pop w-full rounded-3xl bg-white p-6 text-center shadow-2xl">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
          {qr.provider === "sandbox" ? "QRIS · AstraPay Sandbox" : "QRIS · Simulasi"}
          {qr.fellBack && " (fallback)"}
        </p>
        <p className="mt-1 text-2xl font-extrabold text-deep">{formatRp(qr.amount)}</p>

        <div className="mx-auto mt-4 w-fit rounded-2xl border-2 border-slate-100 p-3">
          <QRCode value={qr.qrString} size={168} fgColor="#0a4368" />
        </div>
        <p className="mt-2 break-all px-4 text-[9px] text-slate-300">{qr.trxId}</p>

        {qr.status === "waiting" ? (
          <p className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-teal border-t-transparent" />
            Menunggu pembeli membayar…
          </p>
        ) : (
          <p className="anim-pop mt-3 text-sm font-extrabold text-emerald-600">
            ✓ Pembayaran diterima!
          </p>
        )}
      </div>
    </div>
  );
}
