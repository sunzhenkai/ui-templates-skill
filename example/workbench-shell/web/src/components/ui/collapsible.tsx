import { createContext, useContext, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const CollapsibleContext = createContext<{ open: boolean; toggle: () => void }>({
  open: true,
  toggle: () => {},
});

export function Collapsible({ defaultOpen = true, children }: { defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <CollapsibleContext.Provider value={{ open, toggle: () => setOpen((v) => !v) }}>
      <div>{children}</div>
    </CollapsibleContext.Provider>
  );
}

export function CollapsibleTrigger({ className, children }: { className?: string; children: React.ReactNode }) {
  const { open, toggle } = useContext(CollapsibleContext);
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={toggle}
      className={cn(
        "flex w-full items-center gap-1 rounded-md px-2 py-1 text-left outline-none hover:bg-accent focus-visible:outline-3 focus-visible:outline-ring/60",
        className,
      )}
    >
      <ChevronRight className={cn("size-3.5 text-faint-foreground transition-transform", open && "rotate-90")} aria-hidden />
      {children}
    </button>
  );
}

export function CollapsibleContent({ className, children }: { className?: string; children: React.ReactNode }) {
  const { open } = useContext(CollapsibleContext);
  if (!open) return null;
  return <div className={className}>{children}</div>;
}
