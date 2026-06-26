import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import CircleMark from '../components/CircleMark'
import CrossReferences from '../components/CrossReferences'

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [breakpoint])
  return isMobile
}

const TRANSLATIONS = [
  { id: 'kjv',   label: 'KJV',   name: 'King James Version' },
  { id: 'web',   label: 'WEB',   name: 'World English Bible' },
  { id: 'asv',   label: 'ASV',   name: 'American Standard' },
  { id: 'ylt',   label: 'YLT',   name: "Young's Literal" },
  { id: 'darby', label: 'Darby', name: 'Darby Translation' },
  { id: 'bbe',   label: 'BBE',   name: 'Basic English' },
]

const SAVE_DELAY_MS = 1200

export default function StudyViewer() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const trackId  = searchParams.get('track')
  const trackPos = parseInt(searchParams.get('pos') ?? '-1', 10)
  const { user, isAdmin } = useAuth()
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState('scripture') // 'scripture' | 'notes' | 'related'

  // ── Track siblings (prev/next) ───────────────────────────────
  const [trackStudies, setTrackStudies] = useState([]) // ordered study_ids in track
  const [trackTitle, setTrackTitle]     = useState('')

  useEffect(() => {
    if (!trackId) return
    async function loadTrack() {
      const [{ data: track }, { data: ts }] = await Promise.all([
        supabase.from('tracks').select('title').eq('id', trackId).single(),
        supabase
          .from('track_studies')
          .select('position, studies(study_id, status, media_link, audio_link)')
          .eq('track_id', trackId)
          .order('position'),
      ])
      if (track) setTrackTitle(track.title)
      if (ts) {
        const allSiblings = ts.map(row => row.studies).filter(Boolean)
        // Non-admins skip over draft/ready siblings in prev/next navigation
        setTrackStudies(isAdmin ? allSiblings : allSiblings.filter(s => s.status === 'Published'))
      }
    }
    loadTrack()
  }, [trackId])

  // ── Study data ──────────────────────────────────────────────
  const [study, setStudy]   = useState(null)
  const [loading, setLoading] = useState(true)

  // ── Media mode (video | audio) ───────────────────────────────
  const [mediaMode, setMediaMode] = useState('video') // set properly after study loads

  // ── Vertical split (video | right panel) ────────────────────
  const [leftPct, setLeftPct]     = useState(58)
  const [readerOpen, setReaderOpen] = useState(true)
  const [hDragging, setHDragging] = useState(false)
  const containerRef = useRef(null)

  // ── Horizontal split (scripture | notes) ────────────────────
  const [topPct, setTopPct]       = useState(60)
  const [vDragging, setVDragging] = useState(false)
  const rightPanelRef = useRef(null)

  // ── Bible passages ───────────────────────────────────────────
  const [selectedTrans, setSelectedTrans] = useState(['kjv'])
  const [passages, setPassages]           = useState({})
  const [passageLoading, setPassageLoading] = useState({})
  const fetchedRef = useRef(new Set())

  // ── Cross-reference passage panel ────────────────────────────
  const [xrefStudy, setXrefStudy]       = useState(null) // { study_id, study_title, passage_ref }
  const [xrefPassages, setXrefPassages] = useState({})
  const [xrefLoading, setXrefLoading]   = useState({})
  const xrefFetchedRef = useRef(new Set())

  // ── Notes ────────────────────────────────────────────────────
  const [notesContent, setNotesContent] = useState('')
  const [saveStatus, setSaveStatus]     = useState('idle') // idle | saving | saved | error
  const saveTimerRef = useRef(null)

  // ────────────────────────────────────────────────────────────
  // Load study + existing note
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      let query = supabase
        .from('studies')
        .select('*, books(book_name)')
        .eq('study_id', id)

      if (!isAdmin) query = query.eq('status', 'Published')

      const { data } = await query.single()
      setStudy(data)
      setMediaMode(data?.media_link ? 'video' : 'audio')
      setLoading(false)
    }
    load()
  }, [id])

  useEffect(() => {
    if (!user || !id) return
    async function loadNote() {
      const { data } = await supabase
        .from('study_notes')
        .select('content')
        .eq('user_id', user.id)
        .eq('study_id', id)
        .maybeSingle()
      if (data) setNotesContent(data.content)
    }
    loadNote()
  }, [user, id])

  // ────────────────────────────────────────────────────────────
  // Auto-save notes with debounce
  // ────────────────────────────────────────────────────────────
  function handleNotesChange(e) {
    const value = e.target.value
    setNotesContent(value)
    if (!user) return
    setSaveStatus('idle')
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => saveNote(value), SAVE_DELAY_MS)
  }

  async function saveNote(content) {
    setSaveStatus('saving')
    const { error } = await supabase.from('study_notes').upsert(
      { user_id: user.id, study_id: id, content, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,study_id' }
    )
    setSaveStatus(error ? 'error' : 'saved')
  }

  useEffect(() => () => clearTimeout(saveTimerRef.current), [])

  // ────────────────────────────────────────────────────────────
  // Fetch Bible passages
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!study?.passage_ref) return
    selectedTrans.forEach(async (trans) => {
      if (fetchedRef.current.has(trans)) return
      fetchedRef.current.add(trans)
      setPassageLoading((prev) => ({ ...prev, [trans]: true }))
      try {
        const ref = study.passage_ref.replace(/\s+/g, '+')
        const res = await fetch(`https://bible-api.com/${ref}?translation=${trans}`)
        const data = await res.json()
        setPassages((prev) => ({ ...prev, [trans]: data }))
      } catch {
        setPassages((prev) => ({ ...prev, [trans]: { error: true } }))
      } finally {
        setPassageLoading((prev) => ({ ...prev, [trans]: false }))
      }
    })
  }, [study, selectedTrans])

  // Fetch cross-ref passages when a cross-ref study is selected
  useEffect(() => {
    if (!xrefStudy?.passage_ref) return
    xrefFetchedRef.current = new Set() // reset on new study selection
    setXrefPassages({})
    selectedTrans.forEach(async (trans) => {
      if (xrefFetchedRef.current.has(trans)) return
      xrefFetchedRef.current.add(trans)
      setXrefLoading((prev) => ({ ...prev, [trans]: true }))
      try {
        const ref = xrefStudy.passage_ref.replace(/\s+/g, '+')
        const res = await fetch(`https://bible-api.com/${ref}?translation=${trans}`)
        const data = await res.json()
        setXrefPassages((prev) => ({ ...prev, [trans]: data }))
      } catch {
        setXrefPassages((prev) => ({ ...prev, [trans]: { error: true } }))
      } finally {
        setXrefLoading((prev) => ({ ...prev, [trans]: false }))
      }
    })
  }, [xrefStudy, selectedTrans])

  function handleXrefSelect(study) {
    // Toggle off if same study clicked again
    setXrefStudy(prev => prev?.study_id === study.study_id ? null : study)
    setXrefPassages({})
    xrefFetchedRef.current = new Set()
  }

  // ────────────────────────────────────────────────────────────
  // Drag helpers
  // ────────────────────────────────────────────────────────────
  const makeHDragHandlers = useCallback((setDragging, onMove) => {
    const onMouseMove = (e) => onMove(e)
    const onMouseUp   = () => {
      setDragging(false)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    return {
      onMouseDown: (e) => {
        e.preventDefault()
        setDragging(true)
        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', onMouseUp)
      },
    }
  }, [])

  // Vertical divider (left/right panels)
  const verticalDividerHandlers = makeHDragHandlers(setHDragging, (e) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const pct  = ((e.clientX - rect.left) / rect.width) * 100
    setLeftPct(Math.max(25, Math.min(80, pct)))
  })

  // Horizontal divider (scripture/notes)
  const horizontalDividerHandlers = makeHDragHandlers(setVDragging, (e) => {
    if (!rightPanelRef.current) return
    const rect = rightPanelRef.current.getBoundingClientRect()
    const pct  = ((e.clientY - rect.top) / rect.height) * 100
    setTopPct(Math.max(20, Math.min(78, pct)))
  })

  function toggleTranslation(trans) {
    setSelectedTrans((prev) =>
      prev.includes(trans)
        ? prev.length === 1 ? prev : prev.filter((t) => t !== trans)
        : [...prev, trans]
    )
  }

  // ────────────────────────────────────────────────────────────
  // Render helpers
  // ────────────────────────────────────────────────────────────
  const saveLabel = saveStatus === 'saving' ? 'Saving…'
    : saveStatus === 'saved'  ? 'Saved ✓'
    : saveStatus === 'error'  ? 'Error saving'
    : ''

  const saveColor = saveStatus === 'saved'  ? 'var(--success)'
    : saveStatus === 'error'  ? 'var(--error)'
    : 'var(--ink-soft)'

  const dividerStyle = (active) => ({
    background: active ? 'var(--slate)' : 'var(--line)',
    transition: 'background 0.15s',
    flexShrink: 0,
    zIndex: 10,
  })

  if (loading) return <div className="loading-screen">Loading study…</div>
  if (!study)  return <div className="loading-screen">Study not found.</div>

  // ── Shared sub-components ──────────────────────────────────────
  const TranslationBar = ({ compact = false }) => (
    <div style={{
      padding: compact ? '8px 16px' : '10px 20px',
      borderBottom: '1px solid var(--line)',
      display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap',
      flexShrink: 0, background: 'var(--paper)',
    }}>
      <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-soft)', marginRight: '6px' }}>
        Translation
      </span>
      {TRANSLATIONS.map((t) => {
        const active = selectedTrans.includes(t.id)
        return (
          <button
            key={t.id}
            onClick={() => toggleTranslation(t.id)}
            title={t.name}
            style={{
              padding: '4px 11px', border: '1px solid', borderRadius: '100px',
              fontSize: '0.77rem', fontWeight: 600, cursor: 'pointer',
              borderColor: active ? 'var(--slate)' : 'var(--line)',
              background: active ? 'var(--slate)' : 'transparent',
              color: active ? 'white' : 'var(--ink-soft)',
              transition: 'all 0.12s',
            }}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )

  const PassageText = () => (
    <div style={{ flex: 1, overflow: 'auto', padding: '10px 20px 20px', display: 'flex', gap: '24px' }}>
      {selectedTrans.map((trans) => {
        const data      = passages[trans]
        const isLoading = passageLoading[trans]
        const label     = TRANSLATIONS.find((t) => t.id === trans)?.label
        return (
          <div key={trans} style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--slate)',
              marginBottom: '10px', paddingBottom: '8px',
              borderBottom: '2px solid var(--slate-light)',
            }}>
              {label}
            </div>
            {isLoading && <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Loading…</p>}
            {data?.error && <p style={{ color: 'var(--error)', fontSize: '0.85rem' }}>Could not load this passage.</p>}
            {data && !data.error && (
              <div style={{ fontSize: '0.96rem', lineHeight: '1.9', color: 'var(--ink)', fontFamily: 'Georgia, serif' }}>
                {data.verses?.map((v) => (
                  <span key={`${v.chapter}-${v.verse}`}>
                    <sup style={{ fontSize: '0.62em', fontWeight: 700, color: 'var(--gold)', marginRight: '1px', verticalAlign: 'super', lineHeight: 0 }}>
                      {v.verse}
                    </sup>
                    {v.text.trim()}{' '}
                  </span>
                ))}
                {!data.verses && data.text && <span>{data.text}</span>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  const NotesPanel = ({ flex = false }) => (
    <div style={{ ...(flex ? { flex: 1 } : {}), display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--paper-raised)' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 20px', borderBottom: '1px solid var(--line)',
        flexShrink: 0, background: 'var(--paper)',
      }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-soft)' }}>
          My Notes
        </span>
        {user && saveLabel && (
          <span style={{ fontSize: '0.75rem', color: saveColor }}>{saveLabel}</span>
        )}
        {!user && (
          <Link to="/login" style={{ fontSize: '0.75rem', color: 'var(--slate)' }}>
            Sign in to save notes
          </Link>
        )}
      </div>
      <textarea
        value={notesContent}
        onChange={handleNotesChange}
        placeholder={user
          ? 'Your notes for this study… they save automatically.'
          : 'Sign in to save your notes across sessions.'}
        disabled={!user}
        style={{
          flex: 1, resize: 'none', border: 'none', outline: 'none',
          padding: '16px 20px', fontFamily: 'Georgia, serif',
          fontSize: '0.94rem', lineHeight: '1.75',
          color: user ? 'var(--ink)' : 'var(--ink-soft)',
          background: user ? 'var(--paper-raised)' : 'var(--paper)',
          cursor: user ? 'text' : 'default',
        }}
      />
    </div>
  )

  // ── Track nav helper ──────────────────────────────────────────
  const TrackNav = () => {
    if (!trackId || trackStudies.length === 0) return null
    const prev = trackPos > 0 ? trackStudies[trackPos - 1] : null
    const next = trackPos < trackStudies.length - 1 ? trackStudies[trackPos + 1] : null
    const canPrev = prev && (prev.media_link || prev.audio_link)
    const canNext = next && (next.media_link || next.audio_link)
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        {!isMobile && (
          <span style={{ fontSize: '0.72rem', color: 'var(--ink-soft)', whiteSpace: 'nowrap', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {trackTitle}
          </span>
        )}
        <Link
          to={canPrev ? `/study/${prev.study_id}?track=${trackId}&pos=${trackPos - 1}` : '#'}
          style={{ padding: '5px 10px', border: '1px solid var(--line)', borderRadius: '6px', fontSize: '0.82rem', color: canPrev ? 'var(--slate)' : 'var(--line)', textDecoration: 'none', pointerEvents: canPrev ? 'auto' : 'none' }}
        >
          ←
        </Link>
        <span style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>{trackPos + 1}/{trackStudies.length}</span>
        <Link
          to={canNext ? `/study/${next.study_id}?track=${trackId}&pos=${trackPos + 1}` : '#'}
          style={{ padding: '5px 10px', border: '1px solid var(--line)', borderRadius: '6px', fontSize: '0.82rem', color: canNext ? 'var(--slate)' : 'var(--line)', textDecoration: 'none', pointerEvents: canNext ? 'auto' : 'none' }}
        >
          →
        </Link>
      </div>
    )
  }

  // ── Top bar (shared) ───────────────────────────────────────────
  const TopBar = () => (
    <div style={{ flexShrink: 0, background: 'var(--paper-raised)', borderBottom: '1px solid var(--line)' }}>
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px' }}>
        <Link to={trackId ? `/admin/tracks/${trackId}/detail` : '/admin/studies'} style={{
          color: 'var(--ink-soft)', textDecoration: 'none', fontSize: '0.82rem',
          padding: '5px 10px', border: '1px solid var(--line)', borderRadius: '6px', whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {trackId ? '← Track' : '← Studies'}
        </Link>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: isMobile ? '0.88rem' : '0.95rem', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {study.study_title}
          </div>
          {!isMobile && (
            <div style={{ fontSize: '0.78rem', color: 'var(--ink-soft)' }}>
              {study.passage_ref}{study.books?.book_name ? ` · ${study.books.book_name}` : ''}{study.duration_minutes ? ` · ${study.duration_minutes >= 60 ? `${Math.floor(study.duration_minutes / 60)} hr ${study.duration_minutes % 60 ? `${study.duration_minutes % 60} min` : ''}`.trim() : `${study.duration_minutes} min`}` : ''}
            </div>
          )}
        </div>

        {!isMobile && (
          <button
            onClick={() => setReaderOpen((o) => !o)}
            style={{
              background: readerOpen ? 'var(--slate-light)' : 'var(--paper)',
              border: '1px solid var(--line)',
              color: readerOpen ? 'var(--slate)' : 'var(--ink-soft)',
              padding: '6px 14px', borderRadius: '6px', fontSize: '0.82rem',
              fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
            }}
          >
            {readerOpen ? 'Hide reader' : 'Show reader'}
          </button>
        )}

        {!isMobile && <TrackNav />}
      </div>

      {/* Mobile: track nav in its own row */}
      {isMobile && trackId && trackStudies.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 14px 8px',
          borderTop: '1px solid var(--line)',
          background: 'var(--paper)',
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '10px' }}>
            {trackTitle}
          </span>
          <TrackNav />
        </div>
      )}
    </div>
  )

  // ── Mobile layout ──────────────────────────────────────────────
  if (isMobile) {
    const hasVideo = !!study.media_link
    const hasAudio = !!study.audio_link

    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        height: '100dvh', // fixes iOS Safari chrome overlap
        background: 'var(--paper)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        overflow: 'hidden',
      }}>
        <TopBar />

        {/* Media section */}
        {(hasVideo || hasAudio) && (
          <div style={{ flexShrink: 0, background: '#0a0a0a' }}>
            {/* Toggle — only when both exist */}
            {hasVideo && hasAudio && (
              <div style={{ display: 'flex', gap: '6px', padding: '8px 12px', background: 'rgba(0,0,0,0.4)' }}>
                {[{ id: 'video', label: '▶  Video' }, { id: 'audio', label: '♪  Audio' }].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMediaMode(m.id)}
                    style={{
                      padding: '5px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                      fontSize: '0.78rem', fontWeight: 600,
                      background: mediaMode === m.id ? 'var(--slate)' : 'rgba(255,255,255,0.1)',
                      color: mediaMode === m.id ? 'white' : 'rgba(255,255,255,0.55)',
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}

            {/* Video */}
            {hasVideo && mediaMode === 'video' && (
              <div style={{ width: '100%', aspectRatio: '16/9' }}>
                <iframe
                  src={study.media_link}
                  style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}

            {/* Audio */}
            {hasAudio && (mediaMode === 'audio' || !hasVideo) && (
              <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem', fontWeight: 600 }}>
                  ♪ {study.study_title}
                </div>
                <audio
                  controls
                  src={study.audio_link}
                  style={{ width: '100%', accentColor: '#b59040' }}
                />
              </div>
            )}
          </div>
        )}

        {/* No media at all */}
        {!hasVideo && !hasAudio && (
          <div style={{ padding: '14px 16px', background: 'var(--paper-raised)', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--ink-soft)' }}>No media available for this study yet.</p>
          </div>
        )}

        {/* Tab bar */}
        <div style={{
          display: 'flex', borderBottom: '1px solid var(--line)', flexShrink: 0,
          background: 'var(--paper)',
        }}>
          {[
            { id: 'scripture', label: 'Scripture' },
            { id: 'notes',     label: 'Notes' },
            { id: 'related',   label: 'Related' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, padding: '11px 6px', border: 'none', background: 'none',
                fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                color: activeTab === tab.id ? 'var(--slate)' : 'var(--ink-soft)',
                borderBottom: activeTab === tab.id ? '2px solid var(--slate)' : '2px solid transparent',
                transition: 'color 0.12s, border-color 0.12s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          {activeTab === 'scripture' ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Compact scrollable translation picker */}
              <div style={{
                overflowX: 'auto', overflowY: 'hidden', flexShrink: 0,
                padding: '8px 14px', borderBottom: '1px solid var(--line)',
                display: 'flex', gap: '6px', alignItems: 'center',
                background: 'var(--paper)', WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
              }}>
                {TRANSLATIONS.map((t) => {
                  const active = selectedTrans.includes(t.id)
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggleTranslation(t.id)}
                      title={t.name}
                      style={{
                        padding: '4px 12px', border: '1px solid', borderRadius: '100px',
                        fontSize: '0.77rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                        borderColor: active ? 'var(--slate)' : 'var(--line)',
                        background: active ? 'var(--slate)' : 'transparent',
                        color: active ? 'white' : 'var(--ink-soft)',
                        transition: 'all 0.12s',
                      }}
                    >
                      {t.label}
                    </button>
                  )
                })}
              </div>
              {study.passage_ref && (
                <div style={{ padding: '8px 16px 2px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-soft)', flexShrink: 0 }}>
                  {study.passage_ref}
                </div>
              )}
              <PassageText />
            </div>
          ) : activeTab === 'notes' ? (
            <NotesPanel flex />
          ) : (
            <div style={{ flex: 1, overflow: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <CrossReferences
                studyDbId={study.id}
                studyId={study.study_id}
                readOnly
                onSelect={handleXrefSelect}
                selectedId={xrefStudy?.study_id}
              />
              {/* Cross-ref passage inline */}
              {xrefStudy && (
                <div style={{ border: '2px solid var(--gold)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ padding: '8px 14px', background: '#fdf8ec', borderBottom: '1px solid #e8d49a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--slate)' }}>{xrefStudy.study_title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>{xrefStudy.passage_ref}</div>
                    </div>
                    <button onClick={() => setXrefStudy(null)} style={{ background: 'none', border: 'none', color: 'var(--ink-soft)', cursor: 'pointer', fontSize: '1.1rem', padding: '4px 6px' }}>✕</button>
                  </div>
                  <div style={{ padding: '12px 14px', maxHeight: '300px', overflowY: 'auto' }}>
                    {selectedTrans.map((trans) => {
                      const data      = xrefPassages[trans]
                      const isLoading = xrefLoading[trans]
                      const label     = TRANSLATIONS.find(t => t.id === trans)?.label
                      return (
                        <div key={trans} style={{ marginBottom: '16px' }}>
                          <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--gold-dark)', marginBottom: '6px' }}>{label}</div>
                          {isLoading && <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Loading…</p>}
                          {data?.error && <p style={{ color: 'var(--error)', fontSize: '0.85rem' }}>Could not load passage.</p>}
                          {data && !data.error && (
                            <div style={{ fontSize: '0.91rem', lineHeight: '1.8', color: 'var(--ink)', fontFamily: 'Georgia, serif' }}>
                              {data.verses?.map((v) => (
                                <span key={`${v.chapter}-${v.verse}`}>
                                  <sup style={{ fontSize: '0.62em', fontWeight: 700, color: 'var(--gold)', marginRight: '1px', verticalAlign: 'super', lineHeight: 0 }}>{v.verse}</sup>
                                  {v.text.trim()}{' '}
                                </span>
                              ))}
                              {!data.verses && data.text && <span>{data.text}</span>}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Desktop layout ─────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: 'var(--paper)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      overflow: 'hidden',
      userSelect: (hDragging || vDragging) ? 'none' : 'auto',
    }}>

      <TopBar />

      {/* ── Split pane ─────────────────────────────────────────── */}
      <div
        ref={containerRef}
        style={{
          display: 'flex', flex: 1, overflow: 'hidden',
          cursor: hDragging ? 'col-resize' : vDragging ? 'row-resize' : 'auto',
        }}
      >
        {/* Media panel */}
        <div style={{
          width: readerOpen ? `${leftPct}%` : '100%',
          flexShrink: 0, background: '#0a0a0a',
          display: 'flex', flexDirection: 'column',
          transition: hDragging ? 'none' : 'width 0.2s ease',
        }}>
          {/* Toggle bar — only when both exist */}
          {study.media_link && study.audio_link && (
            <div style={{
              display: 'flex', gap: '6px', padding: '10px 14px', flexShrink: 0,
              background: 'rgba(0,0,0,0.5)',
            }}>
              {[{ id: 'video', label: '▶  Video' }, { id: 'audio', label: '♪  Audio Only' }].map(m => (
                <button
                  key={m.id}
                  onClick={() => setMediaMode(m.id)}
                  style={{
                    padding: '5px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                    fontSize: '0.78rem', fontWeight: 600,
                    background: mediaMode === m.id ? 'var(--slate)' : 'rgba(255,255,255,0.1)',
                    color: mediaMode === m.id ? 'white' : 'rgba(255,255,255,0.55)',
                    transition: 'all 0.15s',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}

          {/* Video */}
          {study.media_link && mediaMode === 'video' && (
            <iframe
              src={study.media_link}
              style={{ flex: 1, width: '100%', border: 'none', display: 'block' }}
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          )}

          {/* Audio */}
          {study.audio_link && mediaMode === 'audio' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', gap: '24px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px', opacity: 0.4 }}>♪</div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: '1rem', marginBottom: '4px' }}>
                  {study.study_title}
                </div>
                {study.passage_ref && (
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>{study.passage_ref}</div>
                )}
              </div>
              <audio
                controls
                src={study.audio_link}
                style={{ width: '100%', maxWidth: '400px', accentColor: '#b59040' }}
              />
            </div>
          )}

          {/* No media */}
          {!study.media_link && !study.audio_link && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
              No media linked for this study.
            </div>
          )}
        </div>

        {/* Vertical drag divider */}
        {readerOpen && (
          <div
            {...verticalDividerHandlers}
            style={{ ...dividerStyle(hDragging), width: '5px', cursor: 'col-resize' }}
          />
        )}

        {/* Right panel: scripture + notes stacked */}
        {readerOpen && (
          <div
            ref={rightPanelRef}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}
          >

            {/* ── Scripture section ───────────────────────────── */}
            <div style={{ height: `${topPct}%`, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--paper-raised)' }}>
              <TranslationBar />
              {study.passage_ref && (
                <div style={{ padding: '10px 20px 0', fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-soft)', flexShrink: 0 }}>
                  {study.passage_ref}
                </div>
              )}
              <PassageText />
            </div>

            {/* Horizontal drag divider */}
            <div
              {...horizontalDividerHandlers}
              style={{ ...dividerStyle(vDragging), height: '5px', cursor: 'row-resize' }}
            />

            {/* ── Notes section ───────────────────────────────── */}
            <NotesPanel flex />

            {/* ── Related Studies (desktop) ────────────────────── */}
            {study.id && (
              <div style={{ flexShrink: 0, borderTop: '1px solid var(--line)', background: 'var(--paper)' }}>
                <div style={{
                  padding: '8px 20px', borderBottom: '1px solid var(--line)',
                  fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.07em', color: 'var(--ink-soft)',
                }}>
                  Related Studies — click to load passage
                </div>
                <div style={{ padding: '12px 20px', maxHeight: '180px', overflowY: 'auto' }}>
                  <CrossReferences
                    studyDbId={study.id}
                    studyId={study.study_id}
                    readOnly
                    onSelect={handleXrefSelect}
                    selectedId={xrefStudy?.study_id}
                  />
                </div>
              </div>
            )}

            {/* ── Cross-ref passage panel (desktop) ───────────── */}
            {xrefStudy && (
              <div style={{ flexShrink: 0, borderTop: '2px solid var(--gold)', background: 'var(--paper-raised)', display: 'flex', flexDirection: 'column', maxHeight: '35%' }}>
                <div style={{
                  padding: '8px 20px', borderBottom: '1px solid var(--line)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  flexShrink: 0,
                }}>
                  <div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--slate)' }}>{xrefStudy.study_title}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', marginLeft: '8px' }}>{xrefStudy.passage_ref}</span>
                  </div>
                  <button
                    onClick={() => setXrefStudy(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--ink-soft)', cursor: 'pointer', fontSize: '1rem', padding: '0 4px', lineHeight: 1 }}
                  >
                    ✕
                  </button>
                </div>
                <div style={{ flex: 1, overflow: 'auto', padding: '10px 20px 16px', display: 'flex', gap: '24px' }}>
                  {selectedTrans.map((trans) => {
                    const data = xrefPassages[trans]
                    const isLoading = xrefLoading[trans]
                    const label = TRANSLATIONS.find(t => t.id === trans)?.label
                    return (
                      <div key={trans} style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gold-dark)', marginBottom: '8px', paddingBottom: '6px', borderBottom: '2px solid #e8d49a' }}>
                          {label}
                        </div>
                        {isLoading && <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Loading…</p>}
                        {data?.error && <p style={{ color: 'var(--error)', fontSize: '0.85rem' }}>Could not load passage.</p>}
                        {data && !data.error && (
                          <div style={{ fontSize: '0.93rem', lineHeight: '1.85', color: 'var(--ink)', fontFamily: 'Georgia, serif' }}>
                            {data.verses?.map((v) => (
                              <span key={`${v.chapter}-${v.verse}`}>
                                <sup style={{ fontSize: '0.62em', fontWeight: 700, color: 'var(--gold)', marginRight: '1px', verticalAlign: 'super', lineHeight: 0 }}>{v.verse}</sup>
                                {v.text.trim()}{' '}
                              </span>
                            ))}
                            {!data.verses && data.text && <span>{data.text}</span>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  )
}
