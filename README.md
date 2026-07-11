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

## Backend Node + Express + SQL Server

Para consultas reales contra SQL Server ahora existe un backend ligero en `server/` que expone:

- `GET /legacy-api/health`
- `GET /legacy-api/reports/centro-obstetrico?fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD`

### Configuracion

1. Crea un archivo `.env` a partir de `.env.example`
2. Completa al menos:

- `SQL_USER`
- `SQL_PASSWORD`

### Arranque local

Frontend y backend juntos:

```bash
npm run dev:full
```

Solo backend:

```bash
npm run server
```

Solo frontend:

```bash
npm run dev
```

En desarrollo, Vite redirige `/legacy-api` hacia `http://localhost:8787`, por lo que el frontend sigue usando la misma base URL.

## Despliegue Windows Server + Apache HTTPS

Para despliegue con Apache en Windows como servidor web y reverse proxy, usar la guia [docs/deploy-apache-windows.md](docs/deploy-apache-windows.md).

Ese despliegue sirve `dist/`, redirige HTTP a HTTPS, reenvia `/legacy-api` a Node.js interno en `http://127.0.0.1:8787`, usa certificados SSL configurados en Apache y permite refrescar rutas de React Router como `/app`, `/sigh` y `/ppr`.

No subir certificados, `private.key`, passwords ni credenciales reales al repositorio. Node.js debe mantenerse interno con `SERVER_PORT=8787`; Apache maneja los puertos `80`/`443`.

## Documentacion PPR

- [Flujo manual previo a la automatizacion](docs/ppr-flujo-manual-previo-automatizacion.md): registro historico del proceso mensual PPR antes del modulo actual, con puntos de dolor, casos especiales y decisiones que justifican la automatizacion.

## Despliegue Windows Server + Apache HTTP puerto 80

Este despliegue es para uso local/intranet por HTTP. Apache expone la aplicacion en el puerto 80, sirve el frontend compilado desde `dist/` y reenvia `/legacy-api` hacia Node.js en `http://127.0.0.1:8787`.

No configurar HTTPS/SSL ni puerto 443 en esta etapa. No usar Vite dev server ni `npm run dev:full` para el despliegue final.

### Arquitectura

- Usuario externo: `http://reporteador.heves.gob.pe`
- Apache externo: puerto `80`
- Frontend: archivos estaticos en `dist/`
- Backend Node.js interno: `SERVER_PORT=8787`
- API publica por Apache: `/legacy-api`
- Node.js no debe exponerse directamente al usuario

El frontend debe usar la API de forma relativa:

```env
VITE_API_BASE_URL=/legacy-api
```

La configuracion actual en `src/config/app-config.ts` mantiene:

```ts
apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/legacy-api'
```

No deben agregarse llamadas hardcodeadas desde el frontend a `localhost:8787`, `localhost:5173` ni `http://IP:8787`.

### .env recomendado para intranet HTTP

Crear el `.env` en el servidor sin subir credenciales reales al repositorio:

```env
NODE_ENV=development
SERVER_PORT=8787
COOKIE_SECURE=false
VITE_API_BASE_URL=/legacy-api
```

Agregar tambien las variables reales necesarias para SQL Server, JWT u otros secretos del ambiente. No versionar `.env` con credenciales.

`COOKIE_SECURE=false` permite que la cookie de sesion funcione en HTTP. Si `COOKIE_SECURE` no esta definido, el backend usa cookies `secure=true` solo cuando `NODE_ENV=production`.

### Comandos de despliegue

Ejecutar en el servidor:

```powershell
npm ci
npm run build
npm run server
```

`npm run build` genera `dist/`. Apache debe apuntar su `DocumentRoot` a esa carpeta. Para mantener Node.js corriendo como servicio en Windows, usar el mecanismo operativo que definan para el servidor (por ejemplo NSSM, PM2 o el programador de tareas), siempre ejecutando `npm run server`.

### Modulos Apache requeridos

Habilitar estos modulos:

```apache
mod_rewrite
mod_proxy
mod_proxy_http
mod_headers
```

### VirtualHost HTTP puerto 80

Ejemplo para `C:/Apps/Reporteador-2.0/dist`:

```apache
<VirtualHost *:80>
    ServerName reporteador.heves.gob.pe

    DocumentRoot "C:/Apps/Reporteador-2.0/dist"

    <Directory "C:/Apps/Reporteador-2.0/dist">
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted

        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    ProxyPreserveHost On

    ProxyPass "/legacy-api/" "http://127.0.0.1:8787/legacy-api/"
    ProxyPassReverse "/legacy-api/" "http://127.0.0.1:8787/legacy-api/"

    ProxyPass "/legacy-api" "http://127.0.0.1:8787/legacy-api"
    ProxyPassReverse "/legacy-api" "http://127.0.0.1:8787/legacy-api"
</VirtualHost>
```

### Pruebas finales

- Frontend: `http://reporteador.heves.gob.pe`
- API por Apache: `http://reporteador.heves.gob.pe/legacy-api/health`
- Node interno: `http://localhost:8787/legacy-api/health`

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
