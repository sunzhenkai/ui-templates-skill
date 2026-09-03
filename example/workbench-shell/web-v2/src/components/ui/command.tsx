import * as React from 'react'
import { Command as CommandPrimitive } from 'cmdk'
import { Search } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

// 命令面板：基于 cmdk；按 search palette 模式包装。
export const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      'flex h-full w-full flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground',
      className,
    )}
    {...props}
  />
))
Command.displayName = 'Command'

export function CommandDialog({
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>) {
  return (
    <DialogPrimitive.Root {...props}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-[18%] z-50 w-full max-w-[560px] -translate-x-1/2',
            'rounded-xl border border-border bg-popover text-popover-foreground shadow-floating',
          )}
          onOpenAutoFocus={(e) => {
            e.preventDefault()
          }}
        >
          <Command className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-micro [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground">
            {children}
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className="flex items-center gap-2 border-b border-border px-3" cmdk-input-wrapper="">
    <Search className="size-4 text-muted-foreground" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        'flex h-12 w-full rounded-md bg-transparent py-3 text-body outline-none',
        'placeholder:text-muted-foreground',
        className,
      )}
      {...props}
    />
  </div>
))
CommandInput.displayName = 'CommandInput'

export const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn('max-h-[360px] overflow-y-auto overflow-x-hidden p-1', className)}
    {...props}
  />
))
CommandList.displayName = 'CommandList'

export const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="py-8 text-center text-caption text-muted-foreground"
    {...props}
  />
))
CommandEmpty.displayName = 'CommandEmpty'

export const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn('overflow-hidden p-0', className)}
    {...props}
  />
))
CommandGroup.displayName = 'CommandGroup'

export const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-body',
      'aria-selected:bg-accent aria-selected:text-accent-foreground',
      'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
      'outline-none',
      className,
    )}
    {...props}
  />
))
CommandItem.displayName = 'CommandItem'

export const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator ref={ref} className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
))
CommandSeparator.displayName = 'CommandSeparator'

// Lightweight kbd-like hint (does not exist in cmdk)
export function CommandShortcut({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd className={cn('inline-flex h-5 items-center rounded border border-border bg-surface px-1 text-micro tabular text-muted-foreground', className)}>
      {children}
    </kbd>
  )
}
