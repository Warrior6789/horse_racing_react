import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../../components/DashboardLayout'
import { getRacesPaged } from '../../api/races'
import { getRacecourses } from '../../api/racecourses'

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

const todayISO = () => new Date().toISOString().slice(0, 10)

function fmtDateTime(dt) {
  if (!dt) return '—'
  const d = new Date(dt)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export default function AdminBets() {
  const navigate = useNavigate()

  const [status, setStatus]         = useState('BettingOpen')
  const [races, setRaces]           = useState([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(true)
  const [racecourses, setRacecourses] = useState([])

  // filter state (draft — applied on button click)
  const [draftCourse, setDraftCourse] = useState('')
  const [draftDate, setDraftDate]     = useState(todayISO())
  // applied filter
  const [appliedCourse, setAppliedCourse] = useState('')
  const [appliedDate, setAppliedDate]     = useState('')

  useEffect(() => {
    getRacecourses()
      .then(r => setRacecourses(r.data.data || r.data || []))
      .catch(() => {})
  }, [])

  const load = useCallback((pg, st, courseId, date) => {
    setLoading(true)
    const params = { page: pg, pageSize: PAGE_SIZE, status: st }
    if (courseId) params.racecourseId = courseId
    if (date)     params.date         = date
    getRacesPaged(params)
      .then(r => {
        const d = r.data.data
        setRaces(d?.items || [])
        setTotal(d?.totalCount || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(page, status, appliedCourse, appliedDate) }, [load, page, status, appliedCourse, appliedDate])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function changeStatus(s) { setStatus(s); setPage(1) }

  function applyFilters() {
    setAppliedCourse(draftCourse)
    setAppliedDate(draftDate)
    setPage(1)
  }

  const fmtDate = (iso) => {
    if (!iso) return ''
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bet Management</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor race pools and betting activity.</p>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            {/* Course Selection */}
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                Course Selection
              </label>
              <div className="relative">
                <select
                  value={draftCourse}
                  onChange={e => setDraftCourse(e.target.value)}
                  className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 pr-8"
                >
                  <option value="">All Racecourses</option>
                  {racecourses.map(c => (
                    <option key={c.racecourseId || c.id} value={c.racecourseId || c.id}>
                      {c.racecourseName || c.name}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" style={{ fontSize: '16px' }}>
                  expand_more
                </span>
              </div>
            </div>

            {/* Date Range */}
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                Date Range
              </label>
              <input
                type="date"
                value={draftDate}
                onChange={e => setDraftDate(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
              />
            </div>

            {/* Apply button */}
            <button
              onClick={applyFilters}
              className="h-[42px] px-6 bg-[#facc15] hover:bg-yellow-400 text-gray-900 font-bold text-sm rounded-xl transition-colors whitespace-nowrap flex items-center gap-2 shrink-0"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>filter_alt</span>
              Apply Filters
            </button>
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

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <span className="material-symbols-outlined animate-spin text-3xl text-gray-300">progress_activity</span>
          </div>
        ) : races.length === 0 ? (
          <div className="text-center py-20 text-sm font-semibold text-gray-400">No races found.</div>
        ) : (
          <div className="space-y-3">
            {races.map(r => (
              <div
                key={r.raceId}
                onClick={() => navigate(`/admin/bets/${r.raceId}`)}
                className="bg-white border border-gray-100 shadow-sm rounded-2xl cursor-pointer hover:shadow-md hover:border-gray-200 transition-all overflow-hidden"
              >
                {/* Top strip: status + start time */}
                <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-100 bg-gray-50">
                  <StatusBadge status={r.status} />
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>schedule</span>
                    {fmtDateTime(r.startTime)}
                  </span>
                </div>

                {/* Bottom: race info + total bet */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-950 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                      #{r.raceNumber}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{r.raceName || `Race #${r.raceNumber}`}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{r.racecourseName || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-gray-900 font-extrabold text-base">
                        {(r.totalPoolAmount ?? 0).toLocaleString('vi-VN')}
                        <span className="text-gray-400 font-normal text-xs ml-1">VND</span>
                      </p>
                      <p className="text-gray-400 text-xs">{r.betCount ?? 0} bets</p>
                    </div>
                    <span className="text-gray-300 text-lg font-light">›</span>
                  </div>
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
