import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { TrendingUp, Clock, AlertCircle, Activity } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import { getRacesPaged } from '../../api/races'
import { getActiveHorsesPaged } from '../../api/horses'
import { getWithdrawalsPaged } from '../../api/withdrawals'
import { getDashboardFinancial } from '../../api/dashboard'
import { useRaceHub } from '../../hooks/useRaceHub'

// ── chart palette (matches site's own gray-900 accent, not a generic blue) ─────
const CHART_SERIES    = '#111827' // Tailwind gray-900 — same as active nav/buttons across the app
const CHART_GRID      = '#f3f4f6' // Tailwind gray-100 — same as card borders
const CHART_AXIS_TEXT = '#9ca3af' // Tailwind gray-400 — same as other muted text in this page

// ── transaction-type palette (reuses the same 4 accents as the stat cards above,
//    validated colorblind-safe in fixed order: deposit → withdrawal → bet payout → prize payout) ─
const TX_SERIES = [
  { key: 'deposit',     label: 'Deposit',     color: '#059669' }, // emerald-600
  { key: 'withdrawal',  label: 'Withdrawal',  color: '#dc2626' }, // red-600
  { key: 'betPayout',   label: 'Bet Payout',  color: '#2563eb' }, // blue-600
  { key: 'prizePayout', label: 'Prize Payout', color: '#d97706' }, // amber-600
]

// ── deposit trend timeframes ────────────────────────────────────────────────────
const TIMEFRAMES = {
  '1D': { hours: 24,       bucket: 'hour'  },
  '1W': { hours: 24 * 7,   bucket: 'day'   },
  '1M': { hours: 24 * 30,  bucket: 'day'   },
  '1Y': { hours: 24 * 365, bucket: 'month' },
}

// ── helpers ────────────────────────────────────────────────────────────────────
function fmtVND(n) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B VND`
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}M VND`
  return `${n.toLocaleString()} VND`
}

function formatBucketLabel(iso, bucket) {
  const d = new Date(iso)
  if (bucket === 'hour')  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  if (bucket === 'month') return `Th ${d.getMonth() + 1}`
  return `${d.getDate()}/${d.getMonth() + 1}`
}

function yTickFmt(v) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M`
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`
  return v
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

