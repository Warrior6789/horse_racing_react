import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, Plus, X, LayoutGrid, List, CalendarPlus, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import OwnerLayout from '../../components/OwnerLayout'
import { getHorses, deleteHorse } from '../../api/horses'
import { getRacesPaged, registerHorseToRace } from '../../api/races'
import { getJockeysPaged } from '../../api/jockeyProfiles'


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

function HorseCard({ horse, onEdit, onDelete, onRegister }) {
  const status = horse.status || 'Healthy'
  const isAvailable = status === 'Healthy'

  let primaryBtnCls  = 'bg-[#1a2031] text-gray-400 border border-gray-700 cursor-default'
  let primaryBtnText = 'Resting'
  if (status === 'Healthy') {
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
        {isAvailable && (
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

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[#11141e] border border-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4 my-auto">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors"><X size={18} /></button>
        </div>
        {children}
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
  const [gridPage, setGridPage] = useState(1)
  const LIST_SIZE = 8
  const GRID_SIZE = 3
  const [modal, setModal]       = useState(null)
  const [regHorse, setRegHorse] = useState(null)
  const [races, setRaces]       = useState([])
  const [jockeys, setJockeys]   = useState([])
  const [reg, setReg]           = useState({ raceId: '', jockeyId: '', gateNumber: '' })
  const [regError, setRegError] = useState('')

  const load = () => {
    setLoading(true)
    getHorses({ page: 1, pageSize: 100 })
      .then(r => setHorses(r.data.data?.items || []))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openRegister = async (h) => {
    setRegHorse(h); setReg({ raceId: '', jockeyId: '', gateNumber: '' }); setRegError(''); setModal('register')
    const [rRes, jRes] = await Promise.all([
      getRacesPaged({ page: 1, pageSize: 50, status: 'Scheduled' }).catch(() => ({ data: { data: {} } })),
      getJockeysPaged({ page: 1, pageSize: 50 }).catch(() => ({ data: { data: {} } })),
    ])
    setRaces(rRes.data.data?.items || [])
    setJockeys(jRes.data.data?.items || [])
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this horse?')) return
    await deleteHorse(id).catch(() => {})
    load()
  }

  const submitReg = async () => {
    if (!reg.raceId || !reg.jockeyId) { setRegError('Please select race and jockey.'); return }
    setRegError('')
    try {
      await registerHorseToRace(reg.raceId, { horseId: regHorse.horseId, jockeyId: reg.jockeyId, gateNumber: reg.gateNumber || undefined })
      setModal(null); alert('Horse registered!')
    } catch (e) { setRegError(e.response?.data?.message || 'Registration failed.') }
  }

  const inputCls = 'w-full bg-[#0b0f19] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-yellow-500/40 transition-colors placeholder:text-gray-600'
  const labelCls = 'block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5'

  const counts = {
    All:     horses.length,
    Healthy: horses.filter(h => h.status === 'Healthy').length,
    Injury:  horses.filter(h => h.status === 'Injury').length,
    Resting: horses.filter(h => h.status === 'Resting').length,
    Retired: horses.filter(h => h.status === 'Retired').length,
  }

  const displayed = filter === 'All' ? horses : horses.filter(h => h.status === filter)

  const f = (k) => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })

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
                  onClick={() => { setFilter(s); setGridPage(1); setListPage(1) }}
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
          ) : view === 'grid' ? (() => {
            const gridTotalPages = Math.max(1, Math.ceil(displayed.length / GRID_SIZE))
            const safeGridPage   = Math.min(gridPage, gridTotalPages)
            const gridItems      = displayed.slice((safeGridPage - 1) * GRID_SIZE, safeGridPage * GRID_SIZE)
            return (
              <div className="space-y-6 pb-24">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {gridItems.map(h => (
                    <HorseCard key={h.horseId ?? h.id} horse={h} onEdit={h => navigate(`/owner/horses/${h.horseId ?? h.id}/edit`)} onDelete={handleDelete} onRegister={h => navigate('/owner/races', { state: { preselectedHorseId: h.horseId ?? h.id } })} />
                  ))}
                </div>
                {gridTotalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-gray-400 text-sm font-medium">
                      Showing {(safeGridPage - 1) * GRID_SIZE + 1}–{Math.min(safeGridPage * GRID_SIZE, displayed.length)} of {displayed.length} horses
                    </p>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setGridPage(p => Math.max(1, p - 1))}
                        disabled={safeGridPage === 1}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-800 text-gray-400 hover:bg-gray-800 transition-colors disabled:opacity-40"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      {Array.from({ length: gridTotalPages }, (_, i) => i + 1).map(p => (
                        <button
                          key={p}
                          onClick={() => setGridPage(p)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                            p === safeGridPage
                              ? 'bg-[#facc15] text-black'
                              : 'border border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-white'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        onClick={() => setGridPage(p => Math.min(gridTotalPages, p + 1))}
                        disabled={safeGridPage === gridTotalPages}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-800 text-gray-400 hover:bg-gray-800 transition-colors disabled:opacity-40"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })() : (
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
                                <div className="w-12 h-12 rounded-lg bg-gray-800 border border-gray-700 overflow-hidden flex items-center justify-center text-2xl">
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
                                    <button
                                      onClick={() => navigate('/owner/races')}

                                      title="Register to Race"
                                      className="p-2 hover:bg-[#1a2031] hover:text-yellow-400 rounded-lg transition-colors"
                                    >
                                      <CalendarPlus size={18} />
                                    </button>
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

      {/* Register Modal */}
      {modal === 'register' && (
        <Modal title={`Register ${regHorse?.horseName} to Race`} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Select Race *</label>
              <select className={inputCls} value={reg.raceId} onChange={e => setReg(p => ({ ...p, raceId: e.target.value }))}>
                <option value="">Choose race...</option>
                {races.map(r => (
                  <option key={r.raceId} value={r.raceId}>
                    Race #{r.raceNumber} — {r.racecourseName} ({new Date(r.startTime).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Select Jockey *</label>
              <select className={inputCls} value={reg.jockeyId} onChange={e => setReg(p => ({ ...p, jockeyId: e.target.value }))}>
                <option value="">Choose jockey...</option>
                {jockeys.map(j => (
                  <option key={j.accountId} value={j.accountId}>
                    {j.fullName} ({j.licenseNumber || 'No license'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Gate Number (optional)</label>
              <input type="number" min="1" className={inputCls} value={reg.gateNumber} onChange={e => setReg(p => ({ ...p, gateNumber: e.target.value }))} />
            </div>
          </div>
          {regError && <p className="text-xs text-red-400">{regError}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={() => setModal(null)} className="flex-1 h-11 border border-gray-700 rounded-xl text-sm font-bold text-gray-400 hover:bg-[#1a2031] transition-colors">
              Cancel
            </button>
            <button onClick={submitReg} className="flex-1 h-11 bg-[#facc15] hover:bg-yellow-400 text-black rounded-xl text-sm font-bold transition-colors">
              Register
            </button>
          </div>
        </Modal>
      )}
    </OwnerLayout>
  )
}
