import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { Kbd } from "@/components/ui/kbd";
import { useShell } from "./shell-context";

const ITEMS: { keys: string[]; label: string }[] = [
  { keys: ["Ctrl/⌘", "K"], label: "打开全局搜索" },
  { keys: ["C"], label: "创建事件（输入框内不触发）" },
  { keys: ["Shift", "?"], label: "显示快捷键帮助" },
  { keys: ["Esc"], label: "关闭弹层" },
];

/** 快捷键帮助面板（AX-046..050）。 */
export function ShortcutsHelp({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  useShell();
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-foreground/25 data-[starting-style]:animate-in data-[starting-style]:fade-in-0 data-[ending-style]:animate-out data-[ending-style]:fade-out-0" />
        <BaseDialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(24rem,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-surface-border bg-popover p-4 text-popover-foreground shadow-floating outline-none data-[starting-style]:animate-in data-[starting-style]:fade-in-0 data-[ending-style]:animate-out data-[ending-style]:fade-out-0">
          <BaseDialog.Title className="mb-3 text-title font-semibold">键盘快捷键</BaseDialog.Title>
          <ul className="flex flex-col gap-2">
            {ITEMS.map((item) => (
              <li key={item.label} className="flex items-center justify-between gap-4 text-label">
                <span>{item.label}</span>
                <span className="flex shrink-0 items-center gap-1">
                  {item.keys.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
