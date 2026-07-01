import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { History, Trophy, MapPin, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import JockeyLayout from '../../components/JockeyLayout'
import { getJockeyMyRequestsPaged } from '../../api/registrations'
import { getMyJockeyRewards } from '../../api/jockeyProfiles'

const PAGE_SIZE = 8

const FINISHED_STATUSES = ['completed', 'finished', 'done']
const isFinished = (reg) => {
  const s = (reg.race?.status || reg.raceStatus || '').toLowerCase()
  return FINISHED_STATUSES.some(f => s.includes(f))
}

const posColor = (pos) => {
  if (pos === 1) return 'bg-[#facc15] text-[#110e0b]'
  if (pos === 2) return 'bg-stone-300 text-black'
  if (pos === 3) return 'bg-amber-700 text-white'
  return 'bg-gray-800 text-gray-400'
}

export default function JockeyRaceHistory() {
  const navigate = useNavigate()
  const [regs,       setRegs]       = useState([])
  const [rewardMap,  setRewardMap]  = useState({})
  const [loading,    setLoading]    = useState(true)
  const [page,       setPage]       = useState(1)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [regRes, rewardRes] = await Promise.all([
        getJockeyMyRequestsPaged({ page: 1, pageSize: 500 }),
        getMyJockeyRewards({ page: 1, pageSize: 500 }).catch(() => null),
      ])
      const all = regRes.data.data?.items || []
      // Only confirmed + finished races
      const done = all.filter(r => r.jockeyConfirmation === true && isFinished(r))
        .sort((a, b) => new Date(b.race?.startTime || 0) - new Date(a.race?.startTime || 0))
      setRegs(done)

      if (rewardRes) {
        const items = rewardRes.data.data?.rewards?.items || rewardRes.data.data?.items || []
        const map = {}
        items.forEach(item => {
          const key = item.registrationId || item.raceId
          if (key) map[key] = (map[key] || 0) + (item.amount || 0)
        })
        setRewardMap(map)
      }
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const totalPages = Math.max(1, Math.ceil(regs.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const pageItems  = regs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const totalRaces = regs.length
  const wins       = regs.filter(r => r.finalPosition === 1 || r.position === 1).length
  const winRate    = totalRaces > 0 ? Math.round((wins / totalRaces) * 100) : 0
  const totalEarned = Object.values(rewardMap).reduce((s, v) => s + v, 0)

  return (
    <JockeyLayout>
      <div className="p-4 md:p-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-white mb-1">Race History</h1>
          <p className="text-gray-400 text-sm">Your completed race assignments and performance record.</p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Races Completed', value: totalRaces,                    icon: History  },
            { label: 'Wins',            value: wins,                          icon: Trophy   },
            { label: 'Win Rate',        value: `${winRate}%`,                 icon: Trophy   },
            { label: 'Total Earned',    value: totalEarned > 0 ? `${totalEarned.toLocaleString()} VND` : '—', icon: Trophy },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-[#1a2130] p-5 rounded-xl border border-gray-700/50">
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-3">{label}</p>
              <p className="text-2xl font-black text-white">{loading ? '—' : value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-[#161a23] rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <History size={15} className="text-gray-500" />
              <h2 className="text-sm font-bold text-gray-200">Past Races</h2>
            </div>
            <span className="text-[11px] text-gray-500">{regs.length} races</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-gray-700 border-t-yellow-500 rounded-full animate-spin" />
            </div>
          ) : regs.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-sm">
              No completed races yet.
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-800/60">
                {pageItems.map((reg) => {
                  const race  = reg.race  || {}
                  const horse = reg.horse || {}
                  const pos   = reg.finalPosition ?? reg.position ?? null
                  const reward = rewardMap[reg.registrationId] ?? rewardMap[race.raceId] ?? null
                  const raceId = race.raceId

                  return (
                    <div key={reg.registrationId} className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors">

                      {/* Position badge */}
                      <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-sm font-black ${pos ? posColor(pos) : 'bg-gray-800 text-gray-600'}`}>
                        {pos ?? '—'}
                      </div>

                      {/* Horse avatar */}
                      <div className="w-10 h-10 rounded-lg bg-gray-800 border border-gray-700 overflow-hidden flex items-center justify-center text-lg shrink-0">
                        {horse.imageUrl
                          ? <img src={horse.imageUrl} alt="" className="w-full h-full object-cover" />
                          : '🐎'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-white truncate">
                          {race.raceName || `Race #${race.raceNumber || '—'}`}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <span className="text-[11px] text-gray-500 truncate">🐎 {horse.horseName || '—'}</span>
                          {race.racecourseName && (
                            <span className="flex items-center gap-0.5 text-[10px] text-gray-600">
                              <MapPin size={9} /> {race.racecourseName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Date */}
                      <div className="text-right shrink-0 hidden sm:block">
                        <p className="text-xs text-gray-400 font-medium">
                          {race.startTime
                            ? new Date(race.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : '—'}
                        </p>
                        <p className="text-[10px] text-gray-600 mt-0.5">
                          {race.startTime
                            ? new Date(race.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                            : ''}
                        </p>
                      </div>

                      {/* Reward */}
                      <div className="text-right shrink-0 w-28">
                        {reward != null
                          ? <p className="text-sm font-black text-[#facc15]">+{reward.toLocaleString()} <span className="text-[10px] font-normal text-gray-500">VND</span></p>
                          : <p className="text-sm text-gray-600">—</p>
                        }
                      </div>

                      {/* Results link */}
                      {raceId && (
                        <button
                          onClick={() => navigate(`/jockey/races/${raceId}/results`)}
                          className="shrink-0 p-2 rounded-lg text-gray-500 hover:text-yellow-400 hover:bg-gray-800 transition-colors"
                          title="View Results"
                        >
                          <ExternalLink size={15} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
                  <p className="text-gray-500 text-xs">Page {safePage} of {totalPages}</p>
                  <div className="flex gap-1">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                      className="w-7 h-7 flex items-center justify-center rounded border border-gray-800 text-gray-400 hover:bg-gray-800 transition-colors disabled:opacity-40">
                      <ChevronLeft size={14} />
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
                      <button key={n} onClick={() => setPage(n)}
                        className={`w-7 h-7 flex items-center justify-center rounded text-xs font-bold transition-colors ${n === safePage ? 'bg-[#facc15] text-black' : 'border border-gray-800 text-gray-400 hover:bg-gray-800'}`}>
                        {n}
                      </button>
                    ))}
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                      className="w-7 h-7 flex items-center justify-center rounded border border-gray-800 text-gray-400 hover:bg-gray-800 transition-colors disabled:opacity-40">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </JockeyLayout>
  )
}
