import { copyFile, readFile, writeFile } from 'node:fs/promises'
import JSZip from 'jszip'

const templatePath = 'informes/Validacion_PPR_mensual_Diego_Correa.pptx'
const outputPath = 'informes/Validacion_CNV_CDEF_Diego_Correa.pptx'

await copyFile(templatePath, outputPath)

const zip = await JSZip.loadAsync(await readFile(outputPath))
let xml = await zip.file('ppt/slides/slide1.xml').async('string')

const replacements = [
  [
    'Validación mensual de avances físicos PPR',
    'Validación y consistencia CNV-CDEF',
  ],
  [
    'Consolidación, revisión y entrega de la matriz mensual de metas físicas del hospital',
    'Cruce de registros SISGALENPlus y Hechos Vitales para subsanar inconsistencias',
  ],
  [
    'Centralizar la información mensual de ejecución física PPR, contrastar datos del sistema con registros complementarios y coordinar la validación técnica antes del envío final.',
    'Verificar que los registros de nacimientos y defunciones coincidan entre SISGALENPlus y Hechos Vitales, detectar diferencias y coordinar su subsanación con las áreas responsables.',
  ],
  [
    'Alcance mensual',
    'Alcance del proceso',
  ],
  [
    'Programas 0002, 0016, 0017, 0018, 0024, 0104, 0129, 0131, 1001 y 9002/APNOP. El 9002 se maneja por seis subáreas.',
    'CNV: datos del recién nacido registrados por obstetras. CDEF: diagnósticos y hora de fallecimiento registrados por médicos en ambos sistemas.',
  ],
  [
    'Flujo de trabajo',
    'Flujo de validación',
  ],
  [
    'Extracción',
    'Consulta',
  ],
  [
    'Día 1: consultas SQL por programa en SIGH_DEPURA.',
    'Consultas en base de datos para obtener registros CNV y CDEF.',
  ],
  [
    'Preparación',
    'Comparación',
  ],
  [
    'Día 1-2: archivos Excel por PPR o subárea.',
    'Cruce SISGALENPlus vs Hechos Vitales, registro por registro.',
  ],
  [
    'Validación',
    'Revisión',
  ],
  [
    'Día 2-8: coordinadores validan, registran y observan.',
    'Verificación de peso, sexo, talla, APGAR, diagnósticos y hora.',
  ],
  [
    'Consolidación',
    'Subsanación',
  ],
  [
    'Día 8-9: actualización de la matriz maestra mensual.',
    'Notificación al área responsable para corregir en el sistema que corresponda.',
  ],
  [
    'Entrega',
    'Seguimiento',
  ],
  [
    'Día 9: revisión final y remisión institucional a OPP.',
    'Monitoreo en dashboard hasta el levantamiento de inconsistencias.',
  ],
  [
    'Puntos críticos actuales',
    'Puntos críticos',
  ],
  [
    'Múltiples coordinadores y archivos por mes.',
    'CNV: consistencia de peso, sexo, talla, APGAR y datos del recién nacido.',
  ],
  [
    'Datos mixtos: SIGH + registros manuales.',
    'CDEF: validación de causa básica, intermedias, diagnósticos y hora de fallecimiento.',
  ],
  [
    'PPR 0016 y 0017: consolidación completamente manual por falta de sistematización de sus actividades.',
    'Registros realizados por distintos profesionales pueden generar diferencias entre sistemas.',
  ],
  [
    'Seguimiento por correo.',
    'La corrección oportuna impacta RENIEC, seguros, solicitudes familiares y auditorías.',
  ],
  [
    'Mejora en curso',
    'Herramienta de apoyo',
  ],
  [
    'Se viene desarrollando un Portal PPR en el Reporteador para ordenar la carga, validación, firma y trazabilidad del proceso.',
    'Se implementó un dashboard donde el médico puede visualizar sus inconsistencias y realizar las correcciones correspondientes.',
  ],
  [
    'Resultado final',
    'Resultado esperado',
  ],
  [
    'Matriz PPR mensual consolidada, validada y lista para remisión institucional.',
    'Registros CNV-CDEF consistentes, corregidos y trazables para continuidad administrativa y sanitaria.',
  ],
  [
    'Fuente: proceso interno de consolidación mensual PPR · Hospital de Emergencias Villa El Salvador',
    'Fuente: proceso interno de validación CNV-CDEF · Hospital de Emergencias Villa El Salvador',
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
