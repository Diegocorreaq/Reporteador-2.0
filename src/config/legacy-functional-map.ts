import type { WorkspaceKey } from '@/types/auth'

export type LegacyModuleType = 'powerbi' | 'exportable' | 'formulario' | 'tabla' | 'dashboard' | 'externo'

export interface LegacyModuleMapping {
  workspace: WorkspaceKey
  path: string
  legacyRoute: string
  moduleType: LegacyModuleType
  title: string
  powerBiUrl?: string
  frameHeight?: number
}

export interface LegacyQuickLinkMapping {
  key: string
  label: string
  href: string
  openInNewTab: boolean
}

export const legacyQuickLinks: LegacyQuickLinkMapping[] = [
 
  {
    key: 'manuales',
    label: 'Ver Manuales y Tutoriales',
    href: 'https://recursos.heves.gob.pe/',
    openInNewTab: true,
  },
  {
    key: 'formulario',
    label: 'Formulario de solicitud de informacion',
    href: 'https://docs.google.com/forms/d/e/1FAIpQLSe2MFZojk3J2nIPS_UCGmDIHjID3s1qwDb9OYEvG6XwG2fKew/viewform',
    openInNewTab: true,
  },
]

export const legacyPowerBiModules: LegacyModuleMapping[] = [
  {
    workspace: 'main',
    path: 'indicadores-hospitalarios/indicadores-de-eficiencia',
    legacyRoute: '/indicador/eficiencia',
    moduleType: 'powerbi',
    title: 'Indicadores de Eficiencia',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiYmEzNzBhNGEtNjIyNC00YzNkLWIxZTktMTM2OTRiOWY0MThkIiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 800,
  },
  {
    workspace: 'main',
    path: 'indicadores-hospitalarios/indicadores-de-eficacia',
    legacyRoute: '/indicador/eficacia',
    moduleType: 'powerbi',
    title: 'Indicadores de Eficacia',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiMTFhM2VkM2EtYjIxOC00ZWNhLThjZGEtM2I3YjhmMTBjZGNmIiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 800,
  },
  {
    workspace: 'main',
    path: 'indicadores-hospitalarios/indicadores-de-calidad',
    legacyRoute: '/indicador/calidad',
    moduleType: 'powerbi',
    title: 'Indicadores de Calidad',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiZDk3NzQ2YmQtYmMxYS00NDAzLTk4MGEtNThlOWRlYWYyMDJmIiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 800,
  },
  {
    workspace: 'main',
    path: 'atencion-ambulatoria-hospitalizacion/consulta-externa',
    legacyRoute: '/upss/produccion',
    moduleType: 'powerbi',
    title: 'Consulta Externa',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiZTk3MDVlMzUtZmQ4NS00MzljLWE1NTEtMThlMzk5YzQ4YjVhIiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 800,
  },
  {
    workspace: 'main',
    path: 'atencion-ambulatoria-hospitalizacion/consulta-externa-por-servicio',
    legacyRoute: '/upss/especialclinica',
    moduleType: 'powerbi',
    title: 'Consulta Externa por Servicio',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiZTY0Zjg3NDktNDdmZC00ZGZhLTg4MzktZDAyYzk3ZmE5NTYyIiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 800,
  },
  {
    workspace: 'main',
    path: 'atencion-ambulatoria-hospitalizacion/consulta-externa-por-por-consultorio-y-profesional',
    legacyRoute: '/upss/consultorio',
    moduleType: 'powerbi',
    title: 'Consulta Externa por por Consultorio y Profesional',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiOTgxNzUxN2ItNzRlZC00MDM5LThkZDctMDRjYzAwMGQzOTg5IiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 800,
  },
  {
    workspace: 'main',
    path: 'atencion-ambulatoria-hospitalizacion/consulta-externa-monitoreo',
    legacyRoute: '/upss/monitoreoce',
    moduleType: 'powerbi',
    title: 'Consulta Externa - Monitoreo',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiZjFhYzNlODUtYTNjYy00OGNjLTkyMmYtMzcxNWI3NThiZWQ1IiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 800,
  },
  {
    workspace: 'main',
    path: 'atencion-ambulatoria-hospitalizacion/consulta-externa-diagnosticos-frecuentes',
    legacyRoute: '/upss/diagnosticoce',
    moduleType: 'powerbi',
    title: 'Consulta Externa - Diagnosticos Frecuentes',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiOTVjNDVhMzktMWRhNS00ZGY0LTlkMTAtZmJjMDMxMTQ0NGY2IiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 800,
  },
  {
    workspace: 'main',
    path: 'atencion-ambulatoria-hospitalizacion/hospitalizacion',
    legacyRoute: '/covid/indicadorhosp',
    moduleType: 'powerbi',
    title: 'Hospitalizacion',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiMjExYTg0ZjktNWMyZi00OWQzLTg3ZWMtMmE3OWZiYWZhYjQxIiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 800,
  },
  {
    workspace: 'main',
    path: 'atencion-ambulatoria-hospitalizacion/centro-obstetrico',
    legacyRoute: '/covid/indicadorobs',
    moduleType: 'powerbi',
    title: 'Centro Obstetrico',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiMjFkZWRhYjctYjIxMy00NTg2LWFjMTAtMDUwNDMyYTYxZjkyIiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 800,
  },
  {
    workspace: 'main',
    path: 'emergencia-cuidados-criticos/triaje-admisionados',
    legacyRoute: '/otros/triajes',
    moduleType: 'powerbi',
    title: 'Triaje Admisionados',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiNTkwOTNmMjUtYWEzNy00ZjljLTg5MmEtMzJjN2QyMzdkZDA5IiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 800,
  },
  {
    workspace: 'main',
    path: 'emergencia-cuidados-criticos/emergencia',
    legacyRoute: '/emergencia/producciong',
    moduleType: 'powerbi',
    title: 'Emergencia',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiNzkxNGU2ZWQtN2JjZC00MDE3LTkzZGEtZGNmODkwMThjMmVhIiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 800,
  },
  {
    workspace: 'main',
    path: 'emergencia-cuidados-criticos/emergencia-por-servicio',
    legacyRoute: '/emergencia/produccion',
    moduleType: 'powerbi',
    title: 'Emergencia por Servicio',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiNGEwNzBlZGUtOGI5Mi00NGFjLThlZDQtYjEzYTQ0NWZhMTlmIiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 800,
  },
  {
    workspace: 'main',
    path: 'emergencia-cuidados-criticos/cuidados-criticos-uce-y-uci',
    legacyRoute: '/covid/indicadoruci',
    moduleType: 'powerbi',
    title: 'Cuidados Criticos UCE Y UCI',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiYmI4YzZlYzUtMGM5NC00NDNkLTk3Y2YtYjc3MGZhYThlN2JmIiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 800,
  },
  {
    workspace: 'main',
    path: 'emergencia-cuidados-criticos/centro-quirurgico',
    legacyRoute: '/centrocqx/centrocqx',
    moduleType: 'powerbi',
    title: 'Centro Quirurgico',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiNTZkM2ViZTQtMWVmMS00MDYwLWJhNDMtOTgzY2M4MjYzMjM4IiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 800,
  },
  {
    workspace: 'main',
    path: 'apoyo-diagnostico-tratamiento/laboratorio',
    legacyRoute: '/laboratorio/laboratorio',
    moduleType: 'powerbi',
    title: 'Laboratorio',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiNGI2MjE2MDAtZGEwMS00NTA4LWIwN2MtYzI3YjlmMmQ1OWUxIiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 800,
  },
  {
    workspace: 'main',
    path: 'apoyo-diagnostico-tratamiento/imagenologia',
    legacyRoute: '/imagenes/imagenes',
    moduleType: 'powerbi',
    title: 'Imagenologia',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiMmFmODM4YjktZWZjOC00ODRjLWE2NTktYzY1ZmE1MWVlMmQxIiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 800,
  },
  {
    workspace: 'main',
    path: 'unidad-calidad/notificacion-incidentes-eventos-adversos',
    legacyRoute: '/calidad/eventos',
    moduleType: 'powerbi',
    title: 'Notificacion de Incidentes y Eventos Adversos',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiMjE4MWI2OTYtMGNlNi00N2ZkLTk0NDEtMGYxODlmYjRiOGRmIiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 800,
  },
  {
    workspace: 'main',
    path: 'neonatologia/tamizaje-neonatal-enfermeria',
    legacyRoute: '/neonatologia/tamizaje',
    moduleType: 'powerbi',
    title: 'Tamizaje Neonatal - Enfermeria',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiM2RjNzc5ZmQtZDhkYi00MmUzLTliOWUtODkzMTRjOGI4OWFjIiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 800,
  },
  {
    workspace: 'main',
    path: 'neonatologia/extraccion-lm-enfermeria',
    legacyRoute: '/neonatologia/extraccion',
    moduleType: 'powerbi',
    title: 'Extraccion LM - Enfermeria',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiODU2MjYwZWEtN2QwMC00OWRjLWJiMWQtOTdlODZlNDNiNmJlIiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 800,
  },
  {
    workspace: 'main',
    path: 'hechos-vitales/defunciones',
    legacyRoute: '/otros/fallecidos',
    moduleType: 'powerbi',
    title: 'Defunciones',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiNzEwN2ZlNDQtZGE0OC00OWI1LWFhNTMtODI1NjkzYmY2ZDkyIiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 800,
  },
  {
    workspace: 'main',
    path: 'hechos-vitales/inconsistencia-cdef',
    legacyRoute: '/otros/inconsistencia',
    moduleType: 'powerbi',
    title: 'Inconsistencia CDEF',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiMTFmYzU4MTUtNjg3Ny00ZGU4LWJiODgtYjQyMDQ0MzkyNjA2IiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 800,
  },
  {
    workspace: 'main',
    path: 'hechos-vitales/nacimientos',
    legacyRoute: '/otros/nacimientos',
    moduleType: 'powerbi',
    title: 'Nacimientos',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiNzhkNmUwNjMtZWY3OC00YjZlLWEzYjktM2Y2MWUxMzMyNDNiIiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 800,
  },
  {
    workspace: 'main',
    path: 'sala-inteligente/indicadores-de-emergencia',
    legacyRoute: '/salamonitoreo/emergencia',
    moduleType: 'powerbi',
    title: 'Indicadores de Emergencia',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiODc4ODliNzEtYzVmOC00NjUyLWE4YWMtNmJjMWQ3MTQwNDg0IiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 800,
  },
  {
    workspace: 'main',
    path: 'sala-inteligente/referencia-de-consulta-externa',
    legacyRoute: '/salamonitoreo/referenciace',
    moduleType: 'powerbi',
    title: 'Referencia de Consulta Externa',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiNGI5MWZlYTQtN2ZiZC00NmIwLWIzMjEtMjgzYTgwN2M1ZDhmIiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 800,
  },
  {
    workspace: 'main',
    path: 'sala-inteligente/referencia-de-emergencia',
    legacyRoute: '/salamonitoreo/referenciaem',
    moduleType: 'powerbi',
    title: 'Referencia de Emergencia',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiN2E2ZTdjN2MtNWQzZC00Y2U4LWIxNGMtZjJlOTkzNTU2ZTAyIiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 800,
  },
  {
    workspace: 'main',
    path: 'sala-inteligente/interconsulta-hospitalaria',
    legacyRoute: '/salamonitoreo/interconsulta',
    moduleType: 'powerbi',
    title: 'Interconsulta Hospitalaria',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiMWM0N2ZiNjctM2QwZC00ZTI3LTllMjItOTI1ZjEwYjgzZjAzIiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 800,
  },
  {
    workspace: 'main',
    path: 'sala-inteligente/indicadores-de-enfermeria',
    legacyRoute: '/salamonitoreo/enfermeria',
    moduleType: 'powerbi',
    title: 'Indicadores de Enfermeria',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiM2JiYzQzNTItYWNmYy00ZjdlLWJhNTctYzhlOTA2MzdhNDE1IiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 800,
  },
  {
    workspace: 'main',
    path: 'sala-inteligente/indicadores-de-isq-endometritis',
    legacyRoute: '/salamonitoreo/indicadorisq',
    moduleType: 'powerbi',
    title: 'Indicadores de ISQ - Endometritis',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiZDQxYTVmMTYtZDE1ZC00YzRjLTkzOTEtYTdkYjFmOTk0OWRhIiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 1000,
  },
  {
    workspace: 'main',
    path: 'sala-inteligente/vacunas-enfermeria',
    legacyRoute: '/salamonitoreo/inmunizacion',
    moduleType: 'powerbi',
    title: 'Vacunas - Enfermeria',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiOWRjMzI3MmEtYmViYS00NzJmLTg3MjItMWUyMDk4MTAzNTU5IiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 860,
  },
  {
    workspace: 'main',
    path: 'sala-inteligente/monitoreo-de-iaas',
    legacyRoute: '/salamonitoreo/iass',
    moduleType: 'powerbi',
    title: 'Monitoreo de IAAS',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiMWUwMzBhZTgtNzcxNi00YzA4LWJlN2MtNTZhNWRhMDQzMWVlIiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 860,
  },
  {
    workspace: 'main',
    path: 'monitoreo-salud-mental/tamizaje-salud-mental',
    legacyRoute: '/smental/tamizajes',
    moduleType: 'powerbi',
    title: 'Tamizaje Salud Mental',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiOGI4YmUzMjItNzNhOC00OGYwLTlmYzMtZDVmYjc3OTQ4NTdjIiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 800,
  },
  {
    workspace: 'main',
    path: 'articulacion-prestacional/monitoreo-de-citas',
    legacyRoute: '/admision/monitoreo',
    moduleType: 'powerbi',
    title: 'Monitoreo de Citas',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiZGNlNTRmNDEtZGFkNC00ZjEzLWExZTItNmIzOWI3NmZkYTYxIiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 800,
  },
  {
    workspace: 'main',
    path: 'articulacion-prestacional/indicador-citas-reprogramdas',
    legacyRoute: '/admision/citasrpg',
    moduleType: 'powerbi',
    title: 'Indicador Citas Reprogramdas',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiNWMxMGVhNmMtMWFhYi00OWNmLWJiZjUtNWI5ZWM0ZGMwNzI1IiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 800,
  },
  {
    workspace: 'main',
    path: 'epidemiologia/accidente-de-transito',
    legacyRoute: '/epidemiologia/lesionado',
    moduleType: 'powerbi',
    title: 'Accidente de Transito',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiN2JjZjI4NzktMWZlNC00MTdjLTk5MDEtYTQyNWZhOTUwNmVkIiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 800,
  },
  {
    workspace: 'sigh',
    path: 'laboratorio-cultivos/mapa-microbiologico',
    legacyRoute: '/laboratorio/cultivos',
    moduleType: 'powerbi',
    title: 'Mapa Microbiologico',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiMTNlNjQ0MjktYmI1OS00ODBjLWE4OWYtMTU5YTY2OWQ0MDc5IiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 1000,
  },
  {
    workspace: 'sigh',
    path: 'sala-monitoreo-dengue/monitoreo',
    legacyRoute: '/sala-monitoreo-dengue/monitoreo',
    moduleType: 'powerbi',
    title: 'Monitoreo',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiYWZkZDM1MzItZjQzNi00NDhlLWJhYmMtOWQxOTRiZThlNzM4IiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 1000,
  },
  {
    workspace: 'sigh',
    path: 'atencion-al-usuario/tiempos-de-espera',
    legacyRoute: '/gestioncita/tiempoespera',
    moduleType: 'powerbi',
    title: 'Tiempos de Espera',
    powerBiUrl:
      'https://app.powerbi.com/view?r=eyJrIjoiMzI2ZDliM2MtNDYzZS00OTYzLWFkYWYtZWI3Njg0M2E4MDlhIiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
    frameHeight: 1000,
  },
]

