import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  minimal = false,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  minimal?: boolean;
  className?: string;
}) {
  if (minimal) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground", className)}>
        {icon && <div className="text-faint-foreground [&_svg]:size-10" aria-hidden>{icon}</div>}
        <p className="text-body">{title}</p>
        {action && <div>{action}</div>}
      </div>
    );
  }
  return (
    <div className={cn("flex min-h-40 flex-col items-center justify-center gap-2 p-6 text-center", className)}>
      {icon && (
        <div className="flex size-10 items-center justify-center rounded-full bg-muted text-faint-foreground [&_svg]:size-5" aria-hidden>
          {icon}
        </div>
      )}
      <p className="text-body font-medium">{title}</p>
      {description && <p className="max-w-sm text-caption text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
