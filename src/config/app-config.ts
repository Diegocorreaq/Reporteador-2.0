export const appConfig = {
  appName: 'Reporteador Next',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/legacy-api',
  legacyBasePath: import.meta.env.VITE_LEGACY_BASE_PATH ?? '/',
}
