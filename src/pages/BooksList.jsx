import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const STATUS_COLORS = {
  'Not Started': 'badge-gray',
  'In Progress': 'badge-blue',
  'Complete': 'badge-green',
}

export default function BooksList() {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadBooks() {
      const { data, error } = await supabase.from('books').select('*').order('book_order')
      if (!error) setBooks(data)
      setLoading(false)
    }
    loadBooks()
  }, [])

  if (loading) return <p>Loading...</p>

  const oldTestament = books.filter((b) => b.testament === 'Old Testament')
  const newTestament = books.filter((b) => b.testament === 'New Testament')

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Books</h1>
          <p className="page-subtitle">All 66 books and their study progress.</p>
        </div>
      </div>

      <h2 className="section-heading">Old Testament</h2>
      <div className="book-grid">
        {oldTestament.map((b) => (
          <div key={b.id} className="book-card">
            <div className="book-card-name">{b.book_name}</div>
            <div className="book-card-meta">{b.genre} · {b.total_chapters} ch.</div>
            <span className={`badge ${STATUS_COLORS[b.status]}`}>{b.status}</span>
          </div>
        ))}
      </div>

      <h2 className="section-heading">New Testament</h2>
      <div className="book-grid">
        {newTestament.map((b) => (
          <div key={b.id} className="book-card">
            <div className="book-card-name">{b.book_name}</div>
            <div className="book-card-meta">{b.genre} · {b.total_chapters} ch.</div>
            <span className={`badge ${STATUS_COLORS[b.status]}`}>{b.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
