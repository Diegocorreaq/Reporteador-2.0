import { useLocation } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { findLegacyModuleMapping } from '@/config/legacy-functional-map'

export function LegacyEmbedPage() {
  const location = useLocation()
  const mapping = findLegacyModuleMapping(location.pathname)

  if (!mapping?.powerBiUrl) {
    return (
      <section className="space-y-3 py-2">
        <Alert>No se encontro el enlace Power BI preservado para esta ruta.</Alert>
      </section>
    )
  }

  return (
    <section className="flex min-h-[calc(100vh-5.75rem)] flex-col gap-2">
      <iframe
        allowFullScreen
        className="block w-full rounded-[22px] border border-white/70 bg-white shadow-sm"
        frameBorder="0"
        scrolling="no"
        src={mapping.powerBiUrl}
        style={{ height: `max(${mapping.frameHeight ?? 800}px, calc(100vh - 8.5rem))` }}
        title={mapping.title}
      />
    </section>
  )
}
