import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Flag, Layers, Wallet, TrendingUp, Bell } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AccountProfile from './AccountProfile'

const navLinkCls = ({ isActive }) =>
  `flex items-center space-x-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all ${
    isActive
      ? 'bg-[#29221a] text-[#f7e0a3] border border-[#f7e0a3]/20 shadow-sm'
      : 'text-stone-400 hover:bg-stone-800/30 hover:text-stone-200'
  }`

export default function SpectatorLayout({ children }) {
  const { user } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)

  const displayName = user?.fullName || user?.name || user?.email?.split('@')[0] || 'User'
  const initials    = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="flex min-h-screen bg-[#110e0b] text-stone-200 font-sans">
      <aside className="w-64 bg-[#171410] p-5 flex flex-col justify-between border-r border-stone-900 shrink-0">
        <div>
          <div className="text-[#f7e0a3] font-bold text-xl mb-8 tracking-wide px-2">
            Horse Racing
          </div>
          <nav className="space-y-1.5">
            <NavLink to="/spectator/dashboard" className={navLinkCls}>
              <Home size={18} /><span>Home</span>
            </NavLink>
            <NavLink to="/spectator/races" className={navLinkCls}>
              <Flag size={18} /><span>Races</span>
            </NavLink>
            <NavLink to="/spectator/bets" className={navLinkCls}>
              <Layers size={18} /><span>My Bets</span>
            </NavLink>
            <NavLink to="/spectator/wallet" className={navLinkCls}>
              <Wallet size={18} /><span>Wallet</span>
            </NavLink>
            <NavLink to="/upgrade" className={navLinkCls}>
              <TrendingUp size={18} /><span>Upgrade Role</span>
            </NavLink>
          </nav>
        </div>

      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="shrink-0 flex items-center justify-end px-8 py-4 bg-[#110e0b] border-b border-stone-900 gap-4">
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
            <span className="text-[11px] px-2 py-0.5 rounded font-semibold bg-gray-100 text-gray-600">Spectator</span>
          </button>
        </header>
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {profileOpen && <AccountProfile onClose={() => setProfileOpen(false)} />}
    </div>
  )
}
