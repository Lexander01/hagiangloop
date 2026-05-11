import * as functions from 'firebase-functions'
import * as admin      from 'firebase-admin'

admin.initializeApp()
const db = admin.firestore()

const PRICE_PER_PAX_USD = 120
const MAX_SPOTS         = 8

interface BookingRequest {
  date:          string  // YYYY-MM-DD
  pax:           number
  customerName:  string
  customerEmail: string
}

// ─────────────────────────────────────────────────────────────────────────────
// createBooking
// Called from the frontend. Validates availability in a Firestore transaction
// (prevents race-condition double-booking), then creates a confirmed booking
// and increments booked_spots.
// ─────────────────────────────────────────────────────────────────────────────
export const createBooking = functions
  .region('us-central1')
  .https.onCall(async (data: BookingRequest, _context) => {
    const { date, pax, customerName, customerEmail } = data

    // ── Input validation ─────────────────────────────────────────────────────
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
      throw new functions.https.HttpsError('invalid-argument', 'Invalid date format.')
    if (!Number.isInteger(pax) || pax < 1 || pax > MAX_SPOTS)
      throw new functions.https.HttpsError('invalid-argument', 'Invalid number of people.')
    if (!customerName?.trim() || !customerEmail?.trim())
      throw new functions.https.HttpsError('invalid-argument', 'Name and email are required.')
    if (!/\S+@\S+\.\S+/.test(customerEmail))
      throw new functions.https.HttpsError('invalid-argument', 'Invalid email address.')

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (new Date(date + 'T00:00:00') < today)
      throw new functions.https.HttpsError('invalid-argument', 'Cannot book a date in the past.')

    // ── Availability check + booking creation (single transaction) ────────────
    const availRef  = db.collection('availability').doc(date)
    const bookingRef = db.collection('bookings').doc()

    await db.runTransaction(async (tx) => {
      const availSnap   = await tx.get(availRef)
      const avail       = availSnap.data()
      const totalSpots  = avail?.total_spots  ?? MAX_SPOTS
      const bookedSpots = avail?.booked_spots ?? 0

      if (avail?.is_blocked)
        throw new functions.https.HttpsError('failed-precondition', 'This date has been blocked by the guide.')
      if (bookedSpots + pax > totalSpots)
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Not enough spots. Only ${totalSpots - bookedSpots} remaining.`,
        )

      const totalPrice = PRICE_PER_PAX_USD * pax

      // Create confirmed booking
      tx.set(bookingRef, {
        customer_name:  customerName.trim(),
        customer_email: customerEmail.trim().toLowerCase(),
        date,
        pax,
        total_price: totalPrice,
        cash_due:    totalPrice,
        status:      'confirmed',
        created_at:  admin.firestore.FieldValue.serverTimestamp(),
      })

      // Increment booked_spots (create availability doc if it doesn't exist yet)
      if (availSnap.exists) {
        tx.update(availRef, { booked_spots: admin.firestore.FieldValue.increment(pax) })
      } else {
        tx.set(availRef, { date, total_spots: MAX_SPOTS, booked_spots: pax, is_blocked: false })
      }
    })

    functions.logger.info(`Booking ${bookingRef.id} confirmed for ${date}, pax=${pax}`)
    return { bookingId: bookingRef.id }
  })

// ─────────────────────────────────────────────────────────────────────────────
// cleanupStalePendingBookings  (scheduled — runs every 30 minutes)
// Safety net: cancels any bookings still 'pending' after 30 minutes.
// ─────────────────────────────────────────────────────────────────────────────
export const cleanupStalePendingBookings = functions
  .region('us-central1')
  .pubsub.schedule('every 30 minutes')
  .onRun(async () => {
    const cutoff = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 30 * 60 * 1000),
    )
    const staleSnap = await db.collection('bookings')
      .where('status',     '==', 'pending')
      .where('created_at', '<=', cutoff)
      .get()

    if (staleSnap.empty) {
      functions.logger.info('cleanupStalePendingBookings: nothing to clean up')
      return
    }
    const batch = db.batch()
    staleSnap.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status:        'cancelled',
        cancelled_at:  admin.firestore.FieldValue.serverTimestamp(),
        cancel_reason: 'timeout',
      })
    })
    await batch.commit()
    functions.logger.info(`cleanupStalePendingBookings: cancelled ${staleSnap.size} booking(s)`)
  })
