import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, TrendingUp, Calendar, Flag, Check, X, Radio, Phone } from 'lucide-react'
import JockeyLayout from '../../components/JockeyLayout'
import { getMyJockeyProfile } from '../../api/jockeyProfiles'
import { getJockeyMyRequestsPaged, acceptRegistration, rejectRegistration } from '../../api/registrations'
import { getRacesPaged } from '../../api/races'
import { useAuth } from '../../context/AuthContext'
import { useRaceHub } from '../../hooks/useRaceHub'

function StatCard({ title, value, trend, icon: Icon }) {
  return (
    <div className="bg-[#1a2130] p-6 rounded-xl border border-gray-700/50 flex-1">
      <div className="flex justify-between items-start mb-4">
        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{title}</p>
        <Icon size={18} className="text-gray-500" />
      </div>
      <div className="flex items-baseline gap-2">
        <h3 className="text-3xl font-black text-white">{value}</h3>
        {trend != null && <span className="text-emerald-400 text-xs font-bold">{trend}</span>}
      </div>
    </div>
  )
}

function Countdown({ target }) {
  const [diff, setDiff] = useState(Math.max(0, new Date(target) - Date.now()))
  useEffect(() => {
    const t = setInterval(() => setDiff(Math.max(0, new Date(target) - Date.now())), 1000)
    return () => clearInterval(t)
  }, [target])
  const d  = Math.floor(diff / 86400000)
  const h  = Math.floor((diff % 86400000) / 3600000)
  const m  = Math.floor((diff % 3600000) / 60000)
  const s  = Math.floor((diff % 60000) / 1000)
  return (
    <div className="flex gap-8 mb-6">
      {[['DAYS', d], ['HRS', h], ['MINS', m], ['SECS', s]].map(([label, val]) => (
        <div key={label}>
          <p className="text-2xl font-black text-[#facc15]">{String(val).padStart(2, '0')}</p>
          <p className="text-[9px] font-bold text-gray-500">{label}</p>
        </div>
      ))}
    </div>
  )
}

