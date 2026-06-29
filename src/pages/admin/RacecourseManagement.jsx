import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import CardCarousel from '../../components/CardCarousel'
import { getRacecoursesPaged, createRacecourse, updateRacecourse, uploadRacecourseImage, deleteRacecourse } from '../../api/racecourses'

const blank = { racecourseName: '', location: '', trackType: '' }

const TRACK_BADGE = {
  Turf: 'bg-emerald-50 text-emerald-700 ring-emerald-500/20',
  Dirt: 'bg-amber-50 text-amber-700 ring-amber-500/20',
  Sand: 'bg-orange-50 text-orange-700 ring-orange-500/20',
}

const rcId = (item) => item.RacecourseId || item.racecourseId || item.id

/* ─── Main ──────────────────────────────────────────────────────── */
export default function RacecourseManagement() {
  const [allCards, setAllCards]   = useState([])
  const [cLoading, setCLoading]   = useState(true)
  const [rows, setRows]           = useState([])
  const [page, setPage]           = useState(1)
  const pageSize = 4
  const [totalPages, setTotal]    = useState(1)
  const [totalCount, setCount]    = useState(0)
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [form, setForm]           = useState(blank)
  const [editId, setEditId]       = useState(null)
  const [error, setError]         = useState('')
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

  const loadCards = () => {
    setCLoading(true)
    getRacecoursesPaged({ page: 1, pageSize: 99 })
      .then(r => setAllCards(r.data.data?.items || []))
      .catch(() => {})
      .finally(() => setCLoading(false))
  }

  const load = (p = page, ps = pageSize) => {
    setLoading(true)
    getRacecoursesPaged({ page: p, pageSize: ps })
      .then(r => {
        const d = r.data.data
        setRows(d?.items || [])
        setTotal(d?.totalPages || 1)
        setCount(d?.totalCount || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadCards(); load(1, pageSize) }, [])
  useEffect(() => { load(page, pageSize) }, [page, pageSize])

  const openCreate = () => {
    setForm(blank); setEditId(null); setError('')
    setImageFile(null); setImagePreview(null); setModal(true)
  }
  const openEdit = (item) => {
    setForm({
      racecourseName: item.racecourseName || item.RacecourseName || '',
      location:  item.location  || item.Location  || '',
      trackType: item.trackType || item.TrackType  || '',
    })
    setImageFile(null); setImagePreview(item.imageUrl || item.ImageUrl || null)
    setEditId(rcId(item)); setError(''); setModal(true)
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const save = async () => {
    if (!form.racecourseName.trim()) { setError('Racecourse name is required.'); return }
    if (!form.trackType) { setError('Track type is required.'); return }
    setError(''); setSaving(true)
    try {
      if (editId) {
        await updateRacecourse(editId, form)
        if (imageFile) await uploadRacecourseImage(editId, imageFile)
      } else {
        const fd = new FormData()
        fd.append('RacecourseName', form.racecourseName)
        if (form.location)  fd.append('Location', form.location)
        if (form.trackType) fd.append('TrackType', form.trackType)
        if (imageFile)      fd.append('Image', imageFile)
        await createRacecourse(fd)
      }
      setModal(false); loadCards(); load(page, pageSize)
    } catch (e) { setError(e.response?.data?.message || 'Save failed.') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this racecourse?')) return
    setDeleting(id)
    try { await deleteRacecourse(id); loadCards(); load(page, pageSize) } catch {}
    setDeleting(null)
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 outline-none text-sm bg-white'
  const f = (k) => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })

  return (
    <DashboardLayout title="Racecourse Management">
      <div className="space-y-8">

        {/* Heading */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Racecourse Management</h1>
            <p className="text-sm text-gray-500 mt-1">Manage race venues and track information.</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-950 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
            Add Racecourse
          </button>
        </div>

        {/* Cards Carousel */}
        {cLoading ? (
          <div className="flex items-center justify-center h-36">
            <span className="material-symbols-outlined animate-spin text-3xl text-gray-300">progress_activity</span>
          </div>
        ) : allCards.length > 0 && (
          <CardCarousel count={allCards.length} dark={false}>
            {allCards.map(item => (
              <div key={rcId(item)} className="snap-start shrink-0 w-[calc(33.333%-11px)] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <div className="w-full aspect-[4/3] overflow-hidden shrink-0">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.racecourseName} className="w-full h-full object-cover block" />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <span className="material-symbols-outlined text-gray-300" style={{ fontSize: '40px' }}>stadium</span>
                    </div>
                  )}
                </div>
                <div className="p-5 flex flex-col gap-3 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm truncate">{item.racecourseName}</h3>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{item.location || 'No location'}</p>
                    </div>
                    {item.trackType && (
                      <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset ${TRACK_BADGE[item.trackType] || 'bg-gray-100 text-gray-500 ring-gray-400/20'}`}>
                        {item.trackType}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1 border-t border-gray-100">
                    <button
                      onClick={() => openEdit(item)}
                      className="flex-1 py-1.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(rcId(item))}
                      disabled={deleting === rcId(item)}
                      className="w-8 h-8 flex items-center justify-center border border-red-100 text-red-500 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </CardCarousel>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-gray-950 rounded-full" />
              <h2 className="text-sm font-bold text-gray-900">All Racecourses</h2>
              <span className="ml-1 text-xs text-gray-400 font-medium">({totalCount} total)</span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <span className="material-symbols-outlined animate-spin text-3xl text-gray-300">progress_activity</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16 text-sm font-semibold text-gray-400">No racecourses found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    {['Name', 'Location', 'Track Type', 'Actions'].map(h => (
                      <th key={h} className="py-4 px-6">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {rows.map(item => (
                    <tr key={rcId(item)} className="hover:bg-gray-50/40 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-950 text-white flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>stadium</span>
                          </div>
                          <span className="font-semibold text-gray-900">{item.racecourseName}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-gray-500 text-xs">{item.location || '—'}</td>
                      <td className="py-4 px-6">
                        {item.trackType ? (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset ${TRACK_BADGE[item.trackType] || 'bg-gray-100 text-gray-500 ring-gray-400/20'}`}>
                            {item.trackType}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(item)}
                            className="px-3 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(rcId(item))}
                            disabled={deleting === rcId(item)}
                            className="px-3 py-1.5 border border-red-100 text-red-500 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            {deleting === rcId(item) ? '…' : 'Delete'}
                          </button>
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
              Showing page <span className="text-gray-900 font-bold">{page}</span> of{' '}
              <span className="text-gray-900 font-bold">{totalPages}</span>
              <span className="ml-2 text-gray-400">({totalCount} total)</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:bg-white transition-colors disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce((acc, p, i, arr) => {
                  if (i > 0 && p - arr[i - 1] > 1) acc.push('…')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) =>
                  p === '…' ? (
                    <span key={`el-${i}`} className="px-1 text-gray-400">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                        p === page ? 'bg-gray-950 text-white' : 'border border-gray-200 text-gray-600 hover:bg-white'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-white transition-colors disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </footer>
        </div>

      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h3 className="text-base font-bold text-gray-900">{editId ? 'Edit Racecourse' : 'Add Racecourse'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Name *</label>
                <input type="text" className={inputCls} {...f('racecourseName')} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Location</label>
                <input type="text" className={inputCls} {...f('location')} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Track Type *</label>
                <select className={inputCls} {...f('trackType')}>
                  <option value="">— Select —</option>
                  <option value="Turf">Turf</option>
                  <option value="Dirt">Dirt</option>
                  <option value="Sand">Sand</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Image</label>
                {imagePreview && (
                  <img src={imagePreview} alt="preview" className="w-full h-32 object-cover block rounded-xl mb-2 border border-gray-100" />
                )}
                <label className="flex items-center gap-2 cursor-pointer w-full px-3 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-xs font-medium text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>upload</span>
                  {imageFile ? imageFile.name : 'Click to upload image'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              </div>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setModal(false)} className="flex-1 h-11 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 h-11 bg-gray-950 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-60">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
