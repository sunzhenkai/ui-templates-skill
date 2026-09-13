/**
 * shadcn 风格受控原语（ui 层）：只依赖 lib + token 语义工具类。
 * 风格契约见 01-token-map.yaml design_rules；焦点/浮层契约 AX-104。
 */
import { cva, type VariantProps } from "class-variance-authority";
import {
  createContext, useContext, useEffect, useId, useRef, useState,
  type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode,
  type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "../../lib";
import { overlayFocus } from "../../stores";

/* ---------------- Button / IconButton ---------------- */

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-body font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        outline: "border border-border bg-surface hover:bg-surface-hover",
        brand: "bg-brand text-brand-foreground hover:opacity-90",
        "brand-subtle": "bg-brand-subtle text-brand hover:bg-brand-subtle-hover",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary-hover",
        ghost: "hover:bg-surface-hover text-foreground",
        destructive: "bg-destructive text-popover-foreground hover:opacity-90",
        "destructive-surface": "bg-destructive-surface text-destructive hover:bg-destructive-surface-hover",
        link: "text-brand underline-offset-2 hover:underline",
      },
      size: {
        xs: "h-6 px-2 text-caption",
        sm: "h-7 px-2.5",
        md: "h-8 px-3",
        lg: "h-9 px-4",
        "icon-xs": "size-6",
        "icon-sm": "size-7",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}
export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export function IconButton({
  label, className, variant = "ghost", size = "icon-sm", ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string } & VariantProps<typeof buttonVariants>) {
  return (
    <button aria-label={label} title={label} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}

/* ---------------- Input / Textarea / Select ---------------- */

const fieldClass =
  "h-8 w-full rounded-md border border-input bg-surface px-2.5 text-body text-foreground placeholder:text-faint-foreground hover:border-ring disabled:opacity-50";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClass, "aria-invalid:border-destructive", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(fieldClass, "h-auto min-h-20 py-2 leading-relaxed", "aria-invalid:border-destructive", className)}
      {...props}
    />
  );
}

export function NativeSelect({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(fieldClass, "appearance-none pr-7", className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

/* ---------------- Badge ---------------- */

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-micro font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground",
        success: "bg-muted text-success",
        warning: "bg-muted text-warning",
        critical: "bg-muted text-destructive",
        info: "bg-muted text-info",
        brand: "bg-brand-subtle text-brand",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);
export interface BadgeProps extends VariantProps<typeof badgeVariants> {
  children?: ReactNode;
  className?: string;
  count?: number;
}
export function Badge({ variant, className, children, count }: BadgeProps) {
  if (count != null && count === 0) return null; // 未读计数为零不显示（LOCAL-INFORMATION-001）
  return (
    <span className={cn(badgeVariants({ variant }), className)} aria-label={count != null ? `${count} 条` : undefined}>
      {children}
      {count != null && <span className="tabular-nums">{count}</span>}
    </span>
  );
}

/* ---------------- Checkbox / Switch ---------------- */

export function Checkbox({
  checked, indeterminate, onCheckedChange, label, disabled,
}: {
  checked: boolean | "indeterminate";
  indeterminate?: boolean;
  onCheckedChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  const state = indeterminate || checked === "indeterminate" ? "indeterminate" : checked ? "checked" : "unchecked";
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50">
      <input
        type="checkbox"
        role="checkbox"
        aria-checked={state === "indeterminate" ? "mixed" : checked === true}
        aria-label={label}
        disabled={disabled}
        checked={checked === true}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className="size-3.5 accent-[var(--color-primary)] disabled:opacity-50"
      />
      <span className="sr-only">{label}</span>
    </label>
  );
}

export function Switch({
  checked, onCheckedChange, label, disabled,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "inline-flex h-4.5 w-8 items-center rounded-full border px-0.5 transition-colors disabled:opacity-50",
        checked ? "justify-end border-primary bg-primary" : "justify-start border-surface-border bg-muted",
      )}
    >
      <span className={cn("size-3 rounded-full", checked ? "bg-primary-foreground" : "bg-muted-foreground")} />
      <span className="sr-only">{checked ? "已开启" : "已关闭"}</span>
    </button>
  );
}

/* ---------------- Avatar / Skeleton ---------------- */

