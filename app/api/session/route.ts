import { createSession } from "@/lib/state";
import { saveSession } from "@/lib/store";
import { PERSONAS } from "@/lib/personas";
import type { PersonaId } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const personaId = body.personaId as PersonaId;
  if (!personaId || !PERSONAS[personaId]) {
    return Response.json({ error: "personaId tidak valid" }, { status: 400 });
  }
  const state = createSession(personaId);
  saveSession(state);
  return Response.json({ state });
}