export default function JockeyDashboard() {
  const { user }    = useAuth()
  const navigate    = useNavigate()
  const [profile,    setProfile]    = useState(null)
  const [regs,       setRegs]       = useState([])
  const [publicRace, setPublicRace] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [acting,        setActing]        = useState(null)
  const [refreshKey,    setRefreshKey]    = useState(0)
  const [selectedOwner, setSelectedOwner] = useState(null)
  const [error, setError] = useState('')

  const handleRacesUpdated = useCallback(() => setRefreshKey(k => k + 1), [])

  const handleRegistrationsUpdated = useCallback((data) => {
    if (data?.jockeyId && data.jockeyId !== user?.id) return
    getJockeyMyRequestsPaged({ page: 1, pageSize: 100 }).then(r => { const d = r.data.data; setRegs(d?.items || d || []) }).catch(() => {})
  }, [user])

  useRaceHub(null, { onRacesUpdated: handleRacesUpdated, onRegistrationsUpdated: handleRegistrationsUpdated })

  const fetchRegs = () =>
    getJockeyMyRequestsPaged({ page: 1, pageSize: 100 }).then(r => { const d = r.data.data; setRegs(d?.items || d || []) }).catch(() => {})

  useEffect(() => {
    const fetchPublicRace = async () => {
      for (const status of ['Live', 'BettingOpen', 'BettingClosed', 'Scheduled']) {
        try {
          const r = await getRacesPaged({ page: 1, pageSize: 1, status })
          const items = r.data.data?.items || []
          if (items.length) { setPublicRace(items[0]); return }
        } catch {}
      }
    }
    Promise.all([
      getMyJockeyProfile().then(r => setProfile(r.data.data)).catch(() => {}),
      fetchRegs(),
      fetchPublicRace(),
    ]).finally(() => setLoading(false))
  }, [refreshKey])

  const handle = async (id, action) => {
    setActing(id)
    setError('')
    try {
      if (action === 'accept') {
        await acceptRegistration(id)
      } else {
        await rejectRegistration(id)
      }
      await fetchRegs()
    } catch (e) {
      setError(e.response?.data?.message || 'Action failed.')
    }
    finally { setActing(null) }
  }

  const totalWins  = profile?.totalWins  ?? 0
  const totalRaces = profile?.totalRaces ?? 0
  const winRate    = totalRaces > 0 ? `${Math.round((totalWins / totalRaces) * 100)}%` : '0%'

  const confirmed       = regs.filter(r => r.jockeyConfirmation === true)
  const acceptedRaceIds = new Set(confirmed.map(r => r.race?.raceId || r.raceId).filter(Boolean))
  const pending         = regs.filter(r =>
    (r.jockeyConfirmation === null || r.jockeyConfirmation === undefined) &&
    !acceptedRaceIds.has(r.race?.raceId || r.raceId) &&
    !['Completed', 'Finished', 'Cancelled'].includes(r.race?.status)
  )

  const STATUS_PRIORITY = { Live: 0, BettingOpen: 1, BettingClosed: 2, Scheduled: 3 }
  const myFeatured = [...regs]
    .filter(r => ['Live', 'BettingOpen', 'BettingClosed', 'Scheduled'].includes(r.race?.status))
    .sort((a, b) => {
      const pa = STATUS_PRIORITY[a.race?.status] ?? 9
      const pb = STATUS_PRIORITY[b.race?.status] ?? 9
      if (pa !== pb) return pa - pb
      return new Date(a.race?.startTime) - new Date(b.race?.startTime)
    })[0]

  // wrap publicRace into same shape as myFeatured for unified display
  const featuredRace = myFeatured || (publicRace ? { race: publicRace, horse: null, gateNumber: null, _isPublic: true } : null)
  const liveRace = featuredRace?.race?.status === 'Live' ? featuredRace : null

  const displayName = user?.fullName || user?.name || profile?.fullName || 'Jockey'

  return (
    <JockeyLayout>
      <div className="p-4 md:p-8 space-y-6 md:space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[#facc15] mb-1">Dashboard Overview</h1>
            <p className="text-gray-400 text-sm">Welcome back, {displayName}. Here is your current performance outlook.</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-red-500/10 border border-red-500/20 text-red-400">
            {error}
            <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
          </div>
        )}

        {/* Live Race Banner */}
        {liveRace && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-red-950/40 border border-red-900/60 rounded-2xl px-4 md:px-6 py-4">
            <div className="flex items-center gap-3">
              <Radio size={18} className="text-red-400 animate-pulse shrink-0" />
              <div>
                <p className="text-xs text-red-400 font-bold uppercase tracking-wider">Race In Progress</p>
                <p className="text-white font-bold text-sm mt-0.5">
                  {liveRace.race?.raceName || `Race #${liveRace.race?.raceNumber}`}{liveRace.horse?.horseName ? ` · ${liveRace.horse.horseName}` : ''}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/jockey/races/${liveRace.race?.raceId}/live`)}
              className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-xl transition-colors shrink-0"
            >
              Watch Live
            </button>
          </div>
        )}

        {/* Stats */}
        {loading ? (
          <div className="flex items-center justify-center h-24">
            <div className="w-8 h-8 border-2 border-gray-700 border-t-yellow-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Total Wins"       value={totalWins}          icon={Trophy}     />
            <StatCard title="Win Rate"         value={winRate}            icon={TrendingUp} />
            <StatCard title="Confirmed Races"  value={confirmed.length}   icon={Calendar}   />
            <StatCard title="Total Races"      value={totalRaces}         icon={Flag}       />
          </div>
        )}

        {/* Main row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Featured / Next Race */}
          <div className="lg:col-span-2 bg-[#1a2130] rounded-2xl overflow-hidden border border-gray-700/50 flex min-h-[220px]">
            {featuredRace ? (
              <>
                <div className="w-1/3 bg-gray-800 relative shrink-0">
                  {(featuredRace.horse?.imageUrl || featuredRace.race?.imageUrl)
                    ? <img src={featuredRace.horse?.imageUrl || featuredRace.race?.imageUrl} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-5xl bg-gray-900">🐎</div>
                  }
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded w-fit mb-2 uppercase
                      ${featuredRace.race?.status === 'Live' ? 'bg-red-600 text-white'
                      : featuredRace.race?.status === 'BettingOpen' ? 'bg-green-700 text-white'
                      : featuredRace.race?.status === 'BettingClosed' ? 'bg-orange-700 text-white'
                      : 'bg-[#facc15] text-black'}`}>
                      {featuredRace.race?.status === 'Live' ? '● Live Now'
                        : featuredRace.race?.status === 'BettingOpen' ? 'Betting Open'
                        : featuredRace.race?.status === 'BettingClosed' ? 'Betting Closed'
                        : 'Scheduled'}
                    </span>
                    <p className="font-bold text-sm text-white">{featuredRace.horse?.horseName || '—'}</p>
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-white">
                          {featuredRace.race?.raceName || `Race #${featuredRace.race?.raceNumber || '—'}`}
                        </h2>
                        <p className="text-xs text-gray-400 mt-1">
                          📍 {featuredRace.race?.racecourseName || '—'}
                        </p>
                        {featuredRace.owner?.fullName && (
                          <p className="text-xs text-gray-400 mt-1">
                            🤝 Owner: <span className="text-gray-300 font-medium">{featuredRace.owner.fullName}</span>
                          </p>
                        )}
                      </div>
                      {featuredRace.gateNumber && (
                        <span className="text-[10px] font-black uppercase text-gray-500">Gate #{featuredRace.gateNumber}</span>
                      )}
                    </div>
                    {liveRace
                      ? <button
                          onClick={() => navigate(`/jockey/races/${liveRace.race?.raceId}/live`)}
                          className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-xl transition-colors w-fit"
                        >
                          <Radio size={14} className="animate-pulse" /> Watch Live
                        </button>
                      : featuredRace.race?.startTime
                        ? <Countdown target={featuredRace.race.startTime} />
                        : null
                    }
                  </div>
                  {featuredRace.race?.startTime && (
                    <p className="text-xs text-gray-400">
                      {new Date(featuredRace.race.startTime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <Calendar size={32} className="text-gray-700 mb-3" />
                <p className="text-gray-500 text-sm font-medium">No races available.</p>
                <p className="text-gray-600 text-xs mt-1">No upcoming races at the moment.</p>
              </div>
            )}
          </div>

          {/* Pending Invitations */}
          <div className="bg-[#1a2130] rounded-2xl border border-gray-700/50 p-6 flex flex-col">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">Pending Invitations</h3>
              {pending.length > 0 && (
                <span className="bg-[#facc15] text-black text-[9px] font-black px-2 py-0.5 rounded">
                  {pending.length} NEW
                </span>
              )}
            </div>

            {pending.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">No pending invitations.</div>
            ) : (
              <div className="space-y-4 overflow-y-auto">
                {pending.slice(0, 4).map(item => (
                  <div key={item.registrationId} className="border-b border-gray-700/60 pb-4 last:border-0 last:pb-0">
                    {/* Owner info */}
                    {item.owner && (
                      <button
                        onClick={() => setSelectedOwner(item.owner)}
                        className="flex items-center gap-2 mb-2 group/o hover:opacity-80 transition-opacity"
                      >
                        <div className="w-6 h-6 rounded-full bg-gray-700 border border-gray-600 overflow-hidden flex items-center justify-center text-[10px] shrink-0">
                          {item.owner.imageUrl
                            ? <img src={item.owner.imageUrl} alt="" className="w-full h-full object-cover" />
                            : <span className="text-gray-400 font-bold">{item.owner.fullName?.[0] || '?'}</span>}
                        </div>
                        <span className="text-[10px] text-gray-400 group-hover/o:text-white transition-colors font-medium">
                          {item.owner.fullName || '—'}
                        </span>
                      </button>
                    )}
                    <div className="flex justify-between text-xs mb-1">
                      <p className="font-bold text-gray-200">{item.horse?.horseName || '—'}</p>
                      <p className="text-gray-500">
                        {item.race?.startTime
                          ? new Date(item.race.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : '—'}
                      </p>
                    </div>
                    <p className="text-[10px] text-gray-400 mb-3">
                      {item.race?.raceName || `Race #${item.race?.raceNumber || '—'}`}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handle(item.registrationId, 'accept')}
                        disabled={acting === item.registrationId}
                        className="flex-1 flex items-center justify-center gap-1 bg-[#facc15] text-black text-[10px] font-black py-1.5 rounded hover:bg-yellow-400 transition-colors disabled:opacity-50"
                      >
                        <Check size={11} /> Accept
                      </button>
                      <button
                        onClick={() => handle(item.registrationId, 'reject')}
                        disabled={acting === item.registrationId}
                        className="flex-1 flex items-center justify-center gap-1 bg-[#2a303f] text-gray-300 text-[10px] font-black py-1.5 rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
                      >
                        <X size={11} /> Decline
                      </button>
                    </div>
                  </div>
                ))}
                {pending.length > 4 && (
                  <button onClick={() => navigate('/jockey/requests')} className="w-full text-[10px] text-gray-500 hover:text-yellow-500 text-center pt-1 transition-colors">
                    +{pending.length - 4} more in Race Requests →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Owner Detail Modal */}
      {selectedOwner && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedOwner(null)}>
          <div className="bg-[#161a23] border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-base font-bold text-white">Owner Info</h3>
              <button onClick={() => setSelectedOwner(null)} className="text-gray-500 hover:text-gray-300 transition-colors">✕</button>
            </div>
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-full bg-gray-800 border border-gray-700 overflow-hidden flex items-center justify-center shrink-0">
                {selectedOwner.imageUrl
                  ? <img src={selectedOwner.imageUrl} alt="" className="w-full h-full object-cover" />
                  : <span className="text-gray-400 font-black text-xl">{selectedOwner.fullName?.[0] || '?'}</span>}
              </div>
              <div>
                <p className="font-bold text-white text-lg leading-tight">{selectedOwner.fullName || '—'}</p>
                {selectedOwner.phone && (
                  <p className="flex items-center gap-1.5 text-gray-400 text-xs mt-1">
                    <Phone size={11} /> {selectedOwner.phone}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </JockeyLayout>
  )
}
