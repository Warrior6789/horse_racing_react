import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom'

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
import {
  ChevronRight, Calendar, MapPin, Route, Wallet,
  PawPrint, User, UserPlus, Search, X, Disc, MessageSquare, CheckCircle2
} from 'lucide-react'
import OwnerLayout from '../../components/OwnerLayout'
import { getRace, registerHorseToRace } from '../../api/races'
import { getHorses } from '../../api/horses'
import { getJockeysPaged, getJockeyProfile } from '../../api/jockeyProfiles'
import { getBalance } from '../../api/payments'
import { getActiveRegistrationFeeConfig } from '../../api/config'

/* ─── Horse Selection Card ────────────────────────────────────────── */
function HorseCard({ horse, selected, onSelect }) {
  const statusColor = horse.status === 'Healthy' ? 'text-green-500' : 'text-yellow-500'
  const statusDot   = horse.status === 'Healthy' ? 'bg-green-500'  : 'bg-yellow-500'

  return (
    <div
      onClick={() => onSelect(horse.horseId ?? horse.id)}
      className={`rounded-xl p-3 flex items-center gap-4 cursor-pointer transition-all border
        ${selected
          ? 'bg-[#facc15]/5 border-[#facc15] shadow-[0_0_12px_rgba(250,204,21,0.15)]'
          : 'bg-[#0f1117] border-gray-800/80 hover:border-gray-600'}`}
    >
      <div className="w-14 h-14 bg-gray-800 rounded-lg overflow-hidden border border-gray-700 shrink-0 flex items-center justify-center text-2xl">
        {horse.imageUrl
          ? <img src={horse.imageUrl} alt="" className="w-full h-full object-cover" />
          : '🐎'}
      </div>
      <div className="min-w-0">
        <h4 className="text-white font-bold text-sm truncate">{horse.horseName}</h4>
        <p className="text-xs text-gray-400 font-medium mb-1.5 truncate">
          {horse.breed || 'Unknown'} • {horse.age ? `${horse.age}yo` : '—'}
        </p>
        <p className={`text-[10px] font-black uppercase flex items-center gap-1.5 ${statusColor}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot}`} />
          {horse.status || 'Healthy'}
        </p>
      </div>
    </div>
  )
}