const DepositTooltip = ({ active, payload, label }) => {
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

const TransactionsTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-4 py-3 text-xs space-y-1.5 min-w-[160px]">
      <p className="text-gray-500 mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            <span className="text-gray-500">{TX_SERIES.find(s => s.key === p.dataKey)?.label}</span>
          </div>
          <span className="font-bold text-gray-900">{fmtVND(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function TimeframeToggle({ value, onChange }) {
  return (
    <div className="flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-xl p-1">
      {Object.keys(TIMEFRAMES).map(tf => (
        <button
          key={tf}
          onClick={() => onChange(tf)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            value === tf
              ? 'bg-gray-900 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          {tf}
        </button>
      ))}
    </div>
  )
}

function TransactionsLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {TX_SERIES.map(s => (
        <div key={s.key} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
          <span className="text-xs text-gray-500">{s.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── main component ─────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate()

  const [stats,             setStats]             = useState({ revenue: 0, horses: 0, pendingW: 0 })
  const [liveRaces,         setLiveRaces]         = useState([])
  const [loading,           setLoading]           = useState(true)
  const [depositTimeframe,  setDepositTimeframe]  = useState('1M')
  const [depositChartData,  setDepositChartData]  = useState([])
  const [depositTotal,      setDepositTotal]      = useState(0)
  const [txChartData,       setTxChartData]       = useState([])

  // fetch financial summary (takeout revenue + deposits-by-period + transactions-by-period) for the selected timeframe
  const fetchFinancial = useCallback((timeframe, { silent = false } = {}) => {
    const cfg  = TIMEFRAMES[timeframe] || TIMEFRAMES['1M']
    const from = new Date(Date.now() - cfg.hours * 3600 * 1000).toISOString()

    getDashboardFinancial({ from, bucket: cfg.bucket })
      .then(r => {
        const data       = r.data.data || {}
        const financial  = data.financial || {}
        const points     = data.depositsByPeriod || []
        const txPoints   = data.transactionsByPeriod || []

        setStats(prev => ({ ...prev, revenue: financial.totalTakeoutRevenue || 0 }))
        setDepositChartData(points.map(p => ({
          label:  formatBucketLabel(p.timestamp, cfg.bucket),
          amount: p.amount || 0,
        })))
        setDepositTotal(points.reduce((s, p) => s + (p.amount || 0), 0))
        setTxChartData(txPoints.map(p => ({
          label:        formatBucketLabel(p.timestamp, cfg.bucket),
          deposit:      p.deposit || 0,
          withdrawal:   p.withdrawal || 0,
          betPayout:    p.betPayout || 0,
          prizePayout:  p.prizePayout || 0,
        })))
      })
      .catch(() => {})
      .finally(() => { if (!silent) setLoading(false) })
  }, [])

  useEffect(() => { fetchFinancial(depositTimeframe) }, [depositTimeframe, fetchFinancial])

  // fetch once on mount (horses + withdrawals)
  useEffect(() => {
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

  // revenue changes on settlement (takeout), deposits change on completed payments — refetch silently
  const handleFinancialUpdated = useCallback(
    () => fetchFinancial(depositTimeframe, { silent: true }),
    [depositTimeframe, fetchFinancial]
  )

  // realtime: lắng nghe các event từ backend
  useRaceHub(null, {
    onRacesUpdated:         fetchRaces,
    onWithdrawalsUpdated:   handleWithdrawalsUpdated,
    onTakeoutLedgerUpdated: handleFinancialUpdated,
    onPaymentsUpdated:      handleFinancialUpdated,
  })

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

        {/* Deposit Trend */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Deposit Trend</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {loading ? 'Loading…' : `Tổng nạp trong kỳ: ${fmtVND(depositTotal)}`}
              </p>
            </div>
            <TimeframeToggle value={depositTimeframe} onChange={setDepositTimeframe} />
          </div>

          {loading ? (
            <div className="h-52 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
            </div>
          ) : depositChartData.length === 0 ? (
            <div className="h-52 flex flex-col items-center justify-center text-gray-400">
              <TrendingUp size={28} strokeWidth={1.5} />
              <p className="text-xs mt-2">Chưa có giao dịch nạp trong khoảng này</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={depositChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="depositGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={CHART_SERIES} stopOpacity={0.10} />
                    <stop offset="95%" stopColor={CHART_SERIES} stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="none" stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_AXIS_TEXT }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={yTickFmt} tick={{ fontSize: 11, fill: CHART_AXIS_TEXT }} axisLine={false} tickLine={false} width={48} />
                <Tooltip content={<DepositTooltip />} cursor={{ stroke: CHART_GRID, strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke={CHART_SERIES}
                  strokeWidth={2}
                  fill="url(#depositGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: CHART_SERIES, stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Transaction Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Transaction Breakdown</h2>
              <p className="text-xs text-gray-400 mt-0.5">So sánh dòng tiền theo loại giao dịch</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <TransactionsLegend />
              <TimeframeToggle value={depositTimeframe} onChange={setDepositTimeframe} />
            </div>
          </div>

          {loading ? (
            <div className="h-52 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
            </div>
          ) : txChartData.length === 0 ? (
            <div className="h-52 flex flex-col items-center justify-center text-gray-400">
              <Activity size={28} strokeWidth={1.5} />
              <p className="text-xs mt-2">Chưa có giao dịch trong khoảng này</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={txChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={2} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="none" stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_AXIS_TEXT }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={yTickFmt} tick={{ fontSize: 11, fill: CHART_AXIS_TEXT }} axisLine={false} tickLine={false} width={48} />
                <Tooltip content={<TransactionsTooltip />} cursor={{ fill: CHART_GRID }} />
                {TX_SERIES.map(s => (
                  <Bar key={s.key} dataKey={s.key} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={24} />
                ))}
              </BarChart>
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
