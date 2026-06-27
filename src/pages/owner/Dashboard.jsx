import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Orbit, Calendar, Banknote, ChevronRight, Radio, Flag } from 'lucide-react'
import OwnerLayout from '../../components/OwnerLayout'
import CardCarousel from '../../components/CardCarousel'
import { getHorses } from '../../api/horses'
import { getBalance } from '../../api/payments'
import { getOwnerAllRegistrations } from '../../api/registrations'
import { useRaceHub } from '../../hooks/useRaceHub'
import { useAuth } from '../../context/AuthContext'

const STATUS_CLS = {
  Healthy: 'bg-green-900/60 text-green-400',
  Resting: 'bg-blue-900/60 text-blue-400',
  Injury:  'bg-red-900/60 text-red-400',
  Retired: 'bg-gray-800 text-gray-500',
}

function StatCard({ icon: Icon, title, value, subtitle, badge, badgeCls, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-[#1a1c23] p-4 rounded-xl border border-gray-800 flex flex-col gap-3 relative overflow-hidden ${onClick ? 'cursor-pointer hover:border-gray-600 transition-colors' : ''}`}
    >
      {badge && (
        <span className={`absolute top-4 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeCls}`}>
          {badge}
        </span>
      )}
      <div className="text-gray-400"><Icon size={22} /></div>
      <div>
        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
        <div className="flex items-baseline gap-2">
          <h3 className={`text-2xl font-bold ${subtitle ? 'text-yellow-500' : 'text-white'}`}>{value}</h3>
          {subtitle && <span className="text-yellow-500 text-sm font-bold">{subtitle}</span>}
        </div>
      </div>
    </div>
  )
}

function HorseCard({ horse }) {
  const navigate = useNavigate()
  const cls = STATUS_CLS[horse.status] || STATUS_CLS.Inactive
  const horseId = horse.horseId ?? horse.id
  return (
    <div className="bg-[#1a1c23] rounded-xl border border-gray-800 overflow-hidden flex flex-col">
      <div className="h-40 bg-gray-800 relative">
        {horse.imageUrl
          ? <img src={horse.imageUrl} alt={horse.horseName} className="w-full h-full object-cover block" />
          : <div className="w-full h-full flex items-center justify-center text-5xl">🐴</div>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1c23] to-transparent pointer-events-none" />
        <span className={`absolute top-3 right-3 z-10 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1.5 ${cls}`}>
          {horse.status === 'Healthy' && <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />}
          {horse.status}
        </span>
      </div>
      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div>
          <h4 className="text-white font-bold text-lg">{horse.horseName}</h4>
          <p className="text-gray-400 text-xs font-medium mb-4">
            {horse.breed || 'Unknown'} &bull; {horse.age ? `${horse.age}yo` : '—'} &bull; {horse.color || '—'}
          </p>
          <div className="flex justify-between border-t border-gray-800/80 pt-4">
            <div>
              <p className="text-gray-500 text-[10px] font-bold uppercase mb-1">Wins</p>
              <p className="text-white font-bold text-sm">{horse.recordWins ?? 0}</p>
            </div>
            <div>
              <p className="text-gray-500 text-[10px] font-bold uppercase mb-1">Weight</p>
              <p className="text-white font-bold text-sm">{horse.weight ? `${horse.weight}kg` : '—'}</p>
            </div>
            <div>
              <p className="text-gray-500 text-[10px] font-bold uppercase mb-1">Status</p>
              <p className="text-white font-bold text-sm">{horse.status}</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate('/owner/races', { state: { preselectedHorseId: horseId } })}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-yellow-600/50 text-yellow-500 hover:bg-yellow-500/10 transition-colors text-xs font-bold"
        >
          <Flag size={13} /> Register to Race
        </button>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center h-40">
      <div className="w-8 h-8 border-2 border-gray-700 border-t-yellow-500 rounded-full animate-spin" />
    </div>
  )
}

