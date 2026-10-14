/**
 * AppShell — sidebar + inset canvas. The document is the single scroll owner: pages never set
 * their own viewport heights; PageHeader sticks to the top of the inset. The inset is the `frame` surface:
 * radius-xl + border, `overflow: clip` so headers and full-bleed children follow its corners.
 * Collapses to icons on desktop, to a sheet on mobile (shadcn Sidebar behavior).
 */
import * as React from "react"
import type { LucideIcon } from "lucide-react"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarInset, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail,
} from "@/components/ui/sidebar"
import { AppLink, useIsActive } from "@/components/blocks/router"

export type NavItem = { label: string; to: string; icon: LucideIcon; badge?: React.ReactNode | undefined }
export type NavGroup = { label?: string | undefined; items: NavItem[] }

function NavEntry({ item }: { item: NavItem }) {
  const active = useIsActive(item.to)
  const Icon = item.icon
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
        <AppLink to={item.to} aria-current={active ? "page" : undefined}><Icon /><span>{item.label}</span></AppLink>
      </SidebarMenuButton>
      {item.badge !== undefined ? <SidebarMenuBadge>{item.badge}</SidebarMenuBadge> : null}
    </SidebarMenuItem>
  )
}

export function AppShell({ brand, nav, footer, children }: {
  /** Product mark + name, shown in the sidebar header. Keep it one line. */
  brand: React.ReactNode
  nav: NavGroup[]
  /** Account / settings / theme toggle. */
  footer?: React.ReactNode | undefined
  children: React.ReactNode
}) {
  return (
    <SidebarProvider className="bg-app-shell">
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>{brand}</SidebarHeader>
        <SidebarContent>
          {nav.map((group, index) => (
            <SidebarGroup key={group.label ?? index}>
              {group.label !== undefined ? <SidebarGroupLabel>{group.label}</SidebarGroupLabel> : null}
              <SidebarGroupContent>
                <SidebarMenu>{group.items.map((item) => <NavEntry key={item.to} item={item} />)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        {footer !== undefined ? <SidebarFooter>{footer}</SidebarFooter> : null}
        <SidebarRail />
      </Sidebar>
      <SidebarInset data-surface="frame" className="min-w-0 overflow-clip [--frame-h:100svh] md:border md:[--frame-h:calc(100svh-1rem-2px)]">{children}</SidebarInset>
    </SidebarProvider>
  )
}

/** Brand block for the sidebar header: product name and an optional secondary line. */
export function ShellBrand({ title, subtitle }: { title: string; subtitle?: string | undefined }) {
  return (
    <div className="flex min-w-0 flex-col px-2 py-1 group-data-[collapsible=icon]:hidden">
      <span className="truncate text-sm font-semibold">{title}</span>
      {subtitle !== undefined ? <span className="truncate text-xs text-muted-foreground">{subtitle}</span> : null}
    </div>
  )
}

/** Small status line for the sidebar footer (hidden when collapsed to icons). */
export function ShellNote({ children }: { children: React.ReactNode }) {
  return <div className="flex min-w-0 items-center gap-2 px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">{children}</div>
}

