import { useMemo } from 'react'
import type {
  CriticalCareTableBlockConfig,
  CriticalCareTableColumn,
  CriticalCareTableSummaryRow,
} from '@/modules/critical-care/types'
import {
  formatNumeric,
  resolveColumnValue,
  resolveRowValue,
  sumByKey,
  toNumberValue,
} from '@/modules/critical-care/components/critical-care-utils'

interface CriticalCareTableBlockProps {
  block: CriticalCareTableBlockConfig
  rows: Array<Record<string, unknown>>
  onPriorityClick?: (priority: string) => void
}

function getAlignClass(align: CriticalCareTableColumn['align']) {
  if (align === 'right') return 'text-right'
  if (align === 'center') return 'text-center'
  return 'text-left'
}

function formatCellValue(rawValue: unknown, column: CriticalCareTableColumn) {
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return '-'
  }

  const numeric = toNumberValue(rawValue)
  if (numeric === null) {
    return String(rawValue)
  }

  const multiplier = column.multiplier ?? 1
  const computed = numeric * multiplier
  const formatted = formatNumeric(computed, column.decimals)
  return column.suffix ? `${formatted}${column.suffix}` : formatted
}

function resolveRowDisplayValue(
  row: Record<string, unknown>,
  column: CriticalCareTableColumn,
  percentBaseByKey: Record<string, number>,
) {
  if (column.derivePercentOfKey) {
    const numerator = toNumberValue(resolveRowValue(row, column.derivePercentOfKey)) ?? 0
    const denominator = percentBaseByKey[column.derivePercentOfKey] ?? 0
    const value = denominator > 0 ? (numerator * 100) / denominator : 0
    return formatCellValue(value, column)
  }

  return formatCellValue(resolveColumnValue(row, column), column)
}

function buildPercentBaseByKey(rows: Array<Record<string, unknown>>, columns: CriticalCareTableColumn[]) {
  const keys = [...new Set(columns.map((column) => column.derivePercentOfKey).filter(Boolean))] as string[]
  return keys.reduce<Record<string, number>>((accumulator, key) => {
    accumulator[key] = sumByKey(rows, key)
    return accumulator
  }, {})
}

function buildDefaultTotals(
  rows: Array<Record<string, unknown>>,
  block: CriticalCareTableBlockConfig,
) {
  if (!block.totals?.enabled) {
    return null
  }

  const formulas = block.totals.formulas ?? []
  const valuesByKey = block.columns.reduce<Record<string, string>>((accumulator, column) => {
    const formula = formulas.find((item) => item.targetKey === column.key)
    if (formula) {
      const numerator = sumByKey(rows, formula.numeratorKey)
      const denominator = sumByKey(rows, formula.denominatorKey)
      const multiplier = formula.multiplier ?? 1
      const computed = denominator > 0 ? (numerator / denominator) * multiplier : 0
      accumulator[column.key] = formatCellValue(computed, {
        ...column,
        decimals: formula.decimals ?? column.decimals,
      })
      return accumulator
    }

    if (!column.sum) {
      return accumulator
    }

    const total = sumByKey(rows, column.key, column.aliases ?? [])
    accumulator[column.key] = formatCellValue(total, column)
    return accumulator
  }, {})

  return {
    label: block.totals.label ?? 'TOTAL',
    labelColSpan: block.totals.labelColSpan ?? 1,
    highlight: true,
    valuesByKey,
  }
}

function buildSummaryRows(
  rows: Array<Record<string, unknown>>,
  summaryRows: CriticalCareTableSummaryRow[] = [],
) {
  return summaryRows.map((summaryRow) => {
    const valuesByKey = summaryRow.cells.reduce<Record<string, string>>((accumulator, cell) => {
      if (cell.operation === 'sum') {
        const sourceKey = cell.sourceKey ?? cell.targetKey
        const total = sumByKey(rows, sourceKey)
        accumulator[cell.targetKey] = formatNumeric(total, cell.decimals)
        return accumulator
      }

      const numerator = sumByKey(rows, cell.numeratorKey ?? cell.targetKey)
      const denominator = sumByKey(rows, cell.denominatorKey ?? cell.targetKey)
      const multiplier = cell.multiplier ?? 1
      const ratio = denominator > 0 ? (numerator / denominator) * multiplier : 0
      accumulator[cell.targetKey] = formatNumeric(ratio, cell.decimals ?? 1)
      return accumulator
    }, {})

    return {
      label: summaryRow.label,
      labelColSpan: summaryRow.labelColSpan,
      highlight: summaryRow.highlight ?? false,
      valuesByKey,
    }
  })
}

