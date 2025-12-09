import { useEffect, useMemo, useRef, useState } from "react";
import { Motion } from "@capacitor/motion";
import type { PluginListenerHandle } from "@capacitor/core";
import { requestMotionPermission } from "../../services/permissions/motion";
import { useFallStore } from "../../store/fall.slice";

function mag3(x = 0, y = 0, z = 0) {
  return Math.sqrt(x * x + y * y + z * z);
}

export default function FallDebugPanel() {
  const status = useFallStore((s) => s.status);
  const conf = useFallStore((s) => s.lastConfidence);
  const enabled = useFallStore((s) => s.enabled);
  const countdownActive = useFallStore((s) => s.countdownActive);
  const countdownSec = useFallStore((s) => s.countdownSec);

  const lastAlertAt = useFallStore((s) => s.lastAlertAt);
  const setConfig = useFallStore((s) => s.setConfig);
  const config = useFallStore((s) => s.config);

  const startCountdown = useFallStore((s) => s.startCountdown);

  // Live sensor debug (separate listener; does NOT affect fall engine)
  const [debugOn, setDebugOn] = useState(false);
  const [debugErr, setDebugErr] = useState<string | null>(null);

  const [gMag, setGMag] = useState<number | null>(null);
  const [gyroMag, setGyroMag] = useState<number | null>(null);
  const [hz, setHz] = useState<number | null>(null);

  const listenerRef = useRef<PluginListenerHandle | null>(null);
  const countRef = useRef(0);
  const winStartRef = useRef(0);

  // Cooldown remaining
  const [cooldownLeftMs, setCooldownLeftMs] = useState<number>(0);

  useEffect(() => {
    const t = window.setInterval(() => {
      if (!lastAlertAt) return setCooldownLeftMs(0);
      const left = Math.max(0, config.cooldownMs - (Date.now() - lastAlertAt));
      setCooldownLeftMs(left);
    }, 250);
    return () => window.clearInterval(t);
  }, [lastAlertAt, config.cooldownMs]);

  const cooldownLabel = useMemo(() => {
    const s = Math.ceil(cooldownLeftMs / 1000);
    return s > 0 ? `${s}s` : "—";
  }, [cooldownLeftMs]);

  async function enableDebug() {
    setDebugErr(null);

    const perm = await requestMotionPermission();
    if (perm === "denied") {
      setDebugErr("Permission capteurs refusée (iOS nécessite une action utilisateur).");
      return;
    }

    setDebugOn(true);
  }

  useEffect(() => {
    if (!debugOn) {
      listenerRef.current?.remove();
      listenerRef.current = null;
      setGMag(null);
      setGyroMag(null);
      setHz(null);
      return;
    }

    let mounted = true;
    countRef.current = 0;
    winStartRef.current = Date.now();

    (async () => {
      try {
        listenerRef.current = await Motion.addListener("accel", (ev) => {
          if (!mounted) return;

          const g = mag3(
            ev.accelerationIncludingGravity?.x ?? 0,
            ev.accelerationIncludingGravity?.y ?? 0,
            ev.accelerationIncludingGravity?.z ?? 0
          );

          const r = mag3(
            ev.rotationRate?.alpha ?? 0,
            ev.rotationRate?.beta ?? 0,
            ev.rotationRate?.gamma ?? 0
          );

          setGMag(g);
          setGyroMag(r);

          // simple Hz estimate
          countRef.current += 1;
          const now = Date.now();
          const elapsed = now - winStartRef.current;
          if (elapsed >= 1000) {
            const est = (countRef.current * 1000) / elapsed;
            countRef.current = 0;
            winStartRef.current = now;
            setHz(est);
          }
        });
      } catch (e) {
        setDebugErr(e instanceof Error ? e.message : "Erreur capteurs");
        setDebugOn(false);
      }
    })();

    return () => {
      mounted = false;
      listenerRef.current?.remove();
      listenerRef.current = null;
    };
  }, [debugOn]);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-zinc-100">Debug / Calibration</div>
          <div className="text-xs text-zinc-400">
            Visualiser capteurs + régler warmup/cooldown/HZ + simuler une chute
          </div>
        </div>

        {!debugOn ? (
          <button
            onClick={() => void enableDebug()}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs hover:bg-zinc-800"
          >
            Activer debug
          </button>
        ) : (
          <button
            onClick={() => setDebugOn(false)}
            className="rounded-xl border border-zinc-800 bg-transparent px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900"
          >
            Stop
          </button>
        )}
      </div>

      {debugErr && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/30 p-3 text-xs text-red-200">
          {debugErr}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-zinc-800 bg-black/20 p-3">
          <div className="text-[11px] text-zinc-400">gMag (incl. gravité)</div>
          <div className="mt-1 text-sm font-semibold text-zinc-100">
            {gMag == null ? "—" : gMag.toFixed(2)}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-black/20 p-3">
          <div className="text-[11px] text-zinc-400">gyroMag</div>
          <div className="mt-1 text-sm font-semibold text-zinc-100">
            {gyroMag == null ? "—" : gyroMag.toFixed(0)}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-black/20 p-3">
          <div className="text-[11px] text-zinc-400">Hz</div>
          <div className="mt-1 text-sm font-semibold text-zinc-100">
            {hz == null ? "—" : hz.toFixed(1)}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-black/20 p-3">
          <div className="text-[11px] text-zinc-400">Cooldown restant</div>
          <div className="mt-1 text-sm font-semibold text-zinc-100">{cooldownLabel}</div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-black/20 p-3 space-y-1">
        <div className="text-[11px] text-zinc-400">État fall engine</div>
        <div className="text-sm text-zinc-200">
          enabled: <span className="text-zinc-100 font-semibold">{String(enabled)}</span>
          {" • "}
          status: <span className="text-zinc-100 font-semibold">{status}</span>
          {" • "}
          confiance:{" "}
          <span className="text-zinc-100 font-semibold">
            {conf == null ? "—" : `${Math.round(conf * 100)}%`}
          </span>
          {" • "}
          countdown:{" "}
          <span className="text-zinc-100 font-semibold">
            {countdownActive ? `${countdownSec}s` : "—"}
          </span>
        </div>
      </div>

      {/* Sliders */}
      <div className="space-y-3">
        <SliderRow
          label="Countdown (s)"
          value={config.countdownSeconds}
          min={5}
          max={30}
          step={1}
          onChange={(v) => setConfig({ countdownSeconds: v })}
        />

        <SliderRow
          label="Warmup (ms)"
          value={config.warmupMs}
          min={0}
          max={8000}
          step={250}
          onChange={(v) => setConfig({ warmupMs: v })}
        />

        <SliderRow
          label="Cooldown (ms)"
          value={config.cooldownMs}
          min={0}
          max={60000}
          step={1000}
          onChange={(v) => setConfig({ cooldownMs: v })}
        />

        <SliderRow
          label="Min sample Hz"
          value={config.minSampleHz}
          min={1}
          max={60}
          step={1}
          onChange={(v) => setConfig({ minSampleHz: v })}
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => startCountdown(config.countdownSeconds)}
          className="flex-1 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm text-sky-200 hover:bg-sky-500/15"
        >
          Simuler chute
        </button>

        <button
          onClick={() =>
            setConfig({
              countdownSeconds: 15,
              warmupMs: 2500,
              cooldownMs: 20000,
              minSampleHz: 10,
            })
          }
          className="rounded-xl border border-zinc-800 bg-transparent px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
        >
          Reset
        </button>
      </div>

      <p className="text-xs text-zinc-500">
        Astuce: teste sur mobile. Sur desktop, Motion peut être absent ou bridé.
      </p>
    </div>
  );
}

function SliderRow(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const { label, value, min, max, step, onChange } = props;

  return (
    <div className="rounded-xl border border-zinc-800 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-zinc-300">{label}</div>
        <div className="text-xs text-zinc-100 font-semibold tabular-nums">{value}</div>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-sky-400"
      />
    </div>
  );
}
