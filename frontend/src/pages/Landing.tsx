import { Link } from 'react-router-dom'

const HIGHLIGHTS = [
  { icon: '🏍️', title: 'Authentic Local Experience', desc: 'Ride with lifelong Ha Giang locals who know every hidden trail and family guesthouse.' },
  { icon: '🌄', title: 'Karst Mountain Scenery', desc: 'Navigate UNESCO-listed limestone peaks and terraced rice fields few tourists ever see.' },
  { icon: '💰', title: 'Fair & Transparent Pricing', desc: 'Pay just 20% online to secure your spot. The rest goes directly to your guide in cash.' },
  { icon: '📱', title: 'Small Groups Only', desc: 'Max 8 people per departure — personalised attention, not a convoy.' },
]

const ITINERARY = [
  { day: 1, title: 'Ha Giang → Quan Ba', desc: 'Depart Ha Giang city, cross Heaven\'s Gate Pass, and descend into the Twin Mountain valley.' },
  { day: 2, title: 'Quan Ba → Dong Van', desc: 'Wind through Yen Minh pine forests before reaching the ancient Old Quarter of Dong Van.' },
  { day: 3, title: 'Dong Van → Meo Vac', desc: 'The legendary Ma Pi Leng Pass — arguably Vietnam\'s most dramatic road.' },
  { day: 4, title: 'Meo Vac → Ha Giang', desc: 'Descend through river gorges back to the city. Farewell dinner with your guide.' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-stone-900 via-stone-800 to-brand-900 text-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-20 bg-cover bg-center"
          style={{ backgroundImage: 'url(/hero-bg.jpg)' }}
          aria-hidden="true"
        />
        <div className="relative max-w-4xl mx-auto px-6 py-20 text-center">
          <p className="text-brand-300 font-semibold text-sm uppercase tracking-widest mb-4">
            Northern Vietnam's Most Spectacular Route
          </p>
          <h1 className="text-4xl sm:text-6xl font-black leading-tight mb-6">
            The Ha Giang Loop<br />
            <span className="text-brand-400">with Local Guides</span>
          </h1>
          <p className="text-lg sm:text-xl text-stone-300 max-w-2xl mx-auto mb-10">
            A 4-day motorbike journey through Vietnam's untamed far north — arranged for
            you by people who were born here. Secure your spot with a <strong className="text-white">20% deposit</strong>,
            pay the rest to your guide in cash.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/book"
              className="bg-brand-500 hover:bg-brand-400 text-white font-bold text-lg px-8 py-4 rounded-2xl transition-colors shadow-lg"
            >
              Book Your Spot →
            </Link>
            <a
              href="#how-it-works"
              className="border border-white/30 hover:border-white/60 text-white font-semibold text-lg px-8 py-4 rounded-2xl transition-colors"
            >
              How It Works
            </a>
          </div>
          <p className="mt-8 text-stone-400 text-sm">
            $120 / person · 4 days · Small groups max 8
          </p>
        </div>
      </section>

      {/* Highlights */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-black text-center text-stone-800 mb-12">Why Ride With Us</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {HIGHLIGHTS.map((h) => (
            <div key={h.title} className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm flex gap-4">
              <span className="text-4xl flex-shrink-0">{h.icon}</span>
              <div>
                <h3 className="font-bold text-lg text-stone-800 mb-1">{h.title}</h3>
                <p className="text-stone-500 text-sm leading-relaxed">{h.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Itinerary */}
      <section className="bg-white py-16 border-y border-stone-200">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-black text-center text-stone-800 mb-12">4-Day Itinerary</h2>
          <div className="space-y-0">
            {ITINERARY.map((item, idx) => (
              <div key={item.day} className="flex gap-4">
                {/* Timeline */}
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {item.day}
                  </div>
                  {idx < ITINERARY.length - 1 && (
                    <div className="w-0.5 bg-brand-200 flex-1 my-1" />
                  )}
                </div>
                {/* Content */}
                <div className={`pb-8 ${idx === ITINERARY.length - 1 ? '' : ''}`}>
                  <h3 className="font-bold text-stone-800 mb-1">{item.title}</h3>
                  <p className="text-stone-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-black text-center text-stone-800 mb-12">How Booking Works</h2>
        <div className="space-y-4">
          {[
            { n: '01', title: 'Pick a Date', desc: 'Choose from available dates on our live calendar. Spots are limited to 8 per day.' },
            { n: '02', title: 'Pay 20% Online', desc: 'Secure your place with a deposit via Stripe. This is non-refundable and confirms your booking.' },
            { n: '03', title: 'Meet Your Guide', desc: 'We\'ll send full details by email. Your guide will be waiting for you in Ha Giang city.' },
            { n: '04', title: 'Pay the Rest in Cash', desc: 'Bring the remaining 80% in cash (VND or USD). It goes straight to your guide.' },
          ].map((step) => (
            <div key={step.n} className="flex gap-5 items-start bg-white rounded-2xl p-5 border border-stone-200 shadow-sm">
              <span className="text-3xl font-black text-brand-200 leading-none flex-shrink-0">{step.n}</span>
              <div>
                <h3 className="font-bold text-stone-800 mb-1">{step.title}</h3>
                <p className="text-stone-500 text-sm">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-500 py-16 text-center">
        <div className="max-w-xl mx-auto px-6">
          <h2 className="text-3xl font-black text-white mb-4">Ready to Ride?</h2>
          <p className="text-brand-100 mb-8">Spots fill up fast, especially October–April. Book now to avoid missing out.</p>
          <Link
            to="/book"
            className="inline-block bg-white text-brand-600 font-bold text-xl px-10 py-4 rounded-2xl hover:bg-brand-50 transition-colors shadow-lg"
          >
            Check Availability →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-stone-400 text-sm border-t border-stone-200">
        <p>Ha Giang Loop Tours · <a href="mailto:info@hagiangloop.com" className="underline">info@hagiangloop.com</a></p>
        <p className="mt-1">Guide login: <Link to="/guide/login" className="underline">Staff Portal →</Link></p>
      </footer>
    </div>
  )
}
