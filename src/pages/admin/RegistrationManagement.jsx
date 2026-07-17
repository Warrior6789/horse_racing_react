import { useEffect, useState, useCallback } from 'react'
import { ClipboardList, Clock, CheckCircle2, XCircle, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import { getRegistrationsPaged, adminAcceptRegistration, adminRejectRegistration, scratchRegistration } from '../../api/registrations'
import { getRacesPaged } from '../../api/races'
import { getJockeyProfile } from '../../api/jockeyProfiles'
import { useRaceHub } from '../../hooks/useRaceHub'

const RACE_STATUS_STYLE = {
  Scheduled:     'bg-amber-50 text-amber-700 ring-amber-500/20',
  BettingOpen:   'bg-emerald-50 text-emerald-700 ring-emerald-500/20',
  BettingClosed: 'bg-orange-50 text-orange-700 ring-orange-500/20',
  Live:          'bg-red-50 text-red-600 ring-red-500/20',
  Completed:     'bg-gray-100 text-gray-500 ring-gray-400/20',
  Finished:      'bg-gray-100 text-gray-500 ring-gray-400/20',
  Cancelled:     'bg-red-50 text-red-400 ring-red-300/20',
}

function StatusBadge({ status }) {
  const styles = {
    Pending:   'bg-amber-50 text-amber-600 ring-amber-500/20',
    Approved:  'bg-emerald-50 text-emerald-600 ring-emerald-500/20',
    Confirmed: 'bg-emerald-50 text-emerald-600 ring-emerald-500/20',
    Rejected:  'bg-red-50 text-red-600 ring-red-500/20',
    Scratched: 'bg-orange-50 text-orange-600 ring-orange-500/20',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[status] || 'bg-gray-50 text-gray-500 ring-gray-500/20'}`}>
      {status}
    </span>
  )
}

function KpiCard({ title, value, icon, iconColor, bgIcon }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{title}</p>
        <p className="text-3xl font-extrabold text-gray-900">{value}</p>
      </div>
      <div className={`p-3 ${bgIcon} ${iconColor} rounded-xl`}>{icon}</div>
    </div>
  )
}

const FINISHED_STATUSES = ['Finished', 'Cancelled']

/* ── Race List View ───────────────────────────────────────────────── */
function RaceListView({ onSelect }) {
  const [tab, setTab]           = useState('active')
  const [races, setRaces]       = useState([])
  const [page, setPage]         = useState(1)
  const [totalPages, setTotal]  = useState(1)
  const [loading, setLoading]   = useState(true)

  const PAGE_SIZE = 8

  useEffect(() => {
    setLoading(true)
    getRacesPaged({ page: 1, pageSize: 500 })
      .then(r => {
        const all = r.data.data?.items || []
        const filtered = tab === 'active'
          ? all.filter(x => !FINISHED_STATUSES.includes(x.status))
          : all.filter(x => FINISHED_STATUSES.includes(x.status))
        const start = (page - 1) * PAGE_SIZE
        setRaces(filtered.slice(start, start + PAGE_SIZE))
        setTotal(Math.ceil(filtered.length / PAGE_SIZE) || 1)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, tab])

  const handleTabChange = (t) => { setTab(t); setPage(1) }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Registration Management</h1>
        <p className="text-sm text-gray-500 mt-1">Select a race to view and manage its registrations.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[{ key: 'active', label: 'Active Races' }, { key: 'finished', label: 'Finished / Cancelled' }].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
              tab === key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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
                  {['Race #', 'Race Name', 'Racecourse', 'Start Time', 'Status', 'Action'].map(h => (
                    <th key={h} className="py-4 px-6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {races.map(race => (
                  <tr key={race.raceId} className="hover:bg-gray-50/40 transition-colors">
                    <td className="py-4 px-6 font-bold text-gray-900 whitespace-nowrap">
                      Race #{race.raceNumber}
                    </td>
                    <td className="py-4 px-6 text-gray-700 text-sm">{race.raceName || '—'}</td>
                    <td className="py-4 px-6 text-gray-500 text-xs">{race.racecourseName || '—'}</td>
                    <td className="py-4 px-6 text-gray-500 text-xs whitespace-nowrap">
                      {race.startTime ? new Date(race.startTime).toLocaleString() : '—'}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${RACE_STATUS_STYLE[race.status] || 'bg-gray-50 text-gray-500 ring-gray-500/20'}`}>
                        {race.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => onSelect(race)}
                        className="px-4 py-1.5 bg-gray-950 text-white rounded-lg text-xs font-bold hover:bg-gray-800 transition-colors"
                      >
                        View Registrations
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between text-xs font-medium text-gray-500">
          <span>Page <span className="text-gray-900 font-bold">{page}</span> of <span className="text-gray-900 font-bold">{totalPages}</span></span>
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
  )
}

