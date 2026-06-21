import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const STATUS_COLORS = {
  Draft: 'badge-gray',
  Ready: 'badge-blue',
  Published: 'badge-green',
}

export default function StudiesList() {
  const { isAdmin } = useAuth()
  const [studies, setStudies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStudies()
  }, [])

  async function loadStudies() {
    setLoading(true)
    const { data, error } = await supabase
      .from('studies')
      .select('*, books(book_name, book_order)')
      .order('week_number', { ascending: true, nullsFirst: false })

    if (!error) setStudies(data)
    setLoading(false)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Studies</h1>
          <p className="page-subtitle">All study sessions, across all 66 books.</p>
        </div>
        {isAdmin && <Link to="/admin/studies/new" className="btn-primary">+ New Study</Link>}
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : studies.length === 0 ? (
        <div className="empty-state">
          <p>No studies yet. Create your first one to get started.</p>
          {isAdmin && <Link to="/admin/studies/new" className="btn-primary">+ New Study</Link>}
        </div>
      ) : (
        <div className="table-scroll"><table className="data-table">
          <thead>
            <tr>
              <th>Study ID</th>
              <th>Title</th>
              <th>Book</th>
              <th>Status</th>
              <th>Week</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {studies.map((study) => (
              <tr key={study.id}>
                <td className="mono">{study.study_id}</td>
                <td>{study.study_title}</td>
                <td>{study.books?.book_name || '—'}</td>
                <td>
                  <span className={`badge ${STATUS_COLORS[study.status]}`}>{study.status}</span>
                </td>
                <td>{study.week_number ?? '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {isAdmin && (
                      <Link to={`/admin/studies/${study.id}`} className="link-edit">Edit</Link>
                    )}
                    {(study.media_link || study.audio_link) && (
                      <Link to={`/study/${study.study_id}`} className="link-edit" style={{ color: 'var(--gold-dark)' }}>View</Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </div>
  )
}
