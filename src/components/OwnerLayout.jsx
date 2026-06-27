import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Orbit, Calendar, Wallet, TrendingUp, PlusCircle, Bell, Flag, Menu, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AccountProfile from './AccountProfile'

const NAV = [
  { to: '/owner/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/owner/horses',    icon: Orbit,           label: 'My Horses' },
  { to: '/owner/schedule',  icon: Calendar,        label: 'Schedule'  },
  { to: '/owner/races',     icon: Flag,            label: 'Races'     },
  { to: '/owner/earnings',  icon: TrendingUp,      label: 'Earnings'  },
  { to: '/owner/wallet',    icon: Wallet,          label: 'Wallet'    },
]

function SidebarContent({ onClose }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-[#e8e4dc] tracking-tight">Horse Racing</h1>
          <p className="text-gray-500 text-[10px] font-bold tracking-widest mt-1">MANAGEMENT PORTAL</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white p-1">
            <X size={20} />
          </button>
        )}
      </div>
      <nav className="px-4 flex flex-col gap-1 flex-1">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium
               ${isActive
                 ? 'bg-gray-800 text-yellow-500 border border-gray-700'
                 : 'text-gray-400 hover:text-white hover:bg-gray-800'}`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4">
        <NavLink
          to="/owner/horses"
          onClick={onClose}
          className="w-full bg-[#facc15] hover:bg-[#eab308] text-black font-bold py-3.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
        >
          <PlusCircle size={18} /> Add New Horse
        </NavLink>
      </div>
    </div>
  )
}

export default function OwnerLayout({ children }) {
  const { user } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileOpen, setMobileOpen]   = useState(false)

  const displayName = user?.fullName || user?.name || user?.userName
    || (user?.email ? user.email.split('@')[0] : null) || 'User'
  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="flex h-screen bg-[#0f1115] text-gray-200 font-sans overflow-hidden">

      {/* Desktop Sidebar */}
      <aside className="w-64 bg-[#14151a] border-r border-gray-800/60 hidden md:flex flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-[#14151a] border-r border-gray-800/60 flex flex-col">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="shrink-0 z-30 flex items-center justify-between px-4 md:px-8 py-4 bg-[#0f1115] border-b border-gray-800/40 gap-3">
          <button
            className="md:hidden text-gray-400 hover:text-white shrink-0"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-4 ml-auto shrink-0">
            <button className="text-gray-400 hover:text-white relative transition-colors">
              <Bell size={20} />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[#0f1115]" />
            </button>
            <button
              onClick={() => setProfileOpen(true)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-full bg-gray-800 border border-yellow-600/50 overflow-hidden flex items-center justify-center shrink-0">
                {user?.avatarUrl
                  ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  : <span className="text-yellow-500 text-xs font-bold">{initials}</span>
                }
              </div>
              <span className="hidden sm:inline text-[11px] px-2 py-0.5 rounded font-semibold bg-blue-100 text-blue-700">Owner</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {profileOpen && <AccountProfile variant="dark" onClose={() => setProfileOpen(false)} />}
    </div>
  )
}
