// Aksi-aksi murni atas AppState: buat sesi, cairkan Modal Jalan,
// terima pembayaran QRIS (split repayment §5), dan loop reward saat lunas (§6).

import { computeScore, REPAYMENT_RATE } from "./engine";
import { deriveStats, generateTransactions, initialBalance, PERSONAS } from "./personas";
import type { AppState, Celebration, PersonaId, Tx } from "./types";

export function createSession(personaId: PersonaId, now = Date.now()): AppState {
  const def = PERSONAS[personaId];
  if (!def) throw new Error(`Persona tidak dikenal: ${personaId}`);
  // Clone profil agar mutasi sesi (mis. fif.onTime saat lunas) tidak bocor antar sesi
  const profile = structuredClone(def.profile);
  const transactions = generateTransactions(personaId, now);
  const score = computeScore(deriveStats(transactions, profile, 0, now));
  return {
    sessionId: `${personaId}-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    personaId,
    profile,
    balance: initialBalance(personaId),
    points: 0,
    loansRepaidOnTime: 0,
    transactions,
    loan: null,
    score,
    provider: "mock",
  };
}

export interface DisburseResult {
  state: AppState;
  error?: string;
}

/** §5 — cairkan Modal Jalan: outstanding = principal * (1 + feeRate) */
export function applyDisbursement(
  state: AppState,
  amount: number,
  now = Date.now()
): DisburseResult {
  if (state.loan && state.loan.status === "ACTIVE") {
    return { state, error: "Masih ada Modal Jalan aktif. Lunasi dulu sebelum mengajukan lagi." };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { state, error: "Nominal tidak valid." };
  }
  if (amount > state.score.limit) {
    return { state, error: "Nominal melebihi plafon yang tersedia." };
  }
  const feeRate = state.score.tier.feeRate;
  const totalDue = Math.round(amount * (1 + feeRate));
  const tx: Tx = {
    id: `loan-${now.toString(36)}`,
    type: "LOAN_IN",
    amount,
    ts: now,
    note: "Pencairan Modal Jalan",
  };
  return {
    state: {
      ...state,
      balance: state.balance + amount,
      loan: {
        principal: amount,
        feeRate,
        outstanding: totalDue,
        totalDue,
        repaymentRate: REPAYMENT_RATE,
        status: "ACTIVE",
        createdAt: now,
      },
      transactions: [...state.transactions, tx],
    },
  };
}

export interface PaymentResult {
  state: AppState;
  /** Rp yang dipotong otomatis untuk cicilan dari transaksi ini */
  cut: number;
  /** Terisi saat pinjaman lunas — memicu layar "Naik Kelas" */
  celebration: Celebration | null;
}

/** §5 — transaksi QRIS masuk memotong cicilan otomatis; §6 — reward saat lunas */
export function applyQrisPayment(
  state: AppState,
  amount: number,
  now = Date.now(),
  trxId?: string
): PaymentResult {
  const saleTx: Tx = {
    id: trxId ?? `qris-demo-${now.toString(36)}`,
    type: "QRIS_IN",
    amount,
    ts: now,
    note: "Penjualan QRIS",
  };

  let next: AppState = { ...state, transactions: [...state.transactions, saleTx] };
  let cut = 0;
  let celebration: Celebration | null = null;

  if (next.loan && next.loan.status === "ACTIVE") {
    cut = Math.min(Math.round(amount * next.loan.repaymentRate), next.loan.outstanding);
    const outstanding = next.loan.outstanding - cut;
    const lunas = outstanding === 0;
    next = {
      ...next,
      balance: next.balance + (amount - cut),
      loan: { ...next.loan, outstanding, status: lunas ? "LUNAS" : "ACTIVE" },
    };
    if (cut > 0) {
      next.transactions = [
        ...next.transactions,
        {
          id: `cut-${now.toString(36)}`,
          type: "REPAY_CUT",
          amount: cut,
          ts: now,
          note: `Auto-cicil ${Math.round(next.loan!.repaymentRate * 100)}% dari penjualan`,
        },
      ];
    }
    if (lunas) {
      celebration = applyLoanRepaidReward(next, now);
    }
  } else {
    next = { ...next, balance: next.balance + amount };
  }

  return { state: next, cut, celebration };
}

/**
 * §6 — loop reward: pelunasan dicatat sebagai angsuran tepat waktu,
 * AstraPoints bertambah, lalu skor & plafon di-recompute dari data transaksi
 * terbaru (injeksi QRIS selama demo ikut menaikkan statistik).
 */
function applyLoanRepaidReward(state: AppState, now: number): Celebration {
  const loan = state.loan!;
  const oldScore = state.score.score;
  const oldLimit = state.score.limit;
  const oldTierName = state.score.tier.name;

  state.loansRepaidOnTime += 1;
  state.profile.fif.total += 1;
  state.profile.fif.onTime += 1;
  const pointsEarned = Math.round(loan.principal / 1000);
  state.points += pointsEarned;

  state.score = computeScore(
    deriveStats(state.transactions, state.profile, state.loansRepaidOnTime, now)
  );

  return {
    oldScore,
    newScore: state.score.score,
    oldLimit,
    newLimit: state.score.limit,
    oldTierName,
    newTierName: state.score.tier.name,
    pointsEarned,
    principal: loan.principal,
  };
}
