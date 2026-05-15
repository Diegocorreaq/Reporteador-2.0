import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '@/modules/auth/store/use-auth-store'
import { useOnboardingStore } from '@/modules/onboarding/store/use-onboarding-store'

const MAX_VIEWS = 3
const TOUR_VERSION = 'v1'
const STORAGE_PREFIX = `reporteador:onboarding:centro-orientacion:${TOUR_VERSION}`
const SESSION_PREFIX = `${STORAGE_PREFIX}:session-shown`

function getStoredViews(storageKey: string) {
  if (typeof window === 'undefined') return MAX_VIEWS

  const rawValue = window.localStorage.getItem(storageKey)
  const parsedValue = Number(rawValue ?? 0)

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0
}

function setStoredViews(storageKey: string, value: number) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKey, String(value))
}

function wasShownInSession(sessionKey: string) {
  if (typeof window === 'undefined') return true
  return window.sessionStorage.getItem(sessionKey) === '1'
}

function markShownInSession(sessionKey: string) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(sessionKey, '1')
}

function clearShownInSession(sessionKey: string) {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(sessionKey)
}

export function clearCentroOrientacionOnboardingSession() {
  if (typeof window === 'undefined') return

  Object.keys(window.sessionStorage)
    .filter((key) => key.startsWith(SESSION_PREFIX))
    .forEach((key) => window.sessionStorage.removeItem(key))
}

export function useCentroOrientacionOnboarding() {
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const manualRequest = useOnboardingStore((state) => state.centroOrientacionTourRequested)
  const [open, setOpen] = useState(false)
  const scheduledKeyRef = useRef<string | null>(null)
  const lastManualRequestRef = useRef(manualRequest)

  const userStorageId = user?.id ? user.id : 'anonymous'
  const storageKey = useMemo(() => `${STORAGE_PREFIX}:${userStorageId}`, [userStorageId])
  const sessionKey = useMemo(() => `${SESSION_PREFIX}:${userStorageId}`, [userStorageId])

  const closeTour = useCallback((skipPermanently = false) => {
    const nextViews = skipPermanently ? MAX_VIEWS : Math.min(getStoredViews(storageKey) + 1, MAX_VIEWS)
    setStoredViews(storageKey, nextViews)
    setOpen(false)
  }, [storageKey])

  const resetTour = useCallback(() => {
    clearShownInSession(sessionKey)
    markShownInSession(sessionKey)
    scheduledKeyRef.current = storageKey
    setOpen(true)
  }, [sessionKey, storageKey])

  useEffect(() => {
    if (manualRequest === lastManualRequestRef.current) return

    lastManualRequestRef.current = manualRequest
    resetTour()
  }, [manualRequest, resetTour])

  useEffect(() => {
    if (location.pathname !== '/app') {
      setOpen(false)
      return undefined
    }

    if (scheduledKeyRef.current === storageKey) {
      return undefined
    }

    if (getStoredViews(storageKey) >= MAX_VIEWS) {
      return undefined
    }

    if (wasShownInSession(sessionKey)) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      scheduledKeyRef.current = storageKey
      markShownInSession(sessionKey)
      setOpen(true)
    }, 700)

    return () => window.clearTimeout(timeoutId)
  }, [location.pathname, sessionKey, storageKey])

  return {
    open,
    closeTour,
    resetTour,
  }
}
