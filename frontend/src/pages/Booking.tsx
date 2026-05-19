import { useState } from 'react'
import { Link } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { AvailabilityDay } from '../lib/types'
import { MAX_SPOTS } from '../lib/constants'
import DatePicker from '../components/DatePicker'
import BookingForm from '../components/BookingForm'

export default function Booking() {
  const [selectedDate,     setSelectedDate]     = useState<string | null>(null)
  const [availableSpots,   setAvailableSpots]   = useState(MAX_SPOTS)
  const [loadingSpots,     setLoadingSpots]     = useState(false)

  async function handleSelectDate(date: string) {
    setSelectedDate(date)
    setLoadingSpots(true)
    try {
      const snap = await getDoc(doc(db, 'availability', date))
      if (!snap.exists()) {
        setAvailableSpots(MAX_SPOTS)
      } else {
        const avail = snap.data() as AvailabilityDay
        const spots = (avail.total_spots ?? MAX_SPOTS) - (avail.booked_spots ?? 0)
        setAvailableSpots(Math.max(0, spots))
      }
    } finally {
      setLoadingSpots(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Nav */}
      <nav className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-brand-600 font-bold text-sm flex items-center gap-1">
            ← Back
          </Link>
          <span className="font-bold text-stone-800">Book Your Tour</span>
          <div className="w-12" />
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-black text-stone-800 mb-2">Choose Your Date</h1>
          <p className="text-stone-500">
            Select an available date below. Green dates have open spots.
          </p>
        </div>

        <DatePicker
          selectedDate={selectedDate}
          onSelect={handleSelectDate}
        />

        {selectedDate && !loadingSpots && availableSpots > 0 && (
          <BookingForm
            selectedDate={selectedDate}
            availableSpots={availableSpots}
          />
        )}

        {selectedDate && !loadingSpots && availableSpots === 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-red-700 font-semibold text-lg">This date is now fully booked.</p>
            <p className="text-red-500 text-sm mt-1">Please select another date above.</p>
          </div>
        )}

        {selectedDate && loadingSpots && (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}
