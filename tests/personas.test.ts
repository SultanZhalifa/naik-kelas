import { describe, expect, it } from "vitest";
import { computeScore } from "@/lib/engine";
import { deriveStats, generateTransactions, PERSONAS, PERSONA_IDS } from "@/lib/personas";
import { applyDisbursement, applyQrisPayment, createSession } from "@/lib/state";

// Waktu tetap supaya hasil test deterministik
const NOW = new Date("2026-06-11T12:00:00+07:00").getTime();

describe("persona seed → tier yang diharapkan (§7)", () => {
  for (const id of PERSONA_IDS) {
    const def = PERSONAS[id];
    it(`${def.profile.name} (${def.profile.business})`, () => {
      const txs = generateTransactions(id, NOW);
      const stats = deriveStats(txs, def.profile, 0, NOW);
      const result = computeScore(stats);

      // Statistik turunan mendekati parameter spec
      expect(stats.avgMonthlyQrisSales).toBeGreaterThan(def.gen.avgMonthlyQrisSales * 0.9);
      expect(stats.avgMonthlyQrisSales).toBeLessThan(def.gen.avgMonthlyQrisSales * 1.1);
      expect(Math.abs(stats.fifOnTimeRatio - def.profile.fif.onTime / def.profile.fif.total)).toBeLessThan(0.01);

      console.log(
        `${def.profile.name}: skor=${result.score} tier=${result.tier.name} plafon=${result.limit} ` +
          `(omzet/bln=${Math.round(stats.avgMonthlyQrisSales)}, tx30d=${stats.txCountLast30d}, growth=${stats.salesGrowth3m.toFixed(2)})`
      );

      // Tier sesuai harapan
      const [lo, hi] = def.expectedScoreRange;
      expect(result.score, `skor ${def.profile.name} = ${result.score}`).toBeGreaterThanOrEqual(lo);
      expect(result.score, `skor ${def.profile.name} = ${result.score}`).toBeLessThanOrEqual(hi);
    });
  }

  it("jumlah transaksi cukup untuk 90 hari (puluhan transaksi per persona)", () => {
    for (const id of PERSONA_IDS) {
      const txs = generateTransactions(id, NOW);
      expect(txs.length).toBeGreaterThan(60);
    }
  });
});

