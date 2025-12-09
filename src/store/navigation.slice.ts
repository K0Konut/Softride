import { create } from "zustand";

type NavState = {
  isNavigating: boolean;
  followUser: boolean;
  offRoute: boolean;

  // snap/progress on polyline (stabilise la nav)
  routeSegIndex: number | null; // segment [i -> i+1]
  routeT: number | null;        // 0..1 sur ce segment

  // live metrics
  remainingDistance: number | null;
  remainingDurationSec: number | null;
  distanceToRoute: number | null;

  // next step
  stepIndex: number;
  nextInstruction: string | null;
  distanceToNextManeuver: number | null;

  start: () => void;
  stop: () => void;
  reset: () => void;

  setFollowUser: (v: boolean) => void;
  setOffRoute: (v: boolean) => void;
  setRouteProgress: (segIndex: number, t: number) => void;

  update: (
    p: Partial<
      Omit<
        NavState,
        | "start"
        | "stop"
        | "reset"
        | "setFollowUser"
        | "setOffRoute"
        | "setRouteProgress"
        | "update"
      >
    >
  ) => void;
};

export const useNavigationStore = create<NavState>((set) => ({
  isNavigating: false,
  followUser: true,
  offRoute: false,

  routeSegIndex: null,
  routeT: null,

  remainingDistance: null,
  remainingDurationSec: null,
  distanceToRoute: null,

  stepIndex: 0,
  nextInstruction: null,
  distanceToNextManeuver: null,

  start: () =>
    set({
      isNavigating: true,
      followUser: true,
      offRoute: false,

      // ✅ on ne “devine” pas le segment, on attend le 1er snap
      routeSegIndex: null,
      routeT: null,
    }),

  stop: () =>
    set({
      isNavigating: false,
      followUser: true, // ✅ reset follow (évite un état “bloqué” à false)
      offRoute: false,

      routeSegIndex: null,
      routeT: null,

      remainingDistance: null,
      remainingDurationSec: null,
      distanceToRoute: null,

      stepIndex: 0,
      nextInstruction: null,
      distanceToNextManeuver: null,
    }),

  reset: () =>
    set({
      isNavigating: false,
      followUser: true,
      offRoute: false,

      routeSegIndex: null,
      routeT: null,

      remainingDistance: null,
      remainingDurationSec: null,
      distanceToRoute: null,

      stepIndex: 0,
      nextInstruction: null,
      distanceToNextManeuver: null,
    }),

  setFollowUser: (v) => set({ followUser: v }),
  setOffRoute: (v) => set({ offRoute: v }),
  setRouteProgress: (segIndex, t) => set({ routeSegIndex: segIndex, routeT: t }),

  update: (p) => set((s) => ({ ...s, ...p })),
}));
