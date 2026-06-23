import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register as apiRegister } from '../../api/auth'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' })
  const [avatar, setAvatar] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100vh' }}>
      <section className="relative hidden md:flex flex-col justify-between p-xl overflow-hidden bg-primary-container">
        <div className="absolute inset-0 z-0">
          <img alt="Horse racing" className="w-full h-full object-cover opacity-40 mix-blend-overlay"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuB3eLTlYFUsxv3P0XHL0W45C41MvRcla34V5KAHrjV00VAVNjT1ze0Mehw5mVbXzkCbU9aRof1WbP3RNRwA3LZ5gBDeR7nTU7sAtKn1GcTcumQOoUa6u1J2xTBJUXBK-kRnzn1knmK9ewnTnBXi7M1UjZUB8jyCfFk0MQOykhDpbt9C69P2b6xBojgDBgqyC40ATb0iGyjhmel0YX2ocwZRkHt3GMqq_LFp5nc7xDs4wikcpJYcPI-dGuQB4zXIq7QceI1MiZILxxBG" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary-container/90 to-primary-container/40" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-sm mb-xl">
            <span className="material-symbols-outlined text-on-primary text-3xl">token</span>
            <span className="font-headline-md text-on-primary font-black tracking-tight">Equine Precision</span>
          </div>
          <h1 className="text-display-lg text-on-primary mb-md">Join the Racing Community</h1>
          <p className="text-body-lg text-secondary-fixed/80">Create your account to access the full horse racing management experience.</p>
        </div>
      </section>

      <main className="flex flex-col bg-surface-bright overflow-y-auto">
        <div className="flex-1 flex items-center justify-center py-xl px-margin-mobile md:px-xl">
          <div className="w-full max-w-sm space-y-xl fade-scale-in">
            <div>
              <h2 className="text-headline-lg text-primary">Create account</h2>
              <p className="text-body-md text-on-surface-variant mt-sm">Start your journey with Equine Precision</p>
            </div>

            <form className="space-y-md" onSubmit={handleSubmit}>
              {/* Avatar */}
              <div className="flex flex-col items-center gap-sm">
                <div
                  className="w-20 h-20 rounded-full bg-surface-container-high border-2 border-dashed border-outline-variant cursor-pointer hover:border-primary transition-all overflow-hidden flex items-center justify-center"
                  onClick={() => document.getElementById('avatarInput').click()}
                >
                  {avatarPreview
                    ? <img src={avatarPreview} alt="preview" className="w-full h-full object-cover block" />
                    : <span className="material-symbols-outlined text-secondary text-3xl">add_a_photo</span>
                  }
                </div>
                <input id="avatarInput" type="file" accept="image/*" className="hidden" onChange={handleFile} />
                <span className="text-label-md text-secondary">Upload avatar (optional)</span>
              </div>

              <div className="space-y-xs">
                <label className="text-label-md text-secondary uppercase tracking-widest">Full Name</label>
                <input type="text" required value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  className="w-full p-md rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md bg-surface-container-lowest"
                  placeholder="Your full name" />
              </div>
              <div className="space-y-xs">
                <label className="text-label-md text-secondary uppercase tracking-widest">Email</label>
                <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full p-md rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md bg-surface-container-lowest"
                  placeholder="you@example.com" />
              </div>
              <div className="space-y-xs">
                <label className="text-label-md text-secondary uppercase tracking-widest">Phone (optional)</label>
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full p-md rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md bg-surface-container-lowest"
                  placeholder="0912345678" />
              </div>
              <div className="space-y-xs">
                <label className="text-label-md text-secondary uppercase tracking-widest">Password</label>
                <input type="password" required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full p-md rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md bg-surface-container-lowest"
                  placeholder="••••••••" />
              </div>

              {error && <p className="text-sm text-error">{error}</p>}

              <button type="submit" disabled={loading}
                className="w-full h-14 bg-primary text-on-primary rounded-lg font-title-lg hover:opacity-90 transition-all active:scale-[0.98] flex items-center justify-center gap-sm disabled:opacity-60">
                {loading
                  ? <><span className="material-symbols-outlined animate-spin">progress_activity</span> Creating...</>
                  : 'Create Account'
                }
              </button>
            </form>

            <p className="text-center text-body-md text-on-surface-variant">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
