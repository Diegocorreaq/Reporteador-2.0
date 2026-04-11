import type { ChartSeriesConfig, FilterFieldConfig } from '@/types/report'

export const exportFilters: FilterFieldConfig[] = [
  {
    id: 'corte',
    label: 'Corte',
    type: 'select',
    placeholder: 'Todos los cortes',
    options: [
      { label: 'Diario', value: 'diario' },
      { label: 'Semanal', value: 'semanal' },
      { label: 'Mensual', value: 'mensual' },
    ],
  },
  {
    id: 'estado',
    label: 'Estado',
    type: 'select',
    placeholder: 'Todos los estados',
    options: [
      { label: 'Generado', value: 'generado' },
      { label: 'En cola', value: 'cola' },
      { label: 'Observado', value: 'observado' },
    ],
  },
  {
    id: 'solicitante',
    label: 'Solicitante',
    type: 'search',
    placeholder: 'Usuario o servicio',
  },
  {
    id: 'fecha',
    label: 'Fecha',
    type: 'date',
  },
]

export const exportRows = [
  {
    id: 'EXP-24001',
    modulo: 'Exportadato',
    corte: 'Diario',
    formato: 'CSV',
    estado: 'Generado',
    usuario: 'admisiones',
    actualizado: '2026-04-10T08:15:00Z',
    detalle: ['684 filas', 'Destino: carpeta segura', 'Trazabilidad completa'],
  },
  {
    id: 'EXP-24002',
    modulo: 'Gestión de cita',
    corte: 'Semanal',
    formato: 'XLSX',
    estado: 'En cola',
    usuario: 'consulta.externa',
    actualizado: '2026-04-10T07:42:00Z',
    detalle: ['2 134 filas', 'Se ejecuta al cerrar agenda', 'Preparado para descarga'],
  },
  {
    id: 'EXP-24003',
    modulo: 'Laboratorio',
    corte: 'Mensual',
    formato: 'CSV',
    estado: 'Observado',
    usuario: 'biomedicina',
    actualizado: '2026-04-09T22:10:00Z',
    detalle: ['Validación de columnas requerida', 'Pendiente revisión TI', 'Sincronización parcial'],
  },
]

export const appointmentFilters: FilterFieldConfig[] = [
  {
    id: 'especialidad',
    label: 'Especialidad',
    type: 'select',
    placeholder: 'Todas las especialidades',
    options: [
      { label: 'Medicina interna', value: 'medicina' },
      { label: 'Pediatría', value: 'pediatria' },
      { label: 'Cirugía', value: 'cirugia' },
    ],
  },
  {
    id: 'sede',
    label: 'Sede',
    type: 'select',
    placeholder: 'Todas las sedes',
    options: [
      { label: 'Central', value: 'central' },
      { label: 'Ambulatoria', value: 'ambulatoria' },
      { label: 'Apoyo', value: 'apoyo' },
    ],
  },
  {
    id: 'profesional',
    label: 'Profesional',
    type: 'search',
    placeholder: 'Nombre del profesional',
  },
  {
    id: 'fecha',
    label: 'Fecha',
    type: 'date',
  },
]

export const appointmentRows = [
  {
    agenda: 'AG-101',
    especialidad: 'Medicina interna',
    profesional: 'Dra. Moreno',
    programadas: 32,
    atendidas: 28,
    inasistencias: 3,
    novedad: '1 reagendada',
  },
  {
    agenda: 'AG-102',
    especialidad: 'Pediatría',
    profesional: 'Dr. Salas',
    programadas: 24,
    atendidas: 21,
    inasistencias: 2,
    novedad: '1 cancelada por incapacidad',
  },
  {
    agenda: 'AG-103',
    especialidad: 'Cirugía',
    profesional: 'Dra. Álvarez',
    programadas: 18,
    atendidas: 17,
    inasistencias: 1,
    novedad: 'Sin novedad',
  },
]

export const bedFilters: FilterFieldConfig[] = [
  {
    id: 'unidad',
    label: 'Unidad',
    type: 'select',
    placeholder: 'Todas las unidades',
    options: [
      { label: 'UCI', value: 'uci' },
      { label: 'Hospitalización', value: 'hospitalizacion' },
      { label: 'Aislamiento', value: 'aislamiento' },
    ],
  },
  {
    id: 'turno',
    label: 'Turno',
    type: 'select',
    placeholder: 'Todos los turnos',
    options: [
      { label: 'Mañana', value: 'manana' },
      { label: 'Tarde', value: 'tarde' },
      { label: 'Noche', value: 'noche' },
    ],
  },
  {
    id: 'servicio',
    label: 'Servicio',
    type: 'search',
    placeholder: 'Servicio o área',
  },
  {
    id: 'fecha',
    label: 'Fecha',
    type: 'date',
  },
]

