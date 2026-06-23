import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { createReport, getReports } from '../../api/refereeReports'
import { getRacesPaged } from '../../api/races'
import { getRegistrations } from '../../api/registrations'

const NAV = [
  { to: '/referee/reports', icon: 'gavel', label: 'Submit Report' },
  { to: '/upgrade', icon: 'upgrade', label: 'Upgrade Role' },
]

export default function ReportSubmission() {
  const [form, setForm] = useState({ raceId: '', registrationId: '', incidentDescription: '', penaltyApplied: '' })
  const [races, setRaces] = useState([])
  const [registrations, setRegistrations] = useState([])
  const [myReports, setMyReports] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getRacesPaged({ page: 1, pageSize: 50, status: 'Completed' }).then(r => setRaces(r.data.data?.items || [])).catch(() => {})
    getReports({ page: 1, pageSize: 10 }).then(r => setMyReports(r.data.data?.items || [])).catch(() => {})
  }, [])

  const onRaceChange = async (raceId) => {
    setForm(f => ({ ...f, raceId, registrationId: '' }))
    if (!raceId) { setRegistrations([]); return }
    const r = await getRegistrations({ raceId }).catch(() => ({ data: { data: [] } }))
    setRegistrations(r.data.data || [])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.incidentDescription.length < 10) { setError('Incident description must be at least 10 characters.'); return }
    setError(''); setLoading(true)
    try {
      await createReport({ raceId: form.raceId, registrationId: form.registrationId, incidentDescription: form.incidentDescription, penaltyApplied: form.penaltyApplied || undefined })
      setForm({ raceId: '', registrationId: '', incidentDescription: '', penaltyApplied: '' })
      alert('Report submitted successfully!')
      getReports({ page: 1, pageSize: 10 }).then(r => setMyReports(r.data.data?.items || []))
    } catch (e) { setError(e.response?.data?.message || 'Submission failed.') }
    finally { setLoading(false) }
  }

  const inputCls = 'w-full p-md rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none text-body-md bg-surface-container-lowest'
  const STATUS_BADGE = { Pending: 'text-secondary bg-secondary-container', Approved: 'text-green-700 bg-green-100', Rejected: 'text-error bg-error-container' }

  return (
    <DashboardLayout navItems={NAV} title="Referee Reports">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl">
        {/* Submit form */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-xl">
          <h3 className="text-title-lg text-primary mb-lg">Submit New Report</h3>
          <form onSubmit={handleSubmit} className="space-y-md">
            <div className="space-y-xs"><label className="text-label-md text-secondary uppercase tracking-widest">Race *</label>
              <select className={inputCls} value={form.raceId} onChange={e => onRaceChange(e.target.value)} required>
                <option value="">Select race...</option>
                {races.map(r => <option key={r.raceId} value={r.raceId}>Race #{r.raceNumber} — {r.racecourseName}</option>)}
              </select></div>
            <div className="space-y-xs"><label className="text-label-md text-secondary uppercase tracking-widest">Registration / Horse *</label>
              <select className={inputCls} value={form.registrationId} onChange={e => setForm(f => ({ ...f, registrationId: e.target.value }))} required>
                <option value="">Select horse...</option>
                {registrations.map(r => <option key={r.registrationId} value={r.registrationId}>#{r.gateNumber} — {r.horse?.horseName}</option>)}
              </select></div>
            <div className="space-y-xs"><label className="text-label-md text-secondary uppercase tracking-widest">Incident Description * (min 10 chars)</label>
              <textarea rows={4} className={inputCls} placeholder="Describe the incident in detail..." value={form.incidentDescription} onChange={e => setForm(f => ({ ...f, incidentDescription: e.target.value }))} required /></div>
            <div className="space-y-xs"><label className="text-label-md text-secondary uppercase tracking-widest">Penalty Applied (optional)</label>
              <input type="text" className={inputCls} placeholder="e.g. Disqualified, Time penalty..." value={form.penaltyApplied} onChange={e => setForm(f => ({ ...f, penaltyApplied: e.target.value }))} /></div>
            {error && <p className="text-sm text-error">{error}</p>}
            <button type="submit" disabled={loading} className="w-full h-12 bg-primary text-on-primary rounded-lg font-title-lg hover:opacity-90 disabled:opacity-60">
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>
        </div>

        {/* My reports */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
          <div className="p-lg border-b border-outline-variant"><h3 className="text-title-lg text-primary">My Reports</h3></div>
          {myReports.length === 0
            ? <div className="p-xl text-center text-secondary">No reports submitted yet.</div>
            : <ul>{myReports.map(rep => (
              <li key={rep.reportId} className="p-lg border-b border-outline-variant last:border-0">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-body-md font-semibold text-primary">{rep.horse?.horseName || '—'}</p>
                    <p className="text-label-md text-secondary mt-xs line-clamp-2">{rep.incidentDescription}</p>
                  </div>
                  <span className={`text-label-md px-sm py-xs rounded-full shrink-0 ml-md ${STATUS_BADGE[rep.status] || 'text-secondary bg-surface-container'}`}>{rep.status}</span>
                </div>
              </li>
            ))}</ul>
          }
        </div>
      </div>
    </DashboardLayout>
  )
}
