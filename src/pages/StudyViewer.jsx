import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import CircleMark from '../components/CircleMark'

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
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState('scripture') // 'scripture' | 'notes'

  // ── Study data ──────────────────────────────────────────────
  const [study, setStudy]   = useState(null)
  const [loading, setLoading] = useState(true)

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

  // ── Notes ────────────────────────────────────────────────────
  const [notesContent, setNotesContent] = useState('')
  const [saveStatus, setSaveStatus]     = useState('idle') // idle | saving | saved | error
  const saveTimerRef = useRef(null)

  // ────────────────────────────────────────────────────────────
  // Load study + existing note
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('studies')
        .select('*, books(book_name)')
        .eq('id', id)
        .single()
      setStudy(data)
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

  // ── Top bar (shared) ───────────────────────────────────────────
  const TopBar = () => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '10px 16px', flexShrink: 0,
      background: 'var(--paper-raised)', borderBottom: '1px solid var(--line)',
    }}>
      <CircleMark size={isMobile ? 22 : 26} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: isMobile ? '0.88rem' : '0.95rem', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {study.study_title}
        </div>
        {!isMobile && (
          <div style={{ fontSize: '0.78rem', color: 'var(--ink-soft)' }}>
            {study.passage_ref}{study.books?.book_name ? ` · ${study.books.book_name}` : ''}{study.week_number ? ` · Week ${study.week_number}` : ''}
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

      <Link to="/admin/studies" style={{
        color: 'var(--ink-soft)', textDecoration: 'none', fontSize: '0.82rem',
        padding: '6px 12px', border: '1px solid var(--line)', borderRadius: '6px', whiteSpace: 'nowrap',
      }}>
        ← Studies
      </Link>
    </div>
  )

  // ── Mobile layout ──────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', height: '100vh',
        background: 'var(--paper)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        overflow: 'hidden',
      }}>
        <TopBar />

        {/* Video at top — 16:9 */}
        <div style={{ width: '100%', aspectRatio: '16/9', flexShrink: 0, background: '#0a0a0a' }}>
          {study.media_link ? (
            <iframe
              src={study.media_link}
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem' }}>
              No video for this study.
            </div>
          )}
        </div>

        {/* Audio player (mobile) */}
        {study.audio_link && (
          <div style={{
            background: 'var(--paper-raised)', borderBottom: '1px solid var(--line)',
            padding: '10px 16px', flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>
              Audio only
            </span>
            <audio controls src={study.audio_link} style={{ flex: 1, height: '32px', accentColor: 'var(--slate)' }} />
          </div>
        )}

        {/* Tab bar */}
        <div style={{
          display: 'flex', borderBottom: '1px solid var(--line)', flexShrink: 0,
          background: 'var(--paper)',
        }}>
          {[{ id: 'scripture', label: 'Scripture' }, { id: 'notes', label: 'My Notes' }].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, padding: '10px', border: 'none', background: 'none',
                fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                color: activeTab === tab.id ? 'var(--slate)' : 'var(--ink-soft)',
                borderBottom: activeTab === tab.id ? '2px solid var(--slate)' : '2px solid transparent',
                transition: 'all 0.12s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {activeTab === 'scripture' ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <TranslationBar compact />
              {study.passage_ref && (
                <div style={{ padding: '8px 16px 0', fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-soft)', flexShrink: 0 }}>
                  {study.passage_ref}
                </div>
              )}
              <PassageText />
            </div>
          ) : (
            <NotesPanel flex />
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
        {/* Video panel */}
        <div style={{
          width: readerOpen ? `${leftPct}%` : '100%',
          flexShrink: 0, background: '#0a0a0a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: hDragging ? 'none' : 'width 0.2s ease',
        }}>
          {study.media_link ? (
            <iframe
              src={study.media_link}
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.9rem', textAlign: 'center', padding: '40px' }}>
              No video linked for this study.
            </div>
          )}

          {/* Audio player (desktop) */}
          {study.audio_link && (
            <div style={{
              padding: '8px 16px', flexShrink: 0,
              background: 'rgba(0,0,0,0.6)',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
                Audio only
              </span>
              <audio controls src={study.audio_link} style={{ flex: 1, height: '28px', accentColor: '#b59040' }} />
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

          </div>
        )}
      </div>
    </div>
  )
}
