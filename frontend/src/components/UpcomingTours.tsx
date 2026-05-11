import { useState, useEffect } from 'react'
import {
  collection, query, where, orderBy, onSnapshot,
} from 'firebase/firestore'
import { format, parseISO, isToday, isTomorrow } from 'date-fns'
import { db } from '../lib/firebase'
import type { Booking } from '../lib/types'

function dateLabel(dateStr: string): string {
  const d = parseISO(dateStr)
  if (isToday(d))    return '🟢 TODAY'
  if (isTomorrow(d)) return '🟡 TOMORROW'
  return format(d, 'EEE, MMM d')
}

export default function UpcomingTours() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const q = query(
      collection(db, 'bookings'),
      where('status', '==', 'confirmed'),
      where('date',   '>=', today),
      orderBy('date'),
    )
    const unsub = onSnapshot(q, (snap) => {
      setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking)))
      setLoading(false)
    })
    return unsub
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (bookings.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8 py-16">
        <span className="text-6xl">🏕️</span>
        <p className="text-2xl font-bold text-stone-700">No upcoming tours</p>
        <p className="text-stone-400">New bookings will appear here automatically.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="space-y-3 p-4">
        {bookings.map((b) => (
          <div
            key={b.id}
            className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden"
          >
            {/* Date banner */}
            <div className="bg-brand-500 text-white px-4 py-2">
              <span className="font-bold text-lg tracking-wide">{dateLabel(b.date)}</span>
            </div>

            <div className="px-4 py-4 space-y-3">
              {/* Customer + pax */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xl font-bold text-stone-800 leading-tight">{b.customer_name}</p>
                  <p className="text-stone-500 text-sm">{b.customer_email}</p>
                </div>
                <div className="bg-brand-50 rounded-xl px-3 py-2 text-center min-w-[4rem]">
                  <p className="text-3xl font-black text-brand-600 leading-none">{b.pax}</p>
                  <p className="text-xs text-stone-500 font-medium">people</p>
                </div>
              </div>

              {/* Cash due — the most important number for the guide */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Collect in Cash</p>
                  <p className="text-xs text-emerald-600">80% balance due on arrival</p>
                </div>
                <p className="text-3xl font-black text-emerald-700">${b.cash_due}</p>
              </div>

              {/* Deposit reference */}
              <p className="text-xs text-stone-400 text-center">
                ${b.deposit_paid} deposit already paid online
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
