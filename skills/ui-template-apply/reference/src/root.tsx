import { Outlet } from "react-router"
import { InboxIcon, ListChecksIcon, SettingsIcon } from "lucide-react"
import { AppShell, ShellBrand, type NavGroup } from "@/components/blocks/app-shell"
import { ThemeMenu } from "@/components/blocks/theme-menu"

const nav: NavGroup[] = [
  { items: [{ label: "任务", to: "/jobs", icon: ListChecksIcon }, { label: "对话", to: "/threads", icon: InboxIcon }] },
  { label: "系统", items: [{ label: "设置", to: "/settings", icon: SettingsIcon }] },
]

export function Root() {
  return <AppShell brand={<ShellBrand title="工作台" subtitle="reference" />} nav={nav} footer={<ThemeMenu />}><Outlet /></AppShell>
}
