import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

// 2px brand 进度条：URL 改变时出现，~200ms 后淡出。
export function NavigationProgress() {
  const location = useLocation()
  const [active, setActive] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setActive(true)
    setVisible(true)
    const t1 = window.setTimeout(() => setActive(false), 220)
    const t2 = window.setTimeout(() => setVisible(false), 320)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [location.pathname, location.search])

  if (!visible) return null
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 z-40 h-0.5 bg-transparent"
    >
      <div
        className="h-full bg-brand transition-[width,opacity] duration-200 ease-out"
        style={{
          width: active ? '70%' : '100%',
          opacity: active ? 1 : 0,
        }}
      />
    </div>
  )
}
