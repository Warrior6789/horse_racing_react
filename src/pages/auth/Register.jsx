import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register as apiRegister } from '../../api/auth'

const heroImage =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuB3eLTlYFUsxv3P0XHL0W45C41MvRcla34V5KAHrjV00VAVNjT1ze0Mehw5mVbXzkCbU9aRof1WbP3RNRwA3LZ5gBDeR7nTU7sAtKn1GcTcumQOoUa6u1J2xTBJUXBK-kRnzn1knmK9ewnTnBXi7M1UjZUB8jyCfFk0MQOykhDpbt9C69P2b6xBojgDBgqyC40ATb0iGyjhmel0YX2ocwZRkHt3GMqq_LFp5nc7xDs4wikcpJYcPI-dGuQB4zXIq7QceI1MiZILxxBG'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' })
  const [avatar, setAvatar] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setAvatar(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('fullName', form.fullName)
      fd.append('email', form.email)
      fd.append('phone', form.phone)
      fd.append('password', form.password)
      if (avatar) fd.append('avatar', avatar)

      await apiRegister(fd)
      navigate('/login?registered=1')
    } catch (err) {
      const msg = err.response?.data?.message
        || err.response?.data?.errors?.join(', ')
        || err.message
        || 'Registration failed.'
      setError(msg)
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
        <div className="absolute inset-0 bg-gradient-to-br from-[#131b2e]/95 via-[#131b2e]/75 to-black/90" />
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

          <div className="max-w-2xl space-y-5">
            <h1 className="text-5xl font-black leading-tight text-white xl:text-6xl">
              Join the Racing Community
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-white/70">
              Create your account to access the full horse racing management experience.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 border-t border-white/10 pt-8">
            <div>
              <p className="text-4xl font-black text-white">24/7</p>
              <p className="mt-1 text-[11px] uppercase tracking-widest text-white/45">Racing Access</p>
            </div>
            <div>
              <p className="text-4xl font-black text-white">4</p>
              <p className="mt-1 text-[11px] uppercase tracking-widest text-white/45">Role Pathways</p>
            </div>
          </div>
        </div>
      </section>

      <main className="flex min-h-screen flex-1 items-center justify-center px-5 py-8 sm:px-8 lg:px-12">
        <div className="w-full max-w-[430px] fade-scale-in">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: '22px' }}>token</span>
            <span className="text-base font-extrabold text-primary">Equine Precision</span>
          </div>

          <div className="rounded-2xl border border-[#e4dfe4] bg-white p-6 shadow-[0_18px_60px_rgba(19,27,46,0.08)] sm:p-7">
            <div className="mb-5">
              <h2 className="text-[28px] font-black leading-tight text-primary">Create account</h2>
              <p className="mt-2 text-sm text-[#8f8191]">Start your journey with Equine Precision</p>
            </div>

            <form className="space-y-3.5" onSubmit={handleSubmit}>
              <div className="flex items-center gap-4 rounded-xl bg-[#faf8fb] p-2.5 ring-1 ring-[#e4dfe4]">
                <label
                  htmlFor="avatarInput"
                  className="flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[#c9c0cb] bg-white transition-all hover:border-primary"
                >
                  {avatarPreview
                    ? <img src={avatarPreview} alt="Avatar preview" className="block h-full w-full object-cover" />
                    : <span className="material-symbols-outlined text-secondary" style={{ fontSize: '26px' }}>add_a_photo</span>
                  }
                </label>
                <div>
                  <p className="text-sm font-bold text-primary">Upload avatar</p>
                  <p className="mt-1 text-xs text-[#8f8191]">Optional profile image</p>
                </div>
                <input id="avatarInput" type="file" accept="image/*" className="hidden" onChange={handleFile} />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#7a6b7c]" htmlFor="fullName">
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  className="w-full rounded-xl border-[1.5px] border-[#e4dfe4] bg-[#faf8fb] px-4 py-2.5 text-sm text-primary outline-none transition-all focus:border-primary"
                  placeholder="Your full name"
                />
              </div>

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
                  className="w-full rounded-xl border-[1.5px] border-[#e4dfe4] bg-[#faf8fb] px-4 py-2.5 text-sm text-primary outline-none transition-all focus:border-primary"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#7a6b7c]" htmlFor="phone">
                  Phone (optional)
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full rounded-xl border-[1.5px] border-[#e4dfe4] bg-[#faf8fb] px-4 py-2.5 text-sm text-primary outline-none transition-all focus:border-primary"
                  placeholder="0912345678"
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
                    autoComplete="new-password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full rounded-xl border-[1.5px] border-[#e4dfe4] bg-[#faf8fb] px-4 py-2.5 pr-11 text-sm text-primary outline-none transition-all focus:border-primary"
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

              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                  <span className="material-symbols-outlined shrink-0" style={{ fontSize: '16px' }}>error</span>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              >
                {loading
                  ? <><span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>progress_activity</span> Creating...</>
                  : <><span>Create Account</span><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span></>
                }
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-[#9e8fa0]">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
