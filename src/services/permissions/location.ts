import { Geolocation } from "@capacitor/geolocation";

export type PermissionState = "unknown" | "granted" | "denied" | "prompt";
export type LatLng = { lat: number; lng: number };

export type LocationFix = LatLng & {
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
};

export async function ensureLocationPermission(): Promise<PermissionState> {
  // web: la permission est demandée au moment du getCurrent/watch
  // native: on peut demander explicitement
  try {
    const status = await Geolocation.checkPermissions();
    if (status.location === "granted") return "granted";
    const req = await Geolocation.requestPermissions();
    return req.location === "granted" ? "granted" : "denied";
  } catch {
    return "prompt";
  }
}

export async function getCurrentPosition(): Promise<LocationFix> {
  const p = await Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
  });

  return {
    lat: p.coords.latitude,
    lng: p.coords.longitude,
    accuracy: p.coords.accuracy,
    heading: p.coords.heading ?? null,
    speed: p.coords.speed ?? null,
    timestamp: p.timestamp,
  };
}

/**
 * watchPosition -> stop() (clearWatch)
 * Capacitor: watchPosition() => Promise<CallbackID> et clearWatch({id}) :contentReference[oaicite:2]{index=2}
 */
export function watchPosition(
  onFix: (fix: LocationFix) => void,
  onError?: (err: unknown) => void
): () => void {
  let watchId: string | null = null;
  let stopped = false;

  void Geolocation.watchPosition(
    {
      enableHighAccuracy: true,
      timeout: 5000,            // Android: sert aussi d’intervalle pour watch :contentReference[oaicite:3]{index=3}
      maximumAge: 0,
      minimumUpdateInterval: 1000, // Android only :contentReference[oaicite:4]{index=4}
    },
    (pos, err) => {
      if (stopped) return;
      if (err) {
        onError?.(err);
        return;
      }
      if (!pos) return;

      onFix({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        heading: pos.coords.heading ?? null,
        speed: pos.coords.speed ?? null,
        timestamp: pos.timestamp,
      });
    }
  ).then((id) => {
    watchId = id;
  }).catch((e) => onError?.(e));

  return () => {
    stopped = true;
    if (watchId) void Geolocation.clearWatch({ id: watchId });
  };
}
