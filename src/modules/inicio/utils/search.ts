import { navigationCatalog, type CatalogResource } from '@/config/navigation-catalog'

export interface SearchResult {
  resource: CatalogResource
  score: number
}

interface ResourceScore {
  score: number
  directScore: number
  categoryIntent: boolean
}

const pluralStemExceptions = new Set([
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'crisis',
  'analisis',
  'sintesis',
  'tesis',
  'dosis',
  'virus',
  'pais',
  'mes',
  'ingles',
  'frances',
  'diabetes',
  'sepsis',
  'herpes',
])

const shortAliasStopwords = new Set(['a', 'al', 'de', 'del', 'el', 'la', 'las', 'lo', 'los', 'o', 'u', 'y'])
const queryIntentStopwords = new Set([
  'buscar',
  'consultar',
  'encontrar',
  'necesito',
  'puedo',
  'querer',
  'quiero',
  'revisar',
  'saber',
  'sobre',
  'ver',
])

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

const validShortAliases = new Set(
  navigationCatalog.flatMap((resource) =>
    resource.aliases
      .flatMap((alias) => normalize(alias).split(/\s+/))
      .filter((token) => token.length > 0 && token.length < 3 && !shortAliasStopwords.has(token)),
  ),
)

const categoryNames = new Set(navigationCatalog.map((resource) => normalize(resource.category)))
const workspaceLabels = new Set(navigationCatalog.map((resource) => normalize(resource.workspaceLabel)))

function scoreField(normalized: string, query: string): number {
  if (normalized === query) return 100
  if (normalized.startsWith(query)) return 85
  if (normalized.includes(query)) return 60
  return 0
}

function stemPlural(token: string): string {
  if (pluralStemExceptions.has(token)) return token

  if (token.length > 5 && /[bcdfghjklmnñpqrstvwxyz]es$/.test(token)) {
    return token.slice(0, -2)
  }

  if (/[aeiou]s$/.test(token)) {
    return token.slice(0, -1)
  }

  return token
}

export function tokenize(text: string): string[] {
  return normalize(text)
    .split(/\s+/)
    .filter(Boolean)
    .map(stemPlural)
    .filter((token) => !queryIntentStopwords.has(token))
    .filter((token) => token.length >= 3 || validShortAliases.has(token))
}

function tokenMatches(fieldToken: string, queryToken: string): boolean {
  if (fieldToken.length < 3 || queryToken.length < 3) {
    return fieldToken === queryToken
  }

  return (
    fieldToken === queryToken ||
    fieldToken.startsWith(queryToken) ||
    queryToken.startsWith(fieldToken)
  )
}

function scoreTokenCoverage(field: string, query: string, fullMatchScore: number, partialMatchScore: number): number {
  const queryTokens = tokenize(query)
  if (queryTokens.length === 0) return 0

  const fieldTokens = tokenize(field)
  if (fieldTokens.length === 0) return 0

  const matches = queryTokens.filter((queryToken) =>
    fieldTokens.some((fieldToken) => tokenMatches(fieldToken, queryToken)),
  ).length

  if (matches === queryTokens.length) return fullMatchScore
  if (matches > 0) return partialMatchScore * (matches / queryTokens.length)

  return 0
}

function isCategoryIntent(category: string, query: string): boolean {
  const categoryNorm = normalize(category)
  const queryNorm = normalize(query)

  if (categoryNorm === queryNorm) return true
  if (categoryNames.has(queryNorm) && categoryNorm === queryNorm) return true

  const queryTokens = tokenize(query)
  if (queryTokens.length < 2) return false

  if (categoryNorm.startsWith(queryNorm) && queryNorm.length >= 4) return true

  const categoryTokens = tokenize(category)
  return queryTokens.every((queryToken) =>
    categoryTokens.some((categoryToken) => tokenMatches(categoryToken, queryToken)),
  )
}

