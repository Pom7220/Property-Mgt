import { NavLink } from 'react-router-dom'
import { Home, Settings } from 'lucide-react'

const tabs = [
  { to: '/',          label: 'ทรัพย์สิน', Icon: Home },
  { to: '/settings',  label: 'ตั้งค่า',   Icon: Settings },
]

export default function BottomNav() {
  return (
    <nav
      className="flex bg-white border-t border-gray-200 pb-safe"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      {tabs.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors ${
              isActive
                ? 'text-primary-600'
                : 'text-gray-400 active:text-gray-600'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
              <span className={isActive ? 'font-medium' : ''}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
