import { create } from "zustand";

type AppState = {
  isReady: boolean;
  setReady: (v: boolean) => void;
};

export const useAppStore = create<AppState>((set) => ({
  isReady: true,
  setReady: (v) => set({ isReady: v }),
}));
