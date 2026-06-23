import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const HERO_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuD0-vvbKuKzOndII80cEAhcJmtERqmNXSjoeCJH731TZ4IG5As2qe-ikMxe8yI0MzSzaV_XRGmvb84Ut3rnM2tflc0EraQ73rblTvmAiGqJMU7Nmrh_hK8eSlgV3RnJ2o7efvEZxsK38bgwpwL8AHvb0JPQH0aGbQXbPJ0xFNtc-wFf7soQW6Ul3JHhVA818UbbWVq8IgZgzIj6JWWQey1oRCsJmL0MKFoqjUs4lhBjLqlVkUTddyjp8NJUVX8SNpt5OLYyHe1DAxPj'
const FEATURE_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMzT4eq5KLGdOtk5G00YmHrk64F0QfX8ZefejO8kvVAvl5l8sVdE46FSyELe0csUIOAoAxh9TxIDd_CFLRCmxrssdhneiC1tSeFKKCNx6g_9Zv-TdbXQg1OOzabecs6z1HoA7tJEJP6XYlaPbhi7zFr3XCbzrzksGddr4fDNmsDy9KX9HPh5i4lgbwfY3cONE5UaQOpfr5qIRCK4uYCMSnS7Q_o5leprOzqCtpQODQCZG-Kpc8h946oEMZptmQvhdpDOsrwdC0Z4Bo'
const BREED_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuB45uXfJV-afsPStKHQVcZT_qQz679pKgv2zm09nt8uSCQoik7qL8K1kZ6gTyEJmKO36TAd3KRoqHKMMJIfUYpdQ04DYlrnZfhwAdMhAoYkH3DGGOWOnZBmnvZ1M7_1LAux1WyexM5RAbo7-rF2Be8GRlmudYoOpGo1zNwvzWt6BFtd2kQBhdIgseJZb7uxBMm6nxRqXYbf-jS9EknKfHJNzFo_7fVINudYi2N7xaAYl5eto0ZP6UEQ4W0wSp8BHypDA1cYFiAtE1Ai'