/* ── Registration Detail View ─────────────────────────────────────── */
function RegistrationDetailView({ race, onBack }) {
  const [items, setItems]        = useState([])
  const [page, setPage]          = useState(1)
  const [totalPages, setTotal]   = useState(1)
  const [totalCount, setCount]   = useState(0)
  const [pending, setPending]    = useState(0)
  const [approved, setApproved]  = useState(0)
  const [rejected, setRejected]  = useState(0)
  const [loading, setLoading]    = useState(true)
  const [acting, setActing]      = useState(null)
  const [jockeyMap, setJockeyMap] = useState({})
  const [error, setError]        = useState('')

  const load = useCallback((p = page) => {
    setLoading(true)
    getRegistrationsPaged({ page: p, pageSize: 6, raceId: race.raceId })
      .then(r => {
        const d = r.data.data || {}
        const list = d.items || []
        setItems(list)
        setTotal(d.totalPages || 1)
        setCount(d.totalCount || 0)
        setPending(d.pendingCount ?? list.filter(i => i.status === 'Pending').length)
        setApproved(d.approvedCount ?? list.filter(i => i.status === 'Approved' || i.status === 'Confirmed').length)
        setRejected(d.rejectedCount ?? list.filter(i => i.status === 'Rejected').length)

        const ids = [...new Set(list.filter(i => i.jockeyId && !i.jockey?.fullName).map(i => i.jockeyId))]
        if (ids.length > 0) {
          Promise.allSettled(ids.map(id => getJockeyProfile(id))).then(results => {
            const map = {}
            results.forEach((r, idx) => {
              if (r.status === 'fulfilled') map[ids[idx]] = r.value.data.data || r.value.data
            })
            setJockeyMap(prev => ({ ...prev, ...map }))
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [race.raceId, page])

  useEffect(() => { load(page) }, [page])

  const handle = async (id, fn) => {
    setActing(id)
    setError('')
    try {
      await fn(id)
    } catch (e) {
      setError(e.response?.data?.message || 'Action failed.')
    }
    setActing(null)
    load(page)
  }

  const handleRegistrationsUpdated = useCallback(() => { load(page) }, [page])
  useRaceHub(race.raceId, { onRegistrationsUpdated: handleRegistrationsUpdated })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4 font-medium">
          <ArrowLeft size={15} /> Back to Races
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          Race #{race.raceNumber}{race.raceName ? ` — ${race.raceName}` : ''}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Approve or reject horse & jockey race entry registrations.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-red-50 border border-red-200 text-red-700">
          {error}
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard title="Total"    value={totalCount} icon={<ClipboardList size={20} />} iconColor="text-gray-600"    bgIcon="bg-gray-100"   />
        <KpiCard title="Pending"  value={pending}    icon={<Clock size={20} />}          iconColor="text-amber-600"   bgIcon="bg-amber-50"   />
        <KpiCard title="Approved" value={approved}   icon={<CheckCircle2 size={20} />}   iconColor="text-emerald-600" bgIcon="bg-emerald-50" />
        <KpiCard title="Rejected" value={rejected}   icon={<XCircle size={20} />}        iconColor="text-red-600"     bgIcon="bg-red-50"     />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <span className="material-symbols-outlined animate-spin text-3xl text-gray-300">progress_activity</span>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-sm font-semibold text-gray-400">No registrations found for this race.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  {['Horse', 'Jockey', 'Gate', 'Status', 'Actions'].map(h => (
                    <th key={h} className="py-4 px-6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {items.map(item => (
                  <tr key={item.registrationId} className="hover:bg-gray-50/40 transition-colors">

                    {/* Horse */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-950 text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {(item.horse?.horseName || item.horseName || '?')[0].toUpperCase()}
                        </div>
                        <span className="font-semibold text-gray-900">{item.horse?.horseName || item.horseName || '—'}</span>
                      </div>
                    </td>

                    {/* Jockey */}
                    <td className="py-4 px-6 text-gray-600 text-xs">
                      {item.jockey?.fullName || jockeyMap[item.jockeyId]?.fullName || item.jockeyName || (item.jockeyId ? <span className="text-gray-400 italic">Loading…</span> : '—')}
                    </td>

                    {/* Gate */}
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-700 font-bold text-xs">
                        {item.gateNumber || '—'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <StatusBadge status={item.status} />
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      {item.status === 'Pending' ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handle(item.registrationId, adminRejectRegistration)}
                            disabled={acting === item.registrationId}
                            className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handle(item.registrationId, adminAcceptRegistration)}
                            disabled={acting === item.registrationId}
                            className="px-3 py-1.5 bg-gray-950 text-white rounded-lg text-xs font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
                          >
                            {acting === item.registrationId ? '…' : 'Accept'}
                          </button>
                        </div>
                      ) : (item.status === 'Approved' || item.status === 'Confirmed') ? (
                        <button
                          onClick={() => handle(item.registrationId, scratchRegistration)}
                          disabled={acting === item.registrationId}
                          className="px-3 py-1.5 border border-orange-200 text-orange-600 rounded-lg text-xs font-bold hover:bg-orange-50 transition-colors disabled:opacity-50"
                        >
                          {acting === item.registrationId ? '…' : 'Scratch'}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between text-xs font-medium text-gray-500">
          <div>
            Showing page <span className="text-gray-900 font-bold">{page}</span> of <span className="text-gray-900 font-bold">{totalPages}</span>
            <span className="ml-2 text-gray-400">({totalCount} total)</span>
          </div>
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
  )
}

/* ── Main ─────────────────────────────────────────────────────────── */
export default function RegistrationManagement() {
  const [selectedRace, setSelectedRace] = useState(null)

  return (
    <DashboardLayout title="Registration Management">
      {selectedRace
        ? <RegistrationDetailView race={selectedRace} onBack={() => setSelectedRace(null)} />
        : <RaceListView onSelect={setSelectedRace} />
      }
    </DashboardLayout>
  )
}
