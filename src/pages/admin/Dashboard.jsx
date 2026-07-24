import { useEffect, useState, useCallback } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { TrendingUp, AlertCircle, Activity } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import { getRacesPaged } from '../../api/races'
import { getActiveHorsesPaged } from '../../api/horses'
import { getWithdrawalsPaged } from '../../api/withdrawals'
import { getDashboardFinancial, getRaceStatusBreakdown, getBetTypeBreakdown, getTopHorses, getSignups } from '../../api/dashboard'
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

// ── race-status palette (fixed order validated colorblind-safe; worst adjacent pair
//    — amber↔emerald — sits in the 6–8 CVD floor band, so it ships with the legend +
//    tooltip labels below as required secondary encoding) ──────────────────────────
const RACE_STATUS_SERIES = [
  { key: 'Scheduled',     label: 'Scheduled',      color: '#2563eb' }, // blue-600
  { key: 'BettingOpen',   label: 'Betting Open',   color: '#059669' }, // emerald-600
  { key: 'BettingClosed', label: 'Betting Closed', color: '#d97706' }, // amber-600
  { key: 'Finished',      label: 'Finished',       color: '#7c3aed' }, // violet-600
  { key: 'Live',          label: 'Live',           color: '#dc2626' }, // red-600
  { key: 'Cancelled',     label: 'Cancelled',      color: '#0891b2' }, // cyan-600
]

// ── single-series bar color (nominal categorical — one metric per bet type, so every
//    bar takes the same slot-1 hue; the chart title names the metric, no legend needed) ──
const SINGLE_SERIES_COLOR = '#111827' // gray-900 — same accent used elsewhere for primary data

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

const RaceStatusTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-4 py-3 text-xs">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
        <span className="text-gray-500">{p.label}</span>
      </div>
      <p className="font-bold text-gray-900 mt-1">{p.count} race{p.count === 1 ? '' : 's'} ({p.percent}%)</p>
    </div>
  )
}

const BetTypeTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-4 py-3 text-xs">
      <p className="text-gray-500 mb-1">{label}</p>
      <p className="font-bold text-gray-900">{fmtVND(p.totalAmount)}</p>
      <p className="text-gray-400 mt-0.5">{p.count} bet{p.count === 1 ? '' : 's'}</p>
    </div>
  )
}

const TopHorsesTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-4 py-3 text-xs">
      <p className="text-gray-500 mb-1">{label}</p>
      <p className="font-bold text-gray-900">{payload[0].value} win{payload[0].value === 1 ? '' : 's'}</p>
    </div>
  )
}

const SignupsTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-4 py-3 text-xs">
      <p className="text-gray-500 mb-1">{label}</p>
      <p className="font-bold text-gray-900">{payload[0].value} signup{payload[0].value === 1 ? '' : 's'}</p>
    </div>
  )
}

function RaceStatusLegend({ data }) {
  return (
    <div className="flex flex-col gap-2">
      {data.map(s => (
        <div key={s.key} className="flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-gray-500">{s.label}</span>
          </div>
          <span className="font-semibold text-gray-900">{s.count}</span>
        </div>
      ))}
    </div>
  )
}

// ── report tabs (add a new entry here + a matching block in the render below
//    when a new chart category — e.g. Races, Betting — is ready) ──────────────
const DASHBOARD_TABS = [
  { key: 'financial',  label: 'Transaction Breakdown' },
  { key: 'races',      label: 'Races by Status' },
  { key: 'bets',       label: 'Bet by Type' },
  { key: 'topHorses',  label: 'Top Horses' },
  { key: 'signups',    label: 'Signups' },
]

