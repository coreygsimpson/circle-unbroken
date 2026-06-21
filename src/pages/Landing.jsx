import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import CircleMark from '../components/CircleMark'

export default function Landing() {
  const { user, isGuest, enterGuest } = useAuth()
  const navigate = useNavigate()

  const [showCodeForm, setShowCodeForm] = useState(false)
  const [code, setCode]                 = useState('')
  const [codeError, setCodeError]       = useState('')
  const [codeLoading, setCodeLoading]   = useState(false)

  // Redirect if already authenticated or in guest mode
  useEffect(() => {
    if (user || isGuest) navigate('/admin', { replace: true })
  }, [user, isGuest, navigate])

  async function handleGuestCode(e) {
    e.preventDefault()
    setCodeError('')
    setCodeLoading(true)

    const { data, error } = await supabase
      .from('guest_codes')
      .select('id, label, track_id')
      .ilike('code', code.trim())
      .eq('is_active', true)
      .single()

    setCodeLoading(false)

    if (error || !data) {
      setCodeError('Invalid or inactive code. Double-check and try again.')
      return
    }

    enterGuest(data.track_id, data.label || 'Guest')
    navigate(data.track_id ? `/admin/tracks/${data.track_id}/detail` : '/admin')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(160deg, #e8f2fa 0%, #f8fafc 60%)',
    }}>

      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 32px',
        borderBottom: '1px solid var(--line)',
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(8px)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CircleMark size={28} />
          <span style={{ fontFamily: 'Georgia, serif', fontWeight: 600, fontSize: '0.95rem', color: 'var(--ink)' }}>
            May the Circle Be Unbroken
          </span>
        </div>
        <Link
          to="/login"
          style={{
            fontSize: '0.88rem', fontWeight: 600, color: 'var(--slate)',
            textDecoration: 'none', padding: '7px 16px',
            border: '1px solid var(--slate)', borderRadius: '8px',
            fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          }}
        >
          Sign In
        </Link>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '60px 24px',
        textAlign: 'center',
      }}>

        <CircleMark size={72} style={{ marginBottom: '28px' }} />

        <h1 style={{
          fontFamily: 'Georgia, serif',
          fontSize: 'clamp(1.8rem, 5vw, 2.8rem)',
          fontWeight: 600,
          color: 'var(--ink)',
          maxWidth: '600px',
          lineHeight: 1.2,
          margin: '0 0 16px',
        }}>
          May the Circle Be Unbroken
        </h1>

        <p style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          fontSize: 'clamp(1rem, 2.5vw, 1.15rem)',
          color: 'var(--ink-soft)',
          maxWidth: '480px',
          lineHeight: 1.65,
          margin: '0 0 40px',
        }}>
          A family Bible study — walking through all 66 books of Scripture,
          from Genesis to Revelation, together.
        </p>

        {/* CTA buttons / guest form */}
        {!showCodeForm ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '320px' }}>
            <button
              onClick={() => setShowCodeForm(true)}
              style={{
                width: '100%', padding: '13px 24px',
                background: 'var(--slate)', color: 'white',
                border: 'none', borderRadius: '10px',
                fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
                fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
              }}
            >
              Enter Passcode
            </button>
            <Link
              to="/login"
              style={{
                width: '100%', padding: '13px 24px',
                background: 'white', color: 'var(--ink)',
                border: '1px solid var(--line)', borderRadius: '10px',
                fontSize: '1rem', fontWeight: 600,
                textDecoration: 'none', textAlign: 'center',
                fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                display: 'block',
              }}
            >
              Sign In
            </Link>
          </div>
        ) : (
          <div style={{ width: '100%', maxWidth: '320px' }}>
            <form onSubmit={handleGuestCode} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="Enter your passcode"
                autoFocus
                style={{
                  padding: '13px 16px',
                  border: '1.5px solid var(--slate)',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  fontWeight: 600,
                  textAlign: 'center',
                  outline: 'none',
                  background: 'white',
                }}
              />
              {codeError && (
                <div style={{ fontSize: '0.82rem', color: 'var(--error)', textAlign: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                  {codeError}
                </div>
              )}
              <button
                type="submit"
                disabled={codeLoading || !code.trim()}
                style={{
                  padding: '13px 24px',
                  background: 'var(--slate)', color: 'white',
                  border: 'none', borderRadius: '10px',
                  fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
                  fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                  opacity: (codeLoading || !code.trim()) ? 0.6 : 1,
                }}
              >
                {codeLoading ? 'Checking…' : 'Enter →'}
              </button>
              <button
                type="button"
                onClick={() => { setShowCodeForm(false); setCode(''); setCodeError('') }}
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--ink-soft)', cursor: 'pointer',
                  fontSize: '0.85rem', padding: '4px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                }}
              >
                ← Back
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ── Features strip ──────────────────────────────────── */}
      <div style={{
        borderTop: '1px solid var(--line)',
        background: 'rgba(255,255,255,0.6)',
        padding: '40px 24px',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'center', flexWrap: 'wrap',
          gap: '32px', maxWidth: '700px', margin: '0 auto',
          textAlign: 'center',
        }}>
          {[
            { icon: '📖', label: 'Sequential Study', desc: 'Genesis through Revelation, in order' },
            { icon: '▶', label: 'Video Teachings', desc: 'Watch, listen, or read along' },
            { icon: '✏️', label: 'Personal Notes', desc: 'Save your thoughts as you study' },
          ].map(({ icon, label, desc }) => (
            <div key={label} style={{ minWidth: '160px', maxWidth: '200px' }}>
              <div style={{ fontSize: '1.6rem', marginBottom: '8px' }}>{icon}</div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--ink)', marginBottom: '4px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                {label}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                {desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────── */}
      <div style={{
        textAlign: 'center', padding: '20px 24px',
        fontSize: '0.78rem', color: 'var(--ink-soft)',
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        borderTop: '1px solid var(--line)',
      }}>
        A family ministry project · Built with love
      </div>
    </div>
  )
}
