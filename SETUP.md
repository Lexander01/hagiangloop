# Ha Giang Loop — Booking System Setup Guide

A complete tour booking and guide management system built with:
- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Firebase (Firestore, Auth, Cloud Functions)
- **Payments**: Stripe Checkout

---

## Project Structure

```
hagiangloop/
├── frontend/           # React customer-facing app + guide dashboard
│   └── src/
│       ├── pages/      # Landing, Booking, BookingSuccess, GuideLogin, GuideDashboard
│       ├── components/ # DatePicker, BookingForm, UpcomingTours, ManageAvailability
│       ├── hooks/      # useAuth
│       └── lib/        # firebase.ts, types.ts, constants.ts
├── functions/          # Firebase Cloud Functions
│   └── src/
│       └── index.ts    # createStripeCheckout, stripeWebhook, cleanupStalePendingBookings
├── firestore.rules     # Security rules
├── firestore.indexes.json
├── firebase.json
└── .firebaserc
```

---

## Prerequisites

- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`
- A Firebase project with **Firestore** and **Authentication** (Email/Password) enabled
- A Stripe account

---

## Step 1: Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Firestore** (Native mode)
3. Enable **Authentication → Email/Password**
4. Register a **Web App** and copy the config values
5. Update `.firebaserc`:
   ```json
   { "projects": { "default": "YOUR_PROJECT_ID" } }
   ```

---

## Step 2: Frontend Environment

```bash
cd frontend
cp .env.example .env.local
```

Fill in `.env.local` with your Firebase web app config values.

---

## Step 3: Stripe Setup

1. Get your **Secret Key** from [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
2. Set Firebase function config:
   ```bash
   firebase functions:config:set \
     stripe.secret_key="sk_live_YOUR_KEY" \
     stripe.webhook_secret="whsec_YOUR_WEBHOOK_SECRET" \
     app.base_url="https://YOUR_DOMAIN.com"
   ```
3. In Stripe Dashboard → **Webhooks**, add endpoint:
   - URL: `https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/stripeWebhook`
   - Events: `checkout.session.completed`, `checkout.session.expired`

---

## Step 4: Create Guide Accounts

Use the Firebase Console or a one-time script:

```js
// Run once via Firebase Admin SDK or Firebase Console
// Authentication → Add user (email + password)
// Then in Firestore → users collection → create document with uid:
{
  uid: "THE_USER_UID",
  role: "guide",   // or "admin"
  name: "Nguyen Van A"
}
```

---

## Step 5: Install & Deploy

```bash
# Install all dependencies
npm run install:all

# Deploy everything
npm run deploy

# Or deploy individually:
npm run deploy:rules      # Firestore rules + indexes
npm run deploy:functions  # Cloud Functions only
npm run deploy:hosting    # Frontend only
```

---

## Local Development

```bash
# Terminal 1: Frontend dev server
npm run dev

# Terminal 2: Firebase emulators (Firestore + Functions)
npm run emulators
```

---

## Business Logic: 20/80 Payment Split

| Field         | Value                           |
|-------------- |---------------------------------|
| `total_price` | `$PRICE_PER_PAX × pax`          |
| `deposit_paid`| `total_price × 0.20` (Stripe)   |
| `cash_due`    | `total_price × 0.80` (on arrival)|

The guide dashboard prominently displays `cash_due` so guides always know what to collect.

---

## Key Design Decisions

- **Spot locking**: Spots are only locked after Stripe payment is confirmed (webhook), never on `pending`. This prevents permanently locked spots from abandoned checkouts.
- **Cleanup cron**: A scheduled function runs every 30 minutes to cancel `pending` bookings older than 30 minutes, as a safety net against missed webhook events.
- **Race conditions**: Availability checks use Firestore transactions to prevent double-booking under concurrent traffic.
- **Guide UX**: The guide dashboard is designed for low-literacy mobile users — large tap targets, emoji icons, minimal text, the `cash_due` amount displayed prominently.
