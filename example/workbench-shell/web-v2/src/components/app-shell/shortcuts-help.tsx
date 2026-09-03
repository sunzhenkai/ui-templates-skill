import { useAppStore } from '@/lib/stores/app-store'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['⌘', 'K'], label: '打开全局搜索面板' },
  { keys: ['C'], label: '打开创建事件弹窗' },
  { keys: ['?'], label: '打开快捷键帮助' },
  { keys: ['G', 'I'], label: '跳转到收件箱' },
  { keys: ['G', 'E'], label: '跳转到事件列表' },
  { keys: ['G', 'B'], label: '跳转到事件看板' },
  { keys: ['G', 'S'], label: '跳转到服务目录' },
  { keys: ['G', 'O'], label: '跳转到值班日历' },
  { keys: ['G', 'A'], label: '跳转到交付分析' },
  { keys: ['G', ','], label: '跳转到设置' },
  { keys: ['Esc'], label: '关闭当前弹层或面板' },
]

export function ShortcutsHelp() {
  const open = useAppStore((s) => s.helpOpen)
  const setOpen = useAppStore((s) => s.setHelpOpen)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>键盘快捷键</DialogTitle>
          <DialogDescription>输入框聚焦时字母键自动失效；⌘ / Ctrl 在 macOS 与 Windows / Linux 下都生效。</DialogDescription>
        </DialogHeader>
        <ul className="divide-y divide-border">
          {SHORTCUTS.map((s, i) => (
            <li key={i} className="flex items-center justify-between py-2">
              <span className="text-body">{s.label}</span>
              <span className="flex items-center gap-1">
                {s.keys.map((k, idx) => (
                  <kbd
                    key={idx}
                    className="inline-flex h-6 min-w-[24px] items-center justify-center rounded border border-border bg-surface px-1.5 text-micro font-medium text-muted-foreground"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
