import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'

import LoginPage from './components/LoginPage'
import SignupPage from './components/SignupPage'
import OnboardingPage from './components/OnboardingPage'
import Dashboard from './components/Dashboard'

import AdminLoginPage from './components/admin/AdminLoginPage'
import AdminLayout from './components/admin/AdminLayout'
import AdminDashboard from './components/admin/AdminDashboard'
import EventForm from './components/admin/EventForm'

import EventScreen from './components/EventDisplay';

import './App.css'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* ── Public routes ─────────────────────────────────── */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* ── Onboarding ────────────────────────────────────── */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute skipOnboardingCheck>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />

          {/* ── Authenticated user routes ──────────────────────── */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* ── Admin routes ───────────────────────────────────── */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requiredRole="admin" redirectTo="/admin/login">
                <AdminLayout>
                  <AdminDashboard />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/events/new"
            element={
              <ProtectedRoute requiredRole="admin" redirectTo="/admin/login">
                <AdminLayout>
                  <EventForm />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/events/:id/edit"
            element={
              <ProtectedRoute requiredRole="admin" redirectTo="/admin/login">
                <AdminLayout>
                  <EventForm />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route 
            path="/event" 
            element={
            <EventScreen />} />

          {/* ── Fallback ───────────────────────────────────────── */}
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
