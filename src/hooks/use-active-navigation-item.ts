import { useLocation } from 'react-router-dom'
import { menuService } from '@/services/menu/menu.service'
import type { WorkspaceKey } from '@/types/auth'

export function useActiveNavigationItem() {
  const location = useLocation()
  const item = menuService.findItem(location.pathname)
  const workspace: WorkspaceKey = location.pathname.startsWith('/sigh') ? 'sigh' : 'main'

  return {
    item,
    workspace,
  }
}
