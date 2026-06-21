import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const LINK_TYPES = ['Thematic', 'Prophetic', 'Character', 'Word Study']

const LINK_TYPE_COLORS = {
  Thematic:    { bg: 'var(--slate-light)',  color: 'var(--slate)' },
  Prophetic:   { bg: '#fdf3dc',             color: '#92700a' },
  Character:   { bg: '#f0f7ee',             color: '#3a7d44' },
  'Word Study':{ bg: '#f5f0fa',             color: '#7c3aed' },
}

/**
 * CrossReferences
 *
 * Props:
 *   studyDbId   — the UUID `id` of the study (for DB queries)
 *   studyId     — the human-readable study_id (e.g. JHN-01-A) for display
 *   readOnly    — if true, only show existing refs (no add/remove)
 */
export default function CrossReferences({ studyDbId, studyId, readOnly = false }) {
  const { isAdmin } = useAuth()
  const canEdit = isAdmin && !readOnly

  const [refs, setRefs]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)

  // Search state
  const [query, setQuery]         = useState('')
  const [results, setResults]     = useState([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected]   = useState(null) // { id, study_id, study_title, passage_ref }

  // New ref form
  const [linkType, setLinkType]   = useState('Thematic')
  const [note, setNote]           = useState('')
  const [adding, setAdding]       = useState(false)

  useEffect(() => {
    if (studyDbId) loadRefs()
  }, [studyDbId])

  async function loadRefs() {
    setLoading(true)
    // Fetch refs in both directions
    const [fromRes, toRes] = await Promise.all([
      supabase
        .from('cross_references')
        .select('id, link_type, connection_note, label, to_study_id, studies!to_study_id(id, study_id, study_title, passage_ref)')
        .eq('from_study_id', studyDbId),
      supabase
        .from('cross_references')
        .select('id, link_type, connection_note, label, from_study_id, studies!from_study_id(id, study_id, study_title, passage_ref)')
        .eq('to_study_id', studyDbId),
    ])

    const fromRefs = (fromRes.data || []).map(r => ({
      id:         r.id,
      link_type:  r.link_type,
      note:       r.connection_note,
      study:      r.studies,
      direction:  'from',
    }))
    const toRefs = (toRes.data || []).map(r => ({
      id:         r.id,
      link_type:  r.link_type,
      note:       r.connection_note,
      study:      r.studies,
      direction:  'to',
    }))

    setRefs([...fromRefs, ...toRefs])
    setLoading(false)
  }

  async function handleSearch(q) {
    setQuery(q)
    setSelected(null)
    if (q.trim().length < 2) { setResults([]); return }
    setSearching(true)
    const { data } = await supabase
      .from('studies')
      .select('id, study_id, study_title, passage_ref')
      .or(`study_title.ilike.%${q}%,study_id.ilike.%${q}%,passage_ref.ilike.%${q}%`)
      .neq('id', studyDbId)
      .limit(8)
    setResults(data || [])
    setSearching(false)
  }

  async function handleAdd() {
    if (!selected) return
    setAdding(true)
    const { error } = await supabase.from('cross_references').insert({
      from_study_id:   studyDbId,
      to_study_id:     selected.id,
      link_type:       linkType,
      connection_note: note.trim() || null,
      label:           `${studyId} → ${selected.study_id}`,
    })
    setAdding(false)
    if (!error) {
      setShowForm(false)
      setQuery('')
      setResults([])
      setSelected(null)
      setNote('')
      setLinkType('Thematic')
      loadRefs()
    }
  }

  async function handleRemove(refId) {
    if (!window.confirm('Remove this cross-reference?')) return
    await supabase.from('cross_references').delete().eq('id', refId)
    setRefs(prev => prev.filter(r => r.id !== refId))
  }

  if (loading) return null

  return (
    <div>
      {/* Existing refs */}
      {refs.length === 0 && !canEdit && (
        <p style={{ color: 'var(--ink-soft)', fontSize: '0.88rem' }}>No cross-references yet.</p>
      )}

      {refs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: canEdit ? '16px' : '0' }}>
          {refs.map(ref => {
            const colors = LINK_TYPE_COLORS[ref.link_type] || LINK_TYPE_COLORS.Thematic
            return (
              <div key={ref.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: '12px',
                padding: '12px 14px',
                background: 'var(--paper-raised)',
                border: '1px solid var(--line)',
                borderRadius: '8px',
              }}>
                {/* Link type badge */}
                <span style={{
                  padding: '3px 10px', borderRadius: '100px', flexShrink: 0,
                  fontSize: '0.72rem', fontWeight: 700,
                  background: colors.bg, color: colors.color,
                }}>
                  {ref.link_type}
                </span>

                {/* Study info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--ink)' }}>
                      {ref.study?.study_title}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', fontFamily: 'monospace' }}>
                      {ref.study?.study_id}
                    </span>
                  </div>
                  {ref.study?.passage_ref && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--slate)', marginTop: '2px' }}>
                      {ref.study.passage_ref}
                    </div>
                  )}
                  {ref.note && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', marginTop: '4px', fontStyle: 'italic' }}>
                      {ref.note}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
                  {ref.study?.study_id && (
                    <Link
                      to={`/study/${ref.study.study_id}`}
                      style={{ fontSize: '0.78rem', color: 'var(--slate)', fontWeight: 600, textDecoration: 'none' }}
                    >
                      View
                    </Link>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => handleRemove(ref.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--ink-soft)', fontSize: '0.78rem', cursor: 'pointer', padding: 0 }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add form */}
      {canEdit && !showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          style={{
            background: 'none', border: '1px dashed var(--line)',
            borderRadius: '8px', padding: '8px 16px',
            color: 'var(--ink-soft)', fontSize: '0.82rem',
            cursor: 'pointer', width: '100%',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.target.style.borderColor = 'var(--slate)'; e.target.style.color = 'var(--slate)' }}
          onMouseLeave={e => { e.target.style.borderColor = 'var(--line)'; e.target.style.color = 'var(--ink-soft)' }}
        >
          + Add cross-reference
        </button>
      )}

      {canEdit && showForm && (
        <div style={{
          padding: '16px', border: '1px solid var(--line)',
          borderRadius: '10px', background: 'var(--paper-raised)',
          display: 'flex', flexDirection: 'column', gap: '12px',
        }}>

          {/* Study search */}
          <div style={{ position: 'relative' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-soft)', display: 'block', marginBottom: '6px' }}>
              Search for a study
            </label>
            <input
              type="text"
              value={selected ? `${selected.study_title} (${selected.study_id})` : query}
              onChange={e => { setSelected(null); handleSearch(e.target.value) }}
              placeholder="Type a title, study ID, or passage…"
              style={{
                width: '100%', fontSize: '0.9rem', padding: '9px 12px',
                border: `1px solid ${selected ? 'var(--slate)' : 'var(--line)'}`,
                borderRadius: '7px', background: 'var(--paper)', color: 'var(--ink)',
                boxSizing: 'border-box',
              }}
            />
            {results.length > 0 && !selected && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
                background: 'var(--paper-raised)', border: '1px solid var(--line)',
                borderRadius: '8px', marginTop: '4px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                overflow: 'hidden',
              }}>
                {results.map(r => (
                  <div
                    key={r.id}
                    onClick={() => { setSelected(r); setResults([]) }}
                    style={{
                      padding: '10px 14px', cursor: 'pointer',
                      borderBottom: '1px solid var(--line)',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--slate-light)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--ink)' }}>{r.study_title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
                      {r.study_id}{r.passage_ref ? ` · ${r.passage_ref}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {searching && (
              <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', marginTop: '4px' }}>Searching…</div>
            )}
          </div>

          {/* Link type */}
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-soft)', display: 'block', marginBottom: '6px' }}>
              Link type
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {LINK_TYPES.map(t => {
                const colors = LINK_TYPE_COLORS[t]
                const active = linkType === t
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setLinkType(t)}
                    style={{
                      padding: '4px 12px', borderRadius: '100px', border: '1px solid',
                      fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                      borderColor: active ? colors.color : 'var(--line)',
                      background:  active ? colors.bg   : 'transparent',
                      color:       active ? colors.color : 'var(--ink-soft)',
                      transition:  'all 0.12s',
                    }}
                  >
                    {t}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Note */}
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-soft)', display: 'block', marginBottom: '6px' }}>
              Connection note <span style={{ fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Both passages speak to the pre-existence of Christ"
              style={{
                width: '100%', fontSize: '0.88rem', padding: '9px 12px',
                border: '1px solid var(--line)', borderRadius: '7px',
                background: 'var(--paper)', color: 'var(--ink)', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!selected || adding}
              className="btn-primary"
              style={{ fontSize: '0.85rem' }}
            >
              {adding ? 'Adding…' : 'Add'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setQuery(''); setResults([]); setSelected(null); setNote('') }}
              style={{ background: 'none', border: 'none', color: 'var(--ink-soft)', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
