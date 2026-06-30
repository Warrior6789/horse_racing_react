import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { FileText, Camera, CloudUpload, Save, ChevronRight, ChevronDown, X } from 'lucide-react'
import OwnerLayout from '../../components/OwnerLayout'
import { getHorse, createHorse, updateHorse } from '../../api/horses'
import { useAuth } from '../../context/AuthContext'

const STATUSES  = ['Healthy', 'Injury', 'Resting', 'Retired']
const BREEDS    = ['Thoroughbred', 'Arabian', 'Quarter Horse', 'Standardbred', 'Appaloosa', 'Other']
const blank     = { horseName: '', age: '', breed: 'Thoroughbred', weight: '', color: '', status: 'Healthy' }

const inputCls  = 'w-full bg-[#0b0f19] border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#facc15]/50 focus:ring-1 focus:ring-[#facc15]/50 transition-all placeholder-gray-600 font-medium'
const selectCls = `${inputCls} appearance-none`

function FormGroup({ label, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-sm font-bold text-gray-300">{label}</label>
      {children}
    </div>
  )
}

export default function HorseForm() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const isEdit     = Boolean(id)
  const { user }   = useAuth()

  const [form, setForm]             = useState(blank)
  const [image, setImage]           = useState(null)
  const [preview, setPreview]       = useState(null)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const [dragging, setDragging]     = useState(false)
  const fileRef                     = useRef()

  const mapStatus = (s) => {
    const m = { Active: 'Healthy', Inactive: 'Resting', Injured: 'Injury' }
    return m[s] || (STATUSES.includes(s) ? s : 'Healthy')
  }

  useEffect(() => {
    if (!isEdit) return
    getHorse(id)
      .then(r => {
        const h = r.data.data || r.data
        setForm({
          horseName: h.horseName || '',
          age:       h.age       ?? '',
          breed:     h.breed     || 'Thoroughbred',
          weight:    h.weight    ?? '',
          color:     h.color     || '',
          status:    mapStatus(h.status),
        })
        if (h.imageUrl) setPreview(h.imageUrl)
      })
      .catch(() => {})
  }, [id, isEdit])

  const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })

  const handleFile = (file) => {
    if (!file) return
    setImage(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const save = async () => {
    if (!form.horseName.trim()) { setError('Horse name is required.'); return }
    setError(''); setSaving(true)
    try {
      const payload = {}
      Object.entries(form).forEach(([k, v]) => { if (v !== '') payload[k] = v })

      if (isEdit) {
        const fd = new FormData()
        Object.entries(payload).forEach(([k, v]) => fd.append(k, v))
        if (image) fd.append('image', image)
        await updateHorse(id, fd)
      } else {
        const ownerId = user?.accountId ?? user?.id
        if (ownerId) payload.ownerId = ownerId
        const fd = new FormData()
        Object.entries(payload).forEach(([k, v]) => fd.append(k, v))
        if (image) fd.append('image', image)
        await createHorse(fd)
      }
      navigate('/owner/horses')
    } catch (e) {
      setError(e.response?.data?.message || 'Save failed.')
    } finally { setSaving(false) }
  }

  return (
    <OwnerLayout>
      <div className="p-6 md:p-8 max-w-6xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center text-sm font-bold mb-4">
          <Link to="/owner/horses" className="text-gray-400 hover:text-gray-300 transition-colors">My Horses</Link>
          <ChevronRight size={14} className="mx-2 text-gray-600" />
          <span className="text-[#facc15]">{isEdit ? 'Edit Horse' : 'Add New Horse'}</span>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            {isEdit ? `Edit ${form.horseName || 'Horse'}` : 'Register New Horse'}
          </h1>
          <p className="text-gray-400 text-sm font-medium">Enter detailed biological and performance data for the racing registry.</p>
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

          {/* Left — Fields + Actions */}
          <div className="flex flex-col gap-6">
            <div className="bg-[#151a28] rounded-2xl p-6 border border-gray-800/80 flex-1">
              <div className="flex items-center gap-2 mb-6">
                <FileText className="text-[#facc15]" size={20} />
                <h2 className="text-lg font-bold text-[#e8e4dc]">Primary Details</h2>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <FormGroup label="Horse Name *" className="col-span-2">
                  <input type="text" placeholder="e.g. Midnight Thunder" className={inputCls} {...f('horseName')} />
                </FormGroup>
                <FormGroup label="Age (Years)">
                  <input type="number" min="0" placeholder="3" className={inputCls} {...f('age')} />
                </FormGroup>
                <FormGroup label="Breed">
                  <div className="relative">
                    <select className={selectCls} {...f('breed')}>
                      {BREEDS.map(b => <option key={b}>{b}</option>)}
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </FormGroup>
                <FormGroup label="Weight (kg)">
                  <input type="number" min="0" step="0.1" placeholder="500" className={inputCls} {...f('weight')} />
                </FormGroup>
                <FormGroup label="Color">
                  <input type="text" placeholder="Bay / Chestnut" className={inputCls} {...f('color')} />
                </FormGroup>
                {isEdit && (
                  <FormGroup label="Status" className="col-span-2">
                    <div className="relative">
                      <select className={selectCls} {...f('status')}>
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </FormGroup>
                )}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                <X size={14} /> {error}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={save}
                disabled={saving}
                className="w-full bg-[#facc15] hover:bg-yellow-400 text-black py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              >
                <Save size={18} />
                {saving ? 'Saving…' : (isEdit ? 'Update Horse' : 'Save Horse')}
              </button>
              <button
                onClick={() => navigate('/owner/horses')}
                className="w-full bg-transparent hover:bg-gray-800/50 text-gray-300 border border-gray-700 py-3.5 rounded-xl font-bold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Right — Image */}
          <div className="bg-[#151a28] rounded-2xl p-6 border border-gray-800/80 flex flex-col">
            <div className="flex items-center gap-2 mb-6">
              <Camera className="text-[#e8e4dc]" size={20} />
              <h2 className="text-lg font-bold text-[#e8e4dc]">Horse Photography</h2>
            </div>

            {preview ? (
              <div className="relative flex-1 min-h-[320px] rounded-xl overflow-hidden border border-gray-700">
                <img src={preview} alt="preview" className="w-full h-full object-cover block" />
                <button
                  onClick={() => { setImage(null); setPreview(null) }}
                  className="absolute top-3 right-3 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`flex-1 min-h-[320px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-colors
                  ${dragging ? 'border-[#facc15]/60 bg-[#facc15]/5' : 'border-gray-700/80 bg-[#0b0f19]/50 hover:border-gray-500 hover:bg-[#0b0f19]'}`}
              >
                <div className="w-16 h-16 bg-[#1a1c23] rounded-full flex items-center justify-center mb-4">
                  <CloudUpload size={28} className="text-gray-300" />
                </div>
                <h3 className="text-white font-bold text-sm mb-1">Drag & Drop Image</h3>
                <p className="text-gray-500 text-[10px] font-bold mb-6">Support: JPG, PNG (Max 10MB)</p>
                <span className="px-6 py-2 border border-gray-600 text-gray-300 rounded-full text-sm font-bold hover:bg-gray-800 hover:text-white transition-colors">
                  Browse Files
                </span>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
          </div>
        </div>
      </div>
    </OwnerLayout>
  )
}
