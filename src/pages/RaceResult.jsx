import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Trophy, TrendingUp, Wallet, AlertTriangle } from 'lucide-react'
import SpectatorLayout from '../components/SpectatorLayout'
import { getRace, getRaceResults, getRaceRegistrations } from '../api/races'
import { getMyBetsPaged } from '../api/bets'

/* ─── Podium ─────────────────────────────────────────────────────── */
function Podium({ top3 }) {
  if (top3.length === 0) return null
  const [first, second, third] = top3
  const order = [second, first, third].filter(Boolean)

  const heights = { 1: 'h-24', 2: 'h-16', 3: 'h-12' }
  const colors  = {
    1: { ring: 'ring-[#f7e0a3]', bg: 'bg-[#f7e0a3]/10', text: 'text-[#f7e0a3]', label: 'bg-[#f7e0a3] text-[#110e0b]' },
    2: { ring: 'ring-stone-400',  bg: 'bg-stone-400/10',  text: 'text-stone-300',  label: 'bg-stone-400 text-black'     },
    3: { ring: 'ring-amber-700',  bg: 'bg-amber-700/10',  text: 'text-amber-600',  label: 'bg-amber-700 text-white'     },
  }

  return (
    <div className="flex items-end justify-center gap-3 mb-8 px-4">
      {order.map(item => {
        const pos = item.finalPosition ?? item.rank ?? item.position
        const c   = colors[pos] || colors[3]
        const name = item.horse?.horseName || item.horseName || `Horse #${item.gateNumber}`
        const img  = item.horse?.imageUrl  || item.imageUrl
        return (
          <div key={item.registrationId ?? pos} className="flex flex-col items-center gap-2 flex-1 max-w-[140px]">
            {/* Avatar */}
            <div className={`w-16 h-16 rounded-full overflow-hidden border-2 ${c.ring} ${c.bg} shrink-0 flex items-center justify-center`}>
              {img
                ? <img src={img} alt={name} className="w-full h-full object-cover" />
                : <span className="text-2xl">🐎</span>}
            </div>
            {/* Name */}
            <p className={`text-xs font-bold text-center leading-tight ${c.text} truncate w-full text-center`}>{name}</p>
            {/* Podium block */}
            <div className={`w-full ${heights[pos] || 'h-10'} ${c.bg} border-t-2 ${c.ring} rounded-t-lg flex items-start justify-center pt-2`}>
              <span className={`text-sm font-black px-2 py-0.5 rounded ${c.label}`}>#{pos}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Main ───────────────────────────────────────────────────────── */
export default function RaceResult({ Layout = SpectatorLayout, backUrl = '/spectator/races' }) {
  const { raceId } = useParams()
  const navigate   = useNavigate()

  const [race,    setRace]    = useState(null)
  const [results, setResults] = useState([])
  const [regs,    setRegs]    = useState([])
  const [bets,    setBets]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getRace(raceId),
      getRaceResults(raceId).catch(() => null),
      getRaceRegistrations(raceId).catch(() => null),
      getMyBetsPaged({ page: 1, pageSize: 50 }).catch(() => null),
    ]).then(([raceRes, resultsRes, regsRes, betsRes]) => {
      setRace(raceRes.data.data || raceRes.data)
      if (resultsRes) setResults(resultsRes.data.data || [])
      if (regsRes)    setRegs(regsRes.data.data || [])
      if (betsRes)    setBets(betsRes.data.data?.items || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [raceId])

  // Build a lookup from registrationId → full reg data (jockey, owner, horse)
  const regMap = Object.fromEntries(regs.map(r => [r.registrationId, r]))

  const standings = [...results]
    .sort((a, b) => (a.finalPosition ?? a.rank ?? a.position ?? 99)
                  - (b.finalPosition ?? b.rank ?? b.position ?? 99))
    .map(item => ({ ...regMap[item.registrationId], ...item }))

  // fallback: if no API results, use registrations as unranked list
  const displayList = standings.length > 0 ? standings : regs.map((r, i) => ({ ...r, finalPosition: i + 1 }))
  const top3        = displayList.filter(r => (r.finalPosition ?? r.rank ?? r.position) <= 3)

  const regIds  = new Set(regs.map(r => r.registrationId))
  const raceBets = bets.filter(b => b.raceId === raceId || regIds.has(b.registrationId))

  const totalPool    = raceBets.reduce((s, b) => s + (b.betAmount || 0), 0)
  const totalPayout  = raceBets.reduce((s, b) => s + (b.actualPayout || 0), 0)
  const wonCount     = raceBets.filter(b => (b.status || '').toLowerCase() === 'won').length

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-stone-700 border-t-[#f7e0a3] rounded-full animate-spin" />
      </div>
    </Layout>
  )

  return (
    <Layout>
      <div className="p-6 max-w-2xl mx-auto space-y-6 pb-12">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(backUrl)}
            className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="font-black text-white text-lg truncate">
              Race #{race?.raceNumber}{race?.raceName ? ` — ${race.raceName}` : ''}
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">{race?.racecourseName || ''}</p>
          </div>
          <span className="ml-auto shrink-0 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-stone-800 text-stone-400 border border-stone-700">
            Finished
          </span>
        </div>

        {/* Stewards' Review Banner */}
        {race?.hasUnresolvedReports && (
          <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
            <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-amber-400 uppercase tracking-wider">Under Stewards' Review</p>
              <p className="text-[11px] text-amber-400/70 mt-0.5">
                These results are provisional. An official inquiry is in progress — final standings may change.
              </p>
            </div>
          </div>
        )}

        {/* Podium */}
        {top3.length > 0 && (
          <div className="bg-[#1c1814] border border-stone-800/60 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Trophy size={16} className="text-[#f7e0a3]" />
              <h2 className="text-xs font-black uppercase tracking-wider text-stone-400">Podium</h2>
            </div>
            <Podium top3={top3} />
          </div>
        )}

        {/* Full Results Table */}
        <div className="bg-[#1c1814] border border-stone-800/60 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-800/60 flex items-center gap-2">
            <TrendingUp size={15} className="text-stone-400" />
            <h2 className="text-xs font-black uppercase tracking-wider text-stone-400">Final Standings</h2>
            <span className="ml-auto text-[10px] text-stone-600 font-medium">{displayList.length} runners</span>
          </div>

          {displayList.length === 0 ? (
            <div className="text-center py-10 text-stone-500 text-sm">No results available.</div>
          ) : (
            <div className="divide-y divide-stone-800/60">
              {displayList.map((item, i) => {
                const pos     = item.finalPosition ?? item.rank ?? item.position ?? (i + 1)
                const horse   = item.horse  || {}
                const name    = horse.horseName || item.horseName || `Horse #${item.gateNumber ?? '?'}`
                const jockey  = item.jockeyName || item.jockey?.fullName || '—'
                const owner   = item.ownerName  || item.owner?.fullName  || '—'
                const gate    = item.gateNumber ?? '?'
                const img     = horse.imageUrl || item.imageUrl
                const time    = item.finishTime || item.raceTime || null
                const isMedal = pos <= 3
                return (
                  <div key={item.registrationId ?? i} className="flex items-center gap-3 px-5 py-3 hover:bg-stone-800/20 transition-colors">
                    {/* Position badge */}
                    <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-black
                      ${pos === 1 ? 'bg-[#f7e0a3] text-[#110e0b]'
                      : pos === 2 ? 'bg-stone-300 text-black'
                      : pos === 3 ? 'bg-amber-700 text-white'
                      : 'bg-stone-800 text-stone-400'}`}>
                      {pos}
                    </div>

                    {/* Horse image */}
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-800 shrink-0 flex items-center justify-center text-lg">
                      {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : '🐎'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-stone-100 truncate">{name}</p>
                      <p className="text-[10px] text-stone-500 mt-0.5 truncate">
                        🏇 {jockey} · Gate #{gate}
                      </p>
                      <p className="text-[10px] text-stone-600 mt-0.5 truncate">
                        👤 {owner}
                      </p>
                    </div>

                    {/* Right side */}
                    <div className="text-right shrink-0">
                      {time && <p className="text-xs font-bold text-stone-300">{time}</p>}
                      {isMedal && (
                        <Trophy size={13} className={
                          pos === 1 ? 'text-[#f7e0a3] ml-auto mt-0.5'
                          : pos === 2 ? 'text-stone-300 ml-auto mt-0.5'
                          : 'text-amber-700 ml-auto mt-0.5'
                        } />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* My Bets Summary */}
        {raceBets.length > 0 && (
          <div className="bg-[#1c1814] border border-stone-800/60 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-800/60 flex items-center gap-2">
              <Wallet size={15} className="text-stone-400" />
              <h2 className="text-xs font-black uppercase tracking-wider text-stone-400">My Wagers</h2>
              {wonCount > 0 && (
                <span className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full bg-[#f7e0a3]/10 text-[#f7e0a3]">
                  {wonCount} Win{wonCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 divide-x divide-stone-800/60 border-b border-stone-800/60">
              {[
                { label: 'Total Staked', value: `${totalPool.toLocaleString()} VND` },
                { label: 'Payout',       value: totalPayout > 0 ? `${Math.round(totalPayout).toLocaleString()} VND` : '—' },
                { label: 'Result',       value: totalPayout > totalPool ? `+${Math.round(totalPayout - totalPool).toLocaleString()}` : totalPool > 0 ? `-${(totalPool - totalPayout).toLocaleString()}` : '—',
                  accent: totalPayout > totalPool },
              ].map(s => (
                <div key={s.label} className="px-4 py-3 text-center">
                  <p className="text-[9px] text-stone-500 font-bold uppercase tracking-wider mb-1">{s.label}</p>
                  <p className={`text-sm font-black ${s.accent ? 'text-[#f7e0a3]' : 'text-stone-200'}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Bet list */}
            <div className="divide-y divide-stone-800/40">
              {raceBets.map(bet => {
                const status = (bet.status || '').toLowerCase()
                return (
                  <div key={bet.betId} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-bold text-stone-100">{bet.horseName || '—'}</p>
                      <p className="text-[10px] text-stone-500 mt-0.5">
                        {bet.betType} · {(bet.betAmount || 0).toLocaleString()} VND
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                        status === 'won'  ? 'bg-[#f7e0a3]/10 text-[#f7e0a3]' :
                        status === 'lost' ? 'bg-red-500/10 text-red-400'      :
                        'bg-stone-800 text-stone-500'
                      }`}>
                        {bet.status || 'Pending'}
                      </span>
                      {bet.actualPayout > 0 && (
                        <p className="text-[10px] text-[#f7e0a3] mt-1">
                          +{Math.round(bet.actualPayout).toLocaleString()} VND
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <button onClick={() => navigate(backUrl)}
          className="w-full py-3 bg-[#f7e0a3] text-[#110e0b] font-bold rounded-xl text-sm hover:bg-[#ebd292] transition-colors">
          Back to Races
        </button>

      </div>
    </Layout>
  )
}
