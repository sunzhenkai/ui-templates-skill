import { useAsync } from './async'

export function useSimulatedLoad(failKey?: string, delay = 260, deps: unknown[] = []) {
  return useAsync(async () => {
    await new Promise(resolve => setTimeout(resolve, delay))
    if (failKey && localStorage.getItem('demo-fail')?.includes(failKey)) throw new Error('数据加载失败')
    return true
  }, deps)
}
