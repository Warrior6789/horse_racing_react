import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, LabelList, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { TrendingUp, Clock, AlertCircle, Activity } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import { getRacesPaged } from '../../api/races'
import { getActiveHorsesPaged } from '../../api/horses'
import { getWithdrawalsPaged } from '../../api/withdrawals'
import { getDashboardSummary } from '../../api/dashboard'
import { useRaceHub } from '../../hooks/useRaceHub'

// ── chart palette (sequential blue — single-series magnitude) ──────────────────
const CHART_SERIES    = '#2a78d6'
const CHART_GRID      = '#e1e0d9'
const CHART_AXIS_TEXT = '#898781'

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
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_SERIES }} />
        <p className="font-bold text-gray-900">{fmtVND(payload[0].value)}</p>
      </div>
    </div>
  )
}

const TopHorsesTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-4 py-3 text-xs">
      <p className="text-gray-500 mb-1">{p.horseName}</p>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_SERIES }} />
        <p className="font-bold text-gray-900">{p.recordWins} wins</p>
      </div>
    </div>
  )
}

// ── main component ─────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate()

  const [stats,      setStats]      = useState({ revenue: 0, horses: 0, pendingW: 0 })
  const [liveRaces,  setLiveRaces]  = useState([])
  const [chartData,  setChartData]  = useState([])
  const [topHorses,  setTopHorses]  = useState([])
  const [loading,    setLoading]    = useState(true)

  // fetch aggregated dashboard summary (real takeout revenue, revenue-by-day, top horses)
  const fetchSummary = useCallback(({ silent = false } = {}) => {
    getDashboardSummary()
      .then(r => {
        const data = r.data.data || {}
        const financial = data.financial || {}
        setStats(prev => ({ ...prev, revenue: financial.totalTakeoutRevenue || 0 }))
        setChartData((data.revenueByDay || []).map(p => ({
          date: dateLabel(p.date),
          revenue: p.takeoutAmount || 0,
        })))
        setTopHorses(data.topHorses || [])
      })
      .catch(() => {})
      .finally(() => { if (!silent) setLoading(false) })
  }, [])

  // fetch once on mount (dashboard summary + horses + withdrawals)
  useEffect(() => {
    fetchSummary()
    Promise.allSettled([
      getActiveHorsesPaged({ page: 1, pageSize: 1 }),
      getWithdrawalsPaged({ page: 1, pageSize: 1 }),
    ]).then(([horsesRes, withdrawalsRes]) => {
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
    })
  }, [fetchSummary])

  // fetch races — called on mount + mỗi khi SignalR báo RacesUpdated
  const fetchRaces = useCallback(() => {
    getRacesPaged({ page: 1, pageSize: 500 })
      .then(res => {
        const all = res.data.data?.items || []
        const active = all.filter(r => ['Live', 'BettingOpen', 'BettingClosed'].includes(r.status))
        setLiveRaces(active.slice(0, 8))
        setStats(prev => ({
          ...prev,
          activeRaces: res.data.data?.totalCount || all.length,
        }))
      })
      .catch(() => {})
  }, [])

  useEffect(() => { fetchRaces() }, [fetchRaces])

  const handleWithdrawalsUpdated = useCallback((data) => {
    if (data?.pendingCount != null)
      setStats(prev => ({ ...prev, pendingW: data.pendingCount }))
  }, [])

  // revenue/top-horses come from settlement (takeout), not from deposits — refetch summary silently
  const handleTakeoutUpdated = useCallback(() => fetchSummary({ silent: true }), [fetchSummary])

  // realtime: lắng nghe các event từ backend
  useRaceHub(null, {
    onRacesUpdated:        fetchRaces,
    onWithdrawalsUpdated:  handleWithdrawalsUpdated,
    onTakeoutLedgerUpdated: handleTakeoutUpdated,
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
            sub="Platform takeout revenue"
            accent="green"
            icon={<TrendingUp size={20} strokeWidth={2} />}
          />
          <StatCard
            title="Total Races"
            value={loading ? '—' : (stats.activeRaces ?? 0)}
            sub="All races in system"
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
                <p className="text-xs text-gray-400 mt-0.5">Takeout revenue by day</p>
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
                      <stop offset="5%"  stopColor={CHART_SERIES} stopOpacity={0.10} />
                      <stop offset="95%" stopColor={CHART_SERIES} stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="none" stroke={CHART_GRID} vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: CHART_AXIS_TEXT }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={yTickFmt} tick={{ fontSize: 11, fill: CHART_AXIS_TEXT }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: CHART_GRID, strokeWidth: 1 }} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={CHART_SERIES}
                    strokeWidth={2}
                    fill="url(#revGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: CHART_SERIES, stroke: '#fff', strokeWidth: 2 }}
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

        {/* Top Horses */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Top Horses</h2>
              <p className="text-xs text-gray-400 mt-0.5">Ranked by total career wins</p>
            </div>
          </div>
          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
            </div>
          ) : topHorses.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-gray-400">
              <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>pets</span>
              <p className="text-xs mt-2">No finished races yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topHorses} layout="vertical" margin={{ top: 4, right: 28, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="none" stroke={CHART_GRID} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: CHART_AXIS_TEXT }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="horseName"
                  width={140}
                  tick={{ fontSize: 12, fill: '#374151' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<TopHorsesTooltip />} cursor={{ fill: CHART_SERIES, fillOpacity: 0.06 }} />
                <Bar dataKey="recordWins" fill={CHART_SERIES} radius={[0, 4, 4, 0]} barSize={18}>
                  <LabelList
                    dataKey="recordWins"
                    position="right"
                    formatter={(v) => `${v}`}
                    style={{ fill: '#52514e', fontSize: 11, fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
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
