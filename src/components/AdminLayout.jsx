import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import CircleMark from './CircleMark'

export default function AdminLayout() {
  const { profile, isAdmin } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <CircleMark size={28} />
          <span>May the Circle<br />Be Unbroken</span>
        </div>

        <nav className="admin-nav">
          <NavLink to="/admin" end>Dashboard</NavLink>
          <NavLink to="/admin/studies">Studies</NavLink>
          <NavLink to="/admin/books">Books</NavLink>
          {isAdmin && <NavLink to="/admin/users">Users</NavLink>}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <div className="admin-user-name">{profile?.full_name || 'Loading...'}</div>
            <div className="admin-user-role">{profile?.role}</div>
          </div>
          <button className="admin-signout" onClick={handleSignOut}>Sign Out</button>
        </div>
      </aside>

      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  )
}
