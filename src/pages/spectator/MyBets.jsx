import { useEffect, useState, useCallback, useRef } from 'react'
import { Flag, Trophy, ChevronLeft, ChevronRight } from 'lucide-react'
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
    getMyBetsPaged({ page: p, pageSize: 4, ...(status && { status }) })
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
      <header className="flex justify-between items-center px-4 md:px-8 py-4 md:py-6 sticky top-0 z-10 bg-[#110e0b]/80 backdrop-blur-md">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-0.5">My Bets</p>
          <h1 className="text-2xl font-black text-stone-100 tracking-tight">Wagering History</h1>
        </div>
        <span className="text-[11px] text-stone-500 font-medium">{totalCount} total</span>
      </header>

      <div className="px-4 md:px-8 pb-12 space-y-6">
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[0,1,2,3].map(i => <div key={i} className="h-52 bg-[#171410] rounded-2xl animate-pulse" />)}
          </div>
        ) : bets.length === 0 ? (
          <div className="text-center py-20 text-stone-500 text-sm bg-[#171410] rounded-2xl border border-stone-800/60">
            No bets found.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {bets.map(bet => (
              <div key={bet.betId} className="bg-[#171410] p-5 rounded-2xl border border-stone-800/60 flex flex-col justify-between aspect-square hover:border-stone-700 transition-all">
                {/* Top row */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 bg-[#1f1a14] rounded-xl flex items-center justify-center border border-stone-800 shrink-0">
                      <Flag size={16} className="text-[#f7e0a3]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-stone-200 line-clamp-1">
                        {bet.horseName || '—'}
                      </h3>
                      <p className="text-[11px] text-stone-500 mt-0.5">{event(bet) || '—'}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md uppercase border shrink-0 ${statusBadge(bet.status)}`}>
                    {normalizeStatus(bet.status)}
                  </span>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-2 bg-[#110e0b] p-3 rounded-xl border border-stone-900/40 text-center my-3">
                  <div>
                    <p className="text-[10px] text-stone-500 uppercase font-semibold">Type</p>
                    <p className="text-xs font-bold text-[#f7e0a3] mt-0.5">{bet.betType || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-stone-500 uppercase font-semibold">Amount</p>
                    <p className="text-xs font-bold text-stone-300 mt-0.5">
                      {bet.betAmount != null ? `${bet.betAmount.toLocaleString()} VND` : '—'}
                    </p>
                  </div>
                </div>

                {/* Bottom row */}
                <div className="flex justify-between items-end pt-2 border-t border-stone-800/40">
                  <div>
                    <p className="text-[9px] text-stone-500 font-medium">
                      {(bet.status || '').toLowerCase() === 'won' ? 'Actual Payout' : 'Est. Payout'}
                    </p>
                    {(() => {
                      const s = (bet.status || '').toLowerCase()
                      const payout = calcPayout(bet)
                      if (s === 'lost') return <p className="text-base font-black mt-0.5 text-stone-500">0 VND</p>
                      if (payout != null) return (
                        <p className="text-base font-black mt-0.5 text-[#f7e0a3]">
                          {payout.toLocaleString()} VND
                        </p>
                      )
                      return <p className="text-base font-black mt-0.5 text-stone-600">—</p>
                    })()}
                  </div>
                  <span className="text-[10px] text-stone-500 font-mono mb-0.5">
                    {bet.createdAt ? new Date(bet.createdAt).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                </div>
              </div>
            ))}
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
