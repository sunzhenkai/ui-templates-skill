import { Menu as BaseMenu } from "@base-ui/react/menu";
import { cn } from "@/lib/utils";

export const DropdownMenu = BaseMenu.Root;
export const DropdownMenuTrigger = BaseMenu.Trigger;

export function DropdownMenuContent({ className, align = "start", ...props }: React.ComponentProps<typeof BaseMenu.Popup> & { align?: "start" | "center" | "end" }) {
  return (
    <BaseMenu.Portal>
      <BaseMenu.Positioner sideOffset={4} align={align} className="z-50 outline-none">
        <BaseMenu.Popup
          className={cn(
            "min-w-40 rounded-md border border-surface-border bg-popover p-1 text-popover-foreground shadow-menu outline-none",
            "data-[starting-style]:animate-in data-[starting-style]:fade-in-0 data-[starting-style]:zoom-in-95",
            "data-[ending-style]:animate-out data-[ending-style]:fade-out-0",
            className,
          )}
          {...props}
        />
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
}

export function DropdownMenuItem({ className, ...props }: React.ComponentProps<typeof BaseMenu.Item>) {
  return (
    <BaseMenu.Item
      className={cn(
        "flex min-h-7 cursor-default select-none items-center gap-2 rounded-xs px-2 py-1 text-label outline-none",
        "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "[&_svg]:size-3.5 [&_svg]:text-faint-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuCheckboxItem({ className, children, ...props }: React.ComponentProps<typeof BaseMenu.CheckboxItem>) {
  return (
    <BaseMenu.CheckboxItem
      className={cn(
        "flex min-h-7 cursor-default select-none items-center gap-2 rounded-xs px-2 py-1 text-label outline-none",
        "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="w-3.5" aria-hidden />
      {children}
    </BaseMenu.CheckboxItem>
  );
}

export function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof BaseMenu.Separator>) {
  return <BaseMenu.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}

export function DropdownMenuLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-2 py-1 text-micro font-medium text-faint-foreground", className)} {...props} />;
}
