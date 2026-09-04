import { Button } from "@/components/ui/button"
import { MenuIcon } from "lucide-react"
import { createContext, useContext, type ReactNode } from "react"

export type ShellChrome = {
  overlay: boolean
  openNav: () => void
}

const ShellChromeContext = createContext<ShellChrome | null>(null)

export function ShellChromeProvider({ value, children }: { value: ShellChrome; children: ReactNode }) {
  return <ShellChromeContext.Provider value={value}>{children}</ShellChromeContext.Provider>
}

export function useShellChrome() {
  return useContext(ShellChromeContext)
}

export function OverlayNavTrigger() {
  const chrome = useShellChrome()
  if (!chrome?.overlay) return null
  return (
    <Button size="icon-sm" variant="outline" aria-label="打开导航" data-slot="header-trigger" onClick={chrome.openNav}>
      <MenuIcon />
    </Button>
  )
}
