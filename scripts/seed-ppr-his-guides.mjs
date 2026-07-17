import { closeSqlPool, getSqlPool, sql } from '../server/db/sql-server.js'
import {
  ensurePprProgramDocumentInfrastructure,
  upsertPprProgramDocument,
} from '../server/services/ppr-program-documents.service.js'

const DOCUMENT_TYPE = 'manual_his'
const MIME_TYPE = 'application/pdf'

const HIS_GUIDES = [
  {
    programCode: '2',
    key: 'his-materno-perinatal',
    year: 2025,
    displayName: 'HIS - Atencion Materno Perinatal',
    sourceUrl: 'https://www.gob.pe/institucion/hndac/informes-publicaciones/6909703-manual-de-registro-y-codificacion-de-la-atencion-en-la-consulta-externa-atencion-materno-perinatal',
  },
  {
    programCode: '2',
    key: 'his-planificacion-familiar',
    year: 2022,
    displayName: 'HIS - Planificacion Familiar',
    sourceUrl: 'https://www.gob.pe/institucion/minsa/informes-publicaciones/3249028-manual-de-registro-y-codificacion-de-la-atencion-en-la-consulta-externa-en-planificacion-familiar-sistema-de-informacion-his',
  },
  {
    programCode: '2',
    key: 'his-anemia-gestantes',
    year: 2022,
    displayName: 'HIS - Anemia por deficiencia de hierro',
    sourceUrl: 'https://www.gob.pe/institucion/minsa/informes-publicaciones/3249318-manual-de-registro-y-codificacion-de-la-informacion-para-el-manejo-preventivo-y-terapeutico-de-la-anemia-por-deficiencia-de-hierro-sistema-de-informacion-his-minsa',
  },
  {
    programCode: '16',
    key: 'his-tuberculosis',
    year: 2024,
    displayName: 'HIS - Prevencion y control de tuberculosis',
    sourceUrl: 'https://www.gob.pe/institucion/minsa/informes-publicaciones/6138144-manual-de-registro-y-codificacion-de-las-actividades-de-prevencion-y-control-de-tuberculosis',
  },
  {
    programCode: '16',
    key: 'his-dpvih-its-hepatitis',
    year: 2022,
    displayName: 'HIS - DPVIH, ITS y hepatitis',
    sourceUrl: 'https://repositorio.minsa.gob.pe/handle/MINSA/81758',
  },
  {
    programCode: '16',
    key: 'his-vih-sida-its',
    year: 2012,
    displayName: 'HIS - VIH/SIDA e infecciones de transmision sexual',
    sourceUrl: 'https://www.gob.pe/institucion/minsa/informes-publicaciones/321666-manual-de-registro-y-codificacion-de-la-atencion-en-la-consulta-externa-de-la-estrategia-sanitaria-nacional-de-prevencion-y-control-de-infecciones-de-transmision-sexual-vih-sida',
  },
  {
    programCode: '16',
    key: 'his-promocion-salud',
    year: 2022,
    displayName: 'HIS - Promocion de la Salud',
    sourceUrl: 'https://www.gob.pe/institucion/dirislimasur/informes-publicaciones/3467719-manual-de-registro-y-codificacion-de-las-actividades-de-promocion-de-la-salud',
  },
  {
    programCode: '17',
    key: 'his-metaxenicas-general',
    year: 2015,
    displayName: 'HIS - Enfermedades metaxenicas y vectores',
    sourceUrl: 'https://www.gob.pe/institucion/minsa/informes-publicaciones/305963-manual-de-registro-y-codificacion-de-actividades-en-la-atencion-de-consulta-externa-si-his-estrategia-sanitaria-nacional-de-prevencion-y-control-de-enfermedades-metaxenicas',
  },
  {
    programCode: '17',
    key: 'his-malaria',
    year: 2015,
    displayName: 'HIS - Malaria',
    sourceUrl: 'https://www.gob.pe/institucion/minsa/informes-publicaciones/305954-manual-de-registro-y-codificacion-de-actividades-en-la-atencion-en-la-consulta-externa-estrategia-sanitaria-nacional-de-prevencion-y-control-de-enfermedades-metaxenicas-y-otras-transmitidas-por-vectores',
  },
  {
    programCode: '17',
    key: 'his-leishmaniasis',
    year: 2015,
    displayName: 'HIS - Leishmaniasis',
    sourceUrl: 'https://www.gob.pe/institucion/minsa/informes-publicaciones/305962-manual-de-registro-y-codificacion-de-actividades-en-la-atencion-de-consulta-externa-si-his-leishmaniasis-estrategia-sanitaria-de-prevencion-y-control-de-enfermedades-metaxenicas',
  },
  {
    programCode: '17',
    key: 'his-dengue',
    year: 2015,
    displayName: 'HIS - Dengue',
    sourceUrl: 'https://www.gob.pe/institucion/minsa/informes-publicaciones/305960-manual-de-registro-y-codificacion-de-actividades-en-la-atencion-en-la-consulta-externa-sistema-de-informacion-his-dengue',
  },
  {
    programCode: '17',
    key: 'his-rabia-zoonosis',
    year: 2022,
    displayName: 'HIS - Rabia y zoonosis',
    sourceUrl: 'https://www.gob.pe/institucion/dirislimasur/informes-publicaciones/3467743-manual-del-registro-y-codificacion-de-la-atencion-en-la-consulta-externa-his-rabia',
  },
  {
    programCode: '17',
    key: 'his-animales-ponzonosos',
    year: 2015,
    displayName: 'HIS - Animales ponzonosos',
    sourceUrl: 'https://www.gob.pe/institucion/minsa/informes-publicaciones/305959-manual-de-registro-y-codificacion-de-actividades-en-la-atencion-en-la-consulta-externa-sistema-de-informacion-his-animales-ponzonosos',
  },
  {
    programCode: '17',
    key: 'his-promocion-salud',
    year: 2022,
    displayName: 'HIS - Promocion de la Salud',
    sourceUrl: 'https://www.gob.pe/institucion/dirislimasur/informes-publicaciones/3467719-manual-de-registro-y-codificacion-de-las-actividades-de-promocion-de-la-salud',
  },
  {
    programCode: '18',
    key: 'his-danos-no-transmisibles',
    year: 2022,
    displayName: 'HIS - Danos no transmisibles',
    sourceUrl: 'https://www.gob.pe/institucion/minsa/informes-publicaciones/3249236-manual-de-registro-y-codificacion-en-la-consulta-ambulatoria-componente-de-prevencion-y-control-de-danos-no-transmisibles-sistema-de-informacion-his',
  },
  {
    programCode: '18',
    key: 'his-salud-ocular',
    year: 2025,
    displayName: 'HIS - Salud ocular y prevencion de la ceguera',
    sourceUrl: 'https://www.gob.pe/institucion/hndac/informes-publicaciones/6857302-manual-de-registro-y-codificacion-de-la-atencion-en-la-consulta-externa-componente-de-salud-ocular-y-prevencion-de-la-ceguera',
  },
  {
    programCode: '18',
    key: 'his-salud-bucal',
    year: 2022,
    displayName: 'HIS - Salud bucal',
    sourceUrl: 'https://www.gob.pe/institucion/dirislimasur/informes-publicaciones/3467770-manual-de-registro-y-codificacion-de-la-atencion-en-salud-bucal',
  },
  {
    programCode: '18',
    key: 'his-metales-pesados',
    year: 2022,
    displayName: 'HIS - Metales pesados y sustancias quimicas',
    sourceUrl: 'https://www.gob.pe/institucion/minsa/informes-publicaciones/3249140-documento-tecnico-de-registro-y-codificacion-de-atencion-en-consulta-externa-a-personas-expuestas-a-metales-pesados-metaloides-y-otras-sustancias-quimicas-por-curso-de-vida-his',
  },
  {
    programCode: '18',
    key: 'his-medicina-alternativa',
    year: 2015,
    displayName: 'HIS - Medicina alternativa y complementaria',
    sourceUrl: 'https://www.gob.pe/institucion/regiontumbes-diresa/informes-publicaciones/6495206-medicina-alternativa-y-complementaria',
  },
  {
    programCode: '18',
    key: 'his-promocion-salud',
    year: 2022,
    displayName: 'HIS - Promocion de la Salud',
    sourceUrl: 'https://www.gob.pe/institucion/dirislimasur/informes-publicaciones/3467719-manual-de-registro-y-codificacion-de-las-actividades-de-promocion-de-la-salud',
  },
  {
    programCode: '24',
    key: 'his-cancer',
    year: 2022,
    displayName: 'HIS - Prevencion y control del cancer',
    sourceUrl: 'https://www.gob.pe/institucion/dirislimasur/informes-publicaciones/3467781-manual-de-registro-y-codificacion-de-la-atencion-en-la-consulta-externa-cancer',
  },
  {
    programCode: '24',
    key: 'his-promocion-salud',
    year: 2022,
    displayName: 'HIS - Promocion de la Salud',
    sourceUrl: 'https://www.gob.pe/institucion/dirislimasur/informes-publicaciones/3467719-manual-de-registro-y-codificacion-de-las-actividades-de-promocion-de-la-salud',
  },
  {
    programCode: '104',
    key: 'his-emergencias-urgencias',
    year: 2022,
    displayName: 'HIS - Emergencias y urgencias medicas',
    sourceUrl: 'https://www.gob.pe/institucion/dirislimasur/informes-publicaciones/3467756-manual-de-registro-y-codificacion-de-las-atenciones-de-emergencia-y-urgencias-en-el-primer-nivel-de-atencion',
  },
  {
    programCode: '129',
    key: 'his-discapacidad-2025',
    year: 2025,
    displayName: 'HIS - Discapacidad 2025 (3era edicion)',
    sourceUrl: 'https://www.gob.pe/institucion/minsa/informes-publicaciones/305958-manual-de-registro-y-codificacion-de-actividades-de-la-direccion-de-prevencion-y-control-de-la-discapacidad-2025-3era-edicion',
  },
  {
    programCode: '131',
    key: 'his-salud-mental-consulta-externa',
    year: 2022,
    displayName: 'HIS - Salud mental consulta externa',
    sourceUrl: 'https://www.gob.pe/institucion/minsa/informes-publicaciones/3249275-manual-de-registro-y-codificacion-de-actividades-en-la-atencion-en-la-consulta-externa-de-salud-mental-sistema-de-informacion-his',
  },
  {
    programCode: '131',
    key: 'his-salud-mental-actividades',
    year: 2022,
    displayName: 'HIS - Actividades de salud mental',
    sourceUrl: 'https://www.gob.pe/institucion/minsa/informes-publicaciones/3249452-manual-de-registro-y-codificacion-de-actividades-en-la-atencion-salud-de-salud-mental-sistema-de-informacion-his',
  },
  {
    programCode: '131',
    key: 'his-promocion-salud',
    year: 2022,
    displayName: 'HIS - Promocion de la Salud',
    sourceUrl: 'https://www.gob.pe/institucion/dirislimasur/informes-publicaciones/3467719-manual-de-registro-y-codificacion-de-las-actividades-de-promocion-de-la-salud',
  },
  {
    programCode: '1001',
    key: 'his-anemia',
    year: 2022,
    displayName: 'HIS - Anemia por deficiencia de hierro',
    sourceUrl: 'https://www.gob.pe/institucion/minsa/informes-publicaciones/3249318-manual-de-registro-y-codificacion-de-la-informacion-para-el-manejo-preventivo-y-terapeutico-de-la-anemia-por-deficiencia-de-hierro-sistema-de-informacion-his-minsa',
  },
  {
    programCode: '1001',
    key: 'his-inmunizaciones',
    year: 2022,
    displayName: 'HIS - Inmunizaciones',
    sourceUrl: 'https://www.gob.pe/institucion/minsa/informes-publicaciones/3249368-manual-de-registro-y-codificacion-de-actividades-en-la-atencion-integral-de-salud-rn-la-consulta-externa-de-inmunizaciones-sistema-de-informacion-his',
  },
  {
    programCode: '1001',
    key: 'his-alimentacion-nutricion',
    year: 2016,
    displayName: 'HIS - Alimentacion y nutricion saludable',
    sourceUrl: 'https://www.gob.pe/institucion/regiontumbes-diresa/informes-publicaciones/6496884-estrategia-sanitaria-nacional-de-alimentacion-y-nutricion-saludable',
  },
  {
    programCode: '1001',
    key: 'his-promocion-salud',
    year: 2022,
    displayName: 'HIS - Promocion de la Salud',
    sourceUrl: 'https://www.gob.pe/institucion/dirislimasur/informes-publicaciones/3467719-manual-de-registro-y-codificacion-de-las-actividades-de-promocion-de-la-salud',
  },
  {
    programCode: '9002-TS',
    key: 'his-telemedicina',
    year: 2022,
    displayName: 'HIS - Telemedicina y telesalud',
    sourceUrl: 'https://www.gob.pe/institucion/minsa/informes-publicaciones/3249218-manual-de-registro-y-codificacion-his-de-atencion-en-salud-del-servicio-de-telemedicina-sistema-de-informacion-his',
  },
  {
    programCode: '9002',
    key: 'his-vigilancia-epidemiologica',
    year: 2024,
    displayName: 'HIS - Vigilancia epidemiologica e inteligencia sanitaria',
    sourceUrl: 'https://www.gob.pe/institucion/regiontumbes-diresa/informes-publicaciones/6497568-vigilancia-epidemiologica-e-inteligencia-sanitaria',
  },
  {
    programCode: '9002',
    key: 'his-pueblos-indigenas',
    year: 2022,
    displayName: 'HIS - Pueblos indigenas u originarios',
    sourceUrl: 'https://www.gob.pe/institucion/minsa/informes-publicaciones/2727239-manual-de-registro-y-codificacion-segun-grupo-etnico-de-la-actividades-de-la-direccion-de-pueblos-indigenas-u-originarios',
  },
]