export const bedSeries: ChartSeriesConfig[] = [
  {
    name: 'Ocupadas',
    type: 'line',
    data: [34, 36, 35, 39, 38, 40, 37],
  },
  {
    name: 'Disponibles',
    type: 'bar',
    data: [8, 6, 7, 4, 5, 3, 6],
  },
]

export const bedRows = [
  {
    area: 'UCI respiratoria',
    disponibles: 3,
    ocupadas: 14,
    aislamiento: 2,
    traslados: 1,
    detalle: 'Capacidad crítica con monitoreo continuo',
  },
  {
    area: 'Hospitalización COVID',
    disponibles: 2,
    ocupadas: 18,
    aislamiento: 4,
    traslados: 3,
    detalle: 'Flujo estable con demanda alta en tarde',
  },
  {
    area: 'Sala intermedia',
    disponibles: 1,
    ocupadas: 9,
    aislamiento: 1,
    traslados: 0,
    detalle: 'Sin bloqueo de camas',
  },
]

export const laboratoryFilters: FilterFieldConfig[] = [
  {
    id: 'area',
    label: 'Área',
    type: 'select',
    placeholder: 'Todas las áreas',
    options: [
      { label: 'Hematología', value: 'hematologia' },
      { label: 'Química', value: 'quimica' },
      { label: 'Microbiología', value: 'microbiologia' },
    ],
  },
  {
    id: 'criticidad',
    label: 'Criticidad',
    type: 'select',
    placeholder: 'Todas',
    options: [
      { label: 'Crítica', value: 'critica' },
      { label: 'Normal', value: 'normal' },
    ],
  },
  {
    id: 'orden',
    label: 'Orden / paciente',
    type: 'search',
    placeholder: 'Buscar orden',
  },
  {
    id: 'fecha',
    label: 'Fecha',
    type: 'date',
  },
]

export const laboratoryRows = [
  {
    orden: 'LAB-5401',
    area: 'Hematología',
    muestras: 84,
    criticos: 5,
    tmr: '01:24',
    estado: 'Operativo',
  },
  {
    orden: 'LAB-5402',
    area: 'Química',
    muestras: 61,
    criticos: 2,
    tmr: '00:56',
    estado: 'Operativo',
  },
  {
    orden: 'LAB-5403',
    area: 'Microbiología',
    muestras: 37,
    criticos: 3,
    tmr: '03:12',
    estado: 'Observación',
  },
]

export const hospitalFilters: FilterFieldConfig[] = [
  {
    id: 'servicio',
    label: 'Servicio',
    type: 'select',
    placeholder: 'Todos los servicios',
    options: [
      { label: 'Medicina interna', value: 'medicina' },
      { label: 'Cirugía', value: 'cirugia' },
      { label: 'Pediatría', value: 'pediatria' },
    ],
  },
  {
    id: 'periodo',
    label: 'Periodo',
    type: 'select',
    placeholder: 'Periodo',
    options: [
      { label: 'Últimos 7 días', value: '7d' },
      { label: 'Últimos 30 días', value: '30d' },
      { label: 'Mensual', value: 'mensual' },
    ],
  },
  {
    id: 'sede',
    label: 'Sede',
    type: 'search',
    placeholder: 'Sede o piso',
  },
  {
    id: 'fecha',
    label: 'Fecha',
    type: 'date',
  },
]

export const hospitalSeries: ChartSeriesConfig[] = [
  {
    name: 'Egresos',
    type: 'bar',
    data: [18, 22, 19, 24, 21, 27, 25],
  },
  {
    name: 'Estancia promedio',
    type: 'line',
    data: [5.2, 4.9, 5.4, 4.6, 4.8, 4.4, 4.7],
  },
]

export const hospitalRows = [
  {
    servicio: 'Medicina interna',
    egresos: 27,
    estancia: '4.7 días',
    ocupacion: '91%',
    observacion: 'Demanda alta en pacientes crónicos',
  },
  {
    servicio: 'Cirugía',
    egresos: 19,
    estancia: '3.2 días',
    ocupacion: '78%',
    observacion: 'Estable con recambio rápido',
  },
  {
    servicio: 'Pediatría',
    egresos: 14,
    estancia: '2.8 días',
    ocupacion: '69%',
    observacion: 'Pico respiratorio moderado',
  },
]

export const indicatorsFilters: FilterFieldConfig[] = [
  {
    id: 'indicador',
    label: 'Indicador',
    type: 'select',
    placeholder: 'Todos los indicadores',
    options: [
      { label: 'Ocupación hospitalaria', value: 'ocupacion' },
      { label: 'Oportunidad en cita', value: 'oportunidad' },
      { label: 'TMR laboratorio', value: 'tmr' },
    ],
  },
  {
    id: 'corte',
    label: 'Corte',
    type: 'select',
    placeholder: 'Corte',
    options: [
      { label: 'Mensual', value: 'mensual' },
      { label: 'Trimestral', value: 'trimestral' },
      { label: 'Anual', value: 'anual' },
    ],
  },
  {
    id: 'servicio',
    label: 'Servicio',
    type: 'search',
    placeholder: 'Filtrar servicio',
  },
  {
    id: 'fecha',
    label: 'Fecha',
    type: 'date',
  },
]

