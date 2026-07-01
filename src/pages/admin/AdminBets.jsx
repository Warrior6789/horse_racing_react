import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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
    ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
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
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bet Management</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor race pools and betting activity.</p>
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

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <span className="material-symbols-outlined animate-spin text-3xl text-gray-300">progress_activity</span>
          </div>
        ) : races.length === 0 ? (
          <div className="text-center py-20 text-sm font-semibold text-gray-400">No races found.</div>
        ) : (
          <div className="space-y-2">
            {races.map(r => (
              <div
                key={r.raceId}
                onClick={() => navigate(`/admin/bets/${r.raceId}`)}
                className="flex items-center justify-between px-5 py-4 bg-white border border-gray-100 shadow-sm rounded-2xl cursor-pointer hover:shadow-md hover:border-gray-200 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-950 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                    #{r.raceNumber}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{r.raceName || `Race #${r.raceNumber}`}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{r.racecourseName || '—'} · {fmt(r.startTime)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-gray-900 font-bold text-sm">{(r.totalPoolAmount ?? 0).toLocaleString('vi-VN')} VND</p>
                    <p className="text-gray-400 text-xs">{r.betCount ?? 0} bets</p>
                  </div>
                  <StatusBadge status={r.status} />
                  <span className="text-gray-300 text-lg font-light">›</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-gray-400">Page {page} of {totalPages} · {total} races</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50 disabled:opacity-40 transition-colors">
                ‹ Prev
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50 disabled:opacity-40 transition-colors">
                Next ›
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
