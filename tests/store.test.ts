import { afterEach, describe, expect, it, vi } from "vitest";
import { createSession } from "@/lib/state";
import { deleteSession, resolveState, saveSession } from "@/lib/store";

describe("store — signed client snapshots", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts its own signed snapshot after a cold start", () => {
    vi.stubEnv("STATE_SECRET", "test-secret");
    const signed = saveSession(createSession("budi"));
    deleteSession(signed.sessionId); // simulate a fresh function instance
    expect(resolveState(JSON.parse(JSON.stringify(signed)))?.score).toEqual(signed.score);
  });

  it("rejects a snapshot whose numbers were edited in the browser", () => {
    vi.stubEnv("STATE_SECRET", "test-secret");
    const signed = saveSession(createSession("budi"));
    deleteSession(signed.sessionId);
    const forged = { ...signed, score: { ...signed.score, limit: 999_000_000 } };
    expect(resolveState(forged)).toBeUndefined();
  });

  it("rejects an unsigned snapshot when a secret is configured", () => {
    vi.stubEnv("STATE_SECRET", "test-secret");
    const unsigned = { ...saveSession(createSession("budi")) };
    delete unsigned.sig;
    deleteSession(unsigned.sessionId);
    expect(resolveState(unsigned)).toBeUndefined();
  });
});
