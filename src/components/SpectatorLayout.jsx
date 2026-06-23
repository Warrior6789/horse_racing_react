import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Flag, Layers, Wallet, TrendingUp } from 'lucide-react'
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

        {/* User card — click to open profile panel */}
        <button
          onClick={() => setProfileOpen(true)}
          className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#1f1b15] border border-transparent hover:border-stone-800 transition-all w-full text-left mt-4"
        >
          <div className="w-9 h-9 rounded-full border border-[#f7e0a3]/30 overflow-hidden shrink-0 flex items-center justify-center bg-[#24211a]">
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt={displayName} className="w-full h-full object-cover block" />
              : <span className="text-xs font-black text-[#f7e0a3]/70">{initials}</span>
            }
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-stone-100 truncate">{displayName}</p>
            <p className="text-[11px] text-stone-500 truncate">{user?.email || ''}</p>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
        </button>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>

      {profileOpen && <AccountProfile onClose={() => setProfileOpen(false)} />}
    </div>
  )
}
