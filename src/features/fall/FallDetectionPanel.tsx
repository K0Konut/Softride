import { useEffect, useRef, useState } from "react";
import { requestMotionPermission } from "../../services/permissions/motion";
import { useFallStore } from "../../store/fall.slice";
import { useFallDetection } from "./useFallDetection";
import { loadEmergencyContact } from "../../services/emergency/contact";
import { openEmergencySms } from "../../services/emergency/sms";
import { useLocationStore } from "../../store/location.slice";

export default function FallDetectionPanel() {
  const enabled = useFallStore((s) => s.enabled);
  const setEnabled = useFallStore((s) => s.setEnabled);
  const status = useFallStore((s) => s.status);
  const conf = useFallStore((s) => s.lastConfidence);
  const countdownActive = useFallStore((s) => s.countdownActive);
  const countdownSec = useFallStore((s) => s.countdownSec);
  const forceSendNow = useFallStore((s) => s.forceSendNow);

  const fix = useLocationStore((s) => s.fix);

  const [contactOk, setContactOk] = useState<boolean>(false);

  // Prevent double-trigger (button + countdown reaching 0)
  const sendingRef = useRef(false);

  useEffect(() => {
    (async () => {
      const c = await loadEmergencyContact();
      setContactOk(!!c?.phone);
    })();
  }, []);

  const config = useFallStore((s) => s.config);

  const { cancel } = useFallDetection({
    countdownSeconds: config.countdownSeconds,
    warmupMs: config.warmupMs,
    cooldownMs: config.cooldownMs,
    minSampleHz: config.minSampleHz,
    onConfirmed: async () => {
      if (sendingRef.current) return;
      sendingRef.current = true;

      try {
        const c = await loadEmergencyContact();
        if (!c?.phone) {
          alert("Aucun contact d’urgence configuré (Réglages).");
          return;
        }
        await openEmergencySms({ contact: c, currentLocation: fix ?? null });
      } finally {
        // allow again for future detections
        setTimeout(() => (sendingRef.current = false), 1500);
      }
    },
  });

  async function toggle() {
    if (!enabled) {
      const perm = await requestMotionPermission();
      if (perm === "denied") {
        alert("Permission capteurs refusée. Active-la dans les réglages.");
        return;
      }
      const c = await loadEmergencyContact();
      setContactOk(!!c?.phone);
      if (!c?.phone) {
        alert("Configure un contact d’urgence dans Réglages avant d’activer.");
        return;
      }
    }
    setEnabled(!enabled);
  }

  return (
    <>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-zinc-100">Détection de chute</div>
            <div className="text-xs text-zinc-400">
              Impact + immobilité • ouvre un SMS vers le contact d’urgence
            </div>
            {!contactOk && (
              <div className="mt-1 text-xs text-amber-300">
                ⚠️ Aucun contact d’urgence configuré.
              </div>
            )}
          </div>

          <button
            onClick={toggle}
            className={`rounded-xl border px-3 py-2 text-xs ${enabled
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-zinc-800 bg-zinc-900 text-zinc-200"
              }`}
          >
            {enabled ? "Activé" : "Activer"}
          </button>
        </div>

        <div className="text-xs text-zinc-400">
          Statut: <span className="text-zinc-200">{status}</span>
          {conf != null && (
            <>
              {" • "}confiance:{" "}
              <span className="text-zinc-200">{Math.round(conf * 100)}%</span>
            </>
          )}
        </div>
      </div>

      {countdownActive && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-3">
            <div className="text-lg font-bold text-zinc-100">Chute détectée</div>
            <div className="text-sm text-zinc-300">
              Ouverture du SMS dans{" "}
              <span className="font-bold text-sky-300">{countdownSec}s</span>
            </div>
            <div className="text-xs text-zinc-400">Si tout va bien, annule maintenant.</div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={cancel}
                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 hover:bg-zinc-800"
              >
                Annuler
              </button>

              <button
                onClick={forceSendNow}
                className="rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm text-sky-200 hover:bg-sky-500/15"
              >
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