function scoreResource(resource: CatalogResource, query: string): ResourceScore {
  if (!query) return { score: 0, directScore: 0, categoryIntent: false }

  const q = normalize(query)
  if (q.length < 2) return { score: 0, directScore: 0, categoryIntent: false }

  let score = 0
  let directScore = 0

  function applyFieldScore(value: string, exactWeight: number, fullTokenScore: number, partialTokenScore: number) {
    const normalized = normalize(value)
    const fieldScore = scoreField(normalized, q) * exactWeight
    const tokenScore = scoreTokenCoverage(value, q, fullTokenScore, partialTokenScore)
    const nextScore = Math.max(fieldScore, tokenScore)

    score = Math.max(score, nextScore)
    directScore = Math.max(directScore, nextScore)
  }

  function applyListScore(values: string[] | undefined, exactWeight: number, fullTokenScore: number, partialTokenScore: number) {
    if (!values || values.length === 0) return

    for (const value of values) {
      applyFieldScore(value, exactWeight, fullTokenScore, partialTokenScore)
    }

    applyFieldScore(values.join(' '), exactWeight * 0.9, fullTokenScore, partialTokenScore)
  }

  // Weighted fields by user intent relevance.
  applyFieldScore(resource.title, 1, 96, 46)
  applyListScore(resource.aliases, 0.95, 90, 42)
  applyListScore(resource.keywords, 0.82, 78, 36)
  applyListScore(resource.mainIndicators, 0.78, 74, 34)
  applyListScore(resource.questions, 0.72, 70, 31)
  if (resource.summary) applyFieldScore(resource.summary, 0.66, 64, 28)
  applyListScore(resource.filters, 0.58, 56, 24)

  // Category: lower weight
  const catNorm = normalize(resource.category)
  const catScore = scoreField(catNorm, q)
  const categoryScore = catScore * 0.5
  const categoryIntent = isCategoryIntent(resource.category, q)
  score = Math.max(score, categoryIntent ? Math.max(categoryScore, 50) : categoryScore)
  if (categoryIntent) directScore = Math.max(directScore, 50)

  applyFieldScore(resource.description, 0.48, 46, 20)
  applyListScore(resource.targetUsers, 0.42, 40, 18)
  applyListScore(resource.useCases, 0.38, 36, 16)

  // Legacy name
  if (resource.legacyName) {
    const legacyNorm = normalize(resource.legacyName)
    const legacyScore = scoreField(legacyNorm, q)
    score = Math.max(score, legacyScore * 0.9)
    directScore = Math.max(directScore, legacyScore * 0.9)
  }

  // Workspace label matches
  const workspaceLabelNorm = normalize(resource.workspaceLabel)
  if (workspaceLabelNorm === q) {
    score = Math.max(score, 25)
    directScore = Math.max(directScore, 25)
  }

  return { score, directScore, categoryIntent }
}

export function searchCatalog(query: string): SearchResult[] {
  const q = query.trim()
  if (!q || q.length < 2) return []

  const results: Array<SearchResult & { directScore: number; categoryIntent: boolean }> = []

  for (const resource of navigationCatalog) {
    const { score, directScore, categoryIntent } = scoreResource(resource, q)
    if (score >= 25) {
      results.push({ resource, score, directScore, categoryIntent })
    }
  }

  const categoryResults = results.filter((result) => result.categoryIntent)
  if (categoryResults.length > 0) {
    return categoryResults
      .sort((a, b) => b.score - a.score)
      .map(({ resource, score }) => ({ resource, score }))
  }

  const hasPreciseResults = results.some((result) => result.directScore >= 50)
  const filteredResults = hasPreciseResults
    ? results.filter((result) => result.directScore >= 30)
    : results

  const sortedResults = filteredResults
    .sort((a, b) => b.score - a.score)
    .map(({ resource, score }) => ({ resource, score }))

  if (workspaceLabels.has(normalize(q))) {
    return sortedResults.slice(0, 15)
  }

  return sortedResults
}

export function getQuickSuggestions(): string[] {
  return [
    'camas',
    'emergencia',
    'consulta externa',
    'hospitalización',
    'referencias',
    'IAAS',
    'salud mental',
    'citas',
    'diagnósticos frecuentes',
    'centro quirúrgico',
    'laboratorio',
    'imagenología',
    'indicadores',
    'accidentes de tránsito',
    'enfermería',
  ]
}

export function getFeaturedResources(): CatalogResource[] {
  return navigationCatalog.filter((r) => r.featured)
}
