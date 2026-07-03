import { useEffect, useState } from 'react'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import {
  getRegistrationFeeConfigs, getActiveRegistrationFeeConfig, createRegistrationFeeConfig, activateRegistrationFeeConfig,
  getPositionPrizeConfigs, getActivePositionPrizeConfig, createPositionPrizeConfig, activatePositionPrizeConfig,
  getJockeyRewardConfigs, getActiveJockeyRewardConfig, createJockeyRewardConfig, activateJockeyRewardConfig,
  getTakeoutConfigs, getActiveTakeoutConfig, createTakeoutConfig, activateTakeoutConfig,
} from '../../api/config'

const pct = (v) => v != null ? `${(v * 100).toFixed(1)}%` : '—'

const coin = (v) => v != null ? Number(v).toLocaleString() : '—'

const TABS = [
  {
    key: 'fee',
    label: 'Registration Fee',
    getActive:  getActiveRegistrationFeeConfig,
    getPaged:   getRegistrationFeeConfigs,
    createFn:   createRegistrationFeeConfig,
    activateFn: activateRegistrationFeeConfig,
    activeMetrics: (d) => [
      { label: 'Fee per Race (coins)', value: coin(d.feeAmount) },
    ],
    formDef: [
      { key: 'feeAmount', label: 'Fee Amount (coins)', raw: true, step: '1', placeholder: '1000' },
    ],
    tableHeaders: ['Fee Amount (coins)'],
    rowCells: (r) => [coin(r.feeAmount)],
  },
  {
    key: 'position',
    label: 'Position Prize',
    getActive:  getActivePositionPrizeConfig,
    getPaged:   getPositionPrizeConfigs,
    createFn:   createPositionPrizeConfig,
    activateFn: activatePositionPrizeConfig,
    activeMetrics: (d) => [
      { label: '1st', value: pct(d.pos1Ratio) },
      { label: '2nd', value: pct(d.pos2Ratio) },
      { label: '3rd', value: pct(d.pos3Ratio) },
      { label: '4th', value: pct(d.pos4Ratio) },
      { label: '5th', value: pct(d.pos5Ratio) },
      { label: '6th', value: pct(d.pos6Ratio) },
    ],
    formDef: [
      { key: 'pos1Ratio', label: '1st Place' },
      { key: 'pos2Ratio', label: '2nd Place' },
      { key: 'pos3Ratio', label: '3rd Place' },
      { key: 'pos4Ratio', label: '4th Place' },
      { key: 'pos5Ratio', label: '5th Place' },
      { key: 'pos6Ratio', label: '6th Place' },
    ],
    tableHeaders: ['1st', '2nd', '3rd', '4th', '5th', '6th'],
    rowCells: (r) => [pct(r.pos1Ratio), pct(r.pos2Ratio), pct(r.pos3Ratio), pct(r.pos4Ratio), pct(r.pos5Ratio), pct(r.pos6Ratio)],
    note: 'These ratios apply when all 6 positions finish a race. If a race has fewer horses, the ratios are automatically re-normalized to the actual number of finishers.',
  },
  {
    key: 'jockey',
    label: 'Jockey Reward',
    getActive:  getActiveJockeyRewardConfig,
    getPaged:   getJockeyRewardConfigs,
    createFn:   createJockeyRewardConfig,
    activateFn: activateJockeyRewardConfig,
    activeMetrics: (d) => [
      { label: 'Win Cut',   value: pct(d.winCut) },
      { label: 'Place Cut', value: pct(d.placeCut) },
    ],
    formDef: [
      { key: 'winCut',   label: 'Win Cut' },
      { key: 'placeCut', label: 'Place Cut' },
    ],
    tableHeaders: ['Win Cut', 'Place Cut'],
    rowCells: (r) => [pct(r.winCut), pct(r.placeCut)],
  },
  {
    key: 'takeout',
    label: 'Takeout',
    getActive:  getActiveTakeoutConfig,
    getPaged:   getTakeoutConfigs,
    createFn:   createTakeoutConfig,
    activateFn: activateTakeoutConfig,
    activeMetrics: (d) => [
      { label: 'Takeout', value: pct(d.takeoutPercentage) },
    ],
    formDef: [
      { key: 'takeoutPercentage', label: 'Takeout' },
    ],
    tableHeaders: ['Takeout'],
    rowCells: (r) => [pct(r.takeoutPercentage)],
  },
]

function StatusBadge({ status }) {
  return status === 'Active'
    ? <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full border border-emerald-100">Active</span>
    : <span className="px-2.5 py-1 bg-gray-100 text-gray-400 text-[10px] font-bold rounded-full border border-gray-200/60">Inactive</span>
}

const PAGE_SIZE = 4

