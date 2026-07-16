import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { History, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import OwnerLayout from '../../components/OwnerLayout'
import { getHorses, getHorsePerformance, getOwnerRaceHistory } from '../../api/horses'
import { useRaceHub } from '../../hooks/useRaceHub'
import { useAuth } from '../../context/AuthContext'

const PAGE_SIZE = 10

const getPosColor = (pos) => {
  if (pos === 1) return 'bg-yellow-500 text-black'
  if (pos === 2) return 'bg-gray-300 text-black'
  if (pos === 3) return 'bg-orange-700 text-white'
  return 'bg-gray-700 text-gray-300'
}

const posLabel = (pos) => {
  if (!pos) return '—'
  if (pos === 1) return '1st'
  if (pos === 2) return '2nd'
  if (pos === 3) return '3rd'
  return `${pos}th`
}

function StatCard({ title, value, subtext, trend }) {
  return (
    <div className="bg-[#1a2130] p-6 rounded-xl border border-gray-700/50">
      <div className="flex justify-between items-start">
        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">{title}</p>
        {trend && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${trend.startsWith('+') ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
            {trend}
          </span>
        )}
      </div>
      <h3 className="text-3xl font-black text-white mt-2">{value}</h3>
      {subtext && <p className="text-gray-500 text-xs mt-1">{subtext}</p>}
    </div>
  )
}


export default function OwnerEarnings() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [horses,     setHorses]     = useState([])
  const [horseStats, setHorseStats] = useState([])
  const [loading,    setLoading]    = useState(true)

  const [historyItems,      setHistoryItems]      = useState([])
  const [historyTotalCount, setHistoryTotalCount] = useState(0)
  const [historyTotalPages, setHistoryTotalPages] = useState(1)
  const [historyLoading,    setHistoryLoading]    = useState(true)
  const [historyPage,       setHistoryPage]       = useState(1)

  const fetchEarnings = useCallback(() => {
    setLoading(true)
    getHorses({ page: 1, pageSize: 100 })
      .then(async r => {
        const list = r.data.data?.items || []
        setHorses(list)
        const stats = await Promise.all(
          list.map(h =>
            getHorsePerformance(h.id)
              .then(res => {
                const d = res.data.data
                return { horse: h, totalRaces: d?.totalRaces || 0, totalWins: d?.totalWins || 0, totalEarned: d?.totalEarned || 0 }
              })
              .catch(() => ({ horse: h, totalRaces: 0, totalWins: 0, totalEarned: 0 }))
          )
        )
        setHorseStats(stats)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchEarnings() }, [fetchEarnings])

  const fetchHistory = useCallback((p) => {
    setHistoryLoading(true)
    getOwnerRaceHistory({ page: p, pageSize: PAGE_SIZE })
      .then(r => {
        const d = r.data.data
        setHistoryItems(d?.items || [])
        setHistoryTotalCount(d?.totalCount || 0)
        setHistoryTotalPages(d?.totalPages || 1)
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false))
  }, [])

  useEffect(() => { fetchHistory(historyPage) }, [historyPage, fetchHistory])

  const handleBalanceUpdated = useCallback((data) => {
    if (data?.accountId !== user?.id) return
    if (data?.reason === 'PrizePayout') { fetchEarnings(); fetchHistory(historyPage) }
  }, [user, fetchEarnings, fetchHistory, historyPage])

  useRaceHub(null, { onBalanceUpdated: handleBalanceUpdated })

  const totalAmount = horseStats.reduce((s, h) => s + h.totalEarned, 0)
  const totalRaces  = horseStats.reduce((s, h) => s + h.totalRaces, 0)
  const totalWins   = horseStats.reduce((s, h) => s + h.totalWins, 0)

  return (
    <OwnerLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 md:space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[#facc15] mb-2">Earnings Overview</h1>
            <p className="text-gray-400 text-sm">Real-time performance analytics and fiscal breakdown for your racing portfolio.</p>
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Total Lifetime Earnings" value={`${totalAmount.toLocaleString('vi-VN')} VND`} />
          <StatCard title="Total Races"             value={totalRaces} subtext="Across all horses" />
          <StatCard title="Total Wins"              value={totalWins}  subtext="1st place finishes" />
        </div>


        {/* Table */}
        <section className="bg-[#161a23] rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
            <h2 className="text-sm font-bold text-gray-200">Horse Performance Ledger</h2>
            <span className="text-[11px] text-gray-500">{horseStats.length} records</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-gray-700 border-t-yellow-500 rounded-full animate-spin" />
            </div>
          ) : horses.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-sm">No horses found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="text-gray-500 text-[11px] uppercase tracking-wider border-b border-gray-800 bg-[#16181d]/50">
                    {['Horse', 'Races', 'Wins', 'Total Earned'].map(col => (
                      <th key={col} className="px-6 py-4 font-bold">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/80">
                  {horseStats.map(({ horse, totalRaces, totalWins, totalEarned }) => (
                    <tr key={horse.id} className="hover:bg-gray-800/40 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gray-800 border border-gray-700 overflow-hidden flex items-center justify-center text-sm shrink-0">
                            {horse.imageUrl ? <img src={horse.imageUrl} alt="" className="w-full h-full object-cover" /> : '🐎'}
                          </div>
                          <div>
                            <p className="text-gray-200 text-sm font-bold group-hover:text-white">{horse.horseName}</p>
                            <p className="text-gray-500 text-[10px]">{horse.breed || '—'} • {horse.age ? `${horse.age}yo` : '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white font-bold text-sm">{totalRaces}</span>
                        <span className="text-gray-500 text-xs ml-1">races</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-yellow-400 font-bold text-sm">{totalWins}</span>
                        {totalRaces > 0 && (
                          <span className="text-gray-500 text-xs ml-1">({Math.round((totalWins / totalRaces) * 100)}%)</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-emerald-400 font-bold text-sm">+{totalEarned.toLocaleString('vi-VN')}</span>
                        <span className="text-gray-500 text-xs ml-1">VND</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Race-by-race history */}
        <section className="bg-[#161a23] rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <History size={15} className="text-gray-500" />
              <h2 className="text-sm font-bold text-gray-200">Race History</h2>
            </div>
            <span className="text-[11px] text-gray-500">{historyTotalCount} races</span>
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-gray-700 border-t-yellow-500 rounded-full animate-spin" />
            </div>
          ) : historyItems.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-sm">No completed races yet.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead>
                    <tr className="text-gray-500 text-[11px] uppercase tracking-wider border-b border-gray-800 bg-[#16181d]/50">
                      <th className="px-6 py-3 font-bold">Date</th>
                      <th className="px-6 py-3 font-bold">Race</th>
                      <th className="px-6 py-3 font-bold">Horse</th>
                      <th className="px-6 py-3 font-bold">Jockey</th>
                      <th className="px-6 py-3 font-bold">Track</th>
                      <th className="px-6 py-3 font-bold">Pos</th>
                      <th className="px-6 py-3 font-bold">Earnings</th>
                      <th className="px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/80">
                    {historyItems.map(item => (
                      <tr key={item.registrationId} className="hover:bg-gray-800/40 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-300">
                          {item.date
                            ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-yellow-500 text-sm">
                            {item.raceName || `Race #${item.raceNumber || '—'}`}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 overflow-hidden flex items-center justify-center text-base shrink-0">
                              {item.horseImageUrl
                                ? <img src={item.horseImageUrl} alt="" className="w-full h-full object-cover" />
                                : '🐎'}
                            </div>
                            <span className="font-semibold text-sm text-white">{item.horseName || '—'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">{item.jockeyName || '—'}</td>
                        <td className="px-6 py-4 text-sm text-gray-300">
                          <div>{item.racecourseName || '—'}</div>
                          {item.trackType && (
                            <div className="text-xs text-gray-500 mt-0.5">{item.trackType}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded text-xs font-bold ${item.position ? getPosColor(item.position) : 'bg-gray-700 text-gray-500'}`}>
                            {posLabel(item.position)}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-sm">
                          {item.earnings != null && item.earnings > 0
                            ? <span className="text-emerald-400 font-bold">+{item.earnings.toLocaleString('vi-VN')} VND</span>
                            : <span className="text-gray-600">—</span>}
                        </td>
                        <td className="px-6 py-4">
                          {item.raceId && (
                            <button
                              onClick={() => navigate(`/owner/races/${item.raceId}/results`)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-yellow-400 hover:bg-gray-700 transition-colors"
                              title="View Results"
                            >
                              <ExternalLink size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {historyTotalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
                  <p className="text-gray-500 text-xs">Page {historyPage} of {historyTotalPages}</p>
                  <div className="flex gap-1">
                    <button onClick={() => setHistoryPage(p => Math.max(1, p - 1))} disabled={historyPage === 1}
                      className="w-7 h-7 flex items-center justify-center rounded border border-gray-800 text-gray-400 hover:bg-gray-800 disabled:opacity-40">
                      <ChevronLeft size={14} />
                    </button>
                    {Array.from({ length: Math.min(historyTotalPages, 5) }, (_, i) => i + 1).map(n => (
                      <button key={n} onClick={() => setHistoryPage(n)}
                        className={`w-7 h-7 flex items-center justify-center rounded text-xs font-bold ${n === historyPage ? 'bg-[#facc15] text-black' : 'border border-gray-800 text-gray-400 hover:bg-gray-800'}`}>
                        {n}
                      </button>
                    ))}
                    <button onClick={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))} disabled={historyPage === historyTotalPages}
                      className="w-7 h-7 flex items-center justify-center rounded border border-gray-800 text-gray-400 hover:bg-gray-800 disabled:opacity-40">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

      </div>
    </OwnerLayout>
  )
}
