import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { SighCellValue, SighTableRow } from '@/modules/sigh/types'

export interface SighTableColumn {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
  className?: string
  render?: (value: SighCellValue, row: SighTableRow, rowIndex: number) => ReactNode
}

interface SighTableProps {
  rows: SighTableRow[]
  columns?: SighTableColumn[]
  emptyMessage?: string
  className?: string
  tableClassName?: string
  rowClassName?: (row: SighTableRow, rowIndex: number) => string | undefined
  onRowClick?: (row: SighTableRow, rowIndex: number) => void
}

function prettifyLabel(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
}

function toCellText(value: SighCellValue) {
  if (value === null || value === undefined) {
    return ''
  }
  if (typeof value === 'boolean') {
    return value ? 'Si' : 'No'
  }
  return String(value)
}

function alignClass(align?: SighTableColumn['align']) {
  if (align === 'right') return 'text-right'
  if (align === 'center') return 'text-center'
  return 'text-left'
}

export function SighTable({
  rows,
  columns,
  emptyMessage = 'No se encuentran registros.',
  className,
  tableClassName,
  rowClassName,
  onRowClick,
}: SighTableProps) {
  const resolvedColumns =
    columns && columns.length
      ? columns
      : Object.keys(rows[0] ?? {}).map((key) => ({
          key,
          label: prettifyLabel(key),
        }))

  return (
    <div className={cn('overflow-x-auto rounded-md border border-border/70 bg-white', className)}>
      <table className={cn('min-w-full border-collapse text-[12px]', tableClassName)}>
        <thead>
          <tr className="bg-[#eef5fb] text-[#123B63]">
            {resolvedColumns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'border-b border-border px-2 py-1 font-semibold uppercase',
                  alignClass(column.align),
                  column.className,
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, rowIndex) => (
              <tr
                key={`${rowIndex}-${Object.values(row).join('-')}`}
                className={cn(
                  'odd:bg-white even:bg-[#f8fbff]',
                  onRowClick ? 'cursor-pointer hover:bg-brand-soft/40' : '',
                  rowClassName?.(row, rowIndex),
                )}
                onClick={onRowClick ? () => onRowClick(row, rowIndex) : undefined}
              >
                {resolvedColumns.map((column) => {
                  const rawValue = row[column.key]
                  const content = column.render
                    ? column.render(rawValue, row, rowIndex)
                    : toCellText(rawValue)

                  return (
                    <td
                      key={`${rowIndex}-${column.key}`}
                      className={cn(
                        'border-b border-border/70 px-2 py-1 text-[12px] text-text',
                        alignClass(column.align),
                        column.className,
                      )}
                    >
                      {content || '-'}
                    </td>
                  )
                })}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={resolvedColumns.length || 1} className="px-3 py-5 text-center text-xs text-muted">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
