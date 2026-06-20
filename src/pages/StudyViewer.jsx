import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import CircleMark from '../components/CircleMark'

const TRANSLATIONS = [
  { id: 'kjv',   label: 'KJV',   name: 'King James Version' },
  { id: 'web',   label: 'WEB',   name: 'World English Bible' },
  { id: 'asv',   label: 'ASV',   name: 'American Standard' },
  { id: 'ylt',   label: 'YLT',   name: "Young's Literal" },
  { id: 'darby', label: 'Darby', name: 'Darby Translation' },
  { id: 'bbe',   label: 'BBE',   name: 'Basic English' },
]

export default function StudyViewer() {
  const { id } = useParams()
  const [study, setStudy] = useState(null)
  const [loading, setLoading] = useState(true)

  const [readerOpen, setReaderOpen] = useState(true)
  const [leftPct, setLeftPct] = useState(58)
  const [dragging, setDragging] = useState(false)

  const [selectedTrans, setSelectedTrans] = useState(['kjv'])
  const [passages, setPassages] = useState({})
  const [passageLoading, setPassageLoading] = useState({})
  const fetchedRef = useRef(new Set())
  const containerRef = useRef(null)

  // Load study from Supabase
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

  // Fetch passage text from bible-api.com
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

  // Drag-to-resize
  const onDividerMouseDown = useCallback((e) => {
    setDragging(true)
    e.preventDefault()
  }, [])

  const onMouseMove = useCallback(
    (e) => {
      if (!dragging || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((e.clientX - rect.left) / rect.width) * 100
      setLeftPct(Math.max(25, Math.min(80, pct)))
    },
    [dragging]
  )

  const onMouseUp = useCallback(() => setDragging(false), [])

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [dragging, onMouseMove, onMouseUp])

  function toggleTranslation(trans) {
    setSelectedTrans((prev) =>
      prev.includes(trans)
        ? prev.length === 1
          ? prev // keep at least one
          : prev.filter((t) => t !== trans)
        : [...prev, trans]
    )
  }

  if (loading) return <div className="loading-screen">Loading study…</div>
  if (!study) return <div className="loading-screen">Study not found.</div>

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--paper)',
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* ── Top bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '10px 20px',
          background: 'var(--paper-raised)',
          borderBottom: '1px solid var(--line)',
          flexShrink: 0,
        }}
      >
        <CircleMark size={26} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: '0.95rem',
              color: 'var(--ink)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {study.study_title}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--ink-soft)' }}>
            {study.passage_ref}
            {study.books?.book_name ? ` · ${study.books.book_name}` : ''}
            {study.week_number ? ` · Week ${study.week_number}` : ''}
          </div>
        </div>

        <button
          onClick={() => setReaderOpen((o) => !o)}
          style={{
            background: readerOpen ? 'var(--slate-light)' : 'var(--paper)',
            border: '1px solid var(--line)',
            color: readerOpen ? 'var(--slate)' : 'var(--ink-soft)',
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '0.82rem',
            fontWeight: 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s',
          }}
        >
          {readerOpen ? 'Hide passage' : 'Show passage'}
        </button>

        <Link
          to="/admin/studies"
          style={{
            color: 'var(--ink-soft)',
            textDecoration: 'none',
            fontSize: '0.82rem',
            padding: '6px 12px',
            border: '1px solid var(--line)',
            borderRadius: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          ← Studies
        </Link>
      </div>

      {/* ── Split pane ── */}
      <div
        ref={containerRef}
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
          userSelect: dragging ? 'none' : 'auto',
          cursor: dragging ? 'col-resize' : 'auto',
        }}
      >
        {/* Video panel */}
        <div
          style={{
            width: readerOpen ? `${leftPct}%` : '100%',
            flexShrink: 0,
            background: '#0a0a0a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: dragging ? 'none' : 'width 0.2s ease',
          }}
        >
          {study.media_link ? (
            <iframe
              src={study.media_link}
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div
              style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.9rem', textAlign: 'center', padding: '40px' }}
            >
              No video linked for this study.
            </div>
          )}
        </div>

        {/* Draggable divider */}
        {readerOpen && (
          <div
            onMouseDown={onDividerMouseDown}
            style={{
              width: '5px',
              flexShrink: 0,
              background: dragging ? 'var(--slate)' : 'var(--line)',
              cursor: 'col-resize',
              transition: 'background 0.15s',
              position: 'relative',
              zIndex: 10,
            }}
          />
        )}

        {/* Scripture panel */}
        {readerOpen && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              background: 'var(--paper-raised)',
              minWidth: 0,
            }}
          >
            {/* Translation toggle bar */}
            <div
              style={{
                padding: '10px 20px',
                borderBottom: '1px solid var(--line)',
                display: 'flex',
                gap: '6px',
                alignItems: 'center',
                flexWrap: 'wrap',
                flexShrink: 0,
                background: 'var(--paper)',
              }}
            >
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  color: 'var(--ink-soft)',
                  marginRight: '6px',
                }}
              >
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
                      padding: '4px 11px',
                      border: '1px solid',
                      borderRadius: '100px',
                      fontSize: '0.77rem',
                      fontWeight: 600,
                      cursor: 'pointer',
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

            {/* Passage reference header */}
            {study.passage_ref && (
              <div
                style={{
                  padding: '12px 20px 0',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--ink-soft)',
                  flexShrink: 0,
                }}
              >
                {study.passage_ref}
              </div>
            )}

            {/* Passage text — parallel columns */}
            <div
              style={{
                flex: 1,
                overflow: 'auto',
                padding: '12px 20px 24px',
                display: 'flex',
                gap: '24px',
              }}
            >
              {selectedTrans.map((trans) => {
                const data = passages[trans]
                const isLoading = passageLoading[trans]
                const label = TRANSLATIONS.find((t) => t.id === trans)?.label

                return (
                  <div key={trans} style={{ flex: 1, minWidth: 0 }}>
                    {/* Translation label */}
                    <div
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: 'var(--slate)',
                        marginBottom: '10px',
                        paddingBottom: '8px',
                        borderBottom: '2px solid var(--slate-light)',
                      }}
                    >
                      {label}
                    </div>

                    {isLoading && (
                      <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Loading…</p>
                    )}

                    {data?.error && (
                      <p style={{ color: 'var(--error)', fontSize: '0.85rem' }}>
                        Could not load this passage.
                      </p>
                    )}

                    {data && !data.error && (
                      <div
                        style={{
                          fontSize: '0.96rem',
                          lineHeight: '1.9',
                          color: 'var(--ink)',
                          fontFamily: 'Georgia, serif',
                        }}
                      >
                        {data.verses?.map((v) => (
                          <span key={`${v.chapter}-${v.verse}`}>
                            <sup
                              style={{
                                fontSize: '0.62em',
                                fontWeight: 700,
                                color: 'var(--gold)',
                                marginRight: '1px',
                                verticalAlign: 'super',
                                lineHeight: 0,
                              }}
                            >
                              {v.verse}
                            </sup>
                            {v.text.trim()}{' '}
                          </span>
                        ))}
                        {!data.verses && data.text && <span>{data.text}</span>}
                      </div>
                    )}

                    {!data && !isLoading && (
                      <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>
                        Select to load.
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
