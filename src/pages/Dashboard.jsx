import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ total: 0, draft: 0, ready: 0, published: 0 })

  useEffect(() => {
    async function loadStats() {
      const { data, error } = await supabase.from('studies').select('status')
      if (!error && data) {
        setStats({
          total: data.length,
          draft: data.filter((s) => s.status === 'Draft').length,
          ready: data.filter((s) => s.status === 'Ready').length,
          published: data.filter((s) => s.status === 'Published').length,
        })
      }
    }
    loadStats()
  }, [])

  return (
    <div>
      <h1>Welcome, {profile?.full_name?.split(' ')[0] || 'there'} 👋</h1>
      <p className="page-subtitle">Here's where things stand with the study library.</p>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">Total Studies</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.draft}</div>
          <div className="stat-label">Drafts</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.ready}</div>
          <div className="stat-label">Ready</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.published}</div>
          <div className="stat-label">Published</div>
        </div>
      </div>

      <div className="dashboard-actions">
        <Link to="/admin/studies/new" className="btn-primary">+ New Study</Link>
        <Link to="/admin/studies" className="btn-secondary">View All Studies</Link>
      </div>
    </div>
  )
}
