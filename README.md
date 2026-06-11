# AstraPay "Naik Kelas" — Working Prototype

**Tim Andalusia · AstraPay Hackathon 2026**

Jejak transaksi pelaku usaha mikro berbasis motor → **AstraScore** (skor kredit
alternatif, transparan) → membuka **Modal Jalan** (modal kerja kecil) → dicicil
otomatis 20% dari tiap penjualan QRIS (*bayar sambil jualan*) → lunas → skor &
plafon naik + **AstraPoints**.

> Prototype fungsional — skor benar-benar dihitung dari data transaksi
> (deterministik & explainable), bukan angka mati. Fee & plafon ilustratif.

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 17 unit test: rumus engine + verifikasi tier 4 persona
node scripts/e2e.mjs   # uji hero flow lengkap (server harus jalan)
```

## Skrip demo (<8 menit)

1. **Pilih profil** — rekomendasi: **Sari** (klimaks terbaik: tembus tier Juara)
   atau **Andi** (plafon pasti naik karena terikat arus kas).
2. **Consent** — "Hubungkan data transaksi saya" → skor dihitung live.
3. **AstraScore** — tunjukkan gauge + panel *"Kenapa skormu segini?"*
   (kontribusi tiap faktor, bobot transparan §4).
4. **Ajukan Modal Jalan** — geser slider (untuk Sari: Rp500.000 supaya lunas
   dalam 3 pembayaran), cairkan.
5. **Dashboard** — Panel Demo → **Terima Pembayaran QRIS Rp1.000.000** ×3:
   tiap pembayaran terlihat memotong cicilan real-time di progress bar.
6. **Klimaks** — pembayaran ke-3 melunasi pinjaman → layar **Naik Kelas**:
   skor naik, tier naik, plafon membesar, +500 AstraPoints. Kembali ke layar
   skor → angka benar-benar berubah (recompute dari transaksi terbaru).
7. **Loop kedua (loyalitas)** — di dashboard: kartu LUNAS + badge "1× lunas
   tepat waktu" → **"Ajukan lagi"** dengan plafon baru → aktifkan toggle
   **"Tukar 250 AstraPoints"** → fee turun (mis. 1,2% → 0,7%).
8. Di layar skor, tunjukkan **"Data di balik skormu"** (grafik omzet mingguan
   dari transaksi nyata) dan **"Simulasi naik kelas"** (proyeksi what-if yang
   dihitung live oleh mesin skor yang sama) — amunisi kuat untuk sesi Q&A.
9. **Reset demo** untuk mengulang.

Kerangka pitch deck + antisipasi Q&A: lihat [PITCH.md](PITCH.md).

## Arsitektur

- **Next.js 16 (App Router) + TypeScript + Tailwind v4**, deploy ke Vercel.
- [lib/engine.ts](lib/engine.ts) — mesin AstraScore murni (rumus persis spec §4:
  bobot 35/30/15/10/10, skor 300–850, tier, plafon = min(cap, ½ omzet bulanan)).
- [lib/personas.ts](lib/personas.ts) — generator transaksi sintetis 90 hari
  (seeded PRNG, deterministik) + derivasi statistik dari transaksi.
- [lib/state.ts](lib/state.ts) — split repayment (§5) & loop reward (§6).
- [lib/astrapay.ts](lib/astrapay.ts) — adapter `PaymentProvider`:
  `SandboxProvider` (API AstraPay asli) ⇄ `MockProvider` (simulasi), dipilih via
  env `USE_SANDBOX`, dengan **fallback otomatis** bila Sandbox error/timeout.
- API routes: `POST /api/session`, `/api/loan`, `/api/qris`, `/api/qris/pay`,
  `/api/reset`. State sesi in-memory di server; tiap request membawa snapshot
  klien sehingga cold start serverless tidak mematahkan demo.

## Integrasi Sandbox

Lihat [.env.example](.env.example). Tanpa kredensial, demo memakai simulasi
lokal (badge "Simulasi lokal" di Panel Demo). Setelah kredensial panitia
tersedia: isi env, set `USE_SANDBOX=true` — QR di Panel Demo dibuat via
endpoint QRIS Sandbox (badge berubah "AstraPay Sandbox"); konfirmasi pembayaran
tetap disimulasikan (callback pembeli tidak tersedia di demo).

## Catatan verifikasi skor

Statistik diturunkan dari daftar transaksi: omzet bulanan = total QRIS 90
hari ÷ 3; konsistensi = 1 − stdev/rata-rata harian (stdev di-winsorize pada 3×
rata-rata agar satu hari outlier — termasuk injeksi demo — tidak mendistorsi);
aktivitas = transaksi 30 hari ÷ 60; pertumbuhan = bulan terakhir vs 3 bulan
lalu. Injeksi QRIS saat demo ikut dihitung ulang saat pelunasan — itulah kenapa
skor & plafon naik secara nyata, bukan animasi belaka.
