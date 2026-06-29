import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { TrendingUp, Clock, AlertCircle, Activity } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import { getRacesPaged } from '../../api/races'
import { getActiveHorsesPaged } from '../../api/horses'
import { getWithdrawalsPaged } from '../../api/withdrawals'
import { getAllPayments } from '../../api/payments'
import { useRaceHub } from '../../hooks/useRaceHub'

// ── helpers ────────────────────────────────────────────────────────────────────
function fmtVND(n) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B VND`
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}M VND`
  return `${n.toLocaleString()} VND`
}

function dateLabel(iso) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// ── sub-components ─────────────────────────────────────────────────────────────
function StatCard({ title, value, sub, icon, accent }) {
  const palette = {
    blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   ring: 'ring-blue-100'  },
    green:  { bg: 'bg-emerald-50', icon: 'text-emerald-600', ring: 'ring-emerald-100' },
    amber:  { bg: 'bg-amber-50',  icon: 'text-amber-600',  ring: 'ring-amber-100' },
    red:    { bg: 'bg-red-50',    icon: 'text-red-600',    ring: 'ring-red-100'   },
  }
  const c = palette[accent] || palette.blue
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider truncate">{title}</p>
        <p className="text-3xl font-extrabold text-gray-900 mt-1 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
      </div>
      <div className={`shrink-0 p-3 rounded-xl ring-1 ${c.bg} ${c.icon} ${c.ring}`}>
        {icon}
      </div>
    </div>
  )
}

const LIVE_STATUS_STYLE = {
  Live:          'bg-red-100 text-red-700',
  BettingOpen:   'bg-emerald-100 text-emerald-700',
  BettingClosed: 'bg-orange-100 text-orange-700',
  Scheduled:     'bg-gray-100 text-gray-600',
}

function LiveEventRow({ race, onClick }) {
  const s   = race.status || 'Scheduled'
  const cls = LIVE_STATUS_STYLE[s] || LIVE_STATUS_STYLE.Scheduled
  const isLive = s === 'Live'
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2.5"
    >
      <div className="bg-gray-100/80 backdrop-blur-md border border-gray-200/60 shadow-sm rounded-xl px-4 py-3 hover:bg-gray-100 transition-colors">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-semibold text-gray-900 truncate mr-2">
          {race.raceName || `Race #${race.raceNumber}`}
        </span>
        <span className={`shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${cls}`}>
          {isLive && <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />}
          {s}
        </span>
      </div>
      <p className="text-xs text-gray-500 truncate">{race.racecourseName || '—'}</p>
      </div>
    </button>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-4 py-3 text-xs">
      <p className="text-gray-500 mb-1">{label}</p>
      <p className="font-bold text-gray-900">{fmtVND(payload[0].value)}</p>
    </div>
  )
}

