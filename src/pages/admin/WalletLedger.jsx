import { useEffect, useState, useCallback } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { getWalletTransactionsPaged } from '../../api/walletTransactions'
import { useRaceHub } from '../../hooks/useRaceHub'

const TYPE_OPTS = [
  'All', 'Deposit', 'Withdrawal', 'BetPlaced', 'BetPayout', 'BetRefund',
  'RegistrationFeeCharged', 'RegistrationFeeRefund', 'PrizePayout', 'PrizeAdjustment', 'Fine',
]

const TYPE_CLS = {
  Deposit:                'bg-emerald-50 text-emerald-700 ring-emerald-500/20',
  Withdrawal:              'bg-red-50 text-red-700 ring-red-500/20',
  BetPlaced:                'bg-blue-50 text-blue-700 ring-blue-500/20',
  BetPayout:                'bg-amber-50 text-amber-700 ring-amber-500/20',
  BetRefund:                'bg-cyan-50 text-cyan-700 ring-cyan-500/20',
  RegistrationFeeCharged:  'bg-orange-50 text-orange-700 ring-orange-500/20',
  RegistrationFeeRefund:    'bg-teal-50 text-teal-700 ring-teal-500/20',
  PrizePayout:              'bg-purple-50 text-purple-700 ring-purple-500/20',
  PrizeAdjustment:          'bg-indigo-50 text-indigo-700 ring-indigo-500/20',
  Fine:                    'bg-rose-50 text-rose-700 ring-rose-500/20',
}

const PAGE_SIZE = 10

function fmtDateTime(dt) {
  if (!dt) return '—'
  const d = new Date(dt)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function truncateId(id) {
  if (!id) return '—'
  return `${id.slice(0, 8)}…`
}

export default function WalletLedger() {
  const [type, setType]       = useState('All')
  const [items, setItems]     = useState([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)

  const load = useCallback((pg, ty, silent = false) => {
    if (!silent) setLoading(true)
    const params = { page: pg, pageSize: PAGE_SIZE }
    if (ty !== 'All') params.type = ty
    getWalletTransactionsPaged(params)
      .then(r => {
        const d = r.data.data
        setItems(d?.items || [])
        setTotal(d?.totalCount || 0)
      })
      .catch(() => { if (!silent) { setItems([]); setTotal(0) } })
      .finally(() => { if (!silent) setLoading(false) })
  }, [])

  useEffect(() => { load(page, type) }, [load, page, type])

  const handleBalanceUpdated = useCallback(() => {
    load(page, type, true)
  }, [load, page, type])

  useRaceHub(null, { onBalanceUpdated: handleBalanceUpdated })

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function changeType(ty) { setType(ty); setPage(1) }

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wallet Ledger</h1>
          <p className="text-sm text-gray-500 mt-1">Full history of every balance-affecting transaction across all accounts.</p>
        </div>

        {/* Type tabs */}
        <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
          {TYPE_OPTS.map(ty => (
            <button
              key={ty}
              onClick={() => changeType(ty)}
              className={`shrink-0 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                type === ty
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {ty}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1.6fr_1.2fr_1fr_1fr_1.2fr_1.2fr] px-5 py-3 bg-gray-50 border-b border-gray-100">
            {['Account', 'Type', 'Amount', 'Balance After', 'Reference', 'Created At'].map(col => (
              <span key={col} className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{col}</span>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <span className="material-symbols-outlined animate-spin text-3xl text-gray-300">progress_activity</span>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-sm font-semibold text-gray-400">No wallet transactions found.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {items.map(r => (
                <div
                  key={r.walletTransactionId}
                  className="grid grid-cols-[1.6fr_1.2fr_1fr_1fr_1.2fr_1.2fr] items-center px-5 py-4 gap-x-2"
                >
                  <div className="min-w-0" title={r.accountId}>
                    <p className="font-bold text-gray-900 text-sm truncate">{r.accountEmail || 'Unknown account'}</p>
                    <p className="text-[11px] text-gray-400 font-mono">{truncateId(r.accountId)}</p>
                  </div>

                  <div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${TYPE_CLS[r.type] || 'bg-gray-100 text-gray-500 ring-gray-400/20'}`}>
                      {r.type}
                    </span>
                  </div>

                  <p className={`font-bold text-sm ${r.amount < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {r.amount > 0 ? '+' : ''}{r.amount.toLocaleString('en-US')}
                  </p>

                  <p className="font-medium text-gray-700 text-sm">
                    {(r.balanceAfter ?? 0).toLocaleString('en-US')}
                  </p>

                  <p className="text-gray-400 text-xs font-mono truncate" title={r.referenceId}>
                    {truncateId(r.referenceId)}
                  </p>

                  <p className="text-gray-400 text-xs">{fmtDateTime(r.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-gray-400">Page {page} of {totalPages} · {total} records</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50 disabled:opacity-40 transition-colors">
                ‹ Prev
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50 disabled:opacity-40 transition-colors">
                Next ›
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
