import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Radio, Trophy, TrendingUp } from 'lucide-react'
import SpectatorLayout from '../../components/SpectatorLayout'
import { getRace, getRaceRegistrations } from '../../api/races'
import { getMyBetsPaged } from '../../api/bets'
import { useRaceHub } from '../../hooks/useRaceHub'

const STATUS_COLOR = {
  Live:          'bg-red-600',
  BettingOpen:   'bg-emerald-600',
  BettingClosed: 'bg-orange-600',
  Scheduled:     'bg-blue-700',
}

function TrackVisualization({ tracks }) {
  const sorted = [...tracks].sort((a, b) => b.progress - a.progress)

  return (
    <div
      className="relative bg-[#14310f] border border-stone-700/60 rounded-xl overflow-hidden mb-6"
      style={{ height: `${Math.max(160, tracks.length * 44 + 24)}px` }}
    >
      {tracks.map((_, i) => (
        <div
          key={i}
          className="absolute left-0 right-0 border-b border-[#1a4a14]/40"
          style={{ top: `${((i + 1) / (tracks.length + 1)) * 100}%` }}
        />
      ))}
      <div className="absolute right-6 top-0 bottom-0 w-0.5 bg-white/30 border-dashed" />

      {tracks.map((h) => {
        const laneY = ((h.lane + 1) / (tracks.length + 1)) * 100
        const posX  = Math.min(88, h.progress * 88)
        const rank  = sorted.findIndex(s => s.registrationId === h.registrationId)
        return (
          <div
            key={h.registrationId}
            className="absolute flex items-center gap-1 transition-all duration-150"
            style={{ top: `calc(${laneY}% - 13px)`, left: `${posX}%` }}
          >
            <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black shadow-md
              ${h.isFinished
                ? 'bg-stone-500 text-white'
                : rank === 0 ? 'bg-[#f7e0a3] text-black'
                : rank === 1 ? 'bg-stone-300 text-black'
                : rank === 2 ? 'bg-amber-700 text-white'
                : 'bg-stone-700 text-stone-300'}`}>
              {rank + 1}
            </div>
            <span className="text-[9px] font-bold text-white bg-black/70 px-1 py-0.5 rounded whitespace-nowrap hidden sm:block">
              {h.horse?.horseName || `#${h.gateNumber}`}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function LiveRace({ Layout = SpectatorLayout, backUrl = '/spectator/dashboard' }) {
  const { raceId } = useParams()
  const navigate   = useNavigate()

  const [race,       setRace]       = useState(null)
  const [regs,       setRegs]       = useState([])
  const [bets,       setBets]       = useState([])
  const [pools,      setPools]      = useState([])
  const [horses,     setHorses]     = useState([])
  const [liveStatus, setLiveStatus] = useState(null)
  const [loading,    setLoading]    = useState(true)

  const refetchTimer = useRef(null)

  const fetchBets = useCallback(() => {
    getMyBetsPaged({ page: 1, pageSize: 50 })
      .then(r => setBets(r.data.data?.items || []))
      .catch(() => {})
  }, [])

  const handlePoolUpdate = useCallback((p) => {
    setPools(p)
    clearTimeout(refetchTimer.current)
    refetchTimer.current = setTimeout(fetchBets, 600)
  }, [fetchBets])

  const handleRaceUpdate = useCallback((data) => {
    if (data.horses) setHorses(data.horses)
    if (data.status) setLiveStatus(data.status)
  }, [])

  useRaceHub(raceId, { onPoolUpdate: handlePoolUpdate, onRaceUpdate: handleRaceUpdate })

  useEffect(() => () => clearTimeout(refetchTimer.current), [])

  useEffect(() => {
    Promise.all([
      getRace(raceId),
      getRaceRegistrations(raceId),
      getMyBetsPaged({ page: 1, pageSize: 50 }),
    ]).then(([raceRes, regsRes, betsRes]) => {
      setRace(raceRes.data.data || raceRes.data)
      setRegs(regsRes.data.data || [])
      setBets(betsRes.data.data?.items || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [raceId])

  const status     = liveStatus || race?.status || 'Live'
  const isFinished = ['finished', 'completed'].includes(status.toLowerCase())

  useEffect(() => {
    if (isFinished && !loading) {
      const role = backUrl.split('/')[1]
      navigate(`/${role}/races/${raceId}/results`, { replace: true })
    }
  }, [isFinished, loading, raceId, backUrl, navigate])

  const regIds   = new Set(regs.map(r => r.registrationId))
  const raceBets = bets.filter(b => b.raceId === raceId || regIds.has(b.registrationId))

  const findLive = (reg) =>
    horses.find(h =>
      h.id             === reg.horse?.id         ||
      h.id             === reg.horse?.horseId    ||
      h.horseId        === reg.horse?.id         ||
      h.horseId        === reg.horse?.horseId    ||
      h.registrationId === reg.registrationId
    )

  const tracks  = regs.map((reg, i) => {
    const live = findLive(reg)
    return { ...reg, progress: live?.progress ?? 0, isFinished: live?.isFinished ?? false, lane: i }
  })

  const leaders = [...tracks].sort((a, b) => b.progress - a.progress)

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-stone-700 border-t-[#f7e0a3] rounded-full animate-spin" />
      </div>
    </Layout>
  )

  return (
    <Layout>
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-bold text-stone-100 text-base truncate">
                Race #{race?.raceNumber}{race?.raceName ? ` — ${race.raceName}` : ''}
              </h1>
              <span className={`flex items-center gap-1 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase ${STATUS_COLOR[status] || 'bg-red-600'}`}>
                <Radio size={10} className="animate-pulse" /> {status}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">{race?.racecourseName || '—'}</p>
          </div>
        </div>

        {/* Track */}
        {tracks.length > 0 && <TrackVisualization tracks={tracks} />}

        {/* Current Leaders */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">Current Leaders</h2>
            <span className="text-xs font-bold text-[#f7e0a3] flex items-center gap-1">
              <TrendingUp size={12} /> {regs.length} runners
            </span>
          </div>
          <div className="space-y-2">
            {leaders.map((reg, i) => (
              <div key={reg.registrationId} className="bg-[#1c1814] border border-stone-800/60 rounded-xl p-3 flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-black
                  ${i === 0 ? 'bg-[#f7e0a3] text-black' : i === 1 ? 'bg-stone-300 text-black' : i === 2 ? 'bg-amber-700 text-white' : 'bg-stone-800 text-stone-400'}`}>
                  {i + 1}
                </div>
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-800 shrink-0">
                  {reg.horse?.imageUrl
                    ? <img src={reg.horse.imageUrl} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-lg">🐎</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-stone-100 truncate">{reg.horse?.horseName || `Horse #${reg.gateNumber}`}</p>
                  <p className="text-[10px] text-stone-500">{reg.jockeyName || '—'} · Gate #{reg.gateNumber ?? '?'}</p>
                </div>
                {i < 3 && (
                  <Trophy size={14} className={i === 0 ? 'text-[#f7e0a3]' : i === 1 ? 'text-stone-300' : 'text-amber-700'} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Live Pool */}
        {pools.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">Live Pool</h2>
            <div className="grid grid-cols-3 gap-2">
              {pools.map(p => (
                <div key={p.betType} className="bg-[#1c1814] border border-stone-800/60 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-stone-500 font-bold uppercase mb-1">{p.betType}</p>
                  <p className="text-sm font-black text-[#f7e0a3]">{(p.totalAmount || 0).toLocaleString()}</p>
                  <p className="text-[9px] text-stone-600">VND</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Wagers */}
        {raceBets.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">My Wagers</h2>
            <div className="space-y-2">
              {raceBets.map(bet => (
                <div key={bet.betId} className="bg-[#1c1814] border border-stone-800/60 rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-sm text-stone-100">{bet.horseName}</p>
                    <p className="text-[10px] text-stone-500 mt-0.5">
                      {bet.betType} · {bet.betAmount?.toLocaleString()} VND
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${
                      (bet.status || '').toLowerCase() === 'won'  ? 'bg-[#f7e0a3]/10 text-[#f7e0a3]' :
                      (bet.status || '').toLowerCase() === 'lost' ? 'bg-red-500/10 text-red-400' :
                      'bg-stone-800 text-stone-400'
                    }`}>
                      {bet.status || 'Active'}
                    </span>
                    {bet.estimatedPayout > 0 && (
                      <p className="text-[10px] text-stone-500 mt-1">Est: {Math.round(bet.estimatedPayout).toLocaleString()} VND</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </Layout>
  )
}
