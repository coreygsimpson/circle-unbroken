import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function TrackEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'new'

  const [form, setForm] = useState({
    title: '', description: '', sponsor: '',
    cover_url: '', is_featured: false, is_public: true,
  })
  const [studies, setStudies]   = useState([]) // ordered studies in this track
  const [loading, setLoading]   = useState(!isNew)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [msg, setMsg]           = useState({ type: '', text: '' })

  // Study search
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (isNew) return
    async function load() {
      const [{ data: track }, { data: ts }] = await Promise.all([
        supabase.from('tracks').select('*').eq('id', id).single(),
        supabase
          .from('track_studies')
          .select('id, position, studies(id, study_id, study_title, passage_ref, books(book_name))')
          .eq('track_id', id)
          .order('position'),
      ])
      if (track) {
        setForm({
          title:       track.title       || '',
          description: track.description || '',
          sponsor:     track.sponsor     || '',
          cover_url:   track.cover_url   || '',
          is_featured: track.is_featured || false,
          is_public:   track.is_public   ?? true,
        })
      }
      if (ts) {
        setStudies(ts.map(row => ({ tsId: row.id, position: row.position, ...row.studies })))
      }
      setLoading(false)
    }
    load()
  }, [id, isNew])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setMsg({ type: '', text: '' })
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.title.trim()) { setMsg({ type: 'error', text: 'Title is required.' }); return }
    setSaving(true)
    const payload = {
      title:       form.title.trim(),
      description: form.description.trim() || null,
      sponsor:     form.sponsor.trim() || null,
      cover_url:   form.cover_url.trim() || null,
      is_featured: form.is_featured,
      is_public:   form.is_public,
      updated_at:  new Date().toISOString(),
    }
    let trackId = id
    if (isNew) {
      const { data, error } = await supabase.from('tracks').insert(payload).select('id').single()
      if (error) { setSaving(false); setMsg({ type: 'error', text: error.message }); return }
      trackId = data.id
      navigate(`/admin/tracks/${trackId}`, { replace: true })
    } else {
      const { error } = await supabase.from('tracks').update(payload).eq('id', id)
      if (error) { setSaving(false); setMsg({ type: 'error', text: error.message }); return }
    }
    setSaving(false)
    setMsg({ type: 'success', text: 'Saved.' })
  }

  async function handleDelete() {
    if (!window.confirm('Delete this track? Studies will not be deleted, only removed from the track.')) return
    setDeleting(true)
    await supabase.from('tracks').delete().eq('id', id)
    navigate('/admin/tracks')
  }

  // ── Study search & add ──────────────────────────────────────
  async function handleSearch(q) {
    setQuery(q)
    if (q.trim().length < 2) { setResults([]); return }
    setSearching(true)
    const existingIds = studies.map(s => s.id)
    const { data } = await supabase
      .from('studies')
      .select('id, study_id, study_title, passage_ref, books(book_name)')
      .or(`study_title.ilike.%${q}%,study_id.ilike.%${q}%,passage_ref.ilike.%${q}%`)
      .limit(8)
    setResults((data || []).filter(s => !existingIds.includes(s.id)))
    setSearching(false)
  }

  async function addStudy(study) {
    if (isNew) { setMsg({ type: 'error', text: 'Save the track first, then add studies.' }); return }
    const position = studies.length
    const { data, error } = await supabase
      .from('track_studies')
      .insert({ track_id: id, study_id: study.id, position })
      .select('id')
      .single()
    if (!error) {
      setStudies(prev => [...prev, { tsId: data.id, position, ...study }])
      setQuery('')
      setResults([])
    }
  }

  async function removeStudy(tsId) {
    await supabase.from('track_studies').delete().eq('id', tsId)
    setStudies(prev => {
      const updated = prev.filter(s => s.tsId !== tsId)
      return updated.map((s, i) => ({ ...s, position: i }))
    })
  }

  async function moveStudy(index, dir) {
    const next = [...studies]
    const swap = index + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[index], next[swap]] = [next[swap], next[index]]
    const reordered = next.map((s, i) => ({ ...s, position: i }))
    setStudies(reordered)
    // Persist new positions
    await Promise.all(reordered.map(s =>
      supabase.from('track_studies').update({ position: s.position }).eq('id', s.tsId)
    ))
  }

  if (loading) return <p>Loading…</p>

  return (
    <div style={{ maxWidth: '700px' }}>
      <Link to="/admin/tracks" style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', textDecoration: 'none', display: 'inline-block', marginBottom: '20px' }}>
        ← Tracks
      </Link>

      <div className="page-header">
        <h1>{isNew ? 'New Track' : 'Edit Track'}</h1>
        {!isNew && (
          <Link to={`/admin/tracks/${id}/detail`} className="btn-secondary">View Track →</Link>
        )}
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        <div className="form-section">
          <h2>Details</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink-soft)' }}>
              Title *
              <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
                placeholder="e.g. New Believer Series" autoFocus
                style={{ fontSize: '1rem', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: '7px', background: 'var(--paper)', color: 'var(--ink)' }} />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink-soft)' }}>
              Description
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                placeholder="What is this track about? Who is it for?"
                rows={3}
                style={{ fontSize: '0.94rem', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: '7px', background: 'var(--paper)', color: 'var(--ink)', resize: 'vertical', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', lineHeight: '1.6' }} />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink-soft)' }}>
              Sponsor / Contributor <span style={{ fontWeight: 400 }}>(optional)</span>
              <input type="text" value={form.sponsor} onChange={e => set('sponsor', e.target.value)}
                placeholder="e.g. First Baptist Church"
                style={{ fontSize: '0.95rem', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: '7px', background: 'var(--paper)', color: 'var(--ink)' }} />
            </label>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: 500, color: 'var(--ink)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_featured} onChange={e => set('is_featured', e.target.checked)} />
                Featured track
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: 500, color: 'var(--ink)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_public} onChange={e => set('is_public', e.target.checked)} />
                Public (visible to all users)
              </label>
            </div>
          </div>
        </div>

        {msg.text && (
          <div style={{ padding: '10px 14px', borderRadius: '7px', fontSize: '0.85rem', background: msg.type === 'error' ? 'var(--error-bg)' : 'var(--success-bg)', color: msg.type === 'error' ? 'var(--error)' : 'var(--success)' }}>
            {msg.text}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isNew ? 'Create Track' : 'Save Changes'}
          </button>
          <Link to="/admin/tracks" style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', textDecoration: 'none' }}>Cancel</Link>
          {!isNew && (
            <button type="button" onClick={handleDelete} disabled={deleting}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--error)', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
              {deleting ? 'Deleting…' : 'Delete track'}
            </button>
          )}
        </div>
      </form>

      {/* ── Studies in this track ─────────────────────────────── */}
      {!isNew && (
        <div className="form-section" style={{ marginTop: '32px' }}>
          <h2>Studies in this track</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', margin: '0 0 14px' }}>
            Order determines the sequence users follow. Use the arrows to reorder.
          </p>

          {studies.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>No studies added yet. Search below to add some.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {studies.map((s, i) => (
                <div key={s.tsId} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 14px',
                  background: 'var(--paper-raised)',
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                }}>
                  {/* Position */}
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--slate-light)', color: 'var(--slate)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                    {i + 1}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--ink)' }}>{s.study_title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
                      {s.study_id}{s.passage_ref ? ` · ${s.passage_ref}` : ''}{s.books?.book_name ? ` · ${s.books.book_name}` : ''}
                    </div>
                  </div>

                  {/* Reorder + remove */}
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                    <button type="button" onClick={() => moveStudy(i, -1)} disabled={i === 0}
                      style={{ padding: '4px 8px', border: '1px solid var(--line)', borderRadius: '5px', background: 'none', cursor: i === 0 ? 'default' : 'pointer', color: i === 0 ? 'var(--line)' : 'var(--ink-soft)', fontSize: '0.8rem' }}>
                      ↑
                    </button>
                    <button type="button" onClick={() => moveStudy(i, 1)} disabled={i === studies.length - 1}
                      style={{ padding: '4px 8px', border: '1px solid var(--line)', borderRadius: '5px', background: 'none', cursor: i === studies.length - 1 ? 'default' : 'pointer', color: i === studies.length - 1 ? 'var(--line)' : 'var(--ink-soft)', fontSize: '0.8rem' }}>
                      ↓
                    </button>
                    <button type="button" onClick={() => removeStudy(s.tsId)}
                      style={{ padding: '4px 8px', border: 'none', background: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '0.8rem', marginLeft: '4px' }}>
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Search to add */}
          <div style={{ position: 'relative' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-soft)', display: 'block', marginBottom: '6px' }}>
              Add a study
            </label>
            <input
              type="text" value={query} onChange={e => handleSearch(e.target.value)}
              placeholder="Search by title, study ID, or passage…"
              style={{ width: '100%', fontSize: '0.9rem', padding: '9px 12px', border: '1px solid var(--line)', borderRadius: '7px', background: 'var(--paper)', color: 'var(--ink)', boxSizing: 'border-box' }}
            />
            {searching && <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', marginTop: '4px' }}>Searching…</div>}
            {results.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: '8px', marginTop: '4px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                {results.map(r => (
                  <div key={r.id} onClick={() => addStudy(r)}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--line)', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--slate-light)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--ink)' }}>{r.study_title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>{r.study_id}{r.passage_ref ? ` · ${r.passage_ref}` : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
