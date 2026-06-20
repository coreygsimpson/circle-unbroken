import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

/**
 * SlidesUploader
 *
 * Uploads a PowerPoint or PDF file to Supabase Storage (study-slides bucket)
 * and returns the public URL.
 *
 * Props:
 *   studyId          — used to namespace the file path in the bucket
 *   onComplete       — called with { slidesLink: string }
 *   currentSlidesLink — shows current state if already set
 */
export default function SlidesUploader({ studyId, onComplete, currentSlidesLink }) {
  const [stage, setStage]   = useState('idle') // idle | uploading | done | error
  const [errorMsg, setErrorMsg] = useState('')
  const fileInputRef = useRef(null)

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setStage('uploading')
    setErrorMsg('')

    const ext      = file.name.split('.').pop().toLowerCase()
    const filePath = `${studyId || 'unsaved'}/${Date.now()}.${ext}`

    const { data, error } = await supabase.storage
      .from('study-slides')
      .upload(filePath, file, { upsert: true, contentType: file.type })

    if (error) {
      setStage('error')
      setErrorMsg(error.message)
      return
    }

    const { data: urlData } = supabase.storage
      .from('study-slides')
      .getPublicUrl(data.path)

    setStage('done')
    onComplete?.({ slidesLink: urlData.publicUrl })
  }

  const fileLabel = currentSlidesLink
    ? decodeURIComponent(currentSlidesLink.split('/').pop().split('?')[0])
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* Current file indicator */}
      {currentSlidesLink && stage === 'idle' && (
        <div style={{
          padding: '10px 14px', borderRadius: '7px',
          background: 'var(--slate-light)', border: '1px solid var(--line)',
          fontSize: '0.84rem', color: 'var(--slate)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: '12px',
        }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            ✓ {fileLabel || 'Slides uploaded'}
          </span>
          <label style={{ color: 'var(--ink-soft)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline', flexShrink: 0 }}>
            Replace
            <input ref={fileInputRef} type="file" accept=".pptx,.ppt,.pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/pdf" onChange={handleFileChange} style={{ display: 'none' }} />
          </label>
        </div>
      )}

      {/* File picker */}
      {!currentSlidesLink && stage === 'idle' && (
        <label style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '10px', padding: '16px',
          border: '2px dashed var(--line)', borderRadius: '8px',
          cursor: 'pointer', fontSize: '0.88rem', color: 'var(--ink-soft)',
          background: 'var(--paper)',
        }}>
          <span style={{ fontSize: '1.2rem' }}>📄</span>
          <span>Upload slides (PowerPoint or PDF)</span>
          <input ref={fileInputRef} type="file" accept=".pptx,.ppt,.pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/pdf" onChange={handleFileChange} style={{ display: 'none' }} />
        </label>
      )}

      {/* Uploading */}
      {stage === 'uploading' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>Uploading slides…</div>
          <div style={{ height: '6px', background: 'var(--line)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '3px', background: 'var(--slate)',
              width: '100%', animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          </div>
        </div>
      )}

      {/* Done */}
      {stage === 'done' && (
        <div style={{
          padding: '10px 14px', borderRadius: '7px',
          background: 'var(--success-bg)', border: '1px solid #c3e6cb',
          fontSize: '0.84rem', color: 'var(--success)',
        }}>
          ✓ Slides uploaded successfully.
        </div>
      )}

      {/* Error */}
      {stage === 'error' && (
        <div style={{
          padding: '10px 14px', borderRadius: '7px',
          background: 'var(--error-bg)', fontSize: '0.84rem', color: 'var(--error)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>{errorMsg || 'Upload failed.'}</span>
          <button type="button" onClick={() => setStage('idle')} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline', padding: 0 }}>
            Try again
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
