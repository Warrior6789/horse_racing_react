import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, X, Radio } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import { getRace, getRaceRegistrations, getRaceResults } from '../../api/races'
import { getReports, createReport, updateReport } from '../../api/refereeReports'
import { useRaceHub } from '../../hooks/useRaceHub'

const LANE_H   = 44
const GATE_W   = 28
const TRACK_START = 4
const TRACK_END   = 92
const FINISH_W    = 12

function TrackVisualization({ tracks }) {
  const sorted = [...tracks].sort((a, b) => b.progress - a.progress)
  const totalH = tracks.length * LANE_H
  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 select-none bg-[#0e2409]">
      <div className="flex px-1 py-1 text-[9px] font-bold uppercase tracking-wider text-stone-500 bg-[#0a1c07]">
        <div style={{ width: GATE_W }} className="text-center shrink-0">#</div>
        <div className="flex-1 pl-2">Track</div>
      </div>
      <div className="relative" style={{ height: totalH }}>
        {tracks.map((_, i) => (
          <div key={i} className="absolute left-0 right-0" style={{
            top: i * LANE_H, height: LANE_H,
            background: i % 2 === 0 ? '#14310f' : '#112c0d',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }} />
        ))}
        <div className="absolute top-0 bottom-0 bg-black/30 border-r border-stone-700/40" style={{ width: GATE_W }}>
          {tracks.map((h, i) => (
            <div key={i} className="flex items-center justify-center text-[10px] font-black text-stone-400" style={{ height: LANE_H }}>
              {h.gateNumber ?? i + 1}
            </div>
          ))}
        </div>
        <div className="absolute top-0 bottom-0" style={{ left: GATE_W, right: 0 }}>
          <div className="absolute top-0 bottom-0 w-px bg-white/25" style={{ left: `${TRACK_START}%` }} />
          <div className="absolute top-0 bottom-0 overflow-hidden" style={{ left: `${TRACK_END}%`, width: FINISH_W }}>
            {Array.from({ length: tracks.length * 4 }).map((_, i) => (
              <div key={i} style={{ height: LANE_H / 4 }} className={i % 2 === 0 ? 'bg-white/80' : 'bg-black/70'} />
            ))}
          </div>
          {tracks.map((h) => {
            const rank = sorted.findIndex(s => s.registrationId === h.registrationId)
            const posX = TRACK_START + h.progress * (TRACK_END - TRACK_START)
            return (
              <div key={h.registrationId} className="absolute flex items-center gap-1 transition-all duration-150"
                style={{ top: h.lane * LANE_H + LANE_H / 2 - 11, left: `${posX}%` }}>
                <div className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[9px] font-black shadow
                  ${h.isFinished ? 'bg-stone-500 text-white'
                    : rank === 0 ? 'bg-[#f7e0a3] text-black'
                    : rank === 1 ? 'bg-stone-300 text-black'
                    : rank === 2 ? 'bg-amber-700 text-white'
                    : 'bg-stone-700 text-stone-300'}`}>
                  {rank + 1}
                </div>
                <span className="text-[8px] font-bold text-white bg-black/70 px-1 py-0.5 rounded whitespace-nowrap hidden sm:block">
                  {h.horse?.horseName || `#${h.gateNumber}`}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const TABS = ['Race Participants', 'Incident Reports']

const PENALTY_OPTIONS = ['Disqualified', 'Relegated', 'Time Penalty', 'Warning', 'Fine', 'Other']

const STATUS_STYLE = {
  Approved: 'text-emerald-600',
  Pending:  'text-amber-600',
  Rejected: 'text-red-500',
}
const PENALTY_STYLE = {
  Disqualified: 'bg-red-100 text-red-700',
  Relegated:    'bg-red-100 text-red-700',
  Warning:      'bg-amber-100 text-amber-700',
  Fine:         'bg-orange-100 text-orange-700',
}

function EditModal({ report, regs, onClose, onSaved }) {
  const [form, setForm] = useState({
    incidentDescription: report.incidentDescription || '',
    penaltyApplied: report.penaltyApplied || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const save = async () => {
    if (form.incidentDescription.length < 10) { setError('Description must be at least 10 characters.'); return }
    setSaving(true); setError('')
    try {
      await updateReport(report.reportId, form)
      onSaved()
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update report.')
    } finally { setSaving(false) }
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg py-2.5 px-3 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Edit Report — {report.horseName || '—'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Incident Description *</label>
          <textarea rows={4} className={inputCls + ' resize-none'}
            value={form.incidentDescription}
            onChange={e => setForm(f => ({ ...f, incidentDescription: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Penalty Applied</label>
          <select className={inputCls} value={form.penaltyApplied}
            onChange={e => setForm(f => ({ ...f, penaltyApplied: e.target.value }))}>
            <option value="">— None —</option>
            {PENALTY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 h-10 bg-gray-950 text-white rounded-xl text-sm font-bold hover:bg-gray-800 disabled:opacity-60">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RefereeRaceDetail() {
  const { raceId } = useParams()
  const navigate   = useNavigate()

  const [tab, setTab]         = useState('Race Participants')
  const [race, setRace]       = useState(null)
  const [regs, setRegs]       = useState([])
  const [results, setResults] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast]     = useState('')
  const [editReport, setEditReport] = useState(null)

  const [horses,     setHorses]     = useState([])
  const [liveStatus, setLiveStatus] = useState(null)

  const [form, setForm] = useState({
    registrationId: '', incidentDescription: '', penaltyApplied: '',
  })
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleRaceUpdate = useCallback((data) => {
    if (data.horses) setHorses(data.horses)
    if (data.status) setLiveStatus(data.status)
  }, [])

  useRaceHub(raceId, { onRaceUpdate: handleRaceUpdate })

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const loadReports = useCallback(() => {
    getReports({ raceId, page: 1, pageSize: 50 })
      .then(r => {
        const payload = r.data?.data
        setReports(Array.isArray(payload) ? payload : payload?.items || [])
      })
      .catch(() => {})
  }, [raceId])

  useEffect(() => {
    Promise.all([
      getRace(raceId),
      getRaceRegistrations(raceId),
    ]).then(([raceRes, regsRes]) => {
      setRace(raceRes.data.data || raceRes.data)
      const payload = regsRes.data?.data
      setRegs(Array.isArray(payload) ? payload : payload?.items || [])
    }).catch(() => {})
    .finally(() => setLoading(false))
    loadReports()
  }, [raceId, loadReports])

  useEffect(() => {
    if (tab === 'Race Participants' && results.length === 0) {
      getRaceResults(raceId).then(r => setResults(r.data.data || [])).catch(() => {})
    }
  }, [tab, raceId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.registrationId)               { setFormError('Please select a participant.'); return }
    if (form.incidentDescription.length < 10) { setFormError('Description must be at least 10 characters.'); return }
    setFormError(''); setSubmitting(true)
    try {
      await createReport({ raceId, registrationId: form.registrationId, incidentDescription: form.incidentDescription, penaltyApplied: form.penaltyApplied || undefined })
      setForm({ registrationId: '', incidentDescription: '', penaltyApplied: '' })
      showToast('Report submitted successfully')
      loadReports()
    } catch (e) {
      setFormError(e.response?.data?.message || 'Submission failed.')
    } finally { setSubmitting(false) }
  }

  const raceStatus  = liveStatus || race?.status || 'Scheduled'
  const statusLabel = { BettingOpen: 'Betting Open', BettingClosed: 'Betting Closed', Live: 'In Progress', Completed: 'Completed', Finished: 'Finished' }[raceStatus] || raceStatus
  const isLive = raceStatus === 'Live'

  const findLive = (reg) => horses.find(h =>
    h.id === reg.horse?.id || h.id === reg.horse?.horseId ||
    h.horseId === reg.horse?.id || h.registrationId === reg.registrationId
  )
  const tracks = regs.length > 0
    ? regs.map((reg, i) => ({ ...reg, progress: findLive(reg)?.progress ?? 0, isFinished: findLive(reg)?.isFinished ?? false, lane: i }))
    : horses.map((h, i) => ({ registrationId: h.id, gateNumber: i + 1, horse: { horseName: `Horse ${i + 1}` }, progress: h.progress ?? 0, isFinished: h.isFinished ?? false, lane: i }))

  if (loading) return (
    <DashboardLayout title="Race Detail">
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined animate-spin text-3xl text-gray-300">progress_activity</span>
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout title="Race Detail">
      <div className="space-y-6">

        {/* Breadcrumb */}
        <button onClick={() => navigate('/referee/races')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ChevronLeft size={14} /> Races
        </button>

        {/* Race Details Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-10">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Race</p>
              <p className="text-lg font-bold text-gray-900">#{race?.raceNumber}{race?.raceName ? ` — ${race.raceName}` : ''}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Distance</p>
              <p className="text-lg font-bold text-gray-900">{race?.trackLength ? `${race.trackLength}m` : '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Start Time</p>
              <p className="font-semibold text-gray-900">{race?.startTime ? new Date(race.startTime).toLocaleString() : '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Racecourse</p>
              <p className="font-semibold text-gray-900">{race?.racecourseName || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Status</p>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold
                ${['Live', 'BettingOpen'].includes(raceStatus) ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                {['Live', 'BettingOpen'].includes(raceStatus) && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                {statusLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Live track visualization */}
        {isLive && tracks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Radio size={14} className="text-red-500 animate-pulse" />
              <h3 className="text-sm font-bold text-gray-900">Live Race Feed</h3>
            </div>
            <TrackVisualization tracks={tracks} />
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 flex gap-8">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                tab === t ? 'text-gray-900 border-gray-900' : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}>
              {t}
            </button>
          ))}
        </div>

        {/* Tab: Race Participants */}
        {tab === 'Race Participants' && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {regs.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-400 font-semibold">No participants registered.</div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    {['Gate #', 'Horse', 'Jockey', 'Status'].map(h => <th key={h} className="py-3 px-6">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {regs.map(reg => (
                    <tr key={reg.registrationId} className="hover:bg-gray-50/50">
                      <td className="py-4 px-6 text-gray-600">{reg.gateNumber ?? '—'}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded bg-gray-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {reg.horse?.horseName?.[0]?.toUpperCase() || '?'}
                          </div>
                          <span className="font-semibold text-gray-900">{reg.horse?.horseName || '—'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-gray-600">{reg.jockeyName || reg.jockey?.fullName || '—'}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
                          ${reg.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                          {reg.status || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab: Incident Reports */}
        {tab === 'Incident Reports' && (
          <div className="space-y-6">

            {/* Reports table */}
            <div>
              <h3 className="text-base font-bold text-gray-900 mb-3">Incident Reports Log</h3>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                {reports.length === 0 ? (
                  <div className="text-center py-10 text-sm text-gray-400 font-semibold">No incident reports yet.</div>
                ) : (
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        {['Horse', 'Incident Summary', 'Penalty', 'Status', 'Created At', ''].map(h => (
                          <th key={h} className="py-3 px-5">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {reports.map(rep => (
                        <tr key={rep.reportId} className="hover:bg-gray-50/50">
                          <td className="py-4 px-5 font-semibold text-gray-900">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                                G{rep.gateNumber ?? '?'}
                              </span>
                              {rep.horseName || '—'}
                            </div>
                          </td>
                          <td className="py-4 px-5 text-gray-600 max-w-[200px]">
                            <p className="line-clamp-1">{rep.incidentDescription || '—'}</p>
                          </td>
                          <td className="py-4 px-5">
                            {rep.penaltyApplied
                              ? <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${PENALTY_STYLE[rep.penaltyApplied] || 'bg-gray-100 text-gray-600'}`}>{rep.penaltyApplied}</span>
                              : <span className="text-gray-400">—</span>}
                          </td>
                          <td className={`py-4 px-5 text-sm font-semibold ${STATUS_STYLE[rep.status] || 'text-gray-500'}`}>
                            {rep.status || '—'}
                          </td>
                          <td className="py-4 px-5 text-xs text-gray-500 whitespace-nowrap">
                            {rep.createdAt ? new Date(rep.createdAt).toLocaleString() : '—'}
                          </td>
                          <td className="py-4 px-5">
                            {rep.status === 'Pending' && (
                              <button onClick={() => setEditReport(rep)}
                                className="px-2.5 py-1 border border-gray-200 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors">
                                Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Submit form + Protocols */}
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">

              {/* Form */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-5">
                  <span className="material-symbols-outlined text-gray-800">warning</span>
                  <h3 className="text-base font-bold text-gray-900">Submit Incident Report</h3>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Select Participant *</label>
                      <select
                        className="w-full border border-gray-300 rounded-lg py-2.5 px-3 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white"
                        value={form.registrationId}
                        onChange={e => setForm(f => ({ ...f, registrationId: e.target.value }))}
                        required
                      >
                        <option value="">Select horse...</option>
                        {regs.map(r => (
                          <option key={r.registrationId} value={r.registrationId}>
                            Gate {r.gateNumber} — {r.horse?.horseName || 'Unknown'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Penalty Applied</label>
                      <select
                        className="w-full border border-gray-300 rounded-lg py-2.5 px-3 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white"
                        value={form.penaltyApplied}
                        onChange={e => setForm(f => ({ ...f, penaltyApplied: e.target.value }))}
                      >
                        <option value="">— None —</option>
                        {PENALTY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Incident Description * <span className="text-gray-400 font-normal">(min 10 chars)</span>
                    </label>
                    <textarea
                      rows={4}
                      className={`w-full border rounded-lg py-2.5 px-3 text-sm text-gray-700 focus:outline-none focus:ring-1 resize-none
                        ${formError && form.incidentDescription.length < 10
                          ? 'border-red-400 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-gray-900'}`}
                      placeholder="Describe the incident in detail..."
                      value={form.incidentDescription}
                      onChange={e => setForm(f => ({ ...f, incidentDescription: e.target.value }))}
                    />
                    {formError && form.incidentDescription.length < 10 && (
                      <p className="text-xs text-red-500 mt-1">{formError}</p>
                    )}
                  </div>
                  {formError && form.incidentDescription.length >= 10 && (
                    <p className="text-xs text-red-500">{formError}</p>
                  )}
                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setForm({ registrationId: '', incidentDescription: '', penaltyApplied: '' })}
                      className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
                      Clear
                    </button>
                    <button type="submit" disabled={submitting}
                      className="px-5 py-2.5 bg-gray-950 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-60">
                      {submitting ? 'Submitting…' : 'Submit Report'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Protocols sidebar */}
              <div className="bg-[#1A1F2B] rounded-xl p-6 text-white shadow-sm flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-emerald-300 rounded-lg flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-gray-900" style={{ fontSize: '20px' }}>shield</span>
                  </div>
                  <h3 className="text-base font-bold">Referee Protocols</h3>
                </div>
                <p className="text-sm text-gray-300 mb-5 leading-relaxed">
                  All incident reports must be filed within 15 minutes of race completion. Ensure the description clearly states the timestamp and impacted participants.
                </p>
                <ul className="space-y-3 text-sm text-gray-300 flex-1">
                  {[
                    'Verify photo finish data before issuing disqualifications.',
                    'Stewards must provide a secondary signature for relegations.',
                    'All penalties are subject to track appeal within 24 hours.',
                  ].map(rule => (
                    <li key={rule} className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-emerald-300 shrink-0" style={{ fontSize: '16px' }}>check_circle</span>
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Edit Modal */}
      {editReport && (
        <EditModal
          report={editReport}
          regs={regs}
          onClose={() => setEditReport(null)}
          onSaved={() => { setEditReport(null); showToast('Report updated'); loadReports() }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-950 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}
    </DashboardLayout>
  )
}
