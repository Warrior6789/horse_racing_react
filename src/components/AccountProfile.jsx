import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Pencil, ShieldCheck, ArrowRight, LogOut, Mail, Check, Camera } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getMyBetsPaged } from '../api/bets'
import { getBalance } from '../api/payments'
import { getMyProfile, updateProfile, updateProfileImage } from '../api/userProfiles'
import { updateJockeyImage } from '../api/jockeyProfiles'

const ROLE_LABEL = {
  Spectator: 'SPECTATOR',
  Admin:     'ADMIN',
  Owner:     'OWNER',
  Jockey:    'JOCKEY',
  Referee:   'REFEREE',
}

const THEMES = {
  dark: {
    panel:        'bg-[#181611] text-white border-[#2c281e]',
    headerBorder: 'border-[#2c281e]',
    closeBtn:     'bg-[#24211a] hover:bg-[#332f26]',
    closeIcon:    'text-gray-400',
    avatarBorder: 'border-[#fce08b]',
    avatarBg:     'bg-[#24211a]',
    initials:     'text-[#fce08b]/60',
    cameraBg:     'bg-[#fce08b] hover:bg-[#ebd07a] border-[#181611]',
    cameraIcon:   'text-black',
    input:        'bg-[#110e0b] border border-[#332f26] text-stone-200 focus:border-[#fce08b]/40 placeholder:text-stone-600',
    label:        'text-gray-500',
    cancelBtn:    'border border-[#332f26] text-gray-400 hover:bg-[#24211a]',
    saveBtn:      'bg-[#fce08b] hover:bg-[#ebd07a] text-black',
    spinBorder:   'border-black/20 border-t-black',
    mailDotBg:    'bg-[#fce08b] border-[#181611]',
    mailIcon:     'text-black',
    editBtn:      'border border-[#332f26] text-stone-300 hover:bg-[#24211a]',
    sectionLabel: 'text-gray-400',
    roleBadge:    'bg-[#4a3e1c] text-[#fce08b]',
    upgradeCard:  'bg-[#24211a] border-[#332f26]',
    upgradeIconBg:'bg-[#fce08b] text-black',
    upgradeDesc:  'text-gray-400',
    upgradeBtn:   'bg-[#fce08b] hover:bg-[#ebd07a] text-black',
    statCard:     'bg-[#24211a] border-[#332f26]',
    statLabel:    'text-gray-400',
    statValue:    'text-white',
    balanceVal:   'text-[#fce08b]',
    footerBorder: 'border-[#2c281e]',
    logoutBtn:    'bg-[#3a1c1c] hover:bg-[#4a2424] border border-[#4a2424] text-[#f87171]',
    subText:      'text-gray-600',
  },
  light: {
    panel:        'bg-white text-gray-900 border-gray-200',
    headerBorder: 'border-gray-100',
    closeBtn:     'bg-gray-100 hover:bg-gray-200',
    closeIcon:    'text-gray-500',
    avatarBorder: 'border-gray-300',
    avatarBg:     'bg-gray-100',
    initials:     'text-gray-500',
    cameraBg:     'bg-gray-900 hover:bg-gray-800 border-white',
    cameraIcon:   'text-white',
    input:        'bg-gray-50 border border-gray-200 text-gray-900 focus:border-gray-400 placeholder:text-gray-400',
    label:        'text-gray-500',
    cancelBtn:    'border border-gray-200 text-gray-600 hover:bg-gray-50',
    saveBtn:      'bg-gray-900 hover:bg-gray-800 text-white',
    spinBorder:   'border-white/30 border-t-white',
    mailDotBg:    'bg-gray-900 border-white',
    mailIcon:     'text-white',
    editBtn:      'border border-gray-200 text-gray-700 hover:bg-gray-50',
    sectionLabel: 'text-gray-400',
    roleBadge:    'bg-gray-100 text-gray-700',
    upgradeCard:  'bg-gray-50 border-gray-200',
    upgradeIconBg:'bg-gray-900 text-white',
    upgradeDesc:  'text-gray-500',
    upgradeBtn:   'bg-gray-900 hover:bg-gray-800 text-white',
    statCard:     'bg-gray-50 border-gray-100',
    statLabel:    'text-gray-400',
    statValue:    'text-gray-900',
    balanceVal:   'text-gray-900 font-extrabold',
    footerBorder: 'border-gray-100',
    logoutBtn:    'bg-red-50 hover:bg-red-100 border border-red-200 text-red-600',
    subText:      'text-gray-400',
  },
}

