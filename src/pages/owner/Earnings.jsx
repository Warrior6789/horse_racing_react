import { useEffect, useState, useCallback } from 'react'
import OwnerLayout from '../../components/OwnerLayout'
import { getHorses, getHorsePerformance } from '../../api/horses'
import { useRaceHub } from '../../hooks/useRaceHub'
import { useAuth } from '../../context/AuthContext'

function StatCard({ title, value, subtext, trend }) {
  return (
    <div className="bg-[#1a2130] p-6 rounded-xl border border-gray-700/50">
      <div className="flex justify-between items-start">
        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">{title}</p>
        {trend && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${trend.startsWith('+') ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
            {trend}
          </span>
        )}
      </div>
      <h3 className="text-3xl font-black text-white mt-2">{value}</h3>
      {subtext && <p className="text-gray-500 text-xs mt-1">{subtext}</p>}
    </div>
  )
}


export default function OwnerEarnings() {
  const { user } = useAuth()
  const [horses,     setHorses]     = useState([])
  const [horseStats, setHorseStats] = useState([])
  const [loading,    setLoading]    = useState(true)

  const fetchEarnings = useCallback(() => {
    setLoading(true)
    getHorses({ page: 1, pageSize: 100 })
      .then(async r => {
        const list = r.data.data?.items || []
        setHorses(list)
        const stats = await Promise.all(
          list.map(h =>
            getHorsePerformance(h.horseId)
              .then(res => {
                const d = res.data.data
                return { horse: h, totalRaces: d?.totalRaces || 0, totalWins: d?.totalWins || 0, totalEarned: d?.totalEarned || 0 }
              })
              .catch(() => ({ horse: h, totalRaces: 0, totalWins: 0, totalEarned: 0 }))
          )
        )
        setHorseStats(stats)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchEarnings() }, [fetchEarnings])

  const handleBalanceUpdated = useCallback((data) => {
    if (data?.accountId !== user?.id) return
    if (data?.reason === 'PrizePayout') fetchEarnings()
  }, [user, fetchEarnings])

  useRaceHub(null, { onBalanceUpdated: handleBalanceUpdated })

  const totalAmount = horseStats.reduce((s, h) => s + h.totalEarned, 0)
  const totalRaces  = horseStats.reduce((s, h) => s + h.totalRaces, 0)
  const totalWins   = horseStats.reduce((s, h) => s + h.totalWins, 0)

  return (
    <OwnerLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 md:space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[#facc15] mb-2">Earnings Overview</h1>
            <p className="text-gray-400 text-sm">Real-time performance analytics and fiscal breakdown for your racing portfolio.</p>
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Total Lifetime Earnings" value={`${totalAmount.toLocaleString('vi-VN')} VND`} />
          <StatCard title="Total Races"             value={totalRaces} subtext="Across all horses" />
          <StatCard title="Total Wins"              value={totalWins}  subtext="1st place finishes" />
        </div>


        {/* Table */}
        <section className="bg-[#161a23] rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
            <h2 className="text-sm font-bold text-gray-200">Horse Performance Ledger</h2>
            <span className="text-[11px] text-gray-500">{horseStats.length} records</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-gray-700 border-t-yellow-500 rounded-full animate-spin" />
            </div>
          ) : horses.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-sm">No horses found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="text-gray-500 text-[11px] uppercase tracking-wider border-b border-gray-800 bg-[#16181d]/50">
                    {['Horse', 'Races', 'Wins', 'Total Earned'].map(col => (
                      <th key={col} className="px-6 py-4 font-bold">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/80">
                  {horseStats.map(({ horse, totalRaces, totalWins, totalEarned }) => (
                    <tr key={horse.horseId} className="hover:bg-gray-800/40 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gray-800 border border-gray-700 overflow-hidden flex items-center justify-center text-sm shrink-0">
                            {horse.imageUrl ? <img src={horse.imageUrl} alt="" className="w-full h-full object-cover" /> : '🐎'}
                          </div>
                          <div>
                            <p className="text-gray-200 text-sm font-bold group-hover:text-white">{horse.horseName}</p>
                            <p className="text-gray-500 text-[10px]">{horse.breed || '—'} • {horse.age ? `${horse.age}yo` : '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white font-bold text-sm">{totalRaces}</span>
                        <span className="text-gray-500 text-xs ml-1">races</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-yellow-400 font-bold text-sm">{totalWins}</span>
                        {totalRaces > 0 && (
                          <span className="text-gray-500 text-xs ml-1">({Math.round((totalWins / totalRaces) * 100)}%)</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-emerald-400 font-bold text-sm">+{totalEarned.toLocaleString('vi-VN')}</span>
                        <span className="text-gray-500 text-xs ml-1">VND</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </OwnerLayout>
  )
}
