import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import { getRacesPaged } from '../../api/races'

const STATUS_OPTS = ['BettingOpen', 'BettingClosed', 'Live', 'Finished']

const STATUS_CLS = {
  BettingOpen:   'bg-emerald-900/30 text-emerald-400 border border-emerald-700/40',
  BettingClosed: 'bg-orange-900/30 text-orange-400 border border-orange-700/40',
  Live:          'bg-red-900/30 text-red-400 border border-red-700/40',
  Finished:      'bg-gray-700/40 text-gray-400 border border-gray-600/40',
}

const PAGE_SIZE = 10

function fmt(dt) {
  if (!dt) return '—'
  const d = new Date(dt)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export default function AdminBets() {
  const navigate = useNavigate()
  const [status, setStatus]   = useState('BettingOpen')
  const [races, setRaces]     = useState([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback((pg, st) => {
    setLoading(true)
    getRacesPaged({ page: pg, pageSize: PAGE_SIZE, status: st })
      .then(r => {
        const d = r.data.data
        setRaces(d?.items || [])
        setTotal(d?.totalCount || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetch(page, status) }, [fetch, page, status])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function changeStatus(s) {
    setStatus(s)
    setPage(1)
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#facc15] mb-1">Bets</h1>
          <p className="text-gray-400 text-sm">Race pool & bet management overview.</p>
        </div>

        {/* Status filter */}
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTS.map(s => (
            <button
              key={s}
              onClick={() => changeStatus(s)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                status === s
                  ? 'bg-[#facc15] text-black border-[#facc15]'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
              }`}
            >
              {s.replace(/([A-Z])/g, ' $1').trim()}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-[#161a23] rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
            <h2 className="text-sm font-bold text-gray-200">Race List</h2>
            <span className="text-[11px] text-gray-500">{total} races</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-gray-700 border-t-yellow-500 rounded-full animate-spin" />
            </div>
          ) : races.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-sm">No races found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="text-gray-500 text-[11px] uppercase tracking-wider border-b border-gray-800 bg-[#16181d]/50">
                    {['Race', 'Racecourse', 'Status', 'Start Time', 'Total Pool', 'Bet Count'].map(col => (
                      <th key={col} className="px-6 py-4 font-bold">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/80">
                  {races.map(r => (
                    <tr
                      key={r.raceId}
                      onClick={() => navigate(`/admin/bets/${r.raceId}`)}
                      className="hover:bg-gray-800/40 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <p className="text-white font-bold text-sm">{r.raceName || `Race #${r.raceNumber}`}</p>
                        <p className="text-gray-500 text-[10px]">#{r.raceNumber}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-300 text-sm">{r.racecourseName || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_CLS[r.status] || 'text-gray-400'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-sm">{fmt(r.startTime)}</td>
                      <td className="px-6 py-4">
                        <span className="text-emerald-400 font-bold text-sm">
                          {(r.totalPoolAmount ?? 0).toLocaleString('vi-VN')}
                        </span>
                        <span className="text-gray-500 text-xs ml-1">VND</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white font-bold text-sm">{r.betCount ?? 0}</span>
                        <span className="text-gray-500 text-xs ml-1">bets</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
              <p className="text-gray-500 text-xs">Page {page} of {totalPages}</p>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="w-7 h-7 flex items-center justify-center rounded border border-gray-800 text-gray-400 hover:bg-gray-800 disabled:opacity-40">
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-7 h-7 flex items-center justify-center rounded text-xs font-bold transition-colors ${p === page ? 'bg-[#facc15] text-black' : 'border border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded border border-gray-800 text-gray-400 hover:bg-gray-800 disabled:opacity-40">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
