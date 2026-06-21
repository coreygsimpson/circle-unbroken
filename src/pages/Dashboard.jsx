import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { profile, isAdmin, isGuest, guestTrackId, guestLabel } = useAuth()
  const [stats, setStats]               = useState({ total: 0, draft: 0, ready: 0, published: 0 })
  const [featuredTracks, setFeaturedTracks] = useState([])
  const [recentStudies, setRecentStudies]   = useState([])
  const [guestTrack, setGuestTrack]         = useState(null)
  const [loading, setLoading]               = useState(true)

  useEffect(() => {
    async function load() {
      const promises = [
        supabase.from('studies').select('status'),
        supabase
          .from('tracks')
          .select('id, title, description, sponsor, is_featured, track_studies(count)')
          .eq('is_public', true)
          .eq('is_featured', true)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('studies')
          .select('id, study_id, study_title, passage_ref, status, media_link, audio_link, books(book_name)')
          .eq('status', 'Published')
          .order('created_at', { ascending: false })
          .limit(4),
      ]

      if (isGuest && guestTrackId) {
        promises.push(
          supabase
            .from('tracks')
            .select('id, title, description, sponsor, track_studies(position, studies(id, study_id, study_title, passage_ref, media_link, audio_link))')
            .eq('id', guestTrackId)
            .single()
        )
      }

      const results = await Promise.all(promises)
      const [studiesRes, tracksRes, recentRes, guestRes] = results

      if (!studiesRes.error && studiesRes.data) {
        const d = studiesRes.data
        setStats({
          total:     d.length,
          draft:     d.filter(s => s.status === 'Draft').length,
          ready:     d.filter(s => s.status === 'Ready').length,
          published: d.filter(s => s.status === 'Published').length,
        })
      }

      setFeaturedTracks(tracksRes.data || [])
      setRecentStudies(recentRes.data || [])

      if (guestRes?.data) {
        const track = guestRes.data
        const studies = (track.track_studies || [])
          .sort((a, b) => a.position - b.position)
          .map(ts => ts.studies)
          .filter(Boolean)
        setGuestTrack({ ...track, studies })
      }

      setLoading(false)
    }
    load()
  }, [isGuest, guestTrackId])

  const firstName = (profile?.display_name || profile?.full_name || '').split(' ')[0]
  const isNewUser = profile?.created_at
    ? (Date.now() - new Date(profile.created_at).getTime()) < 1000 * 60 * 60 * 24
    : false

  const greeting = isGuest
    ? `Welcome${guestLabel && guestLabel !== 'Guest' ? `, ${guestLabel}` : ''}!`
    : isNewUser
      ? `Welcome${firstName ? `, ${firstName}` : ''}!`
      : `Welcome back${firstName ? `, ${firstName}` : ''}!`

  const subtitle = isGuest
    ? "You're browsing as a guest. Create an account to save notes and track your progress."
    : isNewUser
      ? 'Your journey through Scripture starts here — Genesis to Revelation, one study at a time.'
      : 'Pick up where you left off.'

  if (loading) return <p>Loading…</p>

  return (
    <div style={{ maxWidth: '820px' }}>

      {/* ── Greeting ────────────────────────────────────────── */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ marginBottom: '6px' }}>{greeting}</h1>
        <p className="page-subtitle" style={{ margin: 0 }}>{subtitle}</p>
        {isGuest && (
          <Link to="/signup" className="btn-primary" style={{ display: 'inline-block', marginTop: '14px', fontSize: '0.88rem', padding: '8px 18px' }}>
            Create Free Account
          </Link>
        )}
      </div>

      {/* ── Guest track shortcut ─────────────────────────────── */}
      {isGuest && guestTrack && (
        <div style={{
          background: 'var(--paper-raised)',
          border: '2px solid var(--slate)',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '32px',
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)', marginBottom: '6px' }}>
            Your Track
          </div>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.15rem' }}>{guestTrack.title}</h2>
          {guestTrack.description && (
            <p style={{ margin: '0 0 16px', color: 'var(--ink-soft)', fontSize: '0.9rem' }}>{guestTrack.description}</p>
          )}
          {guestTrack.sponsor && (
            <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: 'var(--ink-soft)' }}>Presented by <strong>{guestTrack.sponsor}</strong></p>
          )}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link
              to={`/admin/tracks/${guestTrack.id}/detail`}
              className="btn-primary"
              style={{ fontSize: '0.88rem', padding: '8px 18px' }}
            >
              View Track →
            </Link>
            {guestTrack.studies?.[0] && (guestTrack.studies[0].media_link || guestTrack.studies[0].audio_link) && (
              <Link
                to={`/study/${guestTrack.studies[0].study_id}?track=${guestTrack.id}&pos=0`}
                style={{
                  fontSize: '0.88rem', padding: '8px 18px',
                  border: '1px solid var(--slate)', borderRadius: '8px',
                  color: 'var(--slate)', textDecoration: 'none', fontWeight: 600,
                }}
              >
                Start First Study
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── Stats (admins only) ──────────────────────────────── */}
      {isAdmin && (
        <div className="stat-grid" style={{ marginBottom: '36px' }}>
          {[
            { label: 'Total Studies', value: stats.total },
            { label: 'Drafts',        value: stats.draft },
            { label: 'Ready',         value: stats.ready },
            { label: 'Published',     value: stats.published },
          ].map(({ label, value }) => (
            <div className="stat-card" key={label}>
              <div className="stat-number">{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Featured Tracks ──────────────────────────────────── */}
      {!isGuest && featuredTracks.length > 0 && (
        <div style={{ marginBottom: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Featured Tracks</h2>
            <Link to="/admin/tracks" style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', textDecoration: 'none' }}>View all →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {featuredTracks.map(track => {
              const studyCount = track.track_studies?.[0]?.count ?? 0
              return (
                <Link
                  key={track.id}
                  to={`/admin/tracks/${track.id}/detail`}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    padding: '16px 20px',
                    background: 'var(--paper-raised)',
                    border: '1px solid var(--gold, #c9a84c)',
                    borderRadius: '10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
                    transition: 'box-shadow 0.15s',
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--ink)', marginBottom: '3px' }}>
                        {track.title}
                      </div>
                      {track.description && (
                        <div style={{ fontSize: '0.82rem', color: 'var(--ink-soft)' }}>{track.description}</div>
                      )}
                      {track.sponsor && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', marginTop: '2px' }}>
                          Presented by <strong>{track.sponsor}</strong>
                        </div>
                      )}
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--ink-soft)' }}>{studyCount} {studyCount === 1 ? 'study' : 'studies'}</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--slate)', fontWeight: 600, marginTop: '4px' }}>View →</div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Recent Published Studies ─────────────────────────── */}
      {recentStudies.length > 0 && (
        <div style={{ marginBottom: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Recent Studies</h2>
            <Link to="/admin/studies" style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', textDecoration: 'none' }}>View all →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
            {recentStudies.map(study => (
              <Link
                key={study.id}
                to={(study.media_link || study.audio_link) ? `/study/${study.study_id}` : '#'}
                style={{ textDecoration: 'none', pointerEvents: (study.media_link || study.audio_link) ? 'auto' : 'none' }}
              >
                <div style={{
                  padding: '14px 16px',
                  background: 'var(--paper-raised)',
                  border: '1px solid var(--line)',
                  borderRadius: '10px',
                  height: '100%',
                  boxSizing: 'border-box',
                }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', marginBottom: '4px' }}>
                    {study.books?.book_name}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--ink)', marginBottom: '4px', lineHeight: 1.3 }}>
                    {study.study_title}
                  </div>
                  {study.passage_ref && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--slate)' }}>{study.passage_ref}</div>
                  )}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    {study.media_link && <span style={{ fontSize: '0.7rem', color: 'var(--slate)', fontWeight: 600 }}>▶ Video</span>}
                    {study.audio_link && <span style={{ fontSize: '0.7rem', color: 'var(--slate)', fontWeight: 600 }}>♪ Audio</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Admin quick actions ──────────────────────────────── */}
      {isAdmin && (
        <div className="dashboard-actions">
          <Link to="/admin/studies/new" className="btn-primary">+ New Study</Link>
          <Link to="/admin/studies" className="btn-secondary">View All Studies</Link>
        </div>
      )}
    </div>
  )
}
