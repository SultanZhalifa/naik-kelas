"use client";

// Orkestrator hero flow (§8): login → consent → skor → cairkan → dashboard
// → terima QRIS (split repayment) → lunas → Naik Kelas → skor baru.

import { useCallback, useRef, useState } from "react";
import type { AppState, Celebration, PersonaId } from "@/lib/types";
import { formatRp } from "@/lib/format";
import MobileFrame from "./MobileFrame";
import LoginScreen from "./screens/LoginScreen";
import ConsentScreen from "./screens/ConsentScreen";
import ScoreScreen from "./screens/ScoreScreen";
import DisburseScreen from "./screens/DisburseScreen";
import DashboardScreen from "./screens/DashboardScreen";
import QrisModal, { type QrInfo } from "./QrisModal";
import CelebrationOverlay from "./CelebrationOverlay";

type Screen = "login" | "consent" | "score" | "disburse" | "dashboard";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Gagal memanggil ${path}`);
  return data as T;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [personaId, setPersonaId] = useState<PersonaId | null>(null);
  const [state, setState] = useState<AppState | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState<QrInfo | null>(null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [gaugeFrom, setGaugeFrom] = useState<number | undefined>(undefined);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 3800);
  }, []);

  const fail = useCallback(
    (err: unknown) => {
      showToast(`⚠️ ${err instanceof Error ? err.message : "Terjadi kesalahan"}`);
    },
    [showToast]
  );

  // §8.2 — consent → hitung skor dari data transaksi
  const connect = useCallback(async () => {
    if (!personaId) return;
    setConnecting(true);
    try {
      const [data] = await Promise.all([
        api<{ state: AppState }>("/api/session", { personaId }),
        sleep(1900), // beri waktu langkah loading terbaca (efek "menghitung")
      ]);
      setState(data.state);
      setGaugeFrom(undefined);
      setScreen("score");
    } catch (err) {
      fail(err);
    } finally {
      setConnecting(false);
    }
  }, [personaId, fail]);

  // §8.4 — cairkan Modal Jalan
  const disburse = useCallback(
    async (amount: number) => {
      if (!state) return;
      setBusy(true);
      try {
        const [data] = await Promise.all([
          api<{ state: AppState }>("/api/loan", { state, amount }),
          sleep(900),
        ]);
        setState(data.state);
        setScreen("dashboard");
        showToast(`💸 ${formatRp(amount)} cair ke saldomu. Selamat jualan!`);
      } catch (err) {
        fail(err);
      } finally {
        setBusy(false);
      }
    },
    [state, fail, showToast]
  );

  // §8.6 — panel demo: terima pembayaran QRIS → split repayment real-time
  const receiveQris = useCallback(
    async (amount: number) => {
      if (!state || busy) return;
      setBusy(true);
      try {
        const { qr: created } = await api<{
          qr: { qrString: string; trxId: string; provider: "mock" | "sandbox"; fellBack?: boolean };
        }>("/api/qris", { amount });
        setQr({ ...created, amount, status: "waiting" });

        await sleep(1700); // pembeli "memindai & membayar"
        const data = await api<{
          state: AppState;
          cut: number;
          celebration: Celebration | null;
        }>("/api/qris/pay", { state, amount, trxId: created.trxId });

        setQr((q) => (q ? { ...q, status: "paid" } : q));
        await sleep(750);
        setQr(null);
        setState(data.state);

        if (data.cut > 0) {
          showToast(
            `💰 ${formatRp(amount - data.cut)} masuk saldo · ${formatRp(
              data.cut
            )} otomatis menyicil Modal Jalan`
          );
        } else {
          showToast(`💰 ${formatRp(amount)} masuk saldo`);
        }

        if (data.celebration) {
          await sleep(650);
          setCelebration(data.celebration);
        }
      } catch (err) {
        setQr(null);
        fail(err);
      } finally {
        setBusy(false);
      }
    },
    [state, busy, fail, showToast]
  );

  const reset = useCallback(async () => {
    if (!state) return;
    setBusy(true);
    try {
      await api("/api/reset", { personaId: state.personaId, sessionId: state.sessionId });
      setState(null);
      setPersonaId(null);
      setCelebration(null);
      setGaugeFrom(undefined);
      setScreen("login");
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }, [state, fail]);

  return (
    <MobileFrame>
      {screen === "login" && (
        <LoginScreen
          busy={connecting}
          onSelect={(id) => {
            setPersonaId(id);
            setScreen("consent");
          }}
        />
      )}

      {screen === "consent" && personaId && (
        <ConsentScreen
          personaId={personaId}
          connecting={connecting}
          onConnect={connect}
          onBack={() => setScreen("login")}
        />
      )}

      {screen === "score" && state && (
        <ScoreScreen
          state={state}
          fromScore={gaugeFrom}
          onApply={() => setScreen("disburse")}
          onDashboard={() => setScreen("dashboard")}
        />
      )}

      {screen === "disburse" && state && (
        <DisburseScreen
          state={state}
          busy={busy}
          onDisburse={disburse}
          onBack={() => setScreen("score")}
        />
      )}

      {screen === "dashboard" && state && (
        <DashboardScreen
          state={state}
          busy={busy}
          onReceiveQris={receiveQris}
          onReset={reset}
          onViewScore={() => {
            setGaugeFrom(undefined);
            setScreen("score");
          }}
        />
      )}

      {qr && <QrisModal qr={qr} />}

      {celebration && (
        <CelebrationOverlay
          c={celebration}
          onSeeScore={() => {
            setGaugeFrom(celebration.oldScore);
            setCelebration(null);
            setScreen("score");
          }}
          onClose={() => setCelebration(null)}
        />
      )}

      {toast && (
        <div className="anim-rise absolute inset-x-4 bottom-5 z-[60] rounded-2xl bg-deep-darker/95 px-4 py-3 text-center text-xs font-semibold text-white shadow-xl backdrop-blur">
          {toast}
        </div>
      )}
    </MobileFrame>
  );
}
