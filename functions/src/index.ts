import * as functions from 'firebase-functions'
import * as admin      from 'firebase-admin'
import Stripe          from 'stripe'

admin.initializeApp()
const db = admin.firestore()

// ─── Stripe client (secret key from Firebase env config) ────────────────────
// Set via: firebase functions:config:set stripe.secret_key="sk_live_..." stripe.webhook_secret="whsec_..."
const stripe = new Stripe(
  functions.config().stripe?.secret_key ?? process.env.STRIPE_SECRET_KEY ?? '',
  { apiVersion: '2024-06-20' },
)
const WEBHOOK_SECRET: string =
  functions.config().stripe?.webhook_secret ?? process.env.STRIPE_WEBHOOK_SECRET ?? ''

const PRICE_PER_PAX_USD  = 120
const DEPOSIT_FRACTION   = 0.20
const MAX_SPOTS          = 8
const APP_BASE_URL: string =
  functions.config().app?.base_url ?? process.env.APP_BASE_URL ?? 'http://localhost:5173'

// ─── Types ───────────────────────────────────────────────────────────────────
interface CheckoutRequest {
  date:          string  // YYYY-MM-DD
  pax:           number
  customerName:  string
  customerEmail: string
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. createStripeCheckout
//    Called from the frontend. Validates availability, creates a Firestore
//    'pending' booking, then creates a Stripe Checkout Session.
// ─────────────────────────────────────────────────────────────────────────────
export const createStripeCheckout = functions
  .region('us-central1')
  .https.onCall(async (data: CheckoutRequest, context) => {

    const { date, pax, customerName, customerEmail } = data

    // ── Input validation ────────────────────────────────────────────────────
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid date format.')
    }
    if (!Number.isInteger(pax) || pax < 1 || pax > MAX_SPOTS) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid number of people.')
    }
    if (!customerName?.trim() || !customerEmail?.trim()) {
      throw new functions.https.HttpsError('invalid-argument', 'Name and email are required.')
    }
    if (!/\S+@\S+\.\S+/.test(customerEmail)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid email address.')
    }

    // Prevent booking dates in the past
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tourDate = new Date(date + 'T00:00:00')
    if (tourDate < today) {
      throw new functions.https.HttpsError('invalid-argument', 'Cannot book a date in the past.')
    }

    // ── Availability check (in a transaction to prevent race conditions) ────
    const availRef  = db.collection('availability').doc(date)

    await db.runTransaction(async (tx) => {
      const availSnap = await tx.get(availRef)
      const avail     = availSnap.data()
      const totalSpots  = avail?.total_spots  ?? MAX_SPOTS
      const bookedSpots = avail?.booked_spots ?? 0
      const isBlocked   = avail?.is_blocked   ?? false

      if (isBlocked) {
        throw new functions.https.HttpsError('failed-precondition', 'This date has been blocked by the guide.')
      }
      if (bookedSpots + pax > totalSpots) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Not enough spots. Only ${totalSpots - bookedSpots} remaining.`,
        )
      }
      // We do NOT increment booked_spots yet — we do that only after Stripe
      // confirms payment via the webhook. Pending bookings hold no spots.
    })

    // ── Price calculation ────────────────────────────────────────────────────
    const totalPrice   = PRICE_PER_PAX_USD * pax
    const depositPaid  = Math.round(totalPrice * DEPOSIT_FRACTION)
    const cashDue      = totalPrice - depositPaid

    // ── Create a pending booking document ───────────────────────────────────
    const bookingRef  = db.collection('bookings').doc()
    const placeholderSessionId = `pending_${bookingRef.id}`

    await bookingRef.set({
      customer_name:     customerName.trim(),
      customer_email:    customerEmail.trim().toLowerCase(),
      date,
      pax,
      total_price:       totalPrice,
      deposit_paid:      depositPaid,
      cash_due:          cashDue,
      status:            'pending',
      stripe_session_id: placeholderSessionId,
      created_at:        admin.firestore.FieldValue.serverTimestamp(),
    })

    // ── Create Stripe Checkout Session ──────────────────────────────────────
    let session: Stripe.Checkout.Session
    try {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode:                 'payment',
        customer_email:       customerEmail.trim().toLowerCase(),
        line_items: [
          {
            price_data: {
              currency:     'usd',
              unit_amount:  depositPaid * 100,  // Stripe uses cents
              product_data: {
                name:        `Ha Giang Loop Tour — ${date}`,
                description: `${pax} person${pax > 1 ? 's' : ''} · 20% non-refundable deposit. Cash balance $${cashDue} due on arrival.`,
              },
            },
            quantity: 1,
          },
        ],
        metadata: {
          booking_id:     bookingRef.id,
          date,
          pax:            String(pax),
          customer_name:  customerName.trim(),
          customer_email: customerEmail.trim().toLowerCase(),
          cash_due:       String(cashDue),
          total_price:    String(totalPrice),
        },
        success_url: `${APP_BASE_URL}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:  `${APP_BASE_URL}/booking/cancelled`,
        expires_at:  Math.floor(Date.now() / 1000) + 30 * 60,  // 30 min expiry
      })
    } catch (err) {
      // Roll back the pending booking if Stripe session creation fails
      await bookingRef.delete()
      throw new functions.https.HttpsError('internal', 'Failed to create payment session.')
    }

    // Update booking with the real Stripe session ID
    await bookingRef.update({ stripe_session_id: session.id })

    return { url: session.url }
  })

