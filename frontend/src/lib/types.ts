export interface AvailabilityDay {
  date: string          // YYYY-MM-DD
  total_spots: number
  booked_spots: number
  is_blocked: boolean
}

export interface Booking {
  id: string
  customer_name: string
  customer_email: string
  date: string          // YYYY-MM-DD
  pax: number
  total_price: number
  deposit_paid: number
  cash_due: number
  status: 'pending' | 'confirmed' | 'cancelled'
  stripe_session_id: string
  created_at?: unknown  // Firestore Timestamp
}

export interface GuideUser {
  uid: string
  role: 'admin' | 'guide'
  name: string
}
