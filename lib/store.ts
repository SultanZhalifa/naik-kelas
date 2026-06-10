// In-memory store sesi di server (cukup untuk demo, sesuai spec §3).
//
// Catatan deploy: di Vercel tiap function instance punya memori sendiri dan
// bisa cold-start, jadi setiap request dari klien juga membawa snapshot state
// terakhirnya. Server memakai snapshot itu sebagai sumber kebenaran bila
// store-nya kosong — demo tidak pernah kehilangan state.

import type { AppState } from "./types";

const globalStore = globalThis as unknown as {
  __naikKelasSessions?: Map<string, AppState>;
};

function sessions(): Map<string, AppState> {
  globalStore.__naikKelasSessions ??= new Map();
  return globalStore.__naikKelasSessions;
}

export function saveSession(state: AppState): void {
  sessions().set(state.sessionId, state);
}

export function getSession(sessionId: string): AppState | undefined {
  return sessions().get(sessionId);
}

/**
 * Ambil state otoritatif untuk sebuah request: pakai milik server bila ada,
 * kalau tidak (instance baru/cold start) hidrasi dari snapshot klien.
 */
export function resolveState(clientSnapshot: AppState | undefined): AppState | undefined {
  if (!clientSnapshot?.sessionId) return undefined;
  return getSession(clientSnapshot.sessionId) ?? clientSnapshot;
}

export function deleteSession(sessionId: string): void {
  sessions().delete(sessionId);
}
