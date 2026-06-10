// Jalankan hero flow di browser asli (Edge) + screenshot tiap layar.
// Prasyarat: server jalan (npm start / npm run dev), lalu:
//   node scripts/ui-flow.mjs [baseUrl]

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
mkdirSync("shots", { recursive: true });

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 880 } });
const shot = (name) => page.screenshot({ path: `shots/${name}.png` });

console.log("1. Login…");
await page.goto(BASE, { waitUntil: "networkidle" });
await shot("1-login");

console.log("2. Consent…");
await page.getByRole("button", { name: /Sari · Warung Sembako/ }).click();
await page.waitForTimeout(600);
await shot("2-consent");

console.log("3. Hitung skor…");
await page.getByRole("button", { name: /Hubungkan data transaksi/ }).click();
await page.waitForTimeout(900);
await shot("3a-loading");
await page.getByRole("button", { name: /Ajukan Modal Jalan/ }).waitFor({ timeout: 10_000 });
await page.waitForTimeout(1400); // animasi gauge & bar selesai
await shot("3b-score");

console.log("4. Cairkan Modal Jalan 500rb…");
await page.getByRole("button", { name: /Ajukan Modal Jalan/ }).click();
await page.waitForTimeout(400);
// set slider ke 500.000 (native setter + event input agar React menangkap)
await page.evaluate(() => {
  const el = document.querySelector("input.astra-slider");
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  ).set;
  setter.call(el, "500000");
  el.dispatchEvent(new Event("input", { bubbles: true }));
});
await page.waitForTimeout(300);
await shot("4-disburse");
await page.getByRole("button", { name: /^Cairkan Rp/ }).click();
await page.getByRole("button", { name: /Terima Pembayaran QRIS/ }).waitFor({ timeout: 10_000 });
await page.waitForTimeout(600);
await shot("5-dashboard");

console.log("5. Terima 3 pembayaran QRIS 1jt…");
await page.getByRole("button", { name: "Rp1jt", exact: true }).click();
for (let i = 1; i <= 3; i++) {
  await page.getByRole("button", { name: /Terima Pembayaran QRIS/ }).click();
  if (i === 1) {
    await page.waitForTimeout(900);
    await shot("6-qris-modal");
  }
  // tunggu modal QR tertutup (create + 1.7s bayar + 0.75s sukses)
  await page.waitForTimeout(3600);
  await shot(`6-after-payment-${i}`);
}

console.log("6. Klimaks Naik Kelas…");
await page.getByRole("button", { name: /Lihat skor baruku/ }).waitFor({ timeout: 10_000 });
await page.waitForTimeout(1600); // animasi angka
await shot("7-celebration");

await page.getByRole("button", { name: /Lihat skor baruku/ }).click();
await page.waitForTimeout(1600);
await shot("8-score-after");

await browser.close();
console.log("✅ Selesai — screenshot di folder shots/");
