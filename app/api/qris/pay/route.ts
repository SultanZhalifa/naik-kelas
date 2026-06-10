// POST /api/qris/pay — pembayaran QRIS masuk: catat penjualan, jalankan
// split repayment (§5), dan loop reward bila pinjaman lunas (§6).

import { applyQrisPayment } from "@/lib/state";
import { resolveState, saveSession } from "@/lib/store";
import type { AppState } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const state = resolveState(body.state as AppState | undefined);
  if (!state) {
    return Response.json({ error: "Sesi tidak ditemukan. Mulai ulang demo." }, { status: 400 });
  }
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 1000) {
    return Response.json({ error: "Nominal minimal Rp1.000" }, { status: 400 });
  }

  const { state: next, cut, celebration } = applyQrisPayment(
    state,
    Math.round(amount),
    Date.now(),
    typeof body.trxId === "string" ? body.trxId : undefined
  );

  saveSession(next);
  return Response.json({ state: next, cut, celebration });
}
