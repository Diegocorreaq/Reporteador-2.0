import { EmptyState } from '@/components/feedback/empty-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { CentroObstetricoSummaryRow, CentroObstetricoSummaryTotals } from '@/modules/centro-obstetrico/types'
import { formatInteger } from '@/modules/centro-obstetrico/utils'

interface CentroObstetricoSummaryTableProps {
  title: string
  rows: CentroObstetricoSummaryRow[]
  totals: CentroObstetricoSummaryTotals
}

export function CentroObstetricoSummaryTable({
  title,
  rows,
  totals,
}: CentroObstetricoSummaryTableProps) {
  const mobileHighlights = [
    { label: 'Total Ingresos', value: totals.totalIngresos },
    { label: 'Egresos', value: totals.egresos },
    { label: 'Total Referidos', value: totals.totalReferidos },
    { label: 'Fallecidos', value: totals.fallecidos },
  ]

  return (
    <Card>
      <CardHeader className="border-b border-border/70 pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {rows.length ? (
          <>
            <div className="grid gap-2 sm:grid-cols-2 lg:hidden">
              {mobileHighlights.map((item) => (
                <div className="rounded-xl border border-border bg-canvas/50 px-3 py-2" key={item.label}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{item.label}</p>
                  <p className="mt-1 text-lg font-semibold text-brand-strong">{formatInteger(item.value)}</p>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-muted sm:hidden">Desliza la tabla para revisar el detalle completo.</p>

            <div className="overflow-x-auto rounded-[24px] border border-border/70">
              <table className="min-w-[1320px] divide-y divide-border bg-white lg:min-w-[1480px]">
                <thead className="bg-panelAlt/70">
                  <tr>
                    <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted sm:px-3 sm:py-3 sm:text-xs">Año</th>
                    <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted sm:px-3 sm:py-3 sm:text-xs">Mes</th>
                    <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-muted sm:px-3 sm:py-3 sm:text-xs">Total Ingresos</th>
                    <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-muted whitespace-normal leading-tight sm:px-3 sm:py-3 sm:text-xs">
                      Nro Transferidos a Hosp. Obstetricia
                    </th>
                    <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-muted whitespace-normal leading-tight sm:px-3 sm:py-3 sm:text-xs">
                      Nro Transferidos a UCI
                    </th>
                    <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-muted whitespace-normal leading-tight sm:px-3 sm:py-3 sm:text-xs">
                      Nro Transferidos a Otros Servicios
                    </th>
                    <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-muted sm:px-3 sm:py-3 sm:text-xs">AltaMedica</th>
                    <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-muted sm:px-3 sm:py-3 sm:text-xs">Total Referidos</th>
                    <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-muted whitespace-normal leading-tight sm:px-3 sm:py-3 sm:text-xs">
                      Destino Villa Panamericana
                    </th>
                    <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-muted sm:px-3 sm:py-3 sm:text-xs">Destino Otros</th>
                    <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-muted sm:px-3 sm:py-3 sm:text-xs">Fallecidos</th>
                    <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-muted whitespace-normal leading-tight sm:px-3 sm:py-3 sm:text-xs">
                      Fallecido &lt; 12H. ingreso al Hosp.
                    </th>
                    <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-muted whitespace-normal leading-tight sm:px-3 sm:py-3 sm:text-xs">
                      Fallecidos de 12 a 48 H. de ingr al Hosp.
                    </th>
                    <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-muted whitespace-normal leading-tight sm:px-3 sm:py-3 sm:text-xs">
                      Fallecidos &gt;=48 H. de ingr. al H.
                    </th>
                    <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-muted sm:px-3 sm:py-3 sm:text-xs">Egresos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-white">
                  {rows.map((row) => (
                    <tr className="hover:bg-panelAlt/35" key={`${row.anio}-${row.mesNumero}`}>
                      <td className="px-2 py-2 text-xs text-text sm:px-3 sm:py-2.5 sm:text-sm">{row.anio}</td>
                      <td className="px-2 py-2 text-xs text-text sm:px-3 sm:py-2.5 sm:text-sm">{row.mesLabel}</td>
                      <td className="px-2 py-2 text-right text-xs text-text sm:px-3 sm:py-2.5 sm:text-sm">{formatInteger(row.totalIngresos)}</td>
                      <td className="px-2 py-2 text-right text-xs text-text sm:px-3 sm:py-2.5 sm:text-sm">
                        {formatInteger(row.nroTransferidosHospObstetricia)}
                      </td>
                      <td className="px-2 py-2 text-right text-xs text-text sm:px-3 sm:py-2.5 sm:text-sm">{formatInteger(row.nroTransferidosUci)}</td>
                      <td className="px-2 py-2 text-right text-xs text-text sm:px-3 sm:py-2.5 sm:text-sm">
                        {formatInteger(row.nroTransferidosOtrosServicios)}
                      </td>
                      <td className="px-2 py-2 text-right text-xs text-text sm:px-3 sm:py-2.5 sm:text-sm">{formatInteger(row.altaMedica)}</td>
                      <td className="px-2 py-2 text-right text-xs text-text sm:px-3 sm:py-2.5 sm:text-sm">{formatInteger(row.totalReferidos)}</td>
                      <td className="px-2 py-2 text-right text-xs text-text sm:px-3 sm:py-2.5 sm:text-sm">
                        {formatInteger(row.destinoVillaPanamericana)}
                      </td>
                      <td className="px-2 py-2 text-right text-xs text-text sm:px-3 sm:py-2.5 sm:text-sm">{formatInteger(row.destinoOtros)}</td>
                      <td className="px-2 py-2 text-right text-xs text-text sm:px-3 sm:py-2.5 sm:text-sm">{formatInteger(row.fallecidos)}</td>
                      <td className="px-2 py-2 text-right text-xs text-text sm:px-3 sm:py-2.5 sm:text-sm">
                        {formatInteger(row.fallecidoMenor12Horas)}
                      </td>
                      <td className="px-2 py-2 text-right text-xs text-text sm:px-3 sm:py-2.5 sm:text-sm">
                        {formatInteger(row.fallecidos12a48Horas)}
                      </td>
                      <td className="px-2 py-2 text-right text-xs text-text sm:px-3 sm:py-2.5 sm:text-sm">
                        {formatInteger(row.fallecidosMayorIgual48Horas)}
                      </td>
                      <td className="px-2 py-2 text-right text-xs font-semibold text-text sm:px-3 sm:py-2.5 sm:text-sm">{formatInteger(row.egresos)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-border bg-brand-soft/30">
                  <tr>
                    <td className="px-3 py-3 text-sm font-semibold text-text" colSpan={2}>
                      Total
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-text">{formatInteger(totals.totalIngresos)}</td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-text">
                      {formatInteger(totals.nroTransferidosHospObstetricia)}
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-text">{formatInteger(totals.nroTransferidosUci)}</td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-text">
                      {formatInteger(totals.nroTransferidosOtrosServicios)}
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-text">{formatInteger(totals.altaMedica)}</td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-text">{formatInteger(totals.totalReferidos)}</td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-text">
                      {formatInteger(totals.destinoVillaPanamericana)}
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-text">{formatInteger(totals.destinoOtros)}</td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-text">{formatInteger(totals.fallecidos)}</td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-text">
                      {formatInteger(totals.fallecidoMenor12Horas)}
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-text">
                      {formatInteger(totals.fallecidos12a48Horas)}
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-text">
                      {formatInteger(totals.fallecidosMayorIgual48Horas)}
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-text">{formatInteger(totals.egresos)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        ) : (
          <EmptyState title="Sin resultados" description="No hay informacion disponible para el periodo seleccionado." />
        )}
        <div className="text-xs leading-5 text-muted">
          <p>Fuente: SISGALENPLUS</p>
          <p>Elaboracion: Area de Estadistica - UIS</p>
        </div>
      </CardContent>
    </Card>
  )
}
