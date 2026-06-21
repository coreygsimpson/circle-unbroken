import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import CircleMark from '../components/CircleMark'

export default function Login() {
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [showGuest, setShowGuest] = useState(false)
  const [code, setCode]           = useState('')
  const [codeError, setCodeError] = useState('')
  const [codeLoading, setCodeLoading] = useState(false)
  const navigate = useNavigate()
  const { enterGuest } = useAuth()

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      navigate('/admin')
    }
  }

  async function handleGuestCode(e) {
    e.preventDefault()
    setCodeError('')
    setCodeLoading(true)

    const { data, error } = await supabase
      .from('guest_codes')
      .select('id, label, track_id')
      .eq('code', code.trim())
      .eq('is_active', true)
      .single()

    setCodeLoading(false)

    if (error || !data) {
      setCodeError('Invalid or inactive code. Please double-check and try again.')
      return
    }

    enterGuest(data.track_id, data.label || 'Guest')

    if (data.track_id) {
      navigate(`/admin/tracks/${data.track_id}/detail`)
    } else {
      navigate('/admin')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
          <CircleMark size={48} />
        </div>
        <h1>May the Circle Be Unbroken</h1>
        <p className="auth-subtitle">Sign in to your account</p>

        {!showGuest ? (
          <>
            <form onSubmit={handleLogin}>
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>

              {error && <div className="auth-error">{error}</div>}

              <button type="submit" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="auth-links">
              <Link to="/forgot-password">Forgot password?</Link>
              <Link to="/signup">Need an account? Sign up</Link>
            </div>

            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--line)', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => setShowGuest(true)}
                style={{
                  background: 'none', border: '1px solid var(--line)',
                  borderRadius: '8px', padding: '8px 20px',
                  color: 'var(--ink-soft)', cursor: 'pointer',
                  fontSize: '0.88rem', width: '100%',
                }}
              >
                Continue as Guest
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: '0.9rem', color: 'var(--ink-soft)', marginBottom: '20px', textAlign: 'center' }}>
              Enter the passcode you were given to access your track.
            </p>

            <form onSubmit={handleGuestCode}>
              <label>
                Passcode
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. FAMILY2024"
                  required
                  autoFocus
                  style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}
                />
              </label>

              {codeError && <div className="auth-error">{codeError}</div>}

              <button type="submit" disabled={codeLoading}>
                {codeLoading ? 'Checking...' : 'Enter'}
              </button>
            </form>

            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => { setShowGuest(false); setCode(''); setCodeError('') }}
                style={{ background: 'none', border: 'none', color: 'var(--ink-soft)', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                ← Back to sign in
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
