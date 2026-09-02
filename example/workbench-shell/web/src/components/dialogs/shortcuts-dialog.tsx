import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAppStore } from "@/stores/app-store"

function ShortcutsDialog() {
  const store = useAppStore()
  const open = store.dialog === "shortcuts"

  const shortcuts = [
    { keys: "⌘ K / Ctrl K", action: "打开全局搜索" },
    { keys: "C", action: "创建事件" },
    { keys: "Esc", action: "关闭弹层" },
    { keys: "↑ / ↓", action: "搜索面板选择结果" },
    { keys: "Enter", action: "打开选中的搜索结果" },
  ]

  return (
    <Dialog open={open} onOpenChange={(v) => !v && store.setDialog(null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>快捷键帮助</DialogTitle>
          <DialogDescription>全局可用的键盘快捷键</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          {shortcuts.map((s) => (
            <div key={s.action} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted">
              <span className="text-body text-foreground">{s.action}</span>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-micro font-mono">{s.keys}</kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { ShortcutsDialog }
