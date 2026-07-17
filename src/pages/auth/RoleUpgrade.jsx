import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Flag, Layers, Wallet, TrendingUp, UploadCloud, Send, CheckCircle2 } from 'lucide-react'
import { upgrade } from '../../api/auth'
import { getMyProfile } from '../../api/userProfiles'
import { getMyJockeyProfile } from '../../api/jockeyProfiles'
import { useAuth } from '../../context/AuthContext'
import AccountProfile from '../../components/AccountProfile'

const ROLES = [
  { id: 'HorseOwner', label: 'Owner',   icon: '🏠', desc: 'Stable & stock management' },
  { id: 'Jockey',     label: 'Jockey',  icon: '🏇', desc: 'Official race registration' },
  { id: 'Referee',    label: 'Referee', icon: '🛡️', desc: 'Rule enforcement & oversight' },
]

const inputCls = 'w-full bg-[#110e0b] border border-stone-700 rounded-lg px-3 py-2.5 text-xs text-stone-200 focus:outline-none focus:border-[#f7e0a3]/40 transition-colors placeholder:text-stone-600'
const labelCls = 'block text-[11px] font-semibold text-stone-400 mb-1.5'

const navLinkCls = ({ isActive }) =>
  `flex items-center space-x-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all ${
    isActive
      ? 'bg-[#29221a] text-[#f7e0a3] border border-[#f7e0a3]/20 shadow-sm'
      : 'text-stone-400 hover:bg-stone-800/30 hover:text-stone-200'
  }`