/* ─── Horse Selection Modal ───────────────────────────────────────── */
function HorseSelectionModal({ horses, selectedId, onSelect, onClose }) {
  const [search,     setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const filtered = useMemo(() => {
    let list = [...horses]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(h =>
        (h.horseName || '').toLowerCase().includes(q) ||
        (h.breed || '').toLowerCase().includes(q)
      )
    }
    if (statusFilter === 'Active')   list = list.filter(h => h.status === 'Healthy')
    if (statusFilter === 'Inactive') list = list.filter(h => h.status !== 'Healthy')
    return list
  }, [horses, search, statusFilter])

  const FILTERS = [
    { key: 'All',      label: 'All Horses' },
    { key: 'Active',   label: 'Healthy',   dot: 'bg-emerald-500' },
    { key: 'Inactive', label: 'Resting',   dot: 'bg-blue-500' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07090e]/80 backdrop-blur-sm p-4 md:p-6">
      <div className="bg-[#1b212e] w-full max-w-5xl rounded-2xl border border-gray-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex justify-between items-start p-6 md:px-8 border-b border-gray-700/50">
          <div>
            <h2 className="text-2xl font-bold text-[#facc15] tracking-tight">Select a Horse for Registration</h2>
            <p className="text-sm text-gray-300 mt-1 font-medium">Choose a horse to enter into this race</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
            <X size={24} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 md:px-8 py-4 border-b border-gray-700/50 flex flex-col md:flex-row items-center justify-between gap-4 bg-[#181c28]">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Search by name or pedigree..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#131722] border border-gray-700/80 rounded-lg py-2.5 pl-11 pr-4 text-sm text-gray-200 focus:outline-none focus:border-gray-500 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-colors border ${
                  statusFilter === f.key
                    ? 'bg-[#facc15] text-black border-[#facc15]'
                    : 'bg-transparent text-gray-300 border-gray-700 hover:border-gray-500 hover:bg-gray-800/50'
                }`}
              >
                {f.dot && <span className={`w-2 h-2 rounded-full ${f.dot}`} />}
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="p-6 md:px-8 flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-sm">No horses match your search.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(h => {
                const isAvailable = h.status === 'Healthy' || !h.status
                const isSelected  = selectedId === (h.horseId ?? h.id)
                return (
                  <div
                    key={h.horseId ?? h.id}
                    className={`bg-[#131722] rounded-xl border overflow-hidden flex flex-col transition-all
                      ${isSelected ? 'border-[#facc15] shadow-[0_0_16px_rgba(250,204,21,0.2)]' : 'border-gray-700/60 hover:border-gray-500'}`}
                  >
                    {/* Image */}
                    <div className="relative h-40 bg-gray-800">
                      <div className={`absolute inset-0 bg-gradient-to-b from-transparent to-[#131722] z-10 ${!isAvailable ? 'grayscale opacity-60' : ''}`} />
                      {h.imageUrl
                        ? <img src={h.imageUrl} alt="" className={`absolute inset-0 w-full h-full object-cover ${!isAvailable ? 'grayscale opacity-40' : ''}`} />
                        : <div className={`absolute inset-0 flex items-center justify-center text-5xl ${!isAvailable ? 'opacity-40 grayscale' : ''}`}>🐎</div>}
                      {isAvailable && h.recordWins > 0 && (
                        <div className="absolute top-3 right-3 z-20 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-black text-white uppercase tracking-wider border border-white/10">
                          {h.recordWins} Wins
                        </div>
                      )}
                      {!isAvailable && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                          <span className="bg-black/60 px-3 py-1.5 rounded text-xs font-bold text-gray-300 border border-gray-600/50 uppercase tracking-widest">
                            {h.status || 'Unavailable'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="text-base font-bold text-white mb-0.5">{h.horseName}</h3>
                      <p className="text-xs text-gray-400 font-medium flex items-center gap-1.5 mb-4">
                        <Disc size={10} className="text-gray-500" />
                        {h.breed || 'Unknown'} • {h.age ? `${h.age} Years` : '—'}
                      </p>
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="bg-[#1b202c] rounded-lg p-2.5 border border-gray-700/50">
                          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Wins</p>
                          <p className="text-base font-bold text-[#facc15]">{h.recordWins ?? 0}</p>
                        </div>
                        <div className="bg-[#1b202c] rounded-lg p-2.5 border border-gray-700/50">
                          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Weight</p>
                          <p className="text-base font-bold text-[#facc15]">{h.weight ? `${h.weight}kg` : '—'}</p>
                        </div>
                      </div>
                      <button
                        disabled={!isAvailable}
                        onClick={() => { if (isAvailable) { onSelect(h.horseId ?? h.id); onClose() } }}
                        className={`w-full py-2.5 rounded-lg text-sm font-bold mt-auto transition-colors ${
                          isSelected
                            ? 'bg-[#facc15] text-black'
                            : isAvailable
                              ? 'bg-[#facc15]/10 hover:bg-[#facc15] text-[#facc15] hover:text-black border border-[#facc15]/40 hover:border-[#facc15]'
                              : 'bg-[#2a2d36] text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {isSelected ? '✓ Selected' : isAvailable ? 'Select Horse' : 'Unavailable'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 md:px-8 py-4 bg-[#181c28] border-t border-gray-700/50 flex items-center justify-between gap-4">
          <p className="text-xs text-gray-400 font-medium">
            Showing {filtered.length} of {horses.length} horses
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Jockey Selection Modal ──────────────────────────────────────── */
function JockeySelectionModal({ jockeys, loading, selectedId, raceName, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState('All')

  const jId = (j) => j.accountId

  const getTier = (j) => {
    const w = j.totalWins ?? j.recordWins ?? 0
    if (w >= 20) return 'Elite'
    if (w >= 8)  return 'Pro'
    return 'Rising'
  }

  const filtered = useMemo(() => {
    let list = [...jockeys]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(j => (j.fullName || j.userName || '').toLowerCase().includes(q))
    }
    if (tierFilter !== 'All') list = list.filter(j => getTier(j) === tierFilter)
    return list
  }, [jockeys, search, tierFilter])

  const TIER_STYLE = {
    Elite:  { text: 'text-[#facc15]', border: 'border-[#facc15]/50' },
    Pro:    { text: 'text-gray-400',  border: 'border-gray-500/50'  },
    Rising: { text: 'text-[#38bdf8]', border: 'border-[#38bdf8]/50' },
  }

  const FILTERS = ['All', 'Elite', 'Pro']

  const autoAssign = () => {
    const best = [...jockeys].sort((a, b) => (b.totalWins ?? 0) - (a.totalWins ?? 0))[0]
    if (best) { onSelect(jId(best)); onClose() }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 md:p-6">
      <div className="bg-[#12110e] w-full max-w-6xl rounded-2xl border border-[#2e2a22] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 md:px-8 border-b border-[#2e2a22]">
          <div>
            <h2 className="text-xl font-bold text-[#facc15] tracking-tight">Select Jockey Assignment</h2>
            <p className="text-sm text-gray-400 mt-1 font-medium">
              Assign an elite rider for{' '}
              <span className="text-[#38bdf8]">{raceName || 'this race'}</span>.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
              <input
                type="text" placeholder="Search jockeys..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full bg-[#1c1a17] border border-[#33302a] rounded-lg py-2 pl-9 pr-4 text-sm text-gray-200 focus:outline-none focus:border-gray-500 transition-colors"
              />
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-6 md:px-8 py-3.5 border-b border-[#2e2a22] flex items-center gap-4 bg-[#161511]">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest shrink-0">Filter By:</span>
          <div className="flex items-center gap-2">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setTierFilter(f)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors border ${
                  tierFilter === f
                    ? 'bg-[#facc15] text-black border-[#facc15]'
                    : 'bg-[#222222] text-gray-400 border-[#333333] hover:border-gray-500 hover:text-gray-300'
                }`}>
                {f === 'All' ? 'All Jockeys' : `${f} Tier`}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="p-6 md:px-8 flex-1 overflow-y-auto bg-[#12110e]">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-gray-700 border-t-yellow-500 rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-sm">No jockeys match your search.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {filtered.map((j, i) => {
                const tier      = getTier(j)
                const ts        = TIER_STYLE[tier]
                const isSelected = selectedId === jId(j)
                return (
                  <div key={jId(j) ?? i}
                    className={`bg-[#0f141f] rounded-xl overflow-hidden border flex flex-col transition-all
                      ${isSelected ? 'border-[#facc15] shadow-[0_0_16px_rgba(250,204,21,0.2)]' : 'border-[#1f2937] hover:border-gray-500'}`}
                  >
                    {/* Portrait */}
                    <div className="relative h-44 bg-[#1a1f2e]">
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0f141f] via-transparent to-transparent z-10" />
                      {(j.imageUrl || j.certificateImageUrl || j.account?.avatarUrl)
                        ? <img src={j.imageUrl || j.certificateImageUrl || j.account?.avatarUrl} alt="" className="absolute inset-0 w-full h-full object-cover" onError={e => { e.target.style.display='none' }} />
                        : <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-20 h-20 rounded-lg bg-[#facc15]/10 border border-[#facc15]/20 flex items-center justify-center text-2xl font-black text-[#facc15]">
                              {(j.fullName || j.userName || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                          </div>}
                      {tier !== 'Rising' && (
                        <div className={`absolute top-3 right-3 z-20 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border bg-black/40 backdrop-blur-sm ${ts.text} ${ts.border}`}>
                          {tier}
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="p-4 flex-1 flex flex-col z-20 -mt-2">
                      <h3 className="text-base font-bold text-white mb-3 truncate">
                        {j.fullName || j.userName || `Jockey #${j.jockeyId}`}
                      </h3>
                      <div className="flex items-center gap-5 mb-4">
                        <div>
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Weight</p>
                          <p className="text-sm font-bold text-gray-200">{j.weight ? `${j.weight} kg` : '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Win Rate</p>
                          <p className="text-sm font-bold text-gray-200">
                            {j.totalRaces > 0 ? `${Math.round(((j.totalWins ?? 0) / j.totalRaces) * 100)}%` : '—'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => { onSelect(jId(j)); onClose() }}
                        className={`w-full py-2.5 rounded-lg text-xs font-black uppercase tracking-wide mt-auto transition-colors ${
                          isSelected
                            ? 'bg-[#facc15] text-black'
                            : 'bg-[#facc15]/10 hover:bg-[#facc15] text-[#facc15] hover:text-black border border-[#facc15]/30 hover:border-[#facc15]'
                        }`}>
                        {isSelected ? '✓ Assigned' : 'Select Jockey'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 md:px-8 py-4 bg-[#0a0a08] border-t border-[#2e2a22] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className={`w-7 h-7 rounded-full bg-gray-${700 - i * 100} border-2 border-[#0a0a08]`} style={{ opacity: 0.6 + i * 0.2 }} />
              ))}
            </div>
            <p className="text-[13px] text-gray-400 font-medium">
              <span className="text-[#facc15] font-bold">{jockeys.length}</span> jockeys available
            </p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button onClick={onClose}
              className="flex-1 md:flex-none px-6 py-2.5 text-xs font-black uppercase tracking-wide text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg transition-colors">
              Cancel
            </button>
            <button onClick={autoAssign}
              className="flex-1 md:flex-none px-6 py-2.5 bg-[#facc15] hover:bg-[#eab308] text-black text-xs font-black uppercase tracking-wide rounded-lg transition-colors">
              Confirm Auto-Assign
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Main ────────────────────────────────────────────────────────── */
export default function RaceRegistration() {
  const { raceId }  = useParams()
  const navigate    = useNavigate()
  const routeLocation = useLocation()
  const preselectedHorseId = routeLocation.state?.preselectedHorseId ?? null

  const [race,         setRace]         = useState(null)
  const [horses,       setHorses]       = useState([])
  const [jockeys,      setJockeys]      = useState([])
  const [balance,      setBalance]      = useState(null)
  const [entryFee,     setEntryFee]     = useState(null)

  const [selectedHorse,   setSelectedHorse]   = useState(preselectedHorseId)
  const [selectedJockey,  setSelectedJockey]  = useState(null)
  const [jockeyDetail,    setJockeyDetail]    = useState(null)
  const [gateNumber,      setGateNumber]      = useState('')
  const [agreed,          setAgreed]          = useState(false)
  const [horseModalOpen,  setHorseModalOpen]  = useState(false)
  const [jockeyModalOpen, setJockeyModalOpen] = useState(false)

  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState('')
  const [loading,       setLoading]       = useState(true)
  const [jockeyLoading, setJockeyLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      getRace(raceId),
      getHorses({ pageSize: 100 }),
      getBalance(),
      getActiveRegistrationFeeConfig().catch(() => null),
    ]).then(([r, h, bal, fee]) => {
      setRace(r.data.data || r.data)
      const hList = h.data.data?.items || h.data.data || []
      setHorses(hList.filter(h => h.status === 'Healthy' || !h.status))
      const prof = bal.data.data || bal.data
      setBalance(prof?.balance ?? prof?.walletBalance ?? null)
      if (fee) {
        const f = fee.data.data || fee.data
        setEntryFee(f?.feeAmount ?? f?.amount ?? null)
      }
    }).catch(() => {})
     .finally(() => setLoading(false))
  }, [raceId])

  const openJockeyModal = async () => {
    setJockeyModalOpen(true)
    if (jockeys.length > 0) return
    setJockeyLoading(true)
    try {
      const res = await getJockeysPaged({ pageSize: 100 })
      setJockeys(res.data.data?.items || res.data.data || [])
    } catch {}
    setJockeyLoading(false)
  }

  useEffect(() => {
    if (!selectedJockey) { setJockeyDetail(null); return }
    getJockeyProfile(selectedJockey)
      .then(r => setJockeyDetail(r.data.data || r.data))
      .catch(() => {})
  }, [selectedJockey])

  const activeJockey = jockeyDetail ?? jockeys.find(j => j.accountId === selectedJockey)
  const activeHorse  = horses.find(h => (h.horseId ?? h.id) === selectedHorse)

  const handleSubmit = async () => {
    if (!selectedHorse) { setError('Please select a horse.'); return }
    if (!gateNumber)    { setError('Please enter a gate number.'); return }
    if (!agreed)        { setError('Please agree to the racing regulations.'); return }
    setError(''); setSaving(true)
    try {
      await registerHorseToRace(raceId, {
        horseId:    selectedHorse,
        jockeyId:   selectedJockey  || undefined,
        gateNumber: gateNumber      ? Number(gateNumber) : undefined,
      })
      navigate('/owner/races', { state: { success: true } })
    } catch (e) {
      setError(e.response?.data?.message || 'Registration failed.')
    } finally { setSaving(false) }
  }

  /* ── race info helpers ── */
  const dateLabel = race?.startTime ? rawDate(race.startTime).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'
  const timeLabel = race?.startTime ? (rawTimeStr(race.startTime) || '—') : '—'
  const location  = race?.racecourseName || '—'
  const address   = race?.location || null
  const trackType = race?.racecourse?.surfaceType || race?.racecourse?.trackType || ''
  const distance  = race?.trackLength ? `${race.trackLength}m${trackType ? ` - ${trackType}` : ''}` : '—'
  const prize     = race?.prizePool != null ? Number(race.prizePool).toLocaleString('vi-VN') : '—'
  const grade     = race?.raceGrade || race?.grade || null
  const status    = race?.status || race?.raceStatus || null

  if (loading) {
    return (
      <OwnerLayout>
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-2 border-gray-700 border-t-yellow-500 rounded-full animate-spin" />
        </div>
      </OwnerLayout>
    )
  }

  return (
    <OwnerLayout>
      <div className="p-6 md:p-8 max-w-6xl mx-auto pb-12">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[11px] font-bold mb-4 tracking-wide">
          <Link to="/owner/races" className="text-gray-400 hover:text-gray-300 transition-colors">Available Races</Link>
          <ChevronRight size={12} className="text-gray-600" />
          <span className="text-[#facc15]">Race Registration</span>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Race Registration</h1>
          <p className="text-gray-400 text-sm font-medium">Select a horse and jockey to enter into an upcoming race.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* ── Left Column ─────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Race Details Card */}
            <div className="bg-[#161a23] rounded-2xl border border-gray-800/80 overflow-hidden">
              {/* Image */}
              <div className="h-40 bg-gray-900 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#161a23] z-10" />
                {race?.imageUrl
                  ? <img src={race.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  : <div className="absolute inset-0 flex items-center justify-center text-gray-700"><MapPin size={40} /></div>}
                {(status || grade) && (
                  <div className={`absolute bottom-3 left-5 z-20 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    status === 'Scheduled'     ? 'bg-blue-900/80 border border-blue-500/40 text-blue-300' :
                    status === 'BettingOpen'   ? 'bg-emerald-900/80 border border-emerald-500/40 text-emerald-300' :
                    status === 'BettingClosed' ? 'bg-orange-900/80 border border-orange-500/40 text-orange-300' :
                    status === 'Live'          ? 'bg-red-900/80 border border-red-500/40 text-red-300' :
                    status === 'Completed'     ? 'bg-gray-800/80 border border-gray-500/40 text-gray-300' :
                    status === 'Finished'      ? 'bg-purple-900/80 border border-purple-500/40 text-purple-300' :
                    status === 'Cancelled'     ? 'bg-zinc-800/80 border border-zinc-500/40 text-zinc-400' :
                    'bg-gray-900/80 border border-[#facc15]/30 text-[#facc15]'
                  }`}>
                    {status || grade}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="p-6 pt-5">
                <h2 className="text-xl font-bold text-white mb-5">
                  {race?.raceName || `Race #${race?.raceNumber || raceId}`}
                </h2>

                <div className="space-y-4">
                  <div className="flex gap-4">
                    <Calendar className="text-gray-400 shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-sm font-bold text-gray-200">{dateLabel}</p>
                      <p className="text-[11px] text-[#facc15] font-bold mt-0.5">Starts at {timeLabel}</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <MapPin className="text-gray-400 shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-sm font-bold text-gray-200">{location}</p>
                      {address && <p className="text-[11px] text-[#facc15] font-bold mt-0.5">{address}</p>}
                    </div>
                  </div>
                  {race?.distance && (
                    <div className="flex gap-4">
                      <Route className="text-gray-400 shrink-0 mt-0.5" size={18} />
                      <div>
                        <p className="text-sm font-bold text-gray-200">{distance}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 bg-[#1a1f2b] border border-gray-800/60 rounded-xl p-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Prize Pool</p>
                  <p className="text-2xl font-black text-[#facc15]">
                    {prize} <span className="text-sm text-gray-400 ml-0.5">VND</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Balance Card */}
            <div className="bg-[#161a23] rounded-2xl border border-gray-800/80 p-5">
              <div className="flex justify-between items-start mb-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Available Balance</p>
                <Wallet size={16} className="text-[#facc15]" />
              </div>
              <p className="text-2xl font-black text-white mb-3">
                {balance !== null ? Number(balance).toLocaleString('vi-VN') : '—'}
                <span className="text-sm text-gray-400 ml-2">VND</span>
              </p>
              {balance !== null && entryFee !== null && (
                <>
                  <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#facc15] rounded-full"
                      style={{ width: `${Math.min(100, Math.max(5, (entryFee / balance) * 100))}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1.5">
                    Entry fee is {((entryFee / balance) * 100).toFixed(1)}% of balance
                  </p>
                </>
              )}
            </div>
          </div>

          {/* ── Right Column ─────────────────────────────────────── */}
          <div className="bg-[#161a23] rounded-2xl border border-gray-800/80 p-6 md:p-8">

            {/* Horse Selection */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <PawPrint className="text-gray-400" size={18} />
                <h3 className="text-base font-bold text-white">
                  {selectedHorse ? 'Selected Horse' : 'Horse Selection'}
                </h3>
              </div>

              {horses.length === 0 ? (
                <p className="text-gray-500 text-sm">No active horses available.</p>
              ) : selectedHorse ? (() => {
                const h = horses.find(h => (h.horseId ?? h.id) === selectedHorse) || horses[0]
                return (
                  <div className="bg-[#facc15]/5 border border-[#facc15]/50 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gray-800 rounded-lg border border-[#facc15]/30 overflow-hidden shrink-0 flex items-center justify-center text-2xl">
                        {h.imageUrl ? <img src={h.imageUrl} alt="" className="w-full h-full object-cover" /> : '🐎'}
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-base">{h.horseName}</h4>
                        <p className="text-xs text-gray-400 font-medium mt-0.5">
                          {h.breed || 'Unknown'} • {h.age ? `${h.age}yo` : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => setHorseModalOpen(true)}
                        className="text-xs font-bold text-gray-400 hover:text-white px-3 py-2 border border-gray-600 hover:border-gray-400 rounded-lg transition-colors">
                        Change
                      </button>
                    </div>
                  </div>
                )
              })() : (() => {
                const sorted    = [...horses].sort((a, b) => (b.recordWins || 0) - (a.recordWins || 0))
                const suggested = sorted.slice(0, 2)
                return (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Top Picks by Win Record</span>
                      {horses.length > 2 && (
                        <button onClick={() => setHorseModalOpen(true)}
                          className="text-[11px] font-bold text-[#facc15] hover:text-yellow-300 transition-colors underline underline-offset-2 decoration-[#facc15]/40">
                          View More ({horses.length})
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {suggested.map(h => (
                        <HorseCard key={h.horseId ?? h.id} horse={h} selected={selectedHorse === (h.horseId ?? h.id)} onSelect={setSelectedHorse} />
                      ))}
                    </div>
                  </>
                )
              })()}

              {/* Gate Number */}
              <div className="mt-4">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Gate Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="number" min="1" placeholder="e.g. 3"
                  value={gateNumber} onChange={e => setGateNumber(e.target.value)}
                  className="w-32 bg-[#0f1117] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-yellow-500/40 transition-colors"
                />
              </div>
            </div>

            {/* Jockey Assignment */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <User className="text-gray-400" size={18} />
                <h3 className="text-base font-bold text-white">Jockey Assignment</h3>
              </div>

              {activeJockey ? (() => {
                const wins = activeJockey.totalWins ?? activeJockey.recordWins ?? 0
                const tier = wins >= 20 ? 'Elite' : wins >= 8 ? 'Pro' : 'Rising'
                const ts   = tier === 'Elite'
                  ? 'text-[#facc15] border-[#facc15]/50 bg-[#facc15]/10'
                  : tier === 'Pro'
                  ? 'text-gray-300 border-gray-500/50 bg-gray-700/30'
                  : 'text-[#38bdf8] border-[#38bdf8]/50 bg-[#38bdf8]/10'
                return (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Left — Jockey card */}
                    {(() => {
                      const status = activeJockey.status || activeJockey.assignmentStatus || 'Pending'
                      const statusCfg = status === 'Accepted'
                        ? { label: 'CONFIRMED', cls: 'bg-green-500/15 text-green-400 border border-green-500/30', dot: 'text-green-400' }
                        : status === 'Rejected'
                        ? { label: 'REJECTED',  cls: 'bg-red-500/15 text-red-400 border border-red-500/30',     dot: 'text-red-400' }
                        : { label: 'PENDING',   cls: 'bg-[#facc15]/10 text-[#facc15] border border-[#facc15]/30', dot: 'text-[#facc15]' }
                      const horseName  = activeHorse?.horseName || activeHorse?.name || 'Unknown Horse'
                      const jockeyName = activeJockey.fullName || activeJockey.userName || `Jockey #${activeJockey.jockeyId}`
                      return (
                        <div className="w-full bg-[#161a23] border border-gray-700/60 rounded-xl overflow-hidden flex flex-col min-h-[340px]">
                          <div className="h-1 bg-[#facc15] w-full" />
                          <div className="bg-[#1a1f2b] px-5 py-4 flex justify-between items-center border-b border-gray-700/60">
                            <div className="flex gap-3 items-center">
                              <div className="w-9 h-9 shrink-0 rounded-full bg-[#facc15] text-black flex items-center justify-center font-black text-sm">
                                #{gateNumber || '?'}
                              </div>
                              <div>
                                <h3 className="text-white font-bold text-sm leading-tight">{horseName}</h3>
                                <p className="text-gray-500 text-xs mt-0.5">
                                  Gate {gateNumber || '?'} • {activeHorse?.breed || activeHorse?.breedName || 'Thoroughbred'}
                                </p>
                              </div>
                            </div>
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${statusCfg.cls}`}>
                              <CheckCircle2 size={12} className={statusCfg.dot} />
                              {statusCfg.label}
                            </div>
                          </div>
                          <div className="p-5 flex-1 flex flex-col gap-4">
                            <div className="bg-[#0f1117] border border-gray-700/60 rounded-lg p-4 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-800 border border-[#facc15]/30 shrink-0 flex items-center justify-center">
                                  {(activeJockey.imageUrl || activeJockey.certificateImageUrl || activeJockey.account?.avatarUrl)
                                    ? <img src={activeJockey.imageUrl || activeJockey.certificateImageUrl || activeJockey.account?.avatarUrl} alt={jockeyName} className="w-full h-full object-cover" onError={e => { e.target.style.display='none' }} />
                                    : <span className="text-sm font-black text-[#facc15]">{jockeyName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</span>}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <h4 className="text-gray-100 font-semibold text-sm truncate">{jockeyName}</h4>
                                    {tier !== 'Rising' && (
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border shrink-0 ${ts}`}>{tier}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-0.5">
                                    <span className="text-xs text-gray-500">
                                      <span className="text-gray-600 text-[9px] uppercase tracking-wider">Weight </span>
                                      {activeJockey.weight ? `${activeJockey.weight} kg` : '—'}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      <span className="text-gray-600 text-[9px] uppercase tracking-wider">Win Rate </span>
                                      {activeJockey.totalRaces > 0 ? `${Math.round((wins / activeJockey.totalRaces) * 100)}%` : '—'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => setSelectedJockey(null)}
                                title="Unassign Jockey"
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1.5 rounded-md transition-colors shrink-0"
                              >
                                <X size={16} strokeWidth={2.5} />
                              </button>
                            </div>
                          </div>
                          <div className="px-5 pb-5 flex gap-3">
                            <button className="flex-1 py-2.5 bg-transparent border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-1.5">
                              <MessageSquare size={13} /> Message
                            </button>
                            <button
                              onClick={() => openJockeyModal()}
                              className="flex-1 py-2.5 bg-[#facc15]/10 hover:bg-[#facc15]/20 text-[#facc15] border border-[#facc15]/30 hover:border-[#facc15]/60 rounded-lg font-semibold text-sm transition-colors"
                            >
                              Reassign
                            </button>
                          </div>
                        </div>
                      )
                    })()}

                    {/* Right — Reassign dashed area */}
                    <div
                      onClick={() => openJockeyModal()}
                      className="border-2 border-dashed border-[#facc15]/40 bg-[#facc15]/5 hover:border-[#facc15]/70 transition-colors rounded-xl p-12 flex flex-col items-center justify-center text-center cursor-pointer min-h-[340px]"
                    >
                      <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                        <UserPlus size={26} className="text-[#facc15]" />
                      </div>
                      <h4 className="text-gray-200 font-bold text-base mb-2">Change Jockey</h4>
                      <p className="text-sm text-gray-500 mb-6">Click to reassign a different rider.</p>
                      <button
                        onClick={e => { e.stopPropagation(); openJockeyModal() }}
                        className="border border-[#facc15]/50 hover:border-[#facc15] text-[#facc15] px-7 py-2.5 rounded-lg text-sm font-bold transition-colors"
                      >
                        Reassign
                      </button>
                    </div>
                  </div>
                )
              })() : (
                /* Empty state */
                <div
                  onClick={() => openJockeyModal()}
                  className="border-2 border-dashed border-gray-700 bg-[#0f1117] hover:border-[#facc15]/40 hover:bg-[#facc15]/5 transition-colors rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-3">
                    <UserPlus size={22} className="text-gray-400" />
                  </div>
                  <h4 className="text-gray-200 font-bold text-base mb-1">No Jockey Assigned</h4>
                  <p className="text-sm text-gray-500 mb-5">Click to browse and assign a professional jockey.</p>
                  <button
                    onClick={e => { e.stopPropagation(); openJockeyModal() }}
                    className="bg-[#facc15] hover:bg-yellow-400 text-black px-6 py-2.5 rounded-lg text-sm font-bold transition-colors"
                  >
                    Assign Jockey
                  </button>
                </div>
              )}
            </div>

            <hr className="border-gray-800 mb-6" />

            {/* Entry Fee */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-base font-bold text-white mb-0.5">Registration Entry Fee</h3>
                <p className="text-xs text-gray-400 font-medium">Standard entry fee for this race.</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-white">
                  {entryFee !== null ? Number(entryFee).toLocaleString('vi-VN') : '—'}
                  <span className="text-sm text-gray-400 ml-2">VND</span>
                </p>
              </div>
            </div>

            {/* Terms */}
            <label className="flex items-start gap-4 mb-8 cursor-pointer group" onClick={() => setAgreed(a => !a)}>
              <div className={`w-5 h-5 rounded border flex shrink-0 items-center justify-center mt-0.5 transition-colors
                ${agreed ? 'bg-[#facc15] border-[#facc15]' : 'border-gray-600 bg-[#1a1f2b] group-hover:border-[#facc15]'}`}>
                {agreed && (
                  <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <p className="text-[13px] text-gray-400 leading-relaxed font-medium select-none">
                I agree to the{' '}
                <span className="text-[#facc15] underline decoration-[#facc15]/40 underline-offset-2">Racing Regulations</span>
                {' '}and understand that the entry fee is non-refundable upon confirmation. I certify that both horse and jockey meet the required health and licensing standards.
              </p>
            </label>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium">
                <X size={14} /> {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-4">
              <button
                onClick={() => navigate('/owner/races')}
                className="px-6 py-3.5 text-sm font-bold text-gray-300 hover:text-white border border-transparent hover:border-gray-700 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || !selectedJockey}
                className={`px-8 py-3.5 text-sm font-bold rounded-xl flex items-center gap-2 transition-all
                  ${selectedJockey
                    ? 'bg-[#facc15] hover:bg-yellow-400 text-black shadow-[0_0_20px_rgba(250,204,21,0.15)]'
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  } disabled:opacity-70`}
              >
                {saving ? 'Submitting…' : 'Confirm Entry'}
                {!saving && <ChevronRight size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {horseModalOpen && (
        <HorseSelectionModal
          horses={horses}
          selectedId={selectedHorse}
          onSelect={setSelectedHorse}
          onClose={() => setHorseModalOpen(false)}
        />
      )}

      {jockeyModalOpen && (
        <JockeySelectionModal
          jockeys={jockeys}
          loading={jockeyLoading}
          selectedId={selectedJockey}
          raceName={race?.raceName || `Race #${race?.raceNumber}`}
          onSelect={setSelectedJockey}
          onClose={() => setJockeyModalOpen(false)}
        />
      )}
    </OwnerLayout>
  )
}
