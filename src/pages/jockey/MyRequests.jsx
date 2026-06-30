import { useEffect, useState, useCallback } from 'react'
import { Check, X, Clock, AlertCircle, Trophy, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import JockeyLayout from '../../components/JockeyLayout'
import { getJockeyMyRequestsPaged, acceptRegistration, rejectRegistration } from '../../api/registrations'
import { getBalance } from '../../api/payments'
import { useRaceHub } from '../../hooks/useRaceHub'
import { useAuth } from '../../context/AuthContext'

const PAGE_SIZE = 10

function StatCard({ title, value, subtitle, icon: Icon }) {
  return (
    <div className="bg-[#1a2130] p-6 rounded-xl border border-gray-700/50">
      <div className="flex justify-between items-start mb-4">
        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">{title}</p>
        <Icon size={18} className="text-gray-500" />
      </div>
      <h3 className="text-2xl font-black text-white">{value}</h3>
      <p className="text-gray-500 text-xs mt-1">{subtitle}</p>
    </div>
  )
}

const STATUS_CLS = {
  Pending:  'bg-yellow-900/30 text-yellow-400 border border-yellow-700/40',
  Accepted: 'bg-green-900/30 text-green-400 border border-green-700/40',
  Rejected: 'bg-red-900/30 text-red-400 border border-red-700/40',
}

export default function JockeyRequests() {
  const { user, updateUser } = useAuth()
  const [regs, setRegs]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [acting, setActing]       = useState(null)
  const [page, setPage]           = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const fetchData = useCallback((p = 1) => {
    setLoading(true)
    getJockeyMyRequestsPaged({ page: p, pageSize: PAGE_SIZE })
      .then(r => {
        const d = r.data.data
        const items = d?.items || d || []
        if (items.length > 0) console.log('[MyRequests] horse object:', items[0].horse)
        setRegs(items)
        setTotalPages(d?.totalPages ?? 1)
        setTotalCount(d?.totalCount ?? (d?.items?.length ?? 0))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchData(page) }, [fetchData, page])

  const handleRegistrationsUpdated = useCallback((data) => {
    if (data?.jockeyId && data.jockeyId !== user?.id) return
    fetchData(page)
  }, [fetchData, page, user])

  useRaceHub(null, { onRegistrationsUpdated: handleRegistrationsUpdated })

  const handle = async (id, action) => {
    setActing(id)
    try {
      if (action === 'accept') {
        await acceptRegistration(id)
      } else {
        await rejectRegistration(id)
        // refresh balance since owner gets refund → jockey balance unaffected,
        // but keep UI consistent by refreshing
        getBalance().then(r => {
          const bal = r.data.data?.balance
          if (bal != null) updateUser({ balance: bal })
        }).catch(() => {})
      }
      fetchData(page)
    } catch {}
    finally { setActing(null) }
  }

  const pending  = regs.filter(r => r.jockeyConfirmation === null || r.jockeyConfirmation === undefined).length
  const accepted = regs.filter(r => r.jockeyConfirmation === true).length
  const rejected = regs.filter(r => r.jockeyConfirmation === false).length

  return (
    <JockeyLayout>
      <div className="p-4 md:p-8 space-y-6 md:space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-white mb-1">Pending Race Invitations</h1>
          <p className="text-gray-400 text-sm">Review and respond to race assignment requests from horse owners.</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Pending"  value={pending}     subtitle="Requires action"     icon={Clock}        />
          <StatCard title="Accepted" value={accepted}    subtitle="Confirmed races"      icon={Trophy}       />
          <StatCard title="Rejected" value={rejected}    subtitle="Declined invitations" icon={AlertCircle}  />
          <StatCard title="Total"    value={totalCount}  subtitle="All invitations"      icon={CalendarDays} />
        </div>

        {/* Table */}
        <div className="bg-[#161a23] rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
            <h2 className="text-sm font-bold text-gray-200">Invitation List</h2>
            <span className="text-[11px] text-gray-500">{totalCount} total</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-gray-700 border-t-yellow-500 rounded-full animate-spin" />
            </div>
          ) : regs.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-sm">No invitations yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="text-gray-500 text-[10px] uppercase tracking-wider border-b border-gray-800 bg-[#16181d]/50">
                    {['Race Info', 'Owner', 'Horse', 'Gate', 'Date', 'Status', 'Actions'].map(col => (
                      <th key={col} className="px-6 py-4 font-bold">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {regs.map(item => {
                    const race      = item.race  || {}
                    const horse     = item.horse || {}
                    const isPending = item.jockeyConfirmation === null || item.jockeyConfirmation === undefined
                    const status    = item.jockeyConfirmation === true ? 'Accepted' : item.jockeyConfirmation === false ? 'Rejected' : 'Pending'
                    const isActing  = acting === item.registrationId
                    return (
                      <tr key={item.registrationId} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                          <p className="font-bold text-white text-sm">{race.raceName || `Race #${race.raceNumber || '—'}`}</p>
                          <p className="text-gray-500 text-[10px] mt-0.5">{race.racecourseName || '—'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-300 text-sm font-medium">
                            {item.horse?.ownerName || '—'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-md bg-gray-800 border border-gray-700 overflow-hidden flex items-center justify-center text-xs shrink-0">
                              {horse.imageUrl ? <img src={horse.imageUrl} alt="" className="w-full h-full object-cover" /> : '🐎'}
                            </div>
                            <span className="text-gray-300 text-sm font-medium">{horse.horseName || '—'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-300 text-sm font-bold">
                          {item.gateNumber ? `#${item.gateNumber}` : '—'}
                        </td>
                        <td className="px-6 py-4 text-gray-400 text-sm">
                          {race.startTime
                            ? new Date(race.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${STATUS_CLS[status] || STATUS_CLS.Pending}`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {isPending ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handle(item.registrationId, 'accept')}
                                disabled={isActing}
                                className="flex items-center gap-1 bg-green-900/30 hover:bg-green-900/50 text-green-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                              >
                                <Check size={13} /> Accept
                              </button>
                              <button
                                onClick={() => handle(item.registrationId, 'reject')}
                                disabled={isActing}
                                className="flex items-center gap-1 bg-red-900/30 hover:bg-red-900/50 text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                              >
                                <X size={13} /> Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-600 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
              <p className="text-gray-500 text-xs">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-7 h-7 flex items-center justify-center rounded border border-gray-800 text-gray-400 hover:bg-gray-800 transition-colors disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 flex items-center justify-center rounded text-xs font-bold transition-colors ${p === page ? 'bg-[#facc15] text-black' : 'border border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded border border-gray-800 text-gray-400 hover:bg-gray-800 transition-colors disabled:opacity-40"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </JockeyLayout>
  )
}
