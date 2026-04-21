import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { buildEstanciaDisplayValue } from '@/modules/sigh/gestion-estancia-cama-normalizers'
import { SighFilterPanel } from '@/modules/sigh/components/sigh-filter-panel'
import { SighPageShell } from '@/modules/sigh/components/sigh-page-shell'
import {
  getCamasServicioInfo,
  getGestionEstanciaReport,
  listCamasServicios,
} from '@/modules/sigh/services/sigh-reports.service'
import type { EstanciaHospitalariaRow } from '@/modules/sigh/types'

interface ServicioOption {
  tipo: string
  nombre: string
}

const ESTANCIA_HEADERS = [
  'Servicio',
  'IdCuenta',
  'Nombre Paciente',
  'Edad',
  'Tipo Edad',
  'Fte. Fto.',
  'Dias Hosp',
  'Dias Serv',
  'Dx Ingreso',
  'Dx Evolucion 1',
  'Dx Evolucion 2',
]

export function GestionEstanciaCamaPage() {
  const [servicios, setServicios] = useState<ServicioOption[]>([])
  const [selectedServicio, setSelectedServicio] = useState('')
  const [rows, setRows] = useState<EstanciaHospitalariaRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasQueried, setHasQueried] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const options = await listCamasServicios()
        setServicios(options)
      } catch (serviceError) {
        console.warn('No se pudo cargar servicios de gestion de estancia.', serviceError)
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
    setHasQueried(true)
    setRows([])

    try {
      const info = await getCamasServicioInfo(selectedServicio)
      if (!info) {
        setRows([])
        return
      }

      const filters = {
        servicio: selectedServicio,
        tipo: String(info.tipo ?? '').trim(),
        idTipo: String(info.idTipo ?? info.idtipo ?? '').trim(),
      }

      const estanciaRows = await getGestionEstanciaReport(filters)
      setRows(estanciaRows)
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'No se pudo consultar gestion de estancia.'
      setError(message)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <SighPageShell
      description="Consulta nominal de estancia por cama, alineada a la pantalla legacy de gestioncama."
      error={error}
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
          <CardTitle className="text-sm">Estancia por Cama</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto rounded-md border border-border/70 bg-white">
            <table className="min-w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#eef5fb] text-[#123B63]">
                  {ESTANCIA_HEADERS.map((label) => (
                    <th key={label} className="border-b border-border px-2 py-1 text-left font-semibold">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length > 0 ? (
                  rows.map((row, index) => (
                    <tr key={`estancia-${index}`} className="odd:bg-white even:bg-[#f8fbff]">
                      <td className="border-b border-border/70 px-2 py-1">{row.servicio}</td>
                      <td className="border-b border-border/70 px-2 py-1">{row.idcuenta}</td>
                      <td className="border-b border-border/70 px-2 py-1">{row.paciente}</td>
                      <td className="border-b border-border/70 px-2 py-1">{row.edad}</td>
                      <td className="border-b border-border/70 px-2 py-1">{row.tedad}</td>
                      <td className="border-b border-border/70 px-2 py-1">{row.ffto}</td>
                      <td className="border-b border-border/70 px-2 py-1">{row.diash}</td>
                      <td className="border-b border-border/70 px-2 py-1">{buildEstanciaDisplayValue(row)}</td>
                      <td className="border-b border-border/70 px-2 py-1">{row.dxing1}</td>
                      <td className="border-b border-border/70 px-2 py-1">{row.dxevo1}</td>
                      <td className="border-b border-border/70 px-2 py-1">{row.dxevo2}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={ESTANCIA_HEADERS.length} className="px-3 py-5 text-center text-xs text-muted">
                      {loading
                        ? 'Consultando estancia por cama...'
                        : hasQueried
                          ? 'No se encuentran registros.'
                          : 'Seleccione un servicio y presione Consultar.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </SighPageShell>
  )
}