export const legacyOperationalModules: LegacyModuleMapping[] = [
  {
    workspace: 'main',
    path: 'monitoreo-salud-mental/reportes-monitoreo',
    legacyRoute: '/smental/reportes',
    moduleType: 'exportable',
    title: 'Reportes Monitoreo',
  },
  {
    workspace: 'main',
    path: 'epidemiologia/lavado-de-manos',
    legacyRoute: '/epidemiologia/lavado',
    moduleType: 'formulario',
    title: 'Lavado de Manos',
  },
  {
    workspace: 'main',
    path: 'epidemiologia/pacientes-oncologicos',
    legacyRoute: '/Report/pages/bai_onco.php',
    moduleType: 'exportable',
    title: 'Pacientes Oncologicos',
  },
  {
    workspace: 'main',
    path: 'epidemiologia/pfa-sifilis-sarampion',
    legacyRoute: '/Report/pages/enfer.php',
    moduleType: 'exportable',
    title: 'PFA, Sifilis y Sarampion',
  },
  {
    workspace: 'main',
    path: 'epidemiologia/isqx',
    legacyRoute: '/Report/pages/bai_isqx.php',
    moduleType: 'exportable',
    title: 'ISQx',
  },
  {
    workspace: 'main',
    path: 'epidemiologia/mordedura-canina',
    legacyRoute: '/Report/pages/canina.php',
    moduleType: 'exportable',
    title: 'Mordedura Canina',
  },
  {
    workspace: 'main',
    path: 'epidemiologia/cirugia-procedimiento',
    legacyRoute: '/Report/pages/CirugiaProc.php',
    moduleType: 'exportable',
    title: 'Cirugia Procedimiento',
  },
  {
    workspace: 'main',
    path: 'epidemiologia/seguimiento-dengue',
    legacyRoute: '/Report/pages/otros.php',
    moduleType: 'exportable',
    title: 'Seguimiento Dengue',
  },
  {
    workspace: 'main',
    path: 'emergencia-cuidados-criticos/indicadores-ucca',
    legacyRoute: '/ucca/indicador',
    moduleType: 'dashboard',
    title: 'Indicadores UCCA (Adulto)',
  },
  {
    workspace: 'main',
    path: 'emergencia-cuidados-criticos/indicadores-uccp',
    legacyRoute: '/uccp/indicador',
    moduleType: 'dashboard',
    title: 'Indicadores UCCP (Pediatrico)',
  },
  {
    workspace: 'main',
    path: 'zona-descarga/registros-procesados',
    legacyRoute: '/exportadato/exportadata',
    moduleType: 'exportable',
    title: 'Registros Procesados',
  },
  {
    workspace: 'sigh',
    path: 'monitoreo-en-linea/informe-familia-pendientes',
    legacyRoute: '/monitoreo/familiapen',
    moduleType: 'tabla',
    title: 'Informe Familia Pendientes',
  },
  {
    workspace: 'sigh',
    path: 'exportar-registros/registros-nominales',
    legacyRoute: '/exportadato/exportar',
    moduleType: 'exportable',
    title: 'Registros Nominales',
  },
  {
    workspace: 'sigh',
    path: 'exportar-registros/registros-produccion',
    legacyRoute: '/exportadato/exportadata',
    moduleType: 'exportable',
    title: 'Registros Produccion',
  },
  {
    workspace: 'sigh',
    path: 'produccion-actividades/produccion-medicos',
    legacyRoute: '/prodprofesional/prodmedicos',
    moduleType: 'tabla',
    title: 'Produccion Medicos',
  },
  {
    workspace: 'sigh',
    path: 'produccion-actividades/produccion-obstetras',
    legacyRoute: '/prodprofesional/prodobstetras',
    moduleType: 'tabla',
    title: 'Produccion Obstetras',
  },
  {
    workspace: 'sigh',
    path: 'gestion-camas/monitoreo-de-camas',
    legacyRoute: '/covid/detallecama',
    moduleType: 'tabla',
    title: 'Monitoreo de Camas',
  },
  {
    workspace: 'sigh',
    path: 'gestion-camas/resumen-de-camas',
    legacyRoute: '/covid/resumencamas',
    moduleType: 'tabla',
    title: 'Resumen de Camas',
  },
  {
    workspace: 'sigh',
    path: 'gestion-camas/porcentaje-de-ocupacion-cama',
    legacyRoute: '/covid/ocupacioncama',
    moduleType: 'tabla',
    title: 'Porcentaje de Ocupacion Cama',
  },
  {
    workspace: 'sigh',
    path: 'gestion-camas/gestion-estancia-cama',
    legacyRoute: '/covid/gestioncama',
    moduleType: 'tabla',
    title: 'Gestion Estancia Cama',
  },
  {
    workspace: 'sigh',
    path: 'atencion-al-usuario/gestion-de-citas',
    legacyRoute: '/gestioncita/citalibre',
    moduleType: 'tabla',
    title: 'Gestion de Citas',
  },
  {
    workspace: 'sigh',
    path: 'atencion-al-usuario/rol-consulta-externa',
    legacyRoute: '/gestioncita/programacion',
    moduleType: 'tabla',
    title: 'Rol Consulta Externa',
  },
  {
    workspace: 'sigh',
    path: 'atencion-al-usuario/monitoreo-de-tickets',
    legacyRoute: '/gestioncita/ventanilla',
    moduleType: 'tabla',
    title: 'Monitoreo de Tickets',
  },
  {
    workspace: 'sigh',
    path: 'atencion-al-usuario/monitoreo-ventanilla',
    legacyRoute: '/gestioncita/ventanillatmp',
    moduleType: 'tabla',
    title: 'Monitoreo Ventanilla',
  },
]

