import { useEffect, useState, useCallback } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { getWithdrawalsPaged, approveWithdrawal, rejectWithdrawal } from '../../api/withdrawals'
import { useRaceHub } from '../../hooks/useRaceHub'

function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '??'
}

function maskAccount(acc = '') {
  if (!acc) return '—'
  return acc.length > 4 ? `**** ${acc.slice(-4)}` : acc
}

const STATUS_STYLE = {
  Pending:  'bg-amber-50 text-amber-700 ring-amber-500/10',
  Approved: 'bg-emerald-50 text-emerald-700 ring-emerald-500/10',
  Rejected: 'bg-red-50 text-red-700 ring-red-500/10',
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLE[status] || 'bg-zinc-50 text-zinc-600 ring-zinc-500/10'}`}>
      {status}
    </span>
  )
}

function KpiCard({ title, value, unit, icon }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-zinc-200 flex items-center justify-between shadow-sm">
      <div>
        <p className="text-sm font-medium text-zinc-600 mb-1">{title}</p>
        <p className="text-3xl font-bold text-zinc-950">
          {value}{unit && <span className="text-base font-medium text-zinc-600 ml-1">{unit}</span>}
        </p>
      </div>
      <div className="p-3 bg-zinc-50 rounded-xl text-zinc-400">
        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{icon}</span>
      </div>
    </div>
  )
}

export default function WithdrawalManagement() {
  const [items, setItems]         = useState([])
  const [page, setPage]           = useState(1)
  const [totalPages, setTotal]    = useState(1)
  const [totalCount, setCount]    = useState(0)
  const [loading, setLoading]     = useState(true)
  const [acting, setActing]       = useState(null)

  const load = (p = page) => {
    setLoading(true)
    getWithdrawalsPaged({ page: p, pageSize: 5 })
      .then(r => {
        setItems(r.data.data?.items || [])
        setTotal(r.data.data?.totalPages || 1)
        setCount(r.data.data?.totalCount || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(page) }, [page])

  const handle = async (id, fn) => {
    setActing(id)
    try { await fn(id) } catch {}
    setActing(null)
    load(page)
  }

  const [kpi, setKpi] = useState({ pendingCount: 0, pendingAmount: 0, processedToday: 0 })

  const pending = items.filter(i => i.status === 'Pending')
  const pendingAmount = pending.reduce((sum, i) => sum + (i.amount || 0), 0)
  const today = new Date().toDateString()
  const processedToday = items.filter(i =>
    i.status !== 'Pending' && new Date(i.createAt).toDateString() === today
  ).length

  const handleWithdrawalsUpdated = useCallback((data) => {
    if (data) setKpi({ pendingCount: data.pendingCount ?? 0, pendingAmount: data.pendingAmount ?? 0, processedToday: data.processedToday ?? 0 })
    load(page)
  }, [page])

  useRaceHub(null, { onWithdrawalsUpdated: handleWithdrawalsUpdated })

  return (
    <DashboardLayout title="Withdrawal Management">
      <div className="space-y-8">

        {/* Page heading */}
        <div>
          <h1 className="text-2xl font-bold text-zinc-950">Withdrawal Management</h1>
          <p className="text-sm text-zinc-500 mt-1">Review and process user withdrawal requests.</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KpiCard title="Total Pending Count"  value={kpi.pendingCount || pending.length}                           icon="pending_actions" />
          <KpiCard title="Total Pending Amount" value={(kpi.pendingAmount || pendingAmount).toLocaleString()} unit="VND" icon="toll" />
          <KpiCard title="Processed Today"      value={kpi.processedToday || processedToday}                         icon="check_circle" />
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100">
            <h2 className="text-sm font-bold text-zinc-950">Pending Requests</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Review and process user withdrawal requests.</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <span className="material-symbols-outlined animate-spin text-3xl text-zinc-300">progress_activity</span>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-sm font-semibold text-zinc-400">No withdrawal requests.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50/70 border-b border-zinc-100">
                  <tr>
                    {['Account Holder', 'Amount', 'Bank Details', 'Requested At', 'Status', 'Actions'].map(h => (
                      <th key={h} className="py-3 px-6 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {items.map(item => (
                    <tr key={item.withdrawalId} className="hover:bg-zinc-50/60 transition-colors">

                      {/* Account Holder */}
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-zinc-900 text-white flex items-center justify-center rounded-full text-sm font-bold shrink-0">
                            {initials(item.accountHolderName)}
                          </div>
                          <p className="font-semibold text-zinc-950">{item.accountHolderName || '—'}</p>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-5 px-6">
                        <p className="font-bold text-rose-600">{item.amount?.toLocaleString()}</p>
                        <p className="text-[11px] text-zinc-400 font-medium">VND</p>
                      </td>

                      {/* Bank Details */}
                      <td className="py-5 px-6">
                        <p className="font-bold text-zinc-950">{item.bankName || '—'}</p>
                        <p className="text-xs font-mono text-zinc-400">{item.bankAccountNumber || '—'}</p>
                      </td>

                      {/* Date */}
                      <td className="py-5 px-6 text-zinc-500 text-xs whitespace-nowrap">
                        {item.createAt ? new Date(item.createAt).toLocaleString() : '—'}
                      </td>

                      {/* Status */}
                      <td className="py-5 px-6">
                        <StatusBadge status={item.status} />
                      </td>

                      {/* Actions */}
                      <td className="py-5 px-6">
                        {item.status === 'Pending' && (
                          <div className="flex items-center gap-2 justify-end flex-wrap">
                            <button
                              onClick={() => handle(item.withdrawalId, rejectWithdrawal)}
                              disabled={acting === item.withdrawalId}
                              className="px-3 py-1.5 border border-rose-200 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-50 transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handle(item.withdrawalId, approveWithdrawal)}
                              disabled={acting === item.withdrawalId}
                              className="px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50"
                            >
                              {acting === item.withdrawalId ? '…' : 'Approve'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <p>Showing page {page} of {totalPages} ({totalCount} total)</p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-zinc-200 text-zinc-400 hover:bg-zinc-50 disabled:opacity-40 transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_left</span>
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-zinc-200 text-zinc-400 hover:bg-zinc-50 disabled:opacity-40 transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_right</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
