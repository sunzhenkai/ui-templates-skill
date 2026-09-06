import { useState } from "react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * FloatingChat（AX-061..064）：FAB 几何来自 layout.chat-fab-*；
 * 打开后隐藏 FAB（对话框自带关闭）；净空由 Toaster 等遵守（LAYOUT-008/NN-011）。
 */
export function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ from: "me" | "bot"; text: string }[]>([
    { from: "bot", text: "你好，这里是值班助手。有什么可以帮你？" },
  ]);
  const [draft, setDraft] = useState("");

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((m) => [...m, { from: "me", text }]);
    setDraft("");
    setTimeout(() => {
      setMessages((m) => [...m, { from: "bot", text: "收到，我会把该信息同步给当前值班经理。" }]);
    }, 600);
  };

  return (
    <BaseDialog.Root open={open} onOpenChange={setOpen}>
      {!open && (
        <BaseDialog.Trigger
          render={(props: React.ComponentProps<"button">) => (
            <button
              {...props}
              aria-label="打开值班助手聊天"
              style={{
                width: "var(--layout-chat-fab-size)",
                height: "var(--layout-chat-fab-size)",
              }}
              className={cn(
                "fixed right-3 bottom-3 z-40 flex items-center justify-center rounded-full border border-surface-border bg-popover text-foreground shadow-menu outline-none hover:bg-accent",
                "focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-ring/60",
              )}
            >
              <MessageCircle className="size-4.5" aria-hidden />
            </button>
          )}
        />
      )}
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-40 bg-foreground/25 data-[starting-style]:animate-in data-[starting-style]:fade-in-0 data-[ending-style]:animate-out data-[ending-style]:fade-out-0" />
        <BaseDialog.Popup
          aria-label="值班助手"
          className="fixed right-3 bottom-3 z-50 flex h-96 w-[min(22rem,92vw)] flex-col overflow-hidden rounded-lg border border-surface-border bg-popover text-popover-foreground shadow-floating outline-none data-[starting-style]:animate-in data-[starting-style]:fade-in-0 data-[ending-style]:animate-out data-[ending-style]:fade-out-0"
        >
          <div className="flex items-center justify-between border-b px-3 py-2">
            <BaseDialog.Title className="text-label font-semibold">值班助手</BaseDialog.Title>
            <BaseDialog.Close
              aria-label="关闭聊天"
              className="rounded-md p-1 text-faint-foreground hover:bg-accent hover:text-foreground focus-visible:outline-3 focus-visible:outline-ring/60"
            >
              <X className="size-4" aria-hidden />
            </BaseDialog.Close>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3" role="log" aria-label="聊天记录">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] rounded-md px-2.5 py-1.5 text-caption",
                  m.from === "me" ? "self-end bg-primary text-primary-foreground" : "self-start bg-muted text-foreground",
                )}
              >
                {m.text}
              </div>
            ))}
          </div>
          <form
            className="flex items-center gap-1.5 border-t p-2"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="输入消息…"
              aria-label="聊天输入"
              className="h-7"
            />
            <Button type="submit" size="icon-sm" aria-label="发送">
              <Send className="size-3.5" aria-hidden />
            </Button>
          </form>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
