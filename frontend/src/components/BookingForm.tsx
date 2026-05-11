import { useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { format, parseISO } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { functions } from '../lib/firebase'
import { PRICE_PER_PAX_USD, MAX_SPOTS } from '../lib/constants'

interface Props {
  selectedDate: string
  availableSpots: number
}

export default function BookingForm({ selectedDate, availableSpots }: Props) {
  const [pax,     setPax]     = useState(1)
  const [name,    setName]    = useState('')
  const [email,   setEmail]   = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const maxPax     = Math.min(availableSpots, MAX_SPOTS)
  const totalPrice = PRICE_PER_PAX_USD * pax

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim())                 return setError('Please enter your name.')
    if (!/\S+@\S+\.\S+/.test(email)) return setError('Please enter a valid email.')

    setLoading(true)
    try {
      const createBooking = httpsCallable<
        { date: string; pax: number; customerName: string; customerEmail: string },
        { bookingId: string }
      >(functions, 'createBooking')

      await createBooking({
        date:          selectedDate,
        pax,
        customerName:  name.trim(),
        customerEmail: email.trim().toLowerCase(),
      })

      navigate('/booking/success')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-5">
      <h2 className="text-xl font-bold text-stone-800">Your Details</h2>

      {/* Date summary */}
      <div className="bg-brand-50 rounded-xl px-4 py-3 flex items-center gap-3">
        <span className="text-2xl">📅</span>
        <div>
          <p className="text-xs text-stone-500 font-medium uppercase tracking-wide">Tour Date</p>
          <p className="text-stone-800 font-semibold">{format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}</p>
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1" htmlFor="name">Full Name</label>
        <input
          id="name" type="text" value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Smith" required
          className="w-full border border-stone-300 rounded-xl px-4 py-3 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
        />
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1" htmlFor="email">Email Address</label>
        <input
          id="email" type="email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@example.com" required
          className="w-full border border-stone-300 rounded-xl px-4 py-3 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
        />
      </div>

      {/* Number of people */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Number of People</label>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setPax((p) => Math.max(1, p - 1))}
            className="w-11 h-11 rounded-full border border-stone-300 text-stone-600 text-xl font-bold flex items-center justify-center hover:bg-stone-50 transition-colors"
            aria-label="Decrease people">−</button>
          <span className="w-12 text-center text-2xl font-bold text-stone-800">{pax}</span>
          <button type="button" onClick={() => setPax((p) => Math.min(maxPax, p + 1))}
            className="w-11 h-11 rounded-full border border-stone-300 text-stone-600 text-xl font-bold flex items-center justify-center hover:bg-stone-50 transition-colors"
            aria-label="Increase people">+</button>
          <span className="text-sm text-stone-500">({maxPax} spots left)</span>
        </div>
      </div>

      {/* Price */}
      <div className="bg-stone-50 rounded-xl p-4 space-y-2 text-sm">
        <div className="flex justify-between text-stone-600">
          <span>{pax} × ${PRICE_PER_PAX_USD} per person</span>
          <span>${totalPrice}</span>
        </div>
        <div className="border-t border-stone-200 pt-2 flex justify-between font-semibold text-stone-800">
          <span>Total — payable in cash to guide</span>
          <span className="text-brand-600">${totalPrice}</span>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <button type="submit" disabled={loading}
        className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-lg transition-colors">
        {loading ? 'Confirming booking…' : 'Confirm Booking →'}
      </button>

      <p className="text-xs text-center text-stone-400">
        No online payment required. Your guide will collect the full amount in cash on the day.
      </p>
    </form>
  )
}
