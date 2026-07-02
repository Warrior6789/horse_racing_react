import { useEffect, useState, useCallback } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { getTakeoutLedgerPaged } from '../../api/races'

const BET_TYPE_OPTS = ['All', 'Win', 'Place', 'Show']

const BET_TYPE_CLS = {
  Win:   'bg-amber-50 text-amber-700 ring-amber-500/20',
  Place: 'bg-blue-50 text-blue-700 ring-blue-500/20',
  Show:  'bg-purple-50 text-purple-700 ring-purple-500/20',
}

const PAGE_SIZE = 10

function fmtDateTime(dt) {
  if (!dt) return '—'
  const d = new Date(dt)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export default function TakeoutLedger() {
  const [betType, setBetType] = useState('All')
  const [items, setItems]     = useState([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)

  const load = useCallback((pg, bt) => {
    setLoading(true)
    const params = { page: pg, pageSize: PAGE_SIZE }
    if (bt !== 'All') params.betType = bt
    getTakeoutLedgerPaged(params)
      .then(r => {
        const d = r.data.data
        setItems(d?.items || [])
        setTotal(d?.totalCount || 0)
      })
      .catch(() => { setItems([]); setTotal(0) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(page, betType) }, [load, page, betType])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function changeBetType(bt) { setBetType(bt); setPage(1) }

  const pageTakeoutSum = items.reduce((s, r) => s + (r.takeoutAmount ?? 0), 0)
  const latest = items.reduce((max, r) => {
    if (!r.createdAt) return max
    return (!max || new Date(r.createdAt) > new Date(max.createdAt)) ? r : max
  }, null)

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Takeout Ledger</h1>
          <p className="text-sm text-gray-500 mt-1">History of commission (takeout) deducted from betting pools.</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-gray-900 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Takeout (This Page)</p>
              <p className="text-3xl font-extrabold text-white">{pageTakeoutSum.toLocaleString('en-US')}</p>
              <p className="text-xs text-gray-400 mt-0.5">Sum of {items.length} records shown · VND</p>
            </div>
            <div className="p-3 bg-white/10 text-white rounded-xl">
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>payments</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Records</p>
              <p className="text-2xl font-extrabold text-gray-900">{total.toLocaleString('en-US')}</p>
              <p className="text-xs text-gray-400 mt-0.5">takeout records</p>
            </div>
            <div className="p-3 bg-gray-50 text-gray-600 rounded-xl">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>receipt_long</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Latest Settlement</p>
              <p className="text-lg font-extrabold text-gray-900 truncate">
                {latest ? (latest.raceName || `Race #${latest.raceNumber ?? '—'}`) : '—'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{latest ? fmtDateTime(latest.createdAt) : 'No data yet'}</p>
            </div>
            <div className="p-3 bg-gray-50 text-gray-600 rounded-xl shrink-0">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>schedule</span>
            </div>
          </div>
        </div>

        {/* Bet type tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {BET_TYPE_OPTS.map(bt => (
            <button
              key={bt}
              onClick={() => changeBetType(bt)}
              className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                betType === bt
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {bt}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[2fr_0.8fr_1fr_0.8fr_1fr_1.2fr] px-5 py-3 bg-gray-50 border-b border-gray-100">
            {['Race', 'Type', 'Total Pool', 'Takeout %', 'Takeout Amount', 'Settled At'].map(col => (
              <span key={col} className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{col}</span>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <span className="material-symbols-outlined animate-spin text-3xl text-gray-300">progress_activity</span>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-sm font-semibold text-gray-400">No takeout records found.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {items.map(r => (
                <div
                  key={r.takeoutLedgerId}
                  className="grid grid-cols-[2fr_0.8fr_1fr_0.8fr_1fr_1.2fr] items-center px-5 py-4 gap-x-2"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">
                      {r.raceName || 'Deleted race'}{r.raceNumber != null && ` (#${r.raceNumber})`}
                    </p>
                    <p className="text-gray-400 text-xs truncate">{r.raceId}</p>
                  </div>

                  <div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${BET_TYPE_CLS[r.betType] || 'bg-gray-100 text-gray-500 ring-gray-400/20'}`}>
                      {r.betType}
                    </span>
                  </div>

                  <p className="font-medium text-gray-700 text-sm">
                    {(r.totalPool ?? 0).toLocaleString('en-US')} <span className="text-gray-400 font-normal text-xs">VND</span>
                  </p>

                  <p className="font-medium text-gray-700 text-sm">
                    {((r.takeoutPercentage ?? 0) * 100).toLocaleString('en-US')}%
                  </p>

                  <p className="font-bold text-amber-600 text-sm">
                    {(r.takeoutAmount ?? 0).toLocaleString('en-US')} <span className="text-gray-400 font-normal text-xs">VND</span>
                  </p>

                  <p className="text-gray-400 text-xs">{fmtDateTime(r.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-gray-400">Page {page} of {totalPages} · {total} records</p>
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
