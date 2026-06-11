// Data persona sintetis (§7): 4 merchant sesuai spec + 1 persona thin-file
// (Dewi) untuk cerita inklusi. Masing-masing ~90 hari riwayat transaksi.
// Transaksi digenerate deterministik (seeded) sehingga statistik turunannya
// (avg, stdev, count, growth) mendekati parameter spec — skor TIDAK dihardcode,
// selalu dihitung ulang dari daftar transaksi oleh engine.

import { mulberry32, gauss, randInt, pick, type Rng } from "./rng";
import type { PersonaId, PersonaProfile, Tx } from "./types";
import type { ScoreInput } from "./engine";

const DAY = 24 * 60 * 60 * 1000;

interface GenParams {
  /** Target omzet QRIS rata-rata per bulan (Rp) */
  avgMonthlyQrisSales: number;
  /** Peluang ada penjualan di suatu hari */
  sellProb: number;
  /** Rentang jumlah transaksi QRIS per hari jualan */
  txPerDay: [number, number];
  /** Simpangan relatif omzet harian (semakin besar semakin naik-turun) */
  dailyNoise: number;
  /** Target pertumbuhan bulan terakhir vs 3 bulan lalu */
  growth3m: number;
  topupsPerMonth: number;
  seed: number;
}

interface PersonaDef {
  profile: PersonaProfile;
  gen: GenParams;
  /** Rentang tier yang diharapkan (untuk unit test) */
  expectedScoreRange: [number, number];
}

function makeProfile(
  id: PersonaId,
  name: string,
  business: string,
  emoji: string,
  tagline: string,
  tenureMonths: number,
  kycLevel: "VERIFIED" | "PREFERRED",
  fifOnTimeRatio: number,
  installmentAmount: number
): PersonaProfile {
  const total = tenureMonths; // satu angsuran FIF per bulan sepanjang tenure
  return {
    id,
    name,
    business,
    emoji,
    tagline,
    tenureMonths,
    kycLevel,
    fif: { total, onTime: Math.round(fifOnTimeRatio * total), installmentAmount },
  };
}

export const PERSONAS: Record<PersonaId, PersonaDef> = {
  budi: {
    profile: makeProfile(
      "budi",
      "Budi",
      "Pedagang Keliling",
      "🛵",
      "Jualan siomay keliling, omzet menengah, angsuran FIF rapi",
      14,
      "VERIFIED",
      0.95,
      920_000
    ),
    gen: {
      avgMonthlyQrisSales: 3_000_000,
      sellProb: 1.0,
      txPerDay: [1, 2],
      dailyNoise: 0.18,
      growth3m: 0.18,
      topupsPerMonth: 3,
      seed: 11,
    },
    expectedScoreRange: [670, 739], // Tumbuh
  },
  sari: {
    profile: makeProfile(
      "sari",
      "Sari",
      "Warung Sembako",
      "🏪",
      "Warung ramai, omzet tinggi & stabil, pelanggan tetap",
      22,
      "PREFERRED",
      1.0,
      1_100_000
    ),
    gen: {
      avgMonthlyQrisSales: 8_500_000,
      sellProb: 1.0,
      txPerDay: [1, 3],
      dailyNoise: 0.16,
      growth3m: 0.15,
      topupsPerMonth: 4,
      seed: 22,
    },
    expectedScoreRange: [740, 850], // Mapan/Juara
  },
  andi: {
    profile: makeProfile(
      "andi",
      "Andi",
      "Ojek & Kurir",
      "📦",
      "Narik & antar paket, nominal kecil tapi FIF tak pernah telat",
      10,
      "VERIFIED",
      1.0,
      780_000
    ),
    gen: {
      avgMonthlyQrisSales: 1_200_000,
      sellProb: 0.85,
      txPerDay: [1, 3],
      dailyNoise: 0.35,
      growth3m: 0.3,
      topupsPerMonth: 3,
      seed: 33,
    },
    expectedScoreRange: [580, 739], // Pemula/Tumbuh
  },
  rini: {
    profile: makeProfile(
      "rini",
      "Rini",
      "Bengkel Motor",
      "🔧",
      "Bengkel rumahan, omzet naik-turun tergantung musim servis",
      18,
      "VERIFIED",
      0.85,
      990_000
    ),
    gen: {
      avgMonthlyQrisSales: 4_000_000,
      sellProb: 0.93,
      txPerDay: [2, 3],
      dailyNoise: 0.38,
      growth3m: -0.05,
      topupsPerMonth: 3,
      seed: 44,
    },
    expectedScoreRange: [670, 739], // Tumbuh
  },
  dewi: {
    profile: makeProfile(
      "dewi",
      "Dewi",
      "Jastip & Jajanan",
      "🧺",
      "Baru 3 bulan gabung — jejak masih tipis, sedang dibangun",
      3,
      "VERIFIED",
      0.67, // 2 dari 3 angsuran tepat waktu
      650_000
    ),
    gen: {
      avgMonthlyQrisSales: 400_000,
      sellProb: 0.55,
      txPerDay: [1, 2],
      dailyNoise: 0.5,
      growth3m: 0.05,
      topupsPerMonth: 2,
      seed: 55,
    },
    expectedScoreRange: [300, 579], // Belum Memenuhi — cerita inklusi/pemberdayaan
  },
};

