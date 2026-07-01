import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../../components/DashboardLayout'
import { getRacesPaged } from '../../api/races'

const STATUS_OPTS = ['BettingOpen', 'BettingClosed', 'Live', 'Finished']

const STATUS_CLS = {
  BettingOpen:   'bg-emerald-500/20 text-emerald-400',
  BettingClosed: 'bg-orange-500/20 text-orange-400',
  Live:          'bg-red-500/20 text-red-400',
  Finished:      'bg-gray-500/20 text-gray-400',
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
      <div className="min-h-screen bg-[#1a1712] p-6 md:p-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Bets</h1>
          <p className="text-sm text-gray-400 mt-1">Monitor race pools and betting activity.</p>
        </div>

        {/* Status filter */}
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTS.map(s => (
            <button
              key={s}
              onClick={() => changeStatus(s)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                status === s
                  ? 'bg-white text-[#1a1712]'
                  : 'bg-[#2a2620] text-gray-400 hover:text-white'
              }`}
            >
              {s.replace(/([A-Z])/g, ' $1').trim()}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-[#3d3830] border-t-white rounded-full animate-spin" />
          </div>
        ) : races.length === 0 ? (
          <div className="text-center py-20 text-gray-500 text-sm">No races found.</div>
        ) : (
          <div className="space-y-2">
            {races.map(r => (
              <div
                key={r.raceId}
                onClick={() => navigate(`/admin/bets/${r.raceId}`)}
                className="flex items-center justify-between p-4 bg-[#2a2620] hover:bg-[#3d3830] rounded-xl cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#1a1712] flex items-center justify-center shrink-0">
                    <span className="text-gray-300 font-bold text-sm">#{r.raceNumber}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{r.raceName || `Race #${r.raceNumber}`}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{r.racecourseName || '—'} · {fmt(r.startTime)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-white font-bold text-sm">{(r.totalPoolAmount ?? 0).toLocaleString('vi-VN')} VND</p>
                    <p className="text-gray-400 text-xs">{r.betCount ?? 0} bets</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${STATUS_CLS[r.status] || 'bg-gray-500/20 text-gray-400'}`}>
                    {r.status}
                  </span>
                  <span className="text-gray-500 text-lg">›</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-gray-500">Page {page} of {totalPages} · {total} races</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 bg-[#2a2620] text-gray-400 rounded-lg text-xs font-semibold hover:text-white disabled:opacity-40 transition-colors">
                ‹ Prev
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 bg-[#2a2620] text-gray-400 rounded-lg text-xs font-semibold hover:text-white disabled:opacity-40 transition-colors">
                Next ›
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
