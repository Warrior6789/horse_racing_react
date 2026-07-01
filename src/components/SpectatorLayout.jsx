import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Flag, Layers, Wallet, TrendingUp, Bell, Menu, X, UserCircle, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AccountProfile from './AccountProfile'

const NAV = [
  { to: '/spectator/dashboard', icon: Home,        label: 'Home'         },
  { to: '/spectator/races',     icon: Flag,        label: 'Races'        },
  { to: '/spectator/bets',      icon: Layers,      label: 'My Bets'      },
  { to: '/spectator/wallet',    icon: Wallet,      label: 'Wallet'       },
  { to: '/spectator/profile',   icon: UserCircle,  label: 'My Profile'   },
  { to: '/upgrade',             icon: TrendingUp,  label: 'Upgrade Role' },
]

const navLinkCls = ({ isActive }) =>
  `flex items-center space-x-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all ${
    isActive
      ? 'bg-[#29221a] text-[#f7e0a3] border border-[#f7e0a3]/20 shadow-sm'
      : 'text-stone-400 hover:bg-stone-800/30 hover:text-stone-200'
  }`

function SidebarContent({ onClose, collapsed }) {
  return (
    <div className="flex flex-col h-full p-3">
      <div className={`flex items-center mb-6 px-2 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && <div className="text-[#f7e0a3] font-bold text-xl tracking-wide">Horse Racing</div>}
        {onClose && (
          <button onClick={onClose} className="md:hidden text-stone-400 hover:text-white p-1">
            <X size={20} />
          </button>
        )}
      </div>
      <nav className="space-y-1 flex-1">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all
               ${collapsed ? 'justify-center' : ''}
               ${isActive
                 ? 'bg-[#29221a] text-[#f7e0a3] border border-[#f7e0a3]/20 shadow-sm'
                 : 'text-stone-400 hover:bg-stone-800/30 hover:text-stone-200'}`
            }
            onClick={onClose}
            title={collapsed ? label : undefined}
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default function SpectatorLayout({ children }) {
  const { user } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileOpen, setMobileOpen]   = useState(false)
  const [collapsed, setCollapsed]     = useState(false)

  const displayName = user?.fullName || user?.name || user?.email?.split('@')[0] || 'User'
  const initials    = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="casino-theme flex min-h-screen bg-[#110e0b] text-stone-200 font-sans">

      {/* Desktop Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-[#171410] border-r border-stone-900 shrink-0 hidden md:flex flex-col transition-all duration-200`}>
        <SidebarContent collapsed={collapsed} />
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-[#171410] border-r border-stone-900 flex flex-col">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="shrink-0 flex items-center justify-between px-4 md:px-8 py-4 bg-[#110e0b] border-b border-stone-900 gap-4">
          <button className="md:hidden text-stone-400 hover:text-white shrink-0" onClick={() => setMobileOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => setCollapsed(c => !c)}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800/40 transition-colors"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>
            <div>
              <p className="text-sm font-bold text-stone-200 leading-tight">Welcome back, {displayName}</p>
              <p className="text-xs text-stone-500">Here is what's happening at the tracks today.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <button className="text-stone-400 hover:text-white relative transition-colors">
              <Bell size={20} />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[#110e0b]" />
            </button>
            <button
              onClick={() => setProfileOpen(true)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-full border border-[#f7e0a3]/30 overflow-hidden shrink-0 flex items-center justify-center bg-[#24211a]">
                {user?.avatarUrl
                  ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover block" />
                  : <span className="text-xs font-black text-[#f7e0a3]/70">{initials}</span>
                }
              </div>
              <span className="hidden sm:inline text-[11px] px-2 py-0.5 rounded font-semibold bg-gray-100 text-gray-600">Spectator</span>
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {profileOpen && <AccountProfile onClose={() => setProfileOpen(false)} />}
    </div>
  )
}
