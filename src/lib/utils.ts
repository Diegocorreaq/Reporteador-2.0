import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { FilterFieldConfig } from '@/types/report'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function buildInitialFilterState(fields: FilterFieldConfig[]) {
  return Object.fromEntries(fields.map((field) => [field.id, '']))
}
