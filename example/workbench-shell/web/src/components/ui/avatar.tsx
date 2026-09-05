import { cn } from "@/lib/utils";

const SIZES = { xs: "size-5 text-micro", sm: "size-6 text-micro", default: "size-7 text-caption", lg: "size-9 text-body" } as const;

export function Avatar({
  name,
  size = "default",
  className,
}: {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const initials = name.slice(0, 1);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground",
        SIZES[size],
        className,
      )}
      title={name}
    >
      <span aria-hidden>{initials}</span>
      <span className="sr-only">{name}</span>
    </span>
  );
}

export function AvatarStack({ names, max = 3 }: { names: string[]; max?: number }) {
  const shown = names.slice(0, max);
  return (
    <div className="flex -space-x-1.5">
      {shown.map((n) => (
        <Avatar key={n} name={n} size="sm" className="ring-2 ring-surface" />
      ))}
      {names.length > max && (
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-secondary text-micro ring-2 ring-surface">
          +{names.length - max}
        </span>
      )}
    </div>
  );
}
