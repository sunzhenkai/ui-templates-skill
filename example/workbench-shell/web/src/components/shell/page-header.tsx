import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useShell } from "./shell-context";
import { cn } from "@/lib/utils";

/**
 * PageHeader（AX-013..016）：高度 = layout.page-header-height，gutter = layout.page-gutter。
 * 标题可截断；动作区推开右侧、不因数量改变几何（NN-004）；overlay 模式提供导航触发器。
 */
export function PageHeader({
  title,
  icon,
  actions,
  className,
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  const { mode, openNav } = useShell();
  return (
    <header
      className={cn(
        "flex h-[var(--layout-page-header-height)] shrink-0 items-center gap-2 border-b border-border px-[var(--layout-page-gutter)]",
        className,
      )}
    >
      {mode === "overlay" && (
        <Button variant="ghost" size="icon" aria-label="打开导航" onClick={openNav}>
          <Menu className="size-4" aria-hidden />
        </Button>
      )}
      {icon && <span className="text-faint-foreground [&_svg]:size-4">{icon}</span>}
      <h1 className="min-w-0 truncate text-body font-medium">{title}</h1>
      {actions && <div className="ml-auto flex shrink-0 items-center gap-1.5">{actions}</div>}
    </header>
  );
}

export function Toolbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      role="toolbar"
      aria-orientation="horizontal"
      className={cn(
        "flex h-[var(--layout-toolbar-height)] shrink-0 items-center gap-2 border-b border-border px-[var(--layout-page-gutter)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
