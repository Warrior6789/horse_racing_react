import { useEffect, useRef, useState } from 'react'
import { Camera, Save, X } from 'lucide-react'
import JockeyLayout from '../../components/JockeyLayout'
import { getMyJockeyProfile, updateJockeyProfile, updateJockeyImage } from '../../api/jockeyProfiles'
import { useAuth } from '../../context/AuthContext'

const inputCls = 'w-full bg-[#0b0f19] border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#facc15]/50 focus:ring-1 focus:ring-[#facc15]/50 transition-all placeholder-gray-600 font-medium'

function Field({ label, value }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-gray-800/70 last:border-0">
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</span>
      <span className="text-sm font-medium text-gray-200">{value || '—'}</span>
    </div>
  )
}

export default function JockeyProfile() {
  const { user }    = useAuth()
  const imgRef      = useRef()
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form,    setForm]    = useState({})
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const load = () => {
    setLoading(true)
    getMyJockeyProfile()
      .then(r => { setProfile(r.data.data); setForm(r.data.data || {}) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    setError(''); setSaving(true)
    try {
      await updateJockeyProfile(user.id, {
        fullName:      form.fullName,
        dateOfBirth:   form.dateOfBirth,
        nationality:   form.nationality,
        licenseNumber: form.licenseNumber,
        weight:        form.weight,
        height:        form.height,
      })
      setEditing(false); load()
    } catch (e) { setError(e.response?.data?.message || 'Update failed.') }
    finally { setSaving(false) }
  }

  const handleImage = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const fd = new FormData(); fd.append('file', file)
    await updateJockeyImage(fd).catch(() => {})
    load()
  }

  const FIELDS = [
    ['Full Name',      'fullName',      'text'],
    ['Date of Birth',  'dateOfBirth',   'date'],
    ['Nationality',    'nationality',   'text'],
    ['License Number', 'licenseNumber', 'text'],
    ['Weight (kg)',    'weight',        'number'],
    ['Height (cm)',    'height',        'number'],
  ]

  return (
    <JockeyLayout>
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">

        <div>
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-0.5">Account</p>
          <h1 className="text-2xl font-black text-gray-100 tracking-tight">My Profile</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-gray-700 border-t-yellow-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Avatar + name */}
            <div className="bg-[#1a1c23] rounded-2xl border border-gray-800 p-6 flex items-center gap-6">
              <div
                className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-800 border-2 border-yellow-600/40 cursor-pointer group shrink-0"
                onClick={() => imgRef.current?.click()}
              >
                {profile?.imageUrl
                  ? <img src={profile.imageUrl} alt="avatar" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-3xl text-gray-600">👤</div>
                }
                <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center rounded-full">
                  <Camera size={18} className="text-white" />
                </div>
                <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">{profile?.fullName || user?.email}</h2>
                <p className="text-gray-400 text-sm mt-0.5">Jockey &bull; License: <span className="text-yellow-400 font-bold">{profile?.licenseNumber || 'Not set'}</span></p>
                <div className="flex gap-4 mt-3">
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Weight</p>
                    <p className="text-sm font-bold text-gray-200">{profile?.weight ? `${profile.weight} kg` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Height</p>
                    <p className="text-sm font-bold text-gray-200">{profile?.height ? `${profile.height} cm` : '—'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="bg-[#1a1c23] rounded-2xl border border-gray-800 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-200">Profile Details</h3>
                {!editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="text-xs font-bold text-yellow-400 hover:text-yellow-300 transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>

              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {FIELDS.map(([label, key, type]) => (
                      <div key={key} className={key === 'fullName' ? 'col-span-2' : ''}>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{label}</label>
                        <input
                          type={type}
                          step={type === 'number' ? '0.1' : undefined}
                          className={inputCls}
                          value={form[key] || ''}
                          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        />
                      </div>
                    ))}
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                      <X size={14} /> {error}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => { setEditing(false); setError('') }}
                      className="flex-1 py-3 border border-gray-700 text-gray-300 rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={save}
                      disabled={saving}
                      className="flex-1 py-3 bg-[#facc15] hover:bg-yellow-400 text-black rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                    >
                      <Save size={16} />
                      {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <Field label="Full Name"      value={profile?.fullName} />
                  <Field label="Date of Birth"  value={profile?.dateOfBirth} />
                  <Field label="Nationality"    value={profile?.nationality} />
                  <Field label="License Number" value={profile?.licenseNumber} />
                  <Field label="Weight"         value={profile?.weight ? `${profile.weight} kg` : null} />
                  <Field label="Height"         value={profile?.height ? `${profile.height} cm` : null} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </JockeyLayout>
  )
}
