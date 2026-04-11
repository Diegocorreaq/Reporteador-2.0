# Reporteador 2.0

Base moderna de `Reporteador` construida sobre React + Vite + TypeScript.

En esta iteracion la prioridad fue acercar la experiencia al sistema legacy sin romper la arquitectura nueva:

- login simple, sin selector de ambiente
- separacion entre `Reporteador` y `Datos en Linea`
- navegacion basada en menu y submenu del legacy
- accesos rapidos historicos visibles en el encabezado
- estructura lista para menu dinamico por permisos

## Fuente de verdad usada

- `Reporteador.zip`: referencia funcional y visual-operativa del sistema original
- `Reporteador-2.0`: base moderna actual
- `.legacy_extract/Reporteador`: extraccion local usada para comparar vistas, menu y header del legacy

## Stack

- Vite
- React 19
- TypeScript
- React Router
- Tailwind CSS
- TanStack Table
- React Hook Form + Zod
- ECharts
- Zustand
- Axios

## Como ejecutar

```bash
npm install
npm run dev
```

La app queda disponible en `http://localhost:5173`.

## Validacion tecnica

```bash
npm run lint
npm run typecheck
npm run build
```

Estado actual de esta iteracion:

- `lint`: OK
- `typecheck`: OK
- `build`: OK

## Ambientes

- `Reporteador`: shell, menu y rutas bajo `/app`
- `Datos en Linea`: shell, menu y rutas bajo `/sigh`

Ambos ambientes comparten:

- design system
- componentes base
- tablas
- formularios
- modales
- servicios
- utilidades

Cada ambiente mantiene su propia:

- home
- navegacion
- rutas
- accesos destacados

## Navegacion y permisos

La navegacion visible ya no esta armada como inventario tecnico. Ahora se construye desde configuraciones separadas por ambiente:

- `src/config/navigation-main.ts`
- `src/config/navigation-sigh.ts`

La estructura comun vive en:

- `src/config/navigation-builders.ts`
- `src/config/navigation.ts`
- `src/services/menu/menu.service.ts`

Cada grupo, submenu o acceso rapido puede declarar reglas de acceso con:

- permisos
- roles

La app ya filtra elementos visibles por usuario, por lo que luego se puede conectar el menu a backend sin rehacer la UI.

## Login

El login actual se enfoca solo en:

- usuario
- contrasena
- accion de ingreso

El cambio de ambiente se resuelve despues del ingreso desde la propia aplicacion.

## Accesos rapidos preservados

En desktop quedan visibles desde el encabezado y en movil siguen accesibles desde el menu secundario:

- `Datos en Linea`
- `Ver manuales y tutoriales`
- `Formulario de solicitud de informacion`
- `Desembalse Quirurgico 2024`
- `Operacion VIDA`

## Estructura principal

```text
src/
  app/
  components/
  config/
  hooks/
  lib/
  modules/
  services/
  styles/
  types/
```

## Notas

- `.legacy_extract/` se usa solo como referencia local de comparacion y esta ignorado por lint.
- La siguiente etapa puede conectar autenticacion, permisos y menu dinamico al backend real sin cambiar la arquitectura base.