export function Avatar({ name, size = "sm" }: { name: string; size?: "xs" | "sm" | "md" | "lg" }) {
  const dims = { xs: "size-5 text-micro", sm: "size-6 text-micro", md: "size-7 text-caption", lg: "size-9 text-body" }[size];
  const text = name.split(/\s+/).map((p) => p.charAt(0)).slice(0, 2).join("").toUpperCase();
  return (
    <span title={name} className={cn("inline-flex items-center justify-center rounded-full bg-muted font-medium text-muted-foreground", dims)}>
      {text}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-skeleton rounded-md bg-muted", className)} />;
}

export function SkeletonTable({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-busy="true" className="space-y-2 p-4">
      <span className="sr-only">加载中</span>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

/* ---------------- Tooltip（focus 可触发，Esc 关闭） ---------------- */

export function Tooltip({ content, children }: { content: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <span
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
    >
      {children}
      {open && (
        <span role="tooltip" className="absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-sm bg-foreground px-2 py-1 text-micro text-app-shell shadow-menu">
          {content}
        </span>
      )}
    </span>
  );
}

/* ---------------- Menu（dropdown，AX-104 焦点契约） ---------------- */

export interface MenuItemDef {
  key: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  onSelect: () => void;
}
export function Menu({
  trigger, items, align = "end",
}: {
  trigger: (props: { ref: React.Ref<HTMLButtonElement>; onClick: () => void; "aria-expanded": boolean; "aria-haspopup": boolean }) => ReactNode;
  items: MenuItemDef[];
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        overlayFocus.restore();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div className="relative inline-flex" ref={rootRef}>
      {trigger({
        ref: triggerRef,
        onClick: () => {
          overlayFocus.capture(triggerRef.current);
          setOpen((v) => !v);
        },
        "aria-expanded": open,
        "aria-haspopup": true,
      })}
      {open && (
        <div
          role="menu"
          className={cn(
            "animate-overlay-in absolute top-full z-40 mt-1 min-w-40 rounded-md border border-surface-border bg-popover p-1 text-body text-popover-foreground shadow-menu",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {items.map((item) => (
            <button
              key={item.key}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-surface-hover",
                item.danger && "text-destructive",
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Dialog / SidePanel（视口定层 + 焦点陷阱） ---------------- */

export function Dialog({
  open, onClose, title, children, footer, variant = "center", widthClass = "max-w-xl",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  variant?: "center" | "panel";
  widthClass?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    node?.querySelector<HTMLElement>("[data-autofocus],input,select,textarea,button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && node) {
        const focusables = node.querySelectorAll<HTMLElement>("button,input,select,textarea,a[href]");
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus(); // AX-104：焦点回触发器
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50" role="presentation">
      <div className="absolute inset-0 bg-foreground/30" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "animate-overlay-in flex flex-col rounded-lg border border-surface-border bg-popover text-popover-foreground shadow-floating",
          variant === "center"
            ? `absolute left-1/2 top-1/2 w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 ${widthClass}`
            : "absolute inset-y-0 right-0 w-full max-w-[480px] max-sm:max-w-full",
        )}
      >
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-surface-border px-4">
          <h2 className="text-title-sm font-semibold">{title}</h2>
          <IconButton label="关闭" onClick={onClose}><X className="size-4" /></IconButton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        {footer && <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-surface-border px-4 py-3">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

/* ---------------- Tabs ---------------- */

export function Tabs({
  tabs, value, onChange, variant = "underline",
}: {
  tabs: { key: string; label: string }[];
  value: string;
  onChange: (k: string) => void;
  variant?: "underline" | "boxed";
}) {
  return (
    <div role="tablist" className={cn("flex items-center gap-1", variant === "boxed" && "rounded-md border border-surface-border bg-surface p-0.5")}>
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={cn(
              "rounded-sm px-3 py-1.5 text-label font-medium transition-colors",
              variant === "underline"
                ? active
                  ? "border-b-2 border-primary text-foreground"
                  : "border-b-2 border-transparent text-muted-foreground hover:text-foreground"
                : active
                  ? "bg-secondary text-secondary-foreground shadow-surface"
                  : "text-muted-foreground hover:bg-surface-hover",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- SegmentedControl ---------------- */

export function SegmentedControl({
  options, value, onChange, ariaLabel,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (k: string) => void;
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex items-center rounded-md border border-surface-border bg-surface p-0.5">
      {options.map((o) => (
        <button
          key={o.key}
          role="radio"
          aria-checked={o.key === value}
          onClick={() => onChange(o.key)}
          className={cn(
            "rounded-sm px-2.5 py-1 text-label font-medium",
            o.key === value ? "bg-secondary text-secondary-foreground shadow-surface" : "text-muted-foreground hover:bg-surface-hover",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Pagination ---------------- */

export function Pagination({
  page, pageSize, total, onPage, onPageSize,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
  onPageSize: (n: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav aria-label="分页" className="flex items-center justify-between gap-3 px-1 py-2 text-caption text-muted-foreground">
      <span className="tabular-nums">第 {page} 页 / 共 {pages} 页 · {total} 条</span>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1">
          每页
          <select
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
            className="h-7 rounded-sm border border-surface-border bg-surface px-1"
            aria-label="每页条数"
          >
            {[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>上一页</Button>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>下一页</Button>
      </div>
    </nav>
  );
}

/* ---------------- EmptyState / ErrorState ---------------- */

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <div aria-hidden className="flex size-10 items-center justify-center rounded-full bg-muted text-faint-foreground">∅</div>
      <p className="text-body font-medium">{title}</p>
      {hint && <p className="max-w-sm text-caption text-muted-foreground">{hint}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <p className="text-body font-medium text-destructive">加载失败</p>
      <p className="max-w-md text-caption text-muted-foreground">{message}</p>
      {onRetry && <Button variant="outline" size="sm" onClick={onRetry}>重试</Button>}
    </div>
  );
}

/* ---------------- 表单字段（label 关联 + 错误描述） ---------------- */

export function Field({
  label, error, required, children,
}: {
  label: string;
  error?: string | null;
  required?: boolean;
  children: (props: { id: string; "aria-invalid": boolean; "aria-describedby": string | undefined }) => ReactNode;
}) {
  const id = useId();
  const errId = `${id}-err`;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-label font-medium">
        {label}
        {required && <span aria-hidden className="ml-0.5 text-destructive">*</span>}
      </label>
      {children({ id, "aria-invalid": !!error, "aria-describedby": error ? errId : undefined })}
      {error && <p id={errId} role="alert" className="text-caption text-destructive">{error}</p>}
    </div>
  );
}

/* ---------------- Combobox（多选） ---------------- */

export function Combobox({
  options, selected, onChange, placeholder,
}: {
  options: { key: string; label: string }[];
  selected: string[];
  onChange: (keys: string[]) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const matched = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(fieldClass, "flex items-center justify-between text-left")}
      >
        <span className={cn("truncate", selected.length === 0 && "text-faint-foreground")}>
          {selected.length === 0
            ? placeholder ?? "请选择"
            : options.filter((o) => selected.includes(o.key)).map((o) => o.label).join("、")}
        </span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-md border border-surface-border bg-popover p-1 shadow-menu" role="listbox" aria-multiselectable>
          <input
            data-autofocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索…"
            className="mb-1 h-7 w-full rounded-sm border border-input bg-surface px-2 text-caption"
            aria-label="搜索选项"
          />
          {matched.length === 0 && <p className="px-2 py-1.5 text-caption text-muted-foreground">无匹配项</p>}
          {matched.map((o) => {
            const checked = selected.includes(o.key);
            return (
              <button
                key={o.key}
                type="button"
                role="option"
                aria-selected={checked}
                onClick={() => onChange(checked ? selected.filter((k) => k !== o.key) : [...selected, o.key])}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-body hover:bg-surface-hover"
              >
                <span className={cn("flex size-3.5 items-center justify-center rounded-sm border", checked ? "border-primary bg-primary text-primary-foreground" : "border-input")}>
                  {checked && <Check className="size-3" />}
                </span>
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------- OverlayHost（确认对话框宿主） ---------------- */

export function ConfirmHost({
  confirm, onClose,
}: {
  confirm: { title: string; body: string; confirmLabel?: string; danger?: boolean } | null;
  onClose: (ok: boolean) => void;
}) {
  return (
    <Dialog
      open={!!confirm}
      onClose={() => onClose(false)}
      title={confirm?.title ?? ""}
      widthClass="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={() => onClose(false)}>取消</Button>
          <Button
            data-autofocus
            variant={confirm?.danger ? "destructive" : "primary"}
            onClick={() => onClose(true)}
          >
            {confirm?.confirmLabel ?? "确认"}
          </Button>
        </>
      }
    >
      <p className="text-body text-muted-foreground">{confirm?.body}</p>
    </Dialog>
  );
}

/* ---------------- 语义上下文（badge severity 映射） ---------------- */

export const severityVariant: Record<string, "critical" | "warning" | "info" | "neutral"> = {
  sev1: "critical",
  sev2: "warning",
  sev3: "info",
  sev4: "neutral",
  none: "neutral",
};
export const severityLabel: Record<string, string> = {
  sev1: "P1 严重", sev2: "P2 高", sev3: "P3 中", sev4: "P4 低", none: "—",
};
export const healthVariant: Record<string, "success" | "warning" | "critical" | "neutral"> = {
  healthy: "success", degraded: "warning", down: "critical", disabled: "neutral",
};
export const healthLabel: Record<string, string> = {
  healthy: "健康", degraded: "降级", down: "故障", disabled: "已停用",
};
export const statusLabel: Record<string, string> = {
  triage: "待确认", processing: "处理中", waiting: "等待外部", resolved: "已解决", archived: "已归档",
};
export const statusVariant: Record<string, "warning" | "info" | "neutral" | "success"> = {
  triage: "warning", processing: "info", waiting: "neutral", resolved: "success", archived: "neutral",
};

export const MemberContext = createContext<{ members: { id: string; name: string }[] }>({ members: [] });
export const useMembers = () => useContext(MemberContext);
