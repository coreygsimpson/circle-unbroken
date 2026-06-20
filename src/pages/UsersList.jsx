import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function UsersList() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setUsers(data)
    setLoading(false)
  }

  async function toggleRole(targetUser) {
    setUpdatingId(targetUser.id)
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin'
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', targetUser.id)

    if (!error) {
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
      )
    }
    setUpdatingId(null)
  }

  if (loading) return <p>Loading...</p>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Users</h1>
          <p className="page-subtitle">Manage accounts and admin access.</p>
        </div>
      </div>

      <div className="table-scroll"><table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Joined</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.full_name || '—'}</td>
              <td>{u.email}</td>
              <td>
                <span className={`badge ${u.role === 'admin' ? 'badge-green' : 'badge-gray'}`}>
                  {u.role}
                </span>
              </td>
              <td>{new Date(u.created_at).toLocaleDateString()}</td>
              <td>
                {u.id !== currentUser.id && (
                  <button
                    className="link-edit"
                    onClick={() => toggleRole(u)}
                    disabled={updatingId === u.id}
                  >
                    {updatingId === u.id
                      ? 'Updating...'
                      : u.role === 'admin' ? 'Remove admin' : 'Make admin'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </div>
  )
}
