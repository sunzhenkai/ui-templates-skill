import { useCallback, useEffect, useState } from 'react'

export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch { return fallback }
}

export function usePersistentState<T>(key: string, fallback: T) {
  const [value, setValue] = useState(() => readStorage(key, fallback))
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore */ }
  }, [key, value])
  const reset = useCallback(() => setValue(fallback), [fallback])
  return [value, setValue, reset] as const
}
