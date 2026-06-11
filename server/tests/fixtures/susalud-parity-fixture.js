function makeRow(servicio, overrides = {}) {
  const total = overrides.total ?? 0
  const cinah = overrides.cinah ?? 0
  const cocup = overrides.cocup ?? 0
  const clibr = overrides.clibr ?? Math.max(total - cinah - cocup, 0)

  return {
    idservicio: overrides.idservicio ?? 0,
    piso: overrides.piso ?? '',
    servicio,
    tipo: overrides.tipo ?? 'CAMA',

    total,
    cinah,
    chabi: overrides.chabi ?? Math.max(total - cinah, 0),
    cocup,
    clibr,
    ctran: overrides.ctran ?? 0,

    c_vm: overrides.c_vm ?? 0,
    c_fl: overrides.c_fl ?? 0,
    c_oxi: overrides.c_oxi ?? 0,

    totalvm: overrides.totalvm ?? 0,
    vmopera: overrides.vmopera ?? 0,
    vminopera: overrides.vminopera ?? 0,

    monitor_total: overrides.monitor_total ?? 0,
    monitor_operativos: overrides.monitor_operativos ?? 0,
    monitor_inoperativos: overrides.monitor_inoperativos ?? 0,
    fvopera: overrides.fvopera ?? overrides.monitor_operativos ?? 0,
    fvinopera: overrides.fvinopera ?? overrides.monitor_inoperativos ?? 0,

    con_oxi: overrides.con_oxi ?? 0,
    sin_oxi: overrides.sin_oxi ?? 0,

    e_hosp: overrides.e_hosp ?? 0,
    e_hosp_ox: overrides.e_hosp_ox ?? 0,
  }
}

// Deliberadamente distintos para comprobar que cuadros principales NO usan corte.
export const corteRowsFixture = [
  makeRow('UCI ADULTOS A', { idservicio: 672, total: 99, cinah: 9, cocup: 70, clibr: 20 }),
  makeRow('UCIN ADULTOS C', { idservicio: 669, total: 55, cinah: 5, cocup: 40, clibr: 10 }),
  makeRow('HOSPITALIZACION MEDICINA', { idservicio: 424, total: 500, cinah: 0, cocup: 480, clibr: 20 }),
  makeRow('OBSERVACION GINECO-OBSTETRICIA', { idservicio: 786, total: 300, cinah: 20, cocup: 200, clibr: 80 }),
]

