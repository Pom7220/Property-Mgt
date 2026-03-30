import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Page content scrolls inside this area */}
      <main className="flex-1 overflow-y-auto overscroll-none">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
