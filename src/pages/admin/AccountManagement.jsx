import { useEffect, useState, useCallback } from 'react'
import { Users, CheckCircle2, AlertTriangle, Ban, Search, ChevronLeft, ChevronRight, X, FileText } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import { getAccountsPaged, suspendAccount, banAccount, restoreAccount, getUpgradeRequests, getUpgradeDetail, approveUpgrade, rejectUpgrade } from '../../api/accounts'
import { useRaceHub } from '../../hooks/useRaceHub'
const ROLE_COLOR = {
  Admin:      'bg-red-50 text-red-600 border-red-200',
  HorseOwner: 'bg-blue-50 text-blue-600 border-blue-200',
  Jockey:     'bg-emerald-50 text-emerald-600 border-emerald-200',
  Referee:    'bg-violet-50 text-violet-600 border-violet-200',
  Spectator:  'bg-gray-100 text-gray-500 border-gray-200',
}

function initials(email = '') {
  return email.split('@')[0].slice(0, 2).toUpperCase()
}

function Highlight({ text, query }) {
  const str = String(text ?? '')
  if (!query) return <>{str}</>
  const idx = str.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{str}</>
  return (
    <>
      {str.slice(0, idx)}
      <span className="text-[#facc15] font-bold">{str.slice(idx, idx + query.length)}</span>
      {str.slice(idx + query.length)}
    </>
  )
}

function StatusCell({ status }) {
  if (status === 'Active') return (
    <span className="flex items-center text-xs font-semibold text-gray-700">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2" />Active
    </span>
  )
  if (status === 'Suspended') return (
    <span className="flex items-center text-xs font-semibold text-gray-700">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-2" />Suspended
    </span>
  )
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-wide border border-rose-300 text-rose-500 bg-rose-50 uppercase ring-1 ring-inset ring-rose-500/20">
      Banned
    </span>
  )
}