export default function OwnerDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [horses,        setHorses]       = useState([])
  const [registrations, setRegistrations] = useState([])
  const [balance,       setBalance]       = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [refreshKey,    setRefreshKey]    = useState(0)

  const handleRacesUpdated = useCallback(() => setRefreshKey(k => k + 1), [])

  const handleBalanceUpdated = useCallback((data) => {
    if (data?.accountId !== user?.id) return
    if (data.newBalance != null) setBalance(data.newBalance)
  }, [user])

  useRaceHub(null, { onRacesUpdated: handleRacesUpdated, onBalanceUpdated: handleBalanceUpdated })

  useEffect(() => {
    Promise.all([
      getHorses({ page: 1, pageSize: 100 }).then(r => r.data.data?.items || []).catch(() => []),
      getOwnerAllRegistrations().then(r => r.data.data || []).catch(() => []),
      getBalance().then(r => r.data.data?.balance ?? 0).catch(() => null),
    ]).then(([h, regs, b]) => { setHorses(h); setRegistrations(regs); setBalance(b) })
      .finally(() => setLoading(false))
  }, [refreshKey])

  const active       = horses.filter(h => h.status === 'Healthy').length
  const pending      = registrations.filter(s => s.status === 'Pending').length
  const formattedBal = balance !== null ? balance.toLocaleString('vi-VN') : '—'
  const preview      = horses

  const STATUS_ORDER = { Live: 0, BettingOpen: 1, BettingClosed: 2, Scheduled: 3 }
  const upcoming = [...registrations]
    .filter(s => !['Finished', 'Cancelled'].includes(s.race?.status))
    .sort((a, b) => {
      const sa = STATUS_ORDER[a.race?.status] ?? 9
      const sb = STATUS_ORDER[b.race?.status] ?? 9
      if (sa !== sb) return sa - sb
      return new Date(a.race?.startTime) - new Date(b.race?.startTime)
    })
    .slice(0, 5)

  return (
    <OwnerLayout>
      <div className="p-4 md:p-8 space-y-6 md:space-y-10 max-w-7xl mx-auto">

        {/* KPI */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
          <StatCard icon={Orbit}    title="Total Horses"          value={horses.length} />
          <StatCard icon={Calendar} title="Healthy"               value={active} badge="Healthy" badgeCls="bg-green-900/40 text-green-400" />
          <StatCard icon={Calendar} title="Pending Registrations" value={pending} badge={pending > 0 ? `${pending} Pending` : undefined} badgeCls="bg-yellow-900/40 text-yellow-400" />
          <StatCard icon={Banknote} title="Total Earn"            value={formattedBal} subtitle="VND" onClick={() => navigate('/owner/wallet')} />
        </div>

        {/* My Horses */}
        <section>
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">My Horses</h2>
              <p className="text-gray-400 text-sm">Status and performance overview for your active stable members.</p>
            </div>
            <Link to="/owner/horses" className="text-yellow-500 hover:text-yellow-400 text-sm font-bold flex items-center gap-1 transition-colors">
              View All Stable <ChevronRight size={16} />
            </Link>
          </div>

          {loading ? <Spinner /> : preview.length === 0 ? (
            <div className="text-center py-16 text-gray-500 bg-[#1a1c23] rounded-xl border border-gray-800">
              No horses yet.{' '}
              <Link to="/owner/horses" className="text-yellow-500 hover:text-yellow-400 font-bold">Add your first horse →</Link>
            </div>
          ) : (
            <CardCarousel count={preview.length}>
              {preview.map(h => (
                <div key={h.horseId ?? h.id} className="snap-start shrink-0 w-[calc(33.333%-11px)]">
                  <HorseCard horse={h} />
                </div>
              ))}
            </CardCarousel>
          )}
        </section>

        {/* Schedule table */}
        <section className="bg-[#1a1c23] rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-800 flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">Race Schedule</h2>
            <Link to="/owner/schedule" className="text-yellow-500 hover:text-yellow-400 text-sm font-bold flex items-center gap-1">
              View All <ChevronRight size={16} />
            </Link>
          </div>

          {loading ? <Spinner /> : upcoming.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-sm">No upcoming races scheduled.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="text-gray-500 text-[11px] uppercase tracking-wider border-b border-gray-800 bg-[#16181d]/50">
                    {['Race', 'Date & Time', 'Horse', 'Jockey', 'Gate', 'Venue', ''].map(col => (
                      <th key={col} className="px-6 py-4 font-bold">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/80">
                  {upcoming.map((item, i) => {
                    const r = item.race || {}
                    const h = item.horse || {}
                    return (
                    <tr key={item.registrationId ?? i} className="hover:bg-gray-800/40 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-200 text-sm group-hover:text-white">Race #{r.raceNumber || '—'}</p>
                        {r.status && (
                          <p className="text-[10px] text-yellow-500 font-bold uppercase mt-1 tracking-wide">{r.status}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-300 text-sm font-medium">
                          {r.startTime ? new Date(r.startTime).toLocaleDateString() : '—'}
                        </p>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {r.startTime ? new Date(r.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-300 text-sm font-bold">{h.horseName || '—'}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-sm">
                        {item.jockeyConfirmation === true
                          ? <span className="text-green-400 font-bold text-xs">Confirmed</span>
                          : item.jockeyId
                          ? <span className="text-yellow-400 text-xs">Pending</span>
                          : <span className="text-gray-600 text-xs">—</span>}
                      </td>
                      <td className="px-6 py-4 text-gray-300 text-sm font-bold text-center">
                        {item.gateNumber ? `#${item.gateNumber}` : '—'}
                      </td>
                      <td className="px-6 py-4 text-gray-300 text-sm">{r.racecourseName || '—'}</td>
                      <td className="px-6 py-4">
                        {r.status === 'Live' && r.raceId && (
                          <button
                            onClick={() => navigate(`/owner/races/${r.raceId}/live`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-red-900 text-red-400 hover:bg-red-950/50 rounded-lg transition-colors text-xs font-bold whitespace-nowrap"
                          >
                            <Radio size={10} className="animate-pulse" /> Watch Live
                          </button>
                        )}
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </OwnerLayout>
  )
}
