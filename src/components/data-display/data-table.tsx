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
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
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
    pageSize: 10,
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
      <CardHeader className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted">Mostrar</span>
          <Select
            className="h-8 w-20 text-xs"
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
            <option value="25">25</option>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-border bg-canvas">
                  {headerGroup.headers.map((header) => (
                    <th
                      className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-muted"
                      key={header.id}
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          className={cn(
                            'inline-flex items-center gap-1.5',
                            header.column.getCanSort() && 'transition hover:text-brand-strong',
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                          type="button"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() ? (
                            <ArrowUpDown className="h-3 w-3 opacity-50" />
                          ) : null}
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length ? (
                rows.map((row, index) => (
                  <tr
                    className={cn(
                      'transition-colors hover:bg-brand-soft/30',
                      index % 2 === 0 ? 'bg-white' : 'bg-canvas/50',
                    )}
                    key={row.id}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td className="px-4 py-3 text-sm text-text" key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="p-6" colSpan={columns.length}>
                    <EmptyState
                      title="Sin resultados"
                      description="No hay informacion disponible para los filtros seleccionados."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            Mostrando{' '}
            <span className="font-medium text-text">
              {table.getState().pagination.pageIndex * pagination.pageSize + 1}
            </span>
            {' - '}
            <span className="font-medium text-text">
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * pagination.pageSize,
                data.length,
              )}
            </span>
            {' de '}
            <span className="font-medium text-text">{data.length}</span> registros
          </p>
          <div className="flex items-center gap-2">
            <Button
              className="h-8 px-3"
              size="sm"
              variant="outline"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Anterior</span>
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, table.getPageCount()) }, (_, i) => {
                const pageIndex = table.getState().pagination.pageIndex
                let page = i
                if (table.getPageCount() > 5) {
                  if (pageIndex < 3) {
                    page = i
                  } else if (pageIndex > table.getPageCount() - 4) {
                    page = table.getPageCount() - 5 + i
                  } else {
                    page = pageIndex - 2 + i
                  }
                }
                return (
                  <Button
                    key={page}
                    className={cn(
                      'h-8 w-8 p-0',
                      page === pageIndex
                        ? 'bg-brand text-white hover:bg-brand-strong'
                        : '',
                    )}
                    size="sm"
                    variant={page === pageIndex ? 'brand' : 'outline'}
                    onClick={() => table.setPageIndex(page)}
                  >
                    {page + 1}
                  </Button>
                )
              })}
            </div>
            <Button
              className="h-8 px-3"
              size="sm"
              variant="outline"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="hidden sm:inline">Siguiente</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
