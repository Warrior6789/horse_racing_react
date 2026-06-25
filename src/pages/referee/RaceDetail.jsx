import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Flag, Settings, HelpCircle, Bell, History, User,
  ArrowLeft, AlertTriangle, ShieldAlert, Send, ChevronDown, X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getRace, getRaceRegistrations } from '../../api/races'
import { getReports, createReport, updateReport } from '../../api/refereeReports'
import { useRaceHub } from '../../hooks/useRaceHub'
import AccountProfile from '../../components/AccountProfile'

/* ── Live Track ── */
const LANE_H = 44, GATE_W = 28, TRACK_START = 4, TRACK_END = 92, FINISH_W = 12

function TrackVisualization({ tracks }) {
  const sorted = [...tracks].sort((a, b) => b.progress - a.progress)
  const totalH = tracks.length * LANE_H
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 select-none bg-[#0e2409]">
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

/* ── Edit Modal ── */
const PENALTY_OPTIONS = ['Disqualified', 'Relegated', 'Time Penalty', 'Warning', 'Fine', 'Other']

function EditModal({ report, onClose, onSaved }) {
  const [form, setForm] = useState({
    incidentDescription: report.incidentDescription || '',
    penaltyApplied: report.penaltyApplied || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const save = async () => {
    if (form.incidentDescription.length < 10) { setError('Description must be at least 10 characters.'); return }
    setSaving(true); setError('')
    try { await updateReport(report.reportId, form); onSaved() }
    catch (e) { setError(e.response?.data?.message || 'Failed to update.') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Edit Report — {report.horseName || '—'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Incident Description *</label>
          <textarea rows={4} className="w-full border border-gray-300 rounded-lg py-2.5 px-3 text-sm focus:outline-none resize-none"
            value={form.incidentDescription} onChange={e => setForm(f => ({ ...f, incidentDescription: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Penalty Applied</label>
          <select className="w-full border border-gray-300 rounded-lg py-2.5 px-3 text-sm focus:outline-none"
            value={form.penaltyApplied} onChange={e => setForm(f => ({ ...f, penaltyApplied: e.target.value }))}>
            <option value="">— None —</option>
            {PENALTY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 h-10 bg-gray-950 text-white rounded-xl text-sm font-bold hover:bg-gray-800 disabled:opacity-60">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ── */
export default function RefereeRaceDetail() {
  const { raceId } = useParams()
  const navigate   = useNavigate()
  const { user }   = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)

  const [race,    setRace]    = useState(null)
  const [regs,    setRegs]    = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast,   setToast]   = useState('')
  const [editReport, setEditReport] = useState(null)

  const [horses,     setHorses]     = useState([])
  const [liveStatus, setLiveStatus] = useState(null)

  const [form, setForm]       = useState({ registrationId: '', incidentDescription: '', penaltyApplied: '' })
  const [formError, setFormError]   = useState('')
  const [submitting, setSubmitting] = useState(false)

  const displayName = user?.fullName || user?.name || user?.email?.split('@')[0] || 'Referee'
  const initials    = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

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
    Promise.all([getRace(raceId), getRaceRegistrations(raceId)])
      .then(([raceRes, regsRes]) => {
        setRace(raceRes.data.data || raceRes.data)
        const payload = regsRes.data?.data
        setRegs(Array.isArray(payload) ? payload : payload?.items || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    loadReports()
  }, [raceId, loadReports])

  const handleRaceUpdate = useCallback((data) => {
    if (data.horses) setHorses(data.horses)
    if (data.status) setLiveStatus(data.status)
  }, [])
  useRaceHub(raceId, { onRaceUpdate: handleRaceUpdate })

  const raceStatus = liveStatus || race?.status || 'Scheduled'
  const isLive     = raceStatus === 'Live'

  const findLive = (reg) => horses.find(h =>
    h.id === reg.horse?.id || h.id === reg.horse?.horseId ||
    h.horseId === reg.horse?.id || h.registrationId === reg.registrationId
  )
  const tracks = regs.length > 0
    ? regs.map((reg, i) => ({ ...reg, progress: findLive(reg)?.progress ?? 0, isFinished: findLive(reg)?.isFinished ?? false, lane: i }))
    : horses.map((h, i) => ({ registrationId: h.id, gateNumber: i + 1, horse: { horseName: `Horse ${i + 1}` }, progress: h.progress ?? 0, isFinished: h.isFinished ?? false, lane: i }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.registrationId)                { setFormError('Please select a participant.'); return }
    if (form.incidentDescription.length < 10) { setFormError('Description must be at least 10 characters.'); return }
    setFormError(''); setSubmitting(true)
    try {
      await createReport({ raceId, registrationId: form.registrationId, incidentDescription: form.incidentDescription, penaltyApplied: form.penaltyApplied || undefined })
      setForm({ registrationId: '', incidentDescription: '', penaltyApplied: '' })
      showToast('Report submitted successfully')
      loadReports()
    } catch (e) { setFormError(e.response?.data?.message || 'Submission failed.') }
    finally { setSubmitting(false) }
  }

  const STATUS_BADGE = {
    Approved: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    Pending:  'bg-rose-50 text-rose-600 border-rose-200',
    Rejected: 'bg-slate-100 text-slate-500 border-slate-200',
  }

  const startStr = race?.startTime
    ? new Date(race.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—'

  return (
    <div className="flex h-screen w-full bg-[#f4f6fa] text-slate-800 font-sans overflow-hidden">

      {/* SIDEBAR */}
      <aside className="w-64 bg-[#1a1c2e] text-white flex flex-col justify-between p-4 shrink-0">
        <div>
          <div className="mb-6 px-2 py-1">
            <h1 className="font-bold text-lg tracking-tight">EquineOfficial</h1>
            <p className="text-[11px] text-slate-400 font-medium tracking-wide">Regulatory Division</p>
          </div>
          <nav className="space-y-1 mb-6">
            <button onClick={() => navigate('/referee/races')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-800 text-emerald-400 font-semibold text-xs uppercase tracking-wider transition-colors">
              <Flag size={16} /><span>Races</span>
            </button>
          </nav>
        </div>
        <div className="space-y-4">
          <div className="space-y-1 border-b border-slate-800 pb-4">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors">
              <Settings size={16} /><span>Settings</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors">
              <HelpCircle size={16} /><span>Support</span>
            </button>
          </div>
          <button onClick={() => setProfileOpen(true)}
            className="w-full bg-[#24273e] p-3 rounded-xl flex items-center gap-3 border border-slate-800/60 hover:border-slate-700 transition-colors text-left">
            <div className="w-9 h-9 bg-slate-600 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                : <span className="text-xs font-bold text-slate-200">{initials}</span>}
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-slate-200 truncate">{displayName}</h4>
              <p className="text-[10px] text-slate-400 truncate">{user?.email || ''}</p>
            </div>
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-3 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4 text-xs font-bold tracking-wide uppercase text-slate-400">
            <span className="text-slate-800">Race Detail</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-colors"><Bell size={16} /></button>
            <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-colors"><History size={16} /></button>
            <div className="h-4 w-px bg-slate-200 mx-1" />
            <button onClick={() => setProfileOpen(true)}
              className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors">
              <span>{displayName}</span><User size={14} className="text-slate-500" />
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Back */}
          <button onClick={() => navigate('/referee/races')}
            className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider hover:text-slate-800 transition-colors">
            <ArrowLeft size={12} className="stroke-[3]" /> Back to Races
          </button>

          {/* Race Hero Banner */}
          <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ background: isLive ? '#0e1a0c' : undefined, borderColor: isLive ? 'rgb(6 78 59 / 0.4)' : undefined }}>
            {isLive ? (
              /* Live: replace image with track viz */
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-mono font-bold text-slate-400 tracking-wider">RACE #{race?.raceNumber}</span>
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      {loading ? '—' : (race?.raceName || `Race #${race?.raceNumber}`)}
                    </h2>
                  </div>
                  <span className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold px-3 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
                  </span>
                </div>
                <div className="rounded-xl overflow-hidden border border-white/5">
                  <TrackVisualization tracks={tracks} />
                </div>
              </div>
            ) : (
              /* Non-live: show image banner */
              <div className="bg-slate-900 h-44 w-full relative">
                {race?.imageUrl
                  ? <img src={race.imageUrl} alt={race.raceName} className="w-full h-full object-cover opacity-55" />
                  : <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900" />}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-transparent" />
                <div className="absolute inset-0 p-6 flex flex-col justify-end space-y-2 text-white">
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-500 text-slate-950 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                      Official Track
                    </span>
                    <span className="bg-slate-800/80 border border-slate-700 text-slate-300 font-mono text-[9px] font-bold px-2 py-0.5 rounded">
                      RACE #{race?.raceNumber}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    {loading ? '—' : (race?.raceName || `Race #${race?.raceNumber}`)}
                  </h2>
                </div>
              </div>
            )}
            <div className="bg-white p-5 border-t border-slate-100 flex justify-between items-center flex-wrap gap-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Racecourse</span>
                  <span className="font-bold text-slate-800 text-sm">{race?.racecourseName || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Status</span>
                  <span className="font-bold text-slate-800 text-sm">{raceStatus}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Start Time</span>
                  <span className="font-bold text-slate-800 text-sm">{startStr}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Track Length</span>
                  <span className="font-bold text-slate-800 text-sm">{race?.trackLength ? `${race.trackLength}m` : '—'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Reports + Form */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

            {/* Reports Table */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800">
                  <AlertTriangle size={18} className="text-slate-700" />
                  <h3 className="font-bold text-base tracking-tight">Incident Reports</h3>
                </div>
                <span className="bg-slate-200/70 text-slate-600 font-mono font-bold text-[10px] px-2 py-0.5 rounded-full">
                  {reports.length} Total
                </span>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {reports.length === 0 ? (
                  <div className="text-center py-12 text-sm text-slate-400 font-semibold">No incident reports yet.</div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/70 border-b border-slate-100">
                        <th className="py-2.5 px-4 w-44">Horse</th>
                        <th className="py-2.5 px-4">Description</th>
                        <th className="py-2.5 px-4 w-32">Status</th>
                        <th className="py-2.5 px-4 w-28">Date</th>
                        <th className="py-2.5 px-4 w-16" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {reports.map(rep => (
                        <tr key={rep.reportId} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2.5">
                              <span className="bg-slate-100 border border-slate-200 text-slate-600 font-mono font-bold px-1.5 py-0.5 rounded text-[10px]">
                                G{rep.gateNumber ?? '?'}
                              </span>
                              <span className="font-bold text-slate-800 truncate">{rep.horseName || '—'}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-slate-500 font-medium max-w-[200px]">
                            <p className="truncate">{rep.incidentDescription || '—'}</p>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold inline-block text-center min-w-[76px] ${STATUS_BADGE[rep.status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                              {rep.status || '—'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-slate-500 font-mono font-medium">
                            {rep.createdAt ? new Date(rep.createdAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-4 px-4">
                            {rep.status === 'Pending' && (
                              <button onClick={() => setEditReport(rep)}
                                className="px-2.5 py-1 border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-50 transition-colors">
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

            {/* File New Report Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <div className="p-1.5 bg-slate-900 text-white rounded-lg">
                  <ShieldAlert size={16} />
                </div>
                <h3 className="font-bold text-sm text-slate-800">File New Report</h3>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Select Participating Horse
                </label>
                <div className="relative">
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 appearance-none focus:outline-none focus:border-slate-300"
                    value={form.registrationId}
                    onChange={e => setForm(f => ({ ...f, registrationId: e.target.value }))}
                  >
                    <option value="">Choose horse from race list...</option>
                    {regs.map(r => (
                      <option key={r.registrationId} value={r.registrationId}>
                        Gate {r.gateNumber} — {r.horse?.horseName || 'Unknown'}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Incident Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Detail the specific nature of the incident, including time, location on track, and parties involved..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-slate-300 resize-none leading-relaxed"
                  value={form.incidentDescription}
                  onChange={e => setForm(f => ({ ...f, incidentDescription: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Penalty Applied (Optional)
                </label>
                <div className="relative">
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 appearance-none focus:outline-none focus:border-slate-300"
                    value={form.penaltyApplied}
                    onChange={e => setForm(f => ({ ...f, penaltyApplied: e.target.value }))}
                  >
                    <option value="">— None —</option>
                    {PENALTY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {formError && <p className="text-[10px] text-rose-500 font-semibold">{formError}</p>}

              <div className="space-y-2 pt-2">
                <button type="submit" disabled={submitting}
                  className="w-full bg-black hover:bg-slate-900 text-white font-bold text-xs py-3 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 uppercase tracking-wider disabled:opacity-60">
                  <Send size={12} /> {submitting ? 'Submitting…' : 'Submit Official Report'}
                </button>
                <p className="text-[9px] text-slate-400 text-center italic leading-normal px-2">
                  By submitting, you certify that this report is an accurate and official record.
                </p>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      {editReport && (
        <EditModal
          report={editReport}
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

      {profileOpen && <AccountProfile variant="light" onClose={() => setProfileOpen(false)} />}
    </div>
  )
}
