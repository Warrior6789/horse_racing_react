import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { History, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import JockeyLayout from '../../components/JockeyLayout'
import { getMyJockeyRaceHistory } from '../../api/jockeyProfiles'

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

export default function JockeyRaceHistory() {
  const navigate = useNavigate()

  const [items,      setItems]      = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading,    setLoading]    = useState(true)
  const [page,       setPage]       = useState(1)

  const fetchData = useCallback((p) => {
    setLoading(true)
    getMyJockeyRaceHistory({ page: p, pageSize: PAGE_SIZE })
      .then(r => {
        const d = r.data.data
        setItems(d?.items || [])
        setTotalCount(d?.totalCount || 0)
        setTotalPages(d?.totalPages || 1)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchData(page) }, [page, fetchData])

  const wins    = items.filter(i => i.position === 1).length
  const winRate = items.length > 0 ? Math.round((wins / items.length) * 100) : 0
  const earned  = items.reduce((s, i) => s + (i.earnings || 0), 0)

  return (
    <JockeyLayout>
      <div className="p-4 md:p-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-white mb-1">Race History</h1>
          <p className="text-gray-400 text-sm">Your completed race assignments and performance record.</p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Races Completed', value: loading ? '—' : totalCount },
            { label: 'Wins (this page)', value: loading ? '—' : wins },
            { label: 'Win Rate (this page)', value: loading ? '—' : `${winRate}%` },
            { label: 'Earnings (this page)', value: loading ? '—' : earned > 0 ? `${earned.toLocaleString()} VND` : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#1a2130] p-5 rounded-xl border border-gray-700/50">
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-3">{label}</p>
              <p className="text-2xl font-black text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-[#1a1814] rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <History size={15} className="text-gray-500" />
              <h2 className="text-sm font-bold text-gray-200">Past Races</h2>
            </div>
            <span className="text-[11px] text-gray-500">{totalCount} races</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-gray-700 border-t-yellow-500 rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-sm">No completed races yet.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-gray-400 text-[11px] font-bold uppercase tracking-wider border-b border-gray-700">
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Race Event</th>
                      <th className="px-6 py-3">Horse</th>
                      <th className="px-6 py-3">Track &amp; Condition</th>
                      <th className="px-6 py-3">Pos</th>
                      <th className="px-6 py-3">Earnings</th>
                      <th className="px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.registrationId} className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors">

                        {/* Date */}
                        <td className="px-6 py-4 text-sm text-gray-300 whitespace-nowrap">
                          {item.date
                            ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : '—'}
                        </td>

                        {/* Race Event */}
                        <td className="px-6 py-4">
                          <div className="font-bold text-yellow-500 text-sm">
                            {item.raceName || `Race #${item.raceNumber || '—'}`}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">#{item.raceNumber}</div>
                        </td>

                        {/* Horse */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 overflow-hidden flex items-center justify-center text-base shrink-0">
                              {item.horseImageUrl
                                ? <img src={item.horseImageUrl} alt="" className="w-full h-full object-cover" />
                                : '🐎'}
                            </div>
                            <span className="font-semibold text-sm text-white">{item.horseName || '—'}</span>
                          </div>
                        </td>

                        {/* Track & Condition */}
                        <td className="px-6 py-4 text-sm text-gray-300">
                          <div>{item.racecourseName || '—'}</div>
                          {item.trackType && (
                            <div className="text-xs text-gray-500 mt-0.5">{item.trackType}</div>
                          )}
                        </td>

                        {/* Position */}
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded text-xs font-bold ${item.position ? getPosColor(item.position) : 'bg-gray-700 text-gray-500'}`}>
                            {posLabel(item.position)}
                          </span>
                        </td>

                        {/* Earnings */}
                        <td className="px-6 py-4 font-mono text-sm">
                          {item.earnings != null && item.earnings > 0
                            ? <span className="text-yellow-400 font-bold">+{item.earnings.toLocaleString()} VND</span>
                            : <span className="text-gray-600">—</span>
                          }
                        </td>

                        {/* Results link */}
                        <td className="px-6 py-4">
                          {item.raceId && (
                            <button
                              onClick={() => navigate(`/jockey/races/${item.raceId}/results`)}
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
                  <p className="text-gray-500 text-xs">Page {page} of {totalPages}</p>
                  <div className="flex gap-1">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      className="w-7 h-7 flex items-center justify-center rounded border border-gray-800 text-gray-400 hover:bg-gray-800 disabled:opacity-40">
                      <ChevronLeft size={14} />
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
                      <button key={n} onClick={() => setPage(n)}
                        className={`w-7 h-7 flex items-center justify-center rounded text-xs font-bold ${n === page ? 'bg-[#facc15] text-black' : 'border border-gray-800 text-gray-400 hover:bg-gray-800'}`}>
                        {n}
                      </button>
                    ))}
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                      className="w-7 h-7 flex items-center justify-center rounded border border-gray-800 text-gray-400 hover:bg-gray-800 disabled:opacity-40">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </JockeyLayout>
  )
}
