import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import { getRacesPaged, getRaceReferee, assignReferee, unassignReferee } from '../../api/races'
import { getAccountsPaged } from '../../api/accounts'

const STATUS_STYLE = {
  Scheduled:     'bg-amber-50 text-amber-700 ring-amber-500/20',
  BettingOpen:   'bg-emerald-50 text-emerald-700 ring-emerald-500/20',
  BettingClosed: 'bg-orange-50 text-orange-700 ring-orange-500/20',
  Live:          'bg-red-50 text-red-600 ring-red-500/20',
  Completed:     'bg-gray-100 text-gray-500 ring-gray-400/20',
  Finished:      'bg-gray-100 text-gray-500 ring-gray-400/20',
  Cancelled:     'bg-red-50 text-red-400 ring-red-300/20',
}
const STATUS_LABEL = {
  BettingOpen: 'Betting Open', BettingClosed: 'Betting Closed',
}

const PAGE_SIZE = 4

export default function RefereeAssignment() {
  const [races, setRaces]           = useState([])
  const [page, setPage]             = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [searchInput, setSearchInput] = useState('')

  const [tab, setTab]               = useState('active')
  const [referees, setReferees]     = useState([])
  const [assigned, setAssigned]     = useState({})   // { raceId: refereeId | null }
  const [selected, setSelected]     = useState({})   // { raceId: refereeId }
  const [acting, setActing]         = useState(null)
  const [toast, setToast]           = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  // Load referees once
  useEffect(() => {
    getAccountsPaged({ page: 1, pageSize: 100, status: 'Active', role: 'Referee' })
      .then(r => setReferees(r.data.data?.items || []))
      .catch(() => {})
  }, [])

  // Load races
  const loadRaces = useCallback((p = page, q = search, t = tab) => {
    setLoading(true)
    const statusParam = t === 'finished' ? 'Finished' : undefined
    getRacesPaged({ page: p, pageSize: PAGE_SIZE, ...(q && { search: q }), ...(statusParam && { status: statusParam }) })
      .then(async r => {
        const all = r.data.data?.items || []
        const items = t === 'active' ? all.filter(r => !['Finished', 'Cancelled'].includes(r.status)) : all
        setRaces(items)
        setTotalPages(r.data.data?.totalPages || 1)
        setTotalCount(r.data.data?.totalCount || 0)

        // Load assigned referee for each race
        const results = await Promise.allSettled(items.map(race => getRaceReferee(race.raceId)))
        const map = {}
        const sel = {}
        items.forEach((race, i) => {
          const res = results[i]
          const ref = res.status === 'fulfilled' ? res.value.data?.data : null
          map[race.raceId] = ref?.refereeId ?? null
          sel[race.raceId] = ref?.refereeId ?? ''
        })
        setAssigned(map)
        setSelected(prev => ({ ...prev, ...sel }))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, search, tab])

  useEffect(() => { loadRaces(page, search, tab) }, [page, search, tab])

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    setSearch(searchInput)
    loadRaces(1, searchInput, tab)
  }

  const handleTabChange = (t) => { setTab(t); setPage(1); setSearch(''); setSearchInput('') }

  const handleAssign = async (raceId) => {
    const refereeId = selected[raceId]
    if (!refereeId) return
    setActing(raceId)
    try {
      await assignReferee(raceId, refereeId)
      setAssigned(prev => ({ ...prev, [raceId]: refereeId }))
      showToast('Referee assigned successfully')
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to assign referee')
    } finally { setActing(null) }
  }

  const handleUnassign = async (raceId) => {
    setActing(raceId)
    try {
      await unassignReferee(raceId)
      setAssigned(prev => ({ ...prev, [raceId]: null }))
      setSelected(prev => ({ ...prev, [raceId]: '' }))
      showToast('Referee unassigned')
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to unassign referee')
    } finally { setActing(null) }
  }

  const isChanged = (raceId) => selected[raceId] !== (assigned[raceId] ?? '')

  return (
    <DashboardLayout title="Referee Assignment">
      <div className="space-y-6">

        {/* Heading */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Referee Assignment</h1>
            <p className="text-sm text-gray-500 mt-1">Assign referees to upcoming races.</p>
          </div>
          <form onSubmit={handleSearch} className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search races..."
              className="pl-8 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400 w-56"
            />
          </form>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {[{ key: 'active', label: 'Active Races' }, { key: 'finished', label: 'Finished / Cancelled' }].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                tab === key ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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
                  <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    {['Race', 'Racecourse', 'Start Time', 'Status', 'Assigned Referee', 'Actions'].map(h => (
                      <th key={h} className="py-3 px-5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {races.map(race => {
                    const statusCls = STATUS_STYLE[race.status] || STATUS_STYLE.Scheduled
                    const statusLabel = STATUS_LABEL[race.status] || race.status
                    const currentRef = assigned[race.raceId]
                    const currentRefName = referees.find(r => r.id === currentRef || r.accountId === currentRef)?.fullName
                    const isFinished = tab === 'finished'

                    return (
                      <tr key={race.raceId} className="hover:bg-gray-50/40 transition-colors">

                        <td className="py-4 px-5">
                          <p className="font-bold text-gray-900">#{race.raceNumber}</p>
                          {race.raceName && <p className="text-[11px] text-gray-400 mt-0.5 max-w-[140px] truncate">{race.raceName}</p>}
                        </td>

                        <td className="py-4 px-5 text-gray-600 text-xs font-medium">
                          {race.racecourseName || '—'}
                        </td>

                        <td className="py-4 px-5 text-xs text-gray-500 whitespace-nowrap">
                          {race.startTime ? new Date(race.startTime).toLocaleString() : '—'}
                        </td>

                        <td className="py-4 px-5">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset ${statusCls}`}>
                            {statusLabel}
                          </span>
                        </td>

                        <td className="py-4 px-5">
                          {isFinished ? (
                            <span className="text-sm font-semibold text-gray-700">{currentRefName || <span className="text-gray-400">— Unassigned —</span>}</span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <select
                                value={selected[race.raceId] ?? ''}
                                onChange={e => setSelected(prev => ({ ...prev, [race.raceId]: e.target.value }))}
                                className="border border-gray-200 text-gray-700 text-xs rounded-lg py-1.5 px-2.5 bg-white focus:outline-none focus:border-gray-400 max-w-[180px]"
                              >
                                <option value="">— Select Referee —</option>
                                {referees.map(ref => (
                                  <option key={ref.id || ref.accountId} value={ref.id || ref.accountId}>
                                    {ref.fullName || ref.email}
                                  </option>
                                ))}
                              </select>
                              {currentRef && currentRefName && (
                                <p className="text-[10px] text-gray-400">Current: {currentRefName}</p>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-5">
                          {!isFinished && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleAssign(race.raceId)}
                                disabled={acting === race.raceId || !selected[race.raceId] || !isChanged(race.raceId)}
                                className="px-3 py-1.5 bg-gray-950 text-white rounded-lg text-xs font-bold hover:bg-gray-800 transition-colors disabled:opacity-40"
                              >
                                {acting === race.raceId ? '…' : 'Assign'}
                              </button>
                              {currentRef && (
                                <button
                                  onClick={() => handleUnassign(race.raceId)}
                                  disabled={acting === race.raceId}
                                  className="px-3 py-1.5 border border-red-100 text-red-500 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors disabled:opacity-40"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <footer className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between text-xs font-medium text-gray-500">
            <p>Page <span className="text-gray-900 font-bold">{page}</span> of <span className="text-gray-900 font-bold">{totalPages}</span> ({totalCount} total)</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:bg-white transition-colors disabled:opacity-40">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-white transition-colors disabled:opacity-40">
                <ChevronRight size={14} />
              </button>
            </div>
          </footer>
        </div>

      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-950 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}
    </DashboardLayout>
  )
}
