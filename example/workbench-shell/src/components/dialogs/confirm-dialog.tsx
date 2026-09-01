import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/stores/app-store"

function ConfirmDialog() {
  const store = useAppStore()
  const open = !!store.confirm
  const onConfirm = () => {
    store.confirm?.onConfirm()
    store.setConfirm(null)
  }
  const onCancel = () => {
    store.confirm?.onCancel?.()
    store.setConfirm(null)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{store.confirm?.title ?? "确认操作"}</DialogTitle>
          {store.confirm?.description && <DialogDescription>{store.confirm.description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>取消</Button>
          <Button variant="destructive" onClick={onConfirm}>确认</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { ConfirmDialog }
