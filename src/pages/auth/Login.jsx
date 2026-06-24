import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { login as apiLogin, parseJwt } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const justRegistered = searchParams.get('registered') === '1'
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await apiLogin(form)
      const token = res.data?.data?.token ?? res.data?.token
      const account = parseJwt(token)
      login(token, account)
      const role = account?.role || account?.Role || account?.roleName || account?.RoleName || ''
      const dest = {
        Spectator: '/spectator/dashboard',
        Admin:     '/admin/dashboard',
        Owner:     '/owner/dashboard',
        Jockey:    '/jockey/dashboard',
        Referee:   '/referee/races',
      }
      navigate(dest[role] || '/spectator/dashboard')
    } catch (err) {
      const msg = err.response?.data?.message
        || err.response?.data?.errors?.join(', ')
        || err.message
        || 'Invalid email or password.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#f2eff4' }}>
      {/* Left hero */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-primary">
        <img
          alt="Horse racing"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.18 }}
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuB3eLTlYFUsxv3P0XHL0W45C41MvRcla34V5KAHrjV00VAVNjT1ze0Mehw5mVbXzkCbU9aRof1WbP3RNRwA3LZ5gBDeR7nTU7sAtKn1GcTcumQOoUa6u1J2xTBJUXBK-kRnzn1knmK9ewnTnBXi7M1UjZUB8jyCfFk0MQOykhDpbt9C69P2b6xBojgDBgqyC40ATb0iGyjhmel0YX2ocwZRkHt3GMqq_LFp5nc7xDs4wikcpJYcPI-dGuQB4zXIq7QceI1MiZILxxBG"
        />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <span className="material-symbols-outlined text-white" style={{ fontSize: '20px' }}>token</span>
            </div>
            <div>
              <p className="text-white font-extrabold text-base leading-none">Equine Precision</p>
              <p className="text-[11px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>Horse Racing Platform</p>
            </div>
          </div>

          {/* Hero text */}
          <div className="space-y-4">
            <h1 className="text-5xl font-black text-white leading-tight">
              Where<br />Champions<br />Are Made
            </h1>
            <p className="text-base leading-relaxed max-w-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
              The premier platform connecting horse owners, jockeys, referees, and racing fans.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-6 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div>
              <p className="text-4xl font-black text-white">500+</p>
              <p className="text-[11px] uppercase tracking-widest mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Races Managed</p>
            </div>
            <div>
              <p className="text-4xl font-black text-white">99.9%</p>
              <p className="text-[11px] uppercase tracking-widest mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>System Uptime</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[360px] fade-scale-in">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: '22px' }}>token</span>
            <span className="font-extrabold text-primary text-base">Equine Precision</span>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl p-8 shadow-sm" style={{ border: '1px solid #e4dfe4' }}>
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-primary">Sign in</h2>
              <p className="text-sm mt-1" style={{ color: '#9e8fa0' }}>Welcome back — enter your credentials</p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: '#7a6b7c' }} htmlFor="email">
                  Email
                </label>
                <input
                  id="email" type="email" required autoComplete="email"
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-sm text-primary outline-none transition-all"
                  style={{ border: '1.5px solid #e4dfe4', background: '#faf8fb' }}
                  onFocus={e => e.target.style.borderColor = '#000'}
                  onBlur={e => e.target.style.borderColor = '#e4dfe4'}
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: '#7a6b7c' }} htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password" type={showPass ? 'text' : 'password'} required autoComplete="current-password"
                    value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full px-4 py-3 pr-11 rounded-xl text-sm text-primary outline-none transition-all"
                    style={{ border: '1.5px solid #e4dfe4', background: '#faf8fb' }}
                    onFocus={e => e.target.style.borderColor = '#000'}
                    onBlur={e => e.target.style.borderColor = '#e4dfe4'}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#b0a8b2' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      {showPass ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {justRegistered && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a' }}>
                  <span className="material-symbols-outlined shrink-0" style={{ fontSize: '16px' }}>check_circle</span>
                  Account created! Please sign in.
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                  <span className="material-symbols-outlined shrink-0" style={{ fontSize: '16px' }}>error</span>
                  {error}
                </div>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full py-3 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {loading
                  ? <><span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>progress_activity</span> Signing in...</>
                  : <><span>Sign In</span><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span></>
                }
              </button>
            </form>

            <p className="text-center text-sm mt-6" style={{ color: '#9e8fa0' }}>
              Don&apos;t have an account?{' '}
              <Link to="/register" className="text-primary font-semibold hover:underline">Create one</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
