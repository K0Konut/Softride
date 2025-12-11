import { useEffect, useMemo, useRef } from "react";
import mapboxgl from "mapbox-gl";
import type { Feature, FeatureCollection, LineString } from "geojson";
import type { LatLng } from "../../types/routing";
import { requireMapboxToken } from "../../app/config/env";

type Props = {
  center: LatLng;
  zoom?: number;

  // nav camera
  heading?: number | null; // degrés
  followUser?: boolean; // true => caméra suit center (+ bearing)
  onUserGesture?: () => void; // drag/zoom/rotate => MapScreen coupe follow

  // routes
  selectedRoute?: Feature<LineString> | null;
  alternativeRoutes?: Feature<LineString>[];

  // markers
  destination?: LatLng | null;
};

const SRC_SELECTED = "softride-route-selected";
const LYR_SELECTED = "softride-route-selected-line";

const SRC_ALTS = "softride-route-alts";
const LYR_ALTS = "softride-route-alts-line";

const emptyLines: FeatureCollection<LineString> = { type: "FeatureCollection", features: [] };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}
function wrapBearing(deg: number) {
  // normalize to [-180, 180]
  let x = ((deg + 180) % 360) - 180;
  if (x < -180) x += 360;
  return x;
}
function shortestBearing(from: number, to: number) {
  // diff in [-180, 180]
  const diff = wrapBearing(to - from);
  return from + diff;
}

