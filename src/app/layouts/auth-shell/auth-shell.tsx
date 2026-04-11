import { Outlet } from 'react-router-dom'

export function AuthShell() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.24),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.18),_transparent_24%)]" />
      <div className="absolute inset-0 shell-grid bg-grid-fade opacity-20" />
      <div className="relative z-10 min-h-screen">
        <Outlet />
      </div>
    </div>
  )
}
