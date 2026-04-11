# Auditoria de correccion Power BI

## Rutas corregidas de dashboard inventado a Power BI real

| Ruta nueva | Legacy | Comportamiento corregido |
| --- | --- | --- |
| `/app/indicadores-hospitalarios/indicadores-de-eficiencia` | `/indicador/eficiencia` | Reemplazada la pagina mock por `LegacyEmbedPage` con el Power BI real |
| `/app/indicadores-hospitalarios/indicadores-de-eficacia` | `/indicador/eficacia` | Reemplazada la pagina mock por `LegacyEmbedPage` con el Power BI real |
| `/app/indicadores-hospitalarios/indicadores-de-calidad` | `/indicador/calidad` | Reemplazada la pagina mock por `LegacyEmbedPage` con el Power BI real |
| `/app/atencion-ambulatoria-hospitalizacion/hospitalizacion` | `/covid/indicadorhosp` | Reemplazada la pagina mock por `LegacyEmbedPage` con el Power BI real |
| `/app/emergencia-cuidados-criticos/cuidados-criticos-uce-y-uci` | `/covid/indicadoruci` | Reemplazada la pagina mock por `LegacyEmbedPage` con el Power BI real |
| `/app/apoyo-diagnostico-tratamiento/laboratorio` | `/laboratorio/laboratorio` | Reemplazada la pagina mock por `LegacyEmbedPage` con el Power BI real |
| `/app/articulacion-prestacional/monitoreo-de-citas` | `/admision/monitoreo` | Reemplazada la pagina mock por `LegacyEmbedPage` con el Power BI real |
| `/app/articulacion-prestacional/indicador-citas-reprogramdas` | `/admision/citasrpg` | Reemplazada la pagina mock por `LegacyEmbedPage` con el Power BI real |
| `/sigh/laboratorio-cultivos/mapa-microbiologico` | `/laboratorio/cultivos` | Reemplazada la pagina mock por `LegacyEmbedPage` con el Power BI real |
| `/sigh/atencion-al-usuario/tiempos-de-espera` | `/gestioncita/tiempoespera` | Reemplazada la pagina mock por `LegacyEmbedPage` con el Power BI real |

## Rutas Power BI ahora conectadas directamente desde el mapa legacy

Estas rutas no deben usar dashboards React reconstruidos. Quedaron respaldadas por el mapa `legacyPowerBiModules` y el router ahora las resuelve con `LegacyEmbedPage`:

- `/app/atencion-ambulatoria-hospitalizacion/consulta-externa`
- `/app/atencion-ambulatoria-hospitalizacion/consulta-externa-por-servicio`
- `/app/atencion-ambulatoria-hospitalizacion/consulta-externa-por-por-consultorio-y-profesional`
- `/app/atencion-ambulatoria-hospitalizacion/consulta-externa-monitoreo`
- `/app/atencion-ambulatoria-hospitalizacion/consulta-externa-diagnosticos-frecuentes`
- `/app/emergencia-cuidados-criticos/triaje-admisionados`
- `/app/emergencia-cuidados-criticos/emergencia`
- `/app/emergencia-cuidados-criticos/emergencia-por-servicio`
- `/app/emergencia-cuidados-criticos/centro-quirurgico`
- `/app/apoyo-diagnostico-tratamiento/imagenologia`
- `/app/unidad-calidad/notificacion-incidentes-eventos-adversos`
- `/app/neonatologia/tamizaje-neonatal-enfermeria`
- `/app/neonatologia/extraccion-lm-enfermeria`
- `/app/hechos-vitales/defunciones`
- `/app/hechos-vitales/inconsistencia-cdef`
- `/app/hechos-vitales/nacimientos`
- `/app/sala-inteligente/indicadores-de-emergencia`
- `/app/sala-inteligente/referencia-de-consulta-externa`
- `/app/sala-inteligente/referencia-de-emergencia`
- `/app/sala-inteligente/interconsulta-hospitalaria`
- `/app/sala-inteligente/indicadores-de-enfermeria`
- `/app/sala-inteligente/pacientes-hospitalizados`
- `/app/sala-inteligente/pacientes-continuadores`
- `/app/sala-inteligente/indicadores-de-isq-endometritis`
- `/app/sala-inteligente/vacunas-enfermeria`
- `/app/sala-inteligente/monitoreo-de-iaas`
- `/app/monitoreo-salud-mental/tamizaje-salud-mental`
- `/app/epidemiologia/accidente-de-transito`

## Paginas que deben seguir como implementacion propia

Estas rutas no eran Power BI en el legacy y por eso no deben convertirse a embed:

- `/app/atencion-ambulatoria-hospitalizacion/centro-obstetrico`
- `/app/monitoreo-salud-mental/reportes-monitoreo`
- `/app/epidemiologia/lavado-de-manos`
- `/app/emergencia-cuidados-criticos/indicadores-ucca`
- `/app/emergencia-cuidados-criticos/indicadores-uccp`
- `/app/zona-descarga/registros-procesados`
- `/sigh/monitoreo-en-linea/informe-familia-pendientes`
- `/sigh/exportar-registros/registros-nominales`
- `/sigh/exportar-registros/registros-produccion`
- `/sigh/produccion-actividades/produccion-medicos`
- `/sigh/gestion-camas/monitoreo-de-camas`
- `/sigh/gestion-camas/resumen-de-camas`
- `/sigh/gestion-camas/porcentaje-de-ocupacion-cama`
- `/sigh/gestion-camas/gestion-estancia-cama`
- `/sigh/atencion-al-usuario/gestion-de-citas`
- `/sigh/atencion-al-usuario/rol-consulta-externa`
- `/sigh/atencion-al-usuario/monitoreo-de-tickets`
- `/sigh/atencion-al-usuario/monitoreo-ventanilla`
