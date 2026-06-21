import { useState, useRef } from 'react'

/**
 * VideoUploader
 *
 * Uploads a video file directly to Cloudflare Stream (browser → CF, no file
 * goes through our server). Once the video is ready, automatically triggers
 * M4A audio extraction.
 *
 * Props:
 *   studyTitle  — used as the video name in Cloudflare
 *   onComplete  — called with { cfVideoUid, mediaLink, audioLink } when done
 *   currentMediaLink — existing embed URL (shows current state)
 */

const POLL_INTERVAL = 3000 // ms between status checks

const STAGES = {
  idle:       { label: '',                        color: 'var(--ink-soft)' },
  uploading:  { label: 'Uploading…',              color: 'var(--slate)' },
  processing: { label: 'Processing video…',       color: 'var(--slate)' },
  audio:      { label: 'Generating audio track…', color: 'var(--slate)' },
  done:       { label: 'Upload complete ✓',        color: 'var(--success)' },
  error:      { label: 'Upload failed',            color: 'var(--error)' },
}

export default function VideoUploader({ studyTitle = 'study-video', onComplete, currentMediaLink }) {
  const [stage, setStage]       = useState('idle')
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const uploadRef = useRef(null)
  const fileInputRef = useRef(null)

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setStage('uploading')
    setProgress(0)
    setErrorMsg('')

    // 1 ── Get a one-time TUS upload URL from our Pages Function
    let uploadURL, uid
    try {
      const res = await fetch('/api/stream/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${studyTitle} — ${file.name}` }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.errors?.[0]?.message || 'Could not get upload URL')
      uploadURL = data.result.uploadURL
      uid       = data.result.uid
    } catch (err) {
      setStage('error')
      setErrorMsg(err.message)
      return
    }

    // 2 ── Upload via manual TUS (fetch-based) so we get full error visibility
    const abortController = new AbortController()
    uploadRef.current = abortController

    try {
      await tusUpload(file, uploadURL, abortController.signal, (pct) => setProgress(pct))
    } catch (err) {
      if (err.name === 'AbortError') return // user cancelled
      setStage('error')
      setErrorMsg(err.message)
      return
    }

    setStage('processing')
    await pollForReady(uid)
  }

  // 3 ── Poll until Cloudflare finishes processing the video
  async function pollForReady(uid) {
    while (true) {
      await sleep(POLL_INTERVAL)
      try {
        const res  = await fetch(`/api/stream/${uid}/status`)
        const data = await res.json()
        const state = data.result?.status?.state
        if (state === 'ready') {
          await triggerAudioExtraction(uid)
          return
        }
        if (state === 'error') {
          setStage('error')
          setErrorMsg('Cloudflare reported a video processing error.')
          return
        }
        // still inprogress — keep polling
      } catch {
        // network hiccup — keep trying
      }
    }
  }

  // 4 ── Trigger M4A audio extraction, then poll until the audio URL is ready
  async function triggerAudioExtraction(uid) {
    setStage('audio')
    try {
      await fetch(`/api/stream/${uid}/audio`, { method: 'POST' })
    } catch {
      // If triggering fails, still finish with video-only
      finalize(uid, null)
      return
    }

    // Poll for audio readiness
    while (true) {
      await sleep(POLL_INTERVAL)
      try {
        const res  = await fetch(`/api/stream/${uid}/audio`)
        const data = await res.json()
        const audio = data.result?.audio
        if (audio?.status === 'ready') {
          finalize(uid, audio.url)
          return
        }
        if (audio?.status === 'error') {
          // Audio failed but video is fine — finish without audio
          finalize(uid, null)
          return
        }
      } catch {
        // keep polling
      }
    }
  }

  function finalize(uid, audioUrl) {
    const mediaLink = `https://iframe.cloudflarestream.com/${uid}`
    setStage('done')
    onComplete?.({
      cfVideoUid: uid,
      mediaLink,
      audioLink: audioUrl ?? null,
    })
  }

  function cancelUpload() {
    uploadRef.current?.abort()
    setStage('idle')
    setProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Manual TUS upload (chunked PATCH) ──────────────────────
  async function tusUpload(file, uploadURL, signal, onProgress) {
    const CHUNK = 50 * 1024 * 1024 // 50 MB chunks

    // Step 1: POST to create the upload slot
    const createRes = await fetch(uploadURL, {
      method: 'POST',
      signal,
      headers: {
        'Tus-Resumable': '1.0.0',
        'Upload-Length': String(file.size),
        'Content-Length': '0',
      },
    })

    if (!createRes.ok) {
      const body = await createRes.text()
      console.error('CF TUS create failed:', createRes.status, body)
      throw new Error(`CF Stream rejected the upload (${createRes.status}): ${body}`)
    }

    // CF returns the actual PATCH destination in Location header
    const location = createRes.headers.get('Location') || uploadURL

    // Step 2: PATCH file data in chunks
    let offset = 0
    while (offset < file.size) {
      const chunk = file.slice(offset, Math.min(offset + CHUNK, file.size))
      const patchRes = await fetch(location, {
        method: 'PATCH',
        signal,
        headers: {
          'Tus-Resumable': '1.0.0',
          'Upload-Offset': String(offset),
          'Content-Type': 'application/offset+octet-stream',
          'Content-Length': String(chunk.size),
        },
        body: chunk,
      })

      if (!patchRes.ok) {
        const body = await patchRes.text()
        console.error('CF TUS patch failed:', patchRes.status, body)
        throw new Error(`Upload failed at byte ${offset} (${patchRes.status}): ${body}`)
      }

      offset = parseInt(patchRes.headers.get('Upload-Offset') || String(offset + chunk.size), 10)
      onProgress(Math.round((offset / file.size) * 100))
    }
  }

  const { label: stageLabel, color: stageColor } = STAGES[stage]
  const busy = stage === 'uploading' || stage === 'processing' || stage === 'audio'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* Current video indicator */}
      {currentMediaLink && stage === 'idle' && (
        <div style={{
          padding: '10px 14px', borderRadius: '7px',
          background: 'var(--slate-light)', border: '1px solid var(--line)',
          fontSize: '0.84rem', color: 'var(--slate)', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>✓ Video uploaded</span>
          <label style={{ color: 'var(--ink-soft)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}>
            Replace
            <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileChange} style={{ display: 'none' }} />
          </label>
        </div>
      )}

      {/* File picker (only when idle and no current video) */}
      {!currentMediaLink && stage === 'idle' && (
        <label style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '10px', padding: '20px',
          border: '2px dashed var(--line)', borderRadius: '8px',
          cursor: 'pointer', fontSize: '0.88rem', color: 'var(--ink-soft)',
          background: 'var(--paper)', transition: 'border-color 0.15s',
        }}
          onDragOver={(e) => e.preventDefault()}
        >
          <span style={{ fontSize: '1.3rem' }}>🎬</span>
          <span>Click to choose a video file, or drag and drop</span>
          <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileChange} style={{ display: 'none' }} />
        </label>
      )}

      {/* Progress */}
      {busy && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: stageColor }}>
            <span>{stageLabel}</span>
            {stage === 'uploading' && <span>{progress}%</span>}
          </div>
          <div style={{ height: '6px', background: 'var(--line)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '3px', background: 'var(--slate)',
              width: stage === 'uploading' ? `${progress}%` : '100%',
              transition: stage === 'uploading' ? 'width 0.3s ease' : 'none',
              animation: stage !== 'uploading' ? 'pulse 1.5s ease-in-out infinite' : 'none',
            }} />
          </div>
          <button
            type="button"
            onClick={cancelUpload}
            style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--ink-soft)', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Done */}
      {stage === 'done' && (
        <div style={{
          padding: '10px 14px', borderRadius: '7px',
          background: 'var(--success-bg)', border: '1px solid #c3e6cb',
          fontSize: '0.84rem', color: 'var(--success)',
        }}>
          {stageLabel} — video and audio track are live.
        </div>
      )}

      {/* Error */}
      {stage === 'error' && (
        <div style={{
          padding: '10px 14px', borderRadius: '7px',
          background: 'var(--error-bg)', fontSize: '0.84rem', color: 'var(--error)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>{errorMsg || 'Something went wrong.'}</span>
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
