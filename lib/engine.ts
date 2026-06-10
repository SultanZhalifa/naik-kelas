// Mesin AstraScore — implementasi persis BUILD_SPEC §4.
// Modul murni tanpa side effect: input statistik transaksi, output skor + tier +
// plafon + breakdown kontribusi per fitur (explainability).

export type KycLevel = "VERIFIED" | "PREFERRED";

export interface ScoreInput {
  /** Rasio cicilan FIF tepat waktu, 0..1 */
  fifOnTimeRatio: number;
  /** Rata-rata penjualan QRIS per bulan (Rp), dari 90 hari terakhir */
  avgMonthlyQrisSales: number;
  /** Stdev penjualan harian (Rp) selama 90 hari */
  stdevDailySales: number;
  /** Rata-rata penjualan harian (Rp) selama 90 hari */
  avgDailySales: number;
  /** Jumlah transaksi (QRIS masuk + top up) 30 hari terakhir */
  txCountLast30d: number;
  /** Lama jadi pengguna, bulan */
  tenureMonths: number;
  kycLevel: KycLevel;
  /** Pertumbuhan penjualan bulan terakhir vs 3 bulan lalu, mis. 0.18 = +18% */
  salesGrowth3m: number;
  /** Jumlah Modal Jalan yang sudah dilunasi tepat waktu (untuk bonus skor) */
  loansRepaidOnTime: number;
}

export interface Tier {
  id: "belum" | "pemula" | "tumbuh" | "mapan" | "juara";
  name: string;
  min: number;
  max: number;
  /** Plafon maksimum tier (Rp) */
  cap: number;
  /** Fee per bulan (ilustrasi prototipe) */
  feeRate: number;
}

export interface FeatureBreakdown {
  key: string;
  label: string;
  weight: number;
  /** Nilai fitur ternormalisasi 0..1 */
  value: number;
  /** Kontribusi poin = weight * value * 550 */
  contribution: number;
  /** Kontribusi maksimum jika value = 1 */
  maxContribution: number;
}

export interface ScoreResult {
  /** Skor akhir 300..850 (termasuk bonus pelunasan) */
  score: number;
  /** Skor murni dari rumus, sebelum bonus */
  baseScore: number;
  /** Bonus pelunasan tepat waktu: min(loansRepaidOnTime * 8, 40) */
  bonus: number;
  tier: Tier;
  /** Plafon final (Rp) = min(cap tier, 0.5 * omzet bulanan dibulatkan ke 50rb) */
  limit: number;
  features: FeatureBreakdown[];
  advice: string[];
  input: ScoreInput;
}

export const TIERS: Tier[] = [
  { id: "belum", name: "Belum Memenuhi", min: 300, max: 579, cap: 0, feeRate: 0 },
  { id: "pemula", name: "Pemula", min: 580, max: 669, cap: 500_000, feeRate: 0.025 },
  { id: "tumbuh", name: "Tumbuh", min: 670, max: 739, cap: 1_500_000, feeRate: 0.02 },
  { id: "mapan", name: "Mapan", min: 740, max: 799, cap: 3_000_000, feeRate: 0.015 },
  { id: "juara", name: "Juara", min: 800, max: 850, cap: 5_000_000, feeRate: 0.012 },
];

export const SCORE_MIN = 300;
export const SCORE_MAX = 850;
export const SCORE_RANGE = 550;

/** Porsi setiap transaksi QRIS yang dipotong untuk cicilan Modal Jalan */
export const REPAYMENT_RATE = 0.2;

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

export function tierForScore(score: number): Tier {
  for (const t of TIERS) {
    if (score >= t.min && score <= t.max) return t;
  }
  return score < SCORE_MIN ? TIERS[0] : TIERS[TIERS.length - 1];
}

/** §4.4 — plafon terikat arus kas: setengah omzet bulanan, kelipatan Rp50rb, ≤ cap tier */
export function computeLimit(tier: Tier, avgMonthlyQrisSales: number): number {
  const cashflowBound = Math.round((0.5 * avgMonthlyQrisSales) / 50_000) * 50_000;
  return Math.min(tier.cap, cashflowBound);
}

