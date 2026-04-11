import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { DetailItem } from '@/types/report'

interface DetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  items: DetailItem[]
}

export function DetailModal({ open, onOpenChange, title, description, items }: DetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <div className="rounded-2xl border border-border bg-panelAlt/60 p-4" key={item.label}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{item.label}</p>
              <p className="mt-2 text-sm font-medium text-text">{item.value}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
