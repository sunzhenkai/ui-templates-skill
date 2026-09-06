import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { cn } from "@/lib/utils";

export const Tabs = BaseTabs.Root;
export const TabsPanel = BaseTabs.Panel;

export function TabsList({ className, ...props }: React.ComponentProps<typeof BaseTabs.List>) {
  return (
    <BaseTabs.List
      className={cn("flex items-center gap-1 rounded-md bg-muted p-1 text-muted-foreground", className)}
      {...props}
    />
  );
}

export function TabsListVertical({ className, ...props }: React.ComponentProps<typeof BaseTabs.List>) {
  return (
    <BaseTabs.List
      className={cn("flex flex-col items-stretch gap-0.5 text-muted-foreground", className)}
      {...props}
    />
  );
}

export function Tab({ className, ...props }: React.ComponentProps<typeof BaseTabs.Tab>) {
  return (
    <BaseTabs.Tab
      className={cn(
        "inline-flex min-h-7 flex-1 items-center justify-center gap-1.5 rounded-xs px-2.5 text-label font-medium outline-none transition-colors",
        "hover:text-foreground",
        "data-[selected]:bg-surface data-[selected]:text-foreground data-[selected]:shadow-surface",
        "focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-ring/60",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function TabVertical({ className, ...props }: React.ComponentProps<typeof BaseTabs.Tab>) {
  return (
    <BaseTabs.Tab
      className={cn(
        "flex min-h-8 items-center gap-2 rounded-md px-2.5 text-label font-medium outline-none transition-colors",
        "hover:bg-accent hover:text-foreground",
        "data-[selected]:bg-accent data-[selected]:text-foreground",
        "focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-ring/60",
        className,
      )}
      {...props}
    />
  );
}

export function TabPanel({ className, ...props }: React.ComponentProps<typeof BaseTabs.Panel>) {
  return (
    <BaseTabs.Panel className={cn("outline-none focus-visible:outline-3 focus-visible:outline-ring/60", className)} {...props} />
  );
}
