import type { Feature, LineString } from "geojson";

export type LatLng = { lat: number; lng: number };

export type RoutingPreference = {
  // 0..1 : on s’en sert comme poids
  preferBikeLanes?: number;
  preferQuietStreets?: number;
};

export type RouteRequest = {
  origin: LatLng;
  destination: LatLng;
  waypoints?: LatLng[];
  preference?: RoutingPreference;
};

export type RouteStep = {
  instruction: string;
  name?: string;
  distanceMeters: number;
  durationSeconds: number;
  maneuverType?: string;
  maneuverModifier?: string;
};

export type RouteSummary = {
  distanceMeters: number;
  durationSeconds: number;
  stepCount: number;
  turnLikeCount: number;
  highSpeedRatio: number; // 0..1 (proxy “moins calme”)
};

export type RouteCandidate = {
  id: string; // stable côté UI
  summary: RouteSummary;
  geometry: Feature<LineString>;
  steps: RouteStep[];
  safetyScore: number; // 0..100 (plus haut = mieux)
  scoreBreakdown: Record<string, number>;
};

export type RouteResult = {
  best: RouteCandidate;
  alternatives: RouteCandidate[];
  all: RouteCandidate[];
};
