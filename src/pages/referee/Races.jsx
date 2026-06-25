import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import { getRacesPaged } from '../../api/races'

const PAGE_SIZE = 4

const STATUS_OPTIONS = ['', 'Scheduled', 'BettingOpen', 'BettingClosed', 'Live', 'Completed', 'Finished', 'Cancelled']
const STATUS_LABEL   = { BettingOpen: 'Betting Open', BettingClosed: 'Betting Closed' }

const StatusBadge = ({ status }) => {
  const map = {
    Live:          'bg-emerald-100 text-emerald-800',
    BettingOpen:   'bg-emerald-100 text-emerald-800',
    BettingClosed: 'bg-orange-100 text-orange-700',
    Scheduled:     'bg-gray-100 text-gray-600',
    Completed:     'bg-gray-900 text-white',
    Finished:      'bg-gray-900 text-white',
    Cancelled:     'bg-red-100 text-red-700',
  }
  const dot = ['Live', 'BettingOpen'].includes(status)
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${map[status] || 'bg-gray-100 text-gray-500'}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      {STATUS_LABEL[status] || status}
    </span>
  )
}

export default function RefereeRaces() {
  const navigate = useNavigate()

  const [races, setRaces]           = useState([])
  const [page, setPage]             = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading]       = useState(true)
  const [activeCount, setActiveCount] = useState(0)

  const [search, setSearch]   = useState('')
  const [status, setStatus]   = useState('')
  const [inputVal, setInputVal] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const params = { page, pageSize: PAGE_SIZE }
    if (status)  params.status  = status
    if (search)  params.keyword = search
    getRacesPaged(params)
      .then(r => {
        setRaces(r.data.data?.items || [])
        setTotalPages(r.data.data?.totalPages || 1)
        setTotalCount(r.data.data?.totalCount  || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, status, search])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    getRacesPaged({ page: 1, pageSize: 100, status: 'Live' })
      .then(r => setActiveCount(r.data.data?.totalCount || 0))
      .catch(() => {})
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    setSearch(inputVal)
  }

  const handleStatusChange = (e) => {
    setPage(1)
    setStatus(e.target.value)
  }

  return (
    <DashboardLayout title="Race Monitoring">
      <div className="space-y-6">

        {/* Page header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Race Monitoring</h2>
          <p className="text-sm text-gray-500 mt-1">Real-time oversight of official equestrian events.</p>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

          {/* Filter bar */}
          <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-wrap items-center gap-3">
            {/* Status filter */}
            <div className="flex items-center bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm shadow-sm gap-2">
              <span className="material-symbols-outlined text-gray-500" style={{ fontSize: '18px' }}>filter_list</span>
              <span className="font-semibold text-gray-500 text-xs uppercase tracking-wide">Status:</span>
              <select
                value={status}
                onChange={handleStatusChange}
                className="bg-transparent outline-none text-sm font-semibold text-gray-800 cursor-pointer"
              >
                <option value="">All</option>
                {STATUS_OPTIONS.filter(Boolean).map(s => (
                  <option key={s} value={s}>{STATUS_LABEL[s] || s}</option>
                ))}
              </select>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: '18px' }}>search</span>
              <input
                type="text"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                placeholder="Search race name, racecourse or ID..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-300 focus:border-transparent shadow-sm"
              />
            </form>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <span className="material-symbols-outlined animate-spin text-3xl text-gray-300">progress_activity</span>
            </div>
          ) : races.length === 0 ? (
            <div className="text-center py-16 text-sm font-semibold text-gray-400">No races found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200">
                    {['Race #', 'Name', 'Start Time', 'Track Length', 'Status', 'Racecourse', 'Actions'].map(h => (
                      <th key={h} className="py-4 px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {races.map(r => (
                    <tr key={r.raceId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-5 text-sm font-semibold text-gray-700">#{r.raceNumber}</td>
                      <td className="py-4 px-5 text-sm font-bold text-gray-900 max-w-[200px] truncate">{r.raceName || '—'}</td>
                      <td className="py-4 px-5 text-xs text-gray-600 whitespace-nowrap">
                        {r.startTime ? (
                          <>
                            <div className="font-semibold text-gray-900">{new Date(r.startTime).toLocaleDateString()}</div>
                            <div className="text-gray-500">{new Date(r.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          </>
                        ) : '—'}
                      </td>
                      <td className="py-4 px-5 text-sm text-gray-600 font-medium">
                        {r.trackLength ? `${r.trackLength}m` : '—'}
                      </td>
                      <td className="py-4 px-5"><StatusBadge status={r.status} /></td>
                      <td className="py-4 px-5 text-sm text-gray-600 font-medium">{r.racecourseName || '—'}</td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          {r.status === 'Live' && (
                            <button
                              onClick={() => navigate(`/referee/races/${r.raceId}/live`)}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                              Watch Live
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/referee/races/${r.raceId}`)}
                            className="px-3 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/50 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Page <span className="font-bold text-gray-900">{page}</span> of <span className="font-bold text-gray-900">{totalPages}</span>
              <span className="text-gray-400 ml-1">({totalCount} total)</span>
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center border border-gray-200 bg-white text-gray-400 rounded-md hover:bg-gray-50 disabled:opacity-40 transition-colors">
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setPage(n)}
                  className={`w-8 h-8 flex items-center justify-center border rounded-md text-sm font-medium transition-colors
                    ${page === n ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
                  {n}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="w-8 h-8 flex items-center justify-center border border-gray-200 bg-white text-gray-600 rounded-md hover:bg-gray-50 disabled:opacity-40 transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Metric card — Active Races only */}
        <div className="max-w-xs">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-emerald-700" style={{ fontSize: '24px' }}>sports</span>
              </div>
              <span className="text-sm font-bold text-emerald-600">Live</span>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 tracking-wider uppercase mb-1">Active Races</p>
              <h3 className="text-4xl font-bold text-gray-900 leading-none">{String(activeCount).padStart(2, '0')}</h3>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