// ── main component ─────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate()

  const [stats,      setStats]      = useState({ revenue: 0, horses: 0, pendingW: 0 })
  const [liveRaces,  setLiveRaces]  = useState([])
  const [chartData,  setChartData]  = useState([])
  const [loading,    setLoading]    = useState(true)

  // fetch once on mount (payments + horses + withdrawals)
  useEffect(() => {
    Promise.allSettled([
      getAllPayments({ page: 1, pageSize: 100 }),
      getActiveHorsesPaged({ page: 1, pageSize: 1 }),
      getWithdrawalsPaged({ page: 1, pageSize: 1 }),
    ]).then(([paymentsRes, horsesRes, withdrawalsRes]) => {

      // ── revenue & chart ──
      const payments = paymentsRes.status === 'fulfilled'
        ? (paymentsRes.value.data.data?.items || [])
        : []
      const deposits = payments.filter(p =>
        (p.type || p.transactionType || '').toLowerCase() === 'deposit' &&
        (p.status || '').toLowerCase() === 'completed'
      )
      const totalRevenue = deposits.reduce((s, p) => s + (p.amount || 0), 0)

      const today = new Date()
      const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today)
        d.setDate(today.getDate() - (6 - i))
        return { label: dateLabel(d.toISOString()), date: d.toDateString(), total: 0 }
      })
      deposits.forEach(p => {
        const d = new Date(p.createAt || p.createdAt || p.transactionDate || p.date || '')
        const ds = d.toDateString()
        const slot = last7.find(x => x.date === ds)
        if (slot) slot.total += p.amount || 0
      })
      setChartData(last7.map(x => ({ date: x.label, revenue: x.total })))
      setStats(prev => ({ ...prev, revenue: totalRevenue }))

      // ── active horses ──
      if (horsesRes.status === 'fulfilled') {
        const d = horsesRes.value.data.data
        const total = d?.totalCount ?? d?.length ?? 0
        setStats(prev => ({ ...prev, horses: total }))
      }

      // ── pending withdrawals ──
      if (withdrawalsRes.status === 'fulfilled') {
        const total = withdrawalsRes.value.data.data?.totalCount ?? (withdrawalsRes.value.data.data?.length ?? 0)
        setStats(prev => ({ ...prev, pendingW: total }))
      }

    }).finally(() => setLoading(false))
  }, [])

  // fetch races — called on mount + mỗi khi SignalR báo RacesUpdated
  const fetchRaces = useCallback(() => {
    getRacesPaged({ page: 1, pageSize: 500 })
      .then(res => {
        const all = res.data.data?.items || []
        const active = all.filter(r => ['Live', 'BettingOpen', 'BettingClosed'].includes(r.status))
        setLiveRaces(active.slice(0, 8))
        setStats(prev => ({
          ...prev,
          activeRaces: active.filter(r => r.status === 'Live' || r.status === 'BettingOpen').length,
        }))
      })
      .catch(() => {})
  }, [])

  useEffect(() => { fetchRaces() }, [fetchRaces])

  const handlePaymentsUpdated = useCallback((data) => {
    const amount = data?.amount || 0
    const label  = (data?.createAt || data?.createdAt) ? dateLabel(data.createAt || data.createdAt) : null

    setStats(prev => ({ ...prev, revenue: (prev.revenue || 0) + amount }))

    if (label) {
      setChartData(prev => {
        const idx = prev.findLastIndex(p => p.date === label)
        if (idx !== -1) {
          const next = [...prev]
          next[idx] = { ...next[idx], revenue: next[idx].revenue + amount }
          return next
        }
        return prev
      })
    }
  }, [])

  const handleWithdrawalsUpdated = useCallback((data) => {
    if (data?.pendingCount != null)
      setStats(prev => ({ ...prev, pendingW: data.pendingCount }))
  }, [])

  // realtime: lắng nghe các event từ backend
  useRaceHub(null, {
    onRacesUpdated:      fetchRaces,
    onPaymentsUpdated:   handlePaymentsUpdated,
    onWithdrawalsUpdated: handleWithdrawalsUpdated,
  })

  const yTickFmt = (v) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M`
    if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`
    return v
  }

  return (
    <DashboardLayout title="Overview of platform activity">
      <div className="space-y-6">

        {/* Page heading */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Platform overview — live data</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Total Revenue"
            value={loading ? '—' : fmtVND(stats.revenue)}
            sub="Completed deposits"
            accent="green"
            icon={<TrendingUp size={20} strokeWidth={2} />}
          />
          <StatCard
            title="Active Races"
            value={loading ? '—' : (stats.activeRaces ?? 0)}
            sub="Live & Betting Open"
            accent="blue"
            icon={<Activity size={20} strokeWidth={2} />}
          />
          <StatCard
            title="Active Horses"
            value={loading ? '—' : stats.horses.toLocaleString()}
            sub="Currently active"
            accent="amber"
            icon={<span className="material-symbols-outlined" style={{ fontSize: '20px' }}>pets</span>}
          />
          <StatCard
            title="Pending Withdrawals"
            value={loading ? '—' : stats.pendingW}
            sub={stats.pendingW > 0 ? 'Requires attention' : 'All clear'}
            accent={stats.pendingW > 0 ? 'red' : 'green'}
            icon={<AlertCircle size={20} strokeWidth={2} />}
          />
        </div>

        {/* Main 2-col grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Financial chart */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Financial Performance</h2>
                <p className="text-xs text-gray-400 mt-0.5">Deposit revenue — last 7 days</p>
              </div>
              <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg font-medium">VND</span>
            </div>
            {loading ? (
              <div className="h-52 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#111827" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#111827" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={yTickFmt} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#111827"
                    strokeWidth={2}
                    fill="url(#revGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#111827' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Live Oversight */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Live Oversight</h2>
              <Clock size={16} className="text-gray-300" />
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
                </div>
              ) : liveRaces.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                  <Activity size={28} strokeWidth={1.5} />
                  <p className="text-xs mt-2">No active races right now</p>
                </div>
              ) : (
                liveRaces.map(race => (
                  <LiveEventRow
                    key={race.raceId}
                    race={race}
                    onClick={() => navigate(`/admin/races`)}
                  />
                ))
              )}
            </div>

            <div className="px-4 py-3 border-t border-gray-50">
              <button
                onClick={() => navigate('/admin/races')}
                className="w-full text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
              >
                View all races →
              </button>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Manage Accounts',    icon: 'manage_accounts', to: '/admin/accounts'   },
            { label: 'Manage Races',       icon: 'sports',          to: '/admin/races'      },
            { label: 'Withdrawals',        icon: 'payments',        to: '/admin/withdrawals', badge: stats.pendingW > 0 ? stats.pendingW : null },
            { label: 'Configuration',      icon: 'settings',        to: '/admin/config'     },
          ].map(a => (
            <button
              key={a.to}
              onClick={() => navigate(a.to)}
              className="relative bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:border-gray-300 hover:shadow-md transition-all text-left"
            >
              <span className="material-symbols-outlined text-gray-400 shrink-0" style={{ fontSize: '20px' }}>{a.icon}</span>
              <span className="text-sm font-semibold text-gray-700">{a.label}</span>
              {a.badge != null && (
                <span className="absolute top-3 right-3 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {a.badge > 9 ? '9+' : a.badge}
                </span>
              )}
            </button>
          ))}
        </div>

      </div>
    </DashboardLayout>
  )
}
