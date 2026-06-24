import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import { getAllPayments } from '../../api/payments'
import { useRaceHub } from '../../hooks/useRaceHub'

const PAYMENT_STATUS = {
  Completed: 'bg-emerald-50 text-emerald-700 ring-emerald-500/20',
  Pending:   'bg-amber-50 text-amber-700 ring-amber-500/20',
  Failed:    'bg-red-50 text-red-600 ring-red-500/20',
  Cancelled: 'bg-red-50 text-red-600 ring-red-500/20',
}

const TX_TYPE = {
  Deposit:    'bg-blue-50 text-blue-700 ring-blue-500/20',
  Withdrawal: 'bg-orange-50 text-orange-700 ring-orange-500/20',
  Prize:      'bg-emerald-50 text-emerald-700 ring-emerald-500/20',
  Bet:        'bg-violet-50 text-violet-700 ring-violet-500/20',
}

export default function PaymentManagement() {
  const [rows, setRows]         = useState([])
  const [page, setPage]         = useState(1)
  const [pageSize, setPageSize] = useState(4)
  const [totalPages, setTotal]  = useState(1)
  const [totalCount, setCount]  = useState(0)
  const [loading, setLoading]   = useState(true)

  const load = useCallback((p, ps) => {
    setLoading(true)
    getAllPayments({ page: p, pageSize: ps })
      .then(r => {
        setRows(r.data.data?.items || [])
        setTotal(r.data.data?.totalPages || 1)
        setCount(r.data.data?.totalCount || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(page, pageSize) }, [page, pageSize, load])

  const handlePaymentsUpdated = useCallback(() => load(page, pageSize), [load, page, pageSize])
  useRaceHub(null, { onPaymentsUpdated: handlePaymentsUpdated })

  return (
    <DashboardLayout title="Payment Management">
      <div className="space-y-6">

        {/* Heading */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
          <p className="text-sm text-gray-500 mt-1">View all platform payment transactions.</p>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-gray-950 rounded-full" />
              <h2 className="text-sm font-bold text-gray-900">All Payments</h2>
              <span className="text-xs text-gray-400 font-medium">({totalCount} total)</span>
            </div>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 font-medium focus:outline-none focus:border-gray-400"
            >
              {[10, 20, 50].map(n => <option key={n} value={n}>{n} / page</option>)}
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <span className="material-symbols-outlined animate-spin text-3xl text-gray-300">progress_activity</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16 text-sm font-semibold text-gray-400">No payments found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    {['Type', 'Amount', 'Balance Changed', 'Current Balance', 'Status', 'Date'].map(h => (
                      <th key={h} className="py-4 px-6">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {rows.map(row => (
                    <tr key={row.paymentId} className="hover:bg-gray-50/40 transition-colors">
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset ${TX_TYPE[row.transactionType] || 'bg-gray-100 text-gray-500 ring-gray-400/20'}`}>
                          {row.transactionType || '—'}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-bold text-gray-900">
                        {Number(row.amount).toLocaleString()} ₫
                      </td>
                      <td className="py-4 px-6">
                        <span className={row.balanceChanged >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}>
                          {row.balanceChanged >= 0 ? '+' : ''}{Number(row.balanceChanged).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-600 font-medium">
                        {Number(row.currentBalance).toLocaleString()}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${PAYMENT_STATUS[row.status] || 'bg-gray-100 text-gray-500 ring-gray-400/20'}`}>
                          {row.status || '—'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs text-gray-400 whitespace-nowrap">
                        {row.createAt ? new Date(row.createAt).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <footer className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between text-xs font-medium text-gray-500">
            <div>
              Page <span className="text-gray-900 font-bold">{page}</span> of{' '}
              <span className="text-gray-900 font-bold">{totalPages}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:bg-white transition-colors disabled:opacity-40">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-white transition-colors disabled:opacity-40">
                <ChevronRight size={14} />
              </button>
            </div>
          </footer>
        </div>

      </div>
    </DashboardLayout>
  )
}
