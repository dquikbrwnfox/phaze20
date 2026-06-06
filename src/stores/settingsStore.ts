import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type FontSize = "base" | "lg" | "xl";

interface SettingsState {
  fontSize: FontSize;
  /** Suppress entrance animations / motion transitions. */
  reduceMotion: boolean;
  /** Suppress ambient background effects (aurora, glow pulses). */
  reduceFx: boolean;

  setFontSize: (v: FontSize) => void;
  setReduceMotion: (v: boolean) => void;
  setReduceFx: (v: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      // Initialise reduceMotion from OS preference on first load.
      fontSize: "base",
      reduceMotion:
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      reduceFx: false,

      setFontSize: (fontSize) => set({ fontSize }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setReduceFx: (reduceFx) => set({ reduceFx }),
    }),
    {
      name: "phase10-settings",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** Apply data-* attributes to `<html>` so CSS can respond. Call once in main.tsx. */
export function applySettingsToDOM(state: Pick<SettingsState, "fontSize" | "reduceMotion" | "reduceFx">) {
  const html = document.documentElement;
  html.dataset.fontSize = state.fontSize;
  html.dataset.reduceMotion = state.reduceMotion ? "true" : "false";
  html.dataset.reduceFx = state.reduceFx ? "true" : "false";
}
