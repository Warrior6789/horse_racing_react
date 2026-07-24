import { useEffect, useState, useCallback } from 'react'
import { Wallet, WalletCards, Plus, X, TrendingDown, TrendingUp, Clock, CheckCircle } from 'lucide-react'
import JockeyLayout from '../../components/JockeyLayout'
import { getBalance, deposit, getTransactions } from '../../api/payments'
import { requestWithdrawal } from '../../api/withdrawals'
import { getMyJockeyRaceHistory } from '../../api/jockeyProfiles'
import { getMyWalletTransactions } from '../../api/walletTransactions'
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
  PrizePayout: (amount) => `+${amount.toLocaleString()} VND race prize payout`,
  BetPayout:   (amount) => `+${amount.toLocaleString()} VND winning bet payout`,
  RefundBet:   (amount) => `+${amount.toLocaleString()} VND bet refund`,
  RefundRegistrationFee: (amount) => `+${amount.toLocaleString()} VND registration fee refund`,
  Fine:        (amount) => `-${Math.abs(amount).toLocaleString()} VND fine applied`,
}

const LEDGER_TYPE_LABEL = {
  Deposit:                'Deposit',
  Withdrawal:             'Withdrawal',
  BetPlaced:              'Bet Placed',
  BetPayout:              'Bet Payout',
  BetRefund:              'Bet Refund',
  RegistrationFeeCharged: 'Registration Fee',
  RegistrationFeeRefund:  'Registration Fee Refund',
  PrizePayout:            'Prize Payout',
  PrizeAdjustment:        'Prize Adjustment',
  Fine:                   'Fine',
}

