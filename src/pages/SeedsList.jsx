import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const STATUS_META = {
  seed:  { label: 'Seed',  cls: 'badge-gray' },
  draft: { label: 'Draft', cls: 'badge-blue' },
  ready: { label: 'Ready', cls: 'badge-green' },
}

export default function SeedsList() {
  const { isAdmin } = useAuth()
  const [seeds, setSeeds]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all') // all | seed | draft | ready

  useEffect(() => { loadSeeds() }, [])

  async function loadSeeds() {
    const { data } = await supabase
      .from('study_seeds')
      .select('id, title, bible_refs, tags, status, created_at')
      .order('created_at', { ascending: false })
    setSeeds(data || [])
    setLoading(false)
  }

  const visible = filter === 'all' ? seeds : seeds.filter(s => s.status === filter)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Study Seeds</h1>
          <p className="page-subtitle">Early-stage research and notes on their way to becoming studies.</p>
        </div>
        {isAdmin && <Link to="/admin/seeds/new" className="btn-primary">+ New Seed</Link>}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
        {['all', 'seed', 'draft', 'ready'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '5px 14px', borderRadius: '100px', border: '1px solid',
              fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
              borderColor: filter === f ? 'var(--slate)' : 'var(--line)',
              background:  filter === f ? 'var(--slate)' : 'transparent',
              color:       filter === f ? 'white' : 'var(--ink-soft)',
              textTransform: 'capitalize',
            }}
          >
            {f === 'all' ? `All (${seeds.length})` : `${STATUS_META[f].label} (${seeds.filter(s => s.status === f).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : visible.length === 0 ? (
        <div className="empty-state">
          <p>{filter === 'all' ? 'No seeds yet.' : `No ${filter} seeds.`}</p>
          {isAdmin && filter === 'all' && (
            <Link to="/admin/seeds/new" className="btn-primary">Create the first seed</Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {visible.map((seed) => {
            const meta = STATUS_META[seed.status]
            return (
              <Link
                key={seed.id}
                to={`/admin/seeds/${seed.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div style={{
                  padding: '16px 20px',
                  background: 'var(--paper-raised)',
                  border: '1px solid var(--line)',
                  borderRadius: '10px',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  cursor: 'pointer',
                }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--slate)'
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(44,95,138,0.1)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--line)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--ink)' }}>{seed.title}</span>
                        <span className={`badge ${meta.cls}`}>{meta.label}</span>
                      </div>
                      {seed.bible_refs && (
                        <div style={{ fontSize: '0.82rem', color: 'var(--slate)', fontWeight: 500, marginBottom: '6px' }}>
                          {seed.bible_refs}
                        </div>
                      )}
                      {seed.tags?.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {seed.tags.map(tag => (
                            <span key={tag} style={{
                              padding: '2px 9px', borderRadius: '100px',
                              background: 'var(--slate-light)', color: 'var(--slate)',
                              fontSize: '0.72rem', fontWeight: 600,
                            }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {new Date(seed.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
