// Adapter AstraPay Sandbox (§9).
//
// Semua pemanggilan pembayaran lewat interface PaymentProvider sehingga demo
// bisa berjalan dengan dua implementasi:
//   - SandboxProvider : memanggil API AstraPay Sandbox asli (docs.astrapay.com)
//   - MockProvider    : simulasi lokal, selalu berhasil
// Dipilih via env USE_SANDBOX=true. Jika Sandbox error/timeout, otomatis
// fallback ke Mock — demo tidak pernah gagal.
//
// Catatan riset (2026-06-11): docs.astrapay.com publik hanya memuat ringkasan
// produk; spesifikasi endpoint API digerbang dan akan diberikan bersama
// kredensial Sandbox dari panitia. Karena QRIS Indonesia umumnya mengikuti
// standar SNAP BI, parser response di bawah sudah toleran terhadap variasi
// nama field (qrString / qr_string / qrContent / payload) dan semua path
// endpoint bisa dioverride via env tanpa mengubah kode.
//
// Konfigurasi (Vercel env vars / .env.local — jangan commit secret):
//   USE_SANDBOX=true|false
//   ASTRAPAY_BASE_URL=https://sandbox.astrapay.com   (sesuai kredensial panitia)
//   ASTRAPAY_CLIENT_ID=...
//   ASTRAPAY_CLIENT_SECRET=...
//   ASTRAPAY_AUTH_PATH=/oauth/token                  (override bila beda)
//   ASTRAPAY_QRIS_PATH=/qris/v1/payments             (override bila beda)
//   ASTRAPAY_DISBURSE_PATH=/disbursement/v1/transfers

export interface QrisResult {
  qrString: string;
  trxId: string;
  /** Provider yang benar-benar dipakai (untuk badge di UI) */
  provider: "mock" | "sandbox";
  /** true bila Sandbox gagal dan jatuh ke Mock */
  fellBack?: boolean;
}

export interface DisburseResult {
  status: string;
  refId: string;
  provider: "mock" | "sandbox";
  fellBack?: boolean;
}

export interface PaymentProvider {
  readonly name: "mock" | "sandbox";
  createQris(amount: number): Promise<QrisResult>;
  disburse(amount: number, dest: string): Promise<DisburseResult>;
}

const TIMEOUT_MS = 5000;

// ---------------------------------------------------------------------------
// MockProvider — simulasi lokal yang deterministik dan instan
// ---------------------------------------------------------------------------

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function emvField(id: string, value: string): string {
  return `${id}${value.length.toString().padStart(2, "0")}${value}`;
}

export class MockProvider implements PaymentProvider {
  readonly name = "mock" as const;

  async createQris(amount: number): Promise<QrisResult> {
    const trxId = `MOCK-${Date.now().toString(36).toUpperCase()}`;
    // Payload bergaya EMVCo QRIS agar QR yang dirender terlihat autentik
    const body =
      emvField("00", "01") +
      emvField("01", "12") +
      emvField("26", emvField("00", "ID.CO.ASTRAPAY.WWW") + emvField("01", trxId)) +
      emvField("52", "5814") +
      emvField("53", "360") +
      emvField("54", String(Math.round(amount))) +
      emvField("58", "ID") +
      emvField("59", "NAIK KELAS DEMO") +
      emvField("60", "JAKARTA") +
      "6304";
    return { qrString: body + crc16(body), trxId, provider: "mock" };
  }

  async disburse(amount: number, dest: string): Promise<DisburseResult> {
    void amount;
    void dest;
    return {
      status: "SUCCESS",
      refId: `MOCK-DISB-${Date.now().toString(36).toUpperCase()}`,
      provider: "mock",
    };
  }
}

// ---------------------------------------------------------------------------
// SandboxProvider — API AstraPay asli (aktif bila kredensial tersedia)
// ---------------------------------------------------------------------------

interface SandboxConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  authPath: string;
  qrisPath: string;
  disbursePath: string;
}

export class SandboxProvider implements PaymentProvider {
  readonly name = "sandbox" as const;
  private token: { value: string; expiresAt: number } | null = null;