// Replica de cantidades legacy objetivo por bloque.
export const resumenRowsFixture = [
  makeRow('UCI ADULTOS A', {
    idservicio: 672,
    total: 18,
    cinah: 0,
    cocup: 17,
    clibr: 1,
    c_vm: 0,
    vmopera: 10,
    vminopera: 6,
    fvopera: 20,
    fvinopera: 1,
  }),
  makeRow('UCI PEDIATRICA', {
    idservicio: 670,
    total: 7,
    cinah: 1,
    cocup: 5,
    clibr: 1,
    c_vm: 0,
    vmopera: 5,
    vminopera: 2,
    fvopera: 10,
    fvinopera: 0,
  }),
  makeRow('UCI NEONATOLOGIA 2', {
    idservicio: 430,
    total: 8,
    cinah: 0,
    cocup: 8,
    clibr: 0,
    c_vm: 0,
    vmopera: 6,
    vminopera: 4,
    fvopera: 14,
    fvinopera: 0,
  }),

  makeRow('UCIN ADULTOS C', {
    idservicio: 669,
    total: 10,
    cinah: 2,
    cocup: 6,
    clibr: 2,
    c_vm: 0,
    vmopera: 4,
    vminopera: 3,
    fvopera: 15,
    fvinopera: 0,
  }),
  makeRow('UCIN PEDIATRICO', {
    idservicio: 690,
    total: 6,
    cinah: 2,
    cocup: 4,
    clibr: 0,
    c_vm: 0,
    vmopera: 5,
    vminopera: 2,
    fvopera: 10,
    fvinopera: 0,
  }),
  makeRow('UCI NEONATOLOGIA 1,3 (NO SUSALUD)', {
    idservicio: 440,
    tipo: 'CUNA',
    total: 24,
    cinah: 4,
    cocup: 12,
    clibr: 8,
    c_vm: 0,
  }),

  makeRow('HOSPITALIZACION MEDICINA', {
    idservicio: 424,
    total: 160,
    cinah: 0,
    cocup: 151,
    clibr: 9,
    c_oxi: 0,
  }),
  makeRow('HOSPITALIZACION PEDIATRIA', {
    idservicio: 650,
    total: 32,
    cinah: 1,
    cocup: 30,
    clibr: 1,
    c_oxi: 0,
  }),

  makeRow('SHOCK TRAUMA ADULTOS', {
    idservicio: 398,
    total: 8,
    cinah: 0,
    cocup: 1,
    clibr: 7,
    c_vm: 0,
    vmopera: 5,
    vminopera: 5,
    fvopera: 20,
    fvinopera: 0,
  }),
  // El exportable SUSALUD actual solo considera tipo "Cama"; otros recursos
  // quedan en el fixture para verificar que el filtro los excluye.
  makeRow('OBSERVACION GINECO-OBSTETRICIA', {
    idservicio: 418,
    tipo: 'Cama',
    total: 5,
    cinah: 0,
    cocup: 3,
    clibr: 2,
    c_vm: 0,
  }),
  makeRow('OBSERVACION MEDICINA 1', {
    idservicio: 443,
    tipo: 'Chailones',
    total: 8,
    cinah: 0,
    cocup: 8,
    clibr: 0,
    c_vm: 0,
  }),
  makeRow('OBSERVACION MUJERES', {
    idservicio: 775,
    tipo: 'Cama',
    total: 9,
    cinah: 0,
    cocup: 9,
    clibr: 0,
    c_vm: 0,
  }),
  makeRow('OBSERVACION VARONES', {
    idservicio: 776,
    tipo: 'Cama',
    total: 10,
    cinah: 0,
    cocup: 8,
    clibr: 2,
    c_vm: 0,
  }),
  makeRow('OBSERVACION QUIRURGICA', {
    idservicio: 437,
    tipo: 'Silla',
    total: 32,
    cinah: 5,
    cocup: 13,
    clibr: 14,
    c_vm: 0,
  }),
  makeRow('OBSERVACION QUIRURGICA', {
    idservicio: 437,
    tipo: 'Chailones',
    total: 8,
    cinah: 0,
    cocup: 7,
    clibr: 1,
    c_vm: 0,
  }),
  makeRow('OBSERVACION MEDICINA 3', {
    idservicio: 664,
    tipo: 'Cama',
    total: 2,
    cinah: 0,
    cocup: 2,
    clibr: 0,
    c_vm: 0,
  }),
  makeRow('OBSERVACION MEDICINA 3', {
    idservicio: 664,
    tipo: 'Silla',
    total: 26,
    cinah: 0,
    cocup: 16,
    clibr: 10,
    c_vm: 0,
  }),
  makeRow('OBSERVACION MEDICINA 3', {
    idservicio: 664,
    tipo: 'Chailones',
    total: 7,
    cinah: 0,
    cocup: 7,
    clibr: 0,
    c_vm: 0,
  }),
  makeRow('OBSERVACION AISLADO 1 PEDIATRICA', {
    idservicio: 686,
    total: 10,
    cinah: 0,
    cocup: 10,
    clibr: 0,
    c_vm: 0,
  }),
]

export const expectedParity = {
  uci: {
    'UCI ADULTOS': [18, 0, 18, 1, 17, 17, 0, 0],
    'UCI PEDIATRICA': [7, 1, 6, 1, 5, 5, 0, 0],
    'UCI NEONATOLOGIA': [8, 0, 8, 0, 8, 8, 0, 0],
  },
  ucin: {
    'UCIN ADULTO': [10, 2, 8, 2, 6, 6, 0, 0, 0],
    'UCIN PEDIATRICO': [6, 2, 4, 0, 4, 4, 0, 0, 0],
    'UCIN NEONATOLOGIA': [0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  hospitalizacion: {
    'HOSPITALIZACION ADULTOS': [160, 0, 160, 9, 151, 151, 0, 0],
    'HOSPITALIZACION PEDIATRICA': [32, 1, 31, 1, 30, 30, 0, 0],
  },
  emergencia: {
    'UNIDAD DE TRAUMA SCHOCK': [8, 0, 8, 7, 1, 1, 0, 0, 0],
    'EMERGENCIA ADULTOS': [26, 0, 26, 4, 22, 22, 0, 0, 0],
    'EMERGENCIA PEDIATRICA': [10, 0, 10, 0, 10, 10, 0, 0, 0],
  },
  emergenciaAmpliada: [0, 0, 0],
  recursos: {
    VENTILADORES: [57, 22, 35, 35, 0],
    'MONITOREO DE FUNCIONES VITALES': [90, 1, 89, 48, 41],
  },
}