export const PERSONA_IDS = Object.keys(PERSONAS) as PersonaId[];

/** Jam-jam ramai (pagi & sore) untuk timestamp yang realistis */
const PEAK_HOURS = [7, 8, 9, 11, 12, 16, 17, 17, 18, 18, 19];

function txTimestamp(rng: Rng, dayStart: number): number {
  const hour = pick(rng, PEAK_HOURS);
  const minute = randInt(rng, 0, 59);
  return dayStart + hour * 3_600_000 + minute * 60_000;
}

function roundTo(n: number, step: number): number {
  return Math.max(step, Math.round(n / step) * step);
}

/**
 * Generate ~90 hari transaksi untuk satu persona. Deterministik untuk
 * (personaId, now-yang-sama). Mengembalikan transaksi terurut naik by ts.
 */
export function generateTransactions(personaId: PersonaId, now: number): Tx[] {
  const def = PERSONAS[personaId];
  const g = def.gen;
  const rng = mulberry32(g.seed);
  const txs: Tx[] = [];
  let n = 0;
  const nextId = (p: string) => `${p}-${personaId}-${++n}`;

  // Pengali bulanan agar growth bulan terbaru vs bulan ke-3 ≈ target
  const monthMult = [1 + g.growth3m, 1 + g.growth3m / 2, 1];

  // Pass 1: bobot mentah omzet per hari
  const raw: number[] = new Array(90).fill(0);
  for (let d = 0; d < 90; d++) {
    if (rng() < g.sellProb) {
      const mult = monthMult[Math.min(2, Math.floor(d / 30))];
      raw[d] = mult * Math.max(0.15, 1 + g.dailyNoise * gauss(rng));
    }
  }
  // Skala agar total 90 hari = 3x target omzet bulanan
  const rawSum = raw.reduce((a, b) => a + b, 0);
  const scale = (3 * g.avgMonthlyQrisSales) / rawSum;

  for (let d = 0; d < 90; d++) {
    if (raw[d] === 0) continue;
    const dayStart = startOfDay(now - d * DAY);
    const dailyTotal = raw[d] * scale;
    const count = randInt(rng, g.txPerDay[0], g.txPerDay[1]);
    // Bagi omzet harian ke beberapa transaksi dengan proporsi acak
    const shares = Array.from({ length: count }, () => 0.5 + rng());
    const shareSum = shares.reduce((a, b) => a + b, 0);
    for (const s of shares) {
      txs.push({
        id: nextId("qris"),
        type: "QRIS_IN",
        amount: roundTo((dailyTotal * s) / shareSum, 500),
        ts: txTimestamp(rng, dayStart),
        note: "Penjualan QRIS",
      });
    }
  }

  // Top up saldo beberapa kali per bulan
  const topups = Math.round(g.topupsPerMonth * 3);
  for (let i = 0; i < topups; i++) {
    const d = randInt(rng, 0, 89);
    txs.push({
      id: nextId("topup"),
      type: "TOPUP",
      amount: roundTo(100_000 + rng() * 400_000, 25_000),
      ts: txTimestamp(rng, startOfDay(now - d * DAY)),
      note: "Top up saldo",
    });
  }

  // Angsuran FIF: 1x/bulan (3 bulan terakhir terlihat di riwayat).
  // Status telat mengikuti rasio on-time persona.
  const ratio = def.profile.fif.onTime / def.profile.fif.total;
  for (let m = 0; m < 3; m++) {
    const onTime = rng() < ratio;
    const d = 12 + m * 30; // jatuh tempo konsisten tiap bulan
    txs.push({
      id: nextId("fif"),
      type: "FIF_PAYMENT",
      amount: def.profile.fif.installmentAmount,
      ts: txTimestamp(rng, startOfDay(now - d * DAY)),
      note: onTime ? "Angsuran FIF — tepat waktu" : "Angsuran FIF — terlambat 3 hari",
    });
  }

  txs.sort((a, b) => a.ts - b.ts);
  return txs;
}