export default function MapView({
  center,
  zoom = 15,
  heading = null,
  followUser = false,
  onUserGesture,

  selectedRoute,
  alternativeRoutes = [],

  destination,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const destMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const token = useMemo(() => requireMapboxToken(), []);

  // refs pour caméra fluide
  const lastCamAtRef = useRef<number>(0);
  const lastBearRef = useRef<number | null>(null);
  const programmaticMoveRef = useRef(false);
  const pendingRouteRef = useRef<{ sel: Feature<LineString> | null; alts: Feature<LineString>[] }>({
    sel: null,
    alts: [],
  });

  // Init map (⚠️ une seule fois)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [center.lng, center.lat],
      zoom,
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");

    // Marker utilisateur
    const userMarker = new mapboxgl.Marker({ color: "#22c55e" })
      .setLngLat([center.lng, center.lat])
      .addTo(map);
    userMarkerRef.current = userMarker;

    // Gesture detection => coupe follow
    const fireGesture = () => {
      if (programmaticMoveRef.current) return;
      onUserGesture?.();
    };

    map.on("dragstart", fireGesture);
    map.on("rotatestart", fireGesture);
    map.on("pitchstart", fireGesture);
    map.on("zoomstart", fireGesture);

    map.on("load", () => {
      if (!map.getSource(SRC_ALTS)) map.addSource(SRC_ALTS, { type: "geojson", data: emptyLines });
      if (!map.getSource(SRC_SELECTED)) map.addSource(SRC_SELECTED, { type: "geojson", data: emptyLines });

      if (!map.getLayer(LYR_ALTS)) {
        map.addLayer({
          id: LYR_ALTS,
          type: "line",
          source: SRC_ALTS,
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-width": 4,
            "line-color": "#a1a1aa",
            "line-opacity": 0.5,
            "line-dasharray": [1.5, 1.5],
          },
        });
      }

      if (!map.getLayer(LYR_SELECTED)) {
        map.addLayer({
          id: LYR_SELECTED,
          type: "line",
          source: SRC_SELECTED,
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-width": 6,
            "line-color": "#38bdf8",
            "line-opacity": 0.9,
          },
        });
      }

      // applique les routes “en attente” (si MapScreen a déjà calculé avant load)
      const alts = map.getSource(SRC_ALTS) as mapboxgl.GeoJSONSource | undefined;
      const sel = map.getSource(SRC_SELECTED) as mapboxgl.GeoJSONSource | undefined;
      if (alts && sel) {
        alts.setData({ type: "FeatureCollection", features: pendingRouteRef.current.alts ?? [] });
        sel.setData(
          pendingRouteRef.current.sel
            ? { type: "FeatureCollection", features: [pendingRouteRef.current.sel] }
            : emptyLines
        );
      }
    });

    mapRef.current = map;

    return () => {
      map.off("dragstart", fireGesture);
      map.off("rotatestart", fireGesture);
      map.off("pitchstart", fireGesture);
      map.off("zoomstart", fireGesture);

      userMarker.remove();
      destMarkerRef.current?.remove();
      map.remove();

      mapRef.current = null;
      userMarkerRef.current = null;
      destMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Update user marker
  useEffect(() => {
    const marker = userMarkerRef.current;
    if (!marker) return;
    marker.setLngLat([center.lng, center.lat]);
  }, [center.lat, center.lng]);

  // Destination marker (safe order)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!destination) {
      destMarkerRef.current?.remove();
      destMarkerRef.current = null;
      return;
    }

    const lngLat: [number, number] = [destination.lng, destination.lat];

    if (!destMarkerRef.current) {
      destMarkerRef.current = new mapboxgl.Marker({ color: "#fb7185" })
        .setLngLat(lngLat)
        .addTo(map);
    } else {
      destMarkerRef.current.setLngLat(lngLat);
    }
  }, [destination]);


  // Update routes (alts + selected) — sans casser map si pas encore "load"
  useEffect(() => {
    const map = mapRef.current;

    // stocke pour "load" si besoin
    pendingRouteRef.current = { sel: selectedRoute ?? null, alts: alternativeRoutes ?? [] };

    if (!map || !map.isStyleLoaded()) return;

    const alts = map.getSource(SRC_ALTS) as mapboxgl.GeoJSONSource | undefined;
    const sel = map.getSource(SRC_SELECTED) as mapboxgl.GeoJSONSource | undefined;
    if (!alts || !sel) return;

    alts.setData({ type: "FeatureCollection", features: alternativeRoutes ?? [] });
    sel.setData(selectedRoute ? { type: "FeatureCollection", features: [selectedRoute] } : emptyLines);

    // Fit sur la route (une fois) uniquement si followUser=false
    // (sinon ça “fight” avec la caméra nav)
    if (!followUser && selectedRoute?.geometry.coordinates?.length) {
      const coords = selectedRoute.geometry.coordinates;
      const b = coords.reduce(
        (acc, c) => acc.extend([c[0], c[1]] as [number, number]),
        new mapboxgl.LngLatBounds([coords[0][0], coords[0][1]], [coords[0][0], coords[0][1]])
      );
      programmaticMoveRef.current = true;
      map.fitBounds(b, { padding: 56, duration: 550 });
      map.once("moveend", () => (programmaticMoveRef.current = false));
    }
  }, [selectedRoute, alternativeRoutes, followUser]);

  // ✅ Navigation camera: suit l'utilisateur en douceur + bearing = heading
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!followUser) return;

    const now = performance.now();
    // throttle (évite micro “tremblements” et surcharges)
    if (now - lastCamAtRef.current < 180) return;
    lastCamAtRef.current = now;

    const targetCenter: [number, number] = [center.lng, center.lat];

    const currentBearing = map.getBearing();
    const desiredBearing =
      typeof heading === "number"
        ? shortestBearing(currentBearing, wrapBearing(heading))
        : currentBearing;

    // évite de micro-changer le bearing quand la boussole “jitte”
    const last = lastBearRef.current ?? desiredBearing;
    const diff = Math.abs(wrapBearing(desiredBearing - last));
    const finalBearing = diff < 2 ? last : desiredBearing;
    lastBearRef.current = finalBearing;

    const targetPitch = 50; // feeling "nav"
    const targetZoom = clamp(map.getZoom(), 13.5, 18);

    programmaticMoveRef.current = true;
    map.easeTo({
      center: targetCenter,
      bearing: finalBearing,
      pitch: targetPitch,
      zoom: targetZoom,
      duration: 650,
      essential: true,
    });
    map.once("moveend", () => (programmaticMoveRef.current = false));
  }, [followUser, center.lat, center.lng, heading]);

  // Si on quitte le follow, on “relâche” un peu la pitch (optionnel mais agréable)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (followUser) return;

    // petit reset doux, sans forcer le bearing
    programmaticMoveRef.current = true;
    map.easeTo({ pitch: 0, duration: 450, essential: true });
    map.once("moveend", () => (programmaticMoveRef.current = false));
  }, [followUser]);

  return <div ref={containerRef} className="h-full w-full" />;
}
