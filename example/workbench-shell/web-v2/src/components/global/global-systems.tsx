import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { SearchDialog } from './search-dialog'
import { CreateIncidentDialog } from './create-incident-dialog'
import { ShortcutsDialog } from './shortcuts-dialog'

export function GlobalSystems({ children }: { children: (actions: { openSearch: () => void; openCreate: () => void; openHelp: () => void }) => ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  useEffect(() => {
    const isEditable = () => {
      const element = document.activeElement as HTMLElement | null
      return !!element && (element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName))
    }
    const handler = (event: KeyboardEvent) => {
      const modKey = event.metaKey || event.ctrlKey
      if (modKey && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen(true) }
      if (!isEditable() && event.key.toLowerCase() === 'c' && !modKey) { event.preventDefault(); setCreateOpen(true) }
      if (!isEditable() && event.key === '?') { event.preventDefault(); setHelpOpen(true) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const actions = { openSearch: () => setSearchOpen(true), openCreate: () => setCreateOpen(true), openHelp: () => setHelpOpen(true) }
  return (
    <>
      {children(actions)}
      {createPortal(<SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />, document.body)}
      {createPortal(<CreateIncidentDialog open={createOpen} onClose={() => setCreateOpen(false)} />, document.body)}
      {createPortal(<ShortcutsDialog open={helpOpen} onClose={() => setHelpOpen(false)} />, document.body)}
    </>
  )
}
