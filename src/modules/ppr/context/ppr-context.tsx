import { createContext, useContext } from 'react'

export interface PprUser {
  employeeId: number
  employeeName: string
  role: 'coordinador' | 'admin' | 'consulta'
}

interface PprContextValue {
  pprUser: PprUser
}

export const PprContext = createContext<PprContextValue | null>(null)

export function usePprContext() {
  const ctx = useContext(PprContext)
  if (!ctx) throw new Error('usePprContext must be used inside PprShell')
  return ctx
}
