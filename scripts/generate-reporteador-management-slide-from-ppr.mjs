import { copyFile, readFile, writeFile } from 'node:fs/promises'
import JSZip from 'jszip'

const templatePath = 'informes/Validacion_PPR_mensual_Diego_Correa.pptx'
const outputPath = 'informes/Gestion_Reporteador_2_Diego_Correa.pptx'

await copyFile(templatePath, outputPath)

const zip = await JSZip.loadAsync(await readFile(outputPath))
let xml = await zip.file('ppt/slides/slide1.xml').async('string')

const replacements = [
  [
    'Validación mensual de avances físicos PPR',
    'Gestión del proyecto Reporteador 2.0',
  ],
  [
    'Consolidación, revisión y entrega de la matriz mensual de metas físicas del hospital',
    'Mejoras, exportables, detalles de reportes y nuevos módulos institucionales',
  ],
  [
    'Propósito del proceso',
    'Propósito del proyecto',
  ],
  [
    'Centralizar la información mensual de ejecución física PPR, contrastar datos del sistema con registros complementarios y coordinar la validación técnica antes del envío final.',
    'Centralizar y mejorar la generación de reportes institucionales, reduciendo procesos manuales y entregando información confiable para gestión, análisis y toma de decisiones.',
  ],
  [
    'Alcance mensual',
    'Alcance funcional',
  ],
  [
    'Programas 0002, 0016, 0017, 0018, 0024, 0104, 0129, 0131, 1001 y 9002/APNOP. El 9002 se maneja por seis subáreas.',
    'Mejoras continuas, exportables Excel/PDF, detalles en reportes existentes, nuevos módulos, accesos, validaciones y mantenimiento de fuentes de datos.',
  ],
  [
    'Flujo de trabajo',
    'Flujo de gestión',
  ],
  [
    'Extracción',
    'Solicitud',
  ],
  [
    'Día 1: consultas SQL por programa en SIGH_DEPURA.',
    'Recepción de mejoras, exportables, detalles o nuevos módulos solicitados por las áreas.',
  ],
  [
    'Preparación',
    'Análisis',
  ],
  [
    'Día 1-2: archivos Excel por PPR o subárea.',
    'Revisión del proceso actual, datos disponibles, reglas de negocio y formato esperado.',
  ],
  [
    'Validación',
    'Desarrollo',
  ],
  [
    'Día 2-8: coordinadores validan, registran y observan.',
    'Implementación de consultas, pantallas, filtros, exportables y controles requeridos.',
  ],
  [
    'Consolidación',
    'Validación',
  ],
  [
    'Día 8-9: actualización de la matriz maestra mensual.',
    'Contraste con fuentes oficiales, revisión de totales, casos límite y prueba con usuarios.',
  ],
  [
    'Entrega',
    'Despliegue',
  ],
  [
    'Día 9: revisión final y remisión institucional a OPP.',
    'Publicación en Reporteador 2.0, seguimiento de uso y ajustes posteriores.',
  ],
  [
    'Puntos críticos actuales',
    'Puntos críticos',
  ],
  [
    'Múltiples coordinadores y archivos por mes.',
    'Los requerimientos cambian según necesidades operativas de cada área.',
  ],
  [
    'Datos mixtos: SIGH + registros manuales.',
    'Cada reporte debe respetar reglas, filtros, fechas y formatos institucionales.',
  ],
  [
    'PPR 0016 y 0017: consolidación completamente manual por falta de sistematización de sus actividades.',
    'Los exportables deben coincidir con la información esperada por los usuarios finales.',
  ],
  [
    'Seguimiento por correo.',
    'Los módulos nuevos requieren control de accesos, trazabilidad y validación funcional.',
  ],
  [
    'Mejora en curso',
    'Cómo se garantiza',
  ],
  [
    'Se viene desarrollando un Portal PPR en el Reporteador para ordenar la carga, validación, firma y trazabilidad del proceso.',
    'Comparación contra fuentes oficiales, pruebas de consultas y exportables, revisión con usuarios, control de errores, builds previos y seguimiento post-despliegue.',
  ],
  [
    'Resultado final',
    'Resultado esperado',
  ],
  [
    'Matriz PPR mensual consolidada, validada y lista para remisión institucional.',
    'Reportes y módulos confiables, oportunos y reutilizables para la gestión hospitalaria.',
  ],
  [
    'Fuente: proceso interno de consolidación mensual PPR · Hospital de Emergencias Villa El Salvador',
    'Fuente: gestión interna del proyecto Reporteador 2.0 · Hospital de Emergencias Villa El Salvador',
  ],
]

for (const [from, to] of replacements) {
  xml = xml.replace(from, to)
}

zip.file('ppt/slides/slide1.xml', xml)

const buffer = await zip.generateAsync({
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: { level: 6 },
})

await writeFile(outputPath, buffer)
console.log(outputPath)
