import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './components/AdminLayout'

import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import StudiesList from './pages/StudiesList'
import StudyEditor from './pages/StudyEditor'
import StudyViewer from './pages/StudyViewer'
import BooksList from './pages/BooksList'
import BookDetail from './pages/BookDetail'
import UsersList from './pages/UsersList'
import ProfilePage from './pages/ProfilePage'
import SeedsList from './pages/SeedsList'
import SeedEditor from './pages/SeedEditor'
import TracksList from './pages/TracksList'
import TrackEditor from './pages/TrackEditor'
import TrackDetail from './pages/TrackDetail'
import GuestCodes from './pages/GuestCodes'

import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/study/:id"
            element={
              <ProtectedRoute>
                <StudyViewer />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="studies" element={<StudiesList />} />
            <Route path="studies/:id" element={
              <ProtectedRoute requireAdmin>
                <StudyEditor />
              </ProtectedRoute>
            } />
            <Route path="books" element={<BooksList />} />
            <Route path="books/:id" element={<BookDetail />} />
            <Route path="seeds" element={<SeedsList />} />
            <Route path="seeds/:id" element={
              <ProtectedRoute requireAdmin>
                <SeedEditor />
              </ProtectedRoute>
            } />
            <Route path="tracks" element={<TracksList />} />
            <Route path="tracks/:id" element={
              <ProtectedRoute requireAdmin>
                <TrackEditor />
              </ProtectedRoute>
            } />
            <Route path="tracks/:id/detail" element={<TrackDetail />} />
            <Route path="guest-codes" element={
              <ProtectedRoute requireAdmin>
                <GuestCodes />
              </ProtectedRoute>
            } />
            <Route path="profile" element={<ProfilePage />} />
            <Route
              path="users"
              element={
                <ProtectedRoute requireAdmin>
                  <UsersList />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
