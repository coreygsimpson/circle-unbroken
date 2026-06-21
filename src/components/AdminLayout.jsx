import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import CircleMark from './CircleMark'

const BMC_URL = import.meta.env.VITE_BMC_URL || null

export default function AdminLayout() {
  const { profile, isAdmin, isGuest, guestLabel, guestTrackId, clearGuest } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [navOpen, setNavOpen] = useState(false)

  // Close nav on route change (mobile)
  useEffect(() => { setNavOpen(false) }, [location.pathname])

  // Prevent body scroll when nav is open
  useEffect(() => {
    document.body.style.overflow = navOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [navOpen])

  async function handleSignOut() {
    if (isGuest) {
      clearGuest()
      navigate('/login')
      return
    }
    await supabase.auth.signOut()
    navigate('/login')
  }

  const avatarEl = (
    <div style={{
      width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
      background: profile?.avatar_url ? 'transparent' : 'var(--slate-light)',
      border: '1.5px solid var(--line)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate)',
    }}>
      {profile?.avatar_url
        ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : (profile?.full_name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
      }
    </div>
  )

  return (
    <div className="admin-shell">

      {/* ── Guest banner ────────────────────────────────────── */}
      {isGuest && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
          background: 'var(--slate)', color: 'white',
          padding: '8px 16px', fontSize: '0.82rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '12px',
        }}>
          <span>Browsing as guest{guestLabel && guestLabel !== 'Guest' ? ` · ${guestLabel}` : ''}</span>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <Link to="/signup" style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'underline', fontSize: '0.82rem' }}>
              Create account to save notes
            </Link>
          </div>
        </div>
      )}

      {/* ── Mobile top bar ─────────────────────────────────── */}
      <div className="mobile-topbar" style={isGuest ? { top: '37px' } : {}}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CircleMark size={24} />
          <span className="mobile-topbar-title">May the Circle Be Unbroken</span>
        </div>
        <button
          className="mobile-hamburger"
          onClick={() => setNavOpen(true)}
          aria-label="Open navigation"
        >
          ☰
        </button>
      </div>

      {/* ── Backdrop (mobile only) ──────────────────────────── */}
      {navOpen && (
        <div className="sidebar-backdrop" onClick={() => setNavOpen(false)} />
      )}

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className={`admin-sidebar${navOpen ? ' sidebar-open' : ''}`}
        style={isGuest ? { paddingTop: '37px' } : {}}
      >
        <div className="admin-sidebar-header">
          <CircleMark size={28} />
          <span>May the Circle<br />Be Unbroken</span>
        </div>

        <nav className="admin-nav">
          <NavLink to="/admin" end>Dashboard</NavLink>
          <NavLink to="/admin/studies">Studies</NavLink>
          <NavLink to="/admin/books">Books</NavLink>
          <NavLink to="/admin/tracks">Tracks</NavLink>
          {!isGuest && isAdmin && <NavLink to="/admin/seeds">Seeds</NavLink>}
          {!isGuest && isAdmin && <NavLink to="/admin/users">Users</NavLink>}
          {!isGuest && isAdmin && <NavLink to="/admin/guest-codes">Guest Codes</NavLink>}
          {!isGuest && <NavLink to="/admin/profile">Profile</NavLink>}
        </nav>

        <div className="admin-sidebar-footer">
          {isGuest ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
                Guest{guestLabel && guestLabel !== 'Guest' ? ` · ${guestLabel}` : ''}
              </div>
              <Link to="/signup" className="btn-primary" style={{ textAlign: 'center', fontSize: '0.82rem', padding: '7px 14px' }}>
                Create Account
              </Link>
            </div>
          ) : (
            <NavLink to="/admin/profile" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              {avatarEl}
              <div>
                <div className="admin-user-name">{profile?.display_name || profile?.full_name || 'Loading…'}</div>
                <div className="admin-user-role">{profile?.role}</div>
              </div>
            </NavLink>
          )}

          {!isGuest && BMC_URL && (
            <a
              href={BMC_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '7px 12px', borderRadius: '6px', marginBottom: '8px',
                background: '#FFDD00', color: '#000',
                fontSize: '0.82rem', fontWeight: 700,
                textDecoration: 'none', width: '100%',
                fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
              }}
            >
              ☕ Buy me a coffee
            </a>
          )}

          <button className="admin-signout" onClick={handleSignOut}>
            {isGuest ? 'Exit Guest Mode' : 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────── */}
      <main className="admin-content" style={isGuest ? { paddingTop: '37px' } : {}}>
        <Outlet />
      </main>
    </div>
  )
}
