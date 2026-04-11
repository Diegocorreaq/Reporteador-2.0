import { Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Topbar } from '@/components/navigation/topbar'
import { WorkspaceSidebar } from '@/components/navigation/workspace-sidebar'
import { useAuthStore } from '@/modules/auth/store/use-auth-store'
import { menuService } from '@/services/menu/menu.service'
import type { WorkspaceKey } from '@/types/auth'

interface WorkspaceShellFrameProps {
  workspace: WorkspaceKey
}

export function WorkspaceShellFrame({ workspace }: WorkspaceShellFrameProps) {
  const user = useAuthStore((state) => state.user)
  const setWorkspace = useAuthStore((state) => state.setWorkspace)
  const [mobileOpen, setMobileOpen] = useState(false)
  const sections = menuService.getSections(workspace, user)

  useEffect(() => {
    setWorkspace(workspace)
  }, [setWorkspace, workspace])

  return (
    <div className="min-h-screen lg:flex">
      <WorkspaceSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} sections={sections} workspace={workspace} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar onOpenMobile={() => setMobileOpen(true)} workspace={workspace} />
        <main className="flex-1">
          <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4 px-4 py-4 sm:px-5 lg:px-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
