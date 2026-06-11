// Uji edge-case API terhadap server berjalan: input invalid, batas plafon,
// dobel pinjam, potongan terakhir, poin tidak cukup, dan sweep 5 persona
// sampai lunas. Jalankan: node scripts/edge-tests.mjs [baseUrl]

const BASE = process.argv[2] ?? "http://localhost:3000";
let pass = 0;
let fail = 0;

function ok(cond, label) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(`  ✗ ${label}`);
  }
}

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

console.log("— Validasi input —");
{
  const r = await post("/api/session", { personaId: "hacker" });
  ok(r.status === 400 && r.data.error, "session: persona tidak dikenal → 400");
}
{
  const r = await post("/api/session", {});
  ok(r.status === 400, "session: tanpa personaId → 400");
}
{
  const r = await post("/api/loan", { amount: 100000 });
  ok(r.status === 400, "loan: tanpa state → 400");
}
{
  const r = await post("/api/qris", { amount: 500 });
  ok(r.status === 400, "qris: nominal < Rp1.000 → 400");
}
{
  const r = await post("/api/qris/pay", { amount: 50000 });
  ok(r.status === 400, "qris/pay: tanpa state → 400");
}
{
  const r = await post("/api/reset", { personaId: "x" });
  ok(r.status === 400, "reset: persona tidak dikenal → 400");
}

console.log("— Aturan pinjaman —");
{
  const { data } = await post("/api/session", { personaId: "budi" });
  let s = data.state;
  const limit = s.score.limit;

  let r = await post("/api/loan", { state: s, amount: limit + 50_000 });
  ok(r.status === 400, "loan: melebihi plafon → 400");

  r = await post("/api/loan", { state: s, amount: -5 });
  ok(r.status === 400, "loan: nominal negatif → 400");

  r = await post("/api/loan", { state: s, amount: "abc" });
  ok(r.status === 400, "loan: nominal bukan angka → 400");

  r = await post("/api/loan", { state: s, amount: 100_000, usePoints: true });
  ok(r.status === 200 && r.data.state.loan.pointsUsed === 0, "loan: usePoints tanpa poin → diabaikan");
  s = r.data.state;

  r = await post("/api/loan", { state: s, amount: 50_000 });
  ok(r.status === 400, "loan: dobel saat masih aktif → 400");

  // potongan tidak melebihi sisa: bayar sangat besar
  r = await post("/api/qris/pay", { state: s, amount: 100_000_000 });
  ok(r.data.cut === s.loan.outstanding, "pay: potongan = sisa outstanding (tidak lebih)");
  ok(r.data.state.loan.status === "LUNAS", "pay: langsung LUNAS");
  ok(r.data.celebration !== null, "pay: celebration terisi");
  ok(
    r.data.state.balance === s.balance + 100_000_000 - r.data.cut,
    "pay: saldo = saldo + nominal - potongan"
  );
}

console.log("— Dewi (Belum Memenuhi) —");
{
  const { data } = await post("/api/session", { personaId: "dewi" });
  const s = data.state;
  ok(s.score.limit === 0, `plafon Dewi = 0 (skor ${s.score.score})`);
  const r = await post("/api/loan", { state: s, amount: 50_000 });
  ok(r.status === 400, "loan Dewi: ditolak (melebihi plafon 0)");
}

console.log("— Sweep 5 persona sampai lunas —");
for (const id of ["budi", "sari", "andi", "rini"]) {
  const { data } = await post("/api/session", { personaId: id });
  let s = data.state;
  const before = s.score.score;
  const amount = Math.min(200_000, s.score.limit);
  s = (await post("/api/loan", { state: s, amount })).data.state;
  let guard = 0;
  let celeb = null;
  while (s.loan.status === "ACTIVE" && guard++ < 30) {
    const r = await post("/api/qris/pay", { state: s, amount: 500_000 });
    s = r.data.state;
    celeb = r.data.celebration ?? celeb;
  }
  ok(
    s.loan.status === "LUNAS" && celeb && s.score.score > before && s.points === Math.round(amount / 1000),
    `${id}: lunas dalam ${guard} bayar, skor ${before}→${s.score.score}, poin ${s.points}`
  );
}

console.log(`\n${fail === 0 ? "✅" : "❌"} ${pass} lulus, ${fail} gagal`);
process.exit(fail === 0 ? 0 : 1);
