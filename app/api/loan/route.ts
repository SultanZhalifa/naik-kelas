import { getProvider } from "@/lib/astrapay";
import { applyDisbursement } from "@/lib/state";
import { resolveState, saveSession } from "@/lib/store";
import type { AppState } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const state = resolveState(body.state as AppState | undefined);
  if (!state) {
    return Response.json({ error: "Sesi tidak ditemukan. Mulai ulang demo." }, { status: 400 });
  }
  const amount = Number(body.amount);

  const result = applyDisbursement(state, amount, Date.now(), body.usePoints === true);
  if (result.error) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  // Disbursement via provider (Sandbox bila aktif; selalu ada fallback mock)
  const disb = await getProvider().disburse(amount, state.profile.name);
  result.state.provider = disb.provider;

  saveSession(result.state);
  return Response.json({ state: result.state, disbursement: disb });
}
