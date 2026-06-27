import { useEffect, useRef, useState } from 'react'
import { Save, Lock, Camera, X } from 'lucide-react'
import JockeyLayout from '../../components/JockeyLayout'
import { getMyJockeyProfile, updateJockeyProfile, updateJockeyImage } from '../../api/jockeyProfiles'
import { getBalance } from '../../api/payments'
import { useAuth } from '../../context/AuthContext'

const inputCls = 'w-full bg-[#070d16] border border-[#162235] rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-[#e5b842] transition-colors'
const labelCls = 'block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2'

export default function JockeyProfile() {
  const { user, updateUser } = useAuth()
  const imgRef = useRef()

  const [profile,  setProfile]  = useState(null)
  const [balance,  setBalance]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)
  const [preview,  setPreview]  = useState(null)
  const [imgFile,  setImgFile]  = useState(null)
  const [form,     setForm]     = useState({
    fullName: '', dateOfBirth: '', nationality: '',
    licenseNumber: '', weight: '', height: '',
  })

  const load = () => {
    setLoading(true)
    Promise.all([
      getMyJockeyProfile().catch(() => null),
      getBalance().catch(() => null),
    ]).then(([profileRes, balRes]) => {
      const p = profileRes?.data?.data || profileRes?.data || {}
      setProfile(p)
      setForm({
        fullName:      p.fullName      || '',
        dateOfBirth:   p.dateOfBirth   ? p.dateOfBirth.split('T')[0] : '',
        nationality:   p.nationality   || '',
        licenseNumber: p.licenseNumber || '',
        weight:        p.weight        != null ? String(p.weight) : '',
        height:        p.height        != null ? String(p.height) : '',
      })
      setBalance(balRes?.data?.data?.balance ?? null)
    }).finally(() => setLoading(false))
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
    setError(''); setSaving(true); setSuccess(false)
    try {
      await updateJockeyProfile(user.id, {
        fullName:      form.fullName.trim(),
        dateOfBirth:   form.dateOfBirth   || undefined,
        nationality:   form.nationality.trim() || undefined,
        licenseNumber: form.licenseNumber.trim() || undefined,
        weight:        form.weight  ? Number(form.weight)  : undefined,
        height:        form.height  ? Number(form.height)  : undefined,
      })
      if (imgFile) {
        const fd = new FormData()
        fd.append('file', imgFile)
        await updateJockeyImage(fd)
        updateUser({ avatarUrl: preview })
        setImgFile(null)
      }
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
  const displayName = profile?.fullName || user?.fullName || user?.email?.split('@')[0] || 'Jockey'
  const initials    = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <JockeyLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto">

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-2 border-gray-700 border-t-[#e5b842] rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-[#0d1625] rounded-xl border border-[#e5b842]/20 shadow-2xl overflow-hidden p-6">

            {/* ── HEADER ── */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-[#162235] pb-6 mb-6 gap-4">

              {/* Avatar + name + balance */}
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <div
                    className="w-20 h-20 rounded-full border-2 border-[#e5b842] overflow-hidden bg-gray-800 cursor-pointer"
                    onClick={() => imgRef.current?.click()}
                  >
                    {avatarUrl
                      ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-2xl font-black text-[#e5b842]/60">{initials}</div>
                    }
                  </div>
                  <button
                    type="button"
                    onClick={() => imgRef.current?.click()}
                    className="absolute bottom-0 right-0 bg-[#e5b842] hover:bg-[#d4a735] text-[#080f1d] p-1.5 rounded-full transition-colors"
                  >
                    <Camera size={12} />
                  </button>
                  <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold tracking-wide text-white">{displayName}</h2>
                    <span className="bg-[#e5b842] text-[#080f1d] text-[9px] font-black px-2 py-0.5 rounded uppercase">
                      Jockey
                    </span>
                  </div>
                  <p className="text-[#e5b842] font-bold mt-1 text-sm">
                    💵 {balance !== null ? balance.toLocaleString('vi-VN') : '—'} VND
                  </p>
                  {preview && (
                    <button
                      type="button"
                      onClick={() => { setPreview(null); setImgFile(null) }}
                      className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-red-400 mt-1 transition-colors"
                    >
                      <X size={10} /> Remove new photo
                    </button>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-4 shrink-0">
                <div className="bg-[#111c2e] border border-[#162235] px-4 py-3 rounded-lg text-center min-w-[100px]">
                  <p className="text-gray-400 text-[11px] uppercase tracking-wider">Total Races</p>
                  <p className="text-xl font-bold text-white mt-0.5">{profile?.totalRaces ?? 0}</p>
                </div>
                <div className="bg-[#111c2e] border border-[#162235] px-4 py-3 rounded-lg text-center min-w-[100px]">
                  <p className="text-gray-400 text-[11px] uppercase tracking-wider">Total Wins</p>
                  <p className="text-xl font-bold text-[#e5b842] mt-0.5">{profile?.totalWins ?? 0}</p>
                </div>
              </div>
            </div>

            {/* ── TAB ── */}
            <div className="border-b border-[#162235] mb-6 flex">
              <div className="pb-3 px-1 font-bold text-[#e5b842] border-b-2 border-[#e5b842] text-sm">
                Personal Information
              </div>
            </div>

            {/* ── FORM ── */}
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">

                {/* Full Name */}
                <div className="md:col-span-2">
                  <label className={labelCls}>Full Name</label>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                    className={inputCls}
                    placeholder="Enter full name"
                  />
                </div>

                {/* Date of Birth */}
                <div>
                  <label className={labelCls}>Date of Birth</label>
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))}
                    className={inputCls}
                  />
                </div>

                {/* Nationality */}
                <div>
                  <label className={labelCls}>Nationality</label>
                  <input
                    type="text"
                    value={form.nationality}
                    onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))}
                    className={inputCls}
                    placeholder="e.g. Vietnamese"
                  />
                </div>

                {/* License Number (read-only) */}
                <div>
                  <label className={labelCls}>License Number</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.licenseNumber}
                      disabled
                      className="w-full bg-[#0b121e] border border-[#162235] rounded-lg pl-4 pr-10 py-2.5 text-sm text-gray-400 cursor-not-allowed"
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-600">
                      <Lock size={14} />
                    </span>
                  </div>
                </div>

                {/* Weight */}
                <div>
                  <label className={labelCls}>Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.weight}
                    onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
                    className={inputCls}
                    placeholder="55"
                  />
                </div>

                {/* Height */}
                <div>
                  <label className={labelCls}>Height (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.height}
                    onChange={e => setForm(f => ({ ...f, height: e.target.value }))}
                    className={inputCls}
                    placeholder="165"
                  />
                </div>
              </div>

              {/* Certificate Image */}
              {profile?.certificateImageUrl && (
                <>
                  <hr className="border-[#162235]" />
                  <div>
                    <label className={labelCls}>Certificate Image</label>
                    <div className="w-full max-w-[280px] aspect-[4/3] rounded-lg border border-[#162235] overflow-hidden bg-[#070d16]">
                      <img
                        src={profile.certificateImageUrl}
                        alt="Certificate"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Error / Success */}
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

              {/* Save */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#e5b842] hover:bg-[#d4a735] disabled:opacity-60 text-[#080f1d] font-bold py-2.5 px-6 rounded-lg flex items-center gap-2 transition-colors text-sm"
                >
                  {saving
                    ? <span className="w-4 h-4 border-2 border-[#080f1d]/30 border-t-[#080f1d] rounded-full animate-spin" />
                    : <Save size={16} />
                  }
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </JockeyLayout>
  )
}
