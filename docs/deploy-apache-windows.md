# Despliegue en Windows Server con Apache

Esta guia usa Apache en Windows como servidor frontal HTTP/HTTPS y reverse proxy. Node.js queda interno en `http://127.0.0.1:8787` y no debe exponerse directamente al usuario.

Dominio publico esperado:

```text
https://reporteador.heves.gob.pe
```

## Requisitos

- Windows Server
- Apache HTTP Server para Windows
- Node.js
- Certificado SSL para `*.heves.gob.pe`
- DNS interno `reporteador.heves.gob.pe` apuntando a la IP del servidor

## Modulos Apache necesarios

Habilitar estos modulos en Apache:

```apache
LoadModule ssl_module modules/mod_ssl.so
LoadModule rewrite_module modules/mod_rewrite.so
LoadModule proxy_module modules/mod_proxy.so
LoadModule proxy_http_module modules/mod_proxy_http.so
LoadModule headers_module modules/mod_headers.so
LoadModule socache_shmcb_module modules/mod_socache_shmcb.so
```

Segun la distribucion de Apache, tambien puede ser necesario incluir la configuracion SSL global, por ejemplo `conf/extra/httpd-ssl.conf`.

## Arquitectura

- Apache maneja HTTP/HTTPS, certificados SSL y puertos `80`/`443`.
- Apache sirve el frontend compilado desde `dist/`.
- Apache redirige HTTP a HTTPS.
- Apache reenvia `/legacy-api` hacia `http://127.0.0.1:8787/legacy-api`.
- React Router funciona al refrescar rutas como `/app`, `/sigh`, `/ppr`, etc.
- Express se mantiene como backend interno y escucha con `SERVER_PORT=8787`.

No cambiar Node.js a los puertos `80` ni `443`. No configurar SSL dentro de Node.js.

## API relativa del frontend

El frontend debe llamar la API siempre de forma relativa:

```env
VITE_API_BASE_URL=/legacy-api
```

La configuracion esperada en `src/config/app-config.ts` es:

```ts
apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/legacy-api'
```

No agregar llamadas hardcodeadas desde el frontend a `localhost`, IPs fijas ni puertos.

## Variables de entorno para Apache + HTTPS

Crear el `.env` en el servidor sin subir credenciales reales al repositorio:

```env
NODE_ENV=production
SERVER_PORT=8787
COOKIE_SECURE=true
VITE_API_BASE_URL=/legacy-api
```

Agregar tambien las variables reales necesarias para SQL Server, JWT u otros secretos del ambiente.

No versionar `.env`, passwords, certificados, `private.key`, archivos `.crt`, `.pfx`, `.pem` ni otros secretos.

`COOKIE_SECURE=true` hace que la cookie de sesion se envie solo por HTTPS. Apache termina SSL y reenvia la solicitud a Node.js internamente.

## Certificados

Apache debe apuntar a los certificados instalados fuera del proyecto, por ejemplo:

```text
C:/Apache24/conf/ssl/STAR_heves_gob_pe.crt
C:/Apache24/conf/ssl/private.key
```

No copiar certificados ni llaves privadas dentro del repositorio de Reporteador 2.0.

## Build y arranque

Ejecutar en el servidor:

```powershell
npm ci
npm run build
npm run server
```

`npm run build` genera `dist/`. Apache debe apuntar su `DocumentRoot` a esa carpeta.

Para mantener Node.js corriendo como servicio en Windows, usar el mecanismo operativo definido para el servidor, por ejemplo NSSM, PM2 o el Programador de tareas, siempre ejecutando `npm run server`.

## Ruta fisica del frontend

Ejemplo:

```text
C:\Apps\Reporteador-2.0\dist
```

Tambien puede usarse la ruta real donde se despliegue el proyecto, pero el `DocumentRoot` debe apuntar a la carpeta `dist` generada por `npm run build`.

## VirtualHost Apache

Ejemplo para `C:/Apps/Reporteador-2.0/dist` y certificados ubicados fuera del proyecto:

```apache
Listen 80
Listen 443

<VirtualHost *:80>
    ServerName reporteador.heves.gob.pe

    RewriteEngine On
    RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
</VirtualHost>

<VirtualHost *:443>
    ServerName reporteador.heves.gob.pe

    DocumentRoot "C:/Apps/Reporteador-2.0/dist"

    SSLEngine on
    SSLCertificateFile "C:/Apache24/conf/ssl/STAR_heves_gob_pe.crt"
    SSLCertificateKeyFile "C:/Apache24/conf/ssl/private.key"

    ProxyPreserveHost On
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port "443"

    ProxyPass "/legacy-api/" "http://127.0.0.1:8787/legacy-api/"
    ProxyPassReverse "/legacy-api/" "http://127.0.0.1:8787/legacy-api/"
    ProxyPass "/legacy-api" "http://127.0.0.1:8787/legacy-api"
    ProxyPassReverse "/legacy-api" "http://127.0.0.1:8787/legacy-api"

    <Directory "C:/Apps/Reporteador-2.0/dist">
        Options -Indexes +FollowSymLinks
        AllowOverride None
        Require all granted

        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteCond %{REQUEST_URI} !^/legacy-api(/|$)
        RewriteRule . /index.html [L]
    </Directory>
</VirtualHost>
```

## Pruebas finales

Con Node.js iniciado internamente:

```text
http://localhost:8787/legacy-api/health
```

Con Apache publicado por HTTPS:

```text
https://reporteador.heves.gob.pe/legacy-api/health
https://reporteador.heves.gob.pe
https://reporteador.heves.gob.pe/app
```

Si `/app`, `/sigh` o `/ppr` refrescan correctamente, la regla de fallback de React Router esta funcionando.
