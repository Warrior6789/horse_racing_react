import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ListChecks, Wallet, CalendarDays, Search, Bell, UserCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AccountProfile from './AccountProfile'

const NAV = [
  { to: '/jockey/dashboard', icon: LayoutDashboard, label: 'Dashboard'     },
  { to: '/jockey/requests',  icon: ListChecks,      label: 'Race Requests' },
  { to: '/jockey/schedule',  icon: CalendarDays,    label: 'Schedule'      },
  { to: '/jockey/wallet',    icon: Wallet,          label: 'Wallet'        },
  { to: '/jockey/profile',   icon: UserCircle,      label: 'My Profile'    },
]

export default function JockeyLayout({ children }) {
  const { user } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)

  const displayName = user?.fullName || user?.name || user?.userName
    || (user?.email ? user.email.split('@')[0] : null) || 'User'
  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="flex h-screen bg-[#0f1115] text-gray-200 font-sans overflow-hidden">

      {/* Sidebar */}
      <aside className="w-64 bg-[#14151a] border-r border-gray-800/60 hidden md:flex flex-col justify-between shrink-0">
        <div>
          <div className="p-6">
            <h1 className="text-xl font-black text-[#e8e4dc] tracking-tight">Horse Racing</h1>
            <p className="text-gray-500 text-[10px] font-bold tracking-widest mt-1">JOCKEY PORTAL</p>
          </div>
          <nav className="px-4 flex flex-col gap-1 mt-2">
            {NAV.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
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
        </div>

      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="shrink-0 z-30 flex items-center justify-between px-8 py-4 bg-[#0f1115] border-b border-gray-800/40">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Search races..."
              className="w-full bg-[#16181d] border border-gray-800 rounded-full py-2.5 pl-11 pr-4 text-sm text-gray-300 focus:outline-none focus:border-gray-600 transition-colors"
            />
          </div>
          <div className="flex items-center gap-4 ml-6 shrink-0">
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
              <span className="text-[11px] px-2 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-700">Jockey</span>
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
