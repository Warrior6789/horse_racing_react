import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import { getRacesPaged } from '../../api/races'

const STATUS_OPTS = ['BettingOpen', 'BettingClosed', 'Live', 'Finished']

const RACE_STATUS = {
  BettingOpen:   { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-500/20', dot: true,  label: 'Betting Open'   },
  BettingClosed: { cls: 'bg-orange-50 text-orange-700 ring-orange-500/20',    dot: false, label: 'Betting Closed' },
  Live:          { cls: 'bg-red-50 text-red-600 ring-red-500/20',             dot: true,  label: 'Live'           },
  Finished:      { cls: 'bg-gray-100 text-gray-500 ring-gray-400/20',         dot: false, label: 'Finished'       },
}

function StatusBadge({ status }) {
  const s = RACE_STATUS[status] || { cls: 'bg-gray-100 text-gray-500 ring-gray-400/20', label: status }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${s.cls}`}>
      {s.dot && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse" />}
      {s.label}
    </span>
  )
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

  const load = useCallback((pg, st) => {
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

  useEffect(() => { load(page, status) }, [load, page, status])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function changeStatus(s) { setStatus(s); setPage(1) }

  return (
    <DashboardLayout>
      <div className="space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bet Management</h1>
            <p className="text-sm text-gray-500 mt-1">Monitor race pools and betting activity.</p>
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {STATUS_OPTS.map(s => (
            <button
              key={s}
              onClick={() => changeStatus(s)}
              className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                status === s
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {s.replace(/([A-Z])/g, ' $1').trim()}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-gray-950 rounded-full" />
              <h2 className="text-sm font-bold text-gray-900">Races</h2>
              <span className="text-xs text-gray-400 font-medium">({total} total)</span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <span className="material-symbols-outlined animate-spin text-3xl text-gray-300">progress_activity</span>
            </div>
          ) : races.length === 0 ? (
            <div className="text-center py-16 text-sm font-semibold text-gray-400">No races found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    {['Race', 'Racecourse', 'Status', 'Start Time', 'Total Pool', 'Bet Count'].map(col => (
                      <th key={col} className="py-4 px-4">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {races.map(r => (
                    <tr
                      key={r.raceId}
                      onClick={() => navigate(`/admin/bets/${r.raceId}`)}
                      className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-4">
                        <span className="font-bold text-gray-900">#{r.raceNumber}</span>
                        {r.raceName && <p className="text-[11px] text-gray-400 mt-0.5 max-w-[160px] truncate">{r.raceName}</p>}
                      </td>
                      <td className="py-4 px-4 text-xs text-gray-600 font-medium">{r.racecourseName || '—'}</td>
                      <td className="py-4 px-4 whitespace-nowrap"><StatusBadge status={r.status} /></td>
                      <td className="py-4 px-4 text-xs text-gray-500 whitespace-nowrap">{fmt(r.startTime)}</td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-bold text-gray-900 text-sm">{(r.totalPoolAmount ?? 0).toLocaleString('vi-VN')}</span>
                        <span className="text-gray-400 text-xs ml-1">VND</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-gray-900 text-sm">{r.betCount ?? 0}</span>
                        <span className="text-gray-400 text-xs ml-1">bets</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-7 h-7 flex items-center justify-center rounded text-xs font-bold transition-colors ${p === page ? 'bg-gray-950 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors">
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
