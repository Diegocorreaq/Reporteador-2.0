import type { ReactNode } from 'react'
import { EmptyState } from '@/components/feedback/empty-state'

export interface MetricTableColumn<TRow, TTotals> {
  key: string
  header: string
  align?: 'left' | 'right' | 'center'
  cell: (row: TRow) => ReactNode
  total?: (totals: TTotals) => ReactNode
}

interface MetricPivotTableProps<TRow, TTotals> {
  rows: TRow[]
  totals: TTotals
  columns: MetricTableColumn<TRow, TTotals>[]
}

function alignCell(align: 'left' | 'right' | 'center' = 'left') {
  if (align === 'right') {
    return 'text-right'
  }

  if (align === 'center') {
    return 'text-center'
  }

  return 'text-left'
}

export function MetricPivotTable<TRow, TTotals>({
  rows,
  totals,
  columns,
}: MetricPivotTableProps<TRow, TTotals>) {
  if (!rows.length) {
    return (
      <div className="rounded-[24px] border border-border/70 bg-white">
        <div className="p-4">
          <EmptyState title="Sin resultados" description="No hay informacion disponible para el rango seleccionado." />
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-[24px] border border-border/70 bg-white">
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-panelAlt/70">
          <tr>
            {columns.map((column) => (
              <th
                className={`px-3 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted ${alignCell(column.align)}`}
                key={column.key}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-white">
          {rows.map((row, index) => (
            <tr className="hover:bg-panelAlt/35" key={index}>
              {columns.map((column) => (
                <td className={`px-3 py-2.5 text-sm text-text ${alignCell(column.align)}`} key={column.key}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-border bg-brand-soft/30">
          <tr>
            {columns.map((column) => (
              <td className={`px-3 py-3 text-sm font-semibold text-text ${alignCell(column.align)}`} key={column.key}>
                {column.total ? column.total(totals) : null}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
