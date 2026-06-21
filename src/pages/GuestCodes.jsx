import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function GuestCodes() {
  const [codes, setCodes]   = useState([])
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  // New code form
  const [newCode,    setNewCode]    = useState('')
  const [newLabel,   setNewLabel]   = useState('')
  const [newTrackId, setNewTrackId] = useState('')
  const [formError,  setFormError]  = useState('')
  const [showForm,   setShowForm]   = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const [{ data: codesData }, { data: tracksData }] = await Promise.all([
      supabase
        .from('guest_codes')
        .select('*, tracks(title)')
        .order('created_at', { ascending: false }),
      supabase
        .from('tracks')
        .select('id, title')
        .order('title'),
    ])
    setCodes(codesData || [])
    setTracks(tracksData || [])
    setLoading(false)
  }

  async function handleCreate(e) {
    e.preventDefault()
    setFormError('')
    if (!newCode.trim()) { setFormError('Code is required.'); return }
    setSaving(true)
    const { error } = await supabase.from('guest_codes').insert({
      code:     newCode.trim().toUpperCase(),
      label:    newLabel.trim() || null,
      track_id: newTrackId || null,
    })
    setSaving(false)
    if (error) {
      setFormError(error.message.includes('unique') ? 'That code already exists.' : error.message)
      return
    }
    setNewCode(''); setNewLabel(''); setNewTrackId(''); setShowForm(false)
    load()
  }

  async function toggleActive(codeRow) {
    await supabase
      .from('guest_codes')
      .update({ is_active: !codeRow.is_active })
      .eq('id', codeRow.id)
    setCodes(prev => prev.map(c => c.id === codeRow.id ? { ...c, is_active: !c.is_active } : c))
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this code?')) return
    await supabase.from('guest_codes').delete().eq('id', id)
    setCodes(prev => prev.filter(c => c.id !== id))
  }

  if (loading) return <p>Loading…</p>

  return (
    <div style={{ maxWidth: '760px' }}>
      <div className="page-header">
        <h1>Guest Codes</h1>
        <button className="btn-primary" onClick={() => setShowForm(f => !f)}>
          {showForm ? 'Cancel' : '+ New Code'}
        </button>
      </div>

      <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', marginBottom: '28px' }}>
        Share a passcode with someone to give them guest access. Link it to a track and they'll land there automatically.
      </p>

      {/* Create form */}
      {showForm && (
        <div style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: '12px', padding: '20px', marginBottom: '28px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', marginTop: 0 }}>New Guest Code</h2>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gap: '14px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.88rem', fontWeight: 600 }}>
                Passcode *
                <input
                  type="text"
                  value={newCode}
                  onChange={e => setNewCode(e.target.value.toUpperCase())}
                  placeholder="e.g. FAMILY2024"
                  style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}
                  autoFocus
                />
                <span style={{ fontWeight: 400, fontSize: '0.78rem', color: 'var(--ink-soft)' }}>
                  Share this with guests. Case-insensitive, stored uppercase.
                </span>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.88rem', fontWeight: 600 }}>
                Label (optional)
                <input
                  type="text"
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  placeholder="e.g. Smith Family, Sunday School Class"
                />
                <span style={{ fontWeight: 400, fontSize: '0.78rem', color: 'var(--ink-soft)' }}>
                  Internal name for your reference. Shown to guests in the banner.
                </span>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.88rem', fontWeight: 600 }}>
                Auto-route to Track (optional)
                <select
                  value={newTrackId}
                  onChange={e => setNewTrackId(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: '7px', border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', fontSize: '0.9rem' }}
                >
                  <option value="">— No specific track (go to Dashboard) —</option>
                  {tracks.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </label>
            </div>

            {formError && (
              <div style={{ marginTop: '12px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '7px', color: '#b91c1c', fontSize: '0.85rem' }}>
                {formError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Creating…' : 'Create Code'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', border: '1px solid var(--line)', borderRadius: '7px', padding: '8px 16px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--ink-soft)' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Code list */}
      {codes.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: '10px', color: 'var(--ink-soft)' }}>
          No guest codes yet. Create one to let guests join without an account.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {codes.map(codeRow => (
            <div
              key={codeRow.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
                padding: '14px 18px',
                background: 'var(--paper-raised)',
                border: `1px solid ${codeRow.is_active ? 'var(--line)' : 'var(--line)'}`,
                borderRadius: '10px',
                opacity: codeRow.is_active ? 1 : 0.55,
              }}
            >
              {/* Code badge */}
              <div style={{
                fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700,
                letterSpacing: '0.1em', color: 'var(--slate)',
                background: 'var(--slate-light)', padding: '5px 12px',
                borderRadius: '6px', flexShrink: 0,
              }}>
                {codeRow.code}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {codeRow.label && (
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--ink)', marginBottom: '2px' }}>
                    {codeRow.label}
                  </div>
                )}
                <div style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
                  {codeRow.tracks
                    ? <>→ <strong>{codeRow.tracks.title}</strong></>
                    : 'No track linked · goes to Dashboard'}
                </div>
              </div>

              {/* Status + actions */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
                <span style={{
                  padding: '3px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 700,
                  background: codeRow.is_active ? '#dcfce7' : '#f1f5f9',
                  color: codeRow.is_active ? '#15803d' : '#64748b',
                }}>
                  {codeRow.is_active ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={() => toggleActive(codeRow)}
                  style={{ background: 'none', border: '1px solid var(--line)', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--ink-soft)' }}
                >
                  {codeRow.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => handleDelete(codeRow.id)}
                  style={{ background: 'none', border: 'none', padding: '4px 6px', cursor: 'pointer', color: '#ef4444', fontSize: '0.85rem' }}
                  title="Delete code"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
