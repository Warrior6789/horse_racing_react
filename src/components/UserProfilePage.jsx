import { useState, useEffect, useRef } from 'react'
import { User, Phone, Save, Camera, X } from 'lucide-react'
import { getMyProfile, updateProfile, updateProfileImage } from '../api/userProfiles'
import { useAuth } from '../context/AuthContext'

const inputCls = 'w-full bg-[#070d16] border border-[#162235] rounded-lg pl-10 pr-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-[#e5b842] transition-colors placeholder:text-gray-500'

export default function UserProfilePage({ Layout, roleName, badgeColor }) {
  const { user, updateUser } = useAuth()
  const imgRef = useRef()

  const [profile,  setProfile]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)
  const [preview,  setPreview]  = useState(null)
  const [imgFile,  setImgFile]  = useState(null)
  const [form,     setForm]     = useState({ fullName: '', phone: '' })

  const load = () => {
    setLoading(true)
    getMyProfile()
      .then(r => {
        const p = r.data?.data || r.data || {}
        setProfile(p)
        setForm({ fullName: p.fullName || '', phone: p.phone || '' })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleImage = e => {
    const file = e.target.files[0]
    if (!file) return
    setImgFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleSave = async e => {
    e.preventDefault()
    if (!form.fullName.trim()) { setError('Full name is required.'); return }
    if (form.phone.trim() && !/^(0|\+84)[35789]\d{8}$/.test(form.phone.trim())) {
      setError('Phone must be a valid Vietnamese phone number (e.g. 0912345678).')
      return
    }
    setError(''); setSaving(true); setSuccess(false)
    try {
      const id = profile?.accountId || profile?.userId || profile?.id
      if (id) await updateProfile(id, { fullName: form.fullName.trim(), phone: form.phone.trim() })
      if (imgFile) {
        const fd = new FormData()
        fd.append('file', imgFile)
        await updateProfileImage(fd)
        updateUser({ avatarUrl: preview })
      }
      setImgFile(null)
      setSuccess(true)
      load()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      const d = err.response?.data
      if (d?.errors) setError(Object.values(d.errors).flat().join(' '))
      else setError(d?.message || 'Update failed.')
    } finally { setSaving(false) }
  }

  const avatarUrl   = preview || profile?.imageUrl || null
  const displayName = form.fullName || user?.fullName || user?.email?.split('@')[0] || 'User'
  const initials    = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const balance     = profile?.balance ?? null

  return (
    <Layout>
      <div className="flex justify-center items-start min-h-full p-4 md:p-8">
        <div className="w-full max-w-md">

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="w-8 h-8 border-2 border-gray-700 border-t-[#e5b842] rounded-full animate-spin" />
            </div>
          ) : (
            <div className="bg-[#0d1625] rounded-2xl border border-[#e5b842]/30 shadow-2xl overflow-hidden">

              {/* Avatar + name */}
              <div className="flex flex-col items-center pt-8 pb-4">
                <div
                  className="relative w-20 h-20 rounded-full border-2 border-[#e5b842] overflow-hidden bg-gray-800 mb-3 cursor-pointer group"
                  onClick={() => imgRef.current?.click()}
                >
                  {avatarUrl
                    ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-2xl font-black text-[#e5b842]/60">{initials}</div>
                  }
                  <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center rounded-full">
                    <Camera size={18} className="text-white" />
                  </div>
                  <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
                </div>
                {preview && (
                  <button
                    onClick={() => { setPreview(null); setImgFile(null) }}
                    className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-red-400 mb-1 transition-colors"
                  >
                    <X size={11} /> Remove new photo
                  </button>
                )}
                <h2 className="text-xl font-bold tracking-wide text-white">{displayName}</h2>
                <span className={`mt-1 border text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider ${badgeColor}`}>
                  ● {roleName}
                </span>
              </div>

              {/* Balance */}
              <div className="px-6 mb-6">
                <div className="bg-[#0a111c] border border-[#162235] rounded-xl p-4 text-center">
                  <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Available Balance</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl">💰</span>
                    <span className="text-3xl font-extrabold text-[#e5b842] tracking-wide">
                      {balance !== null ? balance.toLocaleString('vi-VN') : '—'}
                    </span>
                  </div>
                  <p className="text-lg font-black text-[#e5b842] mt-0.5">VND</p>
                </div>
              </div>

              {/* Tab header */}
              <div className="border-b border-[#162235] flex">
                <div className="flex-1 text-center py-3 font-bold text-[#e5b842] border-b-2 border-[#e5b842] bg-[#111c2e]/50 text-sm">
                  Personal Information
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSave} className="p-6 space-y-5">

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500"><User size={16} /></span>
                    <input
                      type="text"
                      value={form.fullName}
                      onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                      className={inputCls}
                      placeholder="Enter full name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Phone Number</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500"><Phone size={16} /></span>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      className={inputCls}
                      placeholder="+84 901 234 567"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    readOnly
                    className="w-full bg-[#070d16]/50 border border-[#162235]/50 rounded-lg px-4 py-3 text-sm text-gray-500 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-gray-600 mt-1">Email cannot be changed.</p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-medium">
                    <X size={13} /> {error}
                  </div>
                )}
                {success && (
                  <div className="px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-medium">
                    Profile updated successfully!
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-[#e5b842] hover:bg-[#d4a735] disabled:opacity-60 text-[#080f1d] font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  {saving
                    ? <span className="w-4 h-4 border-2 border-[#080f1d]/30 border-t-[#080f1d] rounded-full animate-spin" />
                    : <Save size={16} />
                  }
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
