import { useMemo } from "react";
import { useNavigationStore } from "../../../store/navigation.slice";
import { formatDistance, formatDuration } from "../../../services/routing/format";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export default function NavBanner() {
  const isNavigating = useNavigationStore((s) => s.isNavigating);
  const offRoute = useNavigationStore((s) => s.offRoute);

  const nextInstruction = useNavigationStore((s) => s.nextInstruction);
  const distanceToNext = useNavigationStore((s) => s.distanceToNextManeuver);

  const remainingDistance = useNavigationStore((s) => s.remainingDistance);
  const remainingDurationSec = useNavigationStore((s) => s.remainingDurationSec);

  // ✅ Hook toujours appelé (même si on return null ensuite)
  const progress = useMemo(() => {
    const d = distanceToNext ?? 9999;
    return clamp(1 - d / 500, 0, 1);
  }, [distanceToNext]);

  // ✅ Guard APRÈS les hooks
  if (!isNavigating || !nextInstruction) return null;

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
            {offRoute ? (
              <div className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                Hors itinéraire
              </div>
            ) : (
              <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                En route
              </div>
            )}
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
