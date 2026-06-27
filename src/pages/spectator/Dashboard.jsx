import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Trophy, ChevronRight, Bell, TrendingUp } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import SpectatorLayout from '../../components/SpectatorLayout'
import { getRacesPaged } from '../../api/races'
import { getMyBetsPaged } from '../../api/bets'
import { getBalance } from '../../api/payments'
import { getMyProfile } from '../../api/userProfiles'
import { useRaceHub } from '../../hooks/useRaceHub'

function startsIn(startTime) {
  if (!startTime) return null
  const diff = new Date(startTime) - Date.now()
  if (diff <= 0) return null
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`
}

export default function SpectatorDashboard() {
  const { user } = useAuth()
  const [upcoming, setUpcoming]   = useState([])
  const [liveRaces, setLiveRaces] = useState([])
  const [balance, setBalance]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [profileName, setProfileName] = useState('')
  const [betStats, setBetStats]   = useState({ total: null, pending: null, won: null, staked: null })

  const [refreshKey, setRefreshKey] = useState(0)
  const handleRacesUpdated = useCallback(() => setRefreshKey(k => k + 1), [])
  useRaceHub(null, { onRacesUpdated: handleRacesUpdated })

  const displayName = profileName || user?.email?.split('@')[0] || 'User'

  useEffect(() => {
    getMyProfile().then(r => {
      const p = r.data?.data || r.data || {}
      if (p.fullName) setProfileName(p.fullName)
    }).catch(() => {})

    Promise.all([
      Promise.all([
        getRacesPaged({ page: 1, pageSize: 3, status: 'BettingOpen' }),
        getRacesPaged({ page: 1, pageSize: 3, status: 'Scheduled' }),
      ]).then(([r1, r2]) => {
        const all = [...(r1.data.data?.items || []), ...(r2.data.data?.items || [])]
        const seen = new Set()
        setUpcoming(all.filter(r => seen.has(r.raceId) ? false : seen.add(r.raceId)).slice(0, 3))
      }).catch(() => {}),

      getRacesPaged({ page: 1, pageSize: 5, status: 'Live' })
        .then(r => setLiveRaces(r.data.data?.items || [])).catch(() => {}),

      getBalance()
        .then(r => setBalance(r.data.data?.balance ?? 0)).catch(() => {}),

      Promise.all([
        getMyBetsPaged({ page: 1, pageSize: 1 }),
        getMyBetsPaged({ page: 1, pageSize: 1, status: 'Pending' }),
        getMyBetsPaged({ page: 1, pageSize: 1, status: 'Won' }),
        getMyBetsPaged({ page: 1, pageSize: 500 }),
      ]).then(([all, pending, won, allItems]) => {
        const total  = all.data.data?.totalCount ?? null
        const pCount = pending.data.data?.totalCount ?? null
        const wCount = won.data.data?.totalCount ?? null
        const items  = allItems.data.data?.items || []
        const staked = items.reduce((sum, b) => sum + (b.amount ?? b.betAmount ?? b.stake ?? 0), 0)
        setBetStats({ total, pending: pCount, won: wCount, staked })
      }).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [refreshKey])

  return (
    <SpectatorLayout>

      {/* HEADER */}
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-8 md:mb-10">
        <h2 className="text-xl md:text-2xl text-stone-400">
          Welcome back, <span className="text-stone-100 font-bold">{displayName}</span>
        </h2>
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 bg-[#1a1612] border border-stone-800 rounded-full flex items-center font-semibold text-sm">
            <span className="text-[#f7e0a3] mr-2">₫</span>
            <span className="text-stone-200">{loading ? '—' : (balance ?? 0).toLocaleString()}</span>
          </div>
          <button className="p-2 bg-[#1a1612] border border-stone-800 rounded-full hover:bg-stone-800 transition-colors text-stone-400">
            <Bell size={18} />
          </button>
        </div>
      </header>

      {/* STATS */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#141210] border border-stone-800 p-4 rounded-2xl">
          <p className="text-xs text-stone-500 uppercase font-bold mb-2 tracking-wider">Total Bets</p>
          <p className="text-2xl font-bold text-stone-100">
            {loading || betStats.total === null ? '—' : betStats.total}
          </p>
        </div>
        <div className="bg-[#141210] border border-stone-800 p-4 rounded-2xl">
          <p className="text-xs text-stone-500 uppercase font-bold mb-2 tracking-wider">Pending</p>
          <p className="text-2xl font-bold text-[#f7e0a3]">
            {loading || betStats.pending === null ? '—' : betStats.pending}
          </p>
        </div>
        <div className="bg-[#141210] border border-stone-800 p-4 rounded-2xl">
          <p className="text-xs text-stone-500 uppercase font-bold mb-2 tracking-wider">Total Staked</p>
          <p className="text-2xl font-bold text-stone-100">
            {loading || betStats.staked === null
              ? '—'
              : <><span className="text-stone-500 text-lg mr-1">₫</span>{betStats.staked.toLocaleString()}</>
            }
          </p>
        </div>
        <div className="bg-[#141210] border border-stone-800 p-4 rounded-2xl">
          <p className="text-xs text-stone-500 uppercase font-bold mb-2 tracking-wider flex items-center gap-1">
            <TrendingUp size={11} /> Win Rate
          </p>
          <p className="text-2xl font-bold text-stone-100">
            {loading || betStats.total === null || betStats.pending === null || betStats.won === null
              ? '—'
              : betStats.total - betStats.pending === 0
                ? '—'
                : `${((betStats.won / (betStats.total - betStats.pending)) * 100).toFixed(1)}%`
            }
          </p>
        </div>
      </section>

      {/* BETTING CLOSES SOON BANNER */}
      {(() => {
        const soonest = upcoming
          .filter(r => r.status === 'BettingOpen')
          .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))[0]
        if (!soonest) return null
        const closes = startsIn(soonest.startTime)
        if (!closes) return null
        return (
          <section className="flex items-center justify-between bg-[#1f1a0e] border border-yellow-900/50 p-4 rounded-2xl mb-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#f7e0a3]/10 rounded-full flex items-center justify-center text-[#f7e0a3] shrink-0">
                ⏱
              </div>
              <div>
                <p className="font-bold text-sm text-stone-200">
                  Betting Closes Soon: {soonest.raceName || `Race #${soonest.raceNumber}`}
                </p>
                <p className="text-xs text-[#f7e0a3] font-semibold mt-1">Closes in {closes}</p>
              </div>
            </div>
            <Link
              to="/spectator/races"
              className="px-5 py-2 bg-[#f7e0a3] text-[#110e0b] font-bold text-sm rounded-lg hover:bg-[#ebd292] transition-colors shrink-0"
            >
              Place Bet Now
            </Link>
          </section>
        )
      })()}

      {/* LIVE NOW */}
      {(loading || liveRaces.length > 0) && (
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <h3 className="text-xl font-bold text-stone-100">Live Now</h3>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[0, 1].map(i => <div key={i} className="h-24 bg-[#141210] rounded-2xl animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-4">
              {liveRaces.map(race => (
                <div key={race.raceId} className="flex items-center justify-between bg-[#141210] border border-stone-800 hover:border-stone-700 p-4 rounded-2xl transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-stone-800">
                      {race.imageUrl
                        ? <img src={race.imageUrl} alt="" className="w-full h-full object-cover block" />
                        : <div className="w-full h-full bg-gradient-to-br from-amber-950 to-stone-900 flex items-center justify-center">
                            <Trophy size={20} className="text-stone-700" />
                          </div>
                      }
                    </div>
                    <div>
                      <div className="text-xs text-red-500 font-semibold mb-1 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                        LIVE
                        <span className="text-stone-600 font-normal">Race #{race.raceNumber}</span>
                      </div>
                      <h4 className="text-base font-bold text-stone-100">{race.raceName || `Race #${race.raceNumber}`}</h4>
                      <p className="text-sm text-stone-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={11} />
                        {race.racecourseName || race.racecourse?.racecourseName || '—'}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/spectator/races/${race.raceId}/live`}
                    className="px-5 py-2 border border-red-900 text-red-400 hover:bg-red-950/50 rounded-lg transition-colors font-semibold text-sm flex items-center gap-1.5 shrink-0"
                  >
                    Watch <ChevronRight size={14} strokeWidth={2.5} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* UPCOMING RACES */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-stone-100">Upcoming Races</h3>
          <Link to="/spectator/races" className="text-[#f7e0a3] text-sm font-semibold hover:underline flex items-center gap-1">
            View All <ChevronRight size={13} strokeWidth={2.5} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0, 1, 2].map(i => <div key={i} className="bg-[#141210] rounded-2xl animate-pulse aspect-[4/3]" />)}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="text-center py-16 text-stone-600 text-sm bg-[#141210] rounded-2xl border border-stone-800">
            No upcoming races at the moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {upcoming.map(race => {
              const countdown = startsIn(race.startTime)
              return (
                <div key={race.raceId} className="bg-[#141210] border border-stone-800 hover:border-stone-700 rounded-2xl overflow-hidden flex flex-col transition-colors group">
                  {/* Image */}
                  <div className="relative h-48 bg-stone-800 overflow-hidden">
                    {race.imageUrl
                      ? <img src={race.imageUrl} alt="" className="w-full h-full object-cover block group-hover:scale-105 transition duration-300 brightness-75" />
                      : <div className="w-full h-full bg-gradient-to-br from-stone-900 to-stone-950 flex items-center justify-center">
                          <Trophy size={36} className="text-stone-700" />
                        </div>
                    }
                    {countdown && (
                      <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-stone-200">
                        ⏱ Starts in {countdown}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-5 flex-1 flex flex-col">
                    <h4 className="text-base font-bold text-stone-100 line-clamp-1">
                      {race.raceName || `Race #${race.raceNumber}`}
                    </h4>
                    <p className="text-sm text-stone-500 flex items-center gap-1 mt-1 mb-6">
                      <MapPin size={12} />
                      {race.racecourseName || race.racecourse?.racecourseName || '—'}
                    </p>
                    <div className="mt-auto flex justify-between items-center">
                      {race.status === 'BettingOpen'
                        ? <span className="px-3 py-1 border border-emerald-800 text-emerald-400 text-xs rounded-md font-semibold">Betting Open</span>
                        : <span className="px-3 py-1 border border-stone-700 text-stone-500 text-xs rounded-md font-semibold">Scheduled</span>
                      }
                      <Link
                        to="/spectator/races"
                        className="px-4 py-2 bg-[#f7e0a3] text-[#110e0b] font-bold rounded-lg hover:bg-[#ebd292] transition-colors text-sm"
                      >
                        {race.status === 'BettingOpen' ? 'Place Bet' : 'View'}
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

    </SpectatorLayout>
  )
}
