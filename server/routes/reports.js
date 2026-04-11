import { Router } from 'express'
import { getCentroObstetricoReport } from '../services/centro-obstetrico-report.service.js'

export const reportsRouter = Router()

reportsRouter.get('/health', (_request, response) => {
  response.json({
    ok: true,
    service: 'legacy-api',
  })
})

reportsRouter.get('/reports/centro-obstetrico', async (request, response) => {
  try {
    const payload = await getCentroObstetricoReport(request.query)
    response.json(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo consultar Centro Obstetrico.'
    response.status(500).json({
      message,
    })
  }
})
