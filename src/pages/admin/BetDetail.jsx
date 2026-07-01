import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import { getRacePool, getRacePrizePreview, getRace } from '../../api/races'
import { useRaceHub } from '../../hooks/useRaceHub'

const BET_TYPE_CLS = {
  Win:   'bg-yellow-900/30 text-yellow-400 border border-yellow-700/40',
  Place: 'bg-blue-900/30 text-blue-400 border border-blue-700/40',
  Show:  'bg-purple-900/30 text-purple-400 border border-purple-700/40',
}

const BET_STATUS_CLS = {
  Active: 'bg-gray-700/40 text-gray-300 border border-gray-600/40',
  Won:    'bg-emerald-900/30 text-emerald-400 border border-emerald-700/40',
  Lost:   'bg-red-900/30 text-red-400 border border-red-700/40',
}

const POS_COLORS = {
  1: 'bg-yellow-500 text-black',
  2: 'bg-gray-300 text-black',
  3: 'bg-orange-700 text-white',
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

function StatCard({ label, total, count }) {
  return (
    <div className="bg-[#1a2130] p-5 rounded-xl border border-gray-700/50">
      <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-black text-white">{(total ?? 0).toLocaleString('vi-VN')} <span className="text-sm text-gray-500">VND</span></p>
      <p className="text-gray-500 text-xs mt-1">{count ?? 0} bets</p>
    </div>
  )
}

export default function BetDetail() {
  const { raceId } = useParams()
  const navigate   = useNavigate()

  const [race, setRace]         = useState(null)
  const [pool, setPool]         = useState(null)
  const [prize, setPrize]       = useState(null)
  const [loadingPool, setLoadingPool]   = useState(true)
  const [loadingPrize, setLoadingPrize] = useState(true)

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

  const poolByType = (type) => pools.find(p => p.betType === type) || {}

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/bets')}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-[#facc15] leading-tight">
              {race?.raceName || `Race #${race?.raceNumber || '...'}`}
            </h1>
            <p className="text-gray-400 text-sm">{race?.racecourseName || '—'}</p>
          </div>
        </div>

        {/* Block A — Pool Summary */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Pool Summary</h2>

          {loadingPool ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-8 h-8 border-2 border-gray-700 border-t-yellow-500 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['Win', 'Place', 'Show'].map(type => {
                  const p = poolByType(type)
                  return <StatCard key={type} label={type} total={p.totalAmount} count={p.betCount} />
                })}
              </div>

              {/* Bets table */}
              <div className="bg-[#161a23] rounded-xl border border-gray-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-gray-200">All Bets</h3>
                  <span className="text-[11px] text-gray-500">{bets.length} bets</span>
                </div>
                {bets.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-sm">No bets placed yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                      <thead>
                        <tr className="text-gray-500 text-[11px] uppercase tracking-wider border-b border-gray-800 bg-[#16181d]/50">
                          {['Bettor', 'Horse', 'Bet Type', 'Amount', 'Status', 'Payout Ratio', 'Placed At'].map(col => (
                            <th key={col} className="px-6 py-3 font-bold">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/80">
                        {bets.map((b, i) => (
                          <tr key={b.betId || i} className="hover:bg-gray-800/30 transition-colors">
                            <td className="px-6 py-3 text-gray-200 text-sm font-medium">{b.spectatorName || '—'}</td>
                            <td className="px-6 py-3 text-gray-300 text-sm">{b.horseName || '—'}</td>
                            <td className="px-6 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${BET_TYPE_CLS[b.betType] || 'text-gray-400'}`}>
                                {b.betType}
                              </span>
                            </td>
                            <td className="px-6 py-3">
                              <span className="text-white font-bold text-sm">{(b.betAmount ?? 0).toLocaleString('vi-VN')}</span>
                              <span className="text-gray-500 text-xs ml-1">VND</span>
                            </td>
                            <td className="px-6 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${BET_STATUS_CLS[b.status] || 'text-gray-400'}`}>
                                {b.status || '—'}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-gray-300 text-sm">
                              {b.payoutRatio != null ? `×${b.payoutRatio}` : '—'}
                            </td>
                            <td className="px-6 py-3 text-gray-400 text-sm">{fmt(b.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        {/* Block B — Prize Preview */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Prize Preview</h2>
            {prize != null && (
              prize.isFinal
                ? <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-900/30 text-emerald-400 border border-emerald-700/40">Final (Settled)</span>
                : <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-900/30 text-yellow-400 border border-yellow-700/40">Preview (Estimated)</span>
            )}
          </div>

          {loadingPrize ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-8 h-8 border-2 border-gray-700 border-t-yellow-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="bg-[#161a23] rounded-xl border border-gray-800 overflow-hidden">
              {!prize?.items?.length ? (
                <div className="text-center py-12 text-gray-500 text-sm">Chưa có kết quả để tính thưởng.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left whitespace-nowrap">
                    <thead>
                      <tr className="text-gray-500 text-[11px] uppercase tracking-wider border-b border-gray-800 bg-[#16181d]/50">
                        {['Position', 'Horse', 'Owner', 'Owner Amount', 'Jockey', 'Jockey Amount', 'Total Prize'].map(col => (
                          <th key={col} className="px-6 py-3 font-bold">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/80">
                      {prize.items.map((item, i) => (
                        <tr key={i} className="hover:bg-gray-800/30 transition-colors">
                          <td className="px-6 py-3">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-black ${POS_COLORS[item.position] || 'bg-gray-700 text-gray-300'}`}>
                              {posLabel(item.position)}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-white font-bold text-sm">{item.horseName || '—'}</td>
                          <td className="px-6 py-3 text-gray-300 text-sm">{item.ownerName || '—'}</td>
                          <td className="px-6 py-3">
                            <span className="text-emerald-400 font-bold text-sm">+{(item.ownerAmount ?? 0).toLocaleString('vi-VN')}</span>
                            <span className="text-gray-500 text-xs ml-1">VND</span>
                          </td>
                          <td className="px-6 py-3 text-gray-300 text-sm">{item.jockeyName || '—'}</td>
                          <td className="px-6 py-3">
                            <span className="text-blue-400 font-bold text-sm">+{(item.jockeyAmount ?? 0).toLocaleString('vi-VN')}</span>
                            <span className="text-gray-500 text-xs ml-1">VND</span>
                          </td>
                          <td className="px-6 py-3">
                            <span className="text-yellow-400 font-bold text-sm">+{(item.positionPrize ?? 0).toLocaleString('vi-VN')}</span>
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
