// In-memory store sesi di server (cukup untuk demo, sesuai spec §3).
//
// Catatan deploy: di Vercel tiap function instance punya memori sendiri dan
// bisa cold-start, jadi setiap request dari klien juga membawa snapshot state
// terakhirnya. Server memakai snapshot itu sebagai sumber kebenaran bila
// store-nya kosong — demo tidak pernah kehilangan state.
//
// Keamanan: snapshot datang dari browser, jadi bisa diubah (skor, plafon,
// saldo). Karena itu setiap state yang dikirim server ditandatangani HMAC
// dengan STATE_SECRET, dan snapshot hanya diterima kalau tanda tangannya cocok.

import { createHmac, timingSafeEqual } from "node:crypto";
import type { AppState } from "./types";

const MAX_SESSIONS = 1000;

const globalStore = globalThis as unknown as {
  __naikKelasSessions?: Map<string, AppState>;
  __naikKelasWarned?: boolean;
};

function sessions(): Map<string, AppState> {
  globalStore.__naikKelasSessions ??= new Map();
  return globalStore.__naikKelasSessions;
}

function secret(): string | undefined {
  const s = process.env.STATE_SECRET;
  if (!s && !globalStore.__naikKelasWarned) {
    globalStore.__naikKelasWarned = true;
    console.warn("[naik-kelas] STATE_SECRET belum di-set: snapshot state dari klien diterima tanpa verifikasi.");
  }
  return s || undefined;
}

function sign(state: AppState, key: string): string {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { sig, ...body } = state;
  return createHmac("sha256", key).update(JSON.stringify(body)).digest("base64url");
}

function validSignature(state: AppState, key: string): boolean {
  if (typeof state.sig !== "string") return false;
  const expected = Buffer.from(sign(state, key));
  const given = Buffer.from(state.sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Simpan state dan kembalikan versi bertanda tangan untuk dikirim ke klien. */
export function saveSession(state: AppState): AppState {
  const store = sessions();
  // Batasi memori: buang sesi paling lama kalau sudah penuh.
  if (!store.has(state.sessionId) && store.size >= MAX_SESSIONS) {
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
  const key = secret();
  const signed = key ? { ...state, sig: sign(state, key) } : state;
  store.set(state.sessionId, signed);
  return signed;
}

export function getSession(sessionId: string): AppState | undefined {
  return sessions().get(sessionId);
}

/**
 * Ambil state otoritatif untuk sebuah request: pakai milik server bila ada,
 * kalau tidak (instance baru/cold start) hidrasi dari snapshot klien yang
 * tanda tangannya valid.
 */
export function resolveState(clientSnapshot: AppState | undefined): AppState | undefined {
  if (typeof clientSnapshot?.sessionId !== "string") return undefined;
  const stored = getSession(clientSnapshot.sessionId);
  if (stored) return stored;
  const key = secret();
  if (key && !validSignature(clientSnapshot, key)) return undefined;
  return clientSnapshot;
}

export function deleteSession(sessionId: string): void {
  sessions().delete(sessionId);
}
