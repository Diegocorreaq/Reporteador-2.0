import { readFileSync } from 'node:fs'
import { getSqlPool, closeSqlPool } from '../server/db/sql-server.js'

const oldQueryPath = 'C:/Users/diego.correa/.codex/attachments/fe5e9e31-a54c-4f87-bffd-673a9a0a4dda/pasted-text.txt'

function stripHeader(query) {
  return query
    .replace(/^\s*use\s+SIGH_DEPURA\s*/i, '')
    .replace(/DECLARE\s+@FECHAINICIO\s+DATE\s*=\s*'[^']+'\s*/i, '')
    .replace(/DECLARE\s+@FECHAFIN\s+DATE\s*=\s*'[^']+'\s*/i, '')
}

function removeCommentsAndStringsForScan(sql) {
  return sql
    .replace(/'([^']|'')*'/g, (match) => ' '.repeat(match.length))
    .replace(/--.*$/gm, (match) => ' '.repeat(match.length))
    .replace(/\/\*[\s\S]*?\*\//g, (match) => ' '.repeat(match.length))
}

function splitTopLevelUnion(sql) {
  const scan = removeCommentsAndStringsForScan(sql)
  const parts = []
  let depth = 0
  let start = 0
  for (let index = 0; index < scan.length; index += 1) {
    const char = scan[index]
    if (char === '(') depth += 1
    if (char === ')') depth = Math.max(depth - 1, 0)
    if (depth === 0 && /^UNION\s+ALL\b/i.test(scan.slice(index))) {
      parts.push(sql.slice(start, index).trim())
      const match = scan.slice(index).match(/^UNION\s+ALL\b/i)
      index += match[0].length - 1
      start = index + 1
    }
  }
  parts.push(sql.slice(start).trim())
  return parts.filter(Boolean)
}

function labelFor(part, index) {
  return part.match(/SELECT\s+'([^']+)'/i)?.[1]
    ?? part.match(/--\s*([^\r\n]+)/)?.[1]
    ?? `Bloque ${index + 1}`
}

const body = stripHeader(readFileSync(oldQueryPath, 'utf8'))
const parts = splitTopLevelUnion(body)
const pool = await getSqlPool('general')

try {
  console.log(`Bloques detectados: ${parts.length}`)
  for (const [index, part] of parts.entries()) {
    const label = labelFor(part, index)
    const request = pool.request()
    request.timeout = 20000
    const start = Date.now()
    try {
      const result = await request.query(`
        DECLARE @FECHAINICIO DATE = '20260401';
        DECLARE @FECHAFIN DATE = '20260430';
        ${part}
      `)
      const seconds = ((Date.now() - start) / 1000).toFixed(2)
      const row = result.recordset[0] ?? {}
      const total = Number(row.TOTAL ?? row.Total ?? row.total ?? 0)
      console.log(`${String(index + 1).padStart(2, '0')} OK ${seconds}s | ${total} | ${label}`)
    } catch (error) {
      const seconds = ((Date.now() - start) / 1000).toFixed(2)
      console.log(`${String(index + 1).padStart(2, '0')} SLOW ${seconds}s | ${label} | ${error.code ?? error.message}`)
    }
  }
} finally {
  await closeSqlPool('general')
}
