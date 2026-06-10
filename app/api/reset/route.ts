// POST /api/reset — mulai ulang demo: hapus sesi lama, buat sesi baru
// dari seed persona yang sama.

import { createSession } from "@/lib/state";
import { deleteSession, saveSession } from "@/lib/store";
import { PERSONAS } from "@/lib/personas";
import type { PersonaId } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (typeof body.sessionId === "string") deleteSession(body.sessionId);

  const personaId = body.personaId as PersonaId;
  if (!personaId || !PERSONAS[personaId]) {
    return Response.json({ error: "personaId tidak valid" }, { status: 400 });
  }
  const state = createSession(personaId);
  saveSession(state);
  return Response.json({ state });
}
