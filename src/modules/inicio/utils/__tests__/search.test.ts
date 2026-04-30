import { searchCatalog, tokenize } from '../search'

function titlesFor(query: string): string[] {
  return searchCatalog(query).map((result) => result.resource.title)
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

function assertDeepEqual<T>(actual: T, expected: T, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}. Actual: ${JSON.stringify(actual)}`)
  }
}

const indicatorResults = searchCatalog('indicadores hospitalarios')
assertDeepEqual(
  indicatorResults.map((result) => result.resource.category),
  ['Indicadores Hospitalarios', 'Indicadores Hospitalarios', 'Indicadores Hospitalarios'],
  'indicadores hospitalarios debe devolver exactamente sus 3 recursos',
)

const camasTitles = titlesFor('camas')
assert(camasTitles.includes('Monitoreo de Camas'), 'camas debe incluir Monitoreo de Camas')
assert(camasTitles.includes('Resumen de Camas'), 'camas debe incluir Resumen de Camas')
assert(camasTitles.includes('Porcentaje de Ocupación Cama'), 'camas debe incluir Porcentaje de Ocupación Cama')
assert(camasTitles.includes('Gestión Estancia Cama'), 'camas debe incluir Gestión Estancia Cama')

const ceTitles = titlesFor('ce')
assert(ceTitles.includes('Consulta Externa'), 'ce debe encontrar Consulta Externa')
assert(ceTitles.some((title) => title.includes('Consulta Externa')), 'ce debe incluir recursos de Consulta Externa')

assert(searchCatalog('reporteador').length <= 15, 'reporteador no debe devolver más de 15 resultados')

const neonatologiaResults = searchCatalog('neonatología')
assert(neonatologiaResults.length > 0, 'neonatología debe devolver resultados')
assert(
  neonatologiaResults.every((result) => result.resource.category === 'Neonatología'),
  'neonatología debe devolver solo recursos de su categoría',
)

assertDeepEqual(tokenize('lunes'), ['lunes'], 'lunes no debe stemmizarse a lun')
assertDeepEqual(searchCatalog('lunes'), [], 'lunes no debe devolver módulos si no hay relación')

console.info('search.test.ts: 6 assertions groups passed')
