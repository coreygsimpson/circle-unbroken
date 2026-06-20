import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

/**
 * AudioUploader
 *
 * For studies that have audio but no video yet. Uploads an audio file
 * (MP3, M4A, WAV, etc.) to Supabase Storage and returns the public URL.
 *
 * Props:
 *   studyId       — used to namespace the file path in the bucket
 *   onComplete    — called with { audioLink: string }
 *   currentAudioLink — shows current state if already set
 */
export default function AudioUploader({ studyId, onComplete, currentAudioLink }) {
  const [stage, setStage]     = useState('idle') // idle | uploading | done | error
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const fileInputRef = useRef(null)

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setStage('uploading')
    setProgress(0)
    setErrorMsg('')

    const ext      = file.name.split('.').pop()
    const filePath = `${studyId || 'unsaved'}/${Date.now()}.${ext}`

    const { data, error } = await supabase.storage
      .from('study-audio')
      .upload(filePath, file, { upsert: true, contentType: file.type })

    if (error) {
      setStage('error')
      setErrorMsg(error.message)
      return
    }

    const { data: urlData } = supabase.storage
      .from('study-audio')
      .getPublicUrl(data.path)

    setStage('done')
    onComplete?.({ audioLink: urlData.publicUrl })
  }

  const busy = stage === 'uploading'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* Current audio indicator */}
      {currentAudioLink && stage === 'idle' && (
        <div style={{
          padding: '10px 14px', borderRadius: '7px',
          background: 'var(--slate-light)', border: '1px solid var(--line)',
          fontSize: '0.84rem', color: 'var(--slate)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>✓ Audio file uploaded</span>
          <label style={{ color: 'var(--ink-soft)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}>
            Replace
            <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileChange} style={{ display: 'none' }} />
          </label>
        </div>
      )}

      {/* File picker */}
      {!currentAudioLink && stage === 'idle' && (
        <label style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '10px', padding: '16px',
          border: '2px dashed var(--line)', borderRadius: '8px',
          cursor: 'pointer', fontSize: '0.88rem', color: 'var(--ink-soft)',
          background: 'var(--paper)',
        }}>
          <span style={{ fontSize: '1.2rem' }}>🎵</span>
          <span>Upload audio file (MP3, M4A, WAV…)</span>
          <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileChange} style={{ display: 'none' }} />
        </label>
      )}

      {/* Uploading */}
      {busy && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>Uploading audio…</div>
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
          ✓ Audio uploaded successfully.
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
