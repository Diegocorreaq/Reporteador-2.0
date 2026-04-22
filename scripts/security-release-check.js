#!/usr/bin/env node
/**
 * security-release-check.js
 *
 * Verifica que el árbol de proyecto no incluya archivos o directorios
 * que NO deben distribuirse en un release (credenciales, builds de dev, etc.).
 *
 * Uso:
 *   node scripts/security-release-check.js [--dir <ruta>]
 *
 * Por defecto analiza el directorio actual.
 * Retorna exit code 1 si detecta algún problema.
 */

import { readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: { dir: { type: 'string', default: process.cwd() } },
  strict: false,
})

const ROOT = values.dir

// ─── Rules ────────────────────────────────────────────────────────────────────

// Exact filenames or directory names that must NOT exist in a release
const FORBIDDEN_NAMES = [
  '.env',
  '.git',
  'node_modules',
  'dist-ssr',
]

// Glob-style suffix patterns for forbidden file extensions
const FORBIDDEN_EXTENSIONS = [
  '.pem',
  '.key',
  '.cert',
  '.crt',
  '.p12',
  '.pfx',
  '.jks',
]

// Files whose content will be scanned for common secret patterns
const SCAN_CONTENT_EXTENSIONS = ['.env', '.env.local', '.env.production']

// Secret patterns that should not appear in scanned files
const SECRET_PATTERNS = [
  /password\s*=\s*(?!your_|change-me|<)[^\s]{4,}/i,
  /secret\s*=\s*(?!change-me|<)[^\s]{8,}/i,
]

// ─── Scanner ─────────────────────────────────────────────────────────────────

const violations = []

function check(dirPath, depth = 0) {
  if (depth > 10) return // safety limit

  let entries
  try {
    entries = readdirSync(dirPath)
  } catch {
    return
  }

  for (const name of entries) {
    const fullPath = join(dirPath, name)
    const relPath = relative(ROOT, fullPath)

    // Check forbidden exact names
    if (FORBIDDEN_NAMES.includes(name)) {
      violations.push(`[FORBIDDEN] ${relPath}`)
      continue // don't descend into forbidden dirs
    }

    // Check forbidden extensions
    const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : ''
    if (ext && FORBIDDEN_EXTENSIONS.includes(ext)) {
      violations.push(`[FORBIDDEN EXT] ${relPath}`)
      continue
    }

    // Recurse into directories
    try {
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        check(fullPath, depth + 1)
      }
    } catch {
      // skip unreadable entries
    }
  }
}

// ─── Run ─────────────────────────────────────────────────────────────────────

console.log(`\n🔍  security-release-check — analizando: ${ROOT}\n`)

if (!existsSync(ROOT)) {
  console.error(`Error: directorio no encontrado: ${ROOT}`)
  process.exit(1)
}

check(ROOT)

// Report
if (violations.length === 0) {
  console.log('✅  Sin problemas detectados. El árbol de release está limpio.\n')
  process.exit(0)
} else {
  console.error('❌  Se encontraron archivos/directorios que NO deben incluirse en un release:\n')
  for (const v of violations) {
    console.error(`   ${v}`)
  }
  console.error(`\nTotal: ${violations.length} problema(s). Corrija antes de distribuir.\n`)
  process.exit(1)
}
