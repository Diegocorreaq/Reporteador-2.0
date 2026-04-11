import { Loader2 } from 'lucide-react'

export function LoadingState() {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-white">
      <Loader2 className="h-8 w-8 animate-spin text-brand" />
      <p className="mt-3 text-sm font-medium text-muted">Cargando modulo...</p>
    </div>
  )
}
