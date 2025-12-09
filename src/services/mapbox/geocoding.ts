import { requireMapboxToken } from "../../app/config/env";
import { fetchJson } from "./http";
import type { LatLng } from "../../types/routing";

export type PlaceResult = {
  id: string;
  label: string;
  center: LatLng;
};

type MapboxGeocodingResponse = {
  features: Array<{
    id: string;
    place_name: string;
    center: [number, number]; // [lng, lat]
  }>;
};

export async function geocodeForward(query: string, proximity?: LatLng): Promise<PlaceResult[]> {
  const token = requireMapboxToken();
  const q = query.trim();
  if (!q) return [];

  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`);
  const params: Record<string, string> = {
    access_token: token,
    language: "fr",
    limit: "6",
    autocomplete: "true",
    types: "address,place,poi",
  };

  if (proximity) params.proximity = `${proximity.lng},${proximity.lat}`;
  url.search = new URLSearchParams(params).toString();

  const data = await fetchJson<MapboxGeocodingResponse>(url.toString());

  return (data.features ?? []).map((f) => ({
    id: f.id,
    label: f.place_name,
    center: { lng: f.center[0], lat: f.center[1] },
  }));
}
