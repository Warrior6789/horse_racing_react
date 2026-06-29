import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import CardCarousel from '../../components/CardCarousel'
import { getRacesPaged, createRace, updateRace, uploadRaceImage, deleteRace, advanceRace, resetRace, overrideResult, getRaceRegistrations, collectPool } from '../../api/races'
import { getRacecoursesPaged } from '../../api/racecourses'
import { useRaceHub } from '../../hooks/useRaceHub'

const blank = { raceName: '', racecourseId: '', raceNumber: '', startTime: '', trackLength: '', maxParticipants: '' }

const RACE_STATUS = {
  Scheduled:     { cls: 'bg-amber-50 text-amber-700 ring-amber-500/20',       dot: false, label: 'Scheduled'      },
  BettingOpen:   { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-500/20', dot: true,  label: 'Betting Open'   },
  BettingClosed: { cls: 'bg-orange-50 text-orange-700 ring-orange-500/20',    dot: false, label: 'Betting Closed' },
  Live:          { cls: 'bg-red-50 text-red-600 ring-red-500/20',             dot: true,  label: 'Live'           },
  Completed:     { cls: 'bg-gray-100 text-gray-500 ring-gray-400/20',         dot: false, label: 'Completed'      },
  Finished:      { cls: 'bg-gray-100 text-gray-500 ring-gray-400/20',         dot: false, label: 'Finished'       },
  Cancelled:     { cls: 'bg-red-50 text-red-400 ring-red-300/20',             dot: false, label: 'Cancelled'      },
}

function StatusBadge({ status }) {
  const s = RACE_STATUS[status] || RACE_STATUS.Scheduled
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${s.cls}`}>
      {s.dot && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse" />}
      {s.label}
    </span>
  )
}

function SetResultModal({ race, onClose, onSuccess }) {
  const [regs, setRegs]       = useState([])
  const [ranks, setRanks]     = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    getRaceRegistrations(race.raceId)
      .then(r => {
        const payload = r.data?.data
        const list = Array.isArray(payload) ? payload : payload?.items || []
        setRegs(list)
        const init = {}
        list.forEach((reg, i) => { init[reg.registrationId] = String(i + 1) })
        setRanks(init)
      })
      .catch(() => setError('Failed to load registrations.'))
      .finally(() => setLoading(false))
  }, [race.raceId])

  const setRank = (regId, val) => setRanks(prev => ({ ...prev, [regId]: val }))

  const confirm = async () => {
    const values = Object.values(ranks)
    const unique = new Set(values)
    if (unique.size !== values.length) { setError('Two horses cannot share the same rank.'); return }

    const body = regs.map(reg => ({
      horseId: reg.horse?.horseId || reg.horse?.id || reg.horseId,
      rank: Number(ranks[reg.registrationId]),
    }))

    setSaving(true); setError('')
    try {
      await overrideResult(race.raceId, body)
      onSuccess()
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to set result.')
    } finally { setSaving(false) }
  }

  const n = regs.length

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4 my-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Set Result — Race #{race.raceNumber}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <span className="material-symbols-outlined animate-spin text-3xl text-gray-300">progress_activity</span>
          </div>
        ) : regs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No registered horses found.</p>
        ) : (
          <div className="space-y-2">
            {regs.map(reg => (
              <div key={reg.registrationId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-9 h-9 rounded-lg bg-gray-200 overflow-hidden shrink-0 flex items-center justify-center text-lg">
                  {reg.horse?.imageUrl
                    ? <img src={reg.horse.imageUrl} alt="" className="w-full h-full object-cover" />
                    : '🐎'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{reg.horse?.horseName || `Horse #${reg.gateNumber}`}</p>
                  <p className="text-[11px] text-gray-400">Gate #{reg.gateNumber ?? '?'}</p>
                </div>
                <select
                  value={ranks[reg.registrationId] || '1'}
                  onChange={e => setRank(reg.registrationId, e.target.value)}
                  className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 focus:outline-none focus:border-gray-400 bg-white"
                >
                  {Array.from({ length: n }, (_, i) => i + 1).map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 h-11 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={saving || regs.length === 0}
            className="flex-1 h-11 bg-gray-950 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CollectPoolModal({ race, onClose, onSuccess }) {
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const confirm = async () => {
    const val = Number(amount)
    if (!amount || isNaN(val) || val <= 0) { setError('Please enter a valid amount.'); return }
    setSaving(true); setError('')
    try {
      await collectPool(race.raceId, { amountPerSpectator: val, betType: 1 })
      onSuccess()
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to collect pool.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Collect Pool — Race #{race.raceNumber}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
          </button>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Amount Per Spectator (VND)</label>
          <input
            type="number"
            min="0"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="e.g. 50000"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 outline-none text-sm bg-white"
          />
          <p className="text-[11px] text-gray-400 mt-1">Bet type: Win (fixed)</p>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 h-11 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={saving}
            className="flex-1 h-11 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-500 transition-colors disabled:opacity-60"
          >
            {saving ? 'Collecting…' : 'Collect'}
          </button>
        </div>
      </div>
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
      <div className={`p-3 ${bgIcon} ${iconColor} rounded-xl`}>
        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{icon}</span>
      </div>
    </div>
  )
}

export default function RaceManagement() {
  const [cards, setCards]           = useState([])
  const [cLoading, setCLoading]     = useState(true)
  const [races, setRaces]           = useState([])
  const [tab, setTab]               = useState('active')
  const [page, setPage]             = useState(1)
  const [pageSize, setPageSize]     = useState(4)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading]       = useState(true)
  const [acting, setActing]         = useState(null)

  const [racecourses, setRacecourses]   = useState([])
  const [modal, setModal]               = useState(false)
  const [form, setForm]                 = useState(blank)
  const [editId, setEditId]             = useState(null)
  const [error, setError]               = useState('')
  const [saving, setSaving]             = useState(false)
  const [deleting, setDeleting]         = useState(null)
  const [imageFile, setImageFile]       = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [origStartTime, setOrigStartTime] = useState('')
  const [resultRace, setResultRace]     = useState(null)
  const [collectRace, setCollectRace]   = useState(null)
  const [toast, setToast]               = useState('')

  const loadCards = ({ silent = false } = {}) => {
    if (!silent) setCLoading(true)
    getRacesPaged({ page: 1, pageSize: 50 })
      .then(r => setCards(r.data.data?.items || []))
      .catch(() => {})
      .finally(() => { if (!silent) setCLoading(false) })
  }

  const load = (p = page, ps = pageSize, { silent = false, t = tab } = {}) => {
    if (!silent) setLoading(true)
    if (t === 'active') {
      getRacesPaged({ page: 1, pageSize: 500 })
        .then(r => {
          const all = r.data.data?.items || []
          const active = all.filter(x => !['Finished', 'Cancelled'].includes(x.status))
          const start = (p - 1) * ps
          setRaces(active.slice(start, start + ps))
          setTotalPages(Math.ceil(active.length / ps) || 1)
          setTotalCount(r.data.data?.totalCount || 0)
        })
        .catch(() => {})
        .finally(() => { if (!silent) setLoading(false) })
    } else {
      getRacesPaged({ page: 1, pageSize: 500 })
        .then(r => {
          const all = r.data.data?.items || []
          const done = all.filter(x => ['Finished', 'Cancelled'].includes(x.status))
          const start = (p - 1) * ps
          setRaces(done.slice(start, start + ps))
          setTotalPages(Math.ceil(done.length / ps) || 1)
          setTotalCount(r.data.data?.totalCount || 0)
        })
        .catch(() => {})
        .finally(() => { if (!silent) setLoading(false) })
    }
  }

  useEffect(() => {
    getRacecoursesPaged({ page: 1, pageSize: 100 })
      .then(r => setRacecourses(r.data.data?.items || []))
      .catch(() => {})
    loadCards()
  }, [])

  useEffect(() => { load(page, pageSize, { t: tab }) }, [page, pageSize, tab])

  const handleRacesUpdated = useCallback(() => {
    loadCards({ silent: true })
    load(page, pageSize, { silent: true })
  }, [page, pageSize])

  useRaceHub(null, { onRacesUpdated: handleRacesUpdated })

  const openCreate = () => {
    setForm(blank); setEditId(null); setError('')
    setImageFile(null); setImagePreview(null); setModal(true)
  }
  const validGuid = (id) => (id && id !== '00000000-0000-0000-0000-000000000000') ? id.toLowerCase() : null

  const openEdit = (r) => {
    const st = r.startTime?.slice(0, 16) || ''
    setOrigStartTime(st)
    const resolvedRacecourseId =
      validGuid(r.racecourseId) ||
      validGuid(r.racecourse?.racecourseId) ||
      validGuid(r.racecourse?.RacecourseId) ||
      racecourses.find(rc => rc.racecourseName === (r.racecourseName || r.racecourse?.racecourseName))?.racecourseId?.toLowerCase() ||
      ''
    setForm({
      raceName:        r.raceName        || '',
      racecourseId:    resolvedRacecourseId,
      raceNumber:      r.raceNumber      || '',
      startTime:       st,
      trackLength:     r.trackLength     || '',
      maxParticipants: r.maxParticipants || '',
    })
    setImageFile(null); setImagePreview(r.imageUrl || null)
    setEditId(r.raceId); setError(''); setModal(true)
  }


  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const extractError = (e) => {
    const data = e.response?.data
    if (!data) return `Network error (${e.message || 'unknown'})`
    if (typeof data === 'string') return data || 'Save failed.'
    if (data.errors) return Object.values(data.errors).flat().join(' ')
    return data.message || data.title || data.detail || 'Save failed.'
  }

  const save = async () => {
    if (!form.raceName)      { setError('Race name is required.'); return }
    if (!form.racecourseId) { setError('Please select a racecourse.'); return }
    if (!form.raceNumber)   { setError('Race number is required.'); return }
    if (!form.startTime)    { setError('Start time is required.'); return }
    setError(''); setSaving(true)
    try {
      if (editId) {
        const toISO = (s) => s.length === 16 ? s + ':00' : s
        const startTimeChanged = form.startTime && form.startTime !== origStartTime
        if (startTimeChanged) {
          const minAllowed = Date.now() + 90 * 60 * 1000
          if (new Date(form.startTime).getTime() < minAllowed) {
            setError('Start time must be at least 90 minutes from now.')
            setSaving(false)
            return
          }
        }
        const data = {
          ...(form.raceName                && { raceName:        form.raceName }),
          ...(validGuid(form.racecourseId) && { racecourseId:    form.racecourseId }),
          ...(form.raceNumber              && { raceNumber:      Number(form.raceNumber) }),
          ...(startTimeChanged             && { startTime:       toISO(form.startTime) }),
          ...(form.trackLength             && { trackLength:     Number(form.trackLength) }),
          ...(form.maxParticipants         && { maxParticipants: Number(form.maxParticipants) }),
        }
        await updateRace(editId, data)
        if (imageFile) await uploadRaceImage(editId, imageFile)

      } else {
        const fd = new FormData()
        if (form.raceName) fd.append('RaceName', form.raceName)
        fd.append('RacecourseId', form.racecourseId)
        fd.append('RaceNumber', form.raceNumber)
        fd.append('StartTime', form.startTime.length === 16 ? form.startTime + ':00' : form.startTime)
        if (form.trackLength)     fd.append('TrackLength', form.trackLength)
        if (form.maxParticipants) fd.append('MaxParticipants', form.maxParticipants)
        if (imageFile) fd.append('Image', imageFile)
        await createRace(fd)
      }
      setModal(false); loadCards(); load(page, pageSize)
    } catch (e) { setError(extractError(e)) }
    finally { setSaving(false) }
  }

  const handleAction = async (id, fn) => {
    setActing(id)
    try {
      const res = await fn(id)
      const updated = res?.data?.data ?? res?.data
      if (updated?.status) {
        const patch = r => r.raceId === id ? { ...r, status: updated.status } : r
        setCards(prev => prev.map(patch))
        setRaces(prev => prev.map(patch))
      }
    } catch {}
    setActing(null)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this race?')) return
    setDeleting(id)
    try { await deleteRace(id); loadCards(); load(page, pageSize) } catch {}
    setDeleting(null)
  }

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 outline-none text-sm bg-white'
  const f = (k) => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })

  const live      = races.filter(r => r.status === 'Live').length
  const scheduled = races.filter(r => r.status === 'Scheduled').length
  const completed = races.filter(r => r.status === 'Completed').length

  return (
    <DashboardLayout title="Race Management">
      <div className="space-y-8">

        {/* Heading */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Race Management</h1>
            <p className="text-sm text-gray-500 mt-1">Create and manage race events.</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-950 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
            Create Race
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <KpiCard title="Total"     value={totalCount} icon="sports"          iconColor="text-gray-600"    bgIcon="bg-gray-100"    />
          <KpiCard title="Live"      value={live}       icon="sensors"         iconColor="text-emerald-600" bgIcon="bg-emerald-50"  />
          <KpiCard title="Scheduled" value={scheduled}  icon="schedule"        iconColor="text-amber-600"   bgIcon="bg-amber-50"    />
          <KpiCard title="Completed" value={completed}  icon="flag"            iconColor="text-blue-600"    bgIcon="bg-blue-50"     />
        </div>

        {/* Cards */}
        {cLoading ? (
          <div className="flex items-center justify-center h-36">
            <span className="material-symbols-outlined animate-spin text-3xl text-gray-300">progress_activity</span>
          </div>
        ) : cards.length === 0 ? null : (
          <CardCarousel count={cards.length} dark={false}>
            {cards.map(r => {
              const s = RACE_STATUS[r.status] || RACE_STATUS.Scheduled
              return (
                <div key={r.raceId} className="snap-start shrink-0 w-[calc(33.333%-11px)] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="w-full aspect-[4/3] overflow-hidden shrink-0">
                  {r.imageUrl ? (
                    <img src={r.imageUrl} alt={`Race #${r.raceNumber}`} className="w-full h-full object-cover block" />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <span className="material-symbols-outlined text-gray-300" style={{ fontSize: '40px' }}>sports</span>
                    </div>
                  )}
                  </div>
                  <div className="p-5 flex flex-col gap-3 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-950 text-white flex items-center justify-center shrink-0 font-bold text-sm">
                        #{r.raceNumber}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-sm">{r.raceName || '—'}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">{r.racecourseName || '—'}</div>
                      </div>
                    </div>
                    <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset ${s.cls}`}>
                      {s.dot && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse" />}
                      {s.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-gray-300" style={{ fontSize: '14px' }}>schedule</span>
                      {r.startTime ? r.startTime.slice(0, 16).replace('T', ' ') + ' ' + (parseInt(r.startTime.slice(11, 13)) < 12 ? 'AM' : 'PM') : '—'}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1 border-t border-gray-100">
                    <button
                      onClick={() => openEdit(r)}
                      className="flex-1 py-1.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Edit
                    </button>
                    {r.status !== 'Completed' && r.status !== 'Cancelled' && r.status !== 'Live' && (
                      <button
                        onClick={() => handleAction(r.raceId, advanceRace)}
                        disabled={acting === r.raceId}
                        className="flex-1 py-1.5 bg-gray-950 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
                      >
                        Advance
                      </button>
                    )}
                    {r.status === 'BettingClosed' && (
                      <button
                        onClick={() => setCollectRace(r)}
                        className="flex-1 py-1.5 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-500 transition-colors"
                      >
                        Collect Pool
                      </button>
                    )}
                    {(r.status === 'BettingClosed' || r.status === 'Live') && (
                      <button
                        onClick={() => setResultRace(r)}
                        className="flex-1 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 transition-colors"
                      >
                        Set Result
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(r.raceId)}
                      disabled={deleting === r.raceId}
                      className="w-8 h-8 flex items-center justify-center border border-red-100 text-red-500 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>delete</span>
                    </button>
                  </div>
                  </div>
                </div>
              )
            })}
          </CardCarousel>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {[{ key: 'active', label: 'Active' }, { key: 'finished', label: 'Finished / Cancelled' }].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setPage(1) }}
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
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-gray-950 rounded-full" />
              <h2 className="text-sm font-bold text-gray-900">All Races</h2>
              <span className="text-xs text-gray-400 font-medium">({totalCount} total)</span>
            </div>
          </div>

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
                    {['Race', 'Racecourse', 'Start Time', 'Max', 'Status', 'Actions'].map(h => (
                      <th key={h} className="py-4 px-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {races.map(r => (
                    <tr key={r.raceId} className="hover:bg-gray-50/40 transition-colors">

                      <td className="py-4 px-4">
                        <span className="font-bold text-gray-900">#{r.raceNumber}</span>
                        {r.raceName && <p className="text-[11px] text-gray-400 mt-0.5 max-w-[140px] truncate">{r.raceName}</p>}
                      </td>

                      <td className="py-4 px-4 text-xs text-gray-600 font-medium">
                        {r.racecourseName || '—'}
                      </td>

                      <td className="py-4 px-4 text-xs text-gray-500 whitespace-nowrap">
                        {r.startTime ? r.startTime.slice(0, 16).replace('T', ' ') + ' ' + (parseInt(r.startTime.slice(11, 13)) < 12 ? 'AM' : 'PM') : '—'}
                      </td>

                      <td className="py-4 px-4 text-xs text-gray-500 font-medium text-center">
                        {r.maxParticipants || '—'}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <StatusBadge status={r.status} />
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEdit(r)}
                            className="px-2.5 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors"
                          >
                            Edit
                          </button>
                          {r.status !== 'Completed' && r.status !== 'Cancelled' && r.status !== 'Live' && (
                            <button
                              onClick={() => handleAction(r.raceId, advanceRace)}
                              disabled={acting === r.raceId}
                              className="px-2.5 py-1.5 bg-gray-950 text-white rounded-lg text-xs font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                              {acting === r.raceId ? '…' : 'Advance'}
                            </button>
                          )}
                          {r.status === 'BettingClosed' && (
                            <button
                              onClick={() => setCollectRace(r)}
                              className="px-2.5 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-500 transition-colors"
                            >
                              Collect Pool
                            </button>
                          )}
                          {(r.status === 'BettingClosed' || r.status === 'Live') && (
                            <button
                              onClick={() => setResultRace(r)}
                              className="px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-500 transition-colors"
                            >
                              Set Result
                            </button>
                          )}
                          <button
                            onClick={() => handleAction(r.raceId, resetRace)}
                            disabled={acting === r.raceId}
                            className="px-2.5 py-1.5 border border-amber-200 text-amber-600 rounded-lg text-xs font-bold hover:bg-amber-50 transition-colors disabled:opacity-50"
                          >
                            Reset
                          </button>
                          <button
                            onClick={() => handleDelete(r.raceId)}
                            disabled={deleting === r.raceId}
                            className="px-2.5 py-1.5 border border-red-100 text-red-500 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            {deleting === r.raceId ? '…' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <footer className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between text-xs font-medium text-gray-500">
            <div>
              Page <span className="text-gray-900 font-bold">{page}</span> of{' '}
              <span className="text-gray-900 font-bold">{totalPages}</span>
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

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-950 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg z-[60]">
          {toast}
        </div>
      )}

      {/* Set Result Modal */}
      {resultRace && (
        <SetResultModal
          race={resultRace}
          onClose={() => setResultRace(null)}
          onSuccess={() => {
            setResultRace(null)
            showToast('Đã set kết quả')
            loadCards(); load(page, pageSize)
          }}
        />
      )}

      {/* Collect Pool Modal */}
      {collectRace && (
        <CollectPoolModal
          race={collectRace}
          onClose={() => setCollectRace(null)}
          onSuccess={() => {
            setCollectRace(null)
            showToast('Pool collected successfully!')
            loadCards(); load(page, pageSize)
          }}
        />
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4 my-auto">
            <h3 className="text-base font-bold text-gray-900">{editId ? 'Edit Race' : 'Create Race'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Race Name *</label>
                <input type="text" placeholder="e.g. Golden Cup Sprint" className={inputCls} {...f('raceName')} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Racecourse *</label>
                <select className={inputCls} {...f('racecourseId')}>
                  <option value="">— Select —</option>
                  {racecourses.map(rc => <option key={rc.racecourseId} value={rc.racecourseId?.toLowerCase()}>{rc.racecourseName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Race #</label>
                <input type="number" min="1" className={inputCls} {...f('raceNumber')} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Start Time</label>
                <input
                  type="datetime-local"
                  className={inputCls}
                  min={new Date(Date.now() + 90 * 60 * 1000).toISOString().slice(0, 16)}
                  {...f('startTime')}
                />
                <p className="text-[11px] text-gray-400 mt-1">Must be ≥ 90 minutes from now</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Track Length (m)</label>
                  <input type="number" min="0" className={inputCls} {...f('trackLength')} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Max Participants</label>
                  <input type="number" min="1" className={inputCls} {...f('maxParticipants')} />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Image</label>
                {imagePreview && (
                  <img src={imagePreview} alt="preview" className="w-full h-32 object-cover block rounded-xl mb-2 border border-gray-100" />
                )}
                <label className="flex items-center gap-2 cursor-pointer w-full px-3 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-xs font-medium text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>upload</span>
                  {imageFile ? imageFile.name : 'Click to upload image'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              </div>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setModal(false)} className="flex-1 h-11 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 h-11 bg-gray-950 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-60">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
