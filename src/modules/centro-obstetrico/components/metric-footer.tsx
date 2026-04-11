interface MetricFooterProps {
  note?: string
}

export function MetricFooter({ note }: MetricFooterProps) {
  return (
    <div className="border-t border-border/70 pt-3 text-xs leading-5 text-muted">
      {note ? <p>{note}</p> : null}
      <p>Fuente: SISGALENPLUS</p>
      <p>Elaboracion: Area de Estadistica - UIS</p>
    </div>
  )
}
