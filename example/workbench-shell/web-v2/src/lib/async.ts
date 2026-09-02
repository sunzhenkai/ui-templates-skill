import { useCallback, useEffect, useRef, useState } from 'react'

export type AsyncState<T> = { data?: T; loading: boolean; error?: Error; reload: () => void; setData: (updater: (current?: T) => T | undefined) => void }

export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error>()
  const [tick, setTick] = useState(0)
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  useEffect(() => {
    let active = true
    setLoading(true); setError(undefined)
    loaderRef.current().then(result => {
      if (!active) return
      setData(result); setLoading(false)
    }).catch(err => {
      if (!active) return
      setError(err instanceof Error ? err : new Error('未知错误')); setLoading(false)
    })
    return () => { active = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const reload = useCallback(() => setTick(value => value + 1), [])
  return { data, loading, error, reload, setData }
}
