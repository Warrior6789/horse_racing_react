import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Bell, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AccountProfile from './AccountProfile'

const ROLE_NAV = {
  Admin: [
    { to: '/admin/dashboard',       icon: 'dashboard',                label: 'Dashboard' },
    { to: '/admin/accounts',        icon: 'manage_accounts',          label: 'Accounts' },
    { to: '/admin/races',           icon: 'sports',                   label: 'Races' },
    { to: '/admin/racecourses',     icon: 'stadium',                  label: 'Racecourses' },
    { to: '/admin/registrations',   icon: 'app_registration',         label: 'Registrations' },
    { to: '/admin/referees',        icon: 'assignment_ind',           label: 'Referees' },
    { to: '/admin/referee-reports', icon: 'gavel',                    label: 'Referee Reports' },
    { to: '/admin/withdrawals',     icon: 'payments',                 label: 'Withdrawals' },
    { to: '/admin/payments',        icon: 'credit_card',              label: 'Payments' },
    { to: '/admin/config',          icon: 'settings',                 label: 'Configuration' },
  ],
  Owner: [
    { to: '/owner/dashboard', icon: 'dashboard',      label: 'Dashboard' },
    { to: '/owner/horses',    icon: 'pets',            label: 'My Horses' },
    { to: '/owner/schedule',  icon: 'calendar_month',  label: 'Schedule' },
  ],
  Jockey: [
    { to: '/jockey/profile',  icon: 'person',     label: 'My Profile' },
    { to: '/jockey/requests', icon: 'assignment', label: 'Race Requests' },
  ],
  Referee: [
    { to: '/referee/races',   icon: 'sports',    label: 'Races' },
    { to: '/referee/reports', icon: 'summarize', label: 'My Reports' },
  ],
  Spectator: [
    { to: '/spectator/dashboard', icon: 'dashboard',              label: 'Overview' },
    { to: '/spectator/races',     icon: 'sports',                 label: 'Upcoming Races' },
    { to: '/spectator/bets',      icon: 'casino',                 label: 'My Bets' },
    { to: '/spectator/wallet',    icon: 'account_balance_wallet', label: 'Wallet' },
  ],
}

const ROLE_BADGE = {
  Admin:     'bg-red-100 text-red-700',
  Owner:     'bg-blue-100 text-blue-700',
  Jockey:    'bg-emerald-100 text-emerald-700',
  Referee:   'bg-violet-100 text-violet-700',
  Spectator: 'bg-gray-100 text-gray-600',
}

const ROLE_SUBTITLE = {
  Admin:     'Manage the platform.',
  Owner:     'Manage your horses and schedules.',
  Jockey:    'Track your races and profile.',
  Referee:   'Submit and review race reports.',
  Spectator: "Here is what's happening at the tracks today.",
}

export default function DashboardLayout({ children, title, headerActions }) {
  const { user } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)
  const [collapsed, setCollapsed]     = useState(false)

  const role     = user?.role || user?.Role || user?.roleName || user?.RoleName || 'Spectator'
  const navItems = ROLE_NAV[role]  || ROLE_NAV.Spectator
  const badgeCls = ROLE_BADGE[role] || ROLE_BADGE.Spectator
  const subtitle = title || ROLE_SUBTITLE[role] || ''

  const displayName = user?.fullName || user?.name || user?.userName
    || (user?.email ? user.email.split('@')[0] : null)
    || 'User'

  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const sidebarW = collapsed ? 'w-16' : 'w-64'
  const logoW    = collapsed ? 'w-16' : 'w-64'

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">

      {/* ── TOP HEADER ── */}
      <div className="flex items-stretch border-b border-gray-200 shrink-0">

        {/* Logo */}
        <div className={`${logoW} bg-gray-50 px-4 py-4 border-r border-gray-200 shrink-0 flex items-center gap-3 transition-all duration-200 overflow-hidden`}>
          <span className="material-symbols-outlined text-gray-900 shrink-0" style={{ fontSize: '22px' }}>token</span>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-base font-bold text-gray-900 leading-tight tracking-tight whitespace-nowrap">Horse Racing</h1>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Management Portal</p>
            </div>
          )}
        </div>

        {/* Welcome + actions */}
        <header className="flex-1 bg-white px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCollapsed(c => !c)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed
                ? <PanelLeftOpen size={20} strokeWidth={2} />
                : <PanelLeftClose size={20} strokeWidth={2} />
              }
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-900 leading-tight">Welcome back, {displayName}</h2>
              <p className="text-sm text-gray-500 font-medium mt-0.5">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {headerActions}
            <button className="relative p-1 text-gray-400 hover:text-gray-600 transition-colors">
              <Bell size={22} strokeWidth={2} />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 border-2 border-white rounded-full" />
            </button>
            <button
              onClick={() => setProfileOpen(true)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-gray-100 border-2 border-gray-200">
                {user?.avatarUrl
                  ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover block" />
                  : <span className="text-gray-700 font-bold text-xs">{initials}</span>
                }
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded font-semibold ${badgeCls}`}>{role}</span>
            </button>
          </div>
        </header>
      </div>

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── SIDEBAR ── */}
        <aside className={`${sidebarW} bg-white border-r border-gray-200 flex flex-col shrink-0 transition-all duration-200 overflow-hidden`}>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5">
            {!collapsed && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-3 mb-2">
                Navigation
              </p>
            )}
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                   ${collapsed ? 'justify-center' : ''}
                   ${isActive
                     ? 'bg-gray-900 text-white'
                     : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                   }`
                }
              >
                <span className="material-symbols-outlined shrink-0" style={{ fontSize: '18px' }}>{item.icon}</span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            ))}
          </nav>

        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 overflow-auto p-8 bg-gray-50">
          {children}
        </main>
      </div>

      {profileOpen && <AccountProfile variant="light" onClose={() => setProfileOpen(false)} />}
    </div>
  )
}