const RACE_CARDS = [
  {
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDWEK-xEO0bOroC16WRjbD-gCvl6OSQopG-PIj2vHSSVbzHQPt6YeD2Qv0k-cKWhwD7Ifnz5BF2O6oSLFRTibhU8YvkHFeBlXhDrSSETC78Z61q-7Ni8owqmyKGwOqEKeZibUPyANi8ZxwioTS1OjRBRN6aUfarTmG2pY1BnPGCBjpO-nF87Ai6asmrSbxdnVAs1olUpaPLZMkOsXRf19EI-wCPPkMpxKFJPqTjcDgOcZ4XLlONG5solfdCdrQ6RFj7YDqFxmE358RM',
    venue: 'Epsom Downs • 1.2mi', name: 'Grand National Qualifier',
    live: true, time: 'Starts in 04:12',
    odds: [{ horse: 'Silver Streak', odd: '2.40' }, { horse: 'Golden Mane', odd: '4.50' }],
  },
  {
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD7YC-8tv73_6TlItq1iSWy7Jt6qzXPN-ei6M1ZnKVIo3aNgNr9Rrdyj-uA5m8ug6_3Ab1LzHUcbpwD1iTSLxyQahajEILRARSJHazYYyZsO_0SVOBAg6OqPhuI8duUicsfuBm9rYmwY18RYKLaS-OaMQ6Ozq8BRJzV0mu_NXqd0UJIHJLLGOejISQ8pxqm-99T-OQ47oguuFFNiemOeLbAH_GmIOK3ukp5x_ig8pTVstCyqDy6r3u8ZJfTSJW7bdnmLWEcEOCmKskG',
    venue: 'Chantilly • 1.0mi', name: 'Prix de Diane',
    live: false, time: 'Scheduled: 15:30',
    odds: [{ horse: 'Royal Blue', odd: '3.10' }, { horse: 'Noble Gallop', odd: '5.80' }],
  },
  {
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDyZd4wRIEJOa0NDuGzLjh50XLwdjA8UtcXAbtvolQlskI-mcDyYYEqCDBjwT_aZtWrRDgNlxSBCuu2FSFWpy_MIGzfkUQM37gvZ18K1aEbu0keKMbPvbiuffPzeksDojCJSEENOICiZpPml3ZhYGY8Hqii_Ct1_Cw9nPnFBJBJroOC1zr2GVumrirramA-eLdCaeT-QHuflDkQn0Z-_D6DYmHzuYoIw5UYmpOaGwuV4yQ7PRq5D4gqXh-ShJp_HBwZodvumKLTwGTq',
    venue: 'Meydan • 0.8mi', name: 'Dubai World Cup Sprint',
    live: false, time: 'Scheduled: 18:45',
    odds: [{ horse: 'Desert Wind', odd: '1.95' }, { horse: 'Oasis Shadow', odd: '8.20' }],
  },
]

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-surface-bright font-body-md">

      {/* ── Navbar ── */}
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-md' : 'bg-white shadow-sm'}`}
        style={{ borderBottom: '1px solid #e4dfe4' }}>
        <div className="flex justify-between items-center px-8 py-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '22px' }}>token</span>
              <span className="font-extrabold text-primary text-base tracking-tight">Equine Precision</span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm font-semibold text-primary border-b-2 border-primary pb-0.5">Races</a>
              <a href="#markets" className="text-sm text-secondary hover:text-primary transition-colors">Markets</a>
              <a href="#cta" className="text-sm text-secondary hover:text-primary transition-colors">About</a>
              <Link to="/login" className="text-sm font-semibold text-secondary hover:text-primary transition-colors">
                Log In
              </Link>
              <Link to="/register"
                className="px-4 py-2 bg-primary text-white rounded-full text-sm font-semibold hover:opacity-90 transition-opacity">
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow">

        {/* ── Hero ── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 overflow-hidden" style={{ minHeight: 'calc(100vh - 57px)' }}>
          {/* Left */}
          <div className="flex flex-col justify-center px-8 md:px-16 py-16 lg:py-0 bg-white">
            <div className="max-w-xl">
              <span className="inline-block px-3 py-1 bg-secondary-container text-on-secondary-container text-xs font-bold rounded mb-6 uppercase tracking-widest">
                Elite Tier Management
              </span>
              <h1 className="text-5xl md:text-6xl font-black text-primary leading-tight mb-6 tracking-tight" style={{ letterSpacing: '-0.02em' }}>
                The Future of Equestrian Management
              </h1>
              <p className="text-base text-secondary leading-relaxed mb-10">
                Experience the most sophisticated platform for equestrian professionals. Manage lineages, track race analytics, and engage in real-time betting with precision.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/register"
                  className="px-8 py-4 bg-primary text-white font-bold text-base rounded-xl shadow-md hover:scale-[1.02] active:scale-[0.98] transition-transform text-center">
                  Join Now
                </Link>
                <a href="#features"
                  className="px-8 py-4 border-2 border-outline-variant text-primary font-bold text-base rounded-xl hover:bg-surface-container transition-colors text-center">
                  Learn More
                </a>
              </div>
              <div className="mt-12 pt-8 flex gap-10" style={{ borderTop: '1px solid #e4dfe4' }}>
                {[['500+', 'Active Stables'], ['12k', 'Horses Tracked'], ['$4.2M', 'Prizes Managed']].map(([val, label]) => (
                  <div key={label}>
                    <p className="text-2xl font-black text-primary">{val}</p>
                    <p className="text-xs font-bold text-secondary uppercase tracking-wider mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="relative min-h-[400px] lg:min-h-full overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
              style={{ backgroundImage: `url('${HERO_IMG}')` }} />
            <div className="absolute inset-0 bg-gradient-to-r from-white lg:from-transparent via-transparent to-transparent" />
          </div>
        </section>

        {/* ── Features Bento Grid ── */}
        <section id="features" className="py-20 px-8 md:px-16 max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-black text-primary tracking-tight mb-4">Engineered for Performance</h2>
            <p className="text-base text-secondary max-w-2xl mx-auto leading-relaxed">
              A comprehensive suite of tools designed for owners, jockeys, and professional bettors who demand excellence.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5" style={{ gridAutoRows: '240px' }}>
            {/* Tournament — large */}
            <div className="md:col-span-8 md:row-span-2 bg-white rounded-2xl shadow-sm border border-outline-variant overflow-hidden group hover:shadow-md transition-shadow flex flex-col">
              <div className="p-6 flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-primary-container rounded-xl">
                    <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1", fontSize: '22px' }}>calendar_today</span>
                  </div>
                  <span className="px-3 py-1 border border-primary text-primary rounded-full text-xs font-bold tracking-widest">LIVE</span>
                </div>
                <h3 className="text-xl font-black text-primary mb-2">Tournament Management</h3>
                <p className="text-sm text-secondary leading-relaxed flex-grow">
                  A professional-grade system for scheduling, registration, and heat management. Seamlessly handle thousands of entries with automated bracket generation.
                </p>
                <div className="mt-4 rounded-xl overflow-hidden" style={{ border: '1px solid #e4dfe4' }}>
                  <div className="w-full h-44 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                    style={{ backgroundImage: `url('${FEATURE_IMG}')` }} />
                </div>
              </div>
            </div>

            {/* Real-Time Betting */}
            <div className="md:col-span-4 bg-primary text-white rounded-2xl p-6 flex flex-col justify-between group hover:opacity-95 transition-opacity">
              <div>
                <span className="material-symbols-outlined mb-4 block" style={{ fontVariationSettings: "'FILL' 1", fontSize: '28px' }}>payments</span>
                <h3 className="text-lg font-black">Real-Time Betting</h3>
              </div>
              <p className="text-sm opacity-75 leading-relaxed">Instant payouts and dynamic odds calculation with millisecond latency.</p>
            </div>

            {/* Analytics */}
            <div className="md:col-span-4 bg-secondary-container rounded-2xl p-6 flex flex-col justify-between group hover:shadow-inner transition-all">
              <div>
                <span className="material-symbols-outlined text-on-secondary-container mb-4 block" style={{ fontVariationSettings: "'FILL' 1", fontSize: '28px' }}>analytics</span>
                <h3 className="text-lg font-black text-on-secondary-container">Professional Analytics</h3>
              </div>
              <p className="text-sm text-on-secondary-container/70 leading-relaxed">Deep-dive into pedigree, track conditions, and historical performance metrics.</p>
            </div>

            {/* Breeding */}
            <div className="md:col-span-6 bg-surface-container rounded-2xl p-6 flex gap-6 items-center overflow-hidden">
              <div className="flex-1">
                <h3 className="text-xl font-black text-primary mb-2">Breeding Engine</h3>
                <p className="text-sm text-secondary leading-relaxed">Predict offspring success rates with our proprietary genetic mapping algorithm.</p>
              </div>
              <div className="w-1/3 h-full rounded-xl bg-cover bg-center shrink-0"
                style={{ backgroundImage: `url('${BREED_IMG}')` }} />
            </div>

            {/* Global Network */}
            <div className="md:col-span-6 bg-inverse-surface rounded-2xl p-6 flex gap-5 items-center">
              <div className="p-3 bg-white/10 rounded-full shrink-0">
                <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1", fontSize: '26px' }}>public</span>
              </div>
              <div>
                <h3 className="text-xl font-black text-white mb-1">Global Network</h3>
                <p className="text-sm text-white/60 leading-relaxed">Connect with elite breeders and trainers across 45 countries in our verified ecosystem.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Live Markets ── */}
        <section id="markets" className="py-20 bg-surface-container-low">
          <div className="px-8 md:px-16 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
              <div>
                <h2 className="text-3xl font-black text-primary tracking-tight">Live Markets</h2>
                <p className="text-sm text-secondary mt-1">Real-time data feeds from current events globally.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {RACE_CARDS.map((card, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-outline-variant flex flex-col">
                  <div className="h-36 bg-cover bg-center" style={{ backgroundImage: `url('${card.img}')` }} />
                  <div className="p-5">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-secondary uppercase tracking-wider">{card.venue}</span>
                      {card.live
                        ? <span className="flex items-center gap-1 text-error text-xs font-bold">
                            <span className="w-2 h-2 rounded-full bg-error animate-pulse" />{card.time}
                          </span>
                        : <span className="text-xs text-secondary font-medium">{card.time}</span>
                      }
                    </div>
                    <h4 className="text-base font-black text-primary mb-4">{card.name}</h4>
                    <div className="space-y-2">
                      {card.odds.map((o, j) => (
                        <div key={j} className={`flex justify-between items-center px-3 py-2 rounded-lg ${j === 0 ? 'bg-surface-container' : ''}`}>
                          <span className="text-sm text-primary">{o.horse}</span>
                          <span className="text-sm font-black text-primary">{o.odd}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section id="cta" className="py-24 bg-primary text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="grid grid-cols-12 h-full">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="border-r border-white/20" />
              ))}
            </div>
          </div>
          <div className="relative max-w-3xl mx-auto text-center px-8">
            <h2 className="text-5xl font-black mb-5 tracking-tight" style={{ letterSpacing: '-0.02em' }}>Ready to join the elite?</h2>
            <p className="text-base opacity-80 mb-10 leading-relaxed max-w-xl mx-auto">
              Unlock professional-grade tools, real-time data, and a global network of horse racing professionals today.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/register"
                className="px-8 py-4 bg-white text-primary font-black rounded-xl shadow-xl hover:bg-surface-container transition-all hover:scale-[1.02] text-center">
                Create Your Account
              </Link>
              <Link to="/login"
                className="px-8 py-4 text-white font-bold rounded-xl hover:bg-white/10 transition-all text-center"
                style={{ border: '2px solid rgba(255,255,255,0.3)' }}>
                Sign In
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-inverse-surface">
        <div className="py-8 px-8 md:px-16 flex flex-col md:flex-row justify-between items-center gap-5 max-w-7xl mx-auto">
          <div className="flex flex-col items-center md:items-start gap-1">
            <span className="font-black text-white text-base">Equine Precision</span>
            <p className="text-xs text-white/50">© 2025 Equine Precision Management. All rights reserved.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            {['Terms of Service', 'Privacy Policy', 'Contact Support'].map(t => (
              <a key={t} href="#" className="text-xs text-white/50 hover:text-white transition-colors">{t}</a>
            ))}
          </div>
          <div className="flex gap-4">
            {['face_nod', 'public', 'share'].map(icon => (
              <a key={icon} href="#" className="text-white/50 hover:text-white transition-colors">
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{icon}</span>
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
