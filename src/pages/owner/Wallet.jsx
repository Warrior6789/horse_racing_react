import { useEffect, useState, useCallback } from 'react'
import { Wallet, ArrowDownLeft, ArrowUpRight, Plus, X, TrendingDown, TrendingUp, Clock, CheckCircle } from 'lucide-react'
import OwnerLayout from '../../components/OwnerLayout'
import { getBalance, deposit, getTransactions } from '../../api/payments'
import { requestWithdrawal } from '../../api/withdrawals'
import { getActiveConversionRate } from '../../api/config'
import { useRaceHub } from '../../hooks/useRaceHub'
import { useAuth } from '../../context/AuthContext'

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="bg-[#1a1c23] border border-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-gray-100">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

const BALANCE_REASON_MSG = {
  PrizePayout:           (amount) => `+${amount.toLocaleString()} VND tiền thưởng giải đua`,
  RefundRegistrationFee: (amount) => `+${amount.toLocaleString()} VND hoàn phí đăng ký`,
  BetPayout:             (amount) => `+${amount.toLocaleString()} VND từ cược thắng`,
  RefundBet:             (amount) => `+${amount.toLocaleString()} VND hoàn tiền cược`,
}

export default function OwnerWallet() {
  const { user } = useAuth()
  const [balance, setBalance]           = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]           = useState(true)
  const [page, setPage]                 = useState(1)
  const [totalPages, setTotalPages]     = useState(1)
  const [totalCount, setTotalCount]     = useState(0)
  const PAGE_SIZE = 8

  const [depositModal, setDepositModal]   = useState(false)
  const [withdrawModal, setWithdrawModal] = useState(false)
  const [amount, setAmount]               = useState('')
  const [msg, setMsg]                     = useState({ type: '', text: '' })
  const [actionLoading, setActionLoading] = useState(false)
  const [conversionRate, setConversionRate] = useState(null)
  const [toast, setToast] = useState(null)

  // computed stats from all transactions (fetch once for stats)
  const [allTx, setAllTx] = useState([])

  const fetchData = useCallback((p) => {
    setLoading(true)
    Promise.all([
      getBalance().then(r => setBalance(r.data.data?.balance ?? 0)).catch(() => {}),
      getTransactions({ page: p, pageSize: PAGE_SIZE }).then(r => {
        const d = r.data.data
        setTransactions(d?.items || [])
        setTotalPages(d?.totalPages || 1)
        setTotalCount(d?.totalCount || 0)
      }).catch(() => {}),
      getTransactions({ page: 1, pageSize: 200 }).then(r => {
        setAllTx(r.data.data?.items || [])
      }).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchData(page) }, [page, fetchData])

  const handleBalanceUpdated = useCallback((data) => {
    if (!user || data?.accountId !== user.id) return
    if (data.newBalance != null) setBalance(data.newBalance)
    const mkMsg = BALANCE_REASON_MSG[data?.reason]
    if (mkMsg) {
      setToast(mkMsg(data.amount ?? 0))
      setTimeout(() => setToast(null), 4000)
    }
    getTransactions({ page: 1, pageSize: PAGE_SIZE }).then(r => {
      const d = r.data.data
      setTransactions(d?.items || [])
      setTotalPages(d?.totalPages || 1)
      setTotalCount(d?.totalCount || 0)
    }).catch(() => {})
  }, [user])

  useRaceHub(null, { onBalanceUpdated: handleBalanceUpdated })

  useEffect(() => {
    getActiveConversionRate()
      .then(r => setConversionRate(r.data?.data?.rateValue ?? null))
      .catch(() => {})
  }, [])

  const handleDeposit = async () => {
    if (!amount || Number(amount) <= 0) return
    setActionLoading(true)
    try {
      const r = await deposit({
        amount:    Number(amount),
        cancelUrl: `${window.location.origin}/payment/cancel`,
        returnUrl: `${window.location.origin}/payment/return`,
      })
      const paymentUrl =
        r.data?.data?.paymentUrl ||
        r.data?.paymentUrl ||
        (typeof r.data?.data === 'string' && r.data.data.startsWith('http') ? r.data.data : null) ||
        (typeof r.data === 'string' && r.data.startsWith('http') ? r.data : null)
      if (paymentUrl) {
        window.location.href = paymentUrl
        setDepositModal(false)
      } else {
        setMsg({ type: 'success', text: 'Deposit initiated.' })
        setDepositModal(false)
        fetchData(1)
      }
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.message || 'Deposit failed.' })
    } finally { setActionLoading(false); setAmount('') }
  }

  const handleWithdraw = async () => {
    if (!amount || Number(amount) <= 0) return
    setActionLoading(true)
    try {
      await requestWithdrawal({ amount: Number(amount) })
      setMsg({ type: 'success', text: 'Withdrawal request submitted.' })
      setWithdrawModal(false)
      fetchData(1)
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.message || 'Withdrawal failed.' })
    } finally { setActionLoading(false); setAmount('') }
  }

  const isDeposit = tx => (tx.type || tx.transactionType || tx.paymentType || '').toLowerCase().includes('deposit')
  const fmtDate   = str => str ? new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
  const txDate    = tx => tx.createdAt || tx.createAt || tx.transactionDate || tx.date || null

  const totalDeposited  = allTx.filter(t => isDeposit(t) && (t.status === 'Completed' || t.status === 'Success')).reduce((s, t) => s + (t.amount || 0), 0)
  const totalWithdrawn  = allTx.filter(t => !isDeposit(t) && (t.status === 'Completed' || t.status === 'Success')).reduce((s, t) => s + (t.amount || 0), 0)
  const pendingCount    = allTx.filter(t => t.status === 'Pending').length

  const inputCls = 'w-full bg-[#0f1115] border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-200 outline-none focus:border-yellow-500/40 transition-colors placeholder:text-gray-600'

  return (
    <OwnerLayout>
      {toast && (
        <div className="fixed top-6 right-6 z-[100] flex items-center gap-3 bg-emerald-900/90 border border-emerald-600/40 text-emerald-300 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold backdrop-blur-sm">
          <CheckCircle size={16} className="shrink-0" />
          {toast}
        </div>
      )}

      {/* Sticky header */}
      <header className="flex justify-between items-center px-8 py-6 sticky top-0 z-10 bg-[#0b0f19]/80 backdrop-blur-md border-b border-gray-800/40">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-0.5">My Wallet</p>
          <h1 className="text-2xl font-black text-gray-100 tracking-tight">Financial Overview</h1>
        </div>
        <div className="bg-[#1a1c23] px-4 py-2 rounded-xl flex items-center gap-2 border border-gray-800/60">
          <span className="text-[#facc15] font-bold text-sm tracking-wide">
            {loading ? '—' : `${(balance ?? 0).toLocaleString()} VND`}
          </span>
        </div>
      </header>

      <div className="px-8 pb-12 pt-6 space-y-6">
        {msg.text && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
            msg.type === 'error'
              ? 'bg-red-500/10 border border-red-500/20 text-red-400'
              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
          }`}>
            {msg.text}
            <button onClick={() => setMsg({ type: '', text: '' })} className="ml-auto"><X size={14} /></button>
          </div>
        )}

        {/* Balance card */}
        <div className="bg-[#1a1c23] p-6 rounded-2xl border border-gray-800 flex justify-between items-center relative overflow-hidden shadow-lg">
          <div className="absolute right-36 -bottom-8 opacity-5 text-gray-400 pointer-events-none">
            <Wallet size={160} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Current Balance</p>
            <h2 className="text-3xl font-black text-gray-100 tracking-tight mt-1">
              {loading ? '—' : `${(balance ?? 0).toLocaleString()} VND`}
            </h2>
            <p className="text-[11px] text-yellow-500/70 font-semibold mt-0.5">Owner Account</p>
          </div>
          <div className="flex gap-3 z-10">
            <button
              onClick={() => { setAmount(''); setMsg({ type: '', text: '' }); setDepositModal(true) }}
              className="bg-[#facc15] hover:bg-[#eab308] text-black font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md"
            >
              Deposit
            </button>
            <button
              onClick={() => { setAmount(''); setMsg({ type: '', text: '' }); setWithdrawModal(true) }}
              className="bg-[#1f1d28] border border-gray-700 text-gray-300 font-bold px-6 py-2.5 rounded-xl text-xs hover:bg-gray-800 hover:text-white transition-all"
            >
              Withdraw
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: <TrendingUp size={16} />,  color: 'text-emerald-400 bg-emerald-500/10', label: 'Total Deposited',  value: loading ? '—' : `+${totalDeposited.toLocaleString()} VND` },
            { icon: <TrendingDown size={16} />, color: 'text-red-400 bg-red-500/10',        label: 'Total Withdrawn',  value: loading ? '—' : `-${totalWithdrawn.toLocaleString()} VND` },
            { icon: <Clock size={16} />,        color: 'text-yellow-400 bg-yellow-500/10',  label: 'Pending',          value: loading ? '—' : `${pendingCount} Transactions` },
          ].map(({ icon, color, label, value }) => (
            <div key={label} className="bg-[#1a1c23] p-4 rounded-xl border border-gray-800/50 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>{icon}</div>
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">{label}</p>
                <p className="text-sm font-bold text-gray-200 mt-0.5">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Transaction History */}
        <section className="bg-[#1a1c23] rounded-xl border border-gray-800 overflow-hidden">
          <div className="p-4 flex justify-between items-center border-b border-gray-800">
            <h3 className="font-bold text-sm text-gray-200">Transaction History</h3>
            <span className="text-[11px] text-gray-500 font-medium">{totalCount} total</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-[#16181d] text-gray-500 font-bold uppercase text-[10px] tracking-wider border-b border-gray-800/50">
                <tr>
                  <th className="p-4">Transaction</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="p-4"><div className="h-4 bg-gray-800 rounded animate-pulse w-20" /></td>
                    ))}</tr>
                  ))
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={5} className="p-12 text-center text-gray-500">No transactions yet.</td></tr>
                ) : (
                  transactions.map((tx, i) => {
                    const dep    = isDeposit(tx)
                    const status = tx.status || 'Pending'
                    return (
                      <tr key={tx.transactionId || i} className="hover:bg-gray-800/30 transition-colors">
                        <td className="p-4 font-bold">
                          <div className="flex items-center gap-3 text-gray-200">
                            <div className={`p-1.5 rounded-md ${dep ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                              {dep ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                            </div>
                            {dep ? 'Deposit' : 'Withdrawal'}
                          </div>
                        </td>
                        <td className="p-4 text-gray-400">{dep ? 'Deposit' : 'Withdraw'}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            status === 'Completed' || status === 'Success'
                              ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                              : status === 'Failed'
                              ? 'bg-red-500/5 border-red-500/20 text-red-400'
                              : 'bg-yellow-500/5 border-yellow-500/20 text-yellow-400'
                          }`}>
                            {status}
                          </span>
                        </td>
                        <td className="p-4 text-gray-500">{fmtDate(txDate(tx))}</td>
                        <td className={`p-4 text-right font-bold ${dep ? 'text-emerald-400' : 'text-red-400'}`}>
                          {dep ? '+' : '-'}{(tx.amount || 0).toLocaleString()} VND
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-800 flex items-center justify-between">
              <span className="text-[11px] text-gray-500">Page {page} / {totalPages}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-800 text-gray-400 hover:bg-gray-800 disabled:opacity-40 text-xs font-bold transition-colors">
                  Prev
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-800 text-gray-400 hover:bg-gray-800 disabled:opacity-40 text-xs font-bold transition-colors">
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Deposit Modal */}
      {depositModal && (
        <Modal title="Deposit Funds" onClose={() => setDepositModal(false)}>
          {conversionRate != null && (
            <div className="flex items-center justify-between bg-[#0f1115] border border-gray-800 rounded-xl px-4 py-3 mb-4">
              <span className="text-[11px] text-gray-400 font-semibold">Conversion rate</span>
              <span className="text-[11px] font-bold text-yellow-400">
                {Math.round(1 / conversionRate).toLocaleString()} VND = 1 coin
              </span>
            </div>
          )}
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Amount (VND)</label>
          <input type="number" min="1" placeholder="50000" value={amount} onChange={e => setAmount(e.target.value)} className={inputCls} />
          {conversionRate != null && Number(amount) > 0 && (
            <div className="mt-2 mb-4 flex items-center justify-between px-1">
              <span className="text-[11px] text-gray-500">You will receive</span>
              <span className="text-sm font-black text-yellow-400">≈ {Math.floor(Number(amount) * conversionRate).toLocaleString()} coins</span>
            </div>
          )}
          {(conversionRate == null || Number(amount) <= 0) && <div className="mb-4" />}
          {msg.type === 'error' && <p className="text-xs text-red-400 mb-3">{msg.text}</p>}
          <button onClick={handleDeposit} disabled={actionLoading}
            className="w-full bg-[#facc15] hover:bg-[#eab308] text-black font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            <Plus size={16} />
            {actionLoading ? 'Redirecting…' : 'Deposit via VNPay'}
          </button>
        </Modal>
      )}

      {/* Withdraw Modal */}
      {withdrawModal && (
        <Modal title="Request Withdrawal" onClose={() => setWithdrawModal(false)}>
          {conversionRate != null && (
            <div className="flex items-center justify-between bg-[#0f1115] border border-gray-800 rounded-xl px-4 py-3 mb-4">
              <span className="text-[11px] text-gray-400 font-semibold">Conversion rate</span>
              <span className="text-[11px] font-bold text-yellow-400">
                {Math.round(1 / conversionRate).toLocaleString()} VND = 1 coin
              </span>
            </div>
          )}
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Amount (VND)</label>
          <input type="number" min="1" placeholder="100" value={amount} onChange={e => setAmount(e.target.value)} className={inputCls} />
          {conversionRate != null && Number(amount) > 0 && (
            <div className="mt-2 mb-4 flex items-center justify-between px-1">
              <span className="text-[11px] text-gray-500">You will receive</span>
              <span className="text-sm font-black text-yellow-400">≈ {Math.round(Number(amount) / conversionRate).toLocaleString()} VND</span>
            </div>
          )}
          {(conversionRate == null || Number(amount) <= 0) && <div className="mb-4" />}
          {msg.type === 'error' && <p className="text-xs text-red-400 mb-3">{msg.text}</p>}
          <button onClick={handleWithdraw} disabled={actionLoading}
            className="w-full bg-[#1f1d28] border border-gray-700 text-gray-200 font-bold py-3 rounded-xl text-sm hover:bg-gray-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            <Wallet size={16} />
            {actionLoading ? 'Submitting…' : 'Submit Request'}
          </button>
        </Modal>
      )}
    </OwnerLayout>
  )
}
