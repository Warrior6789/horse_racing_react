import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import DashboardLayout from '../../components/DashboardLayout'
import { getRacePool, getRacePrizePreview, getRace } from '../../api/races'
import { useRaceHub } from '../../hooks/useRaceHub'

const BET_TYPE_CLS = {
  Win:   'bg-amber-50 text-amber-700 ring-amber-500/20',
  Place: 'bg-blue-50 text-blue-700 ring-blue-500/20',
  Show:  'bg-purple-50 text-purple-700 ring-purple-500/20',
}

const BET_STATUS_CLS = {
  Active: 'bg-gray-100 text-gray-500 ring-gray-400/20',
  Won:    'bg-emerald-50 text-emerald-700 ring-emerald-500/20',
  Lost:   'bg-red-50 text-red-500 ring-red-400/20',
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

const POOL_CARDS = [
  { label: 'Win',   icon: 'emoji_events',     iconColor: 'text-amber-600',  bgIcon: 'bg-amber-50'  },
  { label: 'Place', icon: 'workspace_premium', iconColor: 'text-blue-600',   bgIcon: 'bg-blue-50'   },
  { label: 'Show',  icon: 'military_tech',     iconColor: 'text-purple-600', bgIcon: 'bg-purple-50' },
]

export default function BetDetail() {
  const { raceId } = useParams()
  const navigate   = useNavigate()

  const [race, setRace]                 = useState(null)
  const [pool, setPool]                 = useState(null)
  const [prize, setPrize]               = useState(null)
  const [loadingPool, setLoadingPool]   = useState(true)
  const [loadingPrize, setLoadingPrize] = useState(true)
  const [betPage, setBetPage]           = useState(1)
  const [matrixPage, setMatrixPage]     = useState(1)

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

  return (
    <DashboardLayout>
      <div className="space-y-8">

        {/* Header */}
        <div>
          <button onClick={() => navigate('/admin/bets')}
            className="text-sm text-gray-400 hover:text-gray-700 transition-colors mb-3 flex items-center gap-1">
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
            Quay lại
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {race?.raceName || `Race #${race?.raceNumber || '...'}`}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{race?.racecourseName || '—'}</p>
        </div>

        {/* Block A — Pool Summary */}
        <section className="space-y-5">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-gray-950 rounded-full" />
            <h2 className="text-sm font-bold text-gray-900">Pool Summary</h2>
          </div>

          {loadingPool ? (
            <div className="flex items-center justify-center h-32">
              <span className="material-symbols-outlined animate-spin text-3xl text-gray-300">progress_activity</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {POOL_CARDS.map(({ label, icon, iconColor, bgIcon }) => {
                  const p = poolByType(label)
                  return (
                    <div key={label} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                        <p className="text-2xl font-extrabold text-gray-900">{(p.totalAmount ?? 0).toLocaleString('vi-VN')}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{p.betCount ?? 0} bets · VND</p>
                      </div>
                      <div className={`p-3 ${bgIcon} ${iconColor} rounded-xl`}>
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{icon}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Horse × BetType Matrix */}
              {bets.length > 0 && (() => {
                const BET_TYPES = ['Win', 'Place', 'Show']
                const MATRIX_PAGE_SIZE = 5
                const horses = [...new Map(bets.map(b => [b.horseId || b.horseName, b.horseName])).values()]
                const matrix = horses.map(name => {
                  const row = { name }
                  let total = 0; let totalCount = 0
                  BET_TYPES.forEach(t => {
                    const matched = bets.filter(b => b.horseName === name && b.betType === t)
                    const amt = matched.reduce((s, b) => s + (b.betAmount ?? 0), 0)
                    const cnt = matched.length
                    row[t] = { amt, cnt }
                    total += amt; totalCount += cnt
                  })
                  row.total = { amt: total, cnt: totalCount }
                  return row
                })
                const footer = { name: 'TOTAL' }
                BET_TYPES.forEach(t => {
                  const matched = bets.filter(b => b.betType === t)
                  footer[t] = { amt: matched.reduce((s, b) => s + (b.betAmount ?? 0), 0), cnt: matched.length }
                })
                footer.total = { amt: bets.reduce((s, b) => s + (b.betAmount ?? 0), 0), cnt: bets.length }
                const mTotalPages = Math.max(1, Math.ceil(matrix.length / MATRIX_PAGE_SIZE))
                const mPage = Math.min(matrixPage, mTotalPages)
                const mItems = matrix.slice((mPage - 1) * MATRIX_PAGE_SIZE, mPage * MATRIX_PAGE_SIZE)
                return (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                      <div className="w-1 h-5 bg-gray-950 rounded-full" />
                      <h3 className="text-sm font-bold text-gray-900">Horse Bet Distribution</h3>
                      <span className="text-xs text-gray-400 font-medium">({matrix.length} horses)</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                            <th className="py-3 px-4">Horse</th>
                            {BET_TYPES.map(t => <th key={t} className="py-3 px-4">{t}</th>)}
                            <th className="py-3 px-4">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                          {mItems.map(row => (
                            <tr key={row.name} className="hover:bg-gray-50/60 transition-colors">
                              <td className="py-3 px-4 font-semibold text-gray-900">{row.name}</td>
                              {BET_TYPES.map(t => (
                                <td key={t} className="py-3 px-4">
                                  <p className="font-bold text-gray-900 text-sm">{row[t].amt.toLocaleString('en-US')}</p>
                                  <p className="text-gray-400 text-xs">({row[t].cnt} bets)</p>
                                </td>
                              ))}
                              <td className="py-3 px-4">
                                <p className="font-extrabold text-gray-900 text-sm">{row.total.amt.toLocaleString('en-US')}</p>
                                <p className="text-gray-400 text-xs">({row.total.cnt} bets)</p>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-50 border-t-2 border-gray-200 text-sm font-bold">
                            <td className="py-3 px-4 text-gray-500 text-[11px] uppercase tracking-wider">Total</td>
                            {BET_TYPES.map(t => (
                              <td key={t} className="py-3 px-4">
                                <p className="text-gray-900">{footer[t].amt.toLocaleString('en-US')}</p>
                                <p className="text-gray-400 text-xs font-normal">({footer[t].cnt} bets)</p>
                              </td>
                            ))}
                            <td className="py-3 px-4">
                              <p className="text-gray-900">{footer.total.amt.toLocaleString('en-US')}</p>
                              <p className="text-gray-400 text-xs font-normal">({footer.total.cnt} bets)</p>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    {mTotalPages > 1 && (
                      <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-xs text-gray-400">Page {mPage} of {mTotalPages}</p>
                        <div className="flex gap-2">
                          <button onClick={() => setMatrixPage(p => Math.max(1, p - 1))} disabled={mPage === 1}
                            className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50 disabled:opacity-40 transition-colors">
                            ‹ Prev
                          </button>
                          <button onClick={() => setMatrixPage(p => Math.min(mTotalPages, p + 1))} disabled={mPage === mTotalPages}
                            className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50 disabled:opacity-40 transition-colors">
                            Next ›
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Bets table */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-gray-950 rounded-full" />
                    <h3 className="text-sm font-bold text-gray-900">All Bets</h3>
                    <span className="text-xs text-gray-400 font-medium">({bets.length} total)</span>
                  </div>
                </div>

                {bets.length === 0 ? (
                  <div className="text-center py-16 text-sm font-semibold text-gray-400">No bets placed yet.</div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                            {['Bettor', 'Horse', 'Type', 'Amount', 'Status', 'Payout', 'Placed At'].map(col => (
                              <th key={col} className="py-3 px-4">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                          {betItems.map((b, i) => (
                            <tr key={b.betId || i} className="hover:bg-gray-50/60 transition-colors">
                              <td className="py-3 px-4 font-medium text-gray-900">{b.spectatorName || '—'}</td>
                              <td className="py-3 px-4 text-gray-600">{b.horseName || '—'}</td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${BET_TYPE_CLS[b.betType] || 'bg-gray-100 text-gray-500 ring-gray-400/20'}`}>
                                  {b.betType}
                                </span>
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <span className="font-bold text-gray-900">{(b.betAmount ?? 0).toLocaleString('vi-VN')}</span>
                                <span className="text-gray-400 text-xs ml-1">VND</span>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${BET_STATUS_CLS[b.status] || 'bg-gray-100 text-gray-500 ring-gray-400/20'}`}>
                                  {b.status || '—'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-gray-600 text-sm">
                                {b.payoutRatio != null ? `×${b.payoutRatio}` : '—'}
                              </td>
                              <td className="py-3 px-4 text-gray-400 text-xs whitespace-nowrap">{fmt(b.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {betTotalPages > 1 && (
                      <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-xs text-gray-400">Page {betPage} of {betTotalPages}</p>
                        <div className="flex gap-2">
                          <button onClick={() => setBetPage(p => Math.max(1, p - 1))} disabled={betPage === 1}
                            className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50 disabled:opacity-40 transition-colors">
                            ‹ Prev
                          </button>
                          <button onClick={() => setBetPage(p => Math.min(betTotalPages, p + 1))} disabled={betPage === betTotalPages}
                            className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50 disabled:opacity-40 transition-colors">
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
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-gray-950 rounded-full" />
            <h2 className="text-sm font-bold text-gray-900">Prize Preview</h2>
            {prize != null && (
              prize.isFinal
                ? <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset bg-emerald-50 text-emerald-700 ring-emerald-500/20">Final (Settled)</span>
                : <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset bg-amber-50 text-amber-700 ring-amber-500/20">Preview (Estimated)</span>
            )}
          </div>

          {loadingPrize ? (
            <div className="flex items-center justify-center h-32">
              <span className="material-symbols-outlined animate-spin text-3xl text-gray-300">progress_activity</span>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {!prize?.items?.length ? (
                <div className="text-center py-16 text-sm font-semibold text-gray-400">Chưa có kết quả để tính thưởng.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                        {['Pos', 'Horse', 'Owner', 'Owner Amount', 'Jockey', 'Jockey Amount', 'Total Prize'].map(col => (
                          <th key={col} className="py-3 px-4">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {prize.items.map((item, i) => (
                        <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-xs font-black ${POS_COLORS[item.position] || 'bg-gray-100 text-gray-500'}`}>
                              {posLabel(item.position)}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-gray-900">{item.horseName || '—'}</td>
                          <td className="py-3 px-4 text-gray-600">{item.ownerName || '—'}</td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-bold text-emerald-600">+{(item.ownerAmount ?? 0).toLocaleString('vi-VN')}</span>
                            <span className="text-gray-400 text-xs ml-1">VND</span>
                          </td>
                          <td className="py-3 px-4 text-gray-600">{item.jockeyName || '—'}</td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-bold text-blue-600">+{(item.jockeyAmount ?? 0).toLocaleString('vi-VN')}</span>
                            <span className="text-gray-400 text-xs ml-1">VND</span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-bold text-amber-600">+{(item.positionPrize ?? 0).toLocaleString('vi-VN')}</span>
                            <span className="text-gray-400 text-xs ml-1">VND</span>
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