const WEIGHTS = {
  fif: 0.35,
  qris: 0.3,
  activity: 0.15,
  tenure: 0.1,
  growth: 0.1,
} as const;

export function computeScore(input: ScoreInput): ScoreResult {
  // §4.2 — fitur ternormalisasi 0..1
  const fif = clamp(input.fifOnTimeRatio, 0, 1);

  const normVolume = clamp(input.avgMonthlyQrisSales / 10_000_000, 0, 1);
  const consistency =
    1 - clamp(input.stdevDailySales / (input.avgDailySales + 1), 0, 1);
  const qris = 0.6 * normVolume + 0.4 * consistency;

  const activity = clamp(input.txCountLast30d / 60, 0, 1);

  const tenure =
    0.6 * clamp(input.tenureMonths / 24, 0, 1) +
    0.4 * (input.kycLevel === "PREFERRED" ? 1 : 0.5);

  const growth = clamp(0.5 + (input.salesGrowth3m / 0.5) * 0.5, 0, 1);

  // §4.3 — skor akhir
  const S =
    WEIGHTS.fif * fif +
    WEIGHTS.qris * qris +
    WEIGHTS.activity * activity +
    WEIGHTS.tenure * tenure +
    WEIGHTS.growth * growth;

  const baseScore = SCORE_MIN + Math.round(S * SCORE_RANGE);

  // §6 — bonus pelunasan Modal Jalan tepat waktu
  const bonus = Math.min(input.loansRepaidOnTime * 8, 40);
  const score = Math.min(baseScore + bonus, SCORE_MAX);

  const tier = tierForScore(score);
  const limit = computeLimit(tier, input.avgMonthlyQrisSales);

  const mk = (
    key: string,
    label: string,
    weight: number,
    value: number
  ): FeatureBreakdown => ({
    key,
    label,
    weight,
    value,
    contribution: Math.round(weight * value * SCORE_RANGE),
    maxContribution: Math.round(weight * SCORE_RANGE),
  });

  const features = [
    mk("fif", "Ketepatan bayar angsuran FIF", WEIGHTS.fif, fif),
    mk("qris", "Volume & konsistensi penjualan QRIS", WEIGHTS.qris, qris),
    mk("activity", "Keteraturan top up & frekuensi transaksi", WEIGHTS.activity, activity),
    mk("tenure", "Tenure & level akun", WEIGHTS.tenure, tenure),
    mk("growth", "Tren pertumbuhan 3 bulan", WEIGHTS.growth, growth),
  ];

  return {
    score,
    baseScore,
    bonus,
    tier,
    limit,
    features,
    advice: buildAdvice(features, input),
    input,
  };
}

/** §4.5 — saran singkat: fitur dengan ruang perbaikan terbesar (weight * (1 - value)) */
function buildAdvice(features: FeatureBreakdown[], input: ScoreInput): string[] {
  const tips: Record<string, string> = {
    fif: "Jaga angsuran FIF selalu tepat waktu — ini faktor terbesar skormu.",
    qris: "Tingkatkan volume & konsistensi penjualan QRIS harian untuk naik tier.",
    activity: "Perbanyak transaksi lewat AstraPay (QRIS & top up rutin) agar aktivitasmu terbaca.",
    tenure: "Terus gunakan akunmu — tenure yang panjang dan KYC Preferred menaikkan skor.",
    growth: "Dorong pertumbuhan omzet 3 bulan terakhir, misalnya lewat promo kecil di jam ramai.",
  };
  const ranked = [...features].sort(
    (a, b) => b.weight * (1 - b.value) - a.weight * (1 - a.value)
  );
  const advice = ranked.slice(0, 2).map((f) => tips[f.key]);
  if (input.loansRepaidOnTime === 0) {
    advice.push("Lunasi Modal Jalan pertamamu tepat waktu untuk bonus skor hingga +40 poin.");
  }
  return advice;
}
