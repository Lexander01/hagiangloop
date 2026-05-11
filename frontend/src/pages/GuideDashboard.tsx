import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { auth } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import UpcomingTours from '../components/UpcomingTours'
import ManageAvailability from '../components/ManageAvailability'

type Tab = 'tours' | 'calendar'

export default function GuideDashboard() {
  const [tab,       setTab]       = useState<Tab>('tours')
  const [signingOut, setSigningOut] = useState(false)
  const { guide }  = useAuth()
  const navigate   = useNavigate()

  async function handleSignOut() {
    setSigningOut(true)
    await signOut(auth)
    navigate('/guide/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col max-w-lg mx-auto">
      {/* Top bar */}
      <header className="bg-brand-500 text-white px-4 py-4 flex items-center justify-between safe-area-top">
        <div>
          <h1 className="font-black text-xl leading-tight">Ha Giang Tours</h1>
          {guide && <p className="text-brand-100 text-sm">Hello, {guide.name} 👋</p>}
        </div>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="text-sm text-brand-100 hover:text-white transition-colors px-2 py-1"
          aria-label="Sign out"
        >
          {signingOut ? '…' : 'Sign out'}
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {tab === 'tours'    && <UpcomingTours />}
        {tab === 'calendar' && <ManageAvailability />}
      </main>

      {/* Bottom tab bar — extra-large tap targets */}
      <nav className="bg-white border-t border-stone-200 grid grid-cols-2 safe-area-bottom">
        <button
          onClick={() => setTab('tours')}
          className={[
            'flex flex-col items-center justify-center py-4 gap-1 transition-colors',
            tab === 'tours'
              ? 'text-brand-600 border-t-2 border-brand-500 -mt-px bg-brand-50'
              : 'text-stone-400 hover:text-stone-600',
          ].join(' ')}
          aria-label="Upcoming Tours"
          aria-pressed={tab === 'tours'}
        >
          <span className="text-2xl">🏍️</span>
          <span className="text-xs font-semibold">Upcoming Tours</span>
        </button>
        <button
          onClick={() => setTab('calendar')}
          className={[
            'flex flex-col items-center justify-center py-4 gap-1 transition-colors',
            tab === 'calendar'
              ? 'text-brand-600 border-t-2 border-brand-500 -mt-px bg-brand-50'
              : 'text-stone-400 hover:text-stone-600',
          ].join(' ')}
          aria-label="Manage Availability"
          aria-pressed={tab === 'calendar'}
        >
          <span className="text-2xl">📅</span>
          <span className="text-xs font-semibold">Availability</span>
        </button>
      </nav>
    </div>
  )
}
