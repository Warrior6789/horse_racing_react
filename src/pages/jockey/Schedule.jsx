import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LayoutList, CalendarDays, Radio } from 'lucide-react'
import JockeyLayout from '../../components/JockeyLayout'
import { getJockeyMyRequestsPaged } from '../../api/registrations'
import { getMyJockeyProfile, getMyJockeyRewards } from '../../api/jockeyProfiles'
import { useRaceHub } from '../../hooks/useRaceHub'

const PAGE_SIZE = 5
const ACTIVE_RACE_STATUSES = ['Scheduled', 'BettingOpen', 'BettingClosed', 'Live']
const PAST_RACE_STATUSES   = ['Completed', 'Finished', 'Cancelled']

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

function statusInfo(reg) {
  if (reg.jockeyConfirmation === true)  return { label: 'Confirmed', cls: 'bg-green-900/30 text-green-400 border border-green-700/40' }
  if (reg.jockeyConfirmation === false) return { label: 'Rejected',  cls: 'bg-red-900/30 text-red-400 border border-red-700/40' }
  return { label: 'Pending', cls: 'bg-yellow-900/30 text-yellow-400 border border-yellow-700/40' }
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

function CalendarView({ items }) {
  const today = new Date()
  const [cur, setCur] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [filterStatus, setFilterStatus] = useState({ confirmed: true, pending: true })

  const prev    = () => setCur(c => { const d = new Date(c.year, c.month - 1, 1); return { year: d.getFullYear(), month: d.getMonth() } })
  const next    = () => setCur(c => { const d = new Date(c.year, c.month + 1, 1); return { year: d.getFullYear(), month: d.getMonth() } })
  const goToday = () => setCur({ year: today.getFullYear(), month: today.getMonth() })

  const monthLabel = new Date(cur.year, cur.month, 1).toLocaleString([], { month: 'long', year: 'numeric' })

  const filtered = useMemo(() => items.filter(reg => {
    if (reg.jockeyConfirmation === false) return false
    const key = reg.jockeyConfirmation === true ? 'confirmed' : 'pending'
    return filterStatus[key]
  }), [items, filterStatus])

  const byDay = useMemo(() => {
    const m = {}
    filtered.forEach(reg => {
      if (!reg.race?.startTime) return
      const key = reg.race.startTime.slice(0, 10)
      if (!m[key]) m[key] = []
      m[key].push(reg)
    })
    return m
  }, [filtered])

  const nextRace = useMemo(() => [...items]
    .filter(r => r.jockeyConfirmation !== false && r.race?.startTime && new Date(r.race.startTime) > today)
    .sort((a, b) => new Date(a.race.startTime) - new Date(b.race.startTime))[0]
  , [items])

  const firstDow    = new Date(cur.year, cur.month, 1).getDay()
  const daysInMonth = new Date(cur.year, cur.month + 1, 0).getDate()
  const prevMonthDays = new Date(cur.year, cur.month, 0).getDate()
  const cells = []
  for (let i = firstDow - 1; i >= 0; i--) cells.push({ day: prevMonthDays - i, cur: false })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, cur: true })
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - firstDow - daysInMonth + 1, cur: false })
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  const toggleStatus = key => setFilterStatus(p => ({ ...p, [key]: !p[key] }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

      {/* Sidebar */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-[#151a28] rounded-2xl p-5 border border-gray-800/80">
          <h3 className="text-[#facc15] text-[10px] font-black uppercase tracking-widest mb-5">Quick Filters</h3>
          <div className="pt-2 space-y-3">
            <label className="text-xs font-bold text-gray-400 block mb-2">Status Type</label>
            {[{ key: 'confirmed', label: 'Confirmed' }, { key: 'pending', label: 'Pending' }].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer group" onClick={() => toggleStatus(key)}>
                <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors ${filterStatus[key] ? 'bg-[#facc15]' : 'border border-gray-600 bg-transparent'}`}>
                  {filterStatus[key] && (
                    <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`text-sm font-bold transition-colors ${filterStatus[key] ? 'text-gray-200' : 'text-gray-500'}`}>{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-[#151a28] rounded-2xl p-5 border border-gray-800/80">
          <h3 className="text-[#facc15] text-[10px] font-black uppercase tracking-widest mb-4">Next Race</h3>
          {nextRace ? (
            <>
              <p className="text-white font-bold text-sm">{nextRace.race?.raceName || `Race #${nextRace.race?.raceNumber}`}</p>
              <p className="text-gray-400 text-xs mt-1">
                {rawDate(nextRace.race.startTime)?.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} · {rawTimeStr(nextRace.race.startTime)}
              </p>
              <p className="text-gray-500 text-xs mt-0.5">{nextRace.race?.racecourseName}</p>
              <p className="text-[#facc15] text-xs font-bold mt-2">{nextRace.horse?.horseName}</p>
            </>
          ) : <p className="text-gray-600 text-sm">No upcoming races.</p>}
        </div>

        <div className="space-y-2 pt-1">
          {[{ color: 'bg-[#facc15]', label: 'Confirmed' }, { color: 'bg-[#60a5fa]', label: 'Pending' }].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`} />
              <span className="text-xs font-bold text-gray-400">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="lg:col-span-3 bg-[#151a28] rounded-2xl p-6 border border-gray-800/80 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">{monthLabel}</h2>
          <div className="flex items-center gap-4">
            <button onClick={prev} className="text-gray-400 hover:text-white transition-colors"><ChevronLeft size={18} /></button>
            <button onClick={goToday} className="text-sm font-bold text-gray-300 hover:text-white transition-colors">Today</button>
            <button onClick={next} className="text-gray-400 hover:text-white transition-colors"><ChevronRight size={18} /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 mb-2">
          {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => (
            <div key={d} className="text-center text-[10px] font-black text-gray-500 uppercase tracking-widest pb-2">{d}</div>
          ))}
        </div>

        <div className="flex-1 border-t border-l border-gray-800/60 rounded-tl-lg">
          {weeks.map((row, wi) => (
            <div key={wi} className="grid grid-cols-7">
              {row.map((cell, di) => {
                const isToday = cell.cur && cell.day === today.getDate() && cur.month === today.getMonth() && cur.year === today.getFullYear()
                const dayKey  = cell.cur
                  ? `${cur.year}-${String(cur.month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`
                  : null
                const races = dayKey ? (byDay[dayKey] || []) : []
                return (
                  <div key={di} className={`min-h-[100px] border-b border-r border-gray-800/60 p-2 transition-colors
                    ${!cell.cur ? 'bg-[#0d1017]/60' : isToday ? 'bg-[#facc15]/5' : 'bg-[#151a28]/30'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`text-sm font-bold ${!cell.cur ? 'text-gray-600' : isToday ? 'text-[#facc15]' : 'text-gray-300'}`}>
                          {cell.day}
                        </span>
                        {cell.cur && races.length > 0 && (
                          <div className="flex gap-0.5 mt-1">
                            {races.slice(0, 3).map((r, ri) => (
                              <span key={ri} className={`w-1.5 h-1.5 rounded-full ${r.jockeyConfirmation === true ? 'bg-[#facc15]' : 'bg-[#60a5fa]'}`} />
                            ))}
                            {races.length > 3 && <span className="w-1 h-1 rounded-full bg-gray-500 self-center" />}
                          </div>
                        )}
                      </div>
                      {isToday && <span className="w-1.5 h-1.5 rounded-full bg-[#facc15] mt-1" />}
                    </div>
                    <div className="mt-1 space-y-1">
                      {races.slice(0, 2).map((r, ri) => {
                        const confirmed = r.jockeyConfirmation === true
                        const timeStr   = rawTimeStr(r.race?.startTime)
                        return (
                          <div key={ri} className={`bg-[#1e2433] border-l-2 ${confirmed ? 'border-[#facc15]' : 'border-[#60a5fa]'} rounded-r py-1 px-2`}>
                            {timeStr && <p className="text-[9px] font-bold text-[#facc15]/70 mb-0.5">{timeStr}</p>}
                            <p className="text-[10px] font-bold text-gray-200 truncate">{r.horse?.horseName || '—'}</p>
                            <p className="text-[9px] text-gray-500 truncate mt-0.5">{r.race?.raceName || `Race #${r.race?.raceNumber}`}</p>
                          </div>
                        )
                      })}
                      {races.length > 2 && <p className="text-[9px] font-bold text-gray-500 px-1">+{races.length - 2} more</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function JockeySchedule() {
  const navigate = useNavigate()
  const [regs,        setRegs]        = useState([])
  const [profile,     setProfile]     = useState(null)
  const [totalEarned, setTotalEarned] = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [refreshKey,  setRefreshKey]  = useState(0)
  const [view,        setView]        = useState('table')
  const [page,        setPage]        = useState(1)
  const [timeFilter,  setTimeFilter]  = useState('upcoming')

  const handleUpdated = useCallback(() => setRefreshKey(k => k + 1), [])
  useRaceHub(null, { onRacesUpdated: handleUpdated, onRegistrationsUpdated: handleUpdated })

  useEffect(() => {
    Promise.all([
      getJockeyMyRequestsPaged({ page: 1, pageSize: 500 })
        .then(r => { const d = r.data.data; setRegs(d?.items || []) })
        .catch(() => {}),
      getMyJockeyProfile()
        .then(r => setProfile(r.data.data))
        .catch(() => {}),
      getMyJockeyRewards({ page: 1, pageSize: 200 })
        .then(r => setTotalEarned(r.data.data?.totalRewardAmount ?? 0))
        .catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [refreshKey])

  const now       = new Date()
  const activeRegs = regs.filter(r => ACTIVE_RACE_STATUSES.includes(r.race?.status))
  const pastRegs   = regs.filter(r => PAST_RACE_STATUSES.includes(r.race?.status))
  const confirmed = activeRegs.filter(r => r.jockeyConfirmation === true)
  const pending   = activeRegs.filter(r => r.jockeyConfirmation === null || r.jockeyConfirmation === undefined)

  const nextRace = [...confirmed]
    .filter(r => r.race?.startTime && new Date(r.race.startTime) > now)
    .sort((a, b) => new Date(a.race.startTime) - new Date(b.race.startTime))[0]

  const nextRaceName = nextRace ? (nextRace.race?.raceName || `Race #${nextRace.race?.raceNumber}`) : '—'
  const nextRaceTime = nextRace?.race?.startTime
    ? `${rawDate(nextRace.race.startTime)?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${rawTimeStr(nextRace.race.startTime) || ''}`
    : '—'

  const totalRaces = profile?.totalRaces ?? 0
  const totalWins  = profile?.totalWins  ?? 0
  const winRate    = totalRaces > 0 ? Math.round((totalWins / totalRaces) * 100) : 0

  const tableItems = (timeFilter === 'past' ? pastRegs : activeRegs).filter(r => r.jockeyConfirmation !== false)
  const totalPages = Math.max(1, Math.ceil(tableItems.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const pageItems  = tableItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <JockeyLayout>
      <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6 pb-12">

        {/* Header + view toggle */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#facc15] mb-2 tracking-tight">Race Schedule</h1>
            <p className="text-gray-400 text-sm font-medium">Your confirmed and pending race assignments.</p>
          </div>
          <div className="flex bg-[#161a23] p-1.5 rounded-xl border border-gray-800">
            <button onClick={() => setView('table')}
              className={`flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-lg transition-colors ${view === 'table' ? 'bg-[#facc15] text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}>
              <LayoutList size={16} /> Table View
            </button>
            <button onClick={() => setView('calendar')}
              className={`flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-lg transition-colors ${view === 'calendar' ? 'bg-[#facc15] text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}>
              <CalendarDays size={16} /> Calendar View
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Total Assignments" value={activeRegs.length} sub={`${pending.length} pending`} />
          <StatCard title="Confirmed Races"   value={confirmed.length}  sub="Ready to race" accent />
          <StatCard title="Next Race"         value={nextRaceName}      sub={nextRaceTime} leftBorder />
          <StatCard title="Win Rate"          value={`${winRate}%`}     sub={`${totalWins} wins / ${totalRaces} races`} />
          <StatCard title="Total Earned"      value={`${totalEarned.toLocaleString()} VND`} sub="From race prizes" />
        </div>

        {/* Table View */}
        {view === 'table' && (
          <div className="bg-[#161a23] rounded-2xl border border-gray-800/80 flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800/50 flex justify-between items-center bg-[#1a1f2b]/30">
              <div className="flex items-center gap-4">
                <h2 className="text-sm font-bold text-gray-300">Assignment Roster</h2>
                <div className="flex bg-[#0f1219] p-1 rounded-lg border border-gray-800">
                  <button
                    onClick={() => { setTimeFilter('upcoming'); setPage(1) }}
                    className={`px-3 py-1 text-xs font-bold rounded transition-colors ${timeFilter === 'upcoming' ? 'bg-[#facc15] text-black' : 'text-gray-400 hover:text-white'}`}
                  >
                    Upcoming
                  </button>
                  <button
                    onClick={() => { setTimeFilter('past'); setPage(1) }}
                    className={`px-3 py-1 text-xs font-bold rounded transition-colors ${timeFilter === 'past' ? 'bg-[#facc15] text-black' : 'text-gray-400 hover:text-white'}`}
                  >
                    Past
                  </button>
                </div>
              </div>
              <span className="text-gray-500 text-xs font-medium">{tableItems.length} races</span>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="w-8 h-8 border-2 border-gray-700 border-t-yellow-500 rounded-full animate-spin" />
                </div>
              ) : tableItems.length === 0 ? (
                <div className="text-center py-16 text-gray-500 text-sm">
                  {timeFilter === 'past' ? 'No past races.' : 'No race assignments yet.'}
                </div>
              ) : (
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="text-gray-400 text-[10px] uppercase tracking-wider border-b border-gray-800/50">
                      <th className="px-4 py-4 font-bold w-14"></th>
                      <th className="px-4 py-4 font-bold">Horse</th>
                      <th className="px-4 py-4 font-bold">Race</th>
                      <th className="px-4 py-4 font-bold">Date</th>
                      <th className="px-4 py-4 font-bold text-center">Gate</th>
                      <th className="px-4 py-4 font-bold text-center">Status</th>
                      <th className="px-4 py-4 w-28"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {pageItems.map((item, i) => {
                      const h = item.horse || {}
                      const r = item.race  || {}
                      const { label, cls } = statusInfo(item)
                      return (
                        <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-4 py-3">
                            <div className="w-12 h-12 rounded-full bg-gray-800 border border-gray-700 overflow-hidden flex items-center justify-center text-2xl shrink-0">
                              {h.imageUrl
                                ? <img src={h.imageUrl} alt="" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />
                                : '🐎'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-gray-200 text-sm group-hover:text-white">{h.horseName || '—'}</p>
                            <p className="text-[10px] text-gray-500 font-medium mt-0.5">{h.breed || '—'}{h.age ? ` · ${h.age}yo` : ''}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-gray-300 text-sm">{r.raceName || `Race #${r.raceNumber || '—'}`}</p>
                            <p className="text-[10px] text-gray-500 font-medium mt-0.5">{r.racecourseName || '—'}</p>
                          </td>
                          <td className="px-4 py-3">
                            {r.startTime ? (
                              <>
                                <p className="text-sm text-gray-300 font-medium">
                                  {rawDate(r.startTime)?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                                <p className="text-[10px] text-gray-500 mt-0.5">{rawTimeStr(r.startTime)}</p>
                              </>
                            ) : <span className="text-gray-600">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="w-8 h-8 rounded-full border border-gray-600 flex items-center justify-center mx-auto text-xs font-bold text-gray-300">
                              {item.gateNumber || '—'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${cls}`}>{label}</span>
                          </td>
                          <td className="px-4 py-3">
                            {r.status === 'Live' && (
                              <button
                                onClick={() => navigate(`/jockey/races/${r.raceId}/live`)}
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
                Showing {tableItems.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, tableItems.length)} of {tableItems.length} races
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
        )}

        {/* Calendar View */}
        {view === 'calendar' && !loading && (
          <CalendarView items={regs} />
        )}

      </div>
    </JockeyLayout>
  )
}
