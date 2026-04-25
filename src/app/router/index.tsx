import { Suspense, lazy, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthShell } from '@/app/layouts/auth-shell/auth-shell'
import { MainShell } from '@/app/layouts/main-shell/main-shell'
import { SighShell } from '@/app/layouts/sigh-shell/sigh-shell'
import { RequireAuth } from '@/app/router/guards'
import { LoadingState } from '@/components/feedback/loading-state'
import { getModulesByWorkspace } from '@/config/module-registry'
import { getWorkspaceLegacyPowerBiModules } from '@/config/legacy-functional-map'
import { useAuthStore } from '@/modules/auth/store/use-auth-store'

const LoginPage = lazy(() =>
  import('@/modules/auth/pages/login-clean-page').then((module) => ({ default: module.LoginCleanPage })),
)
const CentroObstetricoPage = lazy(() =>
  import('@/modules/centro-obstetrico/pages/centro-obstetrico-page').then((module) => ({
    default: module.CentroObstetricoPage,
  })),
)
const MainHomePage = lazy(() =>
  import('@/modules/inicio/pages/main-home-page').then((module) => ({ default: module.MainHomePage })),
)
const UccaPage = lazy(() =>
  import('@/modules/ucca/pages/ucca-page').then((module) => ({ default: module.UccaPage })),
)
const UccpPage = lazy(() =>
  import('@/modules/uccp/pages/uccp-page').then((module) => ({ default: module.UccpPage })),
)
const SaludMentalReportesPage = lazy(() =>
  import('@/modules/salud-mental-reportes/pages/salud-mental-reportes-page').then((module) => ({
    default: module.SaludMentalReportesPage,
  })),
)
const ExportacionesPage = lazy(() =>
  import('@/modules/exportaciones/pages/exportaciones-page').then((module) => ({ default: module.ExportacionesPage })),
)
const LavadoManosPage = lazy(() =>
  import('@/modules/lavado-manos/pages/lavado-manos-page').then((module) => ({ default: module.LavadoManosPage })),
)
const PprPage = lazy(() =>
  import('@/modules/ppr/pages/ppr-page').then((module) => ({ default: module.PprPage })),
)
const SighHomePage = lazy(() =>
  import('@/modules/inicio/pages/sigh-home-page').then((module) => ({ default: module.SighHomePage })),
)
const LegacyEmbedPage = lazy(() =>
  import('@/modules/shared/pages/legacy-embed-page').then((module) => ({ default: module.LegacyEmbedPage })),
)
const ModuleScaffoldPage = lazy(() =>
  import('@/modules/shared/pages/module-status-page').then((module) => ({ default: module.ModuleStatusPage })),
)
const NotFoundPage = lazy(() =>
  import('@/modules/shared/pages/not-found-clean-page').then((module) => ({ default: module.NotFoundCleanPage })),
)
// SIGH pages - datos en línea
const InformeFamiliaPendientesPage = lazy(() =>
  import('@/modules/sigh/pages/informe-familia-pendientes-page').then((module) => ({
    default: module.InformeFamiliaPendientesPage,
  })),
)
const RegistrosNominalesPage = lazy(() =>
  import('@/modules/sigh/pages/registros-nominales-page').then((module) => ({
    default: module.RegistrosNominalesPage,
  })),
)
const RegistrosProduccionPage = lazy(() =>
  import('@/modules/sigh/pages/registros-produccion-page').then((module) => ({
    default: module.RegistrosProduccionPage,
  })),
)
const ProduccionMedicosPage = lazy(() =>
  import('@/modules/sigh/pages/produccion-medicos-page').then((module) => ({
    default: module.ProduccionMedicosPage,
  })),
)
const MonitoreoCamasPage = lazy(() =>
  import('@/modules/sigh/pages/monitoreo-camas-page').then((module) => ({
    default: module.MonitoreoCamasPage,
  })),
)
const ResumenCamasPage = lazy(() =>
  import('@/modules/sigh/pages/resumen-camas-page').then((module) => ({
    default: module.ResumenCamasPage,
  })),
)
const OcupacionCamaPage = lazy(() =>
  import('@/modules/sigh/pages/ocupacion-cama-page').then((module) => ({
    default: module.OcupacionCamaPage,
  })),
)
const GestionEstanciaCamaPage = lazy(() =>
  import('@/modules/sigh/pages/gestion-estancia-cama-page').then((module) => ({
    default: module.GestionEstanciaCamaPage,
  })),
)
const GestionCitasPage = lazy(() =>
  import('@/modules/sigh/pages/gestion-citas-page').then((module) => ({
    default: module.GestionCitasPage,
  })),
)
const RolConsultaExternaPage = lazy(() =>
  import('@/modules/sigh/pages/rol-consulta-externa-page').then((module) => ({
    default: module.RolConsultaExternaPage,
  })),
)
const MonitoreoTicketsPage = lazy(() =>
  import('@/modules/sigh/pages/monitoreo-tickets-page').then((module) => ({
    default: module.MonitoreoTicketsPage,
  })),
)
const MonitoreoVentanillaPage = lazy(() =>
  import('@/modules/sigh/pages/monitoreo-ventanilla-page').then((module) => ({
    default: module.MonitoreoVentanillaPage,
  })),
)

function lazyElement(element: ReactNode) {
  return <Suspense fallback={<LoadingState />}>{element}</Suspense>
}

function RootRedirect() {
  const user = useAuthStore((state) => state.user)
  const workspace = useAuthStore((state) => state.activeWorkspace)

  if (!user) {
    return <Navigate replace to="/login" />
  }

  return <Navigate replace to={workspace === 'main' ? '/app' : '/sigh'} />
}