export const indicatorsSeries: ChartSeriesConfig[] = [
  {
    name: 'Valor actual',
    type: 'line',
    data: [82, 83, 84, 86, 88, 87, 89],
  },
  {
    name: 'Meta',
    type: 'line',
    data: [85, 85, 85, 85, 85, 85, 85],
  },
]

export const indicatorsRows = [
  {
    indicador: 'Ocupación hospitalaria',
    valor: '89%',
    meta: '85%',
    tendencia: 'Positiva',
    corte: 'Abril 2026',
  },
  {
    indicador: 'Oportunidad de cita',
    valor: '6.1 días',
    meta: '5.0 días',
    tendencia: 'Ajuste requerido',
    corte: 'Abril 2026',
  },
  {
    indicador: 'TMR laboratorio',
    valor: '01:14',
    meta: '01:30',
    tendencia: 'Controlado',
    corte: 'Abril 2026',
  },
]

export const monitoringFilters: FilterFieldConfig[] = [
  {
    id: 'estado',
    label: 'Estado',
    type: 'select',
    placeholder: 'Todos los estados',
    options: [
      { label: 'Abierto', value: 'abierto' },
      { label: 'En seguimiento', value: 'seguimiento' },
      { label: 'Cerrado', value: 'cerrado' },
    ],
  },
  {
    id: 'responsable',
    label: 'Responsable',
    type: 'search',
    placeholder: 'Usuario o área',
  },
  {
    id: 'origen',
    label: 'Origen',
    type: 'select',
    placeholder: 'Todos los orígenes',
    options: [
      { label: 'Citas', value: 'citas' },
      { label: 'Laboratorio', value: 'lab' },
      { label: 'Hospitalización', value: 'hosp' },
    ],
  },
  {
    id: 'fecha',
    label: 'Fecha',
    type: 'date',
  },
]

export const monitoringRows = [
  {
    ticket: 'MON-201',
    origen: 'Gestión de cita',
    asunto: 'Cupo bloqueado en agenda de medicina interna',
    estado: 'Abierto',
    responsable: 'Coordinación ambulatoria',
  },
  {
    ticket: 'MON-202',
    origen: 'Laboratorio',
    asunto: 'Retraso de resultados críticos turno noche',
    estado: 'En seguimiento',
    responsable: 'Jefe de laboratorio',
  },
  {
    ticket: 'MON-203',
    origen: 'Hospitalización',
    asunto: 'Diferencia en ocupación reportada vs consolidado',
    estado: 'Cerrado',
    responsable: 'Gestión de camas',
  },
]

export const professionalFilters: FilterFieldConfig[] = [
  {
    id: 'especialidad',
    label: 'Especialidad',
    type: 'select',
    placeholder: 'Todas',
    options: [
      { label: 'Medicina interna', value: 'medicina' },
      { label: 'Pediatría', value: 'pediatria' },
      { label: 'Ginecología', value: 'ginecologia' },
    ],
  },
  {
    id: 'periodo',
    label: 'Periodo',
    type: 'select',
    placeholder: 'Periodo',
    options: [
      { label: 'Semanal', value: 'semanal' },
      { label: 'Mensual', value: 'mensual' },
      { label: 'Trimestral', value: 'trimestral' },
    ],
  },
  {
    id: 'profesional',
    label: 'Profesional',
    type: 'search',
    placeholder: 'Nombre o código',
  },
  {
    id: 'fecha',
    label: 'Fecha',
    type: 'date',
  },
]

export const professionalSeries: ChartSeriesConfig[] = [
  {
    name: 'Atenciones',
    type: 'bar',
    data: [58, 61, 64, 59, 68, 72, 66],
  },
  {
    name: 'Rendimiento',
    type: 'line',
    data: [88, 90, 92, 89, 93, 95, 91],
  },
]

export const professionalRows = [
  {
    profesional: 'Dra. Pardo',
    especialidad: 'Medicina interna',
    atenciones: 72,
    rendimiento: '95%',
    observacion: 'Agenda extendida con alta resolución',
  },
  {
    profesional: 'Dr. Ospina',
    especialidad: 'Pediatría',
    atenciones: 66,
    rendimiento: '91%',
    observacion: 'Mayor demanda en la tarde',
  },
  {
    profesional: 'Dra. León',
    especialidad: 'Ginecología',
    atenciones: 59,
    rendimiento: '89%',
    observacion: 'Bloques de control ocupados',
  },
]

export const weeklyCategories = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
