import { useEffect, useState, useCallback } from 'react'
import { ShieldAlert, FileText, CheckCircle2, XCircle, ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import { getReports, approveReport, rejectReport } from '../../api/refereeReports'
import { useRaceHub } from '../../hooks/useRaceHub'

function initials(name = '') {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase() || '??'
}

function StatusBadge({ status }) {
  const styles = {
    Pending:  'bg-amber-50 text-amber-600 ring-amber-500/20',
    Approved: 'bg-emerald-50 text-emerald-600 ring-emerald-500/20',
    Rejected: 'bg-red-50 text-red-600 ring-red-500/20',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[status] || 'bg-gray-50 text-gray-500 ring-gray-500/20'}`}>
      {status}
    </span>
  )
}

function PenaltyBadge({ penaltyType, fineAmount }) {
  if (!penaltyType) return <span className="text-gray-400 font-medium">—</span>
  const styles =
    penaltyType === 'Fine'            ? 'bg-blue-50 text-blue-600 ring-blue-500/20' :
    penaltyType === 'Warning'         ? 'bg-indigo-50 text-indigo-600 ring-indigo-500/20' :
    penaltyType === 'Disqualification'? 'bg-red-50 text-red-600 ring-red-500/20' :
                                        'bg-gray-50 text-gray-600 ring-gray-500/20'
  return (
    <div className="flex flex-col gap-1">
      <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold tracking-wide ring-1 ring-inset uppercase ${styles}`}>
        {penaltyType}
      </span>
      {penaltyType === 'Fine' && fineAmount != null && (
        <span className="text-[10px] text-blue-500 font-semibold">
          {Number(fineAmount).toLocaleString('vi-VN')} VND
        </span>
      )}
    </div>
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

export default function AdminRefereeReports() {
  const [items, setItems]         = useState([])
  const [page, setPage]           = useState(1)
  const [totalPages, setTotal]    = useState(1)
  const [totalCount, setCount]    = useState(0)
  const [pending, setPending]     = useState(0)
  const [approved, setApproved]   = useState(0)
  const [rejected, setRejected]   = useState(0)
  const [loading, setLoading]     = useState(true)
  const [acting, setActing]       = useState(null)
  const [error, setError]         = useState('')

  const [selectedRace, setSelectedRace]     = useState(null)
  const [raceSummaries, setRaceSummaries]   = useState([])
  const [racesLoading, setRacesLoading]     = useState(true)

  const loadRaceSummaries = useCallback(() => {
    setRacesLoading(true)
    getReports({ page: 1, pageSize: 200 })
      .then(r => {
        const all = r.data.data?.items || []
        const map = new Map()
        all.forEach(row => {
          if (!map.has(row.raceId)) {
            map.set(row.raceId, {
              raceId: row.raceId,
              raceName: row.raceName,
              raceNumber: row.raceNumber,
              racecourseName: row.racecourseName,
              total: 0, pending: 0, approved: 0, rejected: 0,
            })
          }
          const s = map.get(row.raceId)
          s.total += 1
          if (row.status === 'Pending') s.pending += 1
          else if (row.status === 'Approved') s.approved += 1
          else if (row.status === 'Rejected') s.rejected += 1
        })
        setRaceSummaries(Array.from(map.values()))
      })
      .catch(() => {})
      .finally(() => setRacesLoading(false))
  }, [])

  useEffect(() => { loadRaceSummaries() }, [loadRaceSummaries])

  const load = useCallback((p = page) => {
    if (!selectedRace) return
    setLoading(true)
    getReports({ raceId: selectedRace.raceId, page: p, pageSize: 4 })
      .then(r => {
        const d = r.data.data || {}
        setItems(d.items || [])
        setTotal(d.totalPages || 1)
        setCount(d.totalCount || 0)
        setPending(d.pendingCount || 0)
        setApproved(d.approvedCount || 0)
        setRejected(d.rejectedCount || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, selectedRace])

  useEffect(() => { if (selectedRace) load(page) }, [page, selectedRace, load])

  useRaceHub(null, { onReportUpdated: () => { loadRaceSummaries(); if (selectedRace) load(page) } })

  const openRace = (race) => {
    setSelectedRace(race)
    setPage(1)
  }

  const backToRaces = () => {
    setSelectedRace(null)
    loadRaceSummaries()
  }

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
    loadRaceSummaries()
  }

  return (
    <DashboardLayout title="Referee Reports">
      <div className="space-y-8">
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-red-50 border border-red-200 text-red-700">
            {error}
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
            </button>
          </div>
        )}

        {/* Page heading */}
        {selectedRace ? (
          <div>
            <button onClick={backToRaces} className="text-xs font-bold text-gray-500 hover:text-gray-800 flex items-center gap-1 mb-3">
              <ChevronLeft size={14} /> Back to Races
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{selectedRace.raceName || `Race #${selectedRace.raceNumber}`}</h1>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
              <MapPin size={13} /> {selectedRace.racecourseName || '—'}
            </p>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Referee Reports</h1>
            <p className="text-sm text-gray-500 mt-1">Select a race to review its incident reports.</p>
          </div>
        )}

        {!selectedRace ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_24px] px-5 py-3 bg-gray-50 border-b border-gray-100">
              {['Race', 'Racecourse', 'Pending', 'Approved', 'Rejected', ''].map(col => (
                <span key={col} className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{col}</span>
              ))}
            </div>

            {racesLoading ? (
              <div className="flex items-center justify-center h-48">
                <span className="material-symbols-outlined animate-spin text-3xl text-gray-300">progress_activity</span>
              </div>
            ) : raceSummaries.length === 0 ? (
              <div className="text-center py-16 text-sm font-semibold text-gray-400">No reports found.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {raceSummaries.map(r => (
                  <div
                    key={r.raceId}
                    onClick={() => openRace(r)}
                    className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_24px] items-center px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors gap-x-2"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{r.raceName || `Race #${r.raceNumber}`}</p>
                      <p className="text-gray-400 text-xs truncate">{r.raceNumber ? `#${r.raceNumber}` : '—'}</p>
                    </div>
                    <p className="text-gray-500 text-xs truncate flex items-center gap-1.5">
                      <MapPin size={12} className="shrink-0" /> {r.racecourseName || '—'}
                    </p>
                    <div>
                      {r.pending > 0 ? (
                        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset bg-amber-50 text-amber-600 ring-amber-500/20">
                          {r.pending}
                        </span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </div>
                    <div>
                      {r.approved > 0 ? (
                        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset bg-emerald-50 text-emerald-600 ring-emerald-500/20">
                          {r.approved}
                        </span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </div>
                    <div>
                      {r.rejected > 0 ? (
                        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset bg-red-50 text-red-600 ring-red-500/20">
                          {r.rejected}
                        </span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </div>
                    <span className="text-gray-300 text-base text-center">›</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <KpiCard title="Total Reports" value={totalCount}  icon={<ShieldAlert size={20} />}   iconColor="text-gray-600"    bgIcon="bg-gray-100"    />
          <KpiCard title="Pending"       value={pending}     icon={<FileText size={20} />}       iconColor="text-blue-600"    bgIcon="bg-blue-50"     />
          <KpiCard title="Approved"      value={approved}    icon={<CheckCircle2 size={20} />}   iconColor="text-emerald-600" bgIcon="bg-emerald-50"  />
          <KpiCard title="Rejected"      value={rejected}    icon={<XCircle size={20} />}        iconColor="text-red-600"     bgIcon="bg-red-50"      />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <span className="material-symbols-outlined animate-spin text-3xl text-gray-300">progress_activity</span>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-sm font-semibold text-gray-400">No reports found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    {['Referee', 'Race & Horse', 'Incident', 'Penalty', 'Submitted', 'Status', 'Actions'].map(h => (
                      <th key={h} className="py-4 px-5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {items.map(row => (
                    <tr key={row.reportId} className="hover:bg-gray-50/40 transition-colors">

                      {/* Referee */}
                      <td className="py-5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-950 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {initials(row.refereeName)}
                          </div>
                          <span className="font-medium text-gray-700 text-xs break-all">{row.refereeName || '—'}</span>
                        </div>
                      </td>

                      {/* Race & Horse */}
                      <td className="py-5 px-5 whitespace-nowrap">
                        <div className="font-bold text-gray-900 text-xs">
                          {row.raceName || `Race #${row.raceNumber}`}
                        </div>
                        <div className="text-gray-400 text-[11px] mt-0.5">
                          {row.racecourseName || '—'}{row.raceNumber ? ` · #${row.raceNumber}` : ''}
                        </div>
                        <div className="text-gray-500 text-xs mt-0.5">{row.horseName || '—'}</div>
                      </td>

                      {/* Incident */}
                      <td className="py-5 px-5 max-w-xs">
                        <p className="text-xs text-gray-500 italic leading-relaxed line-clamp-2">
                          {row.incidentDescription || '—'}
                        </p>
                      </td>

                      {/* Penalty */}
                      <td className="py-5 px-5 whitespace-nowrap">
                        <PenaltyBadge penaltyType={row.penaltyType} fineAmount={row.fineAmount} />
                      </td>

                      {/* Submitted */}
                      <td className="py-5 px-5 text-xs text-gray-500 font-medium whitespace-nowrap">
                        {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                      </td>

                      {/* Status */}
                      <td className="py-5 px-5 whitespace-nowrap">
                        <StatusBadge status={row.status} />
                      </td>

                      {/* Actions */}
                      <td className="py-5 px-5 whitespace-nowrap text-right">
                        {row.status === 'Pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handle(row.reportId, rejectReport)}
                              disabled={acting === row.reportId}
                              className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handle(row.reportId, approveReport)}
                              disabled={acting === row.reportId}
                              className="px-3 py-1.5 bg-gray-950 text-white rounded-lg text-xs font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                              {acting === row.reportId ? '…' : 'Approve'}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300 font-medium">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <footer className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between text-xs font-medium text-gray-500">
            <div>
              Showing page <span className="text-gray-900 font-bold">{page}</span> of <span className="text-gray-900 font-bold">{totalPages}</span>
              <span className="ml-2 text-gray-400">({totalCount} total)</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:bg-white transition-colors disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-white transition-colors disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </footer>
        </div>
          </>
        )}

      </div>
    </DashboardLayout>
  )
}