// ─────────────────────────────────────────────────────────────────────────────
// 2. stripeWebhook
//    Receives Stripe events over HTTP. On checkout.session.completed:
//    - Marks the booking as 'confirmed'
//    - Increments booked_spots on the availability doc (creating it if needed)
// ─────────────────────────────────────────────────────────────────────────────
export const stripeWebhook = functions
  .region('us-central1')
  .https.onRequest(async (req, res) => {

    const sig  = req.headers['stripe-signature'] as string
    let event: Stripe.Event

    try {
      // req.rawBody is available in Firebase Functions
      event = stripe.webhooks.constructEvent(
        (req as functions.https.Request & { rawBody: Buffer }).rawBody,
        sig,
        WEBHOOK_SECRET,
      )
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Webhook error'
      functions.logger.error('Webhook signature verification failed:', message)
      res.status(400).send(`Webhook Error: ${message}`)
      return
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      await handleCheckoutComplete(session)
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session
      await handleCheckoutExpired(session)
    }

    res.json({ received: true })
  })

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.booking_id
  if (!bookingId) {
    functions.logger.error('checkout.session.completed: no booking_id in metadata', session.id)
    return
  }

  const bookingRef = db.collection('bookings').doc(bookingId)
  const date       = session.metadata?.date
  const pax        = parseInt(session.metadata?.pax ?? '1', 10)

  try {
    await db.runTransaction(async (tx) => {
      const bookingSnap = await tx.get(bookingRef)
      if (!bookingSnap.exists) {
        throw new Error(`Booking ${bookingId} not found`)
      }
      if (bookingSnap.data()?.status === 'confirmed') {
        // Idempotency guard — already processed
        return
      }

      // Confirm the booking
      tx.update(bookingRef, {
        status:            'confirmed',
        stripe_session_id: session.id,
        confirmed_at:      admin.firestore.FieldValue.serverTimestamp(),
      })

      if (date) {
        const availRef  = db.collection('availability').doc(date)
        const availSnap = await tx.get(availRef)

        if (availSnap.exists) {
          tx.update(availRef, {
            booked_spots: admin.firestore.FieldValue.increment(pax),
          })
        } else {
          // Create the availability doc for this date
          tx.set(availRef, {
            date,
            total_spots:  MAX_SPOTS,
            booked_spots: pax,
            is_blocked:   false,
          })
        }
      }
    })

    functions.logger.info(`Booking ${bookingId} confirmed for ${date}, pax=${pax}`)
  } catch (err) {
    functions.logger.error(`Failed to confirm booking ${bookingId}:`, err)
    throw err
  }
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.booking_id
  if (!bookingId) return

  const bookingRef = db.collection('bookings').doc(bookingId)
  const snap = await bookingRef.get()
  if (!snap.exists || snap.data()?.status !== 'pending') return

  await bookingRef.update({
    status:     'cancelled',
    cancelled_at: admin.firestore.FieldValue.serverTimestamp(),
    cancel_reason: 'stripe_session_expired',
  })

  functions.logger.info(`Booking ${bookingId} cancelled — Stripe session expired`)
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. cleanupStalePendingBookings  (scheduled — runs every 30 minutes)
//    Cancels bookings that are still 'pending' after 30 minutes.
//    These represent abandoned checkouts where the Stripe session expired
//    event was not received (e.g., network issues).
// ─────────────────────────────────────────────────────────────────────────────
export const cleanupStalePendingBookings = functions
  .region('us-central1')
  .pubsub.schedule('every 30 minutes')
  .onRun(async () => {
    const cutoff = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 30 * 60 * 1000),
    )

    const staleSnap = await db
      .collection('bookings')
      .where('status',     '==',  'pending')
      .where('created_at', '<=',  cutoff)
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
        cancel_reason: 'checkout_timeout',
      })
    })
    await batch.commit()

    functions.logger.info(
      `cleanupStalePendingBookings: cancelled ${staleSnap.size} stale pending booking(s)`,
    )
  })
