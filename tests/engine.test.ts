import { describe, expect, it } from "vitest";
import { clamp, computeLimit, computeScore, tierForScore, TIERS } from "@/lib/engine";
import type { ScoreInput } from "@/lib/engine";

const baseInput: ScoreInput = {
  fifOnTimeRatio: 1,
  avgMonthlyQrisSales: 10_000_000,
  stdevDailySales: 0,
  avgDailySales: 333_333,
  txCountLast30d: 60,
  tenureMonths: 24,
  kycLevel: "PREFERRED",
  salesGrowth3m: 0.5,
  loansRepaidOnTime: 0,
};

describe("computeScore — rumus §4", () => {
  it("input sempurna menghasilkan skor maksimum 850", () => {
    const r = computeScore(baseInput);
    expect(r.baseScore).toBe(850);
    expect(r.tier.id).toBe("juara");
  });

  it("input nol menghasilkan skor mendekati minimum", () => {
    const r = computeScore({
      fifOnTimeRatio: 0,
      avgMonthlyQrisSales: 0,
      stdevDailySales: 1_000_000,
      avgDailySales: 0,
      txCountLast30d: 0,
      tenureMonths: 0,
      kycLevel: "VERIFIED",
      salesGrowth3m: -1,
      loansRepaidOnTime: 0,
    });
    // tenure tetap menyumbang 0.4*0.5 karena KYC VERIFIED bernilai 0.5
    expect(r.baseScore).toBe(300 + Math.round(0.1 * 0.2 * 550));
    expect(r.tier.id).toBe("belum");
  });

  it("kontribusi fitur = weight * value * 550 dan totalnya = baseScore - 300", () => {
    const r = computeScore(baseInput);
    const total = r.features.reduce((a, f) => a + f.contribution, 0);
    expect(Math.abs(total - (r.baseScore - 300))).toBeLessThanOrEqual(3); // toleransi rounding
    for (const f of r.features) {
      expect(f.contribution).toBe(Math.round(f.weight * f.value * 550));
    }
  });

  it("bonus pelunasan = min(n*8, 40) dan skor tidak melebihi 850", () => {
    const r1 = computeScore({ ...baseInput, fifOnTimeRatio: 0.5, loansRepaidOnTime: 2 });
    expect(r1.bonus).toBe(16);
    expect(r1.score).toBe(r1.baseScore + 16);
    const r2 = computeScore({ ...baseInput, loansRepaidOnTime: 10 });
    expect(r2.bonus).toBe(40);
    expect(r2.score).toBe(850); // dibatasi maksimum
  });

  it("growthScore: 0% growth → 0.5, +50% → 1, negatif → <0.5", () => {
    const at = (g: number) =>
      computeScore({ ...baseInput, salesGrowth3m: g }).features.find(
        (f) => f.key === "growth"
      )!.value;
    expect(at(0)).toBeCloseTo(0.5);
    expect(at(0.5)).toBe(1);
    expect(at(-0.2)).toBeLessThan(0.5);
  });
});

describe("tier & plafon §4.3–4.4", () => {
  it("batas tier sesuai tabel", () => {
    expect(tierForScore(579).id).toBe("belum");
    expect(tierForScore(580).id).toBe("pemula");
    expect(tierForScore(669).id).toBe("pemula");
    expect(tierForScore(670).id).toBe("tumbuh");
    expect(tierForScore(739).id).toBe("tumbuh");
    expect(tierForScore(740).id).toBe("mapan");
    expect(tierForScore(799).id).toBe("mapan");
    expect(tierForScore(800).id).toBe("juara");
    expect(tierForScore(850).id).toBe("juara");
  });

  it("plafon = min(cap tier, setengah omzet dibulatkan ke 50rb)", () => {
    const tumbuh = TIERS.find((t) => t.id === "tumbuh")!;
    expect(computeLimit(tumbuh, 2_000_000)).toBe(1_000_000); // cashflow-bound
    expect(computeLimit(tumbuh, 2_060_000)).toBe(1_050_000); // pembulatan ke 50rb
    expect(computeLimit(tumbuh, 8_000_000)).toBe(1_500_000); // cap-bound
  });

  it("clamp bekerja", () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });
});
