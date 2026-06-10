// Uji hero flow end-to-end terhadap server yang berjalan (default :3000).
// Jalankan: node scripts/e2e.mjs [baseUrl]

const BASE = process.argv[2] ?? "http://localhost:3000";

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}: ${data.error}`);
  return data;
}

const rp = (n) => "Rp" + Math.round(n).toLocaleString("id-ID");

// 1. Login + consent → hitung skor
let { state } = await post("/api/session", { personaId: "sari" });
console.log(
  `1. Sesi Sari: skor=${state.score.score} (${state.score.tier.name}), plafon=${rp(state.score.limit)}, ${state.transactions.length} transaksi seed`
);
const before = state.score;

// 2. Cairkan Modal Jalan 500rb
({ state } = await post("/api/loan", { state, amount: 500_000 }));
console.log(
  `2. Cair ${rp(state.loan.principal)} → total kembali ${rp(state.loan.totalDue)}, saldo=${rp(state.balance)}`
);

// 3. Terima pembayaran QRIS sampai lunas
let celebration = null;
for (let i = 1; state.loan.status === "ACTIVE" && i <= 10; i++) {
  const { qr } = await post("/api/qris", { amount: 1_000_000 });
  const r = await post("/api/qris/pay", { state, amount: 1_000_000, trxId: qr.trxId });
  state = r.state;
  celebration = r.celebration ?? celebration;
  console.log(
    `3.${i} QRIS ${rp(1_000_000)} (${qr.provider}) → potong ${rp(r.cut)}, sisa ${rp(state.loan.outstanding)} [${state.loan.status}]`
  );
}

// 4. Klimaks: Naik Kelas
if (!celebration) throw new Error("Pinjaman tidak lunas — cek logika repayment!");
console.log(
  `4. NAIK KELAS 🎉 skor ${celebration.oldScore}→${celebration.newScore} | tier ${celebration.oldTierName}→${celebration.newTierName} | plafon ${rp(celebration.oldLimit)}→${rp(celebration.newLimit)} | +${celebration.pointsEarned} poin`
);

// 5. Reset
await post("/api/reset", { personaId: "sari", sessionId: state.sessionId });
console.log("5. Reset OK");

if (celebration.newScore <= before.score) throw new Error("Skor tidak naik!");
console.log("\n✅ Hero flow lengkap — semua langkah berhasil.");