export const functionalLegacyModules = legacyPowerBiModules.concat(legacyOperationalModules)

const implementedOperationalPaths = new Set([
  'monitoreo-salud-mental/reportes-monitoreo',
  'epidemiologia/lavado-de-manos',
  'epidemiologia/pacientes-oncologicos',
  'epidemiologia/pfa-sifilis-sarampion',
  'epidemiologia/isqx',
  'epidemiologia/mordedura-canina',
  'epidemiologia/cirugia-procedimiento',
  'epidemiologia/seguimiento-dengue',
  'emergencia-cuidados-criticos/indicadores-ucca',
  'emergencia-cuidados-criticos/indicadores-uccp',
  'zona-descarga/registros-procesados',
])

export const implementedLegacyPaths = new Set(
  legacyPowerBiModules
    .map((module) => module.path)
    .concat([...implementedOperationalPaths]),
)

export function toWorkspaceRelativePath(pathname: string) {
  if (pathname.startsWith('/app/')) {
    return pathname.slice('/app/'.length)
  }

  if (pathname.startsWith('/sigh/')) {
    return pathname.slice('/sigh/'.length)
  }

  return pathname.replace(/^\/+/, '')
}

export function findLegacyModuleMapping(pathname: string) {
  const relativePath = toWorkspaceRelativePath(pathname)
  return functionalLegacyModules.find((module) => module.path === relativePath)
}

export function getWorkspaceLegacyPowerBiModules(workspace: WorkspaceKey) {
  return legacyPowerBiModules.filter((module) => module.workspace === workspace)
}
