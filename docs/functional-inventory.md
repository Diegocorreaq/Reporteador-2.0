# Inventario funcional resumido

## Patrones de pantalla preservados

- login
- inicio / home
- filtros + tabla
- filtros + gráfico + tabla
- exportador
- detalle con modal
- dashboards e indicadores
- producción hospitalaria
- gestión de camas
- gestión de citas
- laboratorio
- monitoreo

## Separación de ambientes

### Principal

- mayor cobertura modular
- hospitalización
- indicadores institucionales
- módulos clínicos y administrativos más amplios

### `/sigh`

- subambiente con navegación propia
- exportador propio
- foco operativo y monitoreo
- subconjunto real de módulos del legacy

## Prioridad de migración ya reflejada en la base

### Alta

- auth
- inicio
- exportaciones
- gestión de cita
- camas COVID
- laboratorio
- producción hospitalaria
- indicadores

### Media

- monitoreo
- prodprofesional
- consulta externa
- expediente

### Posterior

- resto del inventario legacy
