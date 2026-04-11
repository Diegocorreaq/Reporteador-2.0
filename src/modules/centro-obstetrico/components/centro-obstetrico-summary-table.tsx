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
  return (
    <Card>
      <CardHeader className="border-b border-border/70 pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {rows.length ? (
          <div className="overflow-x-auto rounded-[24px] border border-border/70">
            <table className="min-w-[1480px] divide-y divide-border bg-white">
              <thead className="bg-panelAlt/70">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-muted">Año</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-muted">Mes</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-muted">Total Ingresos</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    Nro Transferidos a Hosp. Obstetricia
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    Nro Transferidos a UCI
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    Nro Transferidos a Otros Servicios
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-muted">AltaMedica</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-muted">Total Referidos</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    Destino Villa Panamericana
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-muted">Destino Otros</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-muted">Fallecidos</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    Fallecido &lt; 12H. ingreso al Hosp.
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    Fallecidos de 12 a 48 H. de ingr al Hosp.
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    Fallecidos &gt;=48 H. de ingr. al H.
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-muted">Egresos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white">
                {rows.map((row) => (
                  <tr className="hover:bg-panelAlt/35" key={`${row.anio}-${row.mesNumero}`}>
                    <td className="px-3 py-2.5 text-sm text-text">{row.anio}</td>
                    <td className="px-3 py-2.5 text-sm text-text">{row.mesLabel}</td>
                    <td className="px-3 py-2.5 text-right text-sm text-text">{formatInteger(row.totalIngresos)}</td>
                    <td className="px-3 py-2.5 text-right text-sm text-text">
                      {formatInteger(row.nroTransferidosHospObstetricia)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-sm text-text">{formatInteger(row.nroTransferidosUci)}</td>
                    <td className="px-3 py-2.5 text-right text-sm text-text">
                      {formatInteger(row.nroTransferidosOtrosServicios)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-sm text-text">{formatInteger(row.altaMedica)}</td>
                    <td className="px-3 py-2.5 text-right text-sm text-text">{formatInteger(row.totalReferidos)}</td>
                    <td className="px-3 py-2.5 text-right text-sm text-text">
                      {formatInteger(row.destinoVillaPanamericana)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-sm text-text">{formatInteger(row.destinoOtros)}</td>
                    <td className="px-3 py-2.5 text-right text-sm text-text">{formatInteger(row.fallecidos)}</td>
                    <td className="px-3 py-2.5 text-right text-sm text-text">
                      {formatInteger(row.fallecidoMenor12Horas)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-sm text-text">
                      {formatInteger(row.fallecidos12a48Horas)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-sm text-text">
                      {formatInteger(row.fallecidosMayorIgual48Horas)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-sm font-semibold text-text">{formatInteger(row.egresos)}</td>
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