export default function RoleUpgrade() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)

  const displayName = user?.fullName || user?.name || user?.email?.split('@')[0] || 'User'
  const initials    = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const [selectedRole, setSelectedRole] = useState('')
  const [docFile, setDocFile]           = useState(null)
  const [docName, setDocName]           = useState(null)
  const [error, setError]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [done, setDone]                 = useState(false)
  const [fields, setFields]             = useState({
    fullName: '', phone: '',
    dateOfBirth: '', nationality: '', licenseNumber: '', weight: '', height: '',
  })
  useEffect(() => {
    getMyProfile()
      .then(r => {
        const p = r.data?.data || r.data || {}
        const savedFullName = localStorage.getItem('upgrade_fullName') || ''
        const savedPhone    = localStorage.getItem('upgrade_phone') || ''
        setFields(prev => ({
          ...prev,
          fullName: p.fullName || savedFullName,
          phone:    p.phone    || savedPhone,
        }))
      })
      .catch(() => {
        const savedFullName = localStorage.getItem('upgrade_fullName') || ''
        const savedPhone    = localStorage.getItem('upgrade_phone') || ''
        setFields(prev => ({ ...prev, fullName: savedFullName, phone: savedPhone }))
      })
  }, [])

  const handleSelectRole = async (id) => {
    setSelectedRole(id)
    setError('')
    if (id === 'Jockey') {
      try {
        const r = await getMyJockeyProfile()
        const p = r.data?.data || r.data || {}
        setFields(prev => ({
          ...prev,
          dateOfBirth:   p.dateOfBirth   ? p.dateOfBirth.split('T')[0] : prev.dateOfBirth,
          nationality:   p.nationality   || prev.nationality,
          licenseNumber: p.licenseNumber || prev.licenseNumber,
          weight:        p.weight        != null ? String(p.weight) : prev.weight,
          height:        p.height        != null ? String(p.height) : prev.height,
        }))
      } catch {
        // Keep the manually entered values if the optional jockey profile cannot be loaded.
      }
    }
  }

  const f = key => ({
    value: fields[key],
    onChange: e => setFields(p => ({ ...p, [key]: e.target.value })),
  })

  const handleDoc = e => {
    const file = e.target.files[0]
    if (file) { setDocFile(file); setDocName(file.name) }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!selectedRole) { setError('Please select a role.'); return }
    if (!fields.fullName.trim()) { setError('Full name is required.'); return }
    if (!fields.phone.trim())    { setError('Phone number is required.'); return }
    if (!/^(0|\+84)[35789]\d{8}$/.test(fields.phone.trim())) { setError('Phone must be a valid Vietnamese phone number (e.g. 0912345678).'); return }
    if (selectedRole === 'Jockey') {
      if (fields.weight && (Number(fields.weight) < 20 || Number(fields.weight) > 200)) { setError('Weight must be between 20 and 200 kg.'); return }
      if (fields.height && (Number(fields.height) < 100 || Number(fields.height) > 250)) { setError('Height must be between 100 and 250 cm.'); return }
    }
    setError(''); setLoading(true)
    try {
      const fd = new FormData()
      fd.append('RequestedRole', selectedRole)
      fd.append('FullName', fields.fullName.trim())
      fd.append('Phone', fields.phone.trim())
      if (selectedRole === 'Jockey') {
        if (fields.dateOfBirth)   fd.append('DateOfBirth', fields.dateOfBirth)
        if (fields.nationality)   fd.append('Nationality', fields.nationality.trim())
        if (fields.licenseNumber) fd.append('LicenseNumber', fields.licenseNumber.trim())
        if (fields.weight)        fd.append('Weight', fields.weight)
        if (fields.height)        fd.append('Height', fields.height)
      }
      if (docFile) fd.append('CertificateImage', docFile)
      localStorage.setItem('upgrade_fullName', fields.fullName.trim())
      localStorage.setItem('upgrade_phone', fields.phone.trim())
      await upgrade(fd)
      await refreshUser()
      setDone(true)
    } catch (err) {
      const status = err.response?.status
      const data   = err.response?.data
      if (status === 502 || status === 503) {
        setError('Server is unavailable. Please try again later.')
      } else if (data?.errors) {
        setError(Object.values(data.errors).flat().join(' '))
      } else {
        setError(data?.message || 'Submission failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="spectator-soft-dark flex min-h-screen bg-[#110e0b] text-stone-200 font-sans">

      {/* SIDEBAR */}
      <aside className="w-64 bg-[#171410] p-5 flex flex-col justify-between border-r border-stone-900 shrink-0">
        <div>
          <div className="text-[#f7e0a3] font-bold text-xl mb-8 tracking-wide px-2">
            Horse Racing
          </div>
          <nav className="space-y-1.5">
            <NavLink to="/spectator/dashboard" className={navLinkCls}>
              <Home size={18} /><span>Home</span>
            </NavLink>
            <NavLink to="/spectator/races" className={navLinkCls}>
              <Flag size={18} /><span>Races</span>
            </NavLink>
            <NavLink to="/spectator/bets" className={navLinkCls}>
              <Layers size={18} /><span>My Bets</span>
            </NavLink>
            <NavLink to="/spectator/wallet" className={navLinkCls}>
              <Wallet size={18} /><span>Wallet</span>
            </NavLink>
            <NavLink to="/upgrade" className={navLinkCls}>
              <TrendingUp size={18} /><span>Upgrade Role</span>
            </NavLink>
          </nav>
        </div>
        <button
          onClick={() => setProfileOpen(true)}
          className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#1f1b15] border border-transparent hover:border-stone-800 transition-all w-full text-left mt-4"
        >
          <div className="w-9 h-9 rounded-full border border-[#f7e0a3]/30 overflow-hidden shrink-0 flex items-center justify-center bg-[#24211a]">
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt={displayName} className="w-full h-full object-cover block" />
              : <span className="text-xs font-black text-[#f7e0a3]/70">{initials}</span>
            }
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-stone-100 truncate">{displayName}</p>
            <p className="text-[11px] text-stone-500 truncate">{user?.email || ''}</p>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
        </button>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-4xl">

          {/* Header */}
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-1">Account</p>
            <h1 className="text-3xl font-extrabold text-stone-100 tracking-tight">Request Role Upgrade</h1>
            <p className="text-sm text-stone-500 mt-2">
              Apply for professional status to unlock advanced features.
            </p>
          </div>

          {done ? (
            <div className="bg-[#171410] rounded-2xl border border-stone-800 p-12 text-center space-y-5">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-stone-100">Request Submitted!</h3>
              <p className="text-sm text-stone-400 leading-relaxed max-w-sm mx-auto">
                Your upgrade request for <span className="font-semibold text-[#f7e0a3]">{selectedRole}</span> has been received.
                Verification typically takes 2–5 business days.
              </p>
              <button
                onClick={() => navigate('/spectator/dashboard')}
                className="bg-[#f7e0a3] text-[#110e0b] text-sm font-bold px-8 py-3 rounded-xl hover:bg-[#ebd292] transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Role selection */}
              <div className="bg-[#171410] rounded-2xl border border-stone-800 p-6 space-y-5">
                <h4 className="text-xs font-bold text-stone-500 tracking-widest uppercase">Select Desired Role</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {ROLES.map(({ id, label, icon, desc }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleSelectRole(id)}
                      className={`p-6 rounded-xl border bg-[#110e0b] flex flex-col items-center text-center transition-all ${
                        selectedRole === id
                          ? 'border-[#f7e0a3] ring-1 ring-[#f7e0a3]/30'
                          : 'border-stone-800 hover:border-stone-600'
                      }`}
                    >
                      <div className="text-3xl mb-3">{icon}</div>
                      <span className="text-base font-bold text-stone-100">{label}</span>
                      <span className="text-xs text-stone-500 mt-1 leading-tight">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Verification fields */}
              {selectedRole && (
                <div className="bg-[#171410] rounded-2xl border border-stone-800 p-6 space-y-5">
                  <h3 className="text-sm font-bold text-stone-100">Verification Information</h3>

                  {/* Personal Details */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-stone-500 tracking-wider uppercase">Personal Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Full Name</label>
                        <input type="text" placeholder="Enter your full name" className={inputCls} {...f('fullName')} />
                      </div>
                      <div>
                        <label className={labelCls}>Phone Number</label>
                        <input type="tel" placeholder="+84 912 345 678" className={inputCls} {...f('phone')} />
                      </div>
                    </div>
                  </div>

                  {/* Jockey-specific */}
                  {selectedRole === 'Jockey' && (
                    <div className="bg-[#110e0b] rounded-xl border border-stone-800 p-4 space-y-4">
                      <h4 className="text-[10px] font-bold text-stone-500 tracking-wider uppercase">Jockey Specific Details</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className={labelCls}>Date of Birth</label>
                          <input type="date" className={inputCls} {...f('dateOfBirth')} />
                        </div>
                        <div>
                          <label className={labelCls}>Nationality</label>
                          <input type="text" placeholder="e.g. Vietnamese" className={inputCls} {...f('nationality')} />
                        </div>
                        <div>
                          <label className={labelCls}>License Number</label>
                          <input type="text" placeholder="J-XXXXXX" className={inputCls} {...f('licenseNumber')} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}>Weight (kg)</label>
                          <input type="number" step="0.1" min="20" max="200" placeholder="55" className={inputCls} {...f('weight')} />
                        </div>
                        <div>
                          <label className={labelCls}>Height (cm)</label>
                          <input type="number" step="0.1" min="100" max="250" placeholder="165" className={inputCls} {...f('height')} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Document upload */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-stone-500 tracking-wider uppercase">Supporting Documents</h4>
                    <label
                      htmlFor="docUpload"
                      className="border-2 border-dashed border-stone-700 bg-[#110e0b] rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#f7e0a3]/40 transition-colors"
                    >
                      <div className={`p-2.5 rounded-lg mb-3 ${docFile ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[#f7e0a3]/10 text-[#f7e0a3]'}`}>
                        {docFile ? <CheckCircle2 size={20} /> : <UploadCloud size={20} />}
                      </div>
                      <p className="text-xs font-bold text-stone-300">
                        {docName || 'Upload Documentation'}
                      </p>
                      <p className="text-[10px] text-stone-600 mt-1">PDF, PNG or JPG up to 10MB</p>
                      <input id="docUpload" type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={handleDoc} />
                    </label>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-medium">
                  {error}
                </div>
              )}

              {/* Submit */}
              {selectedRole && (
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#f7e0a3] text-[#110e0b] text-sm font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-[#ebd292] transition-all active:scale-[0.99] disabled:opacity-60"
                >
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-[#110e0b]/30 border-t-[#110e0b] rounded-full animate-spin" /> Processing…</>
                    : <><span>Submit Request</span><Send size={14} /></>
                  }
                </button>
              )}

              <p className="text-[10px] text-stone-600 text-center leading-normal">
                Verification typically takes 2–5 business days. You will be notified via email once reviewed.
              </p>
            </form>
          )}
        </div>
      </main>

      {profileOpen && <AccountProfile onClose={() => setProfileOpen(false)} />}
    </div>
  )
}
