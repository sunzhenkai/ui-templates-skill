import { Dialog } from '@/components/ui/overlay'

const shortcuts = [
  ['全局搜索', '⌘K / Ctrl+K'],
  ['创建事件', 'C'],
  ['关闭弹层', 'Esc'],
  ['结果上下选择', '↑ / ↓'],
  ['打开帮助', '?'],
]

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="键盘快捷键" size="sm">
      <dl className="grid gap-2">
        {shortcuts.map(([label, keys]) => (
          <div key={label} className="flex items-center justify-between rounded-control border border-border px-3 py-2">
            <dt className="font-body">{label}</dt>
            <dd className="numeric font-micro text-muted-foreground">{keys}</dd>
          </div>
        ))}
      </dl>
    </Dialog>
  )
}
