// src/services/navigation/persistence.ts
import type { LatLng } from "../../types/routing";

export type PersistedNavSession = {
  version: 1;
  savedAt: number; // Date.now()
  destination: { label: string; center: LatLng };
};

const NAV_SESSION_KEY = "softride_nav_session_v1";

export function saveNavSession(session: PersistedNavSession | null): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;

    if (!session) {
      window.localStorage.removeItem(NAV_SESSION_KEY);
      return;
    }

    const payload = JSON.stringify(session);
    window.localStorage.setItem(NAV_SESSION_KEY, payload);
  } catch {
    // noop (mode privé, quotas, etc.)
  }
}

export function loadNavSession(): PersistedNavSession | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;

    const raw = window.localStorage.getItem(NAV_SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedNavSession;

    if (parsed.version !== 1) return null;

    const MAX_AGE_MS = 45 * 60 * 1000; // 45 min
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) return null;

    return parsed;
  } catch {
    return null;
  }
}
