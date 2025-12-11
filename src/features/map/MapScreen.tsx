import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ensureLocationPermission,
  getCurrentPosition,
  watchPosition,
} from "../../services/permissions/location";
import { useLocationStore } from "../../store/location.slice";
import { useRoutingStore } from "../../store/routing.slice";
import { useNavigationStore } from "../../store/navigation.slice";
import MapView from "./MapView";
import NavBanner from "./components/NavBanner";
import { formatDistance, formatDuration } from "../../services/routing/format";
import { geocodeForward, type PlaceResult } from "../../services/mapbox/geocoding";
import type { LatLng } from "../../types/routing";
import {
  distanceToRouteMeters,
  remainingRouteDistanceMeters,
} from "../../services/routing/geo";

import { Haptics, NotificationType, ImpactStyle } from "@capacitor/haptics";
import { LocalNotifications } from "@capacitor/local-notifications";

type SelectedDestination = { label: string; center: LatLng };

type GpsQuality = "good" | "medium" | "poor";

function gpsQualityFromAccuracy(acc: number | null | undefined): GpsQuality {
  const a = acc ?? 999;
  if (a <= 25) return "good";
  if (a <= 50) return "medium";
  return "poor";
}

function gpsLabel(q: GpsQuality) {
  if (q === "good") return "bon";
  if (q === "medium") return "moyen";
  return "faible";
}

function gpsPillClass(q: GpsQuality) {
  if (q === "good") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (q === "medium") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  return "border-red-500/30 bg-red-500/10 text-red-200";
}

