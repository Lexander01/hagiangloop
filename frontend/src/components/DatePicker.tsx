import { useState, useEffect } from 'react'
import {
  collection, getDocs, query, where, orderBy, limit,
} from 'firebase/firestore'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  addMonths, subMonths, isBefore, startOfDay, getDay,
} from 'date-fns'
import { db } from '../lib/firebase'
import type { AvailabilityDay } from '../lib/types'
import { MAX_SPOTS } from '../lib/constants'

interface Props {
  selectedDate: string | null
  onSelect: (date: string) => void
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function DatePicker({ selectedDate, onSelect }: Props) {
  const [viewMonth, setViewMonth] = useState(new Date())
  const [availability, setAvailability] = useState<Record<string, AvailabilityDay>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchMonth() {
      setLoading(true)
      const start = format(startOfMonth(viewMonth), 'yyyy-MM-dd')
      const end   = format(endOfMonth(viewMonth),   'yyyy-MM-dd')
      const snap  = await getDocs(
        query(
          collection(db, 'availability'),
          where('__name__', '>=', start),
          where('__name__', '<=', end),
          orderBy('__name__'),
          limit(31),
        ),
      )
      if (cancelled) return
      const map: Record<string, AvailabilityDay> = {}
      snap.forEach((d) => { map[d.id] = d.data() as AvailabilityDay })
      setAvailability(map)
      setLoading(false)
    }
    fetchMonth()
    return () => { cancelled = true }
  }, [viewMonth])

  const days = eachDayOfInterval({
    start: startOfMonth(viewMonth),
    end:   endOfMonth(viewMonth),
  })

  const today = startOfDay(new Date())

  function isUnavailable(date: Date): boolean {
    const key = format(date, 'yyyy-MM-dd')
    if (isBefore(date, today)) return true
    const avail = availability[key]
    if (!avail) return false
    if (avail.is_blocked) return true
    const spots = avail.total_spots ?? MAX_SPOTS
    return avail.booked_spots >= spots
  }

  function spotsLeft(date: Date): number {
    const key  = format(date, 'yyyy-MM-dd')
    const avail = availability[key]
    const total = avail?.total_spots ?? MAX_SPOTS
    const booked = avail?.booked_spots ?? 0
    return Math.max(0, total - booked)
  }

  const leadingBlanks = getDay(startOfMonth(viewMonth))

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-brand-500 text-white">
        <button
          onClick={() => setViewMonth((m) => subMonths(m, 1))}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors text-xl font-bold"
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="font-semibold text-lg">
          {format(viewMonth, 'MMMM yyyy')}
        </span>
        <button
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors text-xl font-bold"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 bg-stone-50 border-b border-stone-100">
        {DAY_LABELS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-stone-400 uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="h-52 flex items-center justify-center text-stone-400 text-sm">
          Loading availability…
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-px bg-stone-100">
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`blank-${i}`} className="bg-white" />
          ))}
          {days.map((day) => {
            const key       = format(day, 'yyyy-MM-dd')
            const disabled  = isUnavailable(day)
            const selected  = selectedDate === key
            const left      = spotsLeft(day)
            const isPast    = isBefore(day, today)

            return (
              <button
                key={key}
                disabled={disabled}
                onClick={() => onSelect(key)}
                className={[
                  'bg-white flex flex-col items-center justify-center py-2 min-h-[3.5rem] transition-colors',
                  selected
                    ? 'bg-brand-500 text-white ring-2 ring-brand-500 ring-inset'
                    : disabled
                    ? 'text-stone-300 cursor-not-allowed'
                    : 'hover:bg-brand-50 text-stone-800 cursor-pointer',
                ].join(' ')}
                aria-pressed={selected}
                aria-label={`${format(day, 'MMMM d')}${disabled ? ', unavailable' : `, ${left} spots left`}`}
              >
                <span className="text-sm font-semibold leading-none">{format(day, 'd')}</span>
                {!isPast && !disabled && (
                  <span className={`text-[10px] mt-0.5 font-medium ${selected ? 'text-white/80' : 'text-emerald-600'}`}>
                    {left} left
                  </span>
                )}
                {!isPast && disabled && !isBefore(day, today) && (
                  <span className="text-[10px] mt-0.5 text-stone-300">Full</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      <div className="px-4 py-2 bg-stone-50 flex gap-4 text-xs text-stone-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-brand-500 inline-block" /> Selected
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-stone-200 inline-block" /> Unavailable
        </span>
      </div>
    </div>
  )
}
