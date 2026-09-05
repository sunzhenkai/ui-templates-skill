import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark";

interface PrefsState {
  theme: ThemeMode;
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  toggleTheme: () => void;
  setSidebarWidth: (width: number) => void;
  toggleSidebarCollapsed: () => void;
}

const MIN = 200; // layout.sidebar-min-width
const MAX = 360; // layout.sidebar-max-width

function applyTheme(theme: ThemeMode) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set, get) => ({
      theme: "light",
      sidebarWidth: 256, // layout.sidebar-default-width
      sidebarCollapsed: false,
      toggleTheme: () => {
        const next = get().theme === "light" ? "dark" : "light";
        applyTheme(next);
        set({ theme: next });
      },
      setSidebarWidth: (width) => set({ sidebarWidth: Math.min(MAX, Math.max(MIN, width)) }),
      toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    {
      name: "opshub-prefs",
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    },
  ),
);
