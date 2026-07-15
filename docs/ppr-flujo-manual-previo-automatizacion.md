# Flujo operativo PPR para marcha blanca

Esta guia resume como usar el modulo PPR durante la marcha blanca. El objetivo es que el proceso mensual sea trazable sin depender de correos, copias manuales en Excel ni validaciones dispersas.

## Roles

- **Administrador PPR:** prepara el periodo, ejecuta la carga automatica, revisa cruces y mantiene catalogo/coordinadores.
- **Coordinador PPR:** revisa sus actividades, corrige o registra valores manuales, valida valores y firma el periodo cuando su alcance esta completo.
- **Responsable formal:** se gestiona fuera del sistema mediante documento de designacion. Para esta etapa no existe un rol separado en la web.

## Flujo mensual recomendado

1. **Definir periodo activo**
   - Confirmar que `SP_PPR_PERIODO_ACTIVO` devuelve el mes que se va a trabajar.
   - El periodo debe estar abierto para permitir carga, registro, validacion y firma.

2. **Ejecutar carga automatica**
   - Entrar a `PPR > Administracion > Carga mensual`.
   - Seleccionar el programa y la fuente automatica correspondiente.
   - Ejecutar la carga solo una vez que el periodo activo sea correcto.
   - La carga sobrescribe valores del periodo activo para actividades cruzadas y las deja pendientes de validacion.

3. **Revisar resultado de carga**
   - Revisar filas leidas, cruzadas, actualizadas y no cruzadas.
   - Las filas no cruzadas deben revisarse contra el catalogo de actividades o contra la logica del procedimiento.
   - Las actividades manuales o sin fuente quedan para registro del coordinador.

4. **Validacion por coordinador**
   - El coordinador entra a `Mis Actividades`.
   - Revisa valores precargados por SIGH.
   - Registra los valores manuales que correspondan.
   - Valida cada actividad de su alcance operativo.
   - Si el programa tiene agrupaciones, puede ver todo el programa, pero solo registra y valida las actividades de su grupo.

5. **Firma**
   - Cuando todas las actividades editables del coordinador estan validadas, el sistema permite firmar.
   - Durante marcha blanca el PDF indica `FIRMA FICTICIA DE PRUEBA - NO RENIEC`.
   - Esa firma sirve para probar trazabilidad y flujo operativo, no como firma oficial.
   - La opcion admin para firmar con pendientes debe usarse solo para pruebas controladas.

6. **Seguimiento**
   - Revisar `Inicio`, `Periodos`, `Programas`, `Dashboard` y `Reportes`.
   - Los pendientes de firma deben corresponder al alcance operativo real del coordinador.
   - Los dashboards pueden mostrar todo el programa para facilitar supervision interna.

7. **Cierre mensual**
   - Confirmar que no quedan filas no cruzadas relevantes sin resolver.
   - Confirmar que los coordinadores terminaron validacion y firma de su alcance.
   - Exportar o consolidar la matriz final cuando aplique.
   - Cerrar o cambiar el periodo activo solo despues de dejar trazabilidad del mes.

## Que hacer con filas no cruzadas

- Si la fila corresponde a una actividad existente, corregir el codigo/nombre usado para el cruce.
- Si la fila pertenece a registro manual, mantenerla fuera del procedimiento automatico.
- Si la actividad no existe en el catalogo PPR, no crearla sin validacion previa del catalogo oficial.
- Si el procedimiento esta sumando una actividad de otro grupo, ajustar el procedimiento y documentar el criterio.

## Reglas de marcha blanca

- No vender la firma ficticia como firma oficial.
- No cerrar el periodo si aun hay coordinadores validando.
- No ejecutar carga automatica sobre un periodo ya firmado salvo prueba controlada.
- No corregir valores directamente en base de datos si puede hacerse desde el modulo.
- Registrar cualquier excepcion para ajustar procedimientos, catalogo o responsables antes de produccion.
