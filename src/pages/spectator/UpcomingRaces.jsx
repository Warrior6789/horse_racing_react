import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Search, X, Flag, Bell, Trophy, ChevronLeft, ChevronRight, Zap, Radio } from 'lucide-react'
import SpectatorLayout from '../../components/SpectatorLayout'
import { useAuth } from '../../context/AuthContext'
import { getRacesPaged, getRaceRegistrations } from '../../api/races'
import { placeBet } from '../../api/bets'
import { getBalance } from '../../api/payments'
import { useRaceHub } from '../../hooks/useRaceHub'

const BET_TYPES = ['Win', 'Place', 'Show']
const TABS = ['All', 'Scheduled', 'Open For Betting', 'Betting Closed', 'Live', 'Finished']

function computeState(race) {
  const sl = (race.status || '').toLowerCase()
  if (['completed', 'finished'].includes(sl))
    return { state: 'finished', stateText: 'FINISHED', statusLabel: 'STATUS', statusValue: 'Finished' }
  if (sl === 'cancelled')
    return { state: 'finished', stateText: 'CANCELLED', statusLabel: 'STATUS', statusValue: 'Cancelled' }
  if (sl === 'live')
    return { state: 'progress', stateText: 'LIVE', statusLabel: 'PROGRESS', statusValue: 'Live' }
  if (sl === 'bettingopen') {
    const dt = race.startTime ? new Date(race.startTime) : null
    const startVal = dt
      ? `${dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : 'TBD'
    return { state: 'open', stateText: 'OPEN FOR BETTING', statusLabel: 'STARTS AT', statusValue: startVal }
  }
  if (sl === 'bettingclosed')
    return { state: 'closed', stateText: 'BETTING CLOSED', statusLabel: 'STATUS', statusValue: 'Closed' }
  const startVal = race.startTime
    ? new Date(race.startTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'TBD'
  return { state: 'scheduled', stateText: 'SCHEDULED', statusLabel: 'START TIME', statusValue: startVal }
}

function useCountdown(startTime) {
  const [display, setDisplay] = useState('')
  const [isLive, setIsLive] = useState(false)
  useEffect(() => {
    if (!startTime) return
    const tick = () => {
      const diff = new Date(startTime) - Date.now()
      if (diff <= 0) { setIsLive(true); setDisplay('Live') }
      else {
        setIsLive(false)
        const m = Math.floor(diff / 60000)
        const s = Math.floor((diff % 60000) / 1000)
        setDisplay(`${String(m).padStart(2, '0')}m : ${String(s).padStart(2, '0')}s`)
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startTime])
  return { display, isLive }
}

const QUICK_AMOUNTS = [10000, 50000, 100000, 500000]

function BetSlipModal({ race, reg, onClose, onSuccess }) {
  const [betType, setBetType]     = useState('Win')
  const [rawAmount, setRawAmount] = useState('')
  const [focused,   setFocused]   = useState(false)
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [done, setDone]           = useState(false)
  const numAmount = Number(rawAmount) || 0

  const displayValue = focused
    ? rawAmount
    : (numAmount > 0 ? numAmount.toLocaleString('en-US') : '')

  const handleAmountChange = (e) => {
    setRawAmount(e.target.value.replace(/[^0-9]/g, ''))
  }

  const submit = async () => {
    if (numAmount <= 0) { setError('Enter a valid stake.'); return }
    setError(''); setLoading(true)
    try {
      await placeBet({ registrationId: reg.registrationId, betType, betAmount: numAmount })
      setDone(true)
      onSuccess?.()
    } catch (e) { setError(e.response?.data?.message || 'Failed to place bet.') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="bg-[#1c1814] w-full max-w-sm p-6 rounded-2xl border border-stone-700/60 text-stone-100 font-sans">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-stone-100">Place Your Bet</h2>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300 transition-colors"><X size={18} /></button>
        </div>

        {done ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
              <Trophy size={26} className="text-emerald-400" />
            </div>
            <p className="font-bold text-stone-100">Bet Placed!</p>
            <p className="text-xs text-stone-500">Good luck on your wager.</p>
            <button onClick={onClose} className="text-xs font-bold text-[#f7e0a3] hover:underline">Close</button>
          </div>
        ) : (
          <>
            {/* Horse Info */}
            <div className="bg-[#110e0b] p-4 rounded-xl mb-6 border border-stone-800/60">
              <div className="flex gap-3 items-center">
                <div className="w-12 h-12 rounded-lg bg-stone-800 overflow-hidden shrink-0 flex items-center justify-center text-xl">
                  {reg.horse?.imageUrl
                    ? <img src={reg.horse.imageUrl} alt="" className="w-full h-full object-cover" />
                    : '🐎'}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-stone-100 truncate">{reg.horse?.horseName || '—'}</h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {race.raceName || `Race #${race.raceNumber}`} · {race.racecourseName || '—'}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <span className="bg-[#f7e0a3] text-[#110e0b] text-[10px] font-black px-2 py-0.5 rounded">
                      Gate #{reg.gateNumber ?? '?'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bet Types */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {BET_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setBetType(t)}
                  className={`py-2 text-xs font-bold rounded-lg transition-colors ${
                    betType === t ? 'bg-[#f7e0a3] text-[#110e0b]' : 'bg-[#110e0b] text-stone-500 hover:text-stone-200 border border-stone-800/60'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Amount */}
            <div className="mb-6">
              <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-2">Wager Amount</p>
              <div className="bg-[#110e0b] p-4 rounded-lg mb-3 flex items-baseline gap-2 border border-stone-800/60">
                <input
                  type="text" inputMode="numeric"
                  value={displayValue}
                  onChange={handleAmountChange}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="0"
                  className="bg-transparent text-2xl font-black text-stone-100 w-full outline-none placeholder:text-stone-700"
                />
                <span className="text-sm text-stone-500 font-medium shrink-0">VND</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {QUICK_AMOUNTS.map(val => (
                  <button
                    key={val}
                    onClick={() => setRawAmount(String(val))}
                    className={`py-2 text-[10px] font-bold rounded-lg transition-colors ${
                      numAmount === val ? 'bg-[#f7e0a3] text-[#110e0b]' : 'bg-[#110e0b] text-stone-500 hover:text-stone-200 border border-stone-800/60'
                    }`}
                  >
                    {val >= 1000 ? `${val/1000}k` : val}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 border border-stone-700 rounded-lg font-bold text-sm text-stone-400 hover:bg-stone-800/40 transition-colors">
                Cancel
              </button>
              <button onClick={submit} disabled={loading || numAmount <= 0}
                className="flex-[2] py-3 bg-[#f7e0a3] text-black rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#ebd292] transition-colors disabled:opacity-60">
                <Zap size={16} />
                {loading ? 'Placing…' : 'Confirm Bet'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function RaceDetailScreen({ race, mode, canBetByRole, onClose, onBetSuccess }) {
  const navigate = useNavigate()
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [betReg, setBetReg] = useState(null)
  const canBet  = mode === 'bet' && canBetByRole
  const isLive  = ['Live', 'Finished'].includes(race.status)
  const raceIsOpen = (race.status || '').toLowerCase() === 'bettingopen'

  useEffect(() => {
    getRaceRegistrations(race.raceId)
      .then(r => {
        const payload = r.data?.data
        setRegistrations(Array.isArray(payload) ? payload : payload?.items || r.data?.items || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [race.raceId])

  return (
    <div className="-mx-8 -mt-8 min-h-screen bg-[#110e0b]">
      {/* Hero Banner */}
      <div className="relative h-[520px] overflow-hidden">
        {race.imageUrl
          ? <img src={race.imageUrl} alt={race.raceName} className="w-full h-full object-cover object-top block" />
          : <div className="w-full h-full bg-gradient-to-br from-amber-950/60 to-[#110e0b]" />
        }
        <div className="absolute inset-0 bg-gradient-to-t from-[#110e0b] via-[#110e0b]/20 to-transparent" />

        {/* Back button */}
        <button onClick={onClose}
          className="absolute top-4 left-4 flex items-center gap-1.5 bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors border border-white/10">
          <ChevronLeft size={14} /> Back to Races
        </button>

        {/* Watch Live button */}
        {isLive && (
          <button onClick={() => navigate(`/spectator/races/${race.raceId}/live`)}
            className="absolute top-4 right-4 flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors border border-red-500/40">
            <Radio size={12} className="animate-pulse" /> Watch Live
          </button>
        )}

        {/* Race info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="bg-[#f7e0a3] text-[#110e0b] text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Flag size={10} fill="currentColor" /> Race #{race.raceNumber}
            </span>
            {canBet && (
              <span className="bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                OPEN FOR BETTING
              </span>
            )}
            {race.maxParticipants && (
              <span className="bg-black/50 backdrop-blur-sm border border-white/10 text-white text-sm font-bold px-4 py-1.5 rounded-full flex items-center gap-2">
                🐎 <span>{registrations.length} / {race.maxParticipants} <span className="text-stone-400 font-medium">slots</span></span>
              </span>
            )}
          </div>
          <h1 className="text-5xl font-black text-white mb-1 leading-tight">{race.raceName || `Race #${race.raceNumber}`}</h1>
          <p className="text-sm text-stone-300 flex items-center gap-1.5">
            <MapPin size={12} className="text-stone-400" />
            {race.racecourseName || race.racecourse?.racecourseName || 'TBD'}
            {race.trackLength ? ` · ${race.trackLength}m` : ''}
          </p>
        </div>
      </div>

      {/* Role-based betting restriction notice */}
      {!canBetByRole && raceIsOpen && (
        <div className="mx-6 mt-4 bg-amber-900/20 border border-amber-700/40 text-amber-300 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
          <span className="shrink-0">⚠️</span>
          <span>Tài khoản của bạn đã được nâng cấp lên role khác. Chỉ tài khoản Spectator mới có thể đặt cược.</span>
        </div>
      )}

      {/* Horses grid */}
      <div className="p-6">
        <h2 className="text-base font-bold text-stone-100 mb-4">
          Participating Horses
          <span className="ml-2 text-xs font-normal text-stone-500">({registrations.length} runners)</span>
        </h2>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[0,1,2,3].map(i => <div key={i} className="aspect-[3/4] bg-[#1c1814] rounded-xl animate-pulse" />)}
          </div>
        ) : registrations.length === 0 ? (
          <div className="text-center py-16 text-stone-500 text-sm bg-[#161310] rounded-xl border border-stone-800/60">
            No runners registered yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {registrations.map(reg => (
              <div key={reg.registrationId} className="bg-[#1c1814] border border-stone-800/60 rounded-xl overflow-hidden flex flex-col hover:border-stone-700 transition-colors">
                {/* Horse image / placeholder */}
                <div className="relative aspect-[4/3] bg-[#24211a]">
                  {reg.horse?.imageUrl
                    ? <img src={reg.horse.imageUrl} alt={reg.horse.horseName} className="w-full h-full object-cover block" />
                    : <div className="w-full h-full bg-gradient-to-br from-stone-800/60 to-[#0e0c0a] flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:'repeating-linear-gradient(45deg,#f7e0a3 0,#f7e0a3 1px,transparent 0,transparent 50%)',backgroundSize:'12px 12px'}} />
                        <div className="relative z-10 w-12 h-12 rounded-full bg-gradient-to-br from-amber-900/50 to-stone-900 border border-[#f7e0a3]/15 flex items-center justify-center mb-1.5 shadow-inner">
                          <span className="text-xl font-black text-[#f7e0a3]/40 leading-none select-none">
                            {reg.horse?.horseName?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <span className="relative z-10 text-[9px] font-bold text-stone-600 uppercase tracking-[0.15em]">No Photo</span>
                      </div>
                  }
                  <span className="absolute top-2 left-2 bg-[#f7e0a3] text-[#110e0b] text-[10px] font-black px-1.5 py-0.5 rounded-md">
                    #{reg.gateNumber ?? '?'}
                  </span>
                </div>

                {/* Info */}
                <div className="p-3 flex flex-col flex-1">
                  <h4 className="font-bold text-sm text-stone-100 truncate">{reg.horse?.horseName || '—'}</h4>
                  <p className="text-[11px] text-stone-500 mt-0.5 truncate">{reg.jockeyName || reg.jockey?.fullName || 'Unknown jockey'}</p>
                  <p className="text-[10px] text-stone-600 mt-0.5">
                    {reg.horse?.breed || '—'} · {reg.horse?.age ? `${reg.horse.age}yo` : '—'}
                    {reg.horse?.weight ? ` · ${reg.horse.weight}kg` : ''}
                  </p>

                  {/* Action button */}
                  <div className="mt-auto pt-3">
                    {canBet ? (
                      <button
                        onClick={() => setBetReg(reg)}
                        className="w-full py-2 bg-[#f7e0a3] text-[#110e0b] text-xs font-black rounded-lg hover:bg-[#ebd292] active:scale-95 transition-all uppercase tracking-wider"
                      >
                        Bet
                      </button>
                    ) : (
                      <div className="w-full py-2 bg-[#1a1610] border border-stone-800 text-stone-500 text-xs font-bold rounded-lg text-center">
                        {reg.horse?.age ? `${reg.horse.age} yrs` : 'View Info'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bet slip overlay */}
      {betReg && (
        <BetSlipModal
          race={race}
          reg={betReg}
          onClose={() => setBetReg(null)}
          onSuccess={() => { setBetReg(null); onBetSuccess?.() }}
        />
      )}
    </div>
  )
}

function RaceRow({ race, canBetByRole = true, onAction }) {
  const [info, setInfo] = useState(() => computeState(race))
  useEffect(() => {
    setInfo(computeState(race))
    const id = setInterval(() => setInfo(computeState(race)), 15000)
    return () => clearInterval(id)
  }, [race])

  const { state, stateText, statusLabel, statusValue } = info
  const isLive = state === 'progress'

  return (
    <div className="bg-[#161310] border border-stone-800/60 rounded-xl overflow-hidden flex flex-col md:flex-row group hover:border-stone-700/80 transition-colors relative">
      {isLive && (
        <div className="absolute top-0 right-0 bg-[#ff5a5f] text-white text-[10px] font-black px-3 py-1 rounded-bl-lg z-10 tracking-wider">
          LIVE NOW
        </div>
      )}

      {/* Image */}
      <div className="w-full md:w-72 h-44 md:h-auto relative shrink-0 border-b md:border-b-0 md:border-r border-stone-800/60 overflow-hidden">
        {race.imageUrl ? (
          <img src={race.imageUrl} alt={race.raceName} className="w-full h-full object-cover block group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className={`w-full h-full min-h-[160px] flex items-center justify-center ${
            isLive ? 'bg-gradient-to-br from-red-950/60 to-[#161310]'
            : state === 'finished' ? 'bg-gradient-to-br from-stone-800/40 to-[#161310]'
            : 'bg-gradient-to-br from-amber-950/40 to-[#161310]'
          }`}>
            <Flag size={36} className="text-stone-700 opacity-40" />
          </div>
        )}
        <div className="absolute top-3 left-3 bg-[#f7e0a3] text-[#110e0b] text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1.5 shadow-lg">
          <Flag size={11} fill="currentColor" />
          Race #{race.raceNumber}
        </div>
        {isLive && (
          <div className="absolute bottom-3 left-3 right-3 h-1 bg-black/50 rounded-full overflow-hidden">
            <div className="h-full bg-[#f7e0a3] w-[35%] rounded-full shadow-[0_0_8px_rgba(247,224,163,0.8)]" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between min-w-0">
        <div className="flex flex-col xl:flex-row justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-xl font-black text-white truncate mb-0.5">
              {race.raceName || `Race #${race.raceNumber}`}
            </h3>

            <div className={`mt-2 inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider items-center gap-1.5 border bg-[#110e0b] ${
              state === 'open'     ? 'text-emerald-400 border-emerald-500/20' :
              state === 'progress' ? 'text-[#ff5a5f] border-[#ff5a5f]/20' :
              state === 'closed'   ? 'text-stone-400 border-stone-700' :
              'text-stone-500 border-stone-800'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                state === 'open'     ? 'bg-emerald-400' :
                state === 'progress' ? 'bg-[#ff5a5f] animate-pulse' :
                'bg-stone-600'
              }`} />
              {stateText}
            </div>
          </div>
          <div className="shrink-0 xl:text-right">
            <p className="text-[10px] text-stone-500 font-bold tracking-wider uppercase">{statusLabel}</p>
            <p className={`text-lg font-black mt-0.5 ${isLive ? 'text-[#ff5a5f] italic' : 'text-[#f7e0a3]'}`}>
              {statusValue}
            </p>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 border-t border-stone-800/40 pt-4 mt-4">
          <div className="flex gap-8">
            <div>
              <p className="text-[9px] text-stone-500 font-bold uppercase tracking-wider mb-1">Length</p>
              <p className="text-sm font-bold text-stone-200">{race.trackLength ? `${race.trackLength}m` : '—'}</p>
            </div>
            <div>
              <p className="text-[9px] text-stone-500 font-bold uppercase tracking-wider mb-1">Max</p>
              <p className="text-sm font-bold text-stone-200">{race.maxParticipants ?? '—'}</p>
            </div>
            <div>
              <p className="text-[9px] text-stone-500 font-bold uppercase tracking-wider mb-1">Racecourse</p>
              <p className="text-sm font-bold text-stone-200">{race.racecourseName || race.racecourse?.racecourseName || '—'}</p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 w-full xl:w-auto">
            <button
              onClick={() => {
                const mode = state === 'open' && canBetByRole ? 'bet' : state === 'progress' ? 'live' : state === 'finished' ? 'results' : 'details'
                onAction(race, mode)
              }}
              className={`w-full xl:w-36 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                state === 'open' && canBetByRole
                  ? 'bg-[#f7e0a3] text-[#110e0b] hover:bg-[#ebd292]'
                  : state === 'progress'
                  ? 'bg-red-600 text-white hover:bg-red-500'
                  : 'bg-[#211d19] text-stone-400 hover:text-stone-200 border border-stone-800'
              }`}
            >
              {state === 'open' && canBetByRole ? 'Place Bet' : state === 'open' ? 'View Details' : state === 'progress' ? 'Watch Live' : state === 'finished' ? 'View Results' : 'View Details'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null
  const pages = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
  }
  const btnBase = 'w-8 h-8 flex items-center justify-center rounded-md text-sm transition-colors'
  return (
    <div className="flex justify-center items-center gap-1.5 py-6">
      <button onClick={() => onPage(page - 1)} disabled={page === 1}
        className={`${btnBase} bg-[#161310] border border-stone-800 text-stone-400 hover:text-[#f7e0a3] hover:border-[#f7e0a3]/50 disabled:opacity-40`}>
        <ChevronLeft size={16} />
      </button>
      {pages.map((p, i) =>
        p === '...'
          ? <span key={`e${i}`} className="text-stone-500 px-1">...</span>
          : <button key={p} onClick={() => onPage(p)}
              className={`${btnBase} font-bold ${
                page === p ? 'bg-[#f7e0a3] text-[#110e0b]' : 'bg-[#161310] border border-stone-800 text-stone-400 hover:text-[#f7e0a3] hover:border-[#f7e0a3]/50'
              }`}>{p}</button>
      )}
      <button onClick={() => onPage(page + 1)} disabled={page === totalPages}
        className={`${btnBase} bg-[#161310] border border-stone-800 text-stone-400 hover:text-[#f7e0a3] hover:border-[#f7e0a3]/50 disabled:opacity-40`}>
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

export default function UpcomingRaces() {
  const { user, refreshUser, authSynced } = useAuth()
  const navigate = useNavigate()
  const [races, setRaces]         = useState([])
  const [page, setPage]           = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState('All')
  const [search, setSearch]       = useState('')
  const [arenaRace, setArenaRace] = useState(null)
  const [arenaMode, setArenaMode] = useState('details')
  const [balance, setBalance]     = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const foregroundRef = useRef(false)

  const handleRacesUpdated = useCallback(() => setRefreshKey(k => k + 1), [])
  useRaceHub(null, { onRacesUpdated: handleRacesUpdated })

  useEffect(() => { refreshUser() }, [])

  const displayName = user?.fullName || user?.name || user?.email?.split('@')[0] || 'User'
  const canBetByRole = authSynced && (!user?.role || user.role === 'Spectator') && !user?.requestedRole

  const TAB_API_STATUS = {
    'All': '', 'Scheduled': 'Scheduled', 'Open For Betting': 'BettingOpen',
    'Betting Closed': 'BettingClosed', 'Live': 'Live',
  }

  useEffect(() => {
    foregroundRef.current = true
    if (page !== 1) setPage(1)
  }, [activeTab, search])

  useEffect(() => {
    foregroundRef.current = true
  }, [page])

  useEffect(() => {
    const interval = setInterval(() => setRefreshKey(k => k + 1), 10000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const isForeground = foregroundRef.current
    foregroundRef.current = false
    if (isForeground) setLoading(true)

    const fetchRaces = async () => {
      if (activeTab === 'Finished') {
        // backend có thể dùng 'Finished' hoặc 'Completed' — fetch cả hai
        const [r1, r2] = await Promise.allSettled([
          getRacesPaged({ page, pageSize: 10, status: 'Finished', ...(search && { search }) }),
          getRacesPaged({ page, pageSize: 10, status: 'Completed', ...(search && { search }) }),
        ])
        const items1 = r1.status === 'fulfilled' ? (r1.value.data.data?.items || []) : []
        const items2 = r2.status === 'fulfilled' ? (r2.value.data.data?.items || []) : []
        const seen   = new Set()
        const merged = [...items1, ...items2].filter(r => {
          if (seen.has(r.raceId)) return false
          seen.add(r.raceId); return true
        })
        const total1 = r1.status === 'fulfilled' ? (r1.value.data.data?.totalCount || 0) : 0
        const total2 = r2.status === 'fulfilled' ? (r2.value.data.data?.totalCount || 0) : 0
        const combinedTotal = total1 + total2
        setRaces(merged)
        setTotalPages(Math.max(
          r1.status === 'fulfilled' ? (r1.value.data.data?.totalPages || 1) : 1,
          r2.status === 'fulfilled' ? (r2.value.data.data?.totalPages || 1) : 1,
          Math.ceil(combinedTotal / 10),
        ))
      } else {
        const status = TAB_API_STATUS[activeTab]
        const r = await getRacesPaged({
          page, pageSize: 10,
          ...(status && { status }),
          ...(search && { search }),
        })
        const data = r.data.data || {}
        const totalCount = data.totalCount || data.TotalCount || 0
        const pages = data.totalPages || data.TotalPages || Math.ceil(totalCount / 10) || 1
        setRaces(data.items || [])
        setTotalPages(pages)
      }
    }

    fetchRaces()
      .catch(() => setRaces([]))
      .finally(() => { if (isForeground) setLoading(false) })
  }, [page, activeTab, search, refreshKey])

  useEffect(() => {
    getBalance().then(r => setBalance(r.data.data?.balance ?? 0)).catch(() => {})
  }, [arenaRace])


  return (
    <SpectatorLayout>
      {arenaRace ? (
        <RaceDetailScreen
          key={arenaRace.raceId}
          race={arenaRace}
          mode={arenaMode}
          canBetByRole={canBetByRole}
          onBetSuccess={() => getBalance().then(r => setBalance(r.data.data?.balance ?? 0)).catch(() => {})}
          onClose={() => setArenaRace(null)}
        />
      ) : (<>

      {/* TOP BAR */}
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 -mx-4 md:-mx-8 -mt-4 md:-mt-8 px-4 md:px-8 py-4 mb-6 md:mb-8 bg-[#110e0b]/80 backdrop-blur-md sticky top-0 z-10 border-b border-stone-800/40">
        <div className="text-xs text-stone-500 font-medium flex gap-2">
          <span className="text-stone-400">Races</span>
          <span>›</span>
          <span className="text-stone-300">Market Overview</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
            <input type="text" placeholder="Search races..." value={search} onChange={e => setSearch(e.target.value)}
              className="bg-[#1a1613] border border-stone-800/80 text-sm text-stone-200 rounded-full pl-8 pr-4 py-2 w-52 focus:outline-none focus:border-[#f7e0a3]/50 transition-colors placeholder:text-stone-600" />
          </div>
          <div className="bg-stone-900/50 border border-stone-800 px-3 py-1.5 rounded-full text-sm font-bold text-[#f7e0a3]">
            {balance != null ? `${balance.toLocaleString()} VND` : '—'}
          </div>
          <button className="p-2 text-stone-400 hover:text-stone-200 bg-stone-900/50 rounded-full border border-stone-800 relative">
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
          </button>
          <div className="w-8 h-8 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center font-bold text-xs text-stone-200">
            {displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
        </div>
      </header>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Market Overview</h2>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1613] border border-stone-800/60 text-stone-400 hover:text-stone-200 hover:border-stone-700 rounded-lg text-xs font-semibold transition-colors"
        >
          <Search size={12} className="rotate-0" />
          Refresh
        </button>
      </div>

      {/* TABS */}
      <div className="flex items-center gap-2.5 mb-7 overflow-x-auto pb-1">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              activeTab === tab ? 'bg-[#f7e0a3] text-[#110e0b]' : 'bg-[#1a1613] text-stone-400 border border-stone-800/60 hover:text-stone-200 hover:bg-stone-800/40'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {/* RACE LIST */}
      <div className="space-y-4 mb-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-[#161310] rounded-xl animate-pulse border border-stone-800/40" />
          ))
        ) : races.length === 0 ? (
          <div className="text-center py-16 text-stone-500 text-sm bg-[#161310] rounded-xl border border-stone-800/60">No races found.</div>
        ) : (
          races.map(race => (
            <RaceRow key={race.raceId} race={race} canBetByRole={canBetByRole} onAction={(r, m) => {
              if (m === 'results') { navigate(`/spectator/races/${r.raceId}/results`); return }
              if (m === 'live')    { navigate(`/spectator/races/${r.raceId}/live`);    return }
              setArenaRace(r); setArenaMode(m)
            }} />
          ))
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPage={setPage} />

      </>)}
    </SpectatorLayout>
  )
}
