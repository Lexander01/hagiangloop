import { useState, useEffect } from 'react'
import {
  collection, getDocs, query, orderBy, limit, documentId, where,
  doc, setDoc, updateDoc,
} from 'firebase/firestore'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  addMonths, subMonths, isBefore, startOfDay, getDay,
} from 'date-fns'
import { db } from '../lib/firebase'
import type { AvailabilityDay } from '../lib/types'
import { MAX_SPOTS } from '../lib/constants'

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function ManageAvailability() {
  const [viewMonth,    setViewMonth]    = useState(new Date())
  const [availability, setAvailability] = useState<Record<string, AvailabilityDay>>({})
  const [loading,      setLoading]      = useState(true)
  const [toggling,     setToggling]     = useState<string | null>(null)

  async function fetchMonth(month: Date) {
    setLoading(true)
    const start = format(startOfMonth(month), 'yyyy-MM-dd')
    const end   = format(endOfMonth(month),   'yyyy-MM-dd')
    const snap  = await getDocs(
      query(
        collection(db, 'availability'),
        where(documentId(), '>=', start),
        where(documentId(), '<=', end),
        orderBy(documentId()),
        limit(31),
      ),
    )
    const map: Record<string, AvailabilityDay> = {}
    snap.forEach((d) => { map[d.id] = d.data() as AvailabilityDay })
    setAvailability(map)
    setLoading(false)
  }

  useEffect(() => { fetchMonth(viewMonth) }, [viewMonth])

  async function toggleBlock(dateStr: string) {
    setToggling(dateStr)
    const ref     = doc(db, 'availability', dateStr)
    const current = availability[dateStr]

    try {
      if (!current) {
        // Document doesn't exist yet — create it as blocked
        const newDoc: AvailabilityDay = {
          date:         dateStr,
          total_spots:  MAX_SPOTS,
          booked_spots: 0,
          is_blocked:   true,
        }
        await setDoc(ref, newDoc)
        setAvailability((prev) => ({ ...prev, [dateStr]: newDoc }))
      } else {
        const newBlocked = !current.is_blocked
        await updateDoc(ref, { is_blocked: newBlocked })
        setAvailability((prev) => ({
          ...prev,
          [dateStr]: { ...current, is_blocked: newBlocked },
        }))
      }
    } finally {
      setToggling(null)
    }
  }

  const days          = eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) })
  const today         = startOfDay(new Date())
  const leadingBlanks = getDay(startOfMonth(viewMonth))

  function cellState(day: Date): 'past' | 'blocked' | 'booked' | 'open' {
    if (isBefore(day, today)) return 'past'
    const key  = format(day, 'yyyy-MM-dd')
    const avail = availability[key]
    if (avail?.is_blocked) return 'blocked'
    if (avail && avail.booked_spots >= (avail.total_spots ?? MAX_SPOTS)) return 'booked'
    return 'open'
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Month nav */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-stone-200">
        <button
          onClick={() => setViewMonth((m) => subMonths(m, 1))}
          className="w-12 h-12 rounded-full flex items-center justify-center text-2xl text-stone-600 hover:bg-stone-100 active:bg-stone-200 transition-colors"
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="text-xl font-bold text-stone-800">
          {format(viewMonth, 'MMMM yyyy')}
        </span>
        <button
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          className="w-12 h-12 rounded-full flex items-center justify-center text-2xl text-stone-600 hover:bg-stone-100 active:bg-stone-200 transition-colors"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 bg-stone-50 border-b border-stone-100">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="py-2 text-center text-xs font-bold text-stone-400 uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-7 gap-px bg-stone-200">
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <div key={`b${i}`} className="bg-stone-50 min-h-[4rem]" />
            ))}

            {days.map((day) => {
              const key   = format(day, 'yyyy-MM-dd')
              const state = cellState(day)
              const isPast = state === 'past'
              const isToggling = toggling === key
              const avail  = availability[key]
              const booked = avail?.booked_spots ?? 0

              return (
                <button
                  key={key}
                  disabled={isPast || state === 'booked' || isToggling}
                  onClick={() => toggleBlock(key)}
                  className={[
                    'flex flex-col items-center justify-center min-h-[4rem] transition-colors active:scale-95',
                    isPast
                      ? 'bg-stone-100 cursor-not-allowed'
                      : state === 'blocked'
                      ? 'bg-red-100 hover:bg-red-200 active:bg-red-300 cursor-pointer'
                      : state === 'booked'
                      ? 'bg-orange-50 cursor-not-allowed'
                      : 'bg-white hover:bg-green-50 active:bg-green-100 cursor-pointer',
                  ].join(' ')}
                  aria-label={`${format(day, 'MMMM d')}: ${state}`}
                >
                  <span className={[
                    'text-base font-bold leading-none',
                    isPast             ? 'text-stone-300'
                    : state === 'blocked' ? 'text-red-700'
                    : state === 'booked'  ? 'text-orange-600'
                    : 'text-stone-800',
                  ].join(' ')}>
                    {format(day, 'd')}
                  </span>

                  {isToggling ? (
                    <span className="text-[10px] text-stone-400 mt-0.5">…</span>
                  ) : state === 'blocked' ? (
                    <span className="text-[10px] text-red-600 font-semibold mt-0.5">BLOCKED</span>
                  ) : state === 'booked' ? (
                    <span className="text-[10px] text-orange-500 font-semibold mt-0.5">FULL ({booked})</span>
                  ) : !isPast && booked > 0 ? (
                    <span className="text-[10px] text-emerald-600 mt-0.5">{booked} booked</span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="px-4 py-3 bg-white border-t border-stone-200 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-white border border-stone-300 inline-block" />Open — tap to block</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-100 inline-block" />Blocked — tap to open</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-orange-50 inline-block" />Fully booked</span>
      </div>
    </div>
  )
}