  constructor(private cfg: SandboxConfig) {}

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  private async getToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 10_000) {
      return this.token.value;
    }
    const res = await this.fetchWithTimeout(this.cfg.baseUrl + this.cfg.authPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: this.cfg.clientId,
        client_secret: this.cfg.clientSecret,
      }),
    });
    if (!res.ok) throw new Error(`Auth Sandbox gagal: HTTP ${res.status}`);
    const data = await res.json();
    const value = data.access_token ?? data.accessToken ?? data.token;
    if (!value) throw new Error("Auth Sandbox: token tidak ditemukan di response");
    const ttl = Number(data.expires_in ?? 300) * 1000;
    this.token = { value, expiresAt: Date.now() + ttl };
    return value;
  }

  async createQris(amount: number): Promise<QrisResult> {
    const token = await this.getToken();
    const res = await this.fetchWithTimeout(this.cfg.baseUrl + this.cfg.qrisPath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount: { value: Math.round(amount), currency: "IDR" },
        externalId: `naikkelas-${Date.now()}`,
        description: "Naik Kelas demo payment",
      }),
    });
    if (!res.ok) throw new Error(`QRIS create gagal: HTTP ${res.status}`);
    const data = await res.json();
    // Toleran terhadap variasi nama field di response Sandbox
    const qrString = data.qrString ?? data.qr_string ?? data.qrContent ?? data.payload;
    const trxId = data.trxId ?? data.id ?? data.transactionId ?? data.referenceId;
    if (!qrString || !trxId) throw new Error("QRIS create: response tidak dikenali");
    return { qrString, trxId, provider: "sandbox" };
  }

  async disburse(amount: number, dest: string): Promise<DisburseResult> {
    const token = await this.getToken();
    const res = await this.fetchWithTimeout(this.cfg.baseUrl + this.cfg.disbursePath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount: { value: Math.round(amount), currency: "IDR" },
        destination: dest,
        externalId: `naikkelas-disb-${Date.now()}`,
      }),
    });
    if (!res.ok) throw new Error(`Disbursement gagal: HTTP ${res.status}`);
    const data = await res.json();
    return {
      status: data.status ?? "SUCCESS",
      refId: data.refId ?? data.id ?? data.referenceId ?? "SANDBOX",
      provider: "sandbox",
    };
  }
}

// ---------------------------------------------------------------------------
// Provider terpilih + fallback otomatis
// ---------------------------------------------------------------------------

class FallbackProvider implements PaymentProvider {
  readonly name = "sandbox" as const;
  constructor(
    private primary: PaymentProvider,
    private backup: PaymentProvider
  ) {}

  async createQris(amount: number): Promise<QrisResult> {
    try {
      return await this.primary.createQris(amount);
    } catch (err) {
      console.warn("[astrapay] Sandbox createQris gagal, fallback ke mock:", err);
      return { ...(await this.backup.createQris(amount)), fellBack: true };
    }
  }

  async disburse(amount: number, dest: string): Promise<DisburseResult> {
    try {
      return await this.primary.disburse(amount, dest);
    } catch (err) {
      console.warn("[astrapay] Sandbox disburse gagal, fallback ke mock:", err);
      return { ...(await this.backup.disburse(amount, dest)), fellBack: true };
    }
  }
}

export function getProvider(): PaymentProvider {
  const mock = new MockProvider();
  if (process.env.USE_SANDBOX !== "true") return mock;

  const baseUrl = process.env.ASTRAPAY_BASE_URL;
  const clientId = process.env.ASTRAPAY_CLIENT_ID;
  const clientSecret = process.env.ASTRAPAY_CLIENT_SECRET;
  if (!baseUrl || !clientId || !clientSecret) {
    console.warn("[astrapay] USE_SANDBOX=true tapi kredensial belum lengkap — memakai mock.");
    return mock;
  }

  const sandbox = new SandboxProvider({
    baseUrl,
    clientId,
    clientSecret,
    authPath: process.env.ASTRAPAY_AUTH_PATH ?? "/oauth/token",
    qrisPath: process.env.ASTRAPAY_QRIS_PATH ?? "/qris/v1/payments",
    disbursePath: process.env.ASTRAPAY_DISBURSE_PATH ?? "/disbursement/v1/transfers",
  });
  return new FallbackProvider(sandbox, mock);
}
