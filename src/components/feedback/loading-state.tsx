export function LoadingState() {
  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-[28px] border border-dashed border-border bg-white/80">
      <div className="flex items-center gap-3 text-sm font-medium text-muted">
        <span className="h-3 w-3 animate-pulse rounded-full bg-brand" />
        Cargando módulo...
      </div>
    </div>
  )
}
