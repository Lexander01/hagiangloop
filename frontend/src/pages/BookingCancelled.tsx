import { Link } from 'react-router-dom'

export default function BookingCancelled() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="bg-white rounded-3xl shadow-sm border border-stone-200 max-w-md w-full p-8 space-y-5">
        <div className="text-6xl">😕</div>
        <h1 className="text-2xl font-black text-stone-800">Payment Cancelled</h1>
        <p className="text-stone-500">
          No payment was taken. Your spot is not yet reserved. Head back and try again whenever you're ready.
        </p>
        <Link
          to="/book"
          className="block w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 rounded-xl transition-colors"
        >
          Try Again →
        </Link>
        <Link to="/" className="block text-stone-400 text-sm hover:text-stone-600 transition-colors">
          Back to Home
        </Link>
      </div>
    </div>
  )
}
