import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import { createReport, getMyReports } from '../../api/refereeReports'
import { getRacesPaged } from '../../api/races'
import { getRaceRegistrations } from '../../api/races'

const PAGE_SIZE = 4

const STATUS_STYLE = {
  Pending:  'bg-orange-100 text-orange-700',
  Approved: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
}

function StatusBadge({ status }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}

export default function ReportSubmission() {
  const [form, setForm] = useState({ raceId: '', registrationId: '', incidentDescription: '', penaltyApplied: '', penaltyType: '', fineAmount: '' })
  const [races, setRaces]               = useState([])
  const [registrations, setRegistrations] = useState([])
  const [regsLoading, setRegsLoading]   = useState(false)
  const [submitting, setSubmitting]     = useState(false)
  const [error, setError]               = useState('')
  const [toast, setToast]               = useState('')

  const [reports, setReports]           = useState([])
  const [page, setPage]                 = useState(1)
  const [totalPages, setTotalPages]     = useState(1)
  const [totalCount, setTotalCount]     = useState(0)
  const [reportsLoading, setReportsLoading] = useState(true)

  const [pendingCount, setPendingCount] = useState(0)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    getRacesPaged({ page: 1, pageSize: 50, status: 'Completed' })
      .then(r => setRaces(r.data.data?.items || []))
      .catch(() => {})
    getRacesPaged({ page: 1, pageSize: 1, status: 'Scheduled' })
      .then(r => setPendingCount(r.data.data?.totalCount || 0))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setReportsLoading(true)
    getMyReports({ page, pageSize: PAGE_SIZE })
      .then(r => {
        const d = r.data.data
        setReports(d?.items || [])
        setTotalPages(d?.totalPages || 1)
        setTotalCount(d?.totalCount || 0)
      })
      .catch(() => {})
      .finally(() => setReportsLoading(false))
  }, [page])

  const onRaceChange = async (raceId) => {
    setForm(f => ({ ...f, raceId, registrationId: '' }))
    setRegistrations([])
    if (!raceId) return
    setRegsLoading(true)
    getRaceRegistrations(raceId)
      .then(r => {
        const payload = r.data?.data
        setRegistrations(Array.isArray(payload) ? payload : payload?.items || [])
      })
      .catch(() => {})
      .finally(() => setRegsLoading(false))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.raceId)               { setError('Please select a race.'); return }
    if (!form.registrationId)       { setError('Please select a horse.'); return }
    if (form.incidentDescription.length < 10) { setError('Incident description must be at least 10 characters.'); return }
    if (!form.penaltyType)          { setError('Please select a penalty type.'); return }
    if (form.penaltyType === 'Fine' && !form.fineAmount) { setError('Please enter a fine amount.'); return }
    setError(''); setSubmitting(true)
    try {
      await createReport({
        raceId: form.raceId,
        registrationId: form.registrationId,
        incidentDescription: form.incidentDescription,
        penaltyApplied: form.penaltyApplied || undefined,
        penaltyType: form.penaltyType,
        fineAmount: form.penaltyType === 'Fine' ? Number(form.fineAmount) : null,
      })
      setForm({ raceId: '', registrationId: '', incidentDescription: '', penaltyApplied: '', penaltyType: '', fineAmount: '' })
      setRegistrations([])
      showToast('Report submitted successfully')
      setPage(1)
      getMyReports({ page: 1, pageSize: PAGE_SIZE })
        .then(r => {
          const d = r.data.data
          setReports(d?.items || [])
          setTotalPages(d?.totalPages || 1)
          setTotalCount(d?.totalCount || 0)
        })
        .catch(() => {})
    } catch (e) {
      setError(e.response?.data?.message || 'Submission failed.')
    } finally { setSubmitting(false) }
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg py-2.5 px-4 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white'

  return (
    <DashboardLayout title="Referee Reports">
      <div className="space-y-8">

        {/* Heading */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Submit Report</h2>
          <p className="text-sm text-gray-500 mt-1">Submit your official report after each race.</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Scheduled Races</p>
              <p className="text-3xl font-bold text-orange-500 mt-2">{String(pendingCount).padStart(2, '0')}</p>
            </div>
            <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-orange-500">schedule</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Reports Submitted</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{String(totalCount).padStart(2, '0')}</p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-green-500">check_circle</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-6">

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Race *</label>
              <select className={inputCls} value={form.raceId} onChange={e => onRaceChange(e.target.value)} required>
                <option value="">Select a completed race...</option>
                {races.map(r => (
                  <option key={r.raceId} value={r.raceId}>
                    Race #{r.raceNumber}{r.raceName ? ` — ${r.raceName}` : ''} · {r.racecourseName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Horse *</label>
              <select
                className={inputCls}
                value={form.registrationId}
                onChange={e => setForm(f => ({ ...f, registrationId: e.target.value }))}
                disabled={!form.raceId || regsLoading}
                required
              >
                <option value="">{regsLoading ? 'Loading...' : 'Select a horse...'}</option>
                {registrations.map(r => (
                  <option key={r.registrationId} value={r.registrationId}>
                    #{r.gateNumber} — {r.horse?.horseName || 'Unknown'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Incident Description * <span className="text-gray-400 font-normal">(min 10 chars)</span></label>
              <textarea
                rows={4}
                className={inputCls + ' resize-none'}
                placeholder="Describe the incident in detail..."
                value={form.incidentDescription}
                onChange={e => setForm(f => ({ ...f, incidentDescription: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Penalty Type *</label>
              <select
                className={inputCls}
                value={form.penaltyType}
                onChange={e => setForm(f => ({ ...f, penaltyType: e.target.value, fineAmount: '' }))}
                required
              >
                <option value="">Select penalty type...</option>
                <option value="Warning">Warning — cảnh cáo, không ảnh hưởng kết quả</option>
                <option value="Fine">Fine — phạt tiền owner</option>
                <option value="Disqualification">Disqualification — loại ngựa khỏi kết quả</option>
              </select>
            </div>

            {form.penaltyType === 'Fine' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Fine Amount (VND) *</label>
                <input
                  type="number"
                  min="0"
                  className={inputCls}
                  placeholder="e.g. 500000"
                  value={form.fineAmount}
                  onChange={e => setForm(f => ({ ...f, fineAmount: e.target.value }))}
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Additional Notes <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                type="text"
                className={inputCls}
                placeholder="Any additional notes..."
                value={form.penaltyApplied}
                onChange={e => setForm(f => ({ ...f, penaltyApplied: e.target.value }))}
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="bg-gray-950 hover:bg-gray-800 text-white text-sm font-semibold py-2.5 px-6 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-60"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>send</span>
                {submitting ? 'Submitting…' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>

        {/* Previous Reports */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">My Previous Reports</h3>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {reportsLoading ? (
              <div className="flex items-center justify-center h-36">
                <span className="material-symbols-outlined animate-spin text-3xl text-gray-300">progress_activity</span>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-400 font-semibold">No reports submitted yet.</div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['Race', 'Horse', 'Submitted At', 'Status', 'Action'].map(h => (
                      <th key={h} className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reports.map(rep => (
                    <tr key={rep.reportId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6 font-medium text-gray-900">
                        {rep.raceName || `Race #${rep.raceNumber}` || '—'}
                      </td>
                      <td className="py-4 px-6 text-gray-600">
                        {rep.horse?.horseName || rep.horseName || '—'}
                      </td>
                      <td className="py-4 px-6 text-gray-500 whitespace-nowrap">
                        {rep.createdAt || rep.submittedAt
                          ? new Date(rep.createdAt || rep.submittedAt).toLocaleString()
                          : '—'}
                      </td>
                      <td className="py-4 px-6">
                        <StatusBadge status={rep.status} />
                      </td>
                      <td className="py-4 px-6">
                        <button
                          title="View"
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
                          onClick={() => alert(rep.incidentDescription || 'No details.')}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>visibility</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between text-xs font-medium text-gray-500">
                <p>Page <span className="text-gray-900 font-bold">{page}</span> of <span className="text-gray-900 font-bold">{totalPages}</span></p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                    <ChevronLeft size={14} />
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-950 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}
    </DashboardLayout>
  )
}
