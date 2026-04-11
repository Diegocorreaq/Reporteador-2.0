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
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <div className="rounded-lg border border-border bg-canvas p-4" key={item.label}>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{item.label}</p>
              <p className="mt-1.5 text-sm font-medium text-brand-strong">{item.value}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
