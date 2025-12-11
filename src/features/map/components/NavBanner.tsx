import { useMemo, type ReactNode } from "react";
import { useNavigationStore } from "../../../store/navigation.slice";
import { useRoutingStore } from "../../../store/routing.slice";
import { useLocationStore } from "../../../store/location.slice";
import { formatDistance, formatDuration } from "../../../services/routing/format";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

type GpsQuality = "good" | "medium" | "poor";

function gpsQualityFromAccuracy(acc: number | null | undefined): GpsQuality {
  const a = acc ?? 999;
  if (a <= 25) return "good";
  if (a <= 50) return "medium";
  return "poor";
}

export default function NavBanner() {
  const isNavigating = useNavigationStore((s) => s.isNavigating);
  const offRoute = useNavigationStore((s) => s.offRoute);

  const nextInstruction = useNavigationStore((s) => s.nextInstruction);
  const distanceToNext = useNavigationStore((s) => s.distanceToNextManeuver);

  const remainingDistance = useNavigationStore((s) => s.remainingDistance);
  const remainingDurationSec = useNavigationStore((s) => s.remainingDurationSec);

  const routingLoading = useRoutingStore((s) => s.loading);

  // GPS (via location store)
  const gpsAccuracy = useLocationStore((s) => s.fix?.accuracy ?? null);

  const gpsQuality = useMemo<GpsQuality>(() => {
    return gpsQualityFromAccuracy(gpsAccuracy);
  }, [gpsAccuracy]);

  const isRerouting = isNavigating && routingLoading;
  const isGpsPoor = gpsQuality === "poor";

  // ✅ Hook toujours appelé (même si on return null ensuite)
  const progress = useMemo(() => {
    const d = distanceToNext ?? 9999;
    return clamp(1 - d / 500, 0, 1);
  }, [distanceToNext]);

  // ✅ Guard APRÈS les hooks
  if (!isNavigating || !nextInstruction) return null;

  let statePill: ReactNode;
  if (offRoute) {
    statePill = (
      <div className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
        Hors itinéraire
      </div>
    );
  } else if (isRerouting) {
    statePill = (
      <div className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs text-sky-200">
        Recalcul en cours…
      </div>
    );
  } else {
    statePill = (
      <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
        En route
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 backdrop-blur shadow-lg overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] tracking-wider text-zinc-400">
              PROCHAINE INSTRUCTION
            </div>

            <div className="mt-1 text-[20px] font-semibold text-zinc-100 leading-snug">
              {nextInstruction}
            </div>

            {/* Ligne de statuts contextuels */}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
              {offRoute ? (
                <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-200">
                  ⚠️ Hors itinéraire, reste prudent
                </span>
              ) : (
                <span className="rounded-full border border-zinc-700/60 bg-zinc-900/70 px-2 py-0.5 text-zinc-300">
                  Navigation active
                </span>
              )}

              {isRerouting && (
                <span className="rounded-full border border-sky-500/50 bg-sky-500/10 px-2 py-0.5 text-sky-200">
                  Recalcul en cours…
                </span>
              )}

              {isGpsPoor && (
                <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-200">
                  GPS faible, guidage moins précis
                </span>
              )}
            </div>

            <div className="mt-2 text-sm text-zinc-300">
              <span className="text-zinc-400">Dans </span>
              <span className="font-semibold text-zinc-100">
                {distanceToNext != null ? formatDistance(distanceToNext) : "—"}
              </span>

              <span className="text-zinc-500"> • </span>

              <span className="text-zinc-400">restant </span>
              <span className="font-semibold text-zinc-100">
                {remainingDistance != null ? formatDistance(remainingDistance) : "—"}
              </span>

              <span className="text-zinc-500"> • </span>

              <span className="text-zinc-400">ETA </span>
              <span className="font-semibold text-zinc-100">
                {remainingDurationSec != null ? formatDuration(remainingDurationSec) : "—"}
              </span>
            </div>
          </div>

          <div className="shrink-0">
            {statePill}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-zinc-900/60">
        <div
          className="h-full bg-sky-400/70"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
    </div>
  );
}
