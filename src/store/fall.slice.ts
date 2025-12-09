import { create } from "zustand";

type FallStatus = "idle" | "listening" | "possible" | "countdown";

export type FallConfig = {
  countdownSeconds: number;
  warmupMs: number;
  cooldownMs: number;
  minSampleHz: number;
};

type FallState = {
  enabled: boolean;
  status: FallStatus;

  lastConfidence: number | null;

  // Countdown
  countdownSec: number;
  countdownActive: boolean;

  // Cooldown after sending alert
  lastAlertAt: number | null;

  // Tunables
  config: FallConfig;

  setEnabled: (v: boolean) => void;
  setStatus: (s: FallStatus) => void;
  setConfidence: (c: number | null) => void;

  startCountdown: (sec: number) => void;
  tick: () => void;
  cancelCountdown: () => void;

  forceSendNow: () => void;

  setLastAlertAt: (t: number | null) => void;
  setConfig: (patch: Partial<FallConfig>) => void;

  reset: () => void;
};

export const useFallStore = create<FallState>((set) => ({
  enabled: false,
  status: "idle",
  lastConfidence: null,

  countdownSec: 0,
  countdownActive: false,

  lastAlertAt: null,

  config: {
    countdownSeconds: 15,
    warmupMs: 2500,
    cooldownMs: 20000,
    minSampleHz: 10,
  },

  setEnabled: (v) => set({ enabled: v }),
  setStatus: (s) => set({ status: s }),
  setConfidence: (c) => set({ lastConfidence: c }),

  startCountdown: (sec) =>
    set({ countdownSec: sec, countdownActive: true, status: "countdown" }),

  tick: () =>
    set((s) => ({ countdownSec: Math.max(0, s.countdownSec - 1) })),

  cancelCountdown: () =>
    set({ countdownActive: false, countdownSec: 0, status: "listening" }),

  forceSendNow: () =>
    set({ countdownSec: 0, countdownActive: true, status: "countdown" }),

  setLastAlertAt: (t) => set({ lastAlertAt: t }),

  setConfig: (patch) =>
    set((s) => ({ config: { ...s.config, ...patch } })),

  reset: () =>
    set({
      status: "idle",
      lastConfidence: null,
      countdownActive: false,
      countdownSec: 0,
    }),
}));
