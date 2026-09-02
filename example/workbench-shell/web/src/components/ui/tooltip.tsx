import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
}

function Tooltip({ content, children, side = "top" }: TooltipProps) {
  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger className="inline-flex items-center justify-center">
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Positioner side={side} sideOffset={6}>
            <TooltipPrimitive.Popup className="z-50 max-w-xs rounded-md border bg-popover px-2 py-1 text-caption text-popover-foreground shadow-float">
              {content}
            </TooltipPrimitive.Popup>
          </TooltipPrimitive.Positioner>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}

export { Tooltip }
