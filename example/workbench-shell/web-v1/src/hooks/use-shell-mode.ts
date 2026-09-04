import { useSyncExternalStore } from "react"

export type ShellMode = "expanded" | "collapsed" | "overlay" | "narrow"

const EXPANDED = 1280
const COLLAPSED = 1024
const NARROW = 768

function modeFromWidth(width: number): ShellMode {
  if (width >= EXPANDED) return "expanded"
  if (width >= COLLAPSED) return "collapsed"
  if (width >= NARROW) return "overlay"
  return "narrow"
}

let current = modeFromWidth(typeof window === "undefined" ? EXPANDED : window.innerWidth)
const listeners = new Set<() => void>()

function onResize() {
  const next = modeFromWidth(window.innerWidth)
  if (next !== current) {
    current = next
    listeners.forEach((listener) => listener())
  }
}

function subscribe(listener: () => void) {
  if (listeners.size === 0 && typeof window !== "undefined") {
    window.addEventListener("resize", onResize)
  }
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("resize", onResize)
    }
  }
}

export function useShellMode() {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => "expanded" as ShellMode,
  )
}

export function isOverlayMode(mode: ShellMode) {
  return mode === "overlay" || mode === "narrow"
}
