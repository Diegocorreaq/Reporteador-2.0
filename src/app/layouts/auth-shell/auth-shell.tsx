import { Outlet } from 'react-router-dom'

export function AuthShell() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F3F4F6]">
      {/* Decorative background shapes */}
      <div className="absolute inset-0">
        {/* Top-left diagonal accent */}
        <div className="absolute -left-20 -top-20 h-[500px] w-[600px] rotate-12 rounded-[80px] bg-gradient-to-br from-[#005F8F]/8 to-transparent" />
        {/* Bottom-right subtle accent */}
        <div className="absolute -bottom-32 -right-32 h-[400px] w-[500px] -rotate-12 rounded-[80px] bg-gradient-to-tl from-[#D98B27]/6 to-transparent" />
        {/* Center decorative circle */}
        <div className="absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#005F8F]/3 via-transparent to-[#2C6E99]/2" />
      </div>
      {/* Main content */}
      <div className="relative z-10 min-h-screen">
        <Outlet />
      </div>
    </div>
  )
}
