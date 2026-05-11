import { Link } from 'react-router-dom'

export default function BookingSuccess() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="bg-white rounded-3xl shadow-sm border border-stone-200 max-w-md w-full p-8 space-y-6">
        <div className="text-7xl">🎉</div>

        <div>
          <h1 className="text-3xl font-black text-stone-800 mb-2">You're Booked!</h1>
          <p className="text-stone-500 leading-relaxed">
            Your spot is confirmed. We'll be in touch by email with all the details.
          </p>
        </div>

        <div className="bg-brand-50 rounded-2xl p-5 text-left space-y-2">
          <h2 className="font-bold text-stone-700 text-sm uppercase tracking-wide">What Happens Next</h2>
          <ul className="space-y-2 text-sm text-stone-600">
            <li className="flex gap-2"><span>✉️</span><span>Confirmation email with meeting point details</span></li>
            <li className="flex gap-2"><span>💵</span><span>Bring the full tour price in cash for your guide</span></li>
            <li className="flex gap-2"><span>🏍️</span><span>Meet your guide in Ha Giang city at 7:30am</span></li>
          </ul>
        </div>

        <Link to="/"
          className="block w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 rounded-xl transition-colors">
          Back to Home
        </Link>
      </div>
    </div>
  )
}
