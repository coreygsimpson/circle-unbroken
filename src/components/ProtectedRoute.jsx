import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, isAdmin, isGuest, loading } = useAuth()

  if (loading) {
    return <div className="loading-screen">Loading...</div>
  }

  // Allow authenticated users and guests
  if (!user && !isGuest) {
    return <Navigate to="/login" replace />
  }

  // Guests cannot access admin-only routes
  if (requireAdmin && isGuest) {
    return <Navigate to="/admin" replace />
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="loading-screen">
        <p>You don't have admin access yet. Ask an existing admin to grant your account access.</p>
      </div>
    )
  }

  return children
}