function ConfigTab({ getActive, getPaged, createFn, activateFn, activeMetrics, formDef, tableHeaders, rowCells, note }) {
  const [active,    setActive]    = useState(null)
  const [rows,      setRows]      = useState([])
  const [page,      setPage]      = useState(1)
  const [totalPages,setTotal]     = useState(1)
  const [totalCount,setCount]     = useState(0)
  const [loading,   setLoading]   = useState(true)
  const [activating,setActivating]= useState(null)
  const [modal,     setModal]     = useState(false)
  const [form,      setForm]      = useState(() => Object.fromEntries(formDef.map(f => [f.key, ''])))
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  const loadActive = () =>
    getActive().then(r => setActive(r.data.data || null)).catch(() => {})

  const loadTable = (p) => {
    setLoading(true)
    getPaged({ page: p, pageSize: PAGE_SIZE })
      .then(r => {
        const d = r.data.data
        setRows(d?.items || [])
        setTotal(d?.totalPages || Math.ceil((d?.totalCount || 0) / PAGE_SIZE) || 1)
        setCount(d?.totalCount || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const reload = (p = page) => { loadActive(); loadTable(p) }

  useEffect(() => { reload(1) }, [])

  const goPage = (p) => { setPage(p); loadTable(p) }

  const handleActivate = async (id) => {
    setActivating(id)
    try { await activateFn(id); reload() } catch {}
    setActivating(null)
  }

  const handleCreate = async () => {
    setError(''); setSaving(true)
    try {
      const payload = Object.fromEntries(
        formDef.map(f => {
          const v = parseFloat(form[f.key])
          return [f.key, f.inverted ? 1 / v : f.raw ? v : v / 100]
        })
      )
      await createFn(payload)
      setModal(false)
      setForm(Object.fromEntries(formDef.map(f => [f.key, ''])))
      reload(page)
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create.')
    } finally { setSaving(false) }
  }

  const metrics = active ? activeMetrics(active) : []
  const colSpan  = tableHeaders.length + 3

  return (
    <div className="space-y-5">

      {/* Active config card */}
      <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-500" />
        <div className="pl-6 pr-5 py-4 flex items-center justify-between border-b border-gray-50">
          <div>
            <h4 className="text-sm font-bold text-gray-900">Active Configuration</h4>
            <p className="text-xs text-gray-400 mt-0.5">Currently applied to all scheduled races.</p>
          </div>
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[11px] font-bold rounded-full border border-emerald-100">
            Active
          </span>
        </div>
        {active ? (
          <div
            className="grid divide-x divide-gray-100 bg-gray-50/30"
            style={{ gridTemplateColumns: `repeat(${metrics.length}, minmax(0, 1fr))` }}
          >
            {metrics.map((m, i) => (
              <div key={i} className="p-5">
                <p className="text-2xl font-extrabold text-gray-900 tracking-tight">{m.value}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">{m.label}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-8">No active configuration.</p>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">History & Versions</h3>
        <button
          onClick={() => { setModal(true); setError('') }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-950 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors"
        >
          <Plus size={13} strokeWidth={3} />
          Create New
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                {[...tableHeaders, 'Status', 'Created At', 'Action'].map(h => (
                  <th key={h} className="py-3.5 px-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="py-12 text-center">
                    <span className="material-symbols-outlined animate-spin text-2xl text-gray-300">progress_activity</span>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="py-12 text-center text-sm font-semibold text-gray-400">No records found.</td>
                </tr>
              ) : rows.map((row, i) => (
                <tr key={row.id ?? i} className="hover:bg-gray-50/40 transition-colors">
                  {rowCells(row).map((cell, j) => (
                    <td key={j} className="py-4 px-5 font-extrabold text-gray-900">{cell}</td>
                  ))}
                  <td className="py-4 px-5"><StatusBadge status={row.status} /></td>
                  <td className="py-4 px-5 text-xs text-gray-400 font-medium">
                    {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-4 px-5">
                    {row.status === 'Active' ? (
                      <span className="text-xs text-gray-300 font-semibold">—</span>
                    ) : (
                      <button
                        onClick={() => handleActivate(row.id)}
                        disabled={activating === row.id}
                        className="px-3 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        {activating === row.id ? '…' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="px-5 py-3.5 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-400">
          <span>
            Page <span className="text-gray-700">{page}</span> of <span className="text-gray-700">{totalPages}</span>
            <span className="ml-2 font-normal text-gray-300">({totalCount} total)</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => goPage(page - 1)} disabled={page === 1}
              className="p-1 border border-gray-200 rounded-lg bg-white text-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={() => goPage(page + 1)} disabled={page === totalPages}
              className="p-1 border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </footer>
      </div>

      {note && (
        <p className="text-xs text-gray-400 leading-relaxed">{note}</p>
      )}

      {/* Create modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h3 className="text-base font-bold text-gray-900">Create New Config</h3>
            <div className={`grid gap-3 ${formDef.length >= 4 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {formDef.map(f => (
                <div key={f.key}>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    {f.label}{f.raw || f.inverted ? '' : ' (%)'}
                  </label>
                  <div className="relative">
                    <input
                      type="number" min="0"
                      step={f.step || (f.raw || f.inverted ? '1' : '0.1')}
                      max={f.raw || f.inverted ? undefined : '100'}
                      value={form[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder || (f.inverted ? '1000' : f.raw ? '1000' : '0.0')}
                      className={`w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:border-gray-400 focus:ring-1 focus:ring-gray-400 outline-none ${f.raw || f.inverted ? '' : 'pr-8'}`}
                    />
                    {!f.raw && !f.inverted && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">%</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setModal(false)}
                className="flex-1 h-11 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate} disabled={saving}
                className="flex-1 h-11 bg-gray-950 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-60"
              >
                {saving ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ConfigManagement() {
  const [tab, setTab] = useState('fee')
  const current = TABS.find(t => t.key === tab)

  return (
    <DashboardLayout title="System Configuration">
      <div className="space-y-6">

        {/* Heading */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuration</h1>
          <p className="text-sm text-gray-500 mt-1">Manage platform config rules and economic parameters.</p>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-6 border-b border-gray-200">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 text-sm font-semibold relative transition-colors ${
                tab === t.key ? 'text-gray-900 font-bold' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {t.label}
              {tab === t.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab content — key forces remount on tab switch */}
        <ConfigTab
          key={tab}
          getActive={current.getActive}
          getPaged={current.getPaged}
          createFn={current.createFn}
          activateFn={current.activateFn}
          activeMetrics={current.activeMetrics}
          formDef={current.formDef}
          tableHeaders={current.tableHeaders}
          rowCells={current.rowCells}
          note={current.note}
        />

      </div>
    </DashboardLayout>
  )
}
