# Procedimientos almacenados de la app

Estos scripts mueven la logica SQL que antes estaba embebida en servicios JavaScript a procedimientos almacenados.

Ejecutar antes de desplegar el codigo que los consume:

1. `001-app-report-procedures.sql`
   - Ejecutar en la conexion `general` para los procedimientos de Centro Obstetrico y Lavado de Manos.
   - Ejecutar en la conexion `sigh1` para los procedimientos de Monitoreo, Produccion Medicos/Obstetras y Camas.
2. `002-ppr-data-procedures.sql`
   - Ejecutar en la conexion `general`.
3. `003-ppr-document-procedures.sql`
   - Ejecutar en la conexion `general`.
4. `004-legacy-export-procedures.sql`
   - Ejecutar en la conexion `sigh1` para recuperaciones legacy de exportaciones.
   - Ejecutar tambien en `sigh1` y `sigh2` para `SP_APP_EPI_DENGUE_PATIENT_DNI_CSV`, porque Seguimiento Dengue usa ambas conexiones segun el tipo de reporte.

Los archivos usan `CREATE OR ALTER PROCEDURE`, por lo que se pueden volver a ejecutar para actualizar los procedimientos.
