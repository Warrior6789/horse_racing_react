import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { login as apiLogin, parseJwt } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'

const heroImage =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuB3eLTlYFUsxv3P0XHL0W45C41MvRcla34V5KAHrjV00VAVNjT1ze0Mehw5mVbXzkCbU9aRof1WbP3RNRwA3LZ5gBDeR7nTU7sAtKn1GcTcumQOoUa6u1J2xTBJUXBK-kRnzn1knmK9ewnTnBXi7M1UjZUB8jyCfFk0MQOykhDpbt9C69P2b6xBojgDBgqyC40ATb0iGyjhmel0YX2ocwZRkHt3GMqq_LFp5nc7xDs4wikcpJYcPI-dGuQB4zXIq7QceI1MiZILxxBG'

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
        Admin: '/admin/dashboard',
        Owner: '/owner/dashboard',
        Jockey: '/jockey/dashboard',
        Referee: '/referee/races',
      }
      navigate(dest[role] || '/spectator/dashboard')
    } catch (err) {
      const msg = err.response?.data?.message
        || err.response?.data?.errors?.join(', ')
        || err.message
        || 'Invalid email or password.'
      setError(msg)
      setForm(f => ({ ...f, password: '' }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-[#f4eff4]">
      <section className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-primary">
        <img
          alt="Horse racing"
          className="absolute inset-0 h-full w-full object-cover opacity-25"
          src={heroImage}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/70 to-black/90" />
        <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
              <span className="material-symbols-outlined text-white" style={{ fontSize: '20px' }}>token</span>
            </div>
            <div>
              <p className="text-base font-extrabold leading-none text-white">Equine Precision</p>
              <p className="mt-1 text-[11px] uppercase tracking-widest text-white/45">Horse Racing Platform</p>
            </div>
          </div>

          <div className="max-w-md space-y-4">
            <h1 className="text-5xl font-black leading-tight text-white">
              Where<br />Champions<br />Are Made
            </h1>
            <p className="max-w-xs text-base leading-relaxed text-white/65">
              The premier platform connecting horse owners, jockeys, referees, and racing fans.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 border-t border-white/10 pt-8">
            <div>
              <p className="text-4xl font-black text-white">500+</p>
              <p className="mt-1 text-[11px] uppercase tracking-widest text-white/45">Races Managed</p>
            </div>
            <div>
              <p className="text-4xl font-black text-white">99.9%</p>
              <p className="mt-1 text-[11px] uppercase tracking-widest text-white/45">System Uptime</p>
            </div>
          </div>
        </div>
      </section>

      <main className="flex min-h-screen flex-1 items-center justify-center px-5 py-8 sm:px-8 lg:px-12">
        <div className="w-full max-w-[400px] fade-scale-in">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: '22px' }}>token</span>
            <span className="text-base font-extrabold text-primary">Equine Precision</span>
          </div>

          <div className="rounded-2xl border border-[#e4dfe4] bg-white p-7 shadow-[0_18px_60px_rgba(19,27,46,0.08)] sm:p-8">
            <div className="mb-7">
              <h2 className="text-[28px] font-black leading-tight text-primary">Sign in</h2>
              <p className="mt-2 text-sm text-[#8f8191]">Welcome back - enter your credentials</p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#7a6b7c]" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-xl border-[1.5px] border-[#e4dfe4] bg-[#faf8fb] px-4 py-3 text-sm text-primary outline-none transition-all focus:border-primary"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#7a6b7c]" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full rounded-xl border-[1.5px] border-[#e4dfe4] bg-[#faf8fb] px-4 py-3 pr-11 text-sm text-primary outline-none transition-all focus:border-primary"
                    placeholder="Your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b0a8b2] transition-colors hover:text-primary"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      {showPass ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {justRegistered && (
                <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-600">
                  <span className="material-symbols-outlined shrink-0" style={{ fontSize: '16px' }}>check_circle</span>
                  Account created! Please sign in.
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                  <span className="material-symbols-outlined shrink-0" style={{ fontSize: '16px' }}>error</span>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              >
                {loading
                  ? <><span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>progress_activity</span> Signing in...</>
                  : <><span>Sign In</span><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span></>
                }
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[#9e8fa0]">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="font-semibold text-primary hover:underline">Create one</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
