import { useLocation } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { findLegacyModuleMapping } from '@/config/legacy-functional-map'

export function LegacyEmbedPage() {
  const location = useLocation()
  const mapping = findLegacyModuleMapping(location.pathname)

  if (!mapping?.powerBiUrl) {
    return (
      <section className="py-4">
        <Alert variant="warning">
          No se encontro el enlace Power BI preservado para esta ruta.
        </Alert>
      </section>
    )
  }

  return (
    <section className="flex min-h-[calc(100vh-6rem)] flex-col">
      <iframe
        allowFullScreen
        className="block w-full flex-1 rounded-xl border border-border bg-white shadow-sm"
        frameBorder="0"
        scrolling="no"
        src={mapping.powerBiUrl}
        style={{ minHeight: `${mapping.frameHeight ?? 800}px` }}
        title={mapping.title}
      />
    </section>
  )
}
