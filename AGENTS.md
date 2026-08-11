# Contexto operativo

## Arquitectura

- Frontend React 19 + Vite + TypeScript en `src/`.
- Backend Node/Express para SQL Server en `server/`.
- Los documentos normativos que la aplicacion sirve intencionalmente viven en `public/`; las exportaciones y analisis generados viven fuera de Git.
- En desarrollo, Vite usa el backend local en el puerto configurado por `SERVER_PORT`.

## Configuracion y seguridad

- Crear `.env` desde `.env.example` en cada PC. `.env` nunca se versiona.
- No hardcodear hosts, IP, usuarios, contrasenas, tokens, rutas de red ni rutas absolutas de Windows.
- `outputs/`, `informes/`, logs, builds y metadatos locales de Codex son artefactos locales.
- No incluir bases extraidas, listados nominales, datos de pacientes ni documentos institucionales generados en commits.
- El remoto debe ser privado. Antes de publicar, ejecutar la verificacion de seguridad y revisar el diff staged.

## Comandos habituales

- Instalar: `npm install`
- Desarrollo completo: `npm run dev:full`
- Lint: `npm run lint`
- Tipos: `npm run typecheck`
- Pruebas: `npm test`
- Build: `npm run build`
- Revision de seguridad: `npm run security:release-check`

## Reglas de cambio

- No mezclar cambios funcionales existentes con una preparacion de sincronizacion.
- Mantener consultas SQL parametrizadas y configuraciones de conexion en variables de entorno.
- Si un archivo de datos es necesario como fixture, usar datos sinteticos/anónimos y documentar su origen.
- No ejecutar cargas o escrituras contra sistemas institucionales salvo solicitud explicita del usuario.
