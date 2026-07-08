import { ProduccionProfesionalReport } from '@/modules/sigh/components/produccion-profesional-report'
import {
  downloadProduccionMedicosExcel,
  downloadProduccionMedicosPdf,
  getProduccionMedicosResumen,
  searchProduccionMedicos,
} from '@/modules/sigh/services/sigh-reports.service'

export function ProduccionMedicosPage() {
  return (
    <ProduccionProfesionalReport
      description="Producción de actividades realizadas y registradas por médico con detalle y exportación."
      professionalLabel="Médico"
      searchProfessionals={searchProduccionMedicos}
      getSummary={getProduccionMedicosResumen}
      downloadPdf={downloadProduccionMedicosPdf}
      downloadExcel={downloadProduccionMedicosExcel}
    />
  )
}
