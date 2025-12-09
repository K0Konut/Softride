import { create } from "zustand";
import type { LocationFix, PermissionState } from "../services/permissions/location";

type LocationState = {
  permission: PermissionState;
  fix: LocationFix | null;

  setPermission: (p: PermissionState) => void;
  setFix: (f: LocationFix | null) => void;
};

export const useLocationStore = create<LocationState>((set) => ({
  permission: "unknown",
  fix: null,

  setPermission: (permission) => set({ permission }),
  setFix: (fix) => set({ fix }),
}));