function DashboardTabBar({ tabs, active, onChange }) {
  return (
    <div className="flex items-center gap-1 px-4 border-b border-gray-100">
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-4 py-3.5 text-sm font-semibold border-b-2 -mb-px transition ${
            active === t.key
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ── main component ─────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [stats,       setStats]       = useState({ revenue: 0, horses: 0, pendingW: 0 })
  const [loading,     setLoading]     = useState(true)
  const [activeTab,   setActiveTab]   = useState(DASHBOARD_TABS[0].key)
  const [timeframe,   setTimeframe]   = useState('1M')
  const [txChartData, setTxChartData] = useState([])

  const [racesLoading,   setRacesLoading]   = useState(true)
  const [raceStatusData, setRaceStatusData] = useState([])

  const [betsLoading,  setBetsLoading]  = useState(true)
  const [betTypeData,  setBetTypeData]  = useState([])

  const [topHorsesLoading, setTopHorsesLoading] = useState(true)
  const [topHorsesData,    setTopHorsesData]    = useState([])

  const [signupsLoading,   setSignupsLoading]   = useState(true)
  const [signupsTimeframe, setSignupsTimeframe] = useState('1M')
  const [signupsChartData, setSignupsChartData] = useState([])

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

  // fetch race-status breakdown for the "Races by Status" tab — mount + RacesUpdated
  const fetchRaceStatus = useCallback(() => {
    getRaceStatusBreakdown()
      .then(r => {
        const data     = r.data.data || {}
        const byStatus = data.byStatus || []
        const total    = data.totalRaces || 0

        setRaceStatusData(RACE_STATUS_SERIES.map(s => {
          const count = byStatus.find(b => b.status === s.key)?.count || 0
          return { ...s, count, percent: total > 0 ? Math.round((count / total) * 100) : 0 }
        }))
      })
      .catch(() => {})
      .finally(() => setRacesLoading(false))
  }, [])

  useEffect(() => { fetchRaceStatus() }, [fetchRaceStatus])

  // fetch bet-type breakdown for the "Bet by Type" tab — mount + race settlement
  const fetchBetTypeBreakdown = useCallback(() => {
    getBetTypeBreakdown()
      .then(r => {
        const byType = r.data.data?.byType || []
        setBetTypeData(byType.map(b => ({
          label:       b.betType,
          count:       b.count,
          totalAmount: b.totalAmount,
        })))
      })
      .catch(() => {})
      .finally(() => setBetsLoading(false))
  }, [])

  useEffect(() => { fetchBetTypeBreakdown() }, [fetchBetTypeBreakdown])

  // fetch top horses by wins for the "Top Horses" tab — mount + race settlement
  const fetchTopHorses = useCallback(() => {
    getTopHorses(5)
      .then(r => {
        const horses = r.data.data?.horses || []
        setTopHorsesData(horses.map(h => ({
          label: h.horseName,
          wins:  h.recordWins,
        })))
      })
      .catch(() => {})
      .finally(() => setTopHorsesLoading(false))
  }, [])

  useEffect(() => { fetchTopHorses() }, [fetchTopHorses])

  // fetch new-account signups for the "Signups" tab, for the selected timeframe
  const fetchSignups = useCallback((timeframe) => {
    const cfg  = TIMEFRAMES[timeframe] || TIMEFRAMES['1M']
    const from = new Date(Date.now() - cfg.hours * 3600 * 1000).toISOString()

    getSignups({ from, bucket: cfg.bucket })
      .then(r => {
        const points = r.data.data?.signupsByPeriod || []
        setSignupsChartData(points.map(p => ({
          label: formatBucketLabel(p.timestamp, cfg.bucket),
          count: p.count || 0,
        })))
      })
      .catch(() => {})
      .finally(() => setSignupsLoading(false))
  }, [])

  useEffect(() => { fetchSignups(signupsTimeframe) }, [signupsTimeframe, fetchSignups])

  const handleWithdrawalsUpdated = useCallback((data) => {
    if (data?.pendingCount != null)
      setStats(prev => ({ ...prev, pendingW: data.pendingCount }))
  }, [])

  // revenue changes on settlement (takeout), deposits change on completed payments — refetch silently
  const handleFinancialUpdated = useCallback(() => {
    fetchFinancial(timeframe, { silent: true })
    fetchBetTypeBreakdown()
    fetchTopHorses()
  }, [timeframe, fetchFinancial, fetchBetTypeBreakdown, fetchTopHorses])

  const handleRacesUpdated = useCallback(() => {
    fetchRaces()
    fetchRaceStatus()
  }, [fetchRaces, fetchRaceStatus])

  // realtime: lắng nghe các event từ backend
  useRaceHub(null, {
    onRacesUpdated:         handleRacesUpdated,
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

        {/* Reports */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <DashboardTabBar tabs={DASHBOARD_TABS} active={activeTab} onChange={setActiveTab} />

          {activeTab === 'financial' && (
            <div className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
                <p className="text-xs text-gray-400">So sánh dòng tiền theo loại giao dịch</p>
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
          )}

          {activeTab === 'races' && (
            <div className="p-6">
              <p className="text-xs text-gray-400 mb-6">Phân bổ số lượng race theo trạng thái hiện tại</p>

              {racesLoading ? (
                <div className="h-52 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
                </div>
              ) : raceStatusData.every(s => s.count === 0) ? (
                <div className="h-52 flex flex-col items-center justify-center text-gray-400">
                  <Activity size={28} strokeWidth={1.5} />
                  <p className="text-xs mt-2">Chưa có race nào trong hệ thống</p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-8">
                  <div className="relative w-full sm:w-56 h-52 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={raceStatusData}
                          dataKey="count"
                          nameKey="label"
                          innerRadius="62%"
                          outerRadius="100%"
                          paddingAngle={2}
                          stroke="none"
                        >
                          {raceStatusData.map(s => (
                            <Cell key={s.key} fill={s.count > 0 ? s.color : CHART_GRID} />
                          ))}
                        </Pie>
                        <Tooltip content={<RaceStatusTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="text-2xl font-extrabold text-gray-900 leading-tight">
                        {raceStatusData.reduce((sum, s) => sum + s.count, 0)}
                      </p>
                      <p className="text-[11px] text-gray-400">Total Races</p>
                    </div>
                  </div>

                  <RaceStatusLegend data={raceStatusData} />
                </div>
              )}
            </div>
          )}

          {activeTab === 'bets' && (
            <div className="p-6">
              <p className="text-xs text-gray-400 mb-6">Tổng tiền cược theo loại cược</p>

              {betsLoading ? (
                <div className="h-52 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
                </div>
              ) : betTypeData.length === 0 ? (
                <div className="h-52 flex flex-col items-center justify-center text-gray-400">
                  <Activity size={28} strokeWidth={1.5} />
                  <p className="text-xs mt-2">Chưa có lượt cược nào trong hệ thống</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={betTypeData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="none" stroke={CHART_GRID} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_AXIS_TEXT }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={yTickFmt} tick={{ fontSize: 11, fill: CHART_AXIS_TEXT }} axisLine={false} tickLine={false} width={48} />
                    <Tooltip content={<BetTypeTooltip />} cursor={{ fill: CHART_GRID }} />
                    <Bar dataKey="totalAmount" fill={SINGLE_SERIES_COLOR} radius={[4, 4, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {activeTab === 'topHorses' && (
            <div className="p-6">
              <p className="text-xs text-gray-400 mb-6">Top 5 ngựa theo số trận thắng</p>

              {topHorsesLoading ? (
                <div className="h-52 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
                </div>
              ) : topHorsesData.length === 0 ? (
                <div className="h-52 flex flex-col items-center justify-center text-gray-400">
                  <Activity size={28} strokeWidth={1.5} />
                  <p className="text-xs mt-2">Chưa có ngựa nào thắng trận</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(210, topHorsesData.length * 34)}>
                  <BarChart
                    data={topHorsesData}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                    barCategoryGap="25%"
                  >
                    <CartesianGrid strokeDasharray="none" stroke={CHART_GRID} horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: CHART_AXIS_TEXT }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="label" width={96} tick={{ fontSize: 12, fill: '#111827' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<TopHorsesTooltip />} cursor={{ fill: CHART_GRID }} />
                    <Bar dataKey="wins" fill={SINGLE_SERIES_COLOR} radius={[0, 4, 4, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {activeTab === 'signups' && (
            <div className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
                <p className="text-xs text-gray-400">Số tài khoản đăng ký mới theo thời gian</p>
                <TimeframeToggle value={signupsTimeframe} onChange={setSignupsTimeframe} />
              </div>

              {signupsLoading ? (
                <div className="h-52 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
                </div>
              ) : signupsChartData.length === 0 ? (
                <div className="h-52 flex flex-col items-center justify-center text-gray-400">
                  <Activity size={28} strokeWidth={1.5} />
                  <p className="text-xs mt-2">Chưa có tài khoản mới trong khoảng này</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={210}>
                  <LineChart data={signupsChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="none" stroke={CHART_GRID} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_AXIS_TEXT }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tickFormatter={yTickFmt} tick={{ fontSize: 11, fill: CHART_AXIS_TEXT }} axisLine={false} tickLine={false} width={48} />
                    <Tooltip content={<SignupsTooltip />} cursor={{ stroke: CHART_GRID, strokeWidth: 1 }} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke={SINGLE_SERIES_COLOR}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: SINGLE_SERIES_COLOR, stroke: '#fff', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  )
}