describe("split repayment & loop reward (§5–§6)", () => {
  it("pembayaran QRIS memotong 20% sampai lunas, lalu skor/plafon/poin naik", () => {
    let state = createSession("budi", NOW);
    const before = state.score;
    expect(before.limit).toBeGreaterThan(0);

    // Cairkan Modal Jalan 300rb
    const disb = applyDisbursement(state, 300_000, NOW);
    expect(disb.error).toBeUndefined();
    state = disb.state;
    const totalDue = Math.round(300_000 * (1 + before.tier.feeRate));
    expect(state.loan!.outstanding).toBe(totalDue);
    const balanceAfterLoan = state.balance;

    // Transaksi 200rb → potongan 40rb
    const p1 = applyQrisPayment(state, 200_000, NOW + 1000);
    state = p1.state;
    expect(p1.cut).toBe(40_000);
    expect(state.loan!.outstanding).toBe(totalDue - 40_000);
    expect(state.balance).toBe(balanceAfterLoan + 160_000);
    expect(p1.celebration).toBeNull();

    // Bayar terus sampai lunas
    let guard = 0;
    let celebration = null;
    while (state.loan!.status === "ACTIVE" && guard++ < 50) {
      const p = applyQrisPayment(state, 500_000, NOW + 2000 + guard);
      state = p.state;
      celebration = p.celebration ?? celebration;
    }
    expect(state.loan!.status).toBe("LUNAS");
    expect(state.loan!.outstanding).toBe(0);

    // Loop reward §6
    expect(celebration).not.toBeNull();
    expect(state.loansRepaidOnTime).toBe(1);
    expect(state.points).toBe(Math.round(300_000 / 1000));
    expect(state.score.score).toBeGreaterThan(before.score); // bonus +8 & stats naik
    expect(celebration!.newScore).toBe(state.score.score);
    expect(celebration!.oldScore).toBe(before.score);
  });

  it("potongan terakhir tidak melebihi sisa outstanding", () => {
    let state = createSession("andi", NOW);
    state = applyDisbursement(state, 100_000, NOW).state;
    const due = state.loan!.outstanding;
    // Transaksi sangat besar: potongan = sisa outstanding, bukan 20% penuh
    const p = applyQrisPayment(state, 10_000_000, NOW + 1000);
    expect(p.cut).toBe(due);
    expect(p.state.loan!.status).toBe("LUNAS");
    expect(p.state.balance).toBeGreaterThan(state.balance);
  });

  it("skenario klimaks demo Sari: lunas → skor & plafon naik", () => {
    let state = createSession("sari", NOW);
    const before = state.score;
    state = applyDisbursement(state, 500_000, NOW).state;

    let celebration = null;
    for (let i = 1; i <= 3 && state.loan!.status === "ACTIVE"; i++) {
      const p = applyQrisPayment(state, 1_000_000, NOW + i * 60_000);
      state = p.state;
      celebration = p.celebration ?? celebration;
    }
    expect(state.loan!.status).toBe("LUNAS");
    console.log(
      `Sari klimaks: ${before.score} (${before.tier.name}, plafon ${before.limit}) → ` +
        `${state.score.score} (${state.score.tier.name}, plafon ${state.score.limit}), poin +${celebration!.pointsEarned}`
    );
    expect(state.score.score).toBeGreaterThan(before.score);
    expect(state.score.limit).toBeGreaterThan(before.limit);
  });

  it("tukar AstraPoints memberi diskon fee dan memotong saldo poin", () => {
    // siklus 1: pinjam-lunasi untuk mengumpulkan poin
    let state = createSession("sari", NOW);
    state = applyDisbursement(state, 500_000, NOW).state;
    let guard = 0;
    while (state.loan!.status === "ACTIVE" && guard++ < 10) {
      state = applyQrisPayment(state, 1_000_000, NOW + guard * 1000).state;
    }
    expect(state.points).toBe(500);
    const baseFee = state.score.tier.feeRate;

    // siklus 2: pinjam lagi dengan menukar 250 poin
    const r = applyDisbursement(state, 1_000_000, NOW + 99_000, true);
    expect(r.error).toBeUndefined();
    expect(r.state.points).toBe(250);
    expect(r.state.loan!.pointsUsed).toBe(250);
    // pinjaman pertama yang lunas masuk ledger
    expect(r.state.loanHistory).toHaveLength(1);
    expect(r.state.loanHistory[0].status).toBe("LUNAS");
    expect(r.state.loanHistory[0].paidAt).toBeDefined();
    expect(r.state.loan!.feeRate).toBeCloseTo(Math.max(baseFee - 0.005, 0.005));
    expect(r.state.loan!.totalDue).toBe(
      Math.round(1_000_000 * (1 + r.state.loan!.feeRate))
    );
  });

  it("usePoints diabaikan bila poin tidak cukup", () => {
    const state = createSession("budi", NOW);
    const r = applyDisbursement(state, 200_000, NOW, true);
    expect(r.state.points).toBe(0);
    expect(r.state.loan!.pointsUsed).toBe(0);
    expect(r.state.loan!.feeRate).toBe(state.score.tier.feeRate);
  });

  it("tidak bisa mencairkan melebihi plafon atau saat pinjaman aktif", () => {
    const state = createSession("budi", NOW);
    expect(applyDisbursement(state, state.score.limit + 50_000, NOW).error).toBeDefined();
    const ok = applyDisbursement(state, 200_000, NOW);
    expect(ok.error).toBeUndefined();
    expect(applyDisbursement(ok.state, 100_000, NOW).error).toBeDefined();
  });
});
