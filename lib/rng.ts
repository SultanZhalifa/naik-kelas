// PRNG deterministik (mulberry32) supaya data persona identik di setiap
// environment — penting agar skor bisa diverifikasi dan demo konsisten.

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Angka acak normal-ish (rata 0, sd 1) via sum of uniforms */
export function gauss(rng: Rng): number {
  return (rng() + rng() + rng() + rng() - 2) / Math.sqrt(4 / 12);
}

export function randInt(rng: Rng, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

export function pick<T>(rng: Rng, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
