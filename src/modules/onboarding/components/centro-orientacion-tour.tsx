import { useCallback, useEffect, useMemo, useState } from 'react'
import { Compass, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CentroOrientacionTourProps {
  open: boolean
  onClose: (skipPermanently?: boolean) => void
}

interface TourStep {
  title: string
  description: string
  target?: string
}

interface HighlightRect {
  top: number
  left: number
  width: number
  height: number
}

type CardPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center'

interface CardPosition {
  top: number
  left: number
  width: number
  placement: CardPlacement
}

const CARD_WIDTH = 400
const CARD_MARGIN = 16
const CARD_GAP = 22
const ESTIMATED_CARD_HEIGHT = 292
const HIGHLIGHT_PADDING = 7

const steps: TourStep[] = [
  {
    title: 'Bienvenido al Centro de orientación',
    description: 'Encuentra reportes, tableros, monitoreos y exportables desde un solo lugar, sin recorrer todo el menú.',
  },
  {
    target: 'orientation-search',
    title: 'Usa el buscador principal',
    description:
      'Escribe una palabra clave como camas, dengue, salud mental, producción o tickets para encontrar recursos relacionados.',
  },
  {
    target: 'orientation-suggestions',
    title: 'Prueba las búsquedas sugeridas',
    description: 'Usa estas etiquetas para consultar temas frecuentes sin escribir todo el nombre del reporte.',
  },
  {
    target: 'orientation-intents',
    title: 'Explora por tipo de necesidad',
    description: 'Elige qué necesitas hacer y el Reporteador te mostrará recursos relacionados.',
  },
  {
    target: 'orientation-frequent',
    title: 'Ingresa rápido a reportes frecuentes',
    description: 'Aquí encontrarás accesos destacados o de uso habitual para entrar más rápido.',
  },
  {
    target: 'orientation-top-actions',
    title: 'Accede a manuales y solicitudes',
    description: 'Desde aquí puedes abrir manuales, revisar tutoriales o registrar una solicitud de información.',
  },
]

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getViewportSize() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  }
}

function getTargetElement(target?: string) {
  if (!target || typeof document === 'undefined') return null
  return document.querySelector<HTMLElement>(`[data-tour="${target}"]`)
}

function getHighlightRect(element: HTMLElement): HighlightRect {
  const rect = element.getBoundingClientRect()
  const viewport = getViewportSize()

  return {
    top: clamp(rect.top - HIGHLIGHT_PADDING, CARD_MARGIN, viewport.height - CARD_MARGIN),
    left: clamp(rect.left - HIGHLIGHT_PADDING, CARD_MARGIN, viewport.width - CARD_MARGIN),
    width: Math.min(viewport.width - CARD_MARGIN * 2, rect.width + HIGHLIGHT_PADDING * 2),
    height: Math.min(viewport.height - CARD_MARGIN * 2, rect.height + HIGHLIGHT_PADDING * 2),
  }
}

function getCardPosition(rect: HighlightRect | null): CardPosition | null {
  if (typeof window === 'undefined' || !rect) return null

  const viewport = getViewportSize()
  const cardWidth = Math.min(CARD_WIDTH, viewport.width - CARD_MARGIN * 2)
  const cardHeight = Math.min(ESTIMATED_CARD_HEIGHT, viewport.height - CARD_MARGIN * 2)
  const maxCardTop = Math.max(CARD_MARGIN, viewport.height - cardHeight - CARD_MARGIN)
  const spaceBelow = viewport.height - rect.top - rect.height
  const spaceAbove = rect.top
  const spaceRight = viewport.width - rect.left - rect.width
  const spaceLeft = rect.left
  const centeredLeft = clamp(rect.left + rect.width / 2 - cardWidth / 2, CARD_MARGIN, viewport.width - cardWidth - CARD_MARGIN)

  if (spaceBelow >= cardHeight + CARD_GAP + CARD_MARGIN) {
    return {
      placement: 'bottom',
      top: rect.top + rect.height + CARD_GAP,
      left: centeredLeft,
      width: cardWidth,
    }
  }

  if (spaceAbove >= cardHeight + CARD_GAP + CARD_MARGIN) {
    return {
      placement: 'top',
      top: rect.top - cardHeight - CARD_GAP,
      left: centeredLeft,
      width: cardWidth,
    }
  }

  if (spaceRight >= cardWidth + CARD_GAP + CARD_MARGIN && viewport.width >= 768) {
    return {
      placement: 'right',
      top: clamp(rect.top + rect.height / 2 - cardHeight / 2, CARD_MARGIN, maxCardTop),
      left: rect.left + rect.width + CARD_GAP,
      width: cardWidth,
    }
  }

  if (spaceLeft >= cardWidth + CARD_GAP + CARD_MARGIN && viewport.width >= 768) {
    return {
      placement: 'left',
      top: clamp(rect.top + rect.height / 2 - cardHeight / 2, CARD_MARGIN, maxCardTop),
      left: rect.left - cardWidth - CARD_GAP,
      width: cardWidth,
    }
  }

  return {
    placement: 'center',
    top: clamp(viewport.height - cardHeight - CARD_MARGIN, CARD_MARGIN, maxCardTop),
    left: CARD_MARGIN,
    width: viewport.width - CARD_MARGIN * 2,
  }
}

function getArrowClass(placement: CardPlacement) {
  switch (placement) {
    case 'bottom':
      return '-top-2 left-8 border-x-8 border-b-8 border-x-transparent border-b-white'
    case 'top':
      return '-bottom-2 left-8 border-x-8 border-t-8 border-x-transparent border-t-white'
    case 'right':
      return '-left-2 top-8 border-y-8 border-r-8 border-y-transparent border-r-white'
    case 'left':
      return '-right-2 top-8 border-y-8 border-l-8 border-y-transparent border-l-white'
    default:
      return 'hidden'
  }
}

