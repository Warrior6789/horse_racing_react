import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import DashboardLayout from '../../components/DashboardLayout'
import { getRacePool, getRacePrizePreview, getRace } from '../../api/races'
import { useRaceHub } from '../../hooks/useRaceHub'

const BET_TYPE_CLS = {
  Win:   'bg-amber-500/20 text-amber-400',
  Place: 'bg-blue-500/20 text-blue-400',
  Show:  'bg-purple-500/20 text-purple-400',
}

const BET_STATUS_CLS = {
  Active: 'bg-gray-500/20 text-gray-400',
  Won:    'bg-emerald-500/20 text-emerald-400',
  Lost:   'bg-red-500/20 text-red-400',
}

const POS_COLORS = {
  1: 'bg-amber-400 text-black',
  2: 'bg-gray-300 text-gray-800',
  3: 'bg-orange-600 text-white',
}

function posLabel(p) {
  if (!p) return '—'
  if (p === 1) return '1st'
  if (p === 2) return '2nd'
  if (p === 3) return '3rd'
  return `${p}th`
}

function fmt(dt) {
  if (!dt) return '—'
  const d = new Date(dt)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

const BET_PAGE_SIZE = 4

export default function BetDetail() {
  const { raceId } = useParams()
  const navigate   = useNavigate()

  const [race, setRace]                 = useState(null)
  const [pool, setPool]                 = useState(null)
  const [prize, setPrize]               = useState(null)
  const [loadingPool, setLoadingPool]   = useState(true)
  const [loadingPrize, setLoadingPrize] = useState(true)
  const [betPage, setBetPage]           = useState(1)

  const fetchPool = useCallback(() => {
    setLoadingPool(true)
    getRacePool(raceId)
      .then(r => setPool(r.data.data))
      .catch(() => setPool(null))
      .finally(() => setLoadingPool(false))
  }, [raceId])

  const fetchPrize = useCallback(() => {
    setLoadingPrize(true)
    getRacePrizePreview(raceId)
      .then(r => setPrize(r.data.data))
      .catch(() => setPrize(null))
      .finally(() => setLoadingPrize(false))
  }, [raceId])

  useEffect(() => {
    getRace(raceId).then(r => setRace(r.data.data)).catch(() => {})
    fetchPool()
    fetchPrize()
  }, [raceId, fetchPool, fetchPrize])

  const handlePoolUpdate = useCallback((pools) => {
    setPool(prev => prev ? { ...prev, pools } : { pools })
  }, [])

  useRaceHub(raceId, { onPoolUpdate: handlePoolUpdate })

  const pools = pool?.pools || []
  const bets  = pool?.bets  || []
  const betTotalPages = Math.max(1, Math.ceil(bets.length / BET_PAGE_SIZE))
  const betItems      = bets.slice((betPage - 1) * BET_PAGE_SIZE, betPage * BET_PAGE_SIZE)

  const poolByType = (type) => pools.find(p => p.betType === type) || {}

  const POOL_CARDS = [
    { label: 'Win',   color: 'text-amber-400'  },
    { label: 'Place', color: 'text-blue-400'   },
    { label: 'Show',  color: 'text-purple-400' },
  ]

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#1a1712] p-6 md:p-8 space-y-8">

        {/* Header */}
        <div>
          <button onClick={() => navigate('/admin/bets')} className="text-gray-400 hover:text-white text-sm mb-3 transition-colors">
            ← Quay lại
          </button>
          <h1 className="text-2xl font-bold text-white">
            {race?.raceName || `Race #${race?.raceNumber || '...'}`}
          </h1>
          <p className="text-gray-400 text-sm mt-1">{race?.racecourseName || '—'}</p>
        </div>

        {/* Block A — Pool Summary */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pool Summary</h2>

          {loadingPool ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-7 h-7 border-2 border-[#3d3830] border-t-white rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {POOL_CARDS.map(({ label, color }) => {
                  const p = poolByType(label)
                  return (
                    <div key={label} className="bg-[#2a2620] rounded-xl p-5">
                      <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${color}`}>{label}</p>
                      <p className="text-2xl font-black text-white">{(p.totalAmount ?? 0).toLocaleString('vi-VN')}</p>
                      <p className="text-gray-500 text-xs mt-1">{p.betCount ?? 0} bets · VND</p>
                    </div>
                  )
                })}
              </div>

              {/* Bets table */}
              <div className="bg-[#2a2620] rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#3d3830] flex items-center justify-between">
                  <p className="text-sm font-bold text-white">All Bets</p>
                  <span className="text-xs text-gray-500">{bets.length} total</span>
                </div>

                {bets.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-sm">No bets placed yet.</div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-gray-500 text-[10px] uppercase tracking-wider border-b border-[#3d3830]">
                            {['Bettor', 'Horse', 'Type', 'Amount', 'Status', 'Payout', 'Placed At'].map(col => (
                              <th key={col} className="py-3 px-5 font-bold">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#3d3830]">
                          {betItems.map((b, i) => (
                            <tr key={b.betId || i} className="hover:bg-[#3d3830] transition-colors">
                              <td className="py-3 px-5 text-white text-sm font-medium">{b.spectatorName || '—'}</td>
                              <td className="py-3 px-5 text-gray-300 text-sm">{b.horseName || '—'}</td>
                              <td className="py-3 px-5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${BET_TYPE_CLS[b.betType] || 'bg-gray-500/20 text-gray-400'}`}>
                                  {b.betType}
                                </span>
                              </td>
                              <td className="py-3 px-5 whitespace-nowrap text-white font-bold text-sm">
                                {(b.betAmount ?? 0).toLocaleString('vi-VN')}
                                <span className="text-gray-500 text-xs ml-1">VND</span>
                              </td>
                              <td className="py-3 px-5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${BET_STATUS_CLS[b.status] || 'bg-gray-500/20 text-gray-400'}`}>
                                  {b.status || '—'}
                                </span>
                              </td>
                              <td className="py-3 px-5 text-gray-400 text-sm">
                                {b.payoutRatio != null ? `×${b.payoutRatio}` : '—'}
                              </td>
                              <td className="py-3 px-5 text-gray-500 text-xs whitespace-nowrap">{fmt(b.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {betTotalPages > 1 && (
                      <div className="px-5 py-3 border-t border-[#3d3830] flex items-center justify-between">
                        <p className="text-xs text-gray-500">Page {betPage} of {betTotalPages}</p>
                        <div className="flex gap-1">
                          <button onClick={() => setBetPage(p => Math.max(1, p - 1))} disabled={betPage === 1}
                            className="px-3 py-1.5 bg-[#1a1712] text-gray-400 rounded-lg text-xs font-semibold hover:text-white disabled:opacity-40 transition-colors">
                            ‹ Prev
                          </button>
                          <button onClick={() => setBetPage(p => Math.min(betTotalPages, p + 1))} disabled={betPage === betTotalPages}
                            className="px-3 py-1.5 bg-[#1a1712] text-gray-400 rounded-lg text-xs font-semibold hover:text-white disabled:opacity-40 transition-colors">
                            Next ›
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </section>

        {/* Block B — Prize Preview */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Prize Preview</h2>
            {prize != null && (
              prize.isFinal
                ? <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">Final (Settled)</span>
                : <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400">Preview (Estimated)</span>
            )}
          </div>

          {loadingPrize ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-7 h-7 border-2 border-[#3d3830] border-t-white rounded-full animate-spin" />
            </div>
          ) : (
            <div className="bg-[#2a2620] rounded-xl overflow-hidden">
              {!prize?.items?.length ? (
                <div className="text-center py-12 text-gray-500 text-sm">Chưa có kết quả để tính thưởng.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-gray-500 text-[10px] uppercase tracking-wider border-b border-[#3d3830]">
                        {['Pos', 'Horse', 'Owner', 'Owner Amount', 'Jockey', 'Jockey Amount', 'Total Prize'].map(col => (
                          <th key={col} className="py-3 px-5 font-bold">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#3d3830]">
                      {prize.items.map((item, i) => (
                        <tr key={i} className="hover:bg-[#3d3830] transition-colors">
                          <td className="py-3 px-5">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-black ${POS_COLORS[item.position] || 'bg-[#1a1712] text-gray-400'}`}>
                              {posLabel(item.position)}
                            </span>
                          </td>
                          <td className="py-3 px-5 text-white font-bold text-sm">{item.horseName || '—'}</td>
                          <td className="py-3 px-5 text-gray-300 text-sm">{item.ownerName || '—'}</td>
                          <td className="py-3 px-5 whitespace-nowrap">
                            <span className="text-emerald-400 font-bold text-sm">+{(item.ownerAmount ?? 0).toLocaleString('vi-VN')}</span>
                            <span className="text-gray-500 text-xs ml-1">VND</span>
                          </td>
                          <td className="py-3 px-5 text-gray-300 text-sm">{item.jockeyName || '—'}</td>
                          <td className="py-3 px-5 whitespace-nowrap">
                            <span className="text-blue-400 font-bold text-sm">+{(item.jockeyAmount ?? 0).toLocaleString('vi-VN')}</span>
                            <span className="text-gray-500 text-xs ml-1">VND</span>
                          </td>
                          <td className="py-3 px-5 whitespace-nowrap">
                            <span className="text-amber-400 font-bold text-sm">+{(item.positionPrize ?? 0).toLocaleString('vi-VN')}</span>
                            <span className="text-gray-500 text-xs ml-1">VND</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>

      </div>
    </DashboardLayout>
  )
}
