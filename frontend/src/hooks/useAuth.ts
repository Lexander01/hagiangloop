import { useState, useEffect } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import type { GuideUser } from '../lib/types'

interface AuthState {
  user: User | null
  guide: GuideUser | null
  loading: boolean
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, guide: null, loading: true })

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setState({ user: null, guide: null, loading: false })
        return
      }
      try {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
        const guide = snap.exists() ? (snap.data() as GuideUser) : null
        setState({ user: firebaseUser, guide, loading: false })
      } catch {
        setState({ user: firebaseUser, guide: null, loading: false })
      }
    })
  }, [])

  return state
}
