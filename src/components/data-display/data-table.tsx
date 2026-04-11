import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDownUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/feedback/empty-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface DataTableProps<TData> {
  title: string
  description: string
  columns: ColumnDef<TData>[]
  data: TData[]
}

export function DataTable<TData>({ title, description, columns, data }: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  })

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })
  const rows = table.getRowModel().rows

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 border-b border-border/70 pb-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {description ? <p className="mt-1 text-sm leading-6 text-muted">{description}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Filas</span>
          <Select
            className="h-8 w-24 rounded-xl px-2 text-xs"
            value={String(pagination.pageSize)}
            onChange={(event) =>
              setPagination({
                pageIndex: 0,
                pageSize: Number(event.target.value),
              })
            }
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="15">15</option>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-panelAlt/70">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-muted" key={header.id}>
                      {header.isPlaceholder ? null : (
                        <button
                          className={cn(
                            'inline-flex items-center gap-2',
                            header.column.getCanSort() && 'transition hover:text-text',
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                          type="button"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() ? <ArrowDownUp className="h-3.5 w-3.5" /> : null}
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border bg-white">
              {rows.length ? (
                rows.map((row) => (
                  <tr className="hover:bg-panelAlt/40" key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td className="px-4 py-3 align-top text-sm text-text" key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="p-6" colSpan={columns.length}>
                    <EmptyState title="Sin resultados" description="No hay informacion disponible para los filtros seleccionados." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-2 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            Pagina {table.getState().pagination.pageIndex + 1} de {table.getPageCount() || 1}
          </p>
          <div className="flex gap-2">
            <Button
              className="h-8 rounded-xl px-2.5 text-xs font-medium"
              size="sm"
              variant="outline"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              className="h-8 rounded-xl px-2.5 text-xs font-medium"
              size="sm"
              variant="outline"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
