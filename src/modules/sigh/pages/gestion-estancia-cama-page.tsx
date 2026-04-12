import { useEffect, useMemo, useState } from 'react'
import { History, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { SighFilterPanel } from '@/modules/sigh/components/sigh-filter-panel'
import { SighPageShell } from '@/modules/sigh/components/sigh-page-shell'
import { SighTable, type SighTableColumn } from '@/modules/sigh/components/sigh-table'
import { resolveRowNumber, resolveRowText } from '@/modules/sigh/sigh-utils'
import {
  getCamasServicioInfo,
  getGestionEstanciaMovimientoDetalle,
  getGestionEstanciaMovimientos,
  getGestionEstanciaReport,
  listCamasServicios,
} from '@/modules/sigh/services/sigh-reports.service'
import type { SighTableRow } from '@/modules/sigh/types'

interface ServicioOption {
  tipo: string
  nombre: string
}

const ESTANCIA_COLUMNS: SighTableColumn[] = [
  {
    key: 'servicio',
    label: 'Servicio',
    render: (_, row) => resolveRowText(row, 'servicio', ['SERVICIO']),
  },
  {
    key: 'idcuenta',
    label: 'IdCuenta',
    align: 'center',
    render: (_, row) => resolveRowText(row, 'idcuenta', ['IDCUENTA']),
  },
  {
    key: 'paciente',
    label: 'Paciente',
    render: (_, row) => resolveRowText(row, 'paciente', ['PACIENTE']),
  },
  {
    key: 'edad',
    label: 'Edad',
    align: 'center',
    render: (_, row) => resolveRowText(row, 'edad', ['EDAD']),
  },
  {
    key: 'tedad',
    label: 'Tipo edad',
    align: 'center',
    render: (_, row) => resolveRowText(row, 'tedad', ['TIPOEDAD']),
  },
  {
    key: 'ffto',
    label: 'Fte. Fto.',
    align: 'center',
    render: (_, row) => resolveRowText(row, 'ffto', ['FTEFTO']),
  },
  {
    key: 'diash',
    label: 'Dias hosp',
    align: 'center',
    render: (_, row) => resolveRowText(row, 'diash', ['DIAHOSP']),
  },
  {
    key: 'diass',
    label: 'Dias serv',
    align: 'center',
    render: (_, row) => resolveRowText(row, 'diass', ['DIASERV', 'horas']),
  },
  {
    key: 'dxing1',
    label: 'Dx ingreso',
    render: (_, row) => resolveRowText(row, 'dxing1', ['dxing', 'DESDX']),
  },
  {
    key: 'dxevo1',
    label: 'Dx evolucion 1',
    render: (_, row) => resolveRowText(row, 'dxevo1', ['DXEVO1']),
  },
  {
    key: 'dxevo2',
    label: 'Dx evolucion 2',
    render: (_, row) => resolveRowText(row, 'dxevo2', ['DXEVO2']),
  },
]

export function GestionEstanciaCamaPage() {
  const [servicios, setServicios] = useState<ServicioOption[]>([])
  const [selectedServicio, setSelectedServicio] = useState('')
  const [rows, setRows] = useState<SighTableRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [movementRows, setMovementRows] = useState<SighTableRow[]>([])
  const [movementDetail, setMovementDetail] = useState<{
    cabecera: SighTableRow[]
    diagnosticos: SighTableRow[]
    transferencias: SighTableRow[]
    profesionales: SighTableRow[]
    procedimientos: SighTableRow[]
    dxcqx: SighTableRow[]
  } | null>(null)
  const [movementTitle, setMovementTitle] = useState('')
  const [openMovements, setOpenMovements] = useState(false)
  const [loadingMovements, setLoadingMovements] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const options = await listCamasServicios()
        setServicios(options)
      } catch (serviceError) {
        console.warn('No se pudo cargar servicios de gestion de cama.', serviceError)
      }
    })()
  }, [])

  const handleFetch = async () => {
    if (!selectedServicio) {
      setError('Seleccione un servicio para consultar.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const info = await getCamasServicioInfo(selectedServicio)
      if (!info) {
        setRows([])
        return
      }

      const payload = await getGestionEstanciaReport({
        servicio: selectedServicio,
        tipo: resolveRowText(info, 'tipo'),
        idTipo: resolveRowText(info, 'idTipo', ['idtipo']),
      })
      setRows(payload)
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'No se pudo consultar gestion de estancia.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const movementColumns = useMemo<SighTableColumn[]>(
    () => [
      {
        key: 'orden',
        label: 'Orden',
        align: 'center',
        render: (_, row) => resolveRowText(row, 'ORDEN', ['orden']),
      },
      {
        key: 'movimiento',
        label: 'Movimiento',
        render: (_, row) => resolveRowText(row, 'SERVICIO', ['servicio', 'detalle']),
      },
      {
        key: 'fecha',
        label: 'Fecha',
        align: 'center',
        render: (_, row) => resolveRowText(row, 'FECHA', ['fecha']),
      },
      {
        key: 'accion',
        label: 'Accion',
        align: 'center',
        render: (_, row) => {
          const orden = resolveRowNumber(row, 'ORDEN', ['orden'])
          if (!orden) return '-'

          return (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px]"
              onClick={() => {
                void (async () => {
                  try {
                    const payload = await getGestionEstanciaMovimientoDetalle(orden)
                    setMovementDetail(payload)
                  } catch (detailError) {
                    const message =
                      detailError instanceof Error ? detailError.message : 'No se pudo consultar el detalle del movimiento.'
                    setError(message)
                  }
                })()
              }}
            >
              Ver detalle
            </Button>
          )
        },
      },
    ],
    [],
  )

  const openMovementHistory = async (row: SighTableRow) => {
    const upss = resolveRowText(row, 'UPSS', ['upss', 'servicio'])
    const servicio = resolveRowText(row, 'SERVICIO', ['servicio'])
    if (!upss || !servicio) {
      setError('No se pudo identificar la UPSS/servicio para consultar movimientos.')
      return
    }

    setOpenMovements(true)
    setMovementRows([])
    setMovementDetail(null)
    setLoadingMovements(true)
    setMovementTitle(`Historial de cama - ${resolveRowText(row, 'paciente', ['PACIENTE'])}`)
    try {
      const payload = await getGestionEstanciaMovimientos({ upss, servicio })
      setMovementRows(payload)
    } catch (movementError) {
      const message = movementError instanceof Error ? movementError.message : 'No se pudo consultar movimientos de cama.'
      setError(message)
    } finally {
      setLoadingMovements(false)
    }
  }

  return (
    <SighPageShell
      error={error}
      description="Gestion de estancia por cama con consulta nominal y trazabilidad de movimientos."
    >
      <SighFilterPanel processLabel="Consultar" onProcess={() => void handleFetch()}>
        <div className="w-[340px] space-y-1">
          <label className="text-xs font-semibold text-brand-strong" htmlFor="estancia-servicio-select">
            Servicio
          </label>
          <Select
            id="estancia-servicio-select"
            value={selectedServicio}
            onChange={(event) => setSelectedServicio(event.target.value)}
          >
            <option value="">Seleccionar</option>
            {servicios.map((service) => (
              <option key={`${service.tipo}-${service.nombre}`} value={service.nombre}>
                {service.nombre}
              </option>
            ))}
          </Select>
        </div>
      </SighFilterPanel>

      <Card className="border-border/70">
        <CardHeader className="border-b border-border/60 pb-3">
          <CardTitle className="text-sm">Estancia hospitalaria por cama</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto rounded-md border border-border/70 bg-white">
            <table className="min-w-[1300px] border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#eef5fb] text-[#123B63]">
                  {ESTANCIA_COLUMNS.map((column) => (
                    <th key={column.key} className="border-b border-border px-2 py-1 font-semibold uppercase">
                      {column.label}
                    </th>
                  ))}
                  <th className="border-b border-border px-2 py-1 text-center font-semibold uppercase">Movimientos</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((row, index) => (
                    <tr key={`estancia-${index}`} className="odd:bg-white even:bg-[#f8fbff]">
                      {ESTANCIA_COLUMNS.map((column) => (
                        <td key={`${index}-${column.key}`} className="border-b border-border/70 px-2 py-1">
                          {column.render ? column.render(row[column.key], row, index) : resolveRowText(row, column.key)}
                        </td>
                      ))}
                      <td className="border-b border-border/70 px-2 py-1 text-center">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => void openMovementHistory(row)}>
                          <History className="h-3.5 w-3.5" />
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={ESTANCIA_COLUMNS.length + 1} className="px-3 py-5 text-center text-xs text-muted">
                      {loading ? 'Consultando estancia por cama...' : 'No se encuentran registros.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={openMovements} onOpenChange={setOpenMovements}>
        <DialogContent className="w-[min(96vw,1280px)] max-w-none">
          <DialogHeader>
            <DialogTitle>{movementTitle}</DialogTitle>
          </DialogHeader>
          <SighTable
            rows={movementRows}
            columns={movementColumns}
            emptyMessage={loadingMovements ? 'Consultando movimientos...' : 'No se encontraron movimientos.'}
          />
          {movementDetail ? (
            <div className="grid gap-3 lg:grid-cols-2">
              <Card className="border-border/70">
                <CardHeader className="border-b border-border/60 pb-2">
                  <CardTitle className="text-xs">Cabecera</CardTitle>
                </CardHeader>
                <CardContent className="pt-3">
                  <SighTable rows={movementDetail.cabecera} />
                </CardContent>
              </Card>
              <Card className="border-border/70">
                <CardHeader className="border-b border-border/60 pb-2">
                  <CardTitle className="text-xs">Diagnosticos</CardTitle>
                </CardHeader>
                <CardContent className="pt-3">
                  <SighTable rows={movementDetail.diagnosticos} />
                </CardContent>
              </Card>
              <Card className="border-border/70">
                <CardHeader className="border-b border-border/60 pb-2">
                  <CardTitle className="text-xs">Transferencias</CardTitle>
                </CardHeader>
                <CardContent className="pt-3">
                  <SighTable rows={movementDetail.transferencias} />
                </CardContent>
              </Card>
              <Card className="border-border/70">
                <CardHeader className="border-b border-border/60 pb-2">
                  <CardTitle className="text-xs">Profesionales</CardTitle>
                </CardHeader>
                <CardContent className="pt-3">
                  <SighTable rows={movementDetail.profesionales} />
                </CardContent>
              </Card>
              <Card className="border-border/70">
                <CardHeader className="border-b border-border/60 pb-2">
                  <CardTitle className="text-xs">Procedimientos</CardTitle>
                </CardHeader>
                <CardContent className="pt-3">
                  <SighTable rows={movementDetail.procedimientos} />
                </CardContent>
              </Card>
              <Card className="border-border/70">
                <CardHeader className="border-b border-border/60 pb-2">
                  <CardTitle className="text-xs">DX/CQX</CardTitle>
                </CardHeader>
                <CardContent className="pt-3">
                  <SighTable rows={movementDetail.dxcqx} />
                </CardContent>
              </Card>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </SighPageShell>
  )
}
