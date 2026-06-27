import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { MapPin, Sprout, Mountain, Ruler, CalendarCheck, ChevronDown, ChevronLeft, ChevronRight, Search, Calendar, Users } from 'lucide-react'
import OwnerLayout from '../../components/OwnerLayout'
import { getUpcomingRaces, getRaceRegistrations } from '../../api/races'
import { getOwnerAllRegistrations } from '../../api/registrations'
import { useRaceHub } from '../../hooks/useRaceHub'

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

/* ─── Race Card ───────────────────────────────────────────────────── */
function RaceCard({ race, regCount, onRegister, isRegistered, search }) {
  const st    = race.startTime || null
  const month = st ? rawDate(st).toLocaleString('en-US', { month: 'short' }) : '—'
  const day   = st ? rawDate(st).getDate() : '—'
  const time  = st ? (rawTimeStr(st) || '—') : '—'

  const trackType = race.surfaceType || race.trackType || race.racecourse?.surfaceType || 'Turf'
  const isTurf    = trackType.toLowerCase() === 'turf'
  const venue     = race.racecourseName || race.racecourse?.racecourseName || '—'
  const address   = race.location || null
  const distance  = race.trackLength ? `${race.trackLength}m` : race.distance ? `${race.distance}m` : '—'
  const prizeVal  = race.prizePool ?? race.totalPrizePool ?? race.prize ?? 0
  const prize     = Number(prizeVal).toLocaleString('vi-VN')
  const grade     = race.raceGrade || race.grade || null
  const status    = race.status || race.raceStatus || ''
  const maxSlots  = race.maxHorses || race.maxEntries || race.capacity || null

  return (
    <div className="bg-[#161a23] rounded-xl border border-gray-800/80 p-4 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-gray-600 transition-colors">
      {/* Left */}
      <div className="flex items-center gap-6 w-full md:w-auto">
        <div className="bg-[#1a1f2b] rounded-lg p-3 flex flex-col items-center justify-center min-w-[70px] border border-gray-700/60 shrink-0">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{month}</span>
          <span className="text-xl font-black text-white leading-none my-1">{day}</span>
          <span className="text-[10px] font-bold text-gray-400">{time}</span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h3 className="text-base font-bold text-white"><Highlight text={race.raceName || `Race #${race.raceNumber}`} query={search} /></h3>
            {grade && (
              <span className="bg-[#252d3d] text-gray-300 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border border-gray-600/50 shrink-0">
                {grade}
              </span>
            )}
            {status && (
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 ${
                status === 'Scheduled'     ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' :
                status === 'BettingOpen'   ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                status === 'BettingClosed' ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30' :
                status === 'Live'          ? 'bg-red-500/15 text-red-400 border border-red-500/30' :
                status === 'Completed'     ? 'bg-gray-500/15 text-gray-400 border border-gray-500/30' :
                status === 'Finished'      ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' :
                status === 'Cancelled'     ? 'bg-zinc-700/40 text-zinc-500 border border-zinc-600/30' :
                'bg-gray-700/40 text-gray-400 border border-gray-600/30'
              }`}>
                {status}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-gray-400 flex-wrap">
            <div className="flex items-center gap-1.5">
              <MapPin size={13} className="text-gray-500 shrink-0" />
              <span className="truncate max-w-[180px]"><Highlight text={venue} query={search} /></span>
            </div>
            {address && (
              <div className="flex items-center gap-1.5">
                <MapPin size={13} className="text-[#facc15]/60 shrink-0" />
                <span className="truncate max-w-[180px] text-gray-500"><Highlight text={address} query={search} /></span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              {isTurf
                ? <Sprout size={13} className="text-green-600/80 shrink-0" />
                : <Mountain size={13} className="text-orange-900/80 shrink-0" />}
              {trackType}
            </div>
            {distance !== '—' && (
              <div className="flex items-center gap-1.5">
                <Ruler size={13} className="text-gray-500 shrink-0" />
                {distance}
              </div>
            )}
            {/* Registration count */}
            <div className="flex items-center gap-1.5">
              <Users size={13} className="text-gray-500 shrink-0" />
              {regCount == null ? (
                <span className="text-gray-600">—</span>
              ) : maxSlots ? (
                <span className={regCount >= maxSlots ? 'text-red-400' : 'text-gray-300'}>
                  {regCount}/{maxSlots} joined
                </span>
              ) : (
                <span className="text-gray-300">{regCount} joined</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center justify-between w-full md:w-auto gap-8 shrink-0">
        <div className="text-right">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Prize Pool</p>
          <p className="text-lg font-black text-white">
            {prize} <span className="text-xs text-[#facc15] ml-0.5">VND</span>
          </p>
        </div>
        {isRegistered ? (
          <button
            disabled
            className="border-2 border-green-600/50 text-green-400 bg-green-500/10 px-5 py-2 rounded-lg text-sm font-bold whitespace-nowrap cursor-not-allowed opacity-80"
          >
            ✓ Registered
          </button>
        ) : (
          <button
            onClick={() => onRegister(race.raceId)}
            className="border-2 border-[#facc15]/60 hover:border-[#facc15] text-[#facc15] bg-transparent hover:bg-[#facc15]/10 px-5 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap"
          >
            Register
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Main ────────────────────────────────────────────────────────── */
export default function AvailableRaces() {
  const navigate  = useNavigate()
  const location  = useLocation()

  const [races,           setRaces]           = useState([])
  const [regCountMap,     setRegCountMap]     = useState({})
  const [myRegisteredIds, setMyRegisteredIds] = useState(new Set())
  const [loading,         setLoading]         = useState(true)
  const [search,       setSearch]       = useState('')
  const [trackFilter,  setTrackFilter]  = useState('All')
  const [sortBy,       setSortBy]       = useState('date')
  const [sortOpen,     setSortOpen]     = useState(false)
  const [showSuccess,  setShowSuccess]  = useState(!!location.state?.success)
  const [refreshKey,   setRefreshKey]   = useState(0)
  const [page,         setPage]         = useState(1)
  const PAGE_SIZE = 5
  const preselectedHorseId = location.state?.preselectedHorseId

  const handleRacesUpdated = useCallback(() => setRefreshKey(k => k + 1), [])
  useRaceHub(null, { onRacesUpdated: handleRacesUpdated })

  useEffect(() => {
    if (showSuccess) setTimeout(() => setShowSuccess(false), 3000)
  }, [showSuccess])

  useEffect(() => {
    Promise.all([
      getUpcomingRaces({ pageSize: 50 }).then(r => r.data.data?.items || r.data.data || []).catch(() => []),
      getOwnerAllRegistrations().then(r => r.data.data || []).catch(() => []),
    ]).then(([list, myRegs]) => {
      setRaces(list)
      setMyRegisteredIds(new Set(myRegs.map(reg => reg.raceId || reg.race?.raceId).filter(Boolean)))
      Promise.allSettled(list.map(race => getRaceRegistrations(race.raceId))).then(results => {
        const map = {}
        results.forEach((res, i) => {
          if (res.status === 'fulfilled') {
            const regs = res.value.data.data || res.value.data || []
            map[list[i].raceId] = Array.isArray(regs) ? regs.length : (regs.items?.length ?? 0)
          }
        })
        setRegCountMap(map)
      })
    }).finally(() => setLoading(false))
  }, [refreshKey])

  const filtered = useMemo(() => {
    setPage(1)
    let list = [...races]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        (r.raceName || '').toLowerCase().includes(q) ||
        (r.racecourseName || r.racecourse?.racecourseName || '').toLowerCase().includes(q) ||
        (r.location || '').toLowerCase().includes(q)
      )
    }
    if (trackFilter !== 'All') {
      list = list.filter(r => {
        const t = r.surfaceType || r.trackType || r.racecourse?.surfaceType || 'Turf'
        return t === trackFilter
      })
    }
    if (sortBy === 'prize') list.sort((a, b) => (b.prizePool || 0) - (a.prizePool || 0))
    else                    list.sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
    return list
  }, [races, search, trackFilter, sortBy])

  const SORT_LABELS = { date: 'Date (Soonest)', prize: 'Prize Pool' }

  return (
    <OwnerLayout>
      <div className="p-6 md:p-8 max-w-5xl mx-auto pb-12">

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-[#facc15] mb-2 tracking-tight">Available Races</h1>
          <p className="text-gray-400 text-sm font-medium">Select a race to register your horses and jockeys.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text" placeholder="Search races or venues…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#161a23] border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-xs font-medium text-gray-300 focus:outline-none focus:border-gray-600 transition-colors"
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {['All', 'Turf', 'Dirt'].map(t => (
              <button key={t} onClick={() => setTrackFilter(t)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors border ${
                  trackFilter === t
                    ? 'bg-[#facc15] text-black border-[#facc15]'
                    : 'bg-[#161a23] border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200'
                }`}>
                {t === 'All' ? 'Track: All' : t}
              </button>
            ))}

            <div className="relative">
              <button onClick={() => setSortOpen(o => !o)}
                className="flex items-center gap-2 bg-[#161a23] border border-gray-800 rounded-lg px-4 py-2 text-xs font-medium text-gray-400 hover:border-gray-600 hover:text-gray-200 transition-colors">
                Sort: <span className="text-white font-bold">{SORT_LABELS[sortBy]}</span>
                <ChevronDown size={13} className={`transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-44 bg-[#1a1f2b] border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                  {Object.entries(SORT_LABELS).map(([k, v]) => (
                    <button key={k} onClick={() => { setSortBy(k); setSortOpen(false) }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors ${sortBy === k ? 'text-[#facc15] bg-[#facc15]/10' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
                      {v}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Success toast */}
        {showSuccess && (
          <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm font-bold">
            Registration submitted successfully!
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-gray-700 border-t-yellow-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20">
            <div className="bg-[#161a23] p-4 rounded-2xl mb-4 border border-gray-800">
              <Calendar size={30} className="text-gray-600" />
            </div>
            <p className="text-gray-500 text-sm font-medium">No races found for the selected filters.</p>
          </div>
        ) : (() => {
          const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
          const safePage   = Math.min(page, totalPages)
          const pageItems  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
          return (
            <>
              <div className="space-y-4">
                {pageItems.map(race => (
                  <RaceCard
                    key={race.raceId}
                    race={race}
                    regCount={regCountMap[race.raceId] ?? null}
                    isRegistered={myRegisteredIds.has(race.raceId)}
                    search={search}
                    onRegister={id => navigate(`/owner/races/${id}/register`, { state: { preselectedHorseId } })}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <p className="text-gray-500 text-xs">
                    {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} races
                  </p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 transition-colors disabled:opacity-40"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                          p === safePage ? 'bg-[#facc15] text-black' : 'border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 transition-colors disabled:opacity-40"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )
        })()}
      </div>

      {sortOpen && <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />}
    </OwnerLayout>
  )
}
