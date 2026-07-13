import fs from 'node:fs/promises'
import path from 'node:path'
import { getSqlPool, closeSqlPool, sql } from '../server/db/sql-server.js'

const backupDir = path.join(
  'informes',
  'ppr-sp-backups',
  `access-and-code-${new Date().toISOString().replace(/[:.]/g, '-')}`,
)

const validateProcedure = `
ALTER PROCEDURE [dbo].[SP_USUARIO_VALIDA_ppr]
    @usuario  VARCHAR(20),
    @clave    VARCHAR(20),
    @ipequipo VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        BEGIN TRAN;

        DECLARE @filas INT;

        SELECT
            E.IDEMPLEADO,
            UPPER(E.ApellidoPaterno + ' ' + E.ApellidoMaterno + ' ' + E.Nombres) AS EMPLEADO,
            CASE WHEN E.DNI = '70715971' THEN 'admin' ELSE 'coordinador' END AS ROL
        FROM SIGH_DEPURA..T_Empleado E
        INNER JOIN SIGH_DEPURA..T_UsuarioRol UR
            ON UR.IDEMPLEADO = E.IDEMPLEADO
        WHERE E.DNI = @usuario
          AND E.CLAVEVWEB = @clave
          AND UR.IDROL = 209
          AND (
                E.DNI = '70715971'
                OR EXISTS (
                    SELECT 1
                    FROM dbo.ppr_user_programs up
                    WHERE up.employee_id = E.IDEMPLEADO
                      AND ISNULL(up.is_active, 1) = 1
                )
                OR EXISTS (
                    SELECT 1
                    FROM dbo.ppr_responsable_employee_map rem
                    WHERE rem.employee_id = E.IDEMPLEADO
                )
                OR EXISTS (
                    SELECT 1
                    FROM dbo.ppr_coordinadores c
                    WHERE c.idempleado = E.IDEMPLEADO
                      AND c.activo = 1
                )
          );

        SET @filas = @@ROWCOUNT;

        IF @filas > 0
            INSERT INTO SIGH_DEPURA..Rpt_Auditoria_Reportes
                (usuario_accede, usuario_nombres, fecha_operacion, equipo_ip, tipo_operacion)
            SELECT UPPER(E.DNI),
                   UPPER(E.ApellidoPaterno + ' ' + E.ApellidoMaterno + ' ' + E.Nombres),
                   GETDATE(), @ipequipo, 'Acceso Correcto'
            FROM SIGH_DEPURA..T_Empleado E
            WHERE E.DNI = @usuario
              AND E.CLAVEVWEB = @clave;
        ELSE
            INSERT INTO SIGH_DEPURA..Rpt_Auditoria_Reportes
                (usuario_accede, usuario_nombres, fecha_operacion, equipo_ip, tipo_operacion)
            VALUES (UPPER(@usuario), 'Usuario Desconocido', GETDATE(), @ipequipo, 'Acceso Fallido');

        COMMIT TRAN;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        SELECT 0 AS ESTADO, 'ERROR EN LA VALIDACION PPR' AS MENSAJE;
    END CATCH
END
`

async function readProcedure(pool, procedureName) {
  const result = await pool.request()
    .input('procedure_name', sql.NVarChar(128), procedureName)
    .query(`
      SELECT OBJECT_DEFINITION(OBJECT_ID('dbo.' + @procedure_name)) AS definition;
    `)
  return result.recordset[0]?.definition ?? null
}

async function main() {
  await fs.mkdir(backupDir, { recursive: true })

  const pool = await getSqlPool('general')
  try {
    const originalValidate = await readProcedure(pool, 'SP_USUARIO_VALIDA_ppr')
    if (!originalValidate) throw new Error('No se encontro dbo.SP_USUARIO_VALIDA_ppr')
    await fs.writeFile(path.join(backupDir, 'SP_USUARIO_VALIDA_ppr.sql'), originalValidate, 'utf8')

    const activityBackup = await pool.request()
      .input('activity_id', sql.Int, 335)
      .query(`
        SELECT id, program_id, code, name, unit, annual_goal, sort_order, is_active
        FROM dbo.ppr_activities
        WHERE id = @activity_id;
      `)
    await fs.writeFile(
      path.join(backupDir, 'ppr_activities_335.json'),
      JSON.stringify(activityBackup.recordset, null, 2),
      'utf8',
    )

    await pool.request()
      .input('definition', sql.NVarChar(sql.MAX), validateProcedure)
      .query('EXEC sys.sp_executesql @definition;')
    console.log('OK dbo.SP_USUARIO_VALIDA_ppr')

    const updateResult = await pool.request()
      .input('activity_id', sql.Int, 335)
      .input('code', sql.VarChar(20), '31-GO')
      .query(`
        UPDATE dbo.ppr_activities
        SET code = @code
        WHERE id = @activity_id
          AND program_id = 11
          AND name = 'ATENCION DEL PACIENTE GINECO ONCOLOGICO EN HOSPITALIZACION';

        SELECT @@ROWCOUNT AS affected;
      `)
    console.log(`OK ppr_activities id=335 affected=${Number(updateResult.recordset[0]?.affected ?? 0)}`)
    console.log(`Respaldos: ${backupDir}`)
  } finally {
    await closeSqlPool('general')
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`ERROR ${error.message}`)
    process.exit(1)
  })
