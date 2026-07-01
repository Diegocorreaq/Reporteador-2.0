export interface CamasDetailColumnSpec {
  key: string
  label: string
}

export interface CamasDetailModalSpec {
  title: string
  columns: CamasDetailColumnSpec[]
}

export const CAMAS_DETAIL_MODAL_SPECS: Record<string, CamasDetailModalSpec> = {
  '1': {
    title: 'Camas Operativas',
    columns: [
      { key: 'piso', label: 'Piso' },
      { key: 'codigocama', label: 'Cod. Cama' },
      { key: 'estadocama', label: 'Estado' },
      { key: 'paciente', label: 'Paciente' },
    ],
  },
  '2': {
    title: 'Camas Ocupadas',
    columns: [
      { key: 'piso', label: 'Piso' },
      { key: 'codigocama', label: 'Cod. Cama' },
      { key: 'estadocama', label: 'Estado' },
      { key: 'paciente', label: 'Paciente' },
      { key: 'servicioactual', label: 'Servicio actual' },
    ],
  },
  '3': {
    title: 'Camas Disponibles',
    columns: [
      { key: 'piso', label: 'Piso' },
      { key: 'codigocama', label: 'Cod. Cama' },
      { key: 'estadocama', label: 'Estado' },
      { key: 'libre', label: 'Libre Desde' },
    ],
  },
  '4': {
    title: 'Camas Transitorias',
    columns: [
      { key: 'piso', label: 'Piso' },
      { key: 'codigocama', label: 'Cod. Cama' },
      { key: 'estadocama', label: 'Estado' },
      { key: 'paciente', label: 'Paciente' },
    ],
  },
  '5': {
    title: 'Camas Inhabilitadas',
    columns: [
      { key: 'piso', label: 'Piso' },
      { key: 'codigocama', label: 'Cod. Cama' },
      { key: 'estadocama', label: 'Estado' },
      { key: 'paciente', label: 'Paciente' },
    ],
  },
  '6': {
    title: 'Ventilacion Mecanica - En Uso',
    columns: [
      { key: 'idcuenta', label: 'Nro Cuenta' },
      { key: 'codigocama', label: 'Cod. Cama' },
      { key: 'estadocama', label: 'Estado' },
      { key: 'paciente', label: 'Paciente' },
    ],
  },
  '7': {
    title: 'Oxigeno Alto Flujo - En Uso',
    columns: [
      { key: 'idcuenta', label: 'Nro Cuenta' },
      { key: 'codigocama', label: 'Cod. Cama' },
      { key: 'estadocama', label: 'Estado' },
      { key: 'paciente', label: 'Paciente' },
    ],
  },
  '8': {
    title: 'Prueba Realizada - Covid (+)',
    columns: [
      { key: 'idcuenta', label: 'Nro Cuenta' },
      { key: 'paciente', label: 'Paciente' },
      { key: 'cama', label: 'Nro Cama' },
      { key: 'tipomuestra', label: 'Tipo Muestra' },
      { key: 'tipoprueba', label: 'Tipo Prueba' },
      { key: 'fecha_i', label: 'Fecha Ingreso' },
      { key: 'fecha_s', label: 'Inicio Sintomas' },
      { key: 'fecha_m', label: 'Fecha Solicitud' },
      { key: 'fecha_r', label: 'Fecha Resultado' },
      { key: 'dias', label: 'Dias c/Sintomas' },
      { key: 'diah', label: 'Dias Estancia' },
      { key: 'caso', label: 'Tipo Caso' },
    ],
  },
  '9': {
    title: 'Pendiente de Resultado - Antigena',
    columns: [
      { key: 'idcuenta', label: 'Nro Cuenta' },
      { key: 'paciente', label: 'Paciente' },
      { key: 'cama', label: 'Nro Cama' },
      { key: 'tipomuestra', label: 'Tipo Muestra' },
      { key: 'tipoprueba', label: 'Tipo Prueba' },
      { key: 'fecha_i', label: 'Fecha Ingreso' },
      { key: 'fecha_s', label: 'Inicio Sintomas' },
      { key: 'fecha_m', label: 'Fecha Solicitud' },
      { key: 'fecha_r', label: 'Fecha Resultado' },
      { key: 'dias', label: 'Dias c/Sintomas' },
      { key: 'diah', label: 'Dias Estancia' },
      { key: 'caso', label: 'Tipo Caso' },
    ],
  },
  '9a': {
    title: 'Pendiente de Resultado - Molecular',
    columns: [
      { key: 'idcuenta', label: 'Nro Cuenta' },
      { key: 'paciente', label: 'Paciente' },
      { key: 'cama', label: 'Nro Cama' },
      { key: 'tipomuestra', label: 'Tipo Muestra' },
      { key: 'tipoprueba', label: 'Tipo Prueba' },
      { key: 'fecha_i', label: 'Fecha Ingreso' },
      { key: 'fecha_s', label: 'Inicio Sintomas' },
      { key: 'fecha_m', label: 'Fecha Solicitud' },
      { key: 'fecha_r', label: 'Fecha Resultado' },
      { key: 'dias', label: 'Dias c/Sintomas' },
      { key: 'diah', label: 'Dias Estancia' },
      { key: 'caso', label: 'Tipo Caso' },
    ],
  },
}
