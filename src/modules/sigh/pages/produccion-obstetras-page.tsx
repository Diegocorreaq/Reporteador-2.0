import { ProduccionProfesionalReport } from '@/modules/sigh/components/produccion-profesional-report'
import {
  downloadProduccionObstetrasExcel,
  downloadProduccionObstetrasPdf,
  getProduccionObstetrasDetalle,
  getProduccionObstetrasResumen,
  searchProduccionObstetras,
} from '@/modules/sigh/services/sigh-reports.service'

export function ProduccionObstetrasPage() {
  return (
    <ProduccionProfesionalReport
      description="Producción de actividades realizadas y registradas por obstetra con exportación en PDF y Excel."
      professionalLabel="Obstetra"
      searchProfessionals={searchProduccionObstetras}
      getSummary={getProduccionObstetrasResumen}
      downloadPdf={downloadProduccionObstetrasPdf}
      downloadExcel={downloadProduccionObstetrasExcel}
      getDetail={getProduccionObstetrasDetalle}
    />
  )
}
