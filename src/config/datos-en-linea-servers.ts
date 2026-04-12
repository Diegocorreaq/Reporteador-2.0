export interface DatosEnLineaServerConfig {
  id: string
  label: string
  description: string
  href: string
  external: true
  available: boolean
}

function sanitize(value: string | undefined) {
  return value?.trim() ?? ''
}

function buildServerConfig(index: 1 | 2): DatosEnLineaServerConfig {
  const env = import.meta.env
  const label = sanitize(env[`VITE_DATOS_EN_LINEA_SERVER_${index}_NAME`]) || `Servidor ${index}`
  const description =
    sanitize(env[`VITE_DATOS_EN_LINEA_SERVER_${index}_DESCRIPTION`]) ||
    'Servidor de consulta de Datos en Linea.'
  const href = sanitize(env[`VITE_DATOS_EN_LINEA_SERVER_${index}_URL`])

  return {
    id: `datos-en-linea-server-${index}`,
    label,
    description,
    href,
    external: true,
    available: Boolean(href),
  }
}

export const datosEnLineaServers: DatosEnLineaServerConfig[] = [
  buildServerConfig(1),
  buildServerConfig(2),
]

