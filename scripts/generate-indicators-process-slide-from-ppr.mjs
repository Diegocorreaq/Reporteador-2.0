import { copyFile, readFile, writeFile } from 'node:fs/promises'
import JSZip from 'jszip'

const templatePath = 'informes/Validacion_PPR_mensual_Diego_Correa.pptx'
const outputPath = 'informes/Diseno_Validacion_Indicadores_Diego_Correa.pptx'

await copyFile(templatePath, outputPath)

const zip = await JSZip.loadAsync(await readFile(outputPath))
let xml = await zip.file('ppt/slides/slide1.xml').async('string')

const replacements = [
  [
    'Validación mensual de avances físicos PPR',
    'Diseño, validación y aprobación de indicadores',
  ],
  [
    'Consolidación, revisión y entrega de la matriz mensual de metas físicas del hospital',
    'Directiva, fichas técnicas y monitoreo mensual para gestión hospitalaria',
  ],
  [
    'Propósito del proceso',
    'Propósito del proceso',
  ],
  [
    'Centralizar la información mensual de ejecución física PPR, contrastar datos del sistema con registros complementarios y coordinar la validación técnica antes del envío final.',
    'Convertir solicitudes del área usuaria en indicadores técnicamente definidos, validados, aprobados y disponibles para seguimiento mensual.',
  ],
  [
    'Alcance mensual',
    'Alcance institucional',
  ],
  [
    'Programas 0002, 0016, 0017, 0018, 0024, 0104, 0129, 0131, 1001 y 9002/APNOP. El 9002 se maneja por seis subáreas.',
    'Indicadores hospitalarios solicitados por áreas usuarias: directiva, ficha técnica, consulta/procedimiento, visualización y monitoreo mensual.',
  ],
  [
    'Flujo de trabajo',
    'Flujo de diseño y aprobación',
  ],
  [
    'Extracción',
    'Solicitud',
  ],
  [
    'Día 1: consultas SQL por programa en SIGH_DEPURA.',
    'Área usuaria solicita un indicador, visualización o necesidad de seguimiento.',
  ],
  [
    'Preparación',
    'Evaluación',
  ],
  [
    'Día 1-2: archivos Excel por PPR o subárea.',
    'Estadística evalúa objetivo, fuentes, disponibilidad de datos y tiempos.',
  ],
  [
    'Validación',
    'Diseño',
  ],
  [
    'Día 2-8: coordinadores validan, registran y observan.',
    'Reuniones para definir fórmula, numerador, denominador, exclusiones y ficha técnica.',
  ],
  [
    'Consolidación',
    'Construcción',
  ],
  [
    'Día 8-9: actualización de la matriz maestra mensual.',
    'Creación de script/procedimiento, extracción y validación de datos con el área usuaria.',
  ],
  [
    'Entrega',
    'Aprobación',
  ],
  [
    'Día 9: revisión final y remisión institucional a OPP.',
    'Aprobación, promulgación, publicación y monitoreo mensual del indicador.',
  ],
  [
    'Puntos críticos actuales',
    'Puntos críticos',
  ],
  [
    'Múltiples coordinadores y archivos por mes.',
    'Definir claramente numerador, denominador, población, exclusiones y fuente.',
  ],
  [
    'Datos mixtos: SIGH + registros manuales.',
    'Alinear interpretación técnica con el proceso real del área usuaria.',
  ],
  [
    'PPR 0016 y 0017: consolidación completamente manual por falta de sistematización de sus actividades.',
    'Garantizar calidad, oportunidad, trazabilidad y reproducibilidad de los datos.',
  ],
  [
    'Seguimiento por correo.',
    'Todo cambio requiere control de versión en directiva, ficha, consulta y reporte.',
  ],
  [
    'Mejora en curso',
    'Cómo se garantiza',
  ],
  [
    'Se viene desarrollando un Portal PPR en el Reporteador para ordenar la carga, validación, firma y trazabilidad del proceso.',
    'Ficha técnica aprobada, validación con usuarios, consulta reproducible, revisión histórica, pruebas de consistencia y monitoreo mensual.',
  ],
  [
    'Resultado final',
    'Resultado esperado',
  ],
  [
    'Matriz PPR mensual consolidada, validada y lista para remisión institucional.',
    'Indicador oficial, trazable y monitoreado para apoyar decisiones de gestión hospitalaria.',
  ],
  [
    'Fuente: proceso interno de consolidación mensual PPR · Hospital de Emergencias Villa El Salvador',
    'Fuente: proceso interno de diseño y monitoreo de indicadores · Hospital de Emergencias Villa El Salvador',
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
