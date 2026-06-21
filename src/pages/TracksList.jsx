import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function TracksList() {
  const { isAdmin } = useAuth()
  const [tracks, setTracks]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('tracks')
        .select('id, title, description, sponsor, is_featured, is_public, track_studies(count)')
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
      setTracks(data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p>Loading…</p>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Tracks</h1>
          <p className="page-subtitle">Curated study sequences — follow a topic, series, or journey.</p>
        </div>
        {isAdmin && <Link to="/admin/tracks/new" className="btn-primary">+ New Track</Link>}
      </div>

      {tracks.length === 0 ? (
        <div className="empty-state">
          <p>No tracks yet.</p>
          {isAdmin && <Link to="/admin/tracks/new" className="btn-primary">Create the first track</Link>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {tracks.map(track => {
            const count = track.track_studies?.[0]?.count ?? 0
            return (
              <Link key={track.id} to={`/admin/tracks/${track.id}/detail`} style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '20px 24px',
                  background: 'var(--paper-raised)',
                  border: `1px solid ${track.is_featured ? 'var(--gold)' : 'var(--line)'}`,
                  borderRadius: '12px',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(44,95,138,0.1)'; e.currentTarget.style.borderColor = track.is_featured ? 'var(--gold)' : 'var(--slate)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = track.is_featured ? 'var(--gold)' : 'var(--line)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--ink)' }}>{track.title}</span>
                        {track.is_featured && (
                          <span style={{ padding: '2px 9px', borderRadius: '100px', background: '#fdf3dc', color: '#92700a', fontSize: '0.7rem', fontWeight: 700 }}>
                            Featured
                          </span>
                        )}
                        {!track.is_public && (
                          <span className="badge badge-gray">Private</span>
                        )}
                      </div>
                      {track.description && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', margin: '0 0 8px', lineHeight: '1.5' }}>
                          {track.description}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: '16px', fontSize: '0.78rem', color: 'var(--ink-soft)' }}>
                        <span>{count} {count === 1 ? 'study' : 'studies'}</span>
                        {track.sponsor && <span>Presented by {track.sponsor}</span>}
                      </div>
                    </div>
                    {isAdmin && (
                      <Link
                        to={`/admin/tracks/${track.id}`}
                        onClick={e => e.stopPropagation()}
                        style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', textDecoration: 'none', flexShrink: 0, padding: '4px 10px', border: '1px solid var(--line)', borderRadius: '6px' }}
                      >
                        Edit
                      </Link>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
