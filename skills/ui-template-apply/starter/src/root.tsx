import { Outlet } from "react-router"
import { SettingsIcon } from "lucide-react"
import { AppShell, ShellBrand, type NavGroup } from "@/components/blocks/app-shell"
import { ThemeMenu } from "@/components/blocks/theme-menu"

const nav: NavGroup[] = [
  { items: [{ label: "设置", to: "/settings", icon: SettingsIcon }] },
]

export function Root() {
  return <AppShell brand={<ShellBrand title="App" />} nav={nav} footer={<ThemeMenu />}><Outlet /></AppShell>
}
