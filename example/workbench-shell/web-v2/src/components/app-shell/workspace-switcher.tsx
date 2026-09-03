import * as React from 'react'
import { ChevronsUpDown, Check } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/stores/app-store'

export function WorkspaceSwitcher() {
  const [open, setOpen] = React.useState(false)
  const workspaces = useAppStore((s) => s.workspaces)
  const currentId = useAppStore((s) => s.currentWorkspaceId)
  const setWorkspace = useAppStore((s) => s.setWorkspace)
  const current = workspaces.find((w) => w.id === currentId) ?? workspaces[0]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          aria-label="切换工作区"
          className="w-full justify-between px-2 text-left"
        >
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-body font-medium text-foreground">{current.name}</span>
            <span className="truncate text-micro text-muted-foreground">
              {current.memberCount} 位成员 · {current.timezone}
            </span>
          </span>
          <ChevronsUpDown className="size-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1" align="start">
        {workspaces.map((w) => {
          const active = w.id === currentId
          return (
            <button
              key={w.id}
              type="button"
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-accent"
              onClick={() => {
                setWorkspace(w.id)
                setOpen(false)
              }}
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-body font-medium">{w.name}</span>
                <span className="truncate text-micro text-muted-foreground">{w.slug}</span>
              </span>
              {active ? <Check className="size-4 text-brand" /> : null}
            </button>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}
