export const centroObstetricoSql = {
  endpoint: '/legacy-api/reports/centro-obstetrico',
  procedures: {
    lastUpdated: 'dbo.SP_APP_CENTRO_OBSTETRICO_LAST_UPDATED',
    rows: 'dbo.SP_APP_CENTRO_OBSTETRICO_ROWS',
  },
} as const
