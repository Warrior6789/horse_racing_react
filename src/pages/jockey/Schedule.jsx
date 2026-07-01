import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Download, Radio } from 'lucide-react'
import JockeyLayout from '../../components/JockeyLayout'
import { getJockeyMyRequestsPaged } from '../../api/registrations'
import { getMyJockeyProfile, getMyJockeyRewards } from '../../api/jockeyProfiles'
import { useRaceHub } from '../../hooks/useRaceHub'

function StatMetric({ label, value, progress }) {
  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400 font-bold uppercase tracking-wider">{label}</span>
        <span className="font-black text-white">{value}</span>
      </div>
      <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full bg-[#facc15]" style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
    </div>
  )
}

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function JockeySchedule() {
  const navigate = useNavigate()
  const [regs,    setRegs]    = useState([])
  const [profile, setProfile] = useState(null)
  const [totalEarned, setTotalEarned] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const today = new Date()
  const [calYear,  setCalYear]  = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())

  const handleUpdated = useCallback(() => setRefreshKey(k => k + 1), [])
  useRaceHub(null, { onRacesUpdated: handleUpdated, onRegistrationsUpdated: handleUpdated })

  useEffect(() => {
    Promise.all([
      getJockeyMyRequestsPaged({ page: 1, pageSize: 500 })
        .then(r => {
          const d = r.data.data
          setRegs(d?.items || [])
        })
        .catch(() => {}),
      getMyJockeyProfile()
        .then(r => setProfile(r.data.data))
        .catch(() => {}),
      getMyJockeyRewards({ page: 1, pageSize: 200 })
        .then(r => setTotalEarned(r.data.data?.totalRewardAmount ?? 0))
        .catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [refreshKey])

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
  }

  // Build calendar grid
  const firstDay = new Date(calYear, calMonth, 1).getDay()
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()

  // Race days in current month — raw string parse avoids timezone shift
  const raceDays = new Set(
    regs
      .filter(reg => reg.jockeyConfirmation !== false && reg.race?.startTime)
      .filter(reg => {
        const [y, mo] = reg.race.startTime.slice(0, 10).split('-').map(Number)
        return y === calYear && (mo - 1) === calMonth
      })
      .map(reg => parseInt(reg.race.startTime.slice(8, 10), 10))
  )

  const totalRaces = profile?.totalRaces ?? 0
  const totalWins  = profile?.totalWins  ?? 0
  const winRate    = totalRaces > 0 ? Math.round((totalWins / totalRaces) * 100) : 0

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)
  const recentRaces = regs.filter(r => r.race?.startTime && new Date(r.race.startTime) >= thirtyDaysAgo)

  const upcoming = [...regs]
    .filter(r => r.jockeyConfirmation === true && r.race?.startTime && (new Date(r.race.startTime) > now || r.race?.status === 'Live'))
    .sort((a, b) => new Date(a.race.startTime) - new Date(b.race.startTime))

  const fmtDate = str => str
    ? new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'
  const fmtTime = str => str
    ? new Date(str).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <JockeyLayout>
      <div className="p-4 md:p-8 space-y-6">

        <div>
          <h1 className="text-2xl font-black text-white mb-1">Race Schedule</h1>
          <p className="text-gray-400 text-sm">Your confirmed upcoming races and performance overview.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Calendar */}
          <div className="lg:col-span-2 bg-[#1a2130] p-6 rounded-2xl border border-gray-700/50">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-bold text-white">{MONTHS[calMonth]} {calYear}</h2>
              <div className="flex gap-2">
                <button onClick={prevMonth} className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={nextMonth} className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {DAYS.map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-gray-500 uppercase py-1">{d}</div>
              ))}

              {/* Empty cells before first day */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`e${i}`} />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const isToday = calYear === today.getFullYear() && calMonth === today.getMonth() && day === today.getDate()
                const hasRace = raceDays.has(day)
                return (
                  <div
                    key={day}
                    className={`h-14 rounded-lg flex flex-col items-start p-2 border text-[11px] font-bold transition-colors
                      ${isToday ? 'bg-[#facc15]/10 border-[#facc15]/40 text-[#facc15]' : hasRace ? 'bg-[#1a2130] border-yellow-700/50 text-white' : 'bg-[#131722] border-gray-800 text-gray-500'}`}
                  >
                    {day}
                    {hasRace && <span className="mt-auto w-1.5 h-1.5 rounded-full bg-[#facc15] self-center" />}
                  </div>
                )
              })}
            </div>

            <div className="flex items-center gap-4 mt-4 text-[10px] text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#facc15]" /> Race day</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full border border-[#facc15]/40 bg-[#facc15]/10" /> Today</span>
            </div>
          </div>

          {/* Performance Stats */}
          <div className="bg-[#1a2130] p-6 rounded-2xl border border-gray-700/50 flex flex-col">
            <h3 className="font-bold text-white mb-6">Last 30 Days</h3>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-7 h-7 border-2 border-gray-700 border-t-yellow-500 rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <StatMetric label="Win Rate"      value={`${winRate}%`}             progress={winRate} />
                <StatMetric label="Confirmed Races" value={recentRaces.length}       progress={Math.min(recentRaces.length * 10, 100)} />

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-[#131722] p-3 rounded-lg">
                    <p className="text-[10px] text-gray-500 mb-1">Total Wins</p>
                    <p className="font-black text-xl text-white">{totalWins}</p>
                  </div>
                  <div className="bg-[#131722] p-3 rounded-lg">
                    <p className="text-[10px] text-gray-500 mb-1">Earnings</p>
                    <p className="font-black text-sm text-white mt-1">{totalEarned > 0 ? `${(totalEarned / 1000).toFixed(0)}k VND` : '—'}</p>
                  </div>
                </div>

                <button className="w-full mt-auto pt-6">
                  <span className="w-full bg-[#facc15] text-black font-black py-3 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-yellow-400 transition-colors">
                    PERFORMANCE REPORT <Download size={16} />
                  </span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Upcoming Confirmed Races */}
        <div className="bg-[#1a2130] rounded-2xl border border-gray-700/50 overflow-hidden">
          <div className="p-6 border-b border-gray-700 flex justify-between items-center">
            <h2 className="font-bold text-white">Upcoming Confirmed Races</h2>
            <span className="text-[11px] text-gray-500">{upcoming.length} races</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-7 h-7 border-2 border-gray-700 border-t-yellow-500 rounded-full animate-spin" />
            </div>
          ) : upcoming.length === 0 ? (
            <div className="py-14 text-center text-gray-500 text-sm">No upcoming confirmed races.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-[#131722] text-[10px] uppercase text-gray-500">
                <tr>
                  {['Date & Time', 'Horse', 'Racecourse', 'Gate', 'Weight', ''].map(h => (
                    <th key={h} className="px-6 py-4 font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {upcoming.map(reg => (
                  <tr key={reg.registrationId} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-white">{fmtDate(reg.race?.startTime)}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{fmtTime(reg.race?.startTime)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md bg-gray-800 border border-gray-700 overflow-hidden flex items-center justify-center text-xs shrink-0">
                          {reg.horse?.imageUrl
                            ? <img src={reg.horse.imageUrl} alt="" className="w-full h-full object-cover" />
                            : '🐎'}
                        </div>
                        <span className="text-gray-200 font-medium">{reg.horse?.horseName || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-400">{reg.race?.racecourseName || '—'}</td>
                    <td className="px-6 py-4 font-bold text-gray-200">
                      {reg.gateNumber ? `#${reg.gateNumber}` : '—'}
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      {profile?.weight ? `${profile.weight} kg` : '—'}
                    </td>
                    <td className="px-6 py-4">
                      {reg.race?.status === 'Live' && (
                        <button
                          onClick={() => navigate(`/jockey/races/${reg.race.raceId}/live`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-red-900 text-red-400 hover:bg-red-950/50 rounded-lg transition-colors text-xs font-bold whitespace-nowrap"
                        >
                          <Radio size={10} className="animate-pulse" /> Watch Live
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
    </JockeyLayout>
  )
}
