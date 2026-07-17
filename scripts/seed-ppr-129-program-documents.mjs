import { readFile } from 'node:fs/promises'
import { upsertPprProgramDocument } from '../server/services/ppr-program-documents.service.js'

const PROGRAM_CODE = '129'

const documents = [
  {
    documentType: 'manual_his',
    documentKey: 'his-discapacidad-2025',
    documentYear: 2025,
    versionLabel: '2025',
    displayName: 'HIS - Discapacidad 2025 (3era edicion)',
    fileName: 'Manual_HIS_MINSA_PP_0129_2025.pdf',
    mimeType: 'application/pdf',
    filePath: process.env.PPR_129_MANUAL_HIS_PATH
      ?? 'C:/Users/diego.correa/Downloads/Manual de Registro y Codificación de Actividades de la Persona con Discapacidad.pdf',
    sourceUrl: 'https://www.gob.pe/institucion/minsa/informes-publicaciones/305958-manual-de-registro-y-codificacion-de-actividades-de-la-direccion-de-prevencion-y-control-de-la-discapacidad-2025-3era-edicion',
    sortOrder: 10,
    replaceCurrent: false,
    notes: 'Manual vigente mas reciente para registro y codificacion de actividades de persona con discapacidad.',
  },
  {
    documentType: 'criterios_programacion',
    documentKey: 'criterios-programacion-2027',
    documentYear: 2027,
    versionLabel: '2027',
    displayName: 'Criterios de programacion 2027 - PP 0129',
    fileName: 'Criterios_programacion_2027_PP_0129.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filePath: process.env.PPR_129_CRITERIOS_PATH
      ?? 'C:/Users/diego.correa/Desktop/DIEGO CORREA/PPR/CADENA PROGRAMATICA/2027/do-y-cp_2027_pp-0129-2.xlsx',
    notes: 'Excel de criterios de programacion vigente mas reciente para el PP 0129.',
  },
]

for (const document of documents) {
  const fileBuffer = await readFile(document.filePath)
  const result = await upsertPprProgramDocument({
    programCode: PROGRAM_CODE,
    documentType: document.documentType,
    documentKey: document.documentKey,
    documentYear: document.documentYear,
    versionLabel: document.versionLabel,
    displayName: document.displayName,
    fileName: document.fileName,
    mimeType: document.mimeType,
    fileBuffer,
    sourceUrl: document.sourceUrl,
    sortOrder: document.sortOrder ?? 0,
    notes: document.notes,
    isCurrent: true,
    replaceCurrent: document.replaceCurrent ?? true,
  })

  console.log(
    [
      'OK',
      `id=${result.id}`,
      `program=${result.programCode}`,
      `type=${result.documentType}`,
      `year=${result.documentYear}`,
      `bytes=${fileBuffer.length}`,
    ].join(' '),
  )
}
