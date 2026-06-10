// POST /api/qris — buat QR pembayaran (Sandbox bila aktif, selain itu mock).
// Belum mengubah state; pembayaran dikonfirmasi via POST /api/qris/pay.

import { getProvider } from "@/lib/astrapay";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 1000) {
    return Response.json({ error: "Nominal minimal Rp1.000" }, { status: 400 });
  }
  const qr = await getProvider().createQris(amount);
  return Response.json({ qr });
}
