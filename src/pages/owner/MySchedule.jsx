import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2, XCircle, Circle,
  ChevronLeft, ChevronRight,
  LayoutList, CalendarDays,
  ChevronDown, Sparkles, Radio
} from 'lucide-react'
import OwnerLayout from '../../components/OwnerLayout'
import { getOwnerAllRegistrationsPaged } from '../../api/registrations'
import { getRacecourses } from '../../api/racecourses'
import { useRaceHub } from '../../hooks/useRaceHub'

const PAGE_SIZE = 4

/* ─── Helpers ──────────────────────────────────────────────────────── */
// BE stores admin-entered local time in the UTC slot (no real UTC conversion).
// Parse raw string to avoid double-shifting by 7h (UTC+7).
function rawDate(st) {
  if (!st) return null
  const [y, mo, d] = st.slice(0, 10).split('-').map(Number)
  return new Date(y, mo - 1, d)
}
function rawTimeStr(st) {
  if (!st || st.length < 16) return null
  const h = parseInt(st.substring(11, 13), 10)
  const m = st.substring(14, 16)
  return `${h % 12 || 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`
}

function eventColor(status) {
  if (!status) return 'pending'
  const s = status.toLowerCase()
  if (s === 'confirmed' || s === 'accepted') return 'confirmed'
  if (s === 'rejected'  || s === 'scratched') return 'scratched'
  return 'pending'
}

const colorMap = {
  confirmed: { border: 'border-[#facc15]', bg: 'bg-[#1e2433]', text: 'text-gray-200',    sub: 'text-gray-500' },
  pending:   { border: 'border-[#60a5fa]', bg: 'bg-[#1e2433]', text: 'text-gray-200',    sub: 'text-gray-500' },
  scratched: { border: 'border-red-900/50',bg: 'bg-red-950/20', text: 'text-red-300/60 line-through', sub: 'text-red-500/60' },
}

function StatusIcon({ ok }) {
  if (ok === true)  return <CheckCircle2 size={16} className="text-[#facc15]" />
  if (ok === false) return <XCircle size={16} className="text-red-500" />
  return <Circle size={16} className="text-gray-700" />
}

function StatCard({ title, value, sub, accent, leftBorder }) {
  return (
    <div className={`bg-[#161a23] p-5 rounded-xl border border-gray-800/80 flex flex-col justify-between h-28 ${leftBorder ? 'border-l-2 border-l-[#facc15]' : ''}`}>
      <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">{title}</p>
      <div>
        <h3 className={`font-bold mb-1 ${accent ? 'text-[#facc15] text-2xl' : 'text-white text-2xl'}`}>{value}</h3>
        {sub && <p className="text-gray-400 text-xs">{sub}</p>}
      </div>
    </div>
  )
}

