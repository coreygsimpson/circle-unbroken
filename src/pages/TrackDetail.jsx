import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function TrackDetail() {
  const { id } = useParams()
  const { isAdmin } = useAuth()
  const [track, setTrack]   = useState(null)
  const [studies, setStudies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: track }, { data: ts }] = await Promise.all([
        supabase.from('tracks').select('*').eq('id', id).single(),
        supabase
          .from('track_studies')
          .select('position, studies(id, study_id, study_title, passage_ref, key_verse, status, media_link, audio_link, books(book_name))')
          .eq('track_id', id)
          .order('position'),
      ])
      setTrack(track)
      setStudies((ts || []).map(row => row.studies))
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <p>Loading…</p>
  if (!track)  return <p>Track not found.</p>

  const publishedCount = studies.filter(s => s.status === 'Published').length

  return (
    <div style={{ maxWidth: '760px' }}>
      <Link to="/admin/tracks" style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', textDecoration: 'none', display: 'inline-block', marginBottom: '20px' }}>
        ← Tracks
      </Link>

      {/* Header */}
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0 }}>{track.title}</h1>
            {track.is_featured && (
              <span style={{ padding: '3px 10px', borderRadius: '100px', background: '#fdf3dc', color: '#92700a', fontSize: '0.72rem', fontWeight: 700 }}>
                Featured
              </span>
            )}
            {!track.is_public && <span className="badge badge-gray">Private</span>}
          </div>
          {track.description && (
            <p className="page-subtitle">{track.description}</p>
          )}
          {track.sponsor && (
            <p style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', margin: '4px 0 0' }}>
              Presented by <strong>{track.sponsor}</strong>
            </p>
          )}
        </div>
        {isAdmin && (
          <Link to={`/admin/tracks/${id}`} style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', textDecoration: 'none', padding: '6px 14px', border: '1px solid var(--line)', borderRadius: '7px', flexShrink: 0 }}>
            Edit track
          </Link>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', padding: '16px 20px', background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: '10px', marginBottom: '32px' }}>
        {[
          { label: 'Studies',    value: studies.length },
          { label: 'Published',  value: publishedCount },
          { label: 'With Video', value: studies.filter(s => s.media_link).length },
          { label: 'With Audio', value: studies.filter(s => s.audio_link).length },
        ].map(({ label, value }) => (
          <div key={label} style={{ textAlign: 'center', minWidth: '72px' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--slate)', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--ink-soft)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Study list */}
      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '12px' }}>Studies</h2>

      {studies.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: '10px', color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
          No studies in this track yet.
          {isAdmin && <div style={{ marginTop: '12px' }}><Link to={`/admin/tracks/${id}`} className="btn-primary">Add studies</Link></div>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {studies.map((study, i) => (
            <div key={study.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '16px 20px', background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: '10px' }}>

              {/* Step number */}
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--slate)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem', fontWeight: 700, flexShrink: 0 }}>
                {i + 1}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--ink)', marginBottom: '3px' }}>{study.study_title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
                  {study.passage_ref && <span>{study.passage_ref}</span>}
                  {study.passage_ref && study.books?.book_name && <span> · </span>}
                  {study.books?.book_name && <span>{study.books.book_name}</span>}
                </div>
                {study.key_verse && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', marginTop: '4px', fontStyle: 'italic' }}>"{study.key_verse}"</div>
                )}
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  {study.media_link && <span style={{ fontSize: '0.72rem', color: 'var(--slate)', fontWeight: 600 }}>▶ Video</span>}
                  {study.audio_link && <span style={{ fontSize: '0.72rem', color: 'var(--slate)', fontWeight: 600 }}>♪ Audio</span>}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
                {(study.media_link || study.audio_link) && (
                  <Link
                    to={`/study/${study.study_id}?track=${id}&pos=${i}`}
                    className="btn-primary"
                    style={{ fontSize: '0.82rem', padding: '6px 14px' }}
                  >
                    {i === 0 ? 'Start' : 'View'}
                  </Link>
                )}
                {isAdmin && (
                  <Link to={`/admin/studies/${study.id}`} style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', textDecoration: 'none' }}>Edit</Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