const legacyMainEmbedRoutes = getWorkspaceLegacyPowerBiModules('main').map((module) => ({
  path: module.path,
  element: lazyElement(<LegacyEmbedPage />),
}))

const legacySighEmbedRoutes = getWorkspaceLegacyPowerBiModules('sigh').map((module) => ({
  path: module.path,
  element: lazyElement(<LegacyEmbedPage />),
}))

const explicitMainRoutePaths = new Set(
  legacyMainEmbedRoutes
    .map((route) => route.path)
    .concat([
      'atencion-ambulatoria-hospitalizacion/centro-obstetrico',
      'emergencia-cuidados-criticos/indicadores-ucca',
      'emergencia-cuidados-criticos/indicadores-uccp',
      'monitoreo-salud-mental/reportes-monitoreo',
      'zona-descarga/registros-procesados',
      'epidemiologia/lavado-de-manos',
      'ppr',
    ]),
)

const explicitSighRoutePaths = new Set(
  legacySighEmbedRoutes
    .map((route) => route.path)
    .concat([
      'monitoreo-en-linea/informe-familia-pendientes',
      'exportar-registros/registros-nominales',
      'exportar-registros/registros-produccion',
      'produccion-actividades/produccion-medicos',
      'gestion-camas/monitoreo-de-camas',
      'gestion-camas/resumen-de-camas',
      'gestion-camas/porcentaje-de-ocupacion-cama',
      'gestion-camas/gestion-estancia-cama',
      'atencion-al-usuario/gestion-de-citas',
      'atencion-al-usuario/rol-consulta-externa',
      'atencion-al-usuario/monitoreo-de-tickets',
      'atencion-al-usuario/monitoreo-ventanilla',
    ]),
)

const mainScaffoldRoutes = getModulesByWorkspace('main')
  .filter((module) => !explicitMainRoutePaths.has(module.path))
  .map((module) => ({
    path: module.path,
    element: lazyElement(<ModuleScaffoldPage />),
  }))

const sighScaffoldRoutes = getModulesByWorkspace('sigh')
  .filter((module) => !explicitSighRoutePaths.has(module.path))
  .map((module) => ({
    path: module.path,
    element: lazyElement(<ModuleScaffoldPage />),
  }))

const mainImplementedRoutes = [
  ...legacyMainEmbedRoutes,
  {
    path: 'atencion-ambulatoria-hospitalizacion/centro-obstetrico',
    element: lazyElement(<CentroObstetricoPage />),
  },
  {
    path: 'emergencia-cuidados-criticos/indicadores-ucca',
    element: lazyElement(<UccaPage />),
  },
  {
    path: 'emergencia-cuidados-criticos/indicadores-uccp',
    element: lazyElement(<UccpPage />),
  },
  {
    path: 'monitoreo-salud-mental/reportes-monitoreo',
    element: lazyElement(<SaludMentalReportesPage />),
  },
  {
    path: 'zona-descarga/registros-procesados',
    element: lazyElement(<ExportacionesPage />),
  },
  {
    path: 'epidemiologia/lavado-de-manos',
    element: lazyElement(<LavadoManosPage />),
  },
  {
    path: 'ppr',
    element: lazyElement(<PprPage />),
  },
]

const sighImplementedRoutes = [
  ...legacySighEmbedRoutes,
  {
    path: 'monitoreo-en-linea/informe-familia-pendientes',
    element: lazyElement(<InformeFamiliaPendientesPage />),
  },
  {
    path: 'exportar-registros/registros-nominales',
    element: lazyElement(<RegistrosNominalesPage />),
  },
  {
    path: 'exportar-registros/registros-produccion',
    element: lazyElement(<RegistrosProduccionPage />),
  },
  {
    path: 'produccion-actividades/produccion-medicos',
    element: lazyElement(<ProduccionMedicosPage />),
  },
  {
    path: 'gestion-camas/monitoreo-de-camas',
    element: lazyElement(<MonitoreoCamasPage />),
  },
  {
    path: 'gestion-camas/resumen-de-camas',
    element: lazyElement(<ResumenCamasPage />),
  },
  {
    path: 'gestion-camas/porcentaje-de-ocupacion-cama',
    element: lazyElement(<OcupacionCamaPage />),
  },
  {
    path: 'gestion-camas/gestion-estancia-cama',
    element: lazyElement(<GestionEstanciaCamaPage />),
  },
  {
    path: 'atencion-al-usuario/gestion-de-citas',
    element: lazyElement(<GestionCitasPage />),
  },
  {
    path: 'atencion-al-usuario/rol-consulta-externa',
    element: lazyElement(<RolConsultaExternaPage />),
  },
  {
    path: 'atencion-al-usuario/monitoreo-de-tickets',
    element: lazyElement(<MonitoreoTicketsPage />),
  },
  {
    path: 'atencion-al-usuario/monitoreo-ventanilla',
    element: lazyElement(<MonitoreoVentanillaPage />),
  },
]

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    element: <AuthShell />,
    children: [
      {
        path: '/login',
        element: lazyElement(<LoginPage />),
      },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/app',
        element: <MainShell />,
        children: [
          {
            index: true,
            element: lazyElement(<MainHomePage />),
          },
          ...mainImplementedRoutes,
          ...mainScaffoldRoutes,
          {
            path: '*',
            element: lazyElement(<NotFoundPage />),
          },
        ],
      },
      {
        path: '/sigh',
        element: <SighShell />,
        children: [
          {
            index: true,
            element: lazyElement(<SighHomePage />),
          },
          ...sighImplementedRoutes,
          ...sighScaffoldRoutes,
          {
            path: '*',
            element: lazyElement(<NotFoundPage />),
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: lazyElement(<NotFoundPage />),
  },
])