/* ─── Calendar View ────────────────────────────────────────────────── */
function CalendarView({ items, horses, venues }) {
  const today = new Date()
  const [cur, setCur] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [filterHorse,  setFilterHorse]  = useState('all')
  const [filterVenue,  setFilterVenue]  = useState('all')
  const [filterStatus, setFilterStatus] = useState({ confirmed: true, pending: true })

  const goToday = () => setCur({ year: today.getFullYear(), month: today.getMonth() })
  const prev = () => setCur(c => { const d = new Date(c.year, c.month - 1, 1); return { year: d.getFullYear(), month: d.getMonth() } })
  const next = () => setCur(c => { const d = new Date(c.year, c.month + 1, 1); return { year: d.getFullYear(), month: d.getMonth() } })

  const monthLabel = new Date(cur.year, cur.month, 1).toLocaleString([], { month: 'long', year: 'numeric' })

  // filter items
  const filtered = useMemo(() => items.filter(item => {
    if (filterHorse !== 'all' && String(item.horse?.horseId) !== filterHorse) return false
    if (filterVenue !== 'all') {
      const v = item.race?.racecourseName ?? item.race?.racecourse?.racecourseName ?? item.racecourseName
      if (v !== filterVenue) return false
    }
    const ec = eventColor(item.status)
    if (!filterStatus[ec]) return false
    return true
  }), [items, filterHorse, filterVenue, filterStatus])

  // group by day
  const byDay = useMemo(() => {
    const m = {}
    filtered.forEach(item => {
      if (!item.race?.startTime) return
      const key = item.race.startTime.slice(0, 10)
      if (!m[key]) m[key] = []
      m[key].push(item)
    })
    return m
  }, [filtered])

  // next upcoming from full items (not filtered)
  const nextRace = useMemo(() => [...items]
    .filter(s => s.race?.startTime && new Date(s.race.startTime) > new Date())
    .sort((a, b) => new Date(a.race.startTime) - new Date(b.race.startTime))[0]
  , [items])

  // build weeks
  const firstDow = new Date(cur.year, cur.month, 1).getDay()
  const daysInMonth = new Date(cur.year, cur.month + 1, 0).getDate()
  const prevMonthDays = new Date(cur.year, cur.month, 0).getDate()
  const cells = []
  for (let i = firstDow - 1; i >= 0; i--) cells.push({ day: prevMonthDays - i, cur: false })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, cur: true })
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - firstDow - daysInMonth + 1, cur: false })

  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  const toggleStatus = (key) => setFilterStatus(p => ({ ...p, [key]: !p[key] }))

  return (
    <div className="space-y-4">

      {/* ── Quick Filters bar ──────────────────────────────────────── */}
      <div className="bg-[#151a28] rounded-2xl px-5 py-4 border border-gray-800/80 flex flex-wrap items-center gap-6">
        <h3 className="text-[#facc15] text-[10px] font-black uppercase tracking-widest shrink-0">Quick Filters</h3>

        {/* Racecourse */}
        <div className="flex items-center gap-2 shrink-0">
          <label className="text-xs font-bold text-gray-400 whitespace-nowrap">Racecourse</label>
          <div className="relative">
            <select
              value={filterVenue}
              onChange={e => setFilterVenue(e.target.value)}
              className="bg-[#0d1017] border border-gray-700 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-200 focus:outline-none appearance-none font-medium"
            >
              <option value="all">All Locations</option>
              {venues.map(v => <option key={v.racecourseId ?? v.racecourseName} value={v.racecourseName}>{v.racecourseName}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </div>

        {/* Status checkboxes */}
        <div className="flex items-center gap-4">
          <label className="text-xs font-bold text-gray-400 whitespace-nowrap">Status</label>
          {[
            { key: 'confirmed', label: 'Confirmed' },
            { key: 'pending',   label: 'Pending'   },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer group" onClick={() => toggleStatus(key)}>
              <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors ${filterStatus[key] ? 'bg-[#facc15]' : 'border border-gray-600 bg-transparent'}`}>
                {filterStatus[key] && (
                  <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={`text-sm font-bold transition-colors ${filterStatus[key] ? 'text-gray-200' : 'text-gray-500 group-hover:text-gray-400'}`}>{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* ── Calendar + Next Major Event ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">

        {/* ── Calendar Grid ───────────────────────────────────────── */}
        <div className="lg:col-span-3 bg-[#151a28] rounded-2xl p-6 border border-gray-800/80 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">{monthLabel}</h2>
          <div className="flex items-center gap-4">
            <button onClick={prev} className="text-gray-400 hover:text-white transition-colors"><ChevronLeft size={18} /></button>
            <button onClick={goToday} className="text-sm font-bold text-gray-300 hover:text-white transition-colors">Today</button>
            <button onClick={next} className="text-gray-400 hover:text-white transition-colors"><ChevronRight size={18} /></button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-2">
          {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => (
            <div key={d} className="text-center text-[10px] font-black text-gray-500 uppercase tracking-widest pb-2">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="flex-1 border-t border-l border-gray-800/60 rounded-tl-lg">
          {weeks.map((row, wi) => (
            <div key={wi} className="grid grid-cols-7">
              {row.map((cell, di) => {
                const isToday = cell.cur && cell.day === today.getDate() && cur.month === today.getMonth() && cur.year === today.getFullYear()
                const dayKey  = cell.cur
                  ? `${cur.year}-${String(cur.month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`
                  : null
                const races = dayKey ? (byDay[dayKey] || []) : []
                const isHighlight = isToday

                return (
                  <div
                    key={di}
                    className={`min-h-[100px] border-b border-r border-gray-800/60 p-2 transition-colors
                      ${!cell.cur ? 'bg-[#0d1017]/60' : isHighlight ? 'bg-[#facc15]/5 border-[#facc15]/20' : 'bg-[#151a28]/30'}
                    `}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`text-sm font-bold ${!cell.cur ? 'text-gray-600' : isToday ? 'text-[#facc15]' : 'text-gray-300'}`}>
                          {cell.day}
                        </span>
                        {cell.cur && races.length > 0 && (
                          <div className="flex gap-0.5 mt-1">
                            {races.slice(0, 3).map((r, ri) => {
                              const ec = eventColor(r.status)
                              const dotCls = ec === 'confirmed' ? 'bg-[#facc15]' : ec === 'scratched' ? 'bg-red-500/60' : 'bg-[#60a5fa]'
                              return <span key={ri} className={`w-1.5 h-1.5 rounded-full ${dotCls}`} />
                            })}
                            {races.length > 3 && <span className="w-1 h-1 rounded-full bg-gray-500 self-center" />}
                          </div>
                        )}
                      </div>
                      {isToday && <span className="w-1.5 h-1.5 rounded-full bg-[#facc15] mt-1" />}
                    </div>
                    <div className="mt-1 space-y-1">
                      {races.slice(0, 2).map((r, ri) => {
                        const ec = eventColor(r.status)
                        const c  = colorMap[ec]
                        const timeStr = rawTimeStr(r.race?.startTime)
                        return (
                          <div key={ri} className={`${c.bg} border-l-2 ${c.border} rounded-r py-1 px-2`}>
                            {timeStr && (
                              <p className="text-[9px] font-bold text-[#facc15]/70 mb-0.5">{timeStr}</p>
                            )}
                            <p className={`text-[10px] font-bold ${c.text} truncate`}>
                              {r.horse?.horseName || r.horseName || '—'}
                            </p>
                            <p className={`text-[9px] ${c.sub} truncate mt-0.5`}>
                              {ec === 'scratched' ? 'Scratched' : r.race?.raceName || `Race #${r.race?.raceNumber}`}
                            </p>
                          </div>
                        )
                      })}
                      {races.length > 2 && (
                        <p className="text-[9px] font-bold text-gray-500 px-1">+{races.length - 2} more</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

        {/* ── Next Major Event ──────────────────────────────────── */}
        <div className="lg:col-span-1 bg-[#151a28] rounded-2xl p-5 border border-gray-800/80">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[#facc15] text-[10px] font-black uppercase tracking-widest">Next Major Event</h3>
            <Sparkles size={14} className="text-gray-500" />
          </div>
          {nextRace ? (
            <>
              <div className="relative h-36 rounded-xl overflow-hidden mb-4 border border-gray-700 bg-gray-900 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d1017] via-black/40 to-transparent z-10" />
                {(() => {
                  const venueName = nextRace.race?.racecourseName ?? nextRace.race?.racecourse?.racecourseName
                  const venueImg = venues.find(v => v.racecourseName === venueName)?.imageUrl
                    || nextRace.race?.racecourse?.imageUrl
                  const img = venueImg || nextRace.horse?.imageUrl
                  return img
                    ? <img src={img} alt="" className="w-full h-full object-cover" />
                    : <CalendarDays size={32} className="text-gray-700" />
                })()}
                <div className="absolute bottom-3 left-3 z-20">
                  <p className="text-[10px] text-gray-300 font-bold uppercase tracking-wider mb-0.5">
                    {nextRace.race?.racecourseName || nextRace.race?.racecourse?.racecourseName || 'Racecourse'}
                  </p>
                  <h4 className="text-white font-bold text-base leading-tight">
                    {nextRace.race?.raceName || `Race #${nextRace.race?.raceNumber}`}
                  </h4>
                </div>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed font-medium">
                Scheduled for{' '}
                <span className="text-gray-200 font-bold">
                  {rawDate(nextRace.race.startTime)?.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                </span>.{' '}
                Horse{' '}
                <span className="text-[#facc15] font-bold">{nextRace.horse?.horseName || '—'}</span>{' '}
                is registered.
              </p>
            </>
          ) : (
            <p className="text-gray-600 text-sm">No upcoming events.</p>
          )}
        </div>

      </div>{/* end calendar+event grid */}

      {/* Legend */}
      <div className="flex flex-col md:flex-row justify-between items-center">
        <div className="flex flex-wrap items-center gap-6">
          {[
            { color: 'bg-[#facc15]', label: 'Confirmed Entry' },
            { color: 'bg-[#60a5fa]', label: 'Pending Declaration' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
              <span className="text-xs font-bold text-gray-300">{label}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-500 font-medium italic mt-4 md:mt-0">
          * Times shown in Horse's Local Time Zone
        </p>
      </div>

    </div>
  )
}

/* ─── Main ─────────────────────────────────────────────────────────── */
export default function MySchedule() {
  const navigate = useNavigate()
  const [schedule, setSchedule] = useState([])
  const [allVenues, setAllVenues] = useState([])
  const [loading, setLoading]   = useState(true)
  const [page, setPage]         = useState(1)
  const [view, setView]         = useState('table')
  const [horseFilter, setHorseFilter] = useState('all')
  const [dropOpen, setDropOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleRacesUpdated = useCallback(() => setRefreshKey(k => k + 1), [])
  useRaceHub(null, { onRacesUpdated: handleRacesUpdated })

  useEffect(() => {
    getRacecourses()
      .then(r => setAllVenues(r.data.data || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    getOwnerAllRegistrationsPaged({ page: 1, pageSize: 500 })
      .then(r => {
        const d = r.data.data
        setSchedule(d?.items || d || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [refreshKey])

  const horses = useMemo(() => {
    const seen = new Map()
    schedule.forEach(s => {
      const id   = s.horse?.horseId   ?? s.horseId
      const name = s.horse?.horseName ?? s.horseName
      if (id && !seen.has(id)) seen.set(id, name || `Horse #${id}`)
    })
    return [...seen.entries()].map(([id, name]) => ({ id, name }))
  }, [schedule])


  const filtered = useMemo(() => {
    if (horseFilter === 'all') return schedule
    return schedule.filter(s => String(s.horse?.horseId) === horseFilter)
  }, [schedule, horseFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const pageItems  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const confirmed = schedule.filter(s => s.jockeyConfirmation === true).length
  const pending   = schedule.filter(s => s.jockeyId && !s.jockeyConfirmation).length
  const nextRace  = [...schedule]
    .filter(s => s.race?.startTime && new Date(s.race.startTime) > new Date())
    .sort((a, b) => new Date(a.race.startTime) - new Date(b.race.startTime))[0]

  const nextRaceName = nextRace ? `Race #${nextRace.race?.raceNumber}` : '—'
  const nextRaceTime = nextRace?.race?.startTime
    ? `${rawDate(nextRace.race.startTime)?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${rawTimeStr(nextRace.race.startTime) || ''}`
    : '—'

  const venueCounts = {}
  schedule.forEach(s => { const v = s.race?.racecourseName; if (v) venueCounts[v] = (venueCounts[v] || 0) + 1 })
  const topVenue = Object.entries(venueCounts).sort((a, b) => b[1] - a[1])[0]

  return (
    <OwnerLayout>
      <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6 pb-12">

        {/* Title + controls */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#facc15] mb-2 tracking-tight">My Race Schedule</h1>
            <p className="text-gray-400 text-sm font-medium">
              Monitoring {schedule.length} upcoming race entries across {allVenues.length} location{allVenues.length !== 1 ? 's' : ''}.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Horse filter (table view only) */}
            {view === 'table' && (
              <div className="relative">
                <button
                  onClick={() => setDropOpen(o => !o)}
                  className="flex items-center gap-2 bg-[#161a23] border border-gray-700 rounded-lg px-4 py-2.5 text-sm font-bold text-gray-300 hover:text-white hover:border-gray-600 transition-colors min-w-[140px]"
                >
                  <span className="flex-1 text-left truncate">
                    {horseFilter === 'all' ? 'All Horses' : horses.find(h => String(h.id) === horseFilter)?.name || 'All Horses'}
                  </span>
                  <ChevronDown size={14} className={`shrink-0 transition-transform ${dropOpen ? 'rotate-180' : ''}`} />
                </button>
                {dropOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-[#1a1f2b] border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                    <button onClick={() => { setHorseFilter('all'); setDropOpen(false); setPage(1) }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${horseFilter === 'all' ? 'text-[#facc15] bg-[#facc15]/10' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
                      All Horses
                    </button>
                    {horses.map(h => (
                      <button key={h.id} onClick={() => { setHorseFilter(String(h.id)); setDropOpen(false); setPage(1) }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${horseFilter === String(h.id) ? 'text-[#facc15] bg-[#facc15]/10' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
                        {h.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* View toggle */}
            <div className="flex bg-[#161a23] p-1.5 rounded-xl border border-gray-800">
              <button onClick={() => setView('table')}
                className={`flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-lg transition-colors ${view === 'table' ? 'bg-[#facc15] text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}>
                <LayoutList size={16} />
                Table View
              </button>
              <button onClick={() => setView('calendar')}
                className={`flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-lg transition-colors ${view === 'calendar' ? 'bg-[#facc15] text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}>
                <CalendarDays size={16} />
                Calendar View
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Entries"     value={schedule.length} sub={`${pending} unconfirmed`} />
          <StatCard title="Pending Jockey"    value={pending} sub="Awaiting jockey assignment" accent />
          <StatCard title="Next Race"         value={nextRaceName} sub={nextRaceTime} leftBorder />
          <StatCard title="Confirmed Jockeys" value={`${confirmed}/${schedule.length}`} sub="Jockeys assigned" />
        </div>

        {/* ── Table view ───────────────────────────────────────────── */}
        {view === 'table' && (
          <>
            <div className="bg-[#161a23] rounded-2xl border border-gray-800/80 flex flex-col overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800/50 flex justify-between items-center bg-[#1a1f2b]/30">
                <h2 className="text-sm font-bold text-gray-300">Entry Roster</h2>
                <span className="text-gray-500 text-xs font-medium">{filtered.length} races</span>
              </div>
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="w-8 h-8 border-2 border-gray-700 border-t-yellow-500 rounded-full animate-spin" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-16 text-gray-500 text-sm">No scheduled races.</div>
                ) : (
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="text-gray-400 text-[10px] uppercase tracking-wider border-b border-gray-800/50">
                        {['Horse','Race Name','Racecourse','Time','Gate','Owner / Jockey',''].map(col => (
                          <th key={col} className={`px-6 py-4 font-bold ${['Gate','Owner / Jockey'].includes(col) ? 'text-center' : ''}`}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                      {pageItems.map((item, i) => {
                        const h = item.horse || {}
                        const r = item.race  || {}
                        const ownerOk  = item.ownerConfirmation === true ? true : item.ownerConfirmation === false ? false : null
                        const jockeyOk = item.jockeyConfirmation === true ? true : item.jockeyId ? null : null
                        return (
                          <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gray-800 border border-gray-700 overflow-hidden shrink-0 flex items-center justify-center text-xl">
                                  {h.imageUrl ? <img src={h.imageUrl} alt="" className="w-full h-full object-cover" /> : '🐎'}
                                </div>
                                <div>
                                  <p className="font-bold text-gray-200 text-sm group-hover:text-white">{h.horseName || '—'}</p>
                                  <p className="text-[10px] text-gray-500 font-medium mt-0.5">{h.breed || '—'} • {h.age ? `${h.age}yo` : '—'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4"><p className="font-bold text-gray-300 text-sm">{r.raceName || `Race #${r.raceNumber || '—'}`}</p></td>
                            <td className="px-6 py-4"><p className="text-gray-300 text-sm font-medium">{r.racecourseName || '—'}</p></td>
                            <td className="px-6 py-4">
                              {r.startTime ? (
                                <>
                                  <p className="font-bold text-white text-sm">{rawDate(r.startTime)?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                  <p className="text-[10px] text-gray-500 font-medium mt-0.5">{rawTimeStr(r.startTime)}</p>
                                </>
                              ) : <span className="text-gray-600">—</span>}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="w-8 h-8 rounded-full border border-gray-600 flex items-center justify-center mx-auto text-xs font-bold text-gray-300">
                                {item.gateNumber || '—'}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-4">
                                <div className="flex flex-col items-center gap-1">
                                  <StatusIcon ok={ownerOk} />
                                  <span className="text-[8px] font-bold text-gray-600 uppercase">Own</span>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                  <StatusIcon ok={jockeyOk} />
                                  <span className="text-[8px] font-bold text-gray-600 uppercase">Joc</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-4 w-32">
                              {r.status === 'Live' && (
                                <button
                                  onClick={() => navigate(`/owner/races/${r.raceId}/live`)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 border border-red-900 text-red-400 hover:bg-red-950/50 rounded-lg transition-colors text-xs font-bold whitespace-nowrap"
                                >
                                  <Radio size={10} className="animate-pulse" /> Watch Live
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="p-4 border-t border-gray-800/50 flex items-center justify-between bg-[#1a1f2b]/30">
                <p className="text-gray-400 text-xs font-medium">
                  Showing {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} races
                </p>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                    className="w-7 h-7 flex items-center justify-center rounded border border-gray-800 text-gray-400 hover:bg-gray-800 transition-colors disabled:opacity-40">
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map(p => (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-7 h-7 flex items-center justify-center rounded text-xs font-bold transition-colors ${p === safePage ? 'bg-[#facc15] text-black' : 'border border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                      {p}
                    </button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                    className="w-7 h-7 flex items-center justify-center rounded border border-gray-800 text-gray-400 hover:bg-gray-800 transition-colors disabled:opacity-40">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom cards (table view only) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-[#161a23] rounded-2xl p-5 border border-gray-800/80">
                <h2 className="text-sm font-bold text-[#facc15] mb-4">Venue Analysis</h2>
                {Object.keys(venueCounts).length === 0 ? (
                  <p className="text-gray-600 text-sm">No venue data yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-[#1a1f2b] p-4 rounded-xl border border-gray-800/60">
                      <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">Most Visited</p>
                      <h4 className="text-white font-bold text-sm">{topVenue?.[0] || '—'}</h4>
                      <p className="text-gray-400 text-xs font-medium mt-1">{topVenue?.[1] || 0} Races Scheduled</p>
                    </div>
                    <div className="bg-[#1a1f2b] p-4 rounded-xl border border-gray-800/60">
                      <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">Total Venues</p>
                      <h4 className="text-white font-bold text-sm">{Object.keys(venueCounts).length}</h4>
                      <p className="text-gray-400 text-xs font-medium mt-1">Unique racecourses</p>
                    </div>
                    <div className="bg-[#1a1f2b] p-4 rounded-xl border border-gray-800/60">
                      <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">Confirmed Races</p>
                      <h4 className="text-white font-bold text-sm">{confirmed}</h4>
                      <p className="text-gray-400 text-xs font-medium mt-1">With assigned jockey</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-[#161a23] rounded-2xl p-5 border border-gray-800/80">
                <h2 className="text-sm font-bold text-white mb-2">Next Race</h2>
                {nextRace ? (
                  <>
                    <p className="text-[#facc15] font-bold text-base">{nextRaceName}</p>
                    <p className="text-gray-400 text-xs mt-1">{nextRaceTime}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{nextRace.race?.racecourseName || '—'}</p>
                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Horse</span>
                        <span className="text-[10px] font-bold text-gray-300">{nextRace.horse?.horseName || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Jockey</span>
                        <span className={`text-[10px] font-bold ${nextRace.jockeyId ? 'text-[#facc15]' : 'text-red-500'}`}>
                          {nextRace.jockeyConfirmation === true ? 'Confirmed' : nextRace.jockeyId ? 'Pending' : 'Not assigned'}
                        </span>
                      </div>
                      <div className="mt-3 w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-[#facc15] rounded-full"
                          style={{ width: `${Math.max(5, Math.min(100, (1 - (new Date(nextRace.race.startTime) - Date.now()) / (7 * 24 * 60 * 60 * 1000)) * 100))}%` }} />
                      </div>
                      <p className="text-[10px] text-gray-600">Time until race</p>
                    </div>
                  </>
                ) : <p className="text-gray-600 text-sm">No upcoming races.</p>}
              </div>
            </div>
          </>
        )}

        {/* ── Calendar view ─────────────────────────────────────────── */}
        {view === 'calendar' && !loading && (
          <CalendarView items={schedule} horses={horses} venues={allVenues} />
        )}

      </div>

      {dropOpen && <div className="fixed inset-0 z-40" onClick={() => setDropOpen(false)} />}
    </OwnerLayout>
  )
}
