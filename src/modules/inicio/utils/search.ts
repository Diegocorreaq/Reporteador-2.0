import { navigationCatalog, type CatalogResource } from '@/config/navigation-catalog'

export interface SearchResult {
  resource: CatalogResource
  score: number
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

function scoreResource(resource: CatalogResource, query: string): number {
  if (!query) return 0

  const q = normalize(query)
  if (q.length < 2) return 0

  let score = 0

  // Title: highest weight
  const titleNorm = normalize(resource.title)
  const titleScore = scoreField(titleNorm, q)
  score = Math.max(score, titleScore * 1.0)

  // Aliases: very high weight (user-facing intent terms)
  for (const alias of resource.aliases) {
    const aliasNorm = normalize(alias)
    const aliasScore = scoreField(aliasNorm, q)
    score = Math.max(score, aliasScore * 0.95)
  }

  // Keywords: medium weight (also handles plural/stem variations)
  for (const kw of resource.keywords) {
    const kwNorm = normalize(kw)
    if (kwNorm === q) score = Math.max(score, 70)
    else if (kwNorm.startsWith(q)) score = Math.max(score, 50)
    else if (q.startsWith(kwNorm) && kwNorm.length >= 4) score = Math.max(score, 45)
    else if (kwNorm.includes(q)) score = Math.max(score, 35)
    else if (q.includes(kwNorm) && kwNorm.length >= 4) score = Math.max(score, 30)
  }

  // Category: lower weight
  const catNorm = normalize(resource.category)
  const catScore = scoreField(catNorm, q)
  score = Math.max(score, catScore * 0.5)

  // Description: lowest weight
  const descNorm = normalize(resource.description)
  if (descNorm.includes(q)) score = Math.max(score, 25)

  // Legacy name
  if (resource.legacyName) {
    const legacyNorm = normalize(resource.legacyName)
    const legacyScore = scoreField(legacyNorm, q)
    score = Math.max(score, legacyScore * 0.9)
  }

  // Workspace label matches
  const workspaceLabelNorm = normalize(resource.workspaceLabel)
  if (workspaceLabelNorm.includes(q)) score = Math.max(score, 15)

  return score
}

export function searchCatalog(query: string): SearchResult[] {
  const q = query.trim()
  if (!q || q.length < 2) return []

  const results: SearchResult[] = []

  for (const resource of navigationCatalog) {
    const score = scoreResource(resource, q)
    if (score >= 15) {
      results.push({ resource, score })
    }
  }

  return results.sort((a, b) => b.score - a.score)
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