export function initialBalance(personaId: PersonaId): number {
  const rng = mulberry32(PERSONAS[personaId].gen.seed + 99);
  return roundTo(150_000 + rng() * 350_000, 1_000);
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Turunkan statistik input skor dari daftar transaksi NYATA.
 * Inilah jembatan "data transaksi → AstraScore": injeksi QRIS saat demo ikut
 * terhitung saat skor di-recompute.
 */
export function deriveStats(
  transactions: Tx[],
  profile: PersonaProfile,
  loansRepaidOnTime: number,
  now: number
): ScoreInput {
  const daily = new Array<number>(90).fill(0);
  let txCountLast30d = 0;

  for (const tx of transactions) {
    const age = Math.floor((now - tx.ts) / DAY);
    if (age < 0 || age >= 90) continue;
    if (tx.type === "QRIS_IN") {
      daily[age] += tx.amount;
      if (age < 30) txCountLast30d++;
    } else if (tx.type === "TOPUP" && age < 30) {
      txCountLast30d++;
    }
  }

  const total90 = daily.reduce((a, b) => a + b, 0);
  const avgDailySales = total90 / 90;

  // Stdev dihitung robust (winsorized pada 3x rata-rata harian) supaya satu
  // hari outlier — termasuk lonjakan penjualan saat demo — tidak mendistorsi
  // metrik konsistensi. Rumus konsistensi di engine tetap sesuai spec.
  const cap = 3 * avgDailySales;
  const capped = daily.map((v) => Math.min(v, cap));
  const avgCapped = capped.reduce((a, b) => a + b, 0) / 90;
  const variance =
    capped.reduce((acc, v) => acc + (v - avgCapped) ** 2, 0) / 90;
  const stdevDailySales = Math.sqrt(variance);

  const recentMonth = daily.slice(0, 30).reduce((a, b) => a + b, 0);
  const oldMonth = daily.slice(60, 90).reduce((a, b) => a + b, 0);
  const salesGrowth3m =
    oldMonth > 0 ? (recentMonth - oldMonth) / oldMonth : recentMonth > 0 ? 1 : 0;

  return {
    fifOnTimeRatio: profile.fif.total > 0 ? profile.fif.onTime / profile.fif.total : 0,
    avgMonthlyQrisSales: total90 / 3,
    stdevDailySales,
    avgDailySales,
    txCountLast30d,
    tenureMonths: profile.tenureMonths,
    kycLevel: profile.kycLevel,
    salesGrowth3m,
    loansRepaidOnTime,
  };
}
