import type { Feature, LineString } from "geojson";
import type { RouteCandidate, RouteRequest, RouteResult, RouteStep } from "../../types/routing";
import { requireMapboxToken } from "../../app/config/env";
import { fetchJson } from "./http";
import { scoreCandidates } from "../routing/scorer";

type MapboxDirectionsResponse = {
  routes: Array<{
    distance: number;
    duration: number;
    geometry: { type: "LineString"; coordinates: number[][] };
    legs?: Array<{
      steps?: Array<{
        distance: number;
        duration: number;
        name?: string;
        maneuver?: {
          instruction?: string;
          type?: string;
          modifier?: string;
        };
      }>;
      annotation?: {
        speed?: number[];
      };
    }>;
  }>;
  code: string;
  message?: string;
};

function toCoordString(points: { lng: number; lat: number }[]) {
  return points.map((p) => `${p.lng},${p.lat}`).join(";");
}

function toFeature(geometry: { type: "LineString"; coordinates: number[][] }): Feature<LineString> {
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates: geometry.coordinates },
  };
}

function flattenSteps(legs?: MapboxDirectionsResponse["routes"][number]["legs"]): RouteStep[] {
  const out: RouteStep[] = [];
  for (const leg of legs ?? []) {
    for (const s of leg.steps ?? []) {
      out.push({
        instruction: s.maneuver?.instruction ?? (s.name ? `Suivre ${s.name}` : "Continuer"),
        name: s.name,
        distanceMeters: s.distance,
        durationSeconds: s.duration,
        maneuverType: s.maneuver?.type,
        maneuverModifier: s.maneuver?.modifier,
      });
    }
  }
  return out;
}

function computeHighSpeedRatio(legs?: MapboxDirectionsResponse["routes"][number]["legs"]): number {
  const TH = 7; // ~25 km/h
  let total = 0;
  let high = 0;

  for (const leg of legs ?? []) {
    const speeds = leg.annotation?.speed ?? [];
    for (const v of speeds) {
      total++;
      if (v > TH) high++;
    }
  }
  return total ? high / total : 0;
}

function computeTurnLikeCount(steps: RouteStep[]): number {
  const turnLike = new Set([
    "turn",
    "merge",
    "fork",
    "roundabout",
    "roundabout turn",
    "on ramp",
    "off ramp",
    "end of road",
    "new name",
  ]);
  return steps.filter((s) => s.maneuverType && turnLike.has(s.maneuverType)).length;
}

function mkId(i: number) {
  return `route_${i}`;
}

export async function getSecureRoute(
  req: RouteRequest,
  opts?: { signal?: AbortSignal }
): Promise<RouteResult> {
  const token = requireMapboxToken();

  const points = [req.origin, ...(req.waypoints ?? []), req.destination];
  const coordinates = toCoordString(points);

  const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/cycling/${coordinates}`);
  url.search = new URLSearchParams({
    access_token: token,
    geometries: "geojson",
    overview: "full",
    steps: "true",
    alternatives: "true",
    annotations: "distance,duration,speed",
    language: "fr",
  }).toString();

  const data = await fetchJson<MapboxDirectionsResponse>(url.toString(), {
    signal: opts?.signal,
  });

  if (!data.routes?.length) throw new Error(data.message || "Aucune route retournée par Mapbox.");

  const rawCandidates = data.routes.map((r, i) => {
    const steps = flattenSteps(r.legs);
    const turnLikeCount = computeTurnLikeCount(steps);
    const highSpeedRatio = computeHighSpeedRatio(r.legs);

    const base: Omit<RouteCandidate, "safetyScore" | "scoreBreakdown"> = {
      id: mkId(i),
      geometry: toFeature(r.geometry),
      steps,
      summary: {
        distanceMeters: r.distance,
        durationSeconds: r.duration,
        stepCount: steps.length,
        turnLikeCount,
        highSpeedRatio,
      },
    };
    return base;
  });

  const scored = scoreCandidates(rawCandidates, req.preference);
  const best = scored[0];
  const alternatives = scored.slice(1);

  return { best, alternatives, all: scored };
}
