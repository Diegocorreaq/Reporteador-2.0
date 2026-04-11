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
const ExportacionesPage = lazy(() =>
  import('@/modules/exportaciones/pages/exportaciones-page').then((module) => ({ default: module.ExportacionesPage })),
)
const MainHomePage = lazy(() =>
  import('@/modules/inicio/pages/main-home-page').then((module) => ({ default: module.MainHomePage })),
)
const SighHomePage = lazy(() =>
  import('@/modules/inicio/pages/sigh-home-page').then((module) => ({ default: module.SighHomePage })),
)
const MonitoreoPage = lazy(() =>
  import('@/modules/monitoreo/pages/monitoreo-page').then((module) => ({ default: module.MonitoreoPage })),
)
const ProdProfesionalPage = lazy(() =>
  import('@/modules/prod-profesional/pages/prod-profesional-page').then((module) => ({
    default: module.ProdProfesionalPage,
  })),
)
const CamasCovidPage = lazy(() =>
  import('@/modules/covid/pages/camas-covid-page').then((module) => ({ default: module.CamasCovidPage })),
)
const GestionCitaPage = lazy(() =>
  import('@/modules/gestion-cita/pages/gestion-cita-page').then((module) => ({ default: module.GestionCitaPage })),
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
    .concat(['atencion-ambulatoria-hospitalizacion/centro-obstetrico', 'zona-descarga/registros-procesados']),
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
    element: lazyElement(<ModuleScaffoldPage module={module} />),
  }))

const sighScaffoldRoutes = getModulesByWorkspace('sigh')
  .filter((module) => !explicitSighRoutePaths.has(module.path))
  .map((module) => ({
    path: module.path,
    element: lazyElement(<ModuleScaffoldPage module={module} />),
  }))

const mainImplementedRoutes = [
  ...legacyMainEmbedRoutes,
  {
    path: 'atencion-ambulatoria-hospitalizacion/centro-obstetrico',
    element: lazyElement(<CentroObstetricoPage />),
  },
  {
    path: 'zona-descarga/registros-procesados',
    element: lazyElement(<ExportacionesPage />),
  },
]

const sighImplementedRoutes = [
  ...legacySighEmbedRoutes,
  {
    path: 'monitoreo-en-linea/informe-familia-pendientes',
    element: lazyElement(<MonitoreoPage workspace="sigh" />),
  },
  {
    path: 'exportar-registros/registros-nominales',
    element: lazyElement(<ExportacionesPage />),
  },
  {
    path: 'exportar-registros/registros-produccion',
    element: lazyElement(<ExportacionesPage />),
  },
  {
    path: 'produccion-actividades/produccion-medicos',
    element: lazyElement(<ProdProfesionalPage workspace="sigh" />),
  },
  {
    path: 'gestion-camas/monitoreo-de-camas',
    element: lazyElement(<CamasCovidPage workspace="sigh" />),
  },
  {
    path: 'gestion-camas/resumen-de-camas',
    element: lazyElement(<CamasCovidPage workspace="sigh" />),
  },
  {
    path: 'gestion-camas/porcentaje-de-ocupacion-cama',
    element: lazyElement(<CamasCovidPage workspace="sigh" />),
  },
  {
    path: 'gestion-camas/gestion-estancia-cama',
    element: lazyElement(<CamasCovidPage workspace="sigh" />),
  },
  {
    path: 'atencion-al-usuario/gestion-de-citas',
    element: lazyElement(<GestionCitaPage workspace="sigh" />),
  },
  {
    path: 'atencion-al-usuario/rol-consulta-externa',
    element: lazyElement(<GestionCitaPage workspace="sigh" />),
  },
  {
    path: 'atencion-al-usuario/monitoreo-de-tickets',
    element: lazyElement(<GestionCitaPage workspace="sigh" />),
  },
  {
    path: 'atencion-al-usuario/monitoreo-ventanilla',
    element: lazyElement(<GestionCitaPage workspace="sigh" />),
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
