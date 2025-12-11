import { create } from "zustand";
import type { RouteCandidate, RouteRequest } from "../types/routing";
import { getSecureRoute } from "../services/mapbox/directions";

type RoutingState = {
  loading: boolean;
  error: string | null;

  request: RouteRequest | null;
  candidates: RouteCandidate[];
  selectedId: string | null;

  // anti résultats “en retard”
  activeRequestId: number;

  selected: () => RouteCandidate | null;

  calculate: (req: RouteRequest, opts?: { signal?: AbortSignal }) => Promise<void>;
  select: (id: string) => void;
  clear: () => void;
};

export const useRoutingStore = create<RoutingState>((set, get) => ({
  loading: false,
  error: null,

  request: null,
  candidates: [],
  selectedId: null,

  activeRequestId: 0,

  selected: () => {
    const { candidates, selectedId } = get();
    return candidates.find((c) => c.id === selectedId) ?? null;
  },

  calculate: async (req, opts) => {
    const requestId = get().activeRequestId + 1;

    set({
      loading: true,
      error: null,
      request: req,
      activeRequestId: requestId,
    });

    try {
      const res = await getSecureRoute(req, { signal: opts?.signal });

      // Si un autre calculate() a démarré après, on ignore ce résultat
      if (get().activeRequestId !== requestId) return;

      set({
        candidates: res.all,
        selectedId: res.best.id,
      });
    } catch (e: unknown) {
      const maybe = e as { name?: string } | null;

      // Abort: pas une “vraie erreur” UI
      if (maybe?.name === "AbortError") return;

      if (get().activeRequestId !== requestId) return;

      set({ error: e instanceof Error ? e.message : "Erreur routing inconnue" });
    } finally {
      if (get().activeRequestId === requestId) {
        set({ loading: false });
      }
    }
  },

  select: (id) => set({ selectedId: id }),
  clear: () => set({ candidates: [], selectedId: null, error: null }),
}));
