import type { Feature, LineString } from "geojson";
import type { LatLng } from "../../types/routing";

const R = 6371000; // Earth radius (m)
const DEG = Math.PI / 180;

export function haversineMeters(a: LatLng, b: LatLng): number {
  const φ1 = a.lat * DEG;
  const φ2 = b.lat * DEG;
  const dφ = (b.lat - a.lat) * DEG;
  const dλ = (b.lng - a.lng) * DEG;

  const s =
    Math.sin(dφ / 2) * Math.sin(dφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) * Math.sin(dλ / 2);

  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

// projection “plan” locale (ok à l’échelle d’une ville)
function projectXY(origin: LatLng, p: LatLng) {
  const x = (p.lng - origin.lng) * DEG * R * Math.cos(origin.lat * DEG);
  const y = (p.lat - origin.lat) * DEG * R;
  return { x, y };
}

function distPointToSegmentMeters(p: LatLng, a: LatLng, b: LatLng): { d: number; t: number } {
  const o = a;
  const P = projectXY(o, p);
  const A = projectXY(o, a);
  const B = projectXY(o, b);

  const vx = B.x - A.x;
  const vy = B.y - A.y;

  const wx = P.x - A.x;
  const wy = P.y - A.y;

  const vv = vx * vx + vy * vy;
  const t = vv === 0 ? 0 : Math.max(0, Math.min(1, (wx * vx + wy * vy) / vv));

  const cx = A.x + t * vx;
  const cy = A.y + t * vy;

  const dx = P.x - cx;
  const dy = P.y - cy;

  return { d: Math.sqrt(dx * dx + dy * dy), t };
}

export type SnapOptions = {
  hintSegmentIndex?: number;
  searchWindow?: number; // combien de segments autour du hint
  fallbackToFullScan?: boolean;
};

export function distanceToRouteMeters(
  pos: LatLng,
  route: Feature<LineString>,
  opts?: SnapOptions
): {
  distance: number;
  segmentIndex: number; // segment [i -> i+1]
  t: number;            // 0..1 progress on that segment
} {
  const coords = route.geometry.coordinates;
  if (coords.length < 2) return { distance: Infinity, segmentIndex: 0, t: 0 };

  const segCount = coords.length - 1;

  const hint = opts?.hintSegmentIndex;
  const window = Math.max(0, opts?.searchWindow ?? 0);
  const fallback = opts?.fallbackToFullScan ?? true;

  const scanRange = (from: number, to: number) => {
    let best = { distance: Infinity, segmentIndex: 0, t: 0 };
    const start = Math.max(0, Math.min(segCount - 1, from));
    const end = Math.max(0, Math.min(segCount - 1, to));

    for (let i = start; i <= end; i++) {
      const a = { lng: coords[i][0], lat: coords[i][1] };
      const b = { lng: coords[i + 1][0], lat: coords[i + 1][1] };
      const r = distPointToSegmentMeters(pos, a, b);
      if (r.d < best.distance) best = { distance: r.d, segmentIndex: i, t: r.t };
    }
    return best;
  };

  // 1) scan local autour du hint si possible
  if (typeof hint === "number" && Number.isFinite(hint)) {
    const from = hint - window;
    const to = hint + window;

    const local = scanRange(from, to);

    // 2) fallback full scan si demandé (utile si gros saut GPS)
    if (!fallback) return local;

    // si local est déjà très bon, on évite le full scan
    // (petit seuil arbitraire, ajuste si tu veux)
    if (local.distance < 12) return local;

    const full = scanRange(0, segCount - 1);
    return full.distance <= local.distance ? full : local;
  }

  // pas de hint => full scan
  return scanRange(0, segCount - 1);
}

export function totalRouteDistanceMeters(route: Feature<LineString>): number {
  const coords = route.geometry.coordinates;
  let sum = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    sum += haversineMeters(
      { lng: coords[i][0], lat: coords[i][1] },
      { lng: coords[i + 1][0], lat: coords[i + 1][1] }
    );
  }
  return sum;
}

export function remainingRouteDistanceMeters(
  route: Feature<LineString>,
  segIndex: number,
  t: number
): number {
  const coords = route.geometry.coordinates;
  if (coords.length < 2) return Infinity;

  const maxSeg = coords.length - 2;
  const si = Math.max(0, Math.min(maxSeg, segIndex));
  const tt = Math.max(0, Math.min(1, t));

  let rem = 0;

  // distance du point “snappé” jusqu’à la fin du segment courant
  const a = { lng: coords[si][0], lat: coords[si][1] };
  const b = { lng: coords[si + 1][0], lat: coords[si + 1][1] };
  const segLen = haversineMeters(a, b);
  rem += (1 - tt) * segLen;

  // puis les segments restants
  for (let i = si + 1; i < coords.length - 1; i++) {
    const p1 = { lng: coords[i][0], lat: coords[i][1] };
    const p2 = { lng: coords[i + 1][0], lat: coords[i + 1][1] };
    rem += haversineMeters(p1, p2);
  }

  return rem;
}
