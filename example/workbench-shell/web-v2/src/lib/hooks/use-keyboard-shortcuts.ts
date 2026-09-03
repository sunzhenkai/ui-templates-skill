import { useEffect } from 'react'

// Detects whether the current focus is inside a text-editing control so that
// single-letter shortcuts (like "C" for create) don't trigger while typing.
function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  return false
}

interface Shortcut {
  key: string
  /** When provided, Cmd/Ctrl is required. Defaults to false. */
  cmd?: boolean
  shift?: boolean
  /** Disable when focus is on an editable control. Defaults to true. */
  ignoreEditable?: boolean
  description: string
  handler: (e: KeyboardEvent) => void
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target
      const editable = isEditableTarget(target)
      for (const sc of shortcuts) {
        if (sc.ignoreEditable !== false && editable && !sc.cmd) continue
        if (sc.cmd && !(e.metaKey || e.ctrlKey)) continue
        if (!sc.cmd && (e.metaKey || e.ctrlKey)) continue
        if (sc.shift && !e.shiftKey) continue
        if (!sc.shift && e.shiftKey) continue
        if (e.key.toLowerCase() !== sc.key.toLowerCase()) continue
        e.preventDefault()
        sc.handler(e)
        return
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [shortcuts])
}