function DetailModal({ acc, onClose, onApprove, onReject, acting }) {
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(true)

  const accId = acc.accountId || acc.id || acc.id
  useEffect(() => {
    setLoadingDetail(true)
    getUpgradeDetail(accId)
      .then(r => setDetail(r.data?.data || r.data || {}))
      .catch(() => setDetail({}))
      .finally(() => setLoadingDetail(false))
  }, [accId])

  const d = detail || {}
  const fields = [
    { label: 'Full Name',       value: d.fullName },
    { label: 'Phone',           value: d.phone },
    { label: 'Date of Birth',   value: d.dateOfBirth ? new Date(d.dateOfBirth).toLocaleDateString() : null },
    { label: 'Nationality',     value: d.nationality },
    { label: 'License Number',  value: d.licenseNumber },
    { label: 'Weight',          value: d.weight != null ? `${d.weight} kg` : null },
    { label: 'Height',          value: d.height != null ? `${d.height} cm` : null },
  ].filter(f => f.value)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">Upgrade Request</h3>
            <p className="text-xs text-gray-400 mt-0.5">{acc.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Role change */}
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
            <span className={`font-bold text-xs px-2.5 py-1 rounded-lg border ${ROLE_COLOR[acc.currentRole] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>{acc.currentRole}</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            <span className="font-extrabold text-xs px-2.5 py-1 rounded-lg border bg-blue-50 text-blue-600 border-blue-200">{acc.requestedRole}</span>
            {acc.requestedAt && <span className="text-[11px] text-gray-400 ml-auto">{new Date(acc.requestedAt).toLocaleString()}</span>}
          </div>

          {loadingDetail ? (
            <div className="flex items-center justify-center py-8">
              <span className="material-symbols-outlined animate-spin text-2xl text-gray-300">progress_activity</span>
            </div>
          ) : (
            <>
              {/* Info fields */}
              {fields.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {fields.map(f => (
                    <div key={f.label} className="bg-gray-50 rounded-xl px-4 py-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{f.label}</p>
                      <p className="text-sm font-semibold text-gray-800">{f.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Certificate image */}
              {d.certificateImageUrl || d.certificateUrl || d.imageUrl ? (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Certificate</p>
                  <a href={d.certificateImageUrl || d.certificateUrl || d.imageUrl} target="_blank" rel="noreferrer">
                    <img src={d.certificateImageUrl || d.certificateUrl || d.imageUrl} alt="Certificate" className="w-full max-h-56 object-contain rounded-xl border border-gray-200 bg-gray-50 hover:opacity-90 transition-opacity cursor-pointer" />
                  </a>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-xl px-4 py-3">
                  <FileText size={14} /><span>No certificate uploaded</span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onReject}
            disabled={acting}
            className="flex-1 py-2.5 border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
          >
            Reject
          </button>
          <button
            onClick={onApprove}
            disabled={acting}
            className="flex-1 py-2.5 bg-gray-950 text-white hover:bg-gray-800 text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
          >
            {acting ? 'Processing…' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  )
}

function UpgradeRequests({ onCountChange }) {
  const [list, setList]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [acting, setActing]       = useState(null)
  const [selected, setSelected]   = useState(null)
  const [page, setPage]           = useState(1)
  const [totalPages, setTotal]    = useState(1)
  const [totalCount, setCount]    = useState(0)
  const pageSize = 4

  const load = (p = page) => {
    setLoading(true)
    getUpgradeRequests({ page: p, pageSize })
      .then(r => {
        const data = r.data.data
        const items = data?.items || data || []
        const tc = data?.totalCount ?? items.length
        const tp = (data?.totalPages ?? Math.ceil(tc / pageSize)) || 1
        setList(items)
        setTotal(tp)
        setCount(tc)
        onCountChange(tc)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(page) }, [page])

  const handle = async (accountId, fn) => {
    setActing(accountId)
    try { await fn(accountId) } catch {}
    setActing(null)
    setSelected(null)
    load(page)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <span className="material-symbols-outlined animate-spin text-3xl text-gray-300">progress_activity</span>
    </div>
  )

  if (list.length === 0) return (
    <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm text-sm font-semibold text-gray-400">
      No pending upgrade requests.
    </div>
  )

  return (
    <>
      <div className="space-y-4">
        {list.map(acc => (
          <div key={acc.accountId || acc.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-full bg-gray-800 text-white flex items-center justify-center shrink-0 font-bold text-sm">
                {initials(acc.email)}
              </div>
              <div className="space-y-1.5">
                <p className="font-bold text-sm text-gray-900">{acc.email}</p>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`font-bold px-2.5 py-1 rounded-lg border ${ROLE_COLOR[acc.currentRole] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                    {acc.currentRole}
                  </span>
                  <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  <span className="bg-blue-50 text-blue-600 border border-blue-200 font-extrabold px-2.5 py-1 rounded-lg">
                    {acc.requestedRole}
                  </span>
                </div>
                {acc.requestedAt && (
                  <p className="text-[11px] text-gray-400 font-medium">
                    Requested: {new Date(acc.requestedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 self-end md:self-auto">
              <button
                onClick={() => setSelected(acc)}
                className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-bold rounded-xl transition-colors"
              >
                View Details
              </button>
              <button
                onClick={() => handle(acc.accountId || acc.id, rejectUpgrade)}
                disabled={acting === acc.accountId || acc.id}
                className="px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={() => handle(acc.accountId || acc.id, approveUpgrade)}
                disabled={acting === acc.accountId || acc.id}
                className="px-5 py-2 bg-gray-950 text-white hover:bg-gray-800 text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {acting === acc.accountId || acc.id ? 'Processing…' : 'Approve'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <footer className="flex items-center justify-between text-xs font-medium text-gray-500 pt-2">
          <span>
            Page <span className="text-gray-900 font-bold">{page}</span> of{' '}
            <span className="text-gray-900 font-bold">{totalPages}</span>
            <span className="ml-2 text-gray-400">({totalCount} total)</span>
          </span>
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
      )}

      {selected && (
        <DetailModal
          acc={selected}
          acting={acting === selected.accountId}
          onClose={() => setSelected(null)}
          onApprove={() => handle(selected.accountId, approveUpgrade)}
          onReject={() => handle(selected.accountId, rejectUpgrade)}
        />
      )}
    </>
  )
}

export default function AccountManagement() {
  const [tab, setTab]             = useState('accounts')
  const [accounts, setAccounts]   = useState([])
  const [page, setPage]           = useState(1)
  const [pageSize, setPageSize]   = useState(4)
  const [totalPages, setTotal]    = useState(1)
  const [totalCount, setCount]    = useState(0)
  const [loading, setLoading]     = useState(true)
  const [acting, setActing]       = useState(null)
  const [search, setSearch]       = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [pendingCount, setPendingCount] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')

  const [countActive, setCountActive]       = useState(0)
  const [countSuspended, setCountSuspended] = useState(0)
  const [countBanned, setCountBanned]       = useState(0)

  const loadAccounts = (p = page, q = search, s = statusFilter) => {
    setLoading(true)
    getAccountsPaged({ page: p, pageSize, ...(q && { search: q }), ...(s && { status: s }) })
      .then(r => {
        setAccounts(r.data.data?.items || [])
        setTotal(r.data.data?.totalPages || 1)
        setCount(r.data.data?.totalCount || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const loadCounts = () => {
    getAccountsPaged({ page: 1, pageSize: 1, status: 'Active' })
      .then(r => setCountActive(r.data.data?.totalCount || 0)).catch(() => {})
    getAccountsPaged({ page: 1, pageSize: 1, status: 'Suspended' })
      .then(r => setCountSuspended(r.data.data?.totalCount || 0)).catch(() => {})
    getAccountsPaged({ page: 1, pageSize: 1, status: 'Banned' })
      .then(r => setCountBanned(r.data.data?.totalCount || 0)).catch(() => {})
  }

  useEffect(() => { loadCounts() }, [])
  useEffect(() => { if (tab === 'accounts') loadAccounts(page, search, statusFilter) }, [tab, page, search, statusFilter])

  const handleUpgradeUpdated = useCallback((data) => {
    if (data?.pendingCount != null) setPendingCount(data.pendingCount)
  }, [])

  useRaceHub(null, { onUpgradeRequestsUpdated: handleUpgradeUpdated })

  const handleAction = async (id, fn) => {
    setActing(id)
    try {
      await fn(id)
      if (statusFilter === '') {
        const nextStatus =
          fn === suspendAccount ? 'Suspended' :
          fn === banAccount     ? 'Banned'    : 'Active'
        setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: nextStatus } : a))
      } else {
        loadAccounts(page, search, statusFilter)
      }
      loadCounts()
    } catch {}
    setActing(null)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  return (
    <DashboardLayout title="Account Management">
      <div className="space-y-6">

        {/* Heading */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage user accounts and role upgrade requests.</p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-gray-200">
          {[['accounts', 'All Accounts'], ['upgrades', 'Upgrade Requests']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => { setTab(id); setPage(1) }}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 relative transition-colors ${
                tab === id ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
              {id === 'upgrades' && pendingCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {pendingCount}
                </span>
              )}
              {tab === id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-full" />}
            </button>
          ))}
        </div>

        {tab === 'upgrades' ? (
          <UpgradeRequests onCountChange={setPendingCount} />
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total</p>
                  <p className="text-3xl font-extrabold text-gray-900 mt-2">{totalCount}</p>
                </div>
                <div className="p-2.5 bg-gray-100 rounded-xl text-gray-600"><Users size={20} /></div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Active</p>
                  <p className="text-3xl font-extrabold text-gray-900 mt-2">{countActive}</p>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600"><CheckCircle2 size={20} /></div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Suspended</p>
                  <p className="text-3xl font-extrabold text-gray-900 mt-2">{countSuspended}</p>
                </div>
                <div className="p-2.5 bg-amber-50 rounded-xl text-amber-500"><AlertTriangle size={20} /></div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Banned</p>
                  <p className="text-3xl font-extrabold text-gray-900 mt-2">{countBanned}</p>
                </div>
                <div className="p-2.5 bg-rose-50 rounded-xl text-rose-500"><Ban size={20} /></div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Table header bar */}
              <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-gray-900">All Accounts</h2>
                  <div className="flex items-center gap-1">
                    {[['', 'All'], ['Active', 'Active'], ['Suspended', 'Suspended'], ['Banned', 'Banned']].map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => { setStatusFilter(val); setPage(1) }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                          statusFilter === val
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <form onSubmit={handleSearch} className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by email..."
                      value={searchInput}
                      onChange={e => setSearchInput(e.target.value)}
                      className="pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 w-52"
                    />
                  </div>
                  <select
                    value={pageSize}
                    onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 font-medium focus:outline-none focus:border-gray-400"
                  >
                    {[5, 10, 20].map(n => <option key={n} value={n}>{n} / page</option>)}
                  </select>
                </form>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <span className="material-symbols-outlined animate-spin text-3xl text-gray-300">progress_activity</span>
                </div>
              ) : accounts.length === 0 ? (
                <div className="text-center py-16 text-sm font-semibold text-gray-400">No accounts found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                        {['User', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                          <th key={h} className="py-3 px-6">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {accounts.map(acc => (
                        <tr key={acc.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gray-800 text-white font-bold text-xs flex items-center justify-center shrink-0 tracking-wider">
                                {initials(acc.email)}
                              </div>
                              <span className="font-medium text-gray-900 text-sm"><Highlight text={acc.email} query={search} /></span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`text-[10px] font-extrabold tracking-wide px-2.5 py-1 rounded-lg border ${ROLE_COLOR[acc.role] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                              {acc.role?.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <StatusCell status={acc.status} />
                          </td>
                          <td className="py-4 px-6 text-xs text-gray-400 font-medium">
                            {acc.createAt ? new Date(acc.createAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              {acc.status === 'Active' ? (
                                <>
                                  <button
                                    onClick={() => handleAction(acc.id, suspendAccount)}
                                    disabled={acting === acc.id}
                                    className="px-3 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
                                  >
                                    Suspend
                                  </button>
                                  <button
                                    onClick={() => handleAction(acc.id, banAccount)}
                                    disabled={acting === acc.id}
                                    className="px-3 py-1.5 border border-rose-200 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-50 transition-colors disabled:opacity-50"
                                  >
                                    Ban
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleAction(acc.id, restoreAccount)}
                                  disabled={acting === acc.id}
                                  className="px-3 py-1.5 bg-gray-950 text-white rounded-lg text-xs font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
                                >
                                  {acting === acc.id ? '…' : 'Restore'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              <footer className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between text-xs font-medium text-gray-500">
                <div>
                  Page <span className="text-gray-900 font-bold">{page}</span> of{' '}
                  <span className="text-gray-900 font-bold">{totalPages}</span>
                  <span className="ml-2 text-gray-400">({totalCount} total)</span>
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
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
