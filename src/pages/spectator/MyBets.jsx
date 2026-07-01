import { useEffect, useState, useCallback, useRef } from 'react'
import { Flag, ChevronLeft, ChevronRight } from 'lucide-react'
import SpectatorLayout from '../../components/SpectatorLayout'
import { getMyBetsPaged } from '../../api/bets'
import { useRaceHub } from '../../hooks/useRaceHub'

const FILTERS = ['all', 'active', 'won', 'lost']
const STATUS_MAP = { all: '', active: 'Active', won: 'Won', lost: 'Lost' }

const normalizeStatus = (s) => {
  const lower = (s || '').toLowerCase()
  if (lower === 'pending') return 'Active'
  return s || '—'
}

const statusBadge = (status) => {
  const s = (status || '').toLowerCase()
  if (s === 'won')  return 'bg-[#f7e0a3]/10 border-[#f7e0a3]/20 text-[#f7e0a3]'
  if (s === 'lost') return 'bg-red-500/10 border-red-500/20 text-red-400'
  return 'bg-amber-500/10 border-amber-500/20 text-[#f7e0a3]'
}

export default function MyBets() {
  const [betFilter, setBetFilter]     = useState('all')
  const [bets, setBets]               = useState([])
  const [page, setPage]               = useState(1)
  const [totalPages, setTotalPages]   = useState(1)
  const [totalCount, setTotalCount]   = useState(0)
  const [loading, setLoading]         = useState(true)

  const refetchTimer = useRef(null)

  const fetchBets = useCallback((p, filter, { silent = false } = {}) => {
    if (!silent) setLoading(true)
    const status = STATUS_MAP[filter]
    getMyBetsPaged({ page: p, pageSize: 6, ...(status && { status }) })
      .then(r => {
        const items = r.data.data?.items || []
        setBets(items)
        setTotalPages(r.data.data?.totalPages || 1)
        setTotalCount(r.data.data?.totalCount || 0)
      })
      .catch(() => {})
      .finally(() => { if (!silent) setLoading(false) })
  }, [])

  useEffect(() => { fetchBets(page, betFilter) }, [page, betFilter, fetchBets])
  useEffect(() => () => clearTimeout(refetchTimer.current), [])

  const handleRacesUpdated = useCallback(() => fetchBets(page, betFilter), [fetchBets, page, betFilter])
  const handlePoolUpdate   = useCallback(() => {
    clearTimeout(refetchTimer.current)
    refetchTimer.current = setTimeout(() => fetchBets(page, betFilter, { silent: true }), 600)
  }, [fetchBets, page, betFilter])

  useRaceHub(null, { onRacesUpdated: handleRacesUpdated, onPoolUpdate: handlePoolUpdate })

  const handleFilter = (f) => { setBetFilter(f); setPage(1) }

  const calcPayout = (bet) => {
    const s = (bet.status || '').toLowerCase()
    if (s === 'won' && bet.betAmount && bet.payoutRatio)
      return Math.round(bet.betAmount * bet.payoutRatio)
    if ((s === 'active' || s === 'pending') && bet.estimatedPayout != null)
      return Math.round(bet.estimatedPayout)
    return null
  }

  const event = (bet) => {
    return bet.raceNumber ? `Race #${bet.raceNumber}` : '—'
  }

  return (
    <SpectatorLayout>
      {/* HEADER */}
      <header className="flex justify-between items-center gap-3 -mx-4 md:-mx-8 -mt-4 md:-mt-8 px-4 md:px-8 py-4 mb-6 md:mb-8 sticky top-0 z-10 bg-[#110e0b]/80 backdrop-blur-md border-b border-stone-800/40">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-1">My Bets</p>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Wagering History</h1>
        </div>
        <span className="text-[11px] text-stone-500 font-medium">{totalCount} total</span>
      </header>

      <div className="pb-12 space-y-7">
        {/* Filter tabs */}
        <div className="flex bg-[#171410] p-1 rounded-xl border border-stone-800/60 w-fit space-x-1">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => handleFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wide ${
                betFilter === f
                  ? 'bg-[#f7e0a3] text-[#110e0b] shadow'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[0,1,2,3].map(i => <div key={i} className="h-24 bg-[#171410] rounded-2xl animate-pulse" />)}
          </div>
        ) : bets.length === 0 ? (
          <div className="text-center py-20 text-stone-500 text-sm bg-[#171410] rounded-2xl border border-stone-800/60">
            No bets found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bets.map(bet => {
              const s = (bet.status || '').toLowerCase()
              const payout = calcPayout(bet)
              return (
                <div key={bet.betId} className="bg-[#171410] border border-stone-800/60 rounded-2xl p-5 flex items-center gap-4 hover:border-stone-700 transition-all">

                  {/* Icon */}
                  <div className="w-11 h-11 bg-[#1f1a14] rounded-xl flex items-center justify-center border border-stone-800 shrink-0">
                    <Flag size={18} className="text-[#f7e0a3]" />
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-sm text-stone-100 truncate">{bet.horseName || '—'}</h3>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase border shrink-0 ${statusBadge(bet.status)}`}>
                        {normalizeStatus(bet.status)}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 truncate mb-2">{event(bet)}</p>
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-[9px] text-stone-600 uppercase font-bold">Type</p>
                        <p className="text-xs font-bold text-[#f7e0a3]">{bet.betType || '—'}</p>
                      </div>
                      <div className="w-px h-5 bg-stone-800" />
                      <div>
                        <p className="text-[9px] text-stone-600 uppercase font-bold">Wager</p>
                        <p className="text-xs font-bold text-stone-300">
                          {bet.betAmount != null ? `${bet.betAmount.toLocaleString()}` : '—'} <span className="text-stone-600 font-normal text-[9px]">VND</span>
                        </p>
                      </div>
                      <div className="w-px h-5 bg-stone-800" />
                      <div>
                        <p className="text-[9px] text-stone-600 uppercase font-bold">{s === 'won' ? 'Payout' : 'Est.'}</p>
                        {s === 'lost'
                          ? <p className="text-xs font-bold text-stone-500">0 <span className="text-stone-600 font-normal text-[9px]">VND</span></p>
                          : payout != null
                            ? <p className="text-xs font-bold text-[#f7e0a3]">{payout.toLocaleString()} <span className="text-stone-600 font-normal text-[9px]">VND</span></p>
                            : <p className="text-xs font-bold text-stone-600">—</p>
                        }
                      </div>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="shrink-0 text-right hidden sm:block">
                    <p className="text-[10px] text-stone-500 font-mono leading-relaxed">
                      {bet.createdAt ? new Date(bet.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </p>
                    <p className="text-[10px] text-stone-600 font-mono">
                      {bet.createdAt ? new Date(bet.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </p>
                  </div>

                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2 pt-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg bg-[#171410] border border-stone-800 text-stone-500 hover:text-stone-300 disabled:opacity-40">
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setPage(n)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                  page === n
                    ? 'bg-[#f7e0a3] text-[#110e0b]'
                    : 'bg-[#171410] border border-stone-800 text-stone-400 hover:bg-stone-800/40'
                }`}>
                {n}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 rounded-lg bg-[#171410] border border-stone-800 text-stone-400 hover:text-stone-300 disabled:opacity-40">
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </SpectatorLayout>
  )
}
