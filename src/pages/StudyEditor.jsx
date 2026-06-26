import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import VideoUploader from '../components/VideoUploader'
import AudioUploader from '../components/AudioUploader'
import SlidesUploader from '../components/SlidesUploader'
import CrossReferences from '../components/CrossReferences'

const UNIT_TYPES = ['Chapter', 'Passage', 'Whole Book']
const STATUSES = ['Draft', 'Ready', 'Published']
const DISTRIBUTIONS = ['Personal', 'Group', 'Web']

export default function StudyEditor() {
  const { id } = useParams()
  const isNew = id === 'new'
  const navigate = useNavigate()

  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [form, setForm] = useState({
    study_id: '',
    study_title: '',
    book_id: '',
    passage_ref: '',
    unit_type: 'Passage',
    key_verse: '',
    summary: '',
    status: 'Draft',
    media_link: '',
    audio_link: '',
    cf_video_uid: '',
    slides_link: '',
    distribution: ['Personal'],
    duration_minutes: '',
    tags: [],
  })

  useEffect(() => {
    loadBooks()
    if (!isNew) loadStudy()
  }, [id])

  async function loadBooks() {
    const { data } = await supabase.from('books').select('id, book_name, book_order').order('book_order')
    setBooks(data || [])
  }

  async function loadStudy() {
    setLoading(true)
    const { data, error } = await supabase.from('studies').select('*').eq('id', id).single()
    if (!error && data) {
      setForm({
        ...data,
        distribution: data.distribution || [],
        duration_minutes: data.duration_minutes ?? '',
        tags: data.tags || [],
      })
    }
    setLoading(false)
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function toggleDistribution(value) {
    setForm((prev) => {
      const has = prev.distribution.includes(value)
      return {
        ...prev,
        distribution: has
          ? prev.distribution.filter((d) => d !== value)
          : [...prev.distribution, value],
      }
    })
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setSaving(true)

    const { _tagsRaw, ...formClean } = form
    const payload = {
      ...formClean,
      duration_minutes: form.duration_minutes === '' ? null : Number(form.duration_minutes),
      book_id: form.book_id || null,
      tags: form.tags || [],
    }

    let result
    if (isNew) {
      result = await supabase.from('studies').insert(payload).select().single()
    } else {
      result = await supabase.from('studies').update(payload).eq('id', id).select().single()
    }

    setSaving(false)

    if (result.error) {
      setError(result.error.message)
    } else {
      setSuccessMsg('Saved!')
      if (isNew) {
        navigate(`/admin/studies/${result.data.id}`, { replace: true })
      }
    }
  }

  if (loading) return <p>Loading...</p>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{isNew ? 'New Study' : form.study_title || 'Edit Study'}</h1>
          <p className="page-subtitle">Fill in what you have — you can always come back and finish later.</p>
        </div>
        {!isNew && form.study_id && (form.media_link || form.audio_link) && (
          <Link to={`/study/${form.study_id}`} className="btn-secondary" style={{ alignSelf: 'flex-start' }}>
            View Study →
          </Link>
        )}
      </div>

      <form onSubmit={handleSave} className="study-form">
        <div className="form-section">
          <h2>Basics</h2>

          <div className="form-row">
            <label>
              Study Title
              <input
                type="text"
                value={form.study_title}
                onChange={(e) => updateField('study_title', e.target.value)}
                placeholder="e.g. In the Beginning — God"
                required
              />
            </label>

            <label>
              Study ID
              <input
                type="text"
                value={form.study_id}
                onChange={(e) => updateField('study_id', e.target.value)}
                placeholder="e.g. GEN-01-A"
                required
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Book
              <select value={form.book_id || ''} onChange={(e) => updateField('book_id', e.target.value)} required>
                <option value="">Select a book...</option>
                {books.map((b) => (
                  <option key={b.id} value={b.id}>{b.book_name}</option>
                ))}
              </select>
            </label>

            <label>
              Passage Reference
              <input
                type="text"
                value={form.passage_ref || ''}
                onChange={(e) => updateField('passage_ref', e.target.value)}
                placeholder="e.g. Genesis 1:1–2:3"
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Unit Type
              <select value={form.unit_type || ''} onChange={(e) => updateField('unit_type', e.target.value)}>
                {UNIT_TYPES.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>

            <label>
              Key Verse
              <input
                type="text"
                value={form.key_verse || ''}
                onChange={(e) => updateField('key_verse', e.target.value)}
                placeholder="e.g. Genesis 1:1"
              />
            </label>
          </div>
        </div>

        <div className="form-section">
          <h2>Content</h2>

          <label>
            Summary / Teaching Notes
            <textarea
              rows={8}
              value={form.summary || ''}
              onChange={(e) => updateField('summary', e.target.value)}
              placeholder="Write the main teaching content here. This is the heart of the study."
            />
          </label>

          <label style={{ marginTop: '16px' }}>
            Tags
            <input
              type="text"
              value={(form.tags || []).join(', ')}
              onChange={(e) => {
                const raw = e.target.value
                // Keep as string while typing; parse on blur
                updateField('_tagsRaw', raw)
              }}
              onBlur={(e) => {
                const parsed = e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                updateField('tags', parsed)
                updateField('_tagsRaw', undefined)
              }}
              placeholder="e.g. creation, covenant, faith — comma separated"
            />
          </label>
          {(form.tags || []).length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
              {form.tags.map(tag => (
                <span key={tag} style={{
                  padding: '3px 10px', borderRadius: '100px',
                  background: 'var(--slate-light)', color: 'var(--slate)',
                  fontSize: '0.78rem', fontWeight: 600,
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="form-section">
          <h2>Media</h2>

          <p className="section-heading" style={{ marginTop: 0 }}>Video</p>
          <p className="form-help">
            Upload a video file. Cloudflare Stream processes it automatically and extracts an audio track.
            {!isNew && !form.media_link && ' Save the study first before uploading.'}
          </p>
          {(isNew && !form.media_link) ? (
            <div style={{ padding: '12px 14px', borderRadius: '7px', background: 'var(--paper)', border: '1px solid var(--line)', fontSize: '0.84rem', color: 'var(--ink-soft)' }}>
              Save the study first, then come back to upload video and audio.
            </div>
          ) : (
            <VideoUploader
              studyTitle={form.study_title}
              currentMediaLink={form.media_link}
              onComplete={({ cfVideoUid, mediaLink, audioLink, durationMinutes }) => {
                updateField('cf_video_uid', cfVideoUid)
                updateField('media_link', mediaLink)
                if (audioLink) updateField('audio_link', audioLink)
                if (durationMinutes) updateField('duration_minutes', durationMinutes)
              }}
            />
          )}

          <p className="section-heading">Audio only (optional)</p>
          <p className="form-help">
            No video yet? Upload an audio file here. It will be playable in the study viewer.
            Once you upload a full video above, the extracted audio track will replace this.
          </p>
          {(isNew && !form.audio_link) ? null : (
            <AudioUploader
              studyId={isNew ? null : id}
              currentAudioLink={form.audio_link}
              onComplete={({ audioLink }) => updateField('audio_link', audioLink)}
            />
          )}

          <p className="section-heading">Slides</p>
          <p className="form-help">PowerPoint (.pptx) or PDF.</p>
          {isNew ? (
            <div style={{ padding: '12px 14px', borderRadius: '7px', background: 'var(--paper)', border: '1px solid var(--line)', fontSize: '0.84rem', color: 'var(--ink-soft)' }}>
              Save the study first, then come back to upload slides.
            </div>
          ) : (
            <SlidesUploader
              studyId={id}
              currentSlidesLink={form.slides_link}
              onComplete={({ slidesLink }) => updateField('slides_link', slidesLink)}
            />
          )}
        </div>

        <div className="form-section">
          <h2>Status & Distribution</h2>

          <div className="form-row">
            <label>
              Status
              <select value={form.status} onChange={(e) => updateField('status', e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>

            <label>
              Duration (minutes)
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="number"
                  value={form.duration_minutes}
                  onChange={(e) => updateField('duration_minutes', e.target.value)}
                  placeholder="e.g. 45"
                  min="1"
                  style={{ flex: 1 }}
                />
                {(form.cf_video_uid || form.audio_link) && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (form.cf_video_uid) {
                        // Fetch from Cloudflare Stream metadata
                        try {
                          const res = await fetch(`/api/stream/${form.cf_video_uid}/status`)
                          const data = await res.json()
                          const secs = data.result?.duration
                          if (secs) updateField('duration_minutes', Math.round(secs / 60))
                        } catch { /* ignore */ }
                      } else if (form.audio_link) {
                        // Read duration from audio element
                        const audio = new Audio(form.audio_link)
                        audio.addEventListener('loadedmetadata', () => {
                          if (audio.duration && isFinite(audio.duration)) {
                            updateField('duration_minutes', Math.round(audio.duration / 60))
                          }
                        })
                        audio.load()
                      }
                    }}
                    style={{
                      padding: '8px 12px', border: '1px solid var(--line)', borderRadius: '7px',
                      background: 'var(--paper)', color: 'var(--ink-soft)', fontSize: '0.8rem',
                      cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                    }}
                  >
                    Fetch from media
                  </button>
                )}
              </div>
            </label>
          </div>

          <div className="checkbox-group">
            <span className="checkbox-group-label">Distribution</span>
            {DISTRIBUTIONS.map((d) => (
              <label key={d} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.distribution.includes(d)}
                  onChange={() => toggleDistribution(d)}
                />
                {d}
              </label>
            ))}
          </div>
        </div>

        {!isNew && (
          <div className="form-section">
            <h2>Cross-References</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', margin: '0 0 14px' }}>
              Link this study to related studies by theme, prophecy, character, or word study.
            </p>
            <CrossReferences studyDbId={id} studyId={form.study_id} />
          </div>
        )}

        {error && <div className="form-error">{error}</div>}
        {successMsg && <div className="form-success">{successMsg}</div>}

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Study'}
          </button>
        </div>
      </form>
    </div>
  )
}
