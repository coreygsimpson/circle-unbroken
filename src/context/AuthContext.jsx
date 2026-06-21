import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

const GUEST_KEY = 'circle_guest'

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [guest, setGuestState] = useState(null) // { trackId, label }

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (!error) setProfile(data)
  }

  useEffect(() => {
    // Restore guest session from sessionStorage
    try {
      const stored = sessionStorage.getItem(GUEST_KEY)
      if (stored) setGuestState(JSON.parse(stored))
    } catch (_) {}

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
        // Clear guest if user signs in properly
        sessionStorage.removeItem(GUEST_KEY)
        setGuestState(null)
      } else {
        setProfile(null)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  function enterGuest(trackId, label) {
    const data = { trackId, label }
    sessionStorage.setItem(GUEST_KEY, JSON.stringify(data))
    setGuestState(data)
  }

  function clearGuest() {
    sessionStorage.removeItem(GUEST_KEY)
    setGuestState(null)
  }

  const isAdmin  = profile?.role === 'admin'
  const isGuest  = !user && !!guest
  const guestTrackId = guest?.trackId ?? null
  const guestLabel   = guest?.label   ?? 'Guest'

  return (
    <AuthContext.Provider value={{
      user, profile, isAdmin, loading,
      isGuest, guestTrackId, guestLabel,
      enterGuest, clearGuest,
      refreshProfile: () => user && loadProfile(user.id),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
