import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, Plus, LayoutGrid, List, CalendarPlus, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import OwnerLayout from '../../components/OwnerLayout'
import CardCarousel from '../../components/CardCarousel'
import { getHorses, deleteHorse } from '../../api/horses'
import { getOwnerAllRegistrations } from '../../api/registrations'


const STATUS_DOT = {
  Healthy: 'bg-green-500',
  Resting: 'bg-blue-500',
  Injury:  'bg-red-500',
  Retired: 'bg-gray-500',
}

function StatusDot({ status }) {
  return <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[status] || 'bg-gray-500'}`} />
}

function FilterPill({ label, count, status, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
        active
          ? 'bg-[#1a2031] text-white border border-gray-700'
          : 'bg-transparent text-gray-400 border border-gray-800 hover:border-gray-600'
      }`}
    >
      {status && <StatusDot status={status} />}
      {label}
      {count !== undefined && (
        <span className="bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded text-[10px]">{count}</span>
      )}
    </button>
  )
}

function HorseCard({ horse, onEdit, onDelete, onRegister, regStatus }) {
  const status = horse.status || 'Healthy'
  const isConfirmed = regStatus === 'Confirmed'
  const isPending   = regStatus === 'Pending'
  const hasActiveReg = isConfirmed || isPending
  const isAvailable = status === 'Healthy' && !hasActiveReg

  let primaryBtnCls  = 'bg-[#1a2031] text-gray-400 border border-gray-700 cursor-default'
  let primaryBtnText = 'Resting'
  if (isConfirmed) {
    primaryBtnCls  = 'bg-green-900/20 text-green-400 border border-green-900/50 cursor-not-allowed'
    primaryBtnText = '✓ In Race'
  } else if (isPending) {
    primaryBtnCls  = 'bg-amber-900/20 text-amber-400 border border-amber-900/50 cursor-not-allowed'
    primaryBtnText = 'Awaiting Jockey'
  } else if (status === 'Healthy') {
    primaryBtnCls  = 'bg-[#facc15] text-black hover:bg-yellow-400 font-bold'
    primaryBtnText = 'Register to Race'
  } else if (status === 'Injury') {
    primaryBtnCls  = 'bg-red-900/20 text-red-400 border border-red-900/50 hover:bg-red-900/40'
    primaryBtnText = 'In Rehab'
  }

  return (
    <div className="bg-[#151a28] rounded-2xl border border-gray-800/80 overflow-hidden flex flex-col hover:border-gray-700 transition-colors">
      {/* Image */}
      <div className="h-48 bg-gray-800 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-[#151a28] via-transparent to-transparent z-10 pointer-events-none" />
        {horse.imageUrl
          ? <img src={horse.imageUrl} alt={horse.horseName} className="w-full h-full object-cover block" />
          : <div className="w-full h-full flex items-center justify-center text-5xl">🐴</div>
        }
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-[#0b0f19]/80 backdrop-blur-sm px-2.5 py-1 rounded-full border border-gray-700/50">
          <StatusDot status={status} />
          <span className="text-white text-[10px] font-bold">{status}</span>
        </div>
        {isConfirmed ? (
          <div className="absolute top-3 right-3 z-20 bg-green-900/60 backdrop-blur-sm border border-green-700/50 text-green-400 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide">
            IN RACE
          </div>
        ) : isPending ? (
          <div className="absolute top-3 right-3 z-20 bg-amber-900/60 backdrop-blur-sm border border-amber-700/50 text-amber-400 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide">
            PENDING
          </div>
        ) : isAvailable && (
          <div className="absolute top-3 right-3 z-20 bg-[#facc15]/20 backdrop-blur-sm border border-[#facc15]/30 text-[#facc15] px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide">
            AVAILABLE
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between z-20 -mt-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h4 className="text-white font-bold text-lg leading-tight">{horse.horseName}</h4>
            <p className="text-gray-400 text-xs font-medium mt-1">
              {horse.breed || 'Unknown'} &bull; {horse.color || '—'}
            </p>
          </div>
          <div className="bg-[#1a2031] border border-gray-800 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shrink-0">
            <Trophy size={14} className="text-gray-400" />
            <span className="text-white font-bold text-sm">{horse.recordWins ?? 0}</span>
          </div>
        </div>

        <div className="flex justify-between items-center mb-5">
          <div>
            <p className="text-gray-500 text-[10px] font-bold uppercase mb-1">Age</p>
            <p className="text-gray-200 font-bold text-sm">{horse.age ? `${horse.age} Years` : '—'}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 text-[10px] font-bold uppercase mb-1">Weight</p>
            <p className="text-gray-200 font-bold text-sm">{horse.weight ? `${horse.weight} kg` : '—'}</p>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => isAvailable && onRegister(horse)}
            className={`w-full py-2.5 rounded-lg text-sm transition-colors ${primaryBtnCls}`}
          >
            {primaryBtnText}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onEdit(horse)}
              className="bg-transparent hover:bg-[#1a2031] text-gray-400 hover:text-white border border-gray-700 rounded-lg py-2 text-xs font-bold transition-colors"
            >
              Edit Profile
            </button>
            <button
              onClick={() => onDelete(horse.horseId ?? horse.id)}
              className="bg-transparent hover:bg-red-900/20 text-gray-400 hover:text-red-400 border border-gray-700 hover:border-red-900/50 rounded-lg py-2 text-xs font-bold transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MyHorses() {
  const [horses, setHorses]     = useState([])
  const navigate                = useNavigate()
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('All')
  const [view, setView]         = useState('grid')
  const [listPage, setListPage] = useState(1)
  const LIST_SIZE = 8
  const [regStatusByHorseId, setRegStatusByHorseId] = useState(new Map())

  const load = () => {
    setLoading(true)
    Promise.all([
      getHorses({ page: 1, pageSize: 100 }),
      getOwnerAllRegistrations().catch(() => ({ data: { data: [] } })),
    ]).then(([hRes, rRes]) => {
      setHorses(hRes.data.data?.items || [])
      const regs = rRes.data.data || []
      const map = new Map()
      regs
        .filter(r => r.status !== 'Rejected' && r.status !== 'Scratched')
        .forEach(r => {
          const hId = r.horseId || r.horse?.horseId
          if (hId) map.set(hId, r.status)
        })
      setRegStatusByHorseId(map)
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this horse?')) return
    await deleteHorse(id).catch(() => {})
    load()
  }

  const counts = {
    All:     horses.length,
    Healthy: horses.filter(h => h.status === 'Healthy').length,
    Injury:  horses.filter(h => h.status === 'Injury').length,
    Resting: horses.filter(h => h.status === 'Resting').length,
    Retired: horses.filter(h => h.status === 'Retired').length,
  }

  const displayed = filter === 'All' ? horses : horses.filter(h => h.status === filter)

  return (
    <OwnerLayout>
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Title */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">My Horses</h2>
              <p className="text-gray-400 text-sm font-medium">Manage your stable's performance, health, and race registrations.</p>
            </div>
            <div className="flex bg-[#151a28] p-1 rounded-lg border border-gray-800 shrink-0 w-fit">
              <button
                onClick={() => setView('grid')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${view === 'grid' ? 'bg-[#facc15] text-black' : 'text-gray-400 hover:text-white'}`}
              >
                <LayoutGrid size={15} /> Grid
              </button>
              <button
                onClick={() => setView('list')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${view === 'list' ? 'bg-[#facc15] text-black' : 'text-gray-400 hover:text-white'}`}
              >
                <List size={15} /> List
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[#11141e] p-3 rounded-xl border border-gray-800/80">
            <div className="flex items-center gap-2 flex-wrap">
              {['All', 'Healthy', 'Injury', 'Resting', 'Retired'].map(s => (
                <FilterPill
                  key={s}
                  label={s === 'All' ? 'All Horses' : s}
                  count={s === 'All' ? counts.All : undefined}
                  status={s !== 'All' ? s : undefined}
                  active={filter === s}
                  onClick={() => { setFilter(s); setListPage(1) }}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-gray-700 border-t-yellow-500 rounded-full animate-spin" />
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-20 text-gray-500">No horses found.</div>
          ) : view === 'grid' ? (
            <div className="pb-6">
              <CardCarousel count={displayed.length}>
                {displayed.map(h => (
                  <div key={h.horseId ?? h.id} className="snap-start shrink-0 w-[calc(33.333%-11px)]">
                    <HorseCard horse={h} onEdit={h => navigate(`/owner/horses/${h.horseId ?? h.id}/edit`)} onDelete={handleDelete} onRegister={h => navigate('/owner/races', { state: { preselectedHorseId: h.horseId ?? h.id } })} regStatus={regStatusByHorseId.get(h.horseId ?? h.id)} />
                  </div>
                ))}
              </CardCarousel>
            </div>
          ) : (
            /* List View */
            (() => {
              const totalPages = Math.max(1, Math.ceil(displayed.length / LIST_SIZE))
              const safePage   = Math.min(listPage, totalPages)
              const pageItems  = displayed.slice((safePage - 1) * LIST_SIZE, safePage * LIST_SIZE)
              return (
                <div className="space-y-4 pb-24">
                  <div className="bg-[#151a28] rounded-2xl border border-gray-800/80 overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead>
                        <tr className="text-gray-500 text-[10px] uppercase tracking-wider border-b border-gray-800/50">
                          <th className="px-6 py-4 font-bold w-16">Horse</th>
                          <th className="px-6 py-4 font-bold">Name & Breed</th>
                          <th className="px-6 py-4 font-bold">Age</th>
                          <th className="px-6 py-4 font-bold">Weight</th>
                          <th className="px-6 py-4 font-bold">Wins</th>
                          <th className="px-6 py-4 font-bold">Status</th>
                          <th className="px-6 py-4 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/50">
                        {pageItems.map(h => {
                          const status = h.status || 'Active'
                          const hId = h.horseId ?? h.id
                          return (
                            <tr key={hId} className="hover:bg-white/[0.02] transition-colors group">
                              <td className="px-6 py-4">
                                <div className="w-12 h-12 rounded-full bg-gray-800 border border-gray-700 overflow-hidden flex items-center justify-center text-2xl">
                                  {h.imageUrl
                                    ? <img src={h.imageUrl} alt="" className="w-full h-full object-cover" />
                                    : '🐴'}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <p className="font-bold text-gray-200 text-base group-hover:text-white transition-colors">{h.horseName}</p>
                                <p className="text-xs text-gray-500 font-medium mt-1">{h.breed || '—'} &bull; {h.color || '—'}</p>
                              </td>
                              <td className="px-6 py-4 font-bold text-gray-300 text-sm">{h.age ? `${h.age} Years` : '—'}</td>
                              <td className="px-6 py-4 font-bold text-gray-300 text-sm">{h.weight ? `${h.weight} kg` : '—'}</td>
                              <td className="px-6 py-4 font-black text-white text-base">{h.recordWins ?? 0}</td>
                              <td className="px-6 py-4">
                                <div className="inline-flex items-center gap-2 bg-[#11141e] border border-gray-800 px-3 py-1.5 rounded-full">
                                  <StatusDot status={status} />
                                  <span className="text-gray-300 text-xs font-bold">{status}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1 text-gray-400">
                                  {status === 'Active' && (
                                    regStatusByHorseId.has(hId) ? (
                                      <span
                                        title={regStatusByHorseId.get(hId) === 'Confirmed' ? 'Already in a race' : 'Awaiting jockey confirmation'}
                                        className={`p-2 cursor-not-allowed ${regStatusByHorseId.get(hId) === 'Confirmed' ? 'text-green-600' : 'text-amber-500'}`}
                                      >
                                        <CalendarPlus size={18} />
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => navigate('/owner/races')}
                                        title="Register to Race"
                                        className="p-2 hover:bg-[#1a2031] hover:text-yellow-400 rounded-lg transition-colors"
                                      >
                                        <CalendarPlus size={18} />
                                      </button>
                                    )
                                  )}
                                  <button
                                    onClick={() => navigate(`/owner/horses/${hId}/edit`)}
                                    title="Edit Profile"
                                    className="p-2 hover:bg-[#1a2031] hover:text-white rounded-lg transition-colors"
                                  >
                                    <Edit2 size={18} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(hId)}
                                    title="Delete"
                                    className="p-2 hover:bg-red-900/20 hover:text-red-400 rounded-lg transition-colors"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between">
                    <p className="text-gray-400 text-sm font-medium">
                      Showing {(safePage - 1) * LIST_SIZE + 1}–{Math.min(safePage * LIST_SIZE, displayed.length)} of {displayed.length} horses
                    </p>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setListPage(p => Math.max(1, p - 1))}
                        disabled={safePage === 1}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-800 text-gray-400 hover:bg-gray-800 transition-colors disabled:opacity-40"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <button
                          key={p}
                          onClick={() => setListPage(p)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                            p === safePage
                              ? 'bg-[#facc15] text-black'
                              : 'border border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-white'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        onClick={() => setListPage(p => Math.min(totalPages, p + 1))}
                        disabled={safePage === totalPages}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-800 text-gray-400 hover:bg-gray-800 transition-colors disabled:opacity-40"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })()
          )}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/owner/horses/new')}
        className="fixed bottom-8 right-8 w-14 h-14 bg-[#facc15] hover:bg-yellow-400 text-black rounded-full shadow-[0_0_20px_rgba(250,204,21,0.3)] flex items-center justify-center transition-transform hover:scale-105 z-40"
      >
        <Plus size={26} />
      </button>
    </OwnerLayout>
  )
}
