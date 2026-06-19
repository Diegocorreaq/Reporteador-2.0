import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { Database, LayoutGrid, Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { resourceTypeLabels } from '@/config/navigation-catalog'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/modules/auth/store/use-auth-store'
import { searchCatalog } from '@/modules/inicio/utils/search'
import { menuService } from '@/services/menu/menu.service'

const MAX_RESULTS = 8

interface OrientationGlobalSearchProps {
  className?: string
}

export function OrientationGlobalSearch({ className }: OrientationGlobalSearchProps) {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const results = useMemo(
    () =>
      searchCatalog(query)
        .filter(({ resource }) => menuService.canAccessPermission(user, resource.permissionKey))
        .slice(0, MAX_RESULTS),
    [query, user],
  )

  const hasSearch = query.trim().length >= 2

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node

      if (!containerRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false)
      }
    }

    function handleShortcut(event: globalThis.KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
        window.setTimeout(() => inputRef.current?.focus(), 0)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleShortcut)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleShortcut)
    }
  }, [])

  function openSearch() {
    setOpen(true)
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  function closeSearch() {
    setOpen(false)
    setQuery('')
  }

  function selectResult(index: number) {
    const result = results[index]
    if (!result) return

    closeSearch()
    navigate(result.resource.route)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeSearch()
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => Math.min(current + 1, Math.max(results.length - 1, 0)))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => Math.max(current - 1, 0))
      return
    }

    if (event.key === 'Enter' && results.length > 0) {
      event.preventDefault()
      selectResult(activeIndex)
    }
  }

  return (
    <div className={cn('relative min-w-0 flex-1', className)} ref={containerRef}>
      <button
        aria-expanded={open}
        aria-label="Abrir Centro de orientación"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-white text-brand-strong transition hover:border-brand/40 hover:bg-brand-soft/30 sm:hidden"
        title="Centro de orientación"
        type="button"
        onClick={openSearch}
      >
        <Search className="h-4 w-4" />
      </button>

      <button
        aria-expanded={open}
        className="hidden h-8 w-full items-center gap-2 rounded-lg border border-border bg-canvas px-3 text-left text-xs text-muted transition hover:border-brand/40 hover:bg-white sm:flex"
        type="button"
        onClick={openSearch}
      >
        <Search className="h-3.5 w-3.5 shrink-0 text-brand" />
        <span className="min-w-0 flex-1 truncate">Buscar reportes, tableros o exportables...</span>
        <kbd className="hidden rounded border border-border bg-white px-1.5 py-0.5 font-sans text-[10px] text-muted lg:inline">
          Ctrl K
        </kbd>
      </button>

      {open ? createPortal(
        <div
          className="fixed left-1/2 top-16 z-[9999] w-[calc(100vw-2rem)] max-w-[620px] -translate-x-1/2 rounded-2xl border border-border bg-white p-3 shadow-2xl sm:w-[min(620px,calc(100vw-2rem))]"
          ref={panelRef}
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand" />
            <input
              ref={inputRef}
              aria-activedescendant={results[activeIndex] ? `orientation-result-${results[activeIndex].resource.id}` : undefined}
              aria-controls="orientation-global-results"
              aria-label="Buscar reportes, tableros y exportables"
              aria-expanded={open}
              aria-haspopup="listbox"
              autoComplete="off"
              className="h-10 w-full rounded-xl border border-border bg-canvas pl-10 pr-10 text-sm text-brand-strong placeholder:text-muted/70 focus:border-brand focus:ring-brand"
              placeholder="Escribe al menos dos letras..."
              role="combobox"
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setActiveIndex(0)
              }}
              onKeyDown={handleKeyDown}
            />
            {query ? (
              <button
                aria-label="Limpiar búsqueda"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted hover:bg-panelAlt hover:text-brand-strong"
                type="button"
                onClick={() => {
                  setQuery('')
                  setActiveIndex(0)
                  inputRef.current?.focus()
                }}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="mt-2 max-h-[min(420px,calc(100vh-8rem))] overflow-y-auto" id="orientation-global-results" role="listbox">
            {!hasSearch ? (
              <p className="px-3 py-5 text-center text-sm text-muted">
                Busca por nombre o intención, por ejemplo: camas, citas o emergencia.
              </p>
            ) : results.length === 0 ? (
              <p className="px-3 py-5 text-center text-sm text-muted">No encontramos recursos disponibles.</p>
            ) : (
              results.map(({ resource }, index) => {
                const WorkspaceIcon = resource.workspace === 'principal' ? LayoutGrid : Database

                return (
                  <button
                    aria-selected={index === activeIndex}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition',
                      index === activeIndex ? 'bg-brand-soft/70' : 'hover:bg-canvas',
                    )}
                    id={`orientation-result-${resource.id}`}
                    key={resource.id}
                    role="option"
                    type="button"
                    onClick={() => selectResult(index)}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-brand shadow-sm">
                      <WorkspaceIcon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-brand-strong">{resource.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {resource.workspaceLabel} · {resourceTypeLabels[resource.type]} · {resource.category}
                      </span>
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  )
}
