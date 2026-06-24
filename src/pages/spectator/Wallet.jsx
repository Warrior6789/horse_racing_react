import { useEffect, useState, useCallback } from 'react'
import { Wallet, TrendingUp, Trophy, Clock, ArrowDownLeft, ArrowUpRight, Plus, X, CheckCircle } from 'lucide-react'
import SpectatorLayout from '../../components/SpectatorLayout'
import { getBalance, deposit, getTransactions } from '../../api/payments'
import { requestWithdrawal } from '../../api/withdrawals'
import { getMyBetsPaged } from '../../api/bets'
import { getActiveConversionRate } from '../../api/config'
import { useRaceHub } from '../../hooks/useRaceHub'
import { useAuth } from '../../context/AuthContext'

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="bg-[#171410] border border-stone-800 rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-stone-100">{title}</h3>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300 transition-colors"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

const BALANCE_REASON_MSG = {
  BetPayout:             (amount) => `+${amount.toLocaleString()} VND từ cược thắng`,
  PrizePayout:           (amount) => `+${amount.toLocaleString()} VND tiền thưởng`,
  RefundBet:             (amount) => `+${amount.toLocaleString()} VND hoàn tiền cược`,
  RefundRegistrationFee: (amount) => `+${amount.toLocaleString()} VND hoàn phí đăng ký`,
}