function fileNameForGuide(guide) {
  return `${guide.programCode.replace(/[^0-9A-Za-z-]+/g, '_')}_${guide.key}.pdf`
}

async function attachExistingDisabilityManual() {
  const pool = await getSqlPool('general')
  const guide = HIS_GUIDES.find((item) => item.programCode === '129' && item.key === 'his-discapacidad-2025')
  if (!guide) return false

  const request = pool.request()
  request.input('program_code', sql.NVarChar(30), guide.programCode)
  request.input('document_type', sql.NVarChar(60), DOCUMENT_TYPE)
  request.input('document_key', sql.NVarChar(120), guide.key)
  request.input('document_year', sql.Int, guide.year)
  request.input('version_label', sql.NVarChar(80), String(guide.year))
  request.input('display_name', sql.NVarChar(250), guide.displayName)
  request.input('file_name', sql.NVarChar(255), fileNameForGuide(guide))
  request.input('source_url', sql.NVarChar(1000), guide.sourceUrl)
  request.input('sort_order', sql.Int, 10)
  request.input('notes', sql.NVarChar(sql.MAX), 'Cruce HIS-PPR: PP 0129 Discapacidad.')

  const result = await request.query(`
    UPDATE TOP (1) d
    SET
      document_key = @document_key,
      document_year = @document_year,
      version_label = @version_label,
      display_name = @display_name,
      file_name = @file_name,
      source_url = COALESCE(d.source_url, @source_url),
      sort_order = @sort_order,
      notes = @notes
    FROM dbo.ppr_program_documents d
    INNER JOIN dbo.ppr_programs p
      ON p.id = d.program_id
    WHERE p.code = @program_code
      AND d.document_type = @document_type
      AND d.document_key IS NULL
      AND d.is_current = 1;
  `)

  return Number(result.rowsAffected?.[0] ?? 0) > 0
}

