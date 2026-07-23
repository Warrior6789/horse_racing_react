import { useEffect, useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { TrendingUp, AlertCircle, Activity } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import { getRacesPaged } from '../../api/races'
import { getActiveHorsesPaged } from '../../api/horses'
import { getWithdrawalsPaged } from '../../api/withdrawals'
import { getDashboardFinancial } from '../../api/dashboard'
import { useRaceHub } from '../../hooks/useRaceHub'

// ── chart palette (matches site's own gray-900 accent, not a generic blue) ─────
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
  const [stats,       setStats]       = useState({ revenue: 0, horses: 0, pendingW: 0 })
  const [loading,     setLoading]     = useState(true)
  const [timeframe,   setTimeframe]   = useState('1M')
  const [txChartData, setTxChartData] = useState([])

  // fetch financial summary (takeout revenue + transactions-by-period) for the selected timeframe
  const fetchFinancial = useCallback((timeframe, { silent = false } = {}) => {
    const cfg  = TIMEFRAMES[timeframe] || TIMEFRAMES['1M']
    const from = new Date(Date.now() - cfg.hours * 3600 * 1000).toISOString()

    getDashboardFinancial({ from, bucket: cfg.bucket })
      .then(r => {
        const data       = r.data.data || {}
        const financial  = data.financial || {}
        const txPoints   = data.transactionsByPeriod || []

        setStats(prev => ({ ...prev, revenue: financial.totalTakeoutRevenue || 0 }))
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

  useEffect(() => { fetchFinancial(timeframe) }, [timeframe, fetchFinancial])

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

  // fetch total race count — called on mount + mỗi khi SignalR báo RacesUpdated
  const fetchRaces = useCallback(() => {
    getRacesPaged({ page: 1, pageSize: 1 })
      .then(res => {
        setStats(prev => ({
          ...prev,
          activeRaces: res.data.data?.totalCount ?? 0,
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
    () => fetchFinancial(timeframe, { silent: true }),
    [timeframe, fetchFinancial]
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

        {/* Transaction Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Transaction Breakdown</h2>
              <p className="text-xs text-gray-400 mt-0.5">So sánh dòng tiền theo loại giao dịch</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <TransactionsLegend />
              <TimeframeToggle value={timeframe} onChange={setTimeframe} />
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
                <Tooltip content={<TransactionsTooltip />} cursor={{ fill: CHART_GRID }} shared={false} />
                {TX_SERIES.map(s => (
                  <Bar key={s.key} dataKey={s.key} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={24} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>
    </DashboardLayout>
  )
}
