# Kerangka Pitch Deck — AstraPay "Naik Kelas"

**Tim Andalusia · Demo Day 6–17 Juli 2026 · kirim deck ke danny.maimun@astrapay.com paling lambat 5 Juli 2026 23.59 WIB (Guideline #6)**

Format: maksimal 10 menit presentasi + demo, 5 menit Q&A (Guideline #8).
Alokasi waktu yang disarankan: 3 menit slide → 5,5 menit demo live → 1,5 menit penutup.

---

## Slide 1 — Judul (15 dtk)
"Naik Kelas" — jejak transaksi jadi modal usaha. Tim Andalusia. Logo AstraPay.

## Slide 2 — Masalah (40 dtk)
- Jutaan pelaku usaha mikro berbasis motor (pedagang keliling, ojek/kurir, warung,
  bengkel) *unbankable*: tanpa slip gaji, tanpa agunan, tanpa skor kredit.
- Padahal mereka PUNYA rekam jejak: penjualan QRIS harian & angsuran FIF yang rapi —
  data itu tersebar dan tidak pernah "dihargai".
- Pinjaman informal: bunga tinggi, tanggal jatuh tempo kaku yang tidak cocok
  dengan arus kas harian.

## Slide 3 — Solusi: loop "Naik Kelas" (40 dtk)
Diagram loop 4 langkah:
1. **AstraScore** — transaksi QRIS + FIF + tenure → skor 300–850 transparan.
2. **Modal Jalan** — plafon mengikuti skor DAN arus kas (½ omzet bulanan).
3. **Bayar sambil jualan** — auto-potong 20% dari tiap penjualan QRIS; tanpa
   tanggal jatuh tempo yang menakutkan.
4. **Naik kelas** — lunas → skor & plafon naik + AstraPoints (bisa ditukar
   diskon fee pinjaman berikutnya) → loop berulang.

## Slide 4 — Kenapa AstraPay yang menang (30 dtk)
- Data eksklusif ekosistem Astra: QRIS AstraPay + riwayat FIF — pesaing tidak punya.
- Merchant lebih lengket: pinjaman ditagih dari arus QRIS → merchant mendorong
  pembeli pakai QRIS AstraPay.
- Fee produktif baru + loyalitas (AstraPoints) dalam satu mekanik.

## Slide 5 — Di balik layar: mesin skor yang bisa dipertanggungjawabkan (30 dtk)
- 5 faktor berbobot (FIF 35%, QRIS 30%, aktivitas 15%, tenure 10%, growth 10%) —
  deterministik, explainable, ada panel "kenapa skormu segini".
- Plafon dibatasi arus kas (½ omzet/bulan) → pinjaman tidak pernah melebihi
  kemampuan bayar — responsible lending by design.
- Tervalidasi 19 unit test + uji alur end-to-end otomatis.

## Slide 6 → pindah ke DEMO LIVE (5,5 menit)
Buka URL Vercel (bukan localhost). Skenario **Sari** (lihat README "Skrip demo"):
1. Pilih Sari → consent → skor 79x dihitung live (tunjuk panel explainability
   + grafik "data di balik skormu" + simulasi what-if). *(±2 mnt)*
2. Ajukan Modal Jalan Rp500.000 → cair. *(±1 mnt)*
3. Panel Demo: terima QRIS Rp1.000.000 ×3 → progress cicilan jalan real-time;
   sebut potongan 20% di toast. *(±1,5 mnt)*
4. Klimaks: LUNAS → skor naik, **tier Mapan→Juara, plafon Rp3jt→Rp4,7jt**,
   +500 poin → "Ajukan lagi" → tunjukkan toggle tukar poin (fee turun). *(±1 mnt)*
- Cadangan bila koneksi bermasalah: video screen-recording demo + localhost.

## Slide 7 — Integrasi & arsitektur (30 dtk)
- Next.js + adapter `PaymentProvider`: **AstraPay Sandbox** (QRIS create) dengan
  fallback simulasi otomatis → demo tidak pernah gagal (Guideline #4: nilai tambah).
- Sebut status jujur: endpoint Sandbox aktif bila kredensial panitia sudah
  terpasang; arsitektur siap produksi (SNAP BI-tolerant).

## Slide 8 — Dampak & roadmap (30 dtk)
- Ilustrasi unit economics: fee 1,2–2,5%/bulan, default risk ditekan oleh
  (1) plafon arus kas, (2) auto-potong di sumber, (3) insentif skor.
- Roadmap: data alternatif lain (PLN/pulsa), credit passport lintas ekosistem
  Astra, kolaborasi FIF untuk graduasi ke pinjaman lebih besar.

## Slide 9 — Penutup (15 dtk)
"Setiap transaksi kecil adalah cicilan menuju kelas berikutnya." + URL demo + QR.

---

## Antisipasi Q&A (5 menit)

| Pertanyaan juri | Jawaban singkat |
|---|---|
| Bagaimana mencegah gaming skor (transaksi fiktif)? | Stdev di-winsorize, plafon terikat omzet riil, fee membuat self-dealing mahal; produksi: deteksi anomali & verifikasi pola pembeli. |
| Kenapa potongan 20% tidak memberatkan? | Dipotong dari pemasukan (bukan tagihan terpisah), proporsional dengan hari sepi/ramai; estimasi hari lunas ditampilkan sebelum akad. |
| Beda dengan paylater/KUR? | Tanpa agunan & slip gaji; underwriting dari data ekosistem Astra; penagihan di sumber arus kas — bukan tanggal kaku. |
| Risiko gagal bayar? | Pinjaman pertama kecil (≤Rp500rb–1,5jt), naik bertahap hanya lewat bukti pelunasan; outstanding berhenti memotong saat tidak ada penjualan (grace alami) — produksi: batas waktu + restrukturisasi. |
| Angka fee/plafon final? | Ilustrasi prototipe; kalibrasi dengan tim risk AstraPay. |
| Skornya bisa diaudit? | Ya — deterministik, bobot terbuka, panel kontribusi per faktor, simulasi what-if memakai mesin yang sama. |

## Checklist sebelum Demo Day
- [ ] Deploy Vercel + uji `node scripts/ui-flow.mjs https://<url-vercel>` 
- [ ] Pasang kredensial Sandbox bila sudah diterima → badge "AstraPay Sandbox"
- [ ] Rekam video cadangan demo (juga jadi bahan Awarding Day, Guideline #9)
- [ ] Kirim deck sebelum 5 Juli 23.59 WIB
