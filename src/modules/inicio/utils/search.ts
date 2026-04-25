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

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function scoreField(normalized: string, query: string): number {
  if (normalized === query) return 100
  if (normalized.startsWith(query)) return 85
  if (normalized.includes(query)) return 60
  return 0
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/\s+/)
    .map((token) => token.replace(/s$/, ''))
    .filter((token) => token.length >= 3)
}

function isCategoryIntent(category: string, query: string): boolean {
  const categoryNorm = normalize(category)
  const queryNorm = normalize(query)

  if (categoryNorm === queryNorm) return true
  if (categoryNorm.startsWith(queryNorm) && queryNorm.length >= 4) return true

  const queryTokens = tokenize(query)
  if (queryTokens.length < 2) return false

  const categoryTokens = tokenize(category)
  return queryTokens.every((queryToken) =>
    categoryTokens.some(
      (categoryToken) =>
        categoryToken === queryToken ||
        categoryToken.startsWith(queryToken) ||
        queryToken.startsWith(categoryToken),
    ),
  )
}

function scoreResource(resource: CatalogResource, query: string): ResourceScore {
  if (!query) return { score: 0, directScore: 0, categoryIntent: false }

  const q = normalize(query)
  if (q.length < 2) return { score: 0, directScore: 0, categoryIntent: false }

  let score = 0
  let directScore = 0

  // Title: highest weight
  const titleNorm = normalize(resource.title)
  const titleScore = scoreField(titleNorm, q)
  score = Math.max(score, titleScore * 1.0)
  directScore = Math.max(directScore, titleScore * 1.0)

  // Aliases: very high weight (user-facing intent terms)
  for (const alias of resource.aliases) {
    const aliasNorm = normalize(alias)
    const aliasScore = scoreField(aliasNorm, q)
    score = Math.max(score, aliasScore * 0.95)
    directScore = Math.max(directScore, aliasScore * 0.95)
  }

  // Keywords: medium weight (also handles plural/stem variations)
  for (const kw of resource.keywords) {
    const kwNorm = normalize(kw)
    let keywordScore = 0

    if (kwNorm === q) keywordScore = 70
    else if (kwNorm.startsWith(q)) keywordScore = 50
    else if (q.startsWith(kwNorm) && kwNorm.length >= 4) keywordScore = 45
    else if (kwNorm.includes(q)) keywordScore = 35
    else if (q.includes(kwNorm) && kwNorm.length >= 4) keywordScore = 30

    score = Math.max(score, keywordScore)
    directScore = Math.max(directScore, keywordScore)
  }

  // Category: lower weight
  const catNorm = normalize(resource.category)
  const catScore = scoreField(catNorm, q)
  const categoryScore = catScore * 0.5
  const categoryIntent = isCategoryIntent(resource.category, q)
  score = Math.max(score, categoryIntent ? Math.max(categoryScore, 50) : categoryScore)
  if (categoryIntent) directScore = Math.max(directScore, 50)

  // Description: lowest weight
  const descNorm = normalize(resource.description)
  if (descNorm.includes(q)) {
    score = Math.max(score, 25)
    directScore = Math.max(directScore, 25)
  }

  // Legacy name
  if (resource.legacyName) {
    const legacyNorm = normalize(resource.legacyName)
    const legacyScore = scoreField(legacyNorm, q)
    score = Math.max(score, legacyScore * 0.9)
    directScore = Math.max(directScore, legacyScore * 0.9)
  }

  // Workspace label matches
  const workspaceLabelNorm = normalize(resource.workspaceLabel)
  if (workspaceLabelNorm.includes(q)) score = Math.max(score, 15)

  return { score, directScore, categoryIntent }
}

export function searchCatalog(query: string): SearchResult[] {
  const q = query.trim()
  if (!q || q.length < 2) return []

  const results: Array<SearchResult & { directScore: number; categoryIntent: boolean }> = []

  for (const resource of navigationCatalog) {
    const { score, directScore, categoryIntent } = scoreResource(resource, q)
    if (score >= 15) {
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

  return filteredResults
    .sort((a, b) => b.score - a.score)
    .map(({ resource, score }) => ({ resource, score }))
}

export function getQuickSuggestions(): string[] {
  return [
    'camas',
    'hospitalizados',
    'producción médicos',
    'salud mental',
    'fallecidos',
    'epidemiología',
    'lavado de manos',
    'tickets',
    'historias clínicas',
    'alta médica',
    'indicadores',
  ]
}

export function getFeaturedResources(): CatalogResource[] {
  return navigationCatalog.filter((r) => r.featured)
}