export function CriticalCareTableBlock({
  block,
  rows,
  onPriorityClick,
}: CriticalCareTableBlockProps) {
  const percentBaseByKey = useMemo(
    () => buildPercentBaseByKey(rows, block.columns),
    [rows, block.columns],
  )

  const defaultTotals = useMemo(() => buildDefaultTotals(rows, block), [rows, block])
  const extraSummaryRows = useMemo(() => buildSummaryRows(rows, block.summaryRows), [rows, block.summaryRows])

  const hasRows = rows.length > 0
  const priorityColumnKey = block.priorityClickable ? 'prioridad' : null

  const duplicateTracker = new Map<string, string>()

  return (
    <div className="space-y-2">
      {block.subtitle ? <h4 className="text-xs font-semibold text-[#1f4b6e]">{block.subtitle}</h4> : null}
      <div className="overflow-x-auto rounded-md border border-border/70 bg-white">
        <table className="min-w-full border-collapse text-[11px]">
          <thead>
            {block.headerRows?.length ? (
              block.headerRows.map((headerRow, rowIndex) => (
                <tr key={`header-${rowIndex}`} className="bg-[#eef5fb] text-[#123B63]">
                  {headerRow.map((cell, cellIndex) => (
                    <th
                      key={`header-cell-${rowIndex}-${cellIndex}`}
                      colSpan={cell.colSpan}
                      rowSpan={cell.rowSpan}
                      className={`border-b border-border px-2 py-1 font-semibold uppercase ${getAlignClass(
                        cell.align ?? 'left',
                      )}`}
                    >
                      {cell.label}
                    </th>
                  ))}
                </tr>
              ))
            ) : (
              <tr className="bg-[#eef5fb] text-[#123B63]">
                {block.columns.map((column) => (
                  <th
                    key={`header-${column.key}`}
                    className={`border-b border-border px-2 py-1 font-semibold uppercase ${getAlignClass(
                      column.align ?? 'left',
                    )}`}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {hasRows ? (
              rows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`} className="odd:bg-white even:bg-[#f8fbff]">
                  {block.columns.map((column) => {
                    const alignClass = getAlignClass(column.align ?? 'left')
                    const computedValue = resolveRowDisplayValue(row, column, percentBaseByKey)
                    const rawValue = resolveColumnValue(row, column)
                    const normalizedValue = String(rawValue ?? '')
                    const trackerKey = column.key
                    let finalValue = computedValue

                    if (column.collapseDuplicates) {
                      const previousValue = duplicateTracker.get(trackerKey)
                      if (previousValue === normalizedValue) {
                        finalValue = ''
                      } else {
                        duplicateTracker.set(trackerKey, normalizedValue)
                      }
                    }

                    const isPriorityCell =
                      priorityColumnKey && column.key.toLowerCase().includes(priorityColumnKey)

                    return (
                      <td key={`cell-${rowIndex}-${column.key}`} className={`border-b border-border/70 px-2 py-1 ${alignClass}`}>
                        {isPriorityCell && String(finalValue).trim().length && onPriorityClick ? (
                          <button
                            type="button"
                            className="text-left font-semibold text-[#2b6faa] underline-offset-2 hover:underline"
                            onClick={() => onPriorityClick(String(finalValue))}
                          >
                            {finalValue}
                          </button>
                        ) : (
                          finalValue || '-'
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={block.columns.length} className="px-3 py-5 text-center text-xs text-muted">
                  {block.emptyMessage ?? 'No se encuentran registros'}
                </td>
              </tr>
            )}

            {hasRows && defaultTotals ? (
              <tr className="bg-[#e7f1fb] font-semibold text-[#123B63]">
                <td colSpan={defaultTotals.labelColSpan} className="border-b border-border px-2 py-1 text-right">
                  {defaultTotals.label}
                </td>
                {block.columns.slice(defaultTotals.labelColSpan).map((column) => (
                  <td
                    key={`total-${column.key}`}
                    className={`border-b border-border px-2 py-1 ${getAlignClass(column.align ?? 'left')}`}
                  >
                    {defaultTotals.valuesByKey[column.key] ?? ''}
                  </td>
                ))}
              </tr>
            ) : null}

            {hasRows
              ? extraSummaryRows.map((summaryRow, index) => (
                  <tr
                    key={`summary-${index}`}
                    className={summaryRow.highlight ? 'bg-[#e7f1fb] font-semibold text-[#123B63]' : 'bg-white font-semibold text-[#123B63]'}
                  >
                    <td colSpan={summaryRow.labelColSpan} className="border-b border-border px-2 py-1 text-right">
                      {summaryRow.label}
                    </td>
                    {block.columns.slice(summaryRow.labelColSpan).map((column) => (
                      <td
                        key={`summary-${index}-${column.key}`}
                        className={`border-b border-border px-2 py-1 ${getAlignClass(column.align ?? 'left')}`}
                      >
                        {summaryRow.valuesByKey[column.key] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