export default function JockeyWallet() {
  const { user } = useAuth()
  const [balance, setBalance]           = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]           = useState(true)
  const [page, setPage]                 = useState(1)
  const [totalPages, setTotalPages]     = useState(1)
  const [totalCount, setTotalCount]     = useState(0)
  const PAGE_SIZE = 4

  const [depositModal, setDepositModal]   = useState(false)
  const [withdrawModal, setWithdrawModal] = useState(false)
  const [amount, setAmount]               = useState('')
  const [bankName, setBankName]           = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [accountHolderName, setAccountHolderName] = useState('')
  const [msg, setMsg]                     = useState({ type: '', text: '' })
  const [actionLoading, setActionLoading] = useState(false)

  const [allTx, setAllTx] = useState([])
  const [races, setRaces] = useState([])
  const [raceCount, setRaceCount] = useState(0)
  const [toast, setToast] = useState(null)

  const [ledger, setLedger]             = useState([])
  const [ledgerPage, setLedgerPage]     = useState(1)
  const [ledgerTotalPages, setLedgerTotalPages] = useState(1)
  const [ledgerTotalCount, setLedgerTotalCount] = useState(0)
  const [ledgerLoading, setLedgerLoading] = useState(true)
  const LEDGER_PAGE_SIZE = 8

  const fetchLedger = useCallback((p) => {
    setLedgerLoading(true)
    getMyWalletTransactions({ page: p, pageSize: LEDGER_PAGE_SIZE })
      .then(r => {
        const data = r.data?.data
        setLedger(data?.items || [])
        setLedgerTotalPages(Math.ceil((data?.totalCount || 0) / LEDGER_PAGE_SIZE) || 1)
        setLedgerTotalCount(data?.totalCount || 0)
      })
      .catch(() => {})
      .finally(() => setLedgerLoading(false))
  }, [])

  useEffect(() => { fetchLedger(ledgerPage) }, [ledgerPage, fetchLedger])

  const fetchData = useCallback((p) => {
    setLoading(true)
    Promise.all([
      getBalance()
        .then(r => setBalance(r.data.data?.balance ?? r.data.data?.walletBalance ?? 0))
        .catch(() => {}),
      getTransactions({ page: 1, pageSize: 500 }).then(r => {
        const all = r.data.data?.items || []
        setAllTx(all)
        const completed = all.filter(x => (x.status || '').toLowerCase() === 'completed')
        const start = (p - 1) * PAGE_SIZE
        setTransactions(completed.slice(start, start + PAGE_SIZE))
        setTotalPages(Math.ceil(completed.length / PAGE_SIZE) || 1)
        setTotalCount(completed.length)
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
    getTransactions({ page: 1, pageSize: 500 }).then(r => {
      const all = r.data.data?.items || []
      const completed = all.filter(x => (x.status || '').toLowerCase() === 'completed')
      setTransactions(completed.slice(0, PAGE_SIZE))
      setTotalPages(Math.ceil(completed.length / PAGE_SIZE) || 1)
      setTotalCount(completed.length)
      setPage(1)
    }).catch(() => {})
    setLedgerPage(1)
    fetchLedger(1)
  }, [user, fetchLedger])

  useRaceHub(null, { onBalanceUpdated: handleBalanceUpdated })

  useEffect(() => {
    getMyJockeyRaceHistory({ page: 1, pageSize: 5 })
      .then(r => {
        setRaces(r.data.data?.items || [])
        setRaceCount(r.data.data?.totalCount || 0)
      })
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
    if (!bankName.trim() || !bankAccountNumber.trim() || !accountHolderName.trim()) {
      setMsg({ type: 'error', text: 'Please fill in all bank details.' })
      return
    }
    setActionLoading(true)
    try {
      await requestWithdrawal({ amount: Number(amount), bankName: bankName.trim(), bankAccountNumber: bankAccountNumber.trim(), accountHolderName: accountHolderName.trim() })
      setMsg({ type: 'success', text: 'Withdrawal request submitted.' })
      setWithdrawModal(false)
      fetchData(1)
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.message || 'Withdrawal failed.' })
    } finally { setActionLoading(false); setAmount(''); setBankName(''); setBankAccountNumber(''); setAccountHolderName('') }
  }

  const isDeposit = tx => (tx.type || tx.transactionType || tx.paymentType || '').toLowerCase().includes('deposit')
  const fmtDate   = str => str ? new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
  const txDate    = tx => tx.createdAt || tx.createAt || tx.transactionDate || tx.date || null

  const totalDeposited  = allTx.filter(t => isDeposit(t) && (t.status === 'Completed' || t.status === 'Success')).reduce((s, t) => s + (t.amount || 0), 0)
  const totalWithdrawn  = allTx.filter(t => !isDeposit(t) && (t.status === 'Completed' || t.status === 'Success')).reduce((s, t) => s + (t.amount || 0), 0)
  const pendingCount    = allTx.filter(t => t.status === 'Pending').length

  const inputCls = 'w-full bg-[#0f1115] border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-200 outline-none focus:border-yellow-500/40 transition-colors placeholder:text-gray-600'

  return (
    <JockeyLayout>
      {toast && (
        <div className="fixed top-6 right-6 z-[100] flex items-center gap-3 bg-emerald-900/90 border border-emerald-600/40 text-emerald-300 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold backdrop-blur-sm">
          <CheckCircle size={16} className="shrink-0" />
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 px-4 md:px-8 py-4 md:py-6 sticky top-0 z-10 bg-[#0b0f19]/80 backdrop-blur-md border-b border-gray-800">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white mb-1 md:mb-2">Jockey Wallet</h1>
          <p className="text-gray-400 text-sm">Manage your professional earnings, sponsorships, and race payouts.</p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={() => { setAmount(''); setMsg({ type: '', text: '' }); setDepositModal(true) }}
            className="px-4 md:px-6 py-2.5 md:py-3 border border-gray-600 rounded-lg text-sm font-bold text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Deposit
          </button>
          <button
            onClick={() => { setAmount(''); setMsg({ type: '', text: '' }); setWithdrawModal(true) }}
            className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-[#facc15] hover:bg-yellow-400 rounded-lg text-sm font-bold text-black transition-colors"
          >
            <WalletCards size={18} />
            Withdraw
          </button>
        </div>
      </header>

      <div className="px-4 md:px-8 pb-12 pt-6 space-y-6">
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
            <p className="text-[11px] text-yellow-500/70 font-semibold mt-0.5">Jockey Account</p>
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

        {/* Bottom: two-column layout */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* Left: Earnings by Race */}
          <div className="w-full lg:w-1/3 shrink-0">
            <h2 className="font-bold text-white mb-6 text-lg">Earnings by Race</h2>
            {races.length === 0 ? (
              <p className="text-gray-500 text-sm">No confirmed races yet.</p>
            ) : (
              <div className="space-y-4">
                {(() => {
                  const COLORS = ['bg-yellow-500', 'bg-blue-400', 'bg-emerald-400', 'bg-gray-400', 'bg-gray-600']
                  return races.map((item, idx) => (
                    <div key={item.registrationId} className="flex justify-between items-center bg-[#1a2130] p-4 rounded-lg border border-gray-700/50">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${COLORS[idx % COLORS.length]}`} />
                        <span className="font-bold text-sm text-white truncate">
                          {item.raceName || `Race #${item.raceNumber || '—'}`}
                        </span>
                      </div>
                      <span className="font-black text-sm text-gray-300 shrink-0 ml-2">
                        {item.earnings != null ? `${item.earnings.toLocaleString()} VND` : '—'}
                      </span>
                    </div>
                  ))
                })()}
                {raceCount > 5 && (
                  <p className="text-[11px] text-gray-500 text-center pt-1">+{raceCount - 5} more races</p>
                )}
              </div>
            )}
          </div>

          {/* Right: Recent Transactions */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-white text-sm">Recent Transactions</h2>
              <span className="text-[11px] text-gray-500">{totalCount} total</span>
            </div>

            <div className="bg-[#161a23] rounded-xl border border-gray-800 p-4">
              {/* Table header */}
              <div className="grid grid-cols-5 text-[10px] text-gray-500 uppercase font-black mb-3 px-2">
                <div>Date</div>
                <div className="col-span-2">Description</div>
                <div>Category</div>
                <div>Amount</div>
              </div>

              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-5 items-center py-4 border-b border-gray-800 gap-2">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <div key={j} className="h-4 bg-gray-800 rounded animate-pulse" />
                    ))}
                  </div>
                ))
              ) : transactions.length === 0 ? (
                <div className="py-12 text-center text-gray-500 text-sm">No transactions yet.</div>
              ) : (
                transactions.map((tx, i) => {
                  const dep   = isDeposit(tx)
                  const label = dep ? 'DEPOSIT' : 'WITHDRAWAL'
                  const badgeCls = dep
                    ? 'bg-emerald-900/30 text-emerald-400'
                    : 'bg-red-900/30 text-red-400'
                  return (
                    <div key={tx.transactionId || i} className="grid grid-cols-5 items-center py-4 border-b border-gray-800 text-sm last:border-0">
                      <div className="text-gray-400 font-medium text-xs">{fmtDate(txDate(tx))}</div>
                      <div className="col-span-2 pr-2">
                        <p className="font-bold text-white text-xs">{dep ? 'Deposit via VNPay' : 'Withdrawal Request'}</p>
                        <p className="text-[10px] text-gray-500 uppercase mt-0.5">{tx.status || 'Pending'}</p>
                      </div>
                      <div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${badgeCls}`}>{label}</span>
                      </div>
                      <div className={`font-black text-sm ${dep ? 'text-white' : 'text-gray-400'}`}>
                        {dep ? '+' : '-'}{(tx.amount || 0).toLocaleString()}
                      </div>
                    </div>
                  )
                })
              )}

              {totalPages > 1 && (
                <div className="pt-4 flex items-center justify-between">
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
            </div>
          </div>
        </div>

        {/* Wallet Ledger — every balance-affecting event, not just deposits/withdrawals */}
        <section className="bg-[#1a1c23] rounded-xl border border-gray-800 overflow-hidden">
          <div className="p-4 flex justify-between items-center border-b border-gray-800">
            <h3 className="font-bold text-sm text-gray-200">Wallet Ledger</h3>
            <span className="text-[11px] text-gray-500 font-medium">{ledgerTotalCount} total</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-[#16181d] text-gray-500 font-bold uppercase text-[10px] tracking-wider border-b border-gray-800/50">
                <tr>
                  <th className="p-4">Type</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4 text-right">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {ledgerLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 4 }).map((_, j) => (
                      <td key={j} className="p-4"><div className="h-4 bg-gray-800 rounded animate-pulse w-20" /></td>
                    ))}</tr>
                  ))
                ) : ledger.length === 0 ? (
                  <tr><td colSpan={4} className="p-12 text-center text-gray-500">No wallet activity yet.</td></tr>
                ) : (
                  ledger.map((tx) => {
                    const positive = (tx.amount || 0) >= 0
                    return (
                      <tr key={tx.walletTransactionId} className="hover:bg-gray-800/30 transition-colors">
                        <td className="p-4 font-bold text-gray-200">{LEDGER_TYPE_LABEL[tx.type] || tx.type}</td>
                        <td className="p-4 text-gray-500">{fmtDate(tx.createdAt)}</td>
                        <td className={`p-4 text-right font-bold ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
                          {positive ? '+' : ''}{(tx.amount || 0).toLocaleString()} VND
                        </td>
                        <td className="p-4 text-right text-gray-400">{(tx.balanceAfter || 0).toLocaleString()} VND</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {ledgerTotalPages > 1 && (
            <div className="p-4 border-t border-gray-800 flex items-center justify-between">
              <span className="text-[11px] text-gray-500">Page {ledgerPage} / {ledgerTotalPages}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setLedgerPage(p => Math.max(1, p - 1))} disabled={ledgerPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-800 text-gray-400 hover:bg-gray-800 disabled:opacity-40 text-xs font-bold transition-colors">
                  Prev
                </button>
                <button onClick={() => setLedgerPage(p => Math.min(ledgerTotalPages, p + 1))} disabled={ledgerPage === ledgerTotalPages}
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
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Amount (VND)</label>
          <input type="number" min="1" placeholder="50000" value={amount} onChange={e => setAmount(e.target.value)} className={inputCls} />
          <div className="mb-4" />
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
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Amount (VND)</label>
          <input type="number" min="1" placeholder="100" value={amount} onChange={e => setAmount(e.target.value)} className={inputCls} />
          <div className="mb-4" />
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Bank Name</label>
          <input type="text" placeholder="Vietcombank" value={bankName} onChange={e => setBankName(e.target.value)} className={`${inputCls} mb-3`} />
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Account Number</label>
          <input type="text" placeholder="0123456789" value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value)} className={`${inputCls} mb-3`} />
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Account Holder Name</label>
          <input type="text" placeholder="NGUYEN VAN A" value={accountHolderName} onChange={e => setAccountHolderName(e.target.value)} className={`${inputCls} mb-4`} />
          {msg.type === 'error' && <p className="text-xs text-red-400 mb-3">{msg.text}</p>}
          <button onClick={handleWithdraw} disabled={actionLoading}
            className="w-full bg-[#1f1d28] border border-gray-700 text-gray-200 font-bold py-3 rounded-xl text-sm hover:bg-gray-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            <Wallet size={16} />
            {actionLoading ? 'Submitting…' : 'Submit Request'}
          </button>
        </Modal>
      )}
    </JockeyLayout>
  )
}
