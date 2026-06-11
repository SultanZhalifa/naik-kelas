import type { KycLevel, ScoreResult } from "./engine";

export type PersonaId = "budi" | "sari" | "andi" | "rini" | "dewi";

export type TxType =
  | "QRIS_IN" // penjualan masuk via QRIS
  | "TOPUP" // top up saldo
  | "FIF_PAYMENT" // pembayaran angsuran FIF
  | "LOAN_IN" // pencairan Modal Jalan
  | "REPAY_CUT"; // potongan otomatis cicilan dari penjualan

export interface Tx {
  id: string;
  type: TxType;
  /** Rp, selalu positif; arah ditentukan oleh type */
  amount: number;
  /** epoch ms */
  ts: number;
  note?: string;
}

export interface Loan {
  principal: number;
  feeRate: number;
  outstanding: number;
  repaymentRate: number;
  status: "ACTIVE" | "LUNAS";
  createdAt: number;
  /** total yang harus dikembalikan = principal * (1 + feeRate) */
  totalDue: number;
  /** AstraPoints yang ditukar untuk diskon fee pinjaman ini */
  pointsUsed: number;
  /** epoch ms saat lunas */
  paidAt?: number;
}

export interface PersonaProfile {
  id: PersonaId;
  name: string;
  business: string;
  emoji: string;
  tagline: string;
  tenureMonths: number;
  kycLevel: KycLevel;
  /** Ringkasan riwayat angsuran FIF sepanjang tenure */
  fif: { total: number; onTime: number; installmentAmount: number };
}

export interface AppState {
  sessionId: string;
  personaId: PersonaId;
  profile: PersonaProfile;
  balance: number;
  points: number;
  loansRepaidOnTime: number;
  transactions: Tx[];
  loan: Loan | null;
  /** Modal Jalan yang sudah selesai (ledger) */
  loanHistory: Loan[];
  score: ScoreResult;
  /** Penanda provider pembayaran yang terakhir dipakai (untuk badge UI) */
  provider: "mock" | "sandbox";
}

/** Payload perayaan saat pinjaman lunas — dipakai layar "Naik Kelas" */
export interface Celebration {
  oldScore: number;
  newScore: number;
  oldLimit: number;
  newLimit: number;
  oldTierName: string;
  newTierName: string;
  pointsEarned: number;
  principal: number;
}