await ensurePprProgramDocumentInfrastructure()
const attachedExistingDisabilityManual = await attachExistingDisabilityManual()

let inserted = 0
let updated = 0
let skipped = 0

for (const [index, guide] of HIS_GUIDES.entries()) {
  if (attachedExistingDisabilityManual && guide.programCode === '129' && guide.key === 'his-discapacidad-2025') {
    skipped += 1
    console.log(`SKIP program=${guide.programCode} key=${guide.key} reused_existing=1`)
    continue
  }

  const result = await upsertPprProgramDocument({
    programCode: guide.programCode,
    documentType: DOCUMENT_TYPE,
    documentKey: guide.key,
    documentYear: guide.year,
    versionLabel: String(guide.year),
    displayName: guide.displayName,
    fileName: fileNameForGuide(guide),
    mimeType: MIME_TYPE,
    sourceUrl: guide.sourceUrl,
    sortOrder: (index + 1) * 10,
    notes: `Cruce HIS-PPR: ${guide.displayName}.`,
    isCurrent: true,
    replaceCurrent: false,
  })

  if (result.id) {
    updated += 1
  } else {
    inserted += 1
  }

  console.log(`OK program=${result.programCode} key=${guide.key} id=${result.id}`)
}

console.log(`DONE guides=${HIS_GUIDES.length} upserted=${inserted + updated} skipped=${skipped}`)
await closeSqlPool('general')
