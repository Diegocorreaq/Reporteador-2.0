import { Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Topbar } from '@/components/navigation/topbar'
import { WorkspaceSidebar } from '@/components/navigation/workspace-sidebar'
import { findLegacyModuleMapping } from '@/config/legacy-functional-map'
import { useAuthStore } from '@/modules/auth/store/use-auth-store'
import { menuService } from '@/services/menu/menu.service'
import { useShellUiStore } from '@/stores/use-shell-ui-store'
import type { WorkspaceKey } from '@/types/auth'
import { cn } from '@/lib/utils'

interface WorkspaceShellFrameProps {
  workspace: WorkspaceKey
}

export function WorkspaceShellFrame({ workspace }: WorkspaceShellFrameProps) {
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const setWorkspace = useAuthStore((state) => state.setWorkspace)
  const sidebarCollapsed = useShellUiStore((state) => state.sidebarCollapsed)
  const toggleSidebarCollapsed = useShellUiStore((state) => state.toggleSidebarCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)
  const sections = menuService.getSections(workspace, user)
  const activeLegacyModule = findLegacyModuleMapping(location.pathname)
  const isPowerBiEmbed = Boolean(activeLegacyModule?.powerBiUrl)

  useEffect(() => {
    setWorkspace(workspace)
  }, [setWorkspace, workspace])

  return (
    <div className="min-h-screen bg-canvas lg:flex">
      <WorkspaceSidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onToggleCollapse={toggleSidebarCollapsed}
        sections={sections}
        workspace={workspace}
      />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-canvas">
        <Topbar
          collapsed={sidebarCollapsed}
          onOpenMobile={() => setMobileOpen(true)}
          onToggleSidebar={toggleSidebarCollapsed}
          workspace={workspace}
        />
        <main className="flex-1">
          <div
            className={cn(
              'mx-auto flex w-full flex-col',
              isPowerBiEmbed
                ? 'max-w-none gap-3 px-3 py-3 sm:px-4 lg:px-5'
                : 'max-w-[1680px] gap-5 px-4 py-5 sm:px-6 lg:px-8',
            )}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
