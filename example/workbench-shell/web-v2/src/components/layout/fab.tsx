import { useState } from 'react'
import { Button } from '@/components/ui/primitives'
import { setDemoFailure } from '@/mocks/api'
import { useApp } from '@/app/app-context'

export function AssistantFab() {
  const { theme, setTheme } = useApp()
  const [open, setOpen] = useState(false)
  const [fail, setFail] = useState(false)
  return (
    <>
      {open && (
        <section aria-label="AI 助手" className="absolute bottom-20 right-5 z-30 w-80 rounded-card border border-border bg-surface p-3 shadow-[var(--shadow-overlay)]">
          <h2 className="font-title-sm">运维助手</h2>
          <p className="mt-1 font-caption text-muted-foreground">可快速检查界面状态或注入演示失败。真实助手接口未接入。</p>
          <ul className="mt-3 grid gap-2 font-body text-muted-foreground">
            <li>· 使用 ⌘K / Ctrl+K 打开全局搜索。</li>
            <li>· 使用 C 创建事件；输入框内快捷键不会触发。</li>
            <li>· 使用 ? 查看快捷键。</li>
          </ul>
          <label className="flex items-center justify-between gap-2 rounded-control border border-border p-2 font-label">
            暗色主题
            <input type="checkbox" checked={theme === 'dark'} onChange={event => setTheme(event.target.checked ? 'dark' : 'light')} />
          </label>
          <label className="mt-3 flex items-center justify-between gap-2 rounded-control border border-border p-2 font-label">
            模拟网络失败
            <input type="checkbox" checked={fail} onChange={event => {
              setFail(event.target.checked)
              setDemoFailure('workspace:apollo', event.target.checked)
              setDemoFailure('workspace:nova', event.target.checked)
            }} />
          </label>
        </section>
      )}
      <Button variant="primary" aria-label={open ? '关闭 AI 助手' : '打开 AI 助手'} aria-expanded={open} onClick={() => setOpen(value => !value)} className="absolute bottom-5 right-5 z-30 size-12 rounded-full border-0 text-xl">✨</Button>
    </>
  )
}