export default function AccountProfile({ onClose, variant = 'dark' }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const t = THEMES[variant] || THEMES.dark

  const role  = user?.role || user?.Role || user?.roleName || user?.RoleName || 'Spectator'
  const email = user?.email || '—'

  const [profile, setProfile]               = useState(null)
  const [stats, setStats]                   = useState({ totalBets: null, balance: null })
  const [editing, setEditing]               = useState(false)
  const [form, setForm]                     = useState({ fullName: '', phone: '' })
  const [avatarPreview, setAvatarPreview]   = useState(null)
  const [avatarFile, setAvatarFile]         = useState(null)
  const [saving, setSaving]                 = useState(false)
  const [error, setError]                   = useState('')

  const displayName = profile?.fullName || user?.fullName || user?.name || email.split('@')[0] || 'User'
  const avatarUrl   = avatarPreview || profile?.imageUrl || user?.avatarUrl || null
  const initials    = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  useEffect(() => {
    getMyProfile()
      .then(r => {
        const p = r.data?.data || r.data || {}
        setProfile(p)
        setForm({ fullName: p.fullName || '', phone: p.phone || '' })
      })
      .catch(() => {})

    if (role !== 'Admin' && role !== 'Referee') {
      getBalance().then(r => setStats(s => ({ ...s, balance: r.data.data?.balance ?? 0 }))).catch(() => {})
      if (role === 'Spectator') {
        getMyBetsPaged({ page: 1, pageSize: 1 }).then(r => setStats(s => ({ ...s, totalBets: r.data.data?.totalCount ?? 0 }))).catch(() => {})
      }
    }
  }, [])

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const save = async () => {
    setError('')
    if (form.phone.trim() && !/^(0|\+84)[35789]\d{8}$/.test(form.phone.trim())) {
      setError('Phone must be a valid Vietnamese phone number (e.g. 0912345678).')
      return
    }
    setSaving(true)
    try {
      const profileId = profile?.accountId || profile?.userId || profile?.id
      if (profileId) {
        await updateProfile(profileId, { fullName: form.fullName.trim(), phone: form.phone.trim() })
        setProfile(p => ({ ...p, fullName: form.fullName.trim(), phone: form.phone.trim() }))
      }
      if (avatarFile) {
        const fd = new FormData()
        fd.append('file', avatarFile)
        try {
          if (user?.role === 'Jockey') {
            const jockeyFd = new FormData()
            jockeyFd.append('file', avatarFile)
            await updateJockeyImage(jockeyFd)
          } else {
            await updateProfileImage(fd)
          }
          setProfile(p => ({ ...p, imageUrl: avatarPreview }))
        } catch (imgErr) {
          const d = imgErr.response?.data
          setError(d?.message || d?.title || 'Profile saved but avatar upload failed.')
          setSaving(false)
          return
        }
      }
      setAvatarFile(null)
      setAvatarPreview(null)
      setEditing(false)
    } catch (e) {
      const d = e.response?.data
      if (d?.errors) setError(Object.values(d.errors).flat().join(' '))
      else setError(d?.message || d?.title || 'Update failed.')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const inputCls = `w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-colors ${t.input}`
  const labelCls = `block text-[11px] font-semibold mb-1.5 uppercase tracking-wider ${t.label}`

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      {/* Panel */}
      <div className={`fixed right-0 top-0 z-50 w-[360px] h-screen flex flex-col border-l shadow-2xl ${t.panel}`}>

        {/* Header */}
        <div className={`flex items-center justify-between p-5 border-b shrink-0 ${t.headerBorder}`}>
          <h2 className="text-lg font-bold">{editing ? 'Edit Profile' : 'Account Profile'}</h2>
          <button onClick={onClose} className={`p-1.5 rounded-full transition ${t.closeBtn}`}>
            <X size={16} className={t.closeIcon} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5">

          {editing ? (
            /* ── EDIT MODE ── */
            <div className="space-y-5">
              {/* Avatar */}
              <div className="flex flex-col items-center">
                <div className="relative mb-2">
                  <div className={`w-20 h-20 rounded-full border-2 overflow-hidden ${t.avatarBorder}`}>
                    {(avatarPreview || avatarUrl)
                      ? <img src={avatarPreview || avatarUrl} alt="" className="w-full h-full object-cover block" />
                      : <div className={`w-full h-full flex items-center justify-center ${t.avatarBg}`}>
                          <span className={`text-2xl font-black ${t.initials}`}>{initials}</span>
                        </div>
                    }
                  </div>
                  <label className={`absolute bottom-0 right-0 p-1.5 rounded-full border-2 cursor-pointer transition ${t.cameraBg}`}>
                    <Camera size={12} className={t.cameraIcon} />
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </label>
                </div>
                <p className={`text-[11px] ${t.subText}`}>Click camera to change photo</p>
              </div>

              {/* Fields */}
              <div>
                <label className={labelCls}>Full Name</label>
                <input type="text" className={inputCls} value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  placeholder="Your full name" />
              </div>
              <div>
                <label className={labelCls}>Phone Number</label>
                <input type="tel" className={inputCls} value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+84 912 345 678" />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" className={`${inputCls} opacity-50 cursor-not-allowed`} value={email} disabled />
                <p className={`text-[11px] mt-1 ${t.subText}`}>Email cannot be changed.</p>
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setEditing(false); setAvatarPreview(null); setAvatarFile(null); setError('') }}
                  className={`flex-1 py-2.5 rounded-xl text-sm transition ${t.cancelBtn}`}
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className={`flex-1 py-2.5 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition disabled:opacity-60 ${t.saveBtn}`}
                >
                  {saving
                    ? <span className={`w-4 h-4 border-2 rounded-full animate-spin ${t.spinBorder}`} />
                    : <><Check size={14} /> Save</>
                  }
                </button>
              </div>
            </div>

          ) : (
            /* ── VIEW MODE ── */
            <>
              {/* Avatar + name */}
              <div className="flex flex-col items-center mb-8">
                <div className="relative mb-4">
                  <div className={`w-20 h-20 rounded-full border-2 overflow-hidden ${t.avatarBorder}`}>
                    {avatarUrl
                      ? <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover block" />
                      : <div className={`w-full h-full flex items-center justify-center ${t.avatarBg}`}>
                          <span className={`text-2xl font-black ${t.initials}`}>{initials}</span>
                        </div>
                    }
                  </div>
                  <div className={`absolute bottom-0 right-0 p-1 rounded-full border-2 ${t.mailDotBg}`}>
                    <Mail size={12} className={t.mailIcon} />
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-1">{displayName}</h3>
                <p className={`text-sm mb-4 ${t.subText}`}>{email}</p>
                <button
                  onClick={() => {
                    if (role === 'Jockey')    { onClose(); navigate('/jockey/profile') }
                    else if (role === 'Owner')     { onClose(); navigate('/owner/profile') }
                    else if (role === 'Spectator') { onClose(); navigate('/spectator/profile') }
                    else setEditing(true)
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${t.editBtn}`}
                >
                  <Pencil size={14} />
                  Edit Profile
                </button>
              </div>

              {/* Role + upgrade */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-bold tracking-wider ${t.sectionLabel}`}>ACCOUNT LEVEL</span>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded ${t.roleBadge}`}>
                    {ROLE_LABEL[role] || role.toUpperCase()}
                  </span>
                </div>

                {role === 'Spectator' && (
                  <div className={`border rounded-xl p-4 ${t.upgradeCard}`}>
                    <div className="flex gap-3 mb-4">
                      <div className={`p-2 rounded-lg h-fit shrink-0 ${t.upgradeIconBg}`}>
                        <ShieldCheck size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold mb-1 text-sm">Request Role Upgrade</h4>
                        <p className={`text-xs leading-relaxed ${t.upgradeDesc}`}>
                          Elevate your status to Horse Owner or Professional Jockey to access exclusive racing circuits.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => { onClose(); navigate('/upgrade') }}
                      className={`w-full font-bold py-2.5 rounded-lg text-sm flex justify-center items-center gap-2 transition ${t.upgradeBtn}`}
                    >
                      Upgrade to Owner or Jockey
                      <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Stats — ẩn với Admin và Referee */}
              {role !== 'Admin' && role !== 'Referee' && (
                <div className={`grid gap-3 ${role === 'Spectator' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {role === 'Spectator' && (
                    <div className={`border rounded-xl p-4 ${t.statCard}`}>
                      <p className={`text-xs font-medium mb-1 ${t.statLabel}`}>Total Bets</p>
                      <p className={`text-xl font-bold ${t.statValue}`}>{stats.totalBets !== null ? stats.totalBets : '—'}</p>
                    </div>
                  )}
                  <div className={`border rounded-xl p-4 ${t.statCard}`}>
                    <p className={`text-xs font-medium mb-1 ${t.statLabel}`}>Balance</p>
                    <p className={`text-xl font-bold ${t.balanceVal}`}>
                      {stats.balance !== null ? stats.balance.toLocaleString() + ' VND' : '—'}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer — view mode only */}
        {!editing && (
          <div className={`p-5 border-t shrink-0 ${t.footerBorder}`}>
            <button
              onClick={handleLogout}
              className={`w-full flex items-center justify-center gap-2 p-4 rounded-xl transition ${t.logoutBtn}`}
            >
              <LogOut size={18} />
              <span className="text-sm font-bold">Logout from {displayName}</span>
            </button>
          </div>
        )}
      </div>
    </>
  )
}
