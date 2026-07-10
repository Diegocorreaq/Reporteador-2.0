import { getSqlPool, closeSqlPool } from '../server/db/sql-server.js'

const pool = await getSqlPool('general')
const start = Date.now()

try {
  const request = pool.request()
  request.timeout = 300000
  const result = await request.query(`
    EXEC dbo.usp_PPR_0018
      @FechaInicio = '2026-04-01',
      @FechaFin = '2026-04-30';
  `)
  const elapsedMs = Date.now() - start
  const rows = result.recordset.map((row) => ({
    actividad: String(row.ACTIVIDAD ?? row.Actividad ?? row.actividad ?? ''),
    total: Number(row.TOTAL ?? row.Total ?? row.total ?? 0),
  }))
  const cardiovascular = rows.find((row) => row.actividad.includes('5001608'))
  console.log(JSON.stringify({
    seconds: Number((elapsedMs / 1000).toFixed(2)),
    rows: rows.length,
    cardiovascular,
  }, null, 2))
} finally {
  await closeSqlPool('general')
}