export default function MapScreen() {
  const { permission, fix, setPermission, setFix } = useLocationStore();
  const [error, setError] = useState<string | null>(null);

  const routing = useRoutingStore();
  const selected = useRoutingStore((s) => s.selected());

  const nav = useNavigationStore();
  const isNavigating = useNavigationStore((s) => s.isNavigating);
  const navFollowUser = useNavigationStore((s) => s.followUser);

  const [destination, setDestination] = useState<SelectedDestination | null>(null);

  // Search UI
  const [q, setQ] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // UX toggles
  const [autoRouting, setAutoRouting] = useState(true);

  // Live metrics
  const [distanceToRoute, setDistanceToRoute] = useState<number | null>(null);
  const [remainingDistance, setRemainingDistance] = useState<number | null>(null);
  const [remainingDuration, setRemainingDuration] = useState<number | null>(null);
  const [nextInstruction, setNextInstruction] = useState<string | null>(null);

  const routeAbortRef = useRef<AbortController | null>(null);
  const stopWatchRef = useRef<null | (() => void)>(null);

  // reroute logic
  const offRouteStreakRef = useRef(0);
  const lastRerouteAtRef = useRef(0);

  // --- feedback guards (avoid spam)
  const offRouteRef = useRef(false);
  const lastOffRouteBuzzAtRef = useRef(0);
  const lastOffRouteNotifAtRef = useRef(0);
  const lastInstrRef = useRef<string | null>(null);
  const lastInstrBuzzAtRef = useRef(0);

  // perf guards (reduce high-frequency UI updates)
  const lastFixUpdateAtRef = useRef(0);
  const lastMetricsUpdateAtRef = useRef(0);

  // seuils GPS
  const GPS_MAX_ACC_FOR_SNAP = 55; // au-delà, on limite le snap
  const GPS_MAX_ACC_FOR_OFFROUTE = 60; // au-delà, on ne change pas l'état offRoute
  const GPS_MAX_ACC_FOR_REROUTE = 35; // reroute seulement si assez précis

  // ✅ stable gesture callback (anti-flash)
  const handleUserGesture = useCallback(() => {
    const s = useNavigationStore.getState();
    if (s.isNavigating) s.setFollowUser(false);
  }, []);

  // ✅ request notifications permission once (Android 13+ needs it)
  useEffect(() => {
    (async () => {
      try {
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== "granted") {
          await LocalNotifications.requestPermissions();
        }
      } catch {
        /* noop */
      }
    })();
  }, []);

  // Init permission + first fix
  useEffect(() => {
    (async () => {
      try {
        setError(null);
        const perm = await ensureLocationPermission();
        setPermission(perm);

        const pos = await getCurrentPosition();
        setFix(pos);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue");
      }
    })();
  }, [setPermission, setFix]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWatchRef.current?.();
      routeAbortRef.current?.abort();
      nav.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ghost routes
  const altRoutes = useMemo(() => {
    return routing.candidates
      .filter((c) => c.id !== routing.selectedId)
      .map((c) => c.geometry);
  }, [routing.candidates, routing.selectedId]);

  async function runSearch() {
    const query = q.trim();
    if (!query) {
      setResults([]);
      setSearchError(null);
      return;
    }
    try {
      setSearchError(null);
      setSearchLoading(true);
      const r = await geocodeForward(query, fix ?? undefined);
      setResults(r);
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Erreur recherche");
    } finally {
      setSearchLoading(false);
    }
  }

  // Debounced autocomplete
  useEffect(() => {
    const t = setTimeout(() => void runSearch(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, fix]);

  async function calculateTo(dest: SelectedDestination) {
    if (!fix) return;

    routeAbortRef.current?.abort();
    const ac = new AbortController();
    routeAbortRef.current = ac;

    routing.clear();

    await routing.calculate(
      {
        origin: fix,
        destination: dest.center,
        preference: { preferBikeLanes: 1, preferQuietStreets: 0.8 },
      },
      { signal: ac.signal }
    );
  }

  function setAsDestination(r: PlaceResult) {
    const dest = { label: r.label, center: r.center };
    setDestination(dest);
    setResults([]);
    setQ(r.label);

    if (autoRouting) void calculateTo(dest);
    else routing.clear();
  }

  function clearDestination() {
    stopNavigation();
    setDestination(null);
    routing.clear();

    setDistanceToRoute(null);
    setRemainingDistance(null);
    setRemainingDuration(null);
    setNextInstruction(null);

    nav.reset();

    setQ("");
    setResults([]);
  }

  function stopNavigation() {
    stopWatchRef.current?.();
    stopWatchRef.current = null;

    nav.stop();

    // reset feedback guards
    offRouteRef.current = false;
    lastInstrRef.current = null;

    offRouteStreakRef.current = 0;
    setDistanceToRoute(null);
    setRemainingDistance(null);
    setRemainingDuration(null);
    setNextInstruction(null);
  }

  function startNavigation() {
    if (!destination || !selected || !fix) return;

    nav.start(); // followUser = true dans le store

    // reset feedback guards
    offRouteRef.current = false;
    lastInstrRef.current = null;

    offRouteStreakRef.current = 0;
    lastRerouteAtRef.current = 0;

    stopWatchRef.current?.();
    stopWatchRef.current = watchPosition(async (newFix) => {
      const nowTs = Date.now();

      // --- Gating simple pour l'update du store location (setFix)
      const FIX_MIN_INTERVAL_MS = 220;
      const shouldUpdateFix =
        lastFixUpdateAtRef.current === 0 ||
        nowTs - lastFixUpdateAtRef.current >= FIX_MIN_INTERVAL_MS;

      if (shouldUpdateFix) {
        lastFixUpdateAtRef.current = nowTs;
        setFix(newFix);
      }

      if (!selected) return;

      const accGps = newFix.accuracy ?? 999;

      const { routeSegIndex } = useNavigationStore.getState();

      const snap = distanceToRouteMeters(newFix, selected.geometry, {
        hintSegmentIndex: routeSegIndex ?? undefined,
        searchWindow: accGps > GPS_MAX_ACC_FOR_SNAP ? 6 : 18,
        fallbackToFullScan: accGps > GPS_MAX_ACC_FOR_SNAP ? false : true,
      });

      // store progress for next tick (seulement si GPS correct)
      if (accGps <= GPS_MAX_ACC_FOR_SNAP) {
        nav.setRouteProgress(snap.segmentIndex, snap.t);
      }

      const distance = snap.distance;
      const segmentIndex = snap.segmentIndex;
      const t = snap.t;

      // OFF-ROUTE hystérésis + garde-fou accuracy
      const OFF_ROUTE_ENTER = 40;
      const OFF_ROUTE_EXIT = 28;

      const wasOff = offRouteRef.current;

      let isOff = wasOff;
      if (accGps <= GPS_MAX_ACC_FOR_OFFROUTE) {
        isOff = wasOff ? distance > OFF_ROUTE_EXIT : distance > OFF_ROUTE_ENTER;
      }

      nav.setOffRoute(isOff);

      const rem = remainingRouteDistanceMeters(selected.geometry, segmentIndex, t);

      const speed = newFix.speed ?? null;
      const totalDist = selected.summary.distanceMeters;
      const totalDur = selected.summary.durationSeconds;

      let etaSec: number;
      if (typeof speed === "number" && speed > 0.6 && speed < 15) etaSec = rem / speed;
      else etaSec = (totalDist > 1 ? rem / totalDist : 1) * totalDur;

      etaSec = Math.max(0, etaSec);

      // Next instruction + distance to next maneuver
      const traveled = Math.max(0, totalDist - rem);
      let acc = 0;
      let idx = 0;
      for (let i = 0; i < selected.steps.length; i++) {
        acc += selected.steps[i].distanceMeters;
        if (acc >= traveled) {
          idx = i;
          break;
        }
      }
      const distToNext = Math.max(0, acc - traveled);
      const instr = selected.steps[idx]?.instruction ?? null;

      // --- Gating pour les métriques UI + nav.update
      const METRICS_MIN_INTERVAL_MS = 350;
      const shouldUpdateMetrics =
        lastMetricsUpdateAtRef.current === 0 ||
        nowTs - lastMetricsUpdateAtRef.current >= METRICS_MIN_INTERVAL_MS;

      if (shouldUpdateMetrics) {
        lastMetricsUpdateAtRef.current = nowTs;

        setDistanceToRoute(distance);
        setRemainingDistance(rem);
        setRemainingDuration(etaSec);
        setNextInstruction(instr);

        nav.update({
          remainingDistance: rem,
          distanceToRoute: distance,
          remainingDurationSec: etaSec,
          stepIndex: idx,
          nextInstruction: instr,
          distanceToNextManeuver: distToNext,
        });
      }

      // Off-route entered => vibrate + notif (throttled)
      if (isOff && !wasOff) {
        offRouteRef.current = true;

        const now = Date.now();
        if (now - lastOffRouteBuzzAtRef.current > 6000) {
          lastOffRouteBuzzAtRef.current = now;
          try {
            await Haptics.notification({ type: NotificationType.Warning });
          } catch {
            /* noop */
          }
        }

        if (now - lastOffRouteNotifAtRef.current > 15000) {
          lastOffRouteNotifAtRef.current = now;
          try {
            await LocalNotifications.schedule({
              notifications: [
                {
                  id: 101,
                  title: "SoftRide",
                  body: "⚠️ Hors itinéraire — on recalcule si besoin",
                  schedule: { at: new Date(Date.now() + 250) },
                },
              ],
            });
          } catch {
            /* noop */
          }
        }
      }

      // Off-route resolved
      if (!isOff && wasOff) {
        offRouteRef.current = false;
      }

      // Instruction changed => small haptic (throttled)
      if (instr && instr !== lastInstrRef.current && distToNext <= 250) {
        const now = Date.now();
        if (now - lastInstrBuzzAtRef.current > 3500) {
          lastInstrBuzzAtRef.current = now;
          lastInstrRef.current = instr;
          try {
            await Haptics.impact({ style: ImpactStyle.Light });
          } catch {
            /* noop */
          }
        }
      }

      // Arrivé
      if (rem < 25) {
        stopNavigation();
        return;
      }

      // Reroute (stable + accuracy)
      const ACC_OK = accGps < GPS_MAX_ACC_FOR_REROUTE;
      const COOLDOWN_MS = 12000;

      if (ACC_OK && isOff) offRouteStreakRef.current += 1;
      else offRouteStreakRef.current = 0;

      const now = Date.now();
      const canReroute = now - lastRerouteAtRef.current > COOLDOWN_MS;

      if (offRouteStreakRef.current >= 2 && canReroute && destination) {
        lastRerouteAtRef.current = now;
        offRouteStreakRef.current = 0;
        await calculateTo(destination);
      }
    });
  }

  const showResults = results.length > 0 && !isNavigating;

  const BOTTOM_EXTRA_PX = -60;

  // GPS quality pill
  const gpsQuality = gpsQualityFromAccuracy(fix?.accuracy);
  const gpsAccMeters =
    typeof fix?.accuracy === "number" && Number.isFinite(fix.accuracy)
      ? Math.round(fix.accuracy)
      : null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-black touch-none">
      {/* MAP */}
      <div className="absolute inset-0">
        {fix ? (
          <MapView
            center={fix}
            heading={fix.heading ?? null}
            followUser={isNavigating && navFollowUser}
            onUserGesture={handleUserGesture}
            destination={destination?.center ?? null}
            selectedRoute={selected?.geometry ?? null}
            alternativeRoutes={altRoutes}
            zoom={15}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <p className="text-sm text-zinc-400">Chargement de la localisation…</p>
          </div>
        )}
      </div>

      {/* TOP OVERLAY */}
      <div className="absolute left-0 right-0 top-0 z-10 p-3 pt-4 space-y-2">
        <div className="mx-auto max-w-xl space-y-2">
          <NavBanner />

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 backdrop-blur px-3 py-2 shadow-lg">
            <div className="flex items-center gap-2">
              <div className="text-xs text-zinc-400 shrink-0">Destination</div>

              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void runSearch();
                  }
                }}
                disabled={isNavigating}
                placeholder="Où on va ? (adresse, lieu, POI)"
                className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
              />

              {searchLoading ? (
                <div className="text-xs text-zinc-400">…</div>
              ) : (
                <button
                  onClick={() => void runSearch()}
                  disabled={!q.trim() || isNavigating}
                  className="rounded-xl border border-zinc-800 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800/40 disabled:opacity-50"
                >
                  Chercher
                </button>
              )}

              {destination && (
                <button
                  onClick={clearDestination}
                  className="rounded-xl border border-zinc-800 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800/40"
                >
                  Effacer
                </button>
              )}
            </div>

            {/* Ligne infos: destination + GPS */}
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="text-xs text-zinc-300 min-w-0">
                {destination ? (
                  <>
                    <span className="text-zinc-400">Sélectionné :</span>{" "}
                    <span className="font-semibold text-zinc-100 truncate inline-block max-w-[12rem]">
                      {destination.label}
                    </span>
                  </>
                ) : (
                  <span className="text-zinc-500">Choisis une adresse pour commencer</span>
                )}
              </div>

              {/* Pastille GPS */}
              <div
                className={[
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                  gpsPillClass(gpsQuality),
                ].join(" ")}
              >
                <span className="uppercase tracking-wide">GPS</span>
                <span>{gpsLabel(gpsQuality)}</span>
                {gpsAccMeters != null && <span className="opacity-70">(~{gpsAccMeters} m)</span>}
              </div>
            </div>

            {searchError && <div className="mt-2 text-xs text-red-300">{searchError}</div>}
            {error && <div className="mt-2 text-xs text-red-300">{error}</div>}
            {permission !== "granted" && (
              <div className="mt-2 text-xs text-zinc-400">
                Permission localisation: <span className="text-zinc-200">{permission}</span>
              </div>
            )}
          </div>

          {showResults && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 backdrop-blur shadow-lg overflow-hidden">
              {results.slice(0, 6).map((r) => (
                <div key={r.id} className="px-3 py-2 border-b border-zinc-900 last:border-b-0">
                  <div className="text-sm text-zinc-100">{r.label}</div>
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => setAsDestination(r)}
                      className="rounded-xl border border-zinc-800 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800/40"
                    >
                      Utiliser comme destination
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM SHEET */}
      <div
        className="absolute left-0 right-0 z-30 p-3"
        style={{
          bottom: `calc(var(--bottom-nav-h, 72px) + 12px + ${BOTTOM_EXTRA_PX}px)`,
        }}
      >
        <div className="mx-auto max-w-xl">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 backdrop-blur shadow-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-zinc-200">{isNavigating ? "Navigation active" : "Prêt"}</div>
            </div>

            {/* Polished toggles */}
            <div className="grid grid-cols-2 gap-2">
              {/* Auto-route */}
              <button
                type="button"
                role="switch"
                aria-checked={autoRouting}
                disabled={isNavigating}
                onClick={() => setAutoRouting((v) => !v)}
                className={[
                  "h-[68px] w-full relative flex items-center justify-between gap-3 rounded-2xl border px-4 transition select-none",
                  isNavigating
                    ? "cursor-not-allowed opacity-50 border-zinc-800 bg-zinc-950/40"
                    : autoRouting
                    ? "border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/15"
                    : "border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900/60",
                ].join(" ")}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className={autoRouting ? "text-sky-200" : "text-zinc-300"}>🧭</span>
                  <div className="min-w-0 leading-none">
                    <div
                      className={autoRouting ? "text-sky-100" : "text-zinc-100"}
                      style={{ fontSize: 12, fontWeight: 700 }}
                    >
                      Auto-route
                    </div>
                    <div className="mt-1 text-[11px] text-zinc-400 truncate">Calcule à la sélection</div>
                  </div>
                </div>

                <div className="shrink-0">
                  <div
                    className={[
                      "relative h-7 w-12 rounded-full border transition",
                      autoRouting ? "border-sky-400/50 bg-sky-400/25" : "border-zinc-700 bg-zinc-900/60",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "absolute top-1/2 -translate-y-1/2 h-6 w-6 rounded-full shadow-sm transition-all",
                        autoRouting ? "left-[22px] bg-sky-200" : "left-[2px] bg-zinc-200",
                      ].join(" ")}
                    />
                  </div>
                </div>
              </button>

              {/* Suivre */}
              <button
                type="button"
                role="switch"
                aria-checked={navFollowUser}
                disabled={!isNavigating}
                onClick={() => nav.setFollowUser(!navFollowUser)}
                className={[
                  "h-[68px] w-full relative flex items-center justify-between gap-3 rounded-2xl border px-4 transition select-none",
                  !isNavigating
                    ? "cursor-not-allowed opacity-50 border-zinc-800 bg-zinc-950/40"
                    : navFollowUser
                    ? "border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/15"
                    : "border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900/60",
                ].join(" ")}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className={navFollowUser ? "text-emerald-200" : "text-zinc-300"}>🎯</span>
                  <div className="min-w-0 leading-none">
                    <div
                      className={navFollowUser ? "text-emerald-100" : "text-zinc-100"}
                      style={{ fontSize: 12, fontWeight: 700 }}
                    >
                      Suivre
                    </div>
                    <div className="mt-1 text-[11px] text-zinc-400 truncate">Caméra sur toi</div>
                  </div>
                </div>

                <div className="shrink-0">
                  <div
                    className={[
                      "relative h-7 w-12 rounded-full border transition",
                      navFollowUser ? "border-emerald-400/50 bg-emerald-400/25" : "border-zinc-700 bg-zinc-900/60",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "absolute top-1/2 -translate-y-1/2 h-6 w-6 rounded-full shadow-sm transition-all",
                        navFollowUser ? "left-[22px] bg-emerald-200" : "left-[2px] bg-zinc-200",
                      ].join(" ")}
                    />
                  </div>
                </div>
              </button>
            </div>

            {/* ACTIONS */}
            <div className="flex gap-2">
              <button
                onClick={isNavigating ? stopNavigation : startNavigation}
                disabled={!fix || !destination || routing.loading || !selected}
                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm hover:bg-zinc-800 disabled:opacity-50"
              >
                {isNavigating ? "Arrêter" : "Démarrer"}
              </button>

              <button
                onClick={() => destination && void calculateTo(destination)}
                disabled={!fix || !destination || routing.loading}
                className="rounded-xl border border-zinc-800 bg-transparent px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900 disabled:opacity-50"
              >
                {routing.loading ? "Calcul…" : "Recalculer"}
              </button>
            </div>

            {/* SUMMARY */}
            {selected ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-zinc-100 font-semibold">
                    {formatDistance(selected.summary.distanceMeters)} •{" "}
                    {formatDuration(selected.summary.durationSeconds)}
                  </div>
                  <div className="text-xs text-zinc-400">
                    Score <span className="text-zinc-100 font-semibold">{selected.safetyScore}</span>/100
                  </div>
                </div>

                {isNavigating && (
                  <>
                    <div className="text-xs text-zinc-400">
                      Restant:{" "}
                      <span className="text-zinc-100 font-semibold">
                        {remainingDistance != null ? formatDistance(remainingDistance) : "—"}
                      </span>
                      {" • "}
                      ETA:{" "}
                      <span className="text-zinc-100 font-semibold">
                        {remainingDuration != null ? formatDuration(remainingDuration) : "—"}
                      </span>
                      {" • "}
                      Écart:{" "}
                      <span
                        className={
                          distanceToRoute != null && distanceToRoute > 35 ? "text-red-300" : "text-zinc-200"
                        }
                      >
                        {distanceToRoute != null ? `${Math.round(distanceToRoute)} m` : "—"}
                      </span>
                    </div>

                    {nextInstruction && (
                      <div className="mt-2 text-sm text-zinc-100">
                        Prochaine: <span className="font-semibold">{nextInstruction}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="text-xs text-zinc-400">
                {destination ? "Sélectionne une destination puis calcule l’itinéraire." : "Choisis une destination."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
