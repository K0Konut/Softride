import { useEffect, useRef } from "react";
import { Motion } from "@capacitor/motion";
import type { PluginListenerHandle } from "@capacitor/core";
import { FallEngine } from "./fallEngine";
import { useFallStore } from "../../store/fall.slice";

type Options = {
  countdownSeconds?: number;
  onConfirmed?: () => Promise<void> | void;

  // UX / stabilité
  warmupMs?: number; // ignore capteurs au début
  cooldownMs?: number; // évite double alerte
  minSampleHz?: number; // sanity check
};

function mag3(x = 0, y = 0, z = 0) {
  return Math.sqrt(x * x + y * y + z * z);
}

export function useFallDetection(opts: Options = {}) {
  const countdownSeconds = opts.countdownSeconds ?? 15;

  const warmupMs = opts.warmupMs ?? 2500;
  const cooldownMs = opts.cooldownMs ?? 20000;
  const minSampleHz = opts.minSampleHz ?? 10;

  const setStatus = useFallStore((s) => s.setStatus);
  const setConfidence = useFallStore((s) => s.setConfidence);
  const startCountdown = useFallStore((s) => s.startCountdown);
  const reset = useFallStore((s) => s.reset);

  const enabled = useFallStore((s) => s.enabled);
  const countdownActive = useFallStore((s) => s.countdownActive);
  const countdownSec = useFallStore((s) => s.countdownSec);
  const tick = useFallStore((s) => s.tick);
  const cancelCountdown = useFallStore((s) => s.cancelCountdown);

  const lastAlertAt = useFallStore((s) => s.lastAlertAt);
  const setLastAlertAt = useFallStore((s) => s.setLastAlertAt);

  const listenerRef = useRef<PluginListenerHandle | null>(null);
  const engineRef = useRef(new FallEngine());
  const countdownTimerRef = useRef<number | null>(null);

  const firedRef = useRef(false);
  const enabledAtRef = useRef<number>(0);

  // sampling health
  const sampleCountRef = useRef<number>(0);
  const sampleWindowStartRef = useRef<number>(0);

  // anti-jitter gate (handling/pocket)
  const gyroSpikeCountRef = useRef(0);

  useEffect(() => {
    // ⚠️ Important pour le lint : on “capture” l’instance dans une constante locale
    const engine = engineRef.current;

    if (!enabled) {
      listenerRef.current?.remove();
      listenerRef.current = null;
      engine.reset();
      setStatus("idle");
      setConfidence(null);
      return;
    }

    enabledAtRef.current = Date.now();
    firedRef.current = false;
    setStatus("listening");

    sampleCountRef.current = 0;
    sampleWindowStartRef.current = Date.now();
    gyroSpikeCountRef.current = 0;

    let mounted = true;

    (async () => {
      listenerRef.current = await Motion.addListener("accel", (ev) => {
        if (!mounted) return;

        const t = Date.now();

        // Warm-up ignore
        if (t - enabledAtRef.current < warmupMs) return;

        // Cooldown ignore (after an alert)
        if (lastAlertAt != null && t - lastAlertAt < cooldownMs) return;

        // Sampling health (rough Hz)
        if (!sampleWindowStartRef.current) sampleWindowStartRef.current = t;
        sampleCountRef.current += 1;

        const elapsed = t - sampleWindowStartRef.current;
        if (elapsed >= 1000) {
          const hz = (sampleCountRef.current * 1000) / elapsed;
          sampleCountRef.current = 0;
          sampleWindowStartRef.current = t;

          if (hz < minSampleHz) return;
        }

        // Anti pocket/handling: too many big gyro spikes => ignore frames
        const gyroMag = mag3(
          ev.rotationRate?.alpha ?? 0,
          ev.rotationRate?.beta ?? 0,
          ev.rotationRate?.gamma ?? 0
        );

        if (gyroMag > 650) gyroSpikeCountRef.current += 1;
        else gyroSpikeCountRef.current = Math.max(0, gyroSpikeCountRef.current - 1);

        if (gyroSpikeCountRef.current >= 4) return;

        const s = {
          t,
          ax: ev.acceleration?.x ?? 0,
          ay: ev.acceleration?.y ?? 0,
          az: ev.acceleration?.z ?? 0,
          gx: ev.accelerationIncludingGravity?.x ?? 0,
          gy: ev.accelerationIncludingGravity?.y ?? 0,
          gz: ev.accelerationIncludingGravity?.z ?? 0,
          rAlpha: ev.rotationRate?.alpha ?? 0,
          rBeta: ev.rotationRate?.beta ?? 0,
          rGamma: ev.rotationRate?.gamma ?? 0,
        };

        const out = engine.push(s);
        if (!out) return;

        if (out.type === "POSSIBLE_FALL") {
          setStatus("possible");
          setConfidence(out.confidence);
        }

        if (out.type === "FALL_CONFIRMED") {
          setConfidence(out.confidence);
          firedRef.current = false; // allow onConfirmed for this countdown
          startCountdown(countdownSeconds);
        }
      });
    })();

    return () => {
      mounted = false;
      listenerRef.current?.remove();
      listenerRef.current = null;
      engine.reset();
    };
  }, [
    enabled,
    warmupMs,
    cooldownMs,
    minSampleHz,
    lastAlertAt,
    countdownSeconds,
    setStatus,
    setConfidence,
    startCountdown,
  ]);

  // Countdown timer
  useEffect(() => {
    if (!countdownActive) {
      if (countdownTimerRef.current) window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
      return;
    }

    if (countdownTimerRef.current) return;

    countdownTimerRef.current = window.setInterval(() => tick(), 1000);

    return () => {
      if (countdownTimerRef.current) window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    };
  }, [countdownActive, tick]);

  // When countdown reaches 0 => send alert
  useEffect(() => {
    if (!countdownActive) return;
    if (countdownSec > 0) return;
    if (firedRef.current) return;

    firedRef.current = true;

    (async () => {
      try {
        setLastAlertAt(Date.now());
        await opts.onConfirmed?.();
      } finally {
        reset();
      }
    })();
  }, [countdownActive, countdownSec, opts, reset, setLastAlertAt]);

  return { cancel: cancelCountdown };
}
