import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-md border p-3 text-body",
  {
    variants: {
      variant: {
        info: "border-info/30 bg-info/10 [&_svg]:text-info",
        success: "border-success/30 bg-success/10 [&_svg]:text-success",
        warning: "border-warning/40 bg-warning/15 [&_svg]:text-warning",
        destructive: "border-destructive/30 bg-destructive/10 [&_svg]:text-destructive",
      },
    },
    defaultVariants: { variant: "info" },
  },
);

const ICONS = { info: Info, success: CheckCircle2, warning: AlertTriangle, destructive: OctagonAlert } as const;

export function Alert({
  title,
  children,
  action,
  variant = "info",
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { title: string; action?: React.ReactNode } & VariantProps<typeof alertVariants>) {
  const Icon = ICONS[variant ?? "info"];
  return (
    <div role={variant === "destructive" ? "alert" : "status"} className={cn(alertVariants({ variant }), className)} {...props}>
      <Icon className="size-4 translate-y-0.5" aria-hidden />
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        {children && <div className="text-muted-foreground">{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
