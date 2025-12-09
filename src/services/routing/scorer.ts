import type { RouteCandidate, RoutingPreference } from "../../types/routing";

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function minMaxNorm(value: number, min: number, max: number) {
  if (max <= min) return 0;
  return (value - min) / (max - min);
}

/**
 * Renvoie (0..100) + breakdown.
 * Idée: “sécurisé” = moins de virages manoeuvrés + moins de segments “rapides”,
 * tout en évitant une route beaucoup trop longue.
 */
export function scoreCandidates(
  candidates: Omit<RouteCandidate, "safetyScore" | "scoreBreakdown">[],
  pref?: RoutingPreference
): RouteCandidate[] {
  const quiet = clamp01(pref?.preferQuietStreets ?? 0.7);
  const bike = clamp01(pref?.preferBikeLanes ?? 1);

  const durations = candidates.map(c => c.summary.durationSeconds);
  const distances = candidates.map(c => c.summary.distanceMeters);
  const turns = candidates.map(c => c.summary.turnLikeCount);
  const highSpeeds = candidates.map(c => c.summary.highSpeedRatio);

  const minDur = Math.min(...durations), maxDur = Math.max(...durations);
  const minDis = Math.min(...distances), maxDis = Math.max(...distances);
  const minTurn = Math.min(...turns), maxTurn = Math.max(...turns);
  const minHS = Math.min(...highSpeeds), maxHS = Math.max(...highSpeeds);

  // poids adaptatifs :
  // - plus “quiet” est élevé => plus on pénalise virages / vitesse
  // - plus “bike” est élevé => on tolère un peu plus de détour
  const wTurns = 0.45 * quiet;
  const wHS = 0.25 * quiet;
  const wTime = 0.25 * (1 - 0.35 * bike);
  const wDist = 0.05 * (1 - 0.6 * bike);

  const sumW = wTurns + wHS + wTime + wDist;

  return candidates.map((c) => {
    const nTime = minMaxNorm(c.summary.durationSeconds, minDur, maxDur);
    const nDist = minMaxNorm(c.summary.distanceMeters, minDis, maxDis);
    const nTurns = minMaxNorm(c.summary.turnLikeCount, minTurn, maxTurn);
    const nHS = minMaxNorm(c.summary.highSpeedRatio, minHS, maxHS);

    // Score interne: plus petit = mieux
    const cost =
      (wTurns * nTurns + wHS * nHS + wTime * nTime + wDist * nDist) / (sumW || 1);

    // Conversion en 0..100 (plus haut = mieux)
    const safetyScore = Math.round((1 - clamp01(cost)) * 100);

    return {
      ...c,
      safetyScore,
      scoreBreakdown: {
        time: 1 - clamp01(nTime),
        distance: 1 - clamp01(nDist),
        turns: 1 - clamp01(nTurns),
        calmness: 1 - clamp01(nHS),
      },
    };
  }).sort((a, b) => b.safetyScore - a.safetyScore);
}
