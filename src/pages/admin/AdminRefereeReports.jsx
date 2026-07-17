import { useEffect, useState, useCallback } from 'react'
import { ShieldAlert, FileText, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from 'lucide-react'
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

  const load = useCallback((p = page) => {
    setLoading(true)
    getReports({ page: p, pageSize: 4 })
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
  }, [page])

  useEffect(() => { load(page) }, [page])

  useRaceHub(null, { onReportUpdated: () => load(page) })

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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Referee Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Review and approve incident reports submitted by referees.</p>
        </div>

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
                        <div className="font-bold text-gray-900 text-xs">Race #{row.raceNumber}</div>
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

      </div>
    </DashboardLayout>
  )
}
