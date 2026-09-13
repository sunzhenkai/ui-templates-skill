import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark";

interface UiState {
  theme: ThemeMode;
  sidebarWidth: number;
  pinsCollapsed: boolean;
  columnConfig: Record<string, string[]>;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
  setSidebarWidth: (w: number) => void;
  togglePins: () => void;
  setColumns: (tableKey: string, cols: string[]) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: "light",
      sidebarWidth: 256,
      pinsCollapsed: false,
      columnConfig: {},
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),
      setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
      togglePins: () => set((s) => ({ pinsCollapsed: !s.pinsCollapsed })),
      setColumns: (tableKey, cols) => set((s) => ({ columnConfig: { ...s.columnConfig, [tableKey]: cols } })),
    }),
    {
      name: "workbench-ui",
      onRehydrateStorage: () => (state) => {
        // 主题 class 同步（AX：双主题切换）
        if (state) document.documentElement.classList.toggle("dark", state.theme === "dark");
      },
    },
  ),
);

/** 浮层焦点契约（AX-104）：记录触发器，关闭时还原焦点 */
class OverlayFocus {
  private trigger: HTMLElement | null | undefined = null;
  capture(trigger: HTMLElement | null | undefined) {
    this.trigger = trigger;
  }
  restore() {
    this.trigger?.focus();
    this.trigger = null;
  }
}
export const overlayFocus = new OverlayFocus();

export interface ConfirmRequest {
  title: string;
  body: string;
  confirmLabel?: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}

interface OverlayState {
  searchOpen: boolean;
  createOpen: boolean;
  shortcutsOpen: boolean;
  chatOpen: boolean;
  confirm: ConfirmRequest | null;
  openSearch: (trigger?: HTMLElement | null | undefined) => void;
  closeSearch: () => void;
  openCreate: (trigger?: HTMLElement | null | undefined, presetStatus?: string) => void;
  closeCreate: () => void;
  setShortcutsOpen: (open: boolean) => void;
  setChatOpen: (open: boolean) => void;
  askConfirm: (req: Omit<ConfirmRequest, "resolve">) => Promise<boolean>;
  closeConfirm: (ok: boolean) => void;
}

export const useOverlayStore = create<OverlayState>((set, get) => ({
  searchOpen: false,
  createOpen: false,
  shortcutsOpen: false,
  chatOpen: false,
  confirm: null,
  openSearch: (trigger) => {
    overlayFocus.capture(trigger);
    set({ searchOpen: true });
  },
  closeSearch: () => {
    set({ searchOpen: false });
    overlayFocus.restore();
  },
  openCreate: (trigger) => {
    overlayFocus.capture(trigger);
    set({ createOpen: true });
  },
  closeCreate: () => {
    set({ createOpen: false });
    overlayFocus.restore();
  },
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
  setChatOpen: (open) => set({ chatOpen: open }),
  askConfirm: (req) =>
    new Promise<boolean>((resolve) => {
      set({ confirm: { ...req, resolve } });
    }),
  closeConfirm: (ok) => {
    const c = get().confirm;
    c?.resolve(ok);
    set({ confirm: null });
  },
}));

export function useAppConfirm() {
  return useOverlayStore((s) => s.askConfirm);
}
