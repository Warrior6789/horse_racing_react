import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Flag, Settings, HelpCircle, Search, Bell,
  History, User, SlidersHorizontal, MapPin, Clock,
  ChevronRight, BarChart3,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getMyRefereeRaces } from '../../api/races'
import { useRaceHub } from '../../hooks/useRaceHub'
import AccountProfile from '../../components/AccountProfile'
import CardCarousel from '../../components/CardCarousel'

/* ── Mini Track Visualization ── */
const LANE_H = 28, GATE_W = 22, TRACK_START = 4, TRACK_END = 92

function MiniTrack({ horses }) {
  const sorted = [...horses].sort((a, b) => b.progress - a.progress)
  const totalH = horses.length * LANE_H
  if (!horses.length) return (
    <div className="flex items-center justify-center h-full text-[10px] text-slate-500 font-semibold">
      Waiting for race data…
    </div>
  )
  return (
    <div className="relative select-none" style={{ height: totalH }}>
      {horses.map((_, i) => (
        <div key={i} className="absolute left-0 right-0" style={{
          top: i * LANE_H, height: LANE_H,
          background: i % 2 === 0 ? '#14310f' : '#112c0d',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }} />
      ))}
      {/* gate column */}
      <div className="absolute top-0 bottom-0 bg-black/30 border-r border-white/10" style={{ width: GATE_W }}>
        {horses.map((h, i) => (
          <div key={i} className="flex items-center justify-center text-[9px] font-black text-slate-400" style={{ height: LANE_H }}>
            {h.gateNumber ?? i + 1}
          </div>
        ))}
      </div>
      {/* track area */}
      <div className="absolute top-0 bottom-0" style={{ left: GATE_W, right: 0 }}>
        <div className="absolute top-0 bottom-0 w-px bg-white/20" style={{ left: `${TRACK_START}%` }} />
        {/* finish line */}
        <div className="absolute top-0 bottom-0 overflow-hidden" style={{ left: `${TRACK_END}%`, width: 10 }}>
          {Array.from({ length: horses.length * 3 }).map((_, i) => (
            <div key={i} style={{ height: LANE_H / 3 }} className={i % 2 === 0 ? 'bg-white/80' : 'bg-black/70'} />
          ))}
        </div>
        {/* horses */}
        {horses.map((h, i) => {
          const rank = sorted.findIndex(s => (s.id || s.registrationId) === (h.id || h.registrationId))
          const posX = TRACK_START + h.progress * (TRACK_END - TRACK_START)
          return (
            <div key={h.id || i} className="absolute flex items-center transition-all duration-150"
              style={{ top: i * LANE_H + LANE_H / 2 - 8, left: `${posX}%` }}>
              <div className={`w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-[7px] font-black shadow
                ${h.isFinished ? 'bg-slate-500 text-white'
                  : rank === 0 ? 'bg-[#f7e0a3] text-black'
                  : rank === 1 ? 'bg-slate-300 text-black'
                  : rank === 2 ? 'bg-amber-700 text-white'
                  : 'bg-slate-700 text-slate-300'}`}>
                {rank + 1}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Highlight({ text, query }) {
  const str = String(text ?? '')
  if (!query) return <>{str}</>
  const idx = str.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{str}</>
  return (
    <>
      {str.slice(0, idx)}
      <span className="bg-[#facc15] text-black rounded-[2px] px-[1px] font-bold">{str.slice(idx, idx + query.length)}</span>
      {str.slice(idx + query.length)}
    </>
  )
}

function LiveRaceCard({ race, onNavigate }) {
  const [horses, setHorses] = useState([])
  const handleUpdate = useCallback((data) => {
    if (data.horses) setHorses(data.horses)
  }, [])
  useRaceHub(race.raceId, { onRaceUpdate: handleUpdate })

  return (
    <div className="bg-[#0e1a0c] rounded-2xl border border-emerald-900/40 shadow-lg overflow-hidden flex flex-col">
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div>
          <span className="text-[9px] font-mono font-bold text-slate-400 tracking-wider">RACE #{race.raceNumber}</span>
          <h4 className="text-sm font-bold text-white truncate">{race.raceName || `Race #${race.raceNumber}`}</h4>
        </div>
        <span className="flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
        </span>
      </div>
      <div className="bg-[#0a1407] mx-3 mb-3 rounded-xl overflow-hidden border border-white/5" style={{ minHeight: 140 }}>
        <MiniTrack horses={horses} />
      </div>
      <div className="px-3 pb-3">
        <button
          onClick={() => onNavigate(race.raceId)}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 rounded-xl transition-colors shadow-sm"
        >
          ⚡ Monitor Live
        </button>
      </div>
    </div>
  )
}

const STATUS_STYLE = {
  Live:          'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  BettingOpen:   'bg-amber-500/20 text-amber-400 border-amber-500/30',
  BettingClosed: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  Scheduled:     'bg-slate-500/20 text-slate-400 border-slate-500/30',
  Completed:     'bg-gray-500/20 text-gray-300 border-gray-500/30',
  Finished:      'bg-gray-500/20 text-gray-300 border-gray-500/30',
  Cancelled:     'bg-red-500/20 text-red-400 border-red-500/30',
}

const STATUS_LABEL = {
  BettingOpen: 'Betting Open', BettingClosed: 'Betting Closed',
  Live: 'In Progress',
}

export default function RefereeRaces() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)

  const [allRaces, setAllRaces] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [status, setStatus]     = useState('')
  const [tab, setTab]           = useState('active')

  const FINISHED_STATUSES = ['Finished', 'Cancelled']
  const tabRaces = allRaces.filter(r =>
    tab === 'active' ? !FINISHED_STATUSES.includes(r.status) : FINISHED_STATUSES.includes(r.status)
  )
  const races = tabRaces.filter(r => {
    const matchStatus = !status || r.status === status
    const matchSearch = !search || [r.raceName, r.racecourseName, String(r.raceNumber)]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()))
    return matchStatus && matchSearch
  })
  const liveCount  = allRaces.filter(r => r.status === 'Live').length
  const totalCount = tabRaces.length

  const displayName = user?.fullName || user?.name || user?.email?.split('@')[0] || 'Referee'
  const initials    = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const fetchRaces = useCallback(() => {
    setLoading(true)
    getMyRefereeRaces()
      .then(r => setAllRaces(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchRaces() }, [fetchRaces])

  useRaceHub(null, { onRacesUpdated: fetchRaces })

  const STATUS_OPTIONS = tab === 'active'
    ? ['', 'Scheduled', 'BettingOpen', 'BettingClosed', 'Live', 'Completed']
    : ['', 'Finished', 'Cancelled']

  return (
    <div className="flex h-screen w-full bg-[#f4f6fa] text-slate-800 font-sans overflow-hidden">

      {/* SIDEBAR */}
      <aside className="w-64 bg-[#1a1c2e] text-white flex flex-col justify-between p-4 shrink-0">
        <div>
          <div className="mb-6 px-2 py-1">
            <h1 className="font-bold text-lg tracking-tight">EquineOfficial</h1>
            <p className="text-[11px] text-slate-400 font-medium tracking-wide">Regulatory Division</p>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => navigate('/referee/races')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-800 text-emerald-400 font-semibold text-xs uppercase tracking-wider transition-colors"
            >
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

          <button
            onClick={() => setProfileOpen(true)}
            className="w-full bg-[#24273e] p-3 rounded-xl flex items-center gap-3 border border-slate-800/60 hover:border-slate-700 transition-colors text-left"
          >
            <div className="w-9 h-9 bg-slate-600 rounded-full overflow-hidden flex items-center justify-center shrink-0">
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
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">

        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-3 flex justify-between items-center shrink-0">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search races..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-slate-300"
            />
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-colors">
              <Bell size={16} />
            </button>
            <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-colors">
              <History size={16} />
            </button>
            <div className="h-4 w-px bg-slate-200 mx-1" />
            <button
              onClick={() => setProfileOpen(true)}
              className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <span>{displayName}</span>
              <User size={14} className="text-slate-500" />
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="p-4 md:p-8 space-y-6 flex-1">

          {/* Tabs */}
          <div className="flex gap-1 border-b border-slate-200">
            {[{ key: 'active', label: 'Active' }, { key: 'finished', label: 'Finished / Cancelled' }].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setTab(key); setStatus('') }}
                className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                  tab === key
                    ? 'border-slate-800 text-slate-900'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Title + Filters */}
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">My Assigned Races</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Review schedules, monitor track conditions, and submit official reports.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg transition-colors focus:outline-none"
              >
                <option value="">All Status</option>
                {STATUS_OPTIONS.filter(Boolean).map(s => (
                  <option key={s} value={s}>{STATUS_LABEL[s] || s}</option>
                ))}
              </select>
              <button
                onClick={() => { setStatus(''); setSearch('') }}
                className="flex items-center gap-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg transition-colors"
              >
                <SlidersHorizontal size={12} /> Reset
              </button>
            </div>
          </div>

          {/* Race Cards Grid */}
          {loading ? (
            <CardCarousel count={3} dark={false}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="snap-start shrink-0 w-[calc(33.333%-11px)] bg-white rounded-2xl border border-slate-200 h-72 animate-pulse" />
              ))}
            </CardCarousel>
          ) : races.length === 0 ? (
            <div className="text-center py-20 text-sm font-semibold text-slate-400 bg-white rounded-2xl border border-slate-200">
              No races found.
            </div>
          ) : (
            <CardCarousel count={races.length} dark={false}>
              {races.map(race => {
                const st    = race.status || 'Scheduled'
                if (st === 'Live') return (
                  <div key={race.raceId} className="snap-start shrink-0 w-[calc(33.333%-11px)]">
                    <LiveRaceCard race={race} onNavigate={id => navigate(`/referee/races/${id}`)} />
                  </div>
                )

                const label = STATUS_LABEL[st] || st
                const style = STATUS_STYLE[st] || STATUS_STYLE.Scheduled
                const start = race.startTime ? new Date(race.startTime) : null
                const dateStr = start
                  ? `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : '—'
                return (
                  <div key={race.raceId} className="snap-start shrink-0 w-[calc(33.333%-11px)] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
                    <div>
                      <div className="h-40 w-full relative bg-slate-900">
                        {race.imageUrl
                          ? <img src={race.imageUrl} alt={race.raceName} className="w-full h-full object-cover opacity-80" />
                          : <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                              <Flag size={36} className="text-slate-600" />
                            </div>
                        }
                        <span className={`absolute top-3 left-3 text-[9px] font-bold px-2 py-0.5 rounded-full border backdrop-blur-sm ${style}`}>
                          • {label}
                        </span>
                      </div>

                      <div className="p-5 space-y-3">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-slate-400 block tracking-wider">
                            RACE #<Highlight text={race.raceNumber} query={search} />
                          </span>
                          <h4 className="text-base font-bold text-slate-800 mt-0.5 truncate">
                            <Highlight text={race.raceName || `Race #${race.raceNumber}`} query={search} />
                          </h4>
                        </div>

                        <div className="space-y-1.5 text-xs font-medium text-slate-500">
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-slate-400 shrink-0" />
                            <span className="truncate">{race.racecourseName || '—'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock size={14} className="text-slate-400 shrink-0" />
                            <span>{dateStr}</span>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Track Length</span>
                            <span className="font-bold text-slate-700">{race.trackLength ? `${race.trackLength}m` : '—'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Max Participants</span>
                            <span className="font-bold text-slate-700">{race.maxParticipants ?? '—'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="px-5 pb-5">
                      <button
                        onClick={() => navigate(`/referee/races/${race.raceId}`)}
                        className="w-full bg-[#1e2238] hover:bg-[#2b304f] text-white text-xs font-bold py-2.5 rounded-xl transition-colors shadow-sm"
                      >
                        View & Report
                      </button>
                    </div>
                  </div>
                )
              })}
            </CardCarousel>
          )}

          {/* Footer blocks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2 bg-[#e0e4f7] rounded-2xl p-6 flex justify-between items-center relative overflow-hidden border border-indigo-100">
              <div className="space-y-2 max-w-md z-10">
                <h3 className="text-base font-bold text-slate-900">Track Safety Protocol Updated</h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Referees must review the updated wet-weather surface guidelines before the weekend events.
                </p>
                <button className="mt-2 bg-black hover:bg-slate-900 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 transition-colors">
                  Review Protocol <ChevronRight size={14} />
                </button>
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-32 bg-indigo-200/40 transform skew-x-12 translate-x-10 pointer-events-none" />
              <div className="absolute right-12 top-0 bottom-0 w-8 bg-indigo-200/20 transform skew-x-12 translate-x-10 pointer-events-none" />
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-slate-50 border border-slate-100 rounded-lg text-emerald-500">
                  <BarChart3 size={16} />
                </div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Live Now</h3>
              </div>
              <div className="space-y-3.5">
                <div className="flex justify-between items-end text-xs">
                  <span className="font-semibold text-slate-500">Active Races</span>
                  <span className="font-bold text-slate-800 text-sm">{String(liveCount).padStart(2, '0')}</span>
                </div>
                <div className="flex justify-between items-end text-xs">
                  <span className="font-semibold text-slate-500">Total Races</span>
                  <span className="font-bold text-slate-800 text-sm">{totalCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {profileOpen && <AccountProfile variant="light" onClose={() => setProfileOpen(false)} />}
    </div>
  )
}
