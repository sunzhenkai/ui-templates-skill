import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAppStore } from '@/lib/stores/app-store'

export function ThemeToggle() {
  const theme = useAppStore((s) => s.theme)
  const toggleTheme = useAppStore((s) => s.toggleTheme)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`切换到${theme === 'light' ? '深色' : '浅色'}主题`}
          onClick={toggleTheme}
        >
          {theme === 'light' ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>切换主题</TooltipContent>
    </Tooltip>
  )
}
