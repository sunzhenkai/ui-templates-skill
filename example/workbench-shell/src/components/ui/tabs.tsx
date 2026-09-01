import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cn } from "@/lib/utils"

function Tabs({ value, onValueChange, children, className }: { value?: string; onValueChange?: (v: string) => void; children: React.ReactNode; className?: string }) {
  return (
    <TabsPrimitive.Root value={value} onValueChange={onValueChange} className={className}>
      {children}
    </TabsPrimitive.Root>
  )
}

function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <TabsPrimitive.List className={cn("inline-flex h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground", className)}>
      {children}
    </TabsPrimitive.List>
  )
}

function TabsTrigger({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  return (
    <TabsPrimitive.Tab
      value={value}
      className={cn(
        "inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium outline-none transition-colors data-[selected]:bg-background data-[selected]:text-foreground data-[selected]:shadow-sm disabled:opacity-50",
        className
      )}
    >
      {children}
    </TabsPrimitive.Tab>
  )
}

function TabsContent({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  return (
    <TabsPrimitive.Panel value={value} className={cn("mt-2 outline-none", className)}>
      {children}
    </TabsPrimitive.Panel>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