export default function WalletPage() {
  const { user } = useAuth()
  const [balance, setBalance]           = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]           = useState(true)
  const [page, setPage]                 = useState(1)
  const [totalPages, setTotalPages]     = useState(1)
  const [totalCount, setTotalCount]     = useState(0)
  const PAGE_SIZE = 8

  const [totalWinnings, setTotalWinnings] = useState(0)
  const [pendingBets, setPendingBets]     = useState(0)
  const [wonBets, setWonBets]             = useState(0)

  const [depositModal, setDepositModal]   = useState(false)
  const [withdrawModal, setWithdrawModal] = useState(false)
  const [amount, setAmount]               = useState('')
  const [msg, setMsg]                     = useState({ type: '', text: '' })
  const [actionLoading, setActionLoading] = useState(false)
  const [conversionRate, setConversionRate] = useState(null)
  const [toast, setToast] = useState(null)

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
      getMyBetsPaged({ page: 1, pageSize: 100 }).then(r => {
        const items = r.data.data?.items || []
        setTotalWinnings(items.filter(b => b.status === 'Won').reduce((s, b) => s + (b.potentialWinnings || 0), 0))
        setPendingBets(items.filter(b => b.status === 'Pending').length)
        setWonBets(items.filter(b => b.status === 'Won').length)
      }).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchData(page) }, [page, fetchData])

  const handlePaymentsUpdated = useCallback(() => {
    fetchData(1)
  }, [fetchData])

  const handleWithdrawalsUpdated = useCallback(() => {
    fetchData(1)
  }, [fetchData])

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
      setPage(1)
    }).catch(() => {})
  }, [user])

  useRaceHub(null, {
    onPaymentsUpdated:    handlePaymentsUpdated,
    onWithdrawalsUpdated: handleWithdrawalsUpdated,
    onBalanceUpdated:     handleBalanceUpdated,
  })

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

  return (
    <SpectatorLayout>
      {/* HEADER */}
      <header className="flex justify-between items-center px-8 py-6 sticky top-0 z-10 bg-[#110e0b]/80 backdrop-blur-md">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-0.5">My Wallet</p>
          <h1 className="text-2xl font-black text-stone-100 tracking-tight">Financial Overview</h1>
        </div>
        <div className="bg-[#1f1a14] px-4 py-2 rounded-xl flex items-center space-x-2 border border-stone-800/60">
          <span className="text-[#f7e0a3] font-bold text-sm tracking-wide">
            {loading ? '—' : `${(balance ?? 0).toLocaleString()} VND`}
          </span>
        </div>
      </header>

      {toast && (
        <div className="fixed top-6 right-6 z-[100] flex items-center gap-3 bg-emerald-900/90 border border-emerald-600/40 text-emerald-300 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold backdrop-blur-sm">
          <CheckCircle size={16} className="shrink-0" />
          {toast}
        </div>
      )}

      <div className="px-8 pb-12 space-y-6">
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
        <div className="bg-[#171410] p-6 rounded-2xl border border-stone-800/60 flex justify-between items-center relative overflow-hidden shadow-lg">
          <div className="absolute right-36 -bottom-8 opacity-5 text-stone-400 pointer-events-none">
            <Wallet size={160} />
          </div>
          <div>
            <p className="text-xs text-stone-400 font-medium">Current Balance</p>
            <h2 className="text-3xl font-black text-stone-100 tracking-tight mt-1">
              {loading ? '—' : `${(balance ?? 0).toLocaleString()} VND`}
            </h2>
            <p className="text-[11px] text-[#f7e0a3]/70 font-semibold mt-0.5">Spectator Account</p>
          </div>
          <div className="flex space-x-3 z-10">
            <button
              onClick={() => { setAmount(''); setMsg({ type: '', text: '' }); setDepositModal(true) }}
              className="bg-[#f7e0a3] text-[#110e0b] font-bold px-6 py-2.5 rounded-xl text-xs hover:bg-[#ebd292] transition-all shadow-md"
            >
              Deposit
            </button>
            <button
              onClick={() => { setAmount(''); setMsg({ type: '', text: '' }); setWithdrawModal(true) }}
              className="bg-[#1f1a14] border border-stone-700 text-stone-300 font-bold px-6 py-2.5 rounded-xl text-xs hover:bg-stone-800/40 hover:text-stone-100 transition-all"
            >
              Withdraw
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: <TrendingUp size={16} />, color: 'text-emerald-400 bg-emerald-500/10', label: 'Total Winnings', value: loading ? '—' : `+${totalWinnings.toLocaleString()} VND` },
            { icon: <Trophy size={16} />,    color: 'text-[#f7e0a3] bg-[#f7e0a3]/10',    label: 'Bets Won',        value: loading ? '—' : `${wonBets} Races` },
            { icon: <Clock size={16} />,     color: 'text-stone-400 bg-stone-500/10',     label: 'Pending Bets',    value: loading ? '—' : `${pendingBets} Stakes` },
          ].map(({ icon, color, label, value }) => (
            <div key={label} className="bg-[#171410] p-4 rounded-xl border border-stone-800/50 flex items-center space-x-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>{icon}</div>
              <div>
                <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wide">{label}</p>
                <p className="text-sm font-bold text-stone-200 mt-0.5">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Transaction History */}
        <section className="bg-[#171410] rounded-xl border border-stone-800/50 overflow-hidden">
          <div className="p-4 flex justify-between items-center border-b border-stone-800/50">
            <h3 className="font-bold text-sm tracking-wide text-stone-200">Transaction History</h3>
            <span className="text-[11px] text-stone-500 font-medium">{totalCount} total</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-300">
              <thead className="bg-[#110e0b] text-stone-500 font-bold uppercase text-[10px] tracking-wider border-b border-stone-800/30">
                <tr>
                  <th className="p-4">Transaction</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/40">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="p-4"><div className="h-4 bg-stone-800 rounded animate-pulse w-20" /></td>
                    ))}</tr>
                  ))
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={5} className="p-12 text-center text-stone-500">No transactions yet.</td></tr>
                ) : (
                  transactions.map((tx, i) => {
                    const dep    = isDeposit(tx)
                    const status = tx.status || 'Pending'
                    return (
                      <tr key={tx.transactionId || i} className="hover:bg-[#1a1610] transition-colors">
                        <td className="p-4 font-bold">
                          <div className="flex items-center space-x-3 text-stone-200">
                            <div className={`p-1.5 rounded-md ${dep ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                              {dep ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                            </div>
                            <span>{dep ? 'Deposit' : 'Withdrawal'}</span>
                          </div>
                        </td>
                        <td className="p-4 text-stone-400 font-medium">{dep ? 'Deposit' : 'Withdraw'}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            status === 'Completed' || status === 'Success'
                              ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                              : status === 'Failed' || status === 'Cancelled'
                              ? 'bg-red-500/5 border-red-500/20 text-red-400'
                              : 'bg-amber-500/5 border-amber-500/20 text-[#f7e0a3]'
                          }`}>
                            {status}
                          </span>
                        </td>
                        <td className="p-4 text-stone-500">{fmtDate(txDate(tx))}</td>
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
            <div className="p-4 border-t border-stone-800/50 flex items-center justify-between">
              <span className="text-[11px] text-stone-500">Page {page} / {totalPages}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-stone-800 text-stone-400 hover:bg-stone-800/40 disabled:opacity-40 text-xs font-bold transition-colors">
                  Prev
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-stone-800 text-stone-400 hover:bg-stone-800/40 disabled:opacity-40 text-xs font-bold transition-colors">
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* DEPOSIT MODAL */}
      {depositModal && (
        <Modal title="Deposit Funds" onClose={() => setDepositModal(false)}>
          {/* Conversion rate info */}
          {conversionRate != null && (
            <div className="flex items-center justify-between bg-[#110e0b] border border-stone-800 rounded-xl px-4 py-3 mb-4">
              <span className="text-[11px] text-stone-400 font-semibold">Conversion rate</span>
              <span className="text-[11px] font-bold text-[#f7e0a3]">
                {Math.round(1 / conversionRate).toLocaleString()} VND = 1 coin
              </span>
            </div>
          )}

          <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Amount (VND)</label>
          <input
            type="number" min="1" placeholder="50000"
            value={amount} onChange={e => setAmount(e.target.value)}
            className="w-full bg-[#110e0b] border border-stone-700 rounded-xl px-4 py-3 text-sm text-stone-200 outline-none focus:border-[#f7e0a3]/40 transition-colors placeholder:text-stone-600"
          />

          {/* Live coin preview */}
          {conversionRate != null && Number(amount) > 0 && (
            <div className="mt-2 mb-4 flex items-center justify-between px-1">
              <span className="text-[11px] text-stone-500">You will receive</span>
              <span className="text-sm font-black text-[#f7e0a3]">
                ≈ {Math.floor(Number(amount) * conversionRate).toLocaleString()} VND
              </span>
            </div>
          )}
          {(conversionRate == null || Number(amount) <= 0) && <div className="mb-4" />}

          {msg.type === 'error' && <p className="text-xs text-red-400 mb-3">{msg.text}</p>}
          <button onClick={handleDeposit} disabled={actionLoading}
            className="w-full bg-[#f7e0a3] text-[#110e0b] font-bold py-3 rounded-xl text-sm hover:bg-[#ebd292] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            <Plus size={16} />
            {actionLoading ? 'Redirecting…' : 'Deposit via VNPay'}
          </button>
        </Modal>
      )}

      {/* WITHDRAW MODAL */}
      {withdrawModal && (
        <Modal title="Request Withdrawal" onClose={() => setWithdrawModal(false)}>
          {/* Conversion rate info */}
          {conversionRate != null && (
            <div className="flex items-center justify-between bg-[#110e0b] border border-stone-800 rounded-xl px-4 py-3 mb-4">
              <span className="text-[11px] text-stone-400 font-semibold">Conversion rate</span>
              <span className="text-[11px] font-bold text-[#f7e0a3]">
                {Math.round(1 / conversionRate).toLocaleString()} VND = 1 coin
              </span>
            </div>
          )}

          <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Amount (VND)</label>
          <input
            type="number" min="1" placeholder="100"
            value={amount} onChange={e => setAmount(e.target.value)}
            className="w-full bg-[#110e0b] border border-stone-700 rounded-xl px-4 py-3 text-sm text-stone-200 outline-none focus:border-[#f7e0a3]/40 transition-colors placeholder:text-stone-600"
          />

          {/* Live VND preview */}
          {conversionRate != null && Number(amount) > 0 && (
            <div className="mt-2 mb-4 flex items-center justify-between px-1">
              <span className="text-[11px] text-stone-500">You will receive</span>
              <span className="text-sm font-black text-[#f7e0a3]">
                ≈ {Math.round(Number(amount) / conversionRate).toLocaleString()} VND
              </span>
            </div>
          )}
          {(conversionRate == null || Number(amount) <= 0) && <div className="mb-4" />}

          {msg.type === 'error' && <p className="text-xs text-red-400 mb-3">{msg.text}</p>}
          <button onClick={handleWithdraw} disabled={actionLoading}
            className="w-full bg-[#1f1a14] border border-stone-700 text-stone-200 font-bold py-3 rounded-xl text-sm hover:bg-stone-800/40 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            <Wallet size={16} />
            {actionLoading ? 'Submitting…' : 'Submit Request'}
          </button>
        </Modal>
      )}
    </SpectatorLayout>
  )
}
