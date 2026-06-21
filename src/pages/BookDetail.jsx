import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const STATUS_COLORS = {
  'Not Started': 'badge-gray',
  'In Progress': 'badge-blue',
  'Complete':    'badge-green',
}

const STUDY_STATUS_COLORS = {
  Draft:     'badge-gray',
  Ready:     'badge-blue',
  Published: 'badge-green',
}

export default function BookDetail() {
  const { id } = useParams()
  const { isAdmin } = useAuth()
  const [book, setBook]       = useState(null)
  const [studies, setStudies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: bookData }, { data: studyData }] = await Promise.all([
        supabase.from('books').select('*').eq('id', id).single(),
        supabase
          .from('studies')
          .select('id, study_id, study_title, passage_ref, key_verse, status, week_number, media_link, audio_link')
          .eq('book_id', id)
          .order('week_number', { ascending: true, nullsFirst: false }),
      ])
      setBook(bookData)
      setStudies(studyData || [])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <p>Loading…</p>
  if (!book)   return <p>Book not found.</p>

  const publishedStudies = studies.filter((s) => s.status === 'Published')
  const hasAny = studies.length > 0

  return (
    <div style={{ maxWidth: '760px' }}>

      {/* ── Back link ── */}
      <Link to="/admin/books" style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', textDecoration: 'none', display: 'inline-block', marginBottom: '20px' }}>
        ← All Books
      </Link>

      {/* ── Book header ── */}
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0 }}>{book.book_name}</h1>
            <span className={`badge ${STATUS_COLORS[book.status]}`}>{book.status}</span>
          </div>
          <p className="page-subtitle">
            {book.testament} · {book.genre} · {book.total_chapters} chapter{book.total_chapters !== 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
            <Link to={`/admin/studies/new?book=${id}`} className="btn-primary">+ New Study</Link>
          </div>
        )}
      </div>

      {/* ── Stats row ── */}
      <div style={{
        display: 'flex', gap: '16px', flexWrap: 'wrap',
        padding: '16px 20px', background: 'var(--paper-raised)',
        border: '1px solid var(--line)', borderRadius: '10px',
        marginBottom: '32px',
      }}>
        {[
          { label: 'Total Studies',     value: studies.length },
          { label: 'Published',         value: publishedStudies.length },
          { label: 'With Video',        value: studies.filter(s => s.media_link).length },
          { label: 'With Audio',        value: studies.filter(s => s.audio_link).length },
        ].map(({ label, value }) => (
          <div key={label} style={{ textAlign: 'center', minWidth: '80px' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--slate)', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--ink-soft)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Studies list ── */}
      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '12px' }}>
        Studies
      </h2>

      {!hasAny ? (
        <div style={{
          padding: '40px 20px', textAlign: 'center',
          background: 'var(--paper-raised)', border: '1px solid var(--line)',
          borderRadius: '10px', color: 'var(--ink-soft)', fontSize: '0.9rem',
        }}>
          No studies yet for {book.book_name}.
          {isAdmin && (
            <div style={{ marginTop: '12px' }}>
              <Link to={`/admin/studies/new?book=${id}`} className="btn-primary">Create the first one</Link>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {studies.map((study) => (
            <div key={study.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: '16px',
              padding: '16px 20px',
              background: 'var(--paper-raised)', border: '1px solid var(--line)',
              borderRadius: '10px',
            }}>
              {/* Week badge */}
              {study.week_number && (
                <div style={{
                  minWidth: '36px', height: '36px', borderRadius: '50%',
                  background: 'var(--slate-light)', color: 'var(--slate)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                }}>
                  {study.week_number}
                </div>
              )}

              {/* Study info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--ink)' }}>
                    {study.study_title}
                  </span>
                  <span className={`badge ${STUDY_STATUS_COLORS[study.status]}`}>{study.status}</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', marginTop: '3px' }}>
                  {study.passage_ref && <span>{study.passage_ref}</span>}
                  {study.passage_ref && study.study_id && <span> · </span>}
                  {study.study_id && <span style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{study.study_id}</span>}
                </div>
                {study.key_verse && (
                  <div style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', marginTop: '4px', fontStyle: 'italic' }}>
                    "{study.key_verse}"
                  </div>
                )}
                {/* Media indicators */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  {study.media_link && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--slate)', fontWeight: 600 }}>▶ Video</span>
                  )}
                  {study.audio_link && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--slate)', fontWeight: 600 }}>♪ Audio</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px', flexShrink: 0, alignItems: 'center' }}>
                {(study.media_link || study.audio_link) && (
                  <Link
                    to={`/study/${study.study_id}`}
                    style={{ fontSize: '0.82rem', color: 'var(--slate)', fontWeight: 600, textDecoration: 'none' }}
                  >
                    View
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    to={`/admin/studies/${study.id}`}
                    style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', textDecoration: 'none' }}
                  >
                    Edit
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
