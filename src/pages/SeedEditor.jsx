import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const STATUS_OPTIONS = [
  { value: 'seed',  label: 'Seed',  desc: 'Raw notes, just getting started' },
  { value: 'draft', label: 'Draft', desc: 'Taking shape, needs more work' },
  { value: 'ready', label: 'Ready', desc: 'Ready to become a full study' },
]

export default function SeedEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isNew = id === 'new'

  const [form, setForm] = useState({
    title:      '',
    content:    '',
    bible_refs: '',
    tags:       '',   // comma-separated string in the UI, stored as array
    status:     'seed',
  })
  const [loading,  setLoading]  = useState(!isNew)
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [msg,      setMsg]      = useState({ type: '', text: '' })

  useEffect(() => {
    if (isNew) return
    async function load() {
      const { data } = await supabase.from('study_seeds').select('*').eq('id', id).single()
      if (data) {
        setForm({
          title:      data.title      || '',
          content:    data.content    || '',
          bible_refs: data.bible_refs || '',
          tags:       (data.tags || []).join(', '),
          status:     data.status     || 'seed',
        })
      }
      setLoading(false)
    }
    load()
  }, [id, isNew])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setMsg({ type: '', text: '' })
  }

  function parseTags(raw) {
    return raw.split(',').map(t => t.trim()).filter(Boolean)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.title.trim()) { setMsg({ type: 'error', text: 'Title is required.' }); return }

    setSaving(true)
    const payload = {
      title:      form.title.trim(),
      content:    form.content.trim() || null,
      bible_refs: form.bible_refs.trim() || null,
      tags:       parseTags(form.tags),
      status:     form.status,
      updated_at: new Date().toISOString(),
    }

    let error
    if (isNew) {
      const res = await supabase.from('study_seeds').insert({ ...payload, created_by: user.id })
      error = res.error
    } else {
      const res = await supabase.from('study_seeds').update(payload).eq('id', id)
      error = res.error
    }

    setSaving(false)
    if (error) {
      setMsg({ type: 'error', text: error.message })
    } else if (isNew) {
      navigate('/admin/seeds')
    } else {
      setMsg({ type: 'success', text: 'Saved.' })
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this seed? This cannot be undone.')) return
    setDeleting(true)
    await supabase.from('study_seeds').delete().eq('id', id)
    navigate('/admin/seeds')
  }

  if (loading) return <p>Loading…</p>

  return (
    <div style={{ maxWidth: '680px' }}>
      <Link to="/admin/seeds" style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', textDecoration: 'none', display: 'inline-block', marginBottom: '20px' }}>
        ← Seeds
      </Link>

      <div className="page-header">
        <h1>{isNew ? 'New Seed' : 'Edit Seed'}</h1>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Title */}
        <div className="form-section">
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink-soft)' }}>
            Title <span style={{ color: 'var(--error)', marginLeft: '2px' }}>*</span>
            <input
              type="text"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. The concept of grace in Paul's letters"
              autoFocus
              style={{ fontSize: '1rem', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: '7px', background: 'var(--paper)', color: 'var(--ink)' }}
            />
          </label>
        </div>

        {/* Bible References */}
        <div className="form-section">
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink-soft)' }}>
            Bible References
            <input
              type="text"
              value={form.bible_refs}
              onChange={e => set('bible_refs', e.target.value)}
              placeholder="e.g. Romans 5:1-5, Ephesians 2:8-9, Titus 2:11"
              style={{ fontSize: '0.95rem', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: '7px', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'Georgia, serif' }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', fontWeight: 400 }}>Free-form — list any references, separated by commas.</span>
          </label>
        </div>

        {/* Notes / Content */}
        <div className="form-section">
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink-soft)' }}>
            Notes
            <textarea
              value={form.content}
              onChange={e => set('content', e.target.value)}
              placeholder="Paste in scripture, observations, outlines, cross-references, rough thoughts — anything goes here."
              rows={14}
              style={{
                fontSize: '0.94rem', padding: '12px 14px',
                border: '1px solid var(--line)', borderRadius: '7px',
                background: 'var(--paper)', color: 'var(--ink)',
                resize: 'vertical', lineHeight: '1.7',
                fontFamily: 'Georgia, serif',
              }}
            />
          </label>
        </div>

        {/* Tags */}
        <div className="form-section">
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink-soft)' }}>
            Tags
            <input
              type="text"
              value={form.tags}
              onChange={e => set('tags', e.target.value)}
              placeholder="e.g. grace, salvation, Paul, Romans"
              style={{ fontSize: '0.95rem', padding: '10px 13px', border: '1px solid var(--line)', borderRadius: '7px', background: 'var(--paper)', color: 'var(--ink)' }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', fontWeight: 400 }}>Comma-separated. Use book names, topics, themes.</span>
          </label>
        </div>

        {/* Status */}
        <div className="form-section">
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink-soft)', marginBottom: '10px' }}>Status</div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {STATUS_OPTIONS.map(opt => (
              <label key={opt.value} style={{
                flex: 1, minWidth: '140px', padding: '12px 14px',
                border: `2px solid ${form.status === opt.value ? 'var(--slate)' : 'var(--line)'}`,
                borderRadius: '8px', cursor: 'pointer',
                background: form.status === opt.value ? 'var(--slate-light)' : 'var(--paper)',
                transition: 'all 0.12s',
              }}>
                <input
                  type="radio"
                  name="status"
                  value={opt.value}
                  checked={form.status === opt.value}
                  onChange={() => set('status', opt.value)}
                  style={{ display: 'none' }}
                />
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: form.status === opt.value ? 'var(--slate)' : 'var(--ink)', marginBottom: '2px' }}>
                  {opt.label}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>{opt.desc}</div>
              </label>
            ))}
          </div>
        </div>

        {msg.text && (
          <div style={{
            padding: '10px 14px', borderRadius: '7px', fontSize: '0.85rem',
            background: msg.type === 'error' ? 'var(--error-bg)' : 'var(--success-bg)',
            color:      msg.type === 'error' ? 'var(--error)'    : 'var(--success)',
          }}>
            {msg.text}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isNew ? 'Create Seed' : 'Save Changes'}
          </button>
          <Link to="/admin/seeds" style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', textDecoration: 'none' }}>
            Cancel
          </Link>
          {!isNew && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              style={{
                marginLeft: 'auto', background: 'none', border: 'none',
                color: 'var(--error)', fontSize: '0.82rem', cursor: 'pointer',
                textDecoration: 'underline', padding: 0,
              }}
            >
              {deleting ? 'Deleting…' : 'Delete seed'}
            </button>
          )}
        </div>

      </form>
    </div>
  )
}
