import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { History, Trophy, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import JockeyLayout from '../../components/JockeyLayout'
import { getJockeyMyRequestsPaged } from '../../api/registrations'
import { getMyJockeyRewards } from '../../api/jockeyProfiles'

const PAGE_SIZE = 10

const FINISHED_STATUSES = ['completed', 'finished', 'done']
const isFinished = (reg) => {
  const s = (reg.race?.status || reg.raceStatus || '').toLowerCase()
  return FINISHED_STATUSES.some(f => s.includes(f))
}

const getPosColor = (pos) => {
  if (pos === 1) return 'bg-yellow-500 text-black'
  if (pos === 2) return 'bg-gray-300 text-black'
  if (pos === 3) return 'bg-orange-700 text-white'
  return 'bg-gray-700 text-gray-300'
}

const posLabel = (pos) => {
  if (pos === 1) return '1st'
  if (pos === 2) return '2nd'
  if (pos === 3) return '3rd'
  if (pos) return `${pos}th`
  return '—'
}

export default function JockeyRaceHistory() {
  const navigate = useNavigate()
  const [regs,      setRegs]      = useState([])
  const [rewardMap, setRewardMap] = useState({})
  const [loading,   setLoading]   = useState(true)
  const [page,      setPage]      = useState(1)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [regRes, rewardRes] = await Promise.all([
        getJockeyMyRequestsPaged({ page: 1, pageSize: 500 }),
        getMyJockeyRewards({ page: 1, pageSize: 500 }).catch(() => null),
      ])
      const all = regRes.data.data?.items || []
      const done = all
        .filter(r => r.jockeyConfirmation === true && isFinished(r))
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

  const totalPages  = Math.max(1, Math.ceil(regs.length / PAGE_SIZE))
  const safePage    = Math.min(page, totalPages)
  const pageItems   = regs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const totalRaces  = regs.length
  const wins        = regs.filter(r => (r.finalPosition ?? r.position) === 1).length
  const winRate     = totalRaces > 0 ? Math.round((wins / totalRaces) * 100) : 0
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
            { label: 'Races Completed', value: totalRaces },
            { label: 'Wins',            value: wins },
            { label: 'Win Rate',        value: `${winRate}%` },
            { label: 'Total Earned',    value: totalEarned > 0 ? `${totalEarned.toLocaleString()} VND` : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#1a2130] p-5 rounded-xl border border-gray-700/50">
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-3">{label}</p>
              <p className="text-2xl font-black text-white">{loading ? '—' : value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-[#1a1814] rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
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
            <div className="text-center py-16 text-gray-500 text-sm">No completed races yet.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-gray-400 text-[11px] font-bold uppercase tracking-wider border-b border-gray-700">
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Race Event</th>
                      <th className="px-6 py-3">Horse</th>
                      <th className="px-6 py-3">Track &amp; Condition</th>
                      <th className="px-6 py-3">Pos</th>
                      <th className="px-6 py-3">Earnings</th>
                      <th className="px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((reg) => {
                      const race   = reg.race  || {}
                      const horse  = reg.horse || {}
                      const pos    = reg.finalPosition ?? reg.position ?? null
                      const reward = rewardMap[reg.registrationId] ?? rewardMap[race.raceId] ?? null

                      return (
                        <tr key={reg.registrationId} className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors">
                          {/* Date */}
                          <td className="px-6 py-4 text-sm text-gray-300 whitespace-nowrap">
                            {race.startTime
                              ? new Date(race.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : '—'}
                          </td>

                          {/* Race Event */}
                          <td className="px-6 py-4">
                            <div className="font-bold text-yellow-500 text-sm">
                              {race.raceName || `Race #${race.raceNumber || '—'}`}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {race.trackLength ? `${race.trackLength}m` : '—'}
                            </div>
                          </td>

                          {/* Horse */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 overflow-hidden flex items-center justify-center text-base shrink-0">
                                {horse.imageUrl
                                  ? <img src={horse.imageUrl} alt="" className="w-full h-full object-cover" />
                                  : '🐎'}
                              </div>
                              <div>
                                <span className="font-semibold text-sm text-white">{horse.horseName || '—'}</span>
                                {(horse.breed || horse.age) && (
                                  <span className="text-gray-500 text-xs font-normal ml-1.5">
                                    ({[horse.breed, horse.age ? `${horse.age}y` : null].filter(Boolean).join(' • ')})
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Track & Condition */}
                          <td className="px-6 py-4 text-sm text-gray-300">
                            <div>{race.racecourseName || '—'}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{race.surface || race.trackCondition || ''}</div>
                          </td>

                          {/* Position */}
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded text-xs font-bold ${pos ? getPosColor(pos) : 'bg-gray-700 text-gray-500'}`}>
                              {posLabel(pos)}
                            </span>
                          </td>

                          {/* Earnings */}
                          <td className="px-6 py-4 font-mono text-sm">
                            {reward != null
                              ? <span className="text-yellow-400 font-bold">+{reward.toLocaleString()} VND</span>
                              : <span className="text-gray-600">—</span>
                            }
                          </td>

                          {/* Results link */}
                          <td className="px-6 py-4">
                            {race.raceId && (
                              <button
                                onClick={() => navigate(`/jockey/races/${race.raceId}/results`)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-yellow-400 hover:bg-gray-700 transition-colors"
                                title="View Results"
                              >
                                <ExternalLink size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
                  <p className="text-gray-500 text-xs">Page {safePage} of {totalPages}</p>
                  <div className="flex gap-1">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                      className="w-7 h-7 flex items-center justify-center rounded border border-gray-800 text-gray-400 hover:bg-gray-800 disabled:opacity-40">
                      <ChevronLeft size={14} />
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
                      <button key={n} onClick={() => setPage(n)}
                        className={`w-7 h-7 flex items-center justify-center rounded text-xs font-bold ${n === safePage ? 'bg-[#facc15] text-black' : 'border border-gray-800 text-gray-400 hover:bg-gray-800'}`}>
                        {n}
                      </button>
                    ))}
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                      className="w-7 h-7 flex items-center justify-center rounded border border-gray-800 text-gray-400 hover:bg-gray-800 disabled:opacity-40">
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
