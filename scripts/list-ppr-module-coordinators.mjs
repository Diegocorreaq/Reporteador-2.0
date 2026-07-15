import { getCoordinadores } from '../server/services/ppr-data.service.js'
import { closeSqlPool } from '../server/db/sql-server.js'

async function main() {
  try {
    const coordinadores = await getCoordinadores()
    const rows = []

    for (const coord of coordinadores) {
      for (const program of coord.programas ?? []) {
        rows.push({
          programCode: program.code,
          programName: program.name,
          employeeName: coord.employeeName,
          dni: coord.dni,
          employeeId: coord.employeeId,
          activo: coord.activo,
        })
      }
    }

    rows.sort((a, b) => {
      const aNum = Number(a.programCode)
      const bNum = Number(b.programCode)
      const aKey = Number.isFinite(aNum) ? aNum : 999999
      const bKey = Number.isFinite(bNum) ? bNum : 999999
      return aKey - bKey
        || String(a.programCode).localeCompare(String(b.programCode))
        || String(a.employeeName).localeCompare(String(b.employeeName))
    })

    let currentProgram = null
    for (const row of rows) {
      const program = `${row.programCode} - ${row.programName}`
      if (program !== currentProgram) {
        currentProgram = program
        console.log(`\n${program}`)
      }
      console.log(`  - ${row.employeeName} | DNI ${row.dni} | employee_id ${row.employeeId}`)
    }
  } finally {
    await closeSqlPool()
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
