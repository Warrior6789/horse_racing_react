import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Zap, Trophy, MapPin, Flag } from 'lucide-react'
import SpectatorLayout from '../../components/SpectatorLayout'
import { getRace, getRaceRegistrations } from '../../api/races'
import { placeBet } from '../../api/bets'
import { getBalance } from '../../api/payments'
import { useAuth } from '../../context/AuthContext'

const BET_TYPES = ['Win', 'Place', 'Show']
const QUICK_AMOUNTS = [10000, 50000, 100000, 500000]

function PersonModal({ person, onClose }) {
  if (!person) return null
  const age = person.dateOfBirth
    ? Math.floor((Date.now() - new Date(person.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
    : null
  const winRate = person.totalRaces > 0 ? Math.round((person.totalWins / person.totalRaces) * 100) : 0
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] p-4" onClick={onClose}>
      <div className="bg-[#1c1814] border border-stone-700/60 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-base font-bold text-stone-100">{person._type === 'jockey' ? 'Jockey' : 'Owner'} Info</h3>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300 transition-colors">✕</button>
        </div>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-xl bg-stone-800 border border-stone-700 overflow-hidden flex items-center justify-center text-3xl shrink-0">
            {person.imageUrl
              ? <img src={person.imageUrl} alt="" className="w-full h-full object-cover" />
              : <span className="text-stone-400 font-black text-xl">{person.fullName?.[0] || '?'}</span>}
          </div>
          <div>
            <p className="font-bold text-stone-100 text-lg leading-tight">{person.fullName || '—'}</p>
            {person.nationality && <p className="text-stone-400 text-xs mt-0.5">{person.nationality}{age ? ` · ${age} yrs` : ''}</p>}
            {person.licenseNumber && <p className="text-[10px] text-[#f7e0a3]/70 font-bold mt-1">License: {person.licenseNumber}</p>}
            {person.phone && <p className="text-stone-400 text-xs mt-0.5">📞 {person.phone}</p>}
          </div>
        </div>
        {person._type === 'jockey' && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Races', value: person.totalRaces ?? '—' },
              { label: 'Wins',  value: person.totalWins  ?? '—' },
              { label: 'Win %', value: person.totalRaces > 0 ? `${winRate}%` : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#110e0b] rounded-xl p-3 text-center border border-stone-800">
                <p className="text-lg font-black text-stone-100">{value}</p>
                <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wide mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}
        {[
          { label: 'Weight', value: person.weight ? `${person.weight} kg` : null },
          { label: 'Height', value: person.height ? `${person.height} cm` : null },
        ].filter(r => r.value).map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center py-1.5 border-b border-stone-800">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">{label}</span>
            <span className="text-sm font-bold text-stone-200">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PlaceBet() {
  const { raceId } = useParams()
  const navigate   = useNavigate()
  const { updateUser } = useAuth()

  const [race,          setRace]          = useState(null)
  const [registrations, setRegistrations] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [balance,       setBalance]       = useState(null)

  const [selectedReg,  setSelectedReg]  = useState(null)
  const [betType,      setBetType]      = useState('Win')
  const [rawAmount,    setRawAmount]    = useState('')
  const [focused,      setFocused]      = useState(false)
  const [submitting,     setSubmitting]     = useState(false)
  const [error,          setError]          = useState('')
  const [done,           setDone]           = useState(false)
  const [selectedPerson, setSelectedPerson] = useState(null)

  const numAmount = Number(rawAmount) || 0
  const displayValue = focused ? rawAmount : (numAmount > 0 ? numAmount.toLocaleString('en-US') : '')

  useEffect(() => {
    Promise.all([
      getRace(raceId).then(r => setRace(r.data.data || r.data)),
      getRaceRegistrations(raceId).then(r => {
        const payload = r.data?.data
        setRegistrations(Array.isArray(payload) ? payload : payload?.items || [])
      }),
      getBalance().then(r => setBalance(r.data.data?.balance ?? 0)),
    ]).catch(() => {}).finally(() => setLoading(false))
  }, [raceId])

  const submit = async () => {
    if (!selectedReg) { setError('Chọn ngựa trước.'); return }
    if (numAmount <= 0) { setError('Nhập số tiền hợp lệ.'); return }
    setError(''); setSubmitting(true)
    try {
      await placeBet({ registrationId: selectedReg.registrationId, betType, betAmount: numAmount })
      setDone(true)
      getBalance().then(r => {
        const bal = r.data.data?.balance
        if (bal != null) { setBalance(bal); updateUser({ balance: bal }) }
      }).catch(() => {})
    } catch (e) {
      setError(e.response?.data?.message || 'Đặt cược thất bại.')
    } finally { setSubmitting(false) }
  }

  const resetSlip = () => {
    setDone(false); setSelectedReg(null)
    setRawAmount(''); setBetType('Win'); setError('')
  }

  if (loading) return (
    <SpectatorLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-stone-700 border-t-[#f7e0a3] rounded-full animate-spin" />
      </div>
    </SpectatorLayout>
  )

  return (
    <SpectatorLayout>
      <div className="max-w-[1200px] mx-auto pb-12">

        {/* Back + Race Header */}
        <div className="mb-6">
          <button onClick={() => navigate('/spectator/races')}
            className="flex items-center gap-1.5 text-stone-400 hover:text-stone-200 text-sm font-bold transition-colors mb-4">
            <ChevronLeft size={16} /> Back to Races
          </button>
          {race && (
            <div className="bg-[#161310] border border-stone-800/60 rounded-2xl p-5 flex items-center gap-4">
              {race.imageUrl && (
                <img src={race.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0 border border-stone-700" />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-[#f7e0a3] text-[#110e0b] text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Flag size={9} fill="currentColor" /> Race #{race.raceNumber}
                  </span>
                  <span className="bg-emerald-600/20 text-emerald-400 border border-emerald-700/40 text-[10px] font-bold px-2 py-0.5 rounded-md">
                    OPEN FOR BETTING
                  </span>
                </div>
                <h1 className="text-xl font-black text-white truncate">{race.raceName || `Race #${race.raceNumber}`}</h1>
                <p className="text-stone-500 text-xs flex items-center gap-1 mt-0.5">
                  <MapPin size={10} /> {race.racecourseName || race.racecourse?.racecourseName || '—'}
                  {race.trackLength ? ` · ${race.trackLength}m` : ''}
                </p>
              </div>
              {balance != null && (
                <div className="ml-auto shrink-0 text-right">
                  <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Balance</p>
                  <p className="text-[#f7e0a3] font-black text-lg">{balance.toLocaleString()} <span className="text-xs font-medium text-stone-400">VND</span></p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* Left — Horse List */}
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-3">
              Chọn ngựa để đặt cược <span className="text-stone-600 font-normal">({registrations.length} runners)</span>
            </h2>
            {registrations.length === 0 ? (
              <div className="text-center py-16 text-stone-500 text-sm bg-[#161310] rounded-xl border border-stone-800/60">
                Chưa có ngựa đăng ký.
              </div>
            ) : (
              <div className="space-y-3">
                {registrations.map(reg => {
                  const isSelected = selectedReg?.registrationId === reg.registrationId
                  return (
                    <button
                      key={reg.registrationId}
                      onClick={() => { setSelectedReg(reg); setDone(false); setError('') }}
                      className={`w-full text-left bg-[#161310] border rounded-xl p-4 flex items-center gap-4 transition-all ${
                        isSelected
                          ? 'border-[#f7e0a3] shadow-[0_0_0_1px_rgba(247,224,163,0.3)]'
                          : 'border-stone-800/60 hover:border-stone-700'
                      }`}
                    >
                      {/* Gate badge */}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg shrink-0 ${
                        isSelected ? 'bg-[#f7e0a3] text-[#110e0b]' : 'bg-stone-800 text-stone-400'
                      }`}>
                        {reg.gateNumber ?? '?'}
                      </div>

                      {/* Horse image */}
                      <div className="w-12 h-12 rounded-full bg-stone-800 border border-stone-700 overflow-hidden flex items-center justify-center text-xl shrink-0">
                        {reg.horse?.imageUrl
                          ? <img src={reg.horse.imageUrl} alt="" className="w-full h-full object-cover" />
                          : '🐎'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-sm truncate ${isSelected ? 'text-[#f7e0a3]' : 'text-stone-100'}`}>
                          {reg.horse?.horseName || '—'}
                        </p>
                        <p className="text-[11px] text-stone-500 mt-0.5 truncate">
                          {reg.horse?.breed || '—'} · {reg.horse?.age ? `${reg.horse.age}yo` : '—'}
                        </p>
                        <div className="flex flex-col gap-1 mt-1.5">
                          {(() => {
                            const j = reg.jockey || {}
                            const name = reg.jockeyName || j.fullName
                            return (
                              <button
                                onClick={e => { e.stopPropagation(); setSelectedPerson({ ...j, fullName: name, _type: 'jockey' }) }}
                                className="flex items-center gap-1.5 group/j hover:opacity-80 transition-opacity text-left w-fit"
                              >
                                <div className="w-5 h-5 rounded-full bg-stone-700 border border-stone-600 overflow-hidden flex items-center justify-center text-[9px] shrink-0">
                                  {j.imageUrl ? <img src={j.imageUrl} alt="" className="w-full h-full object-cover" /> : '🏇'}
                                </div>
                                <span className="text-[10px] text-stone-500 group-hover/j:text-stone-300 transition-colors">{name || '—'}</span>
                              </button>
                            )
                          })()}
                          {(() => {
                            const o = reg.owner || {}
                            const name = reg.ownerName || o.fullName
                            return (
                              <button
                                onClick={e => { e.stopPropagation(); setSelectedPerson({ ...o, fullName: name, _type: 'owner' }) }}
                                className="flex items-center gap-1.5 group/o hover:opacity-80 transition-opacity text-left w-fit"
                              >
                                <div className="w-5 h-5 rounded-full bg-stone-700 border border-stone-600 overflow-hidden flex items-center justify-center text-[9px] shrink-0">
                                  {o.imageUrl ? <img src={o.imageUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-stone-400 font-bold text-[8px]">{(name || '?')[0]}</span>}
                                </div>
                                <span className="text-[10px] text-stone-500 group-hover/o:text-stone-300 transition-colors">{name || '—'}</span>
                              </button>
                            )
                          })()}
                        </div>
                      </div>

                      {isSelected && (
                        <div className="shrink-0 w-5 h-5 rounded-full bg-[#f7e0a3] flex items-center justify-center">
                          <svg className="w-3 h-3 text-[#110e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right — Wagering Slip */}
          <div className="w-full lg:w-80 shrink-0 sticky top-4">
            <div className="bg-[#161310] border border-stone-800/60 rounded-2xl p-6">
              <h2 className="text-base font-black text-stone-100 mb-5">Wagering Slip</h2>

              {done ? (
                <div className="text-center py-8 space-y-3">
                  <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                    <Trophy size={26} className="text-emerald-400" />
                  </div>
                  <p className="font-bold text-stone-100">Bet Placed!</p>
                  <p className="text-xs text-stone-500">Good luck on your wager.</p>
                  <button onClick={resetSlip}
                    className="text-xs font-bold text-[#f7e0a3] hover:underline">
                    Đặt cược tiếp
                  </button>
                </div>
              ) : selectedReg ? (
                <>
                  {/* Selected horse */}
                  <div className="bg-[#110e0b] rounded-xl p-3 mb-5 border border-stone-800/60 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-stone-800 overflow-hidden flex items-center justify-center text-lg shrink-0">
                      {selectedReg.horse?.imageUrl
                        ? <img src={selectedReg.horse.imageUrl} alt="" className="w-full h-full object-cover" />
                        : '🐎'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[#f7e0a3] text-sm truncate">{selectedReg.horse?.horseName}</p>
                      <p className="text-[10px] text-stone-500 mt-0.5">Gate #{selectedReg.gateNumber ?? '?'}</p>
                    </div>
                  </div>

                  {/* Bet type */}
                  <div className="mb-5">
                    <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-2">Bet Type</p>
                    <div className="grid grid-cols-3 gap-2">
                      {BET_TYPES.map(t => (
                        <button key={t} onClick={() => setBetType(t)}
                          className={`py-2 text-xs font-bold rounded-lg transition-colors ${
                            betType === t ? 'bg-[#f7e0a3] text-[#110e0b]' : 'bg-[#110e0b] text-stone-500 hover:text-stone-200 border border-stone-800/60'
                          }`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="mb-5">
                    <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-2">Wager Amount</p>
                    <div className="bg-[#110e0b] px-4 py-3 rounded-lg mb-3 flex items-baseline gap-2 border border-stone-800/60">
                      <input
                        type="text" inputMode="numeric"
                        value={displayValue}
                        onChange={e => setRawAmount(e.target.value.replace(/[^0-9]/g, ''))}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        placeholder="0"
                        className="bg-transparent text-2xl font-black text-stone-100 w-full outline-none placeholder:text-stone-700"
                      />
                      <span className="text-sm text-stone-500 font-medium shrink-0">VND</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {QUICK_AMOUNTS.map(val => (
                        <button key={val} onClick={() => setRawAmount(String(val))}
                          className={`py-1.5 text-[10px] font-bold rounded-lg transition-colors ${
                            numAmount === val ? 'bg-[#f7e0a3] text-[#110e0b]' : 'bg-[#110e0b] text-stone-500 hover:text-stone-200 border border-stone-800/60'
                          }`}>
                          {val >= 1000 ? `${val / 1000}k` : val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

                  <button onClick={submit} disabled={submitting || numAmount <= 0}
                    className="w-full py-3 bg-[#f7e0a3] text-[#110e0b] rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-[#ebd292] transition-colors disabled:opacity-50">
                    <Zap size={16} />
                    {submitting ? 'Đang đặt…' : 'Confirm Wager'}
                  </button>
                </>
              ) : (
                <div className="text-center py-10">
                  <p className="text-stone-600 text-sm">Chọn một con ngựa<br />để bắt đầu đặt cược.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      <PersonModal person={selectedPerson} onClose={() => setSelectedPerson(null)} />
    </SpectatorLayout>
  )
}