export function CentroOrientacionTour({ open, onClose }: CentroOrientacionTourProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null)
  const [cardPosition, setCardPosition] = useState<CardPosition | null>(null)
  const currentStep = steps[stepIndex]
  const isFirstStep = stepIndex === 0
  const isLastStep = stepIndex === steps.length - 1
  const isWelcomeStep = !currentStep.target

  const cardStyle = useMemo(
    () => {
      if (!cardPosition) return undefined

      return {
        top: cardPosition.top,
        left: cardPosition.left,
        width: cardPosition.width,
      }
    },
    [cardPosition],
  )

  const closeTour = useCallback((skipPermanently = false) => {
    onClose(skipPermanently)
  }, [onClose])

  const goNext = useCallback(() => {
    setStepIndex((value) => Math.min(value + 1, steps.length - 1))
  }, [])

  const goPrevious = useCallback(() => {
    setStepIndex((value) => Math.max(value - 1, 0))
  }, [])

  const updatePosition = useCallback(() => {
    const targetElement = getTargetElement(currentStep.target)

    if (!targetElement) {
      setHighlightRect(null)
      setCardPosition(null)
      return
    }

    const nextRect = getHighlightRect(targetElement)
    setHighlightRect(nextRect)
    setCardPosition(getCardPosition(nextRect))
  }, [currentStep.target])

  useEffect(() => {
    if (!open) return
    setStepIndex(0)
  }, [open])

  useEffect(() => {
    if (!open) return undefined

    const targetElement = getTargetElement(currentStep.target)
    targetElement?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center',
    })

    const timeoutId = window.setTimeout(updatePosition, targetElement ? 360 : 0)

    return () => window.clearTimeout(timeoutId)
  }, [currentStep.target, open, updatePosition])

  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeTour()
        return
      }

      if (event.key === 'ArrowRight' || event.key === 'Enter') {
        event.preventDefault()
        if (isLastStep) {
          closeTour()
        } else {
          goNext()
        }
        return
      }

      if (event.key === 'ArrowLeft' && !isFirstStep) {
        event.preventDefault()
        goPrevious()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeTour, goNext, goPrevious, isFirstStep, isLastStep, open])

  useEffect(() => {
    if (!open) return undefined

    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, updatePosition])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90]">
      <div
        className={cn(
          'absolute inset-0 bg-slate-900/55 transition-opacity duration-200 ease-out',
          highlightRect && 'bg-transparent',
        )}
      />

      {highlightRect && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-2xl bg-transparent ring-2 ring-cyan-100/90 transition-all duration-200 ease-out"
          style={{
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
            boxShadow:
              '0 0 0 9999px rgb(15 23 42 / 0.55), 0 0 0 6px rgb(14 116 144 / 0.20), 0 18px 45px rgb(8 47 73 / 0.16)',
          }}
        />
      )}

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="centro-orientacion-tour-title"
        aria-describedby="centro-orientacion-tour-description"
        className={cn(
          'fixed max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] overflow-visible rounded-2xl border border-border bg-white text-brand shadow-2xl transition-all duration-200 ease-out',
          isWelcomeStep ? 'max-w-lg p-6 sm:p-7' : 'max-w-[400px] p-5',
          !cardPosition && 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
        )}
        style={cardStyle}
      >
        {cardPosition && cardPosition.placement !== 'center' && (
          <span aria-hidden="true" className={cn('absolute h-0 w-0 drop-shadow-sm', getArrowClass(cardPosition.placement))} />
        )}

        <div className="max-h-[calc(100vh-3rem)] overflow-auto">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className={cn('min-w-0', isWelcomeStep && 'flex items-center gap-3')}>
              {isWelcomeStep && (
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-soft">
                  <Compass className="h-6 w-6 text-brand" />
                  <img
                    alt=""
                    className="absolute inset-0 m-auto h-11 w-11 object-contain"
                    src="/oso_estadistico.webp"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-brand">Guía rápida</p>
                <h2
                  id="centro-orientacion-tour-title"
                  className={cn('mt-1 font-bold leading-tight text-brand-strong', isWelcomeStep ? 'text-2xl' : 'text-lg')}
                >
                  {currentStep.title}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => closeTour()}
              aria-label="Cerrar guía"
              className="rounded-lg p-1.5 text-muted transition hover:bg-panelAlt hover:text-brand-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p id="centro-orientacion-tour-description" className={cn('leading-6 text-muted', isWelcomeStep ? 'text-base' : 'text-sm')}>
            {currentStep.description}
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1.5" aria-label={`Paso ${stepIndex + 1} de ${steps.length}`}>
              {steps.map((step) => (
                <span
                  key={step.title}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-200',
                    step.title === currentStep.title ? 'w-5 bg-brand' : 'w-1.5 bg-border',
                  )}
                />
              ))}
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" className="px-2 text-muted" onClick={() => closeTour(true)}>
                Omitir guía
              </Button>
              {!isFirstStep && (
                <Button type="button" variant="outline" size="sm" onClick={goPrevious}>
                  Anterior
                </Button>
              )}
              {isLastStep ? (
                <Button type="button" variant="brand" size="sm" onClick={() => closeTour()}>
                  Entendido
                </Button>
              ) : (
                <Button type="button" variant="brand" size="sm" onClick={goNext}>
                  {isFirstStep ? 'Comenzar recorrido' : 'Siguiente'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
