import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { useAuth } from './context/AuthContext'
import ParticipantNavbar from './components/ParticipantNavbar'
import OrganiserNavbar from './components/OrganiserNavbar'
import AdminNavbar from './components/AdminNavbar'
import Dashboard from './pages/Dashboard'
import BrowseEvents from './pages/BrowseEvents'
import EventDetails from './pages/EventDetails'
import MyEvents from './pages/MyEvents'
import Clubs from './pages/Clubs'
import OrganizerDetails from './pages/OrganizerDetails'
import Profile from './pages/Profile'
import TicketDetails from './pages/TicketDetails'
import OrganizerDashboard from './pages/OrganizerDashboard'
import OrganizerEvents from './pages/OrganizerEvents'
import OrganizerEventForm from './pages/OrganizerEventForm'
import OrganizerEventDetails from './pages/OrganizerEventDetails'
import OrganizerProfile from './pages/OrganizerProfile'
import AdminDashboard from './pages/AdminDashboard'
import AdminOrganisers from './pages/AdminOrganisers'
import AdminPasswordResets from './pages/AdminPasswordResets'
import Login from './pages/Login'
import Signup from './pages/Signup'

const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="lb-page lb-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

const RoleRoute = ({ allowedRoles, children }) => {
  const { role } = useAuth()

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/" replace />
  }

  return children
}

const AuthLayout = ({ children }) => {
  const { role } = useAuth()

  return (
    <>
      {role === 'participant' && <ParticipantNavbar />}
      {role === 'organiser' && <OrganiserNavbar />}
      {role === 'admin' && <AdminNavbar />}
      {children}
    </>
  )
}

const App = () => {
  return (
    <div className="lb-app">
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AuthLayout>
                <Dashboard />
              </AuthLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/organiser"
          element={
            <ProtectedRoute>
              <AuthLayout>
                <RoleRoute allowedRoles={['organiser']}>
                  <OrganizerDashboard />
                </RoleRoute>
              </AuthLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/organiser/events"
          element={
            <ProtectedRoute>
              <AuthLayout>
                <RoleRoute allowedRoles={['organiser']}>
                  <OrganizerEvents />
                </RoleRoute>
              </AuthLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/organiser/ongoing"
          element={
            <ProtectedRoute>
              <AuthLayout>
                <RoleRoute allowedRoles={['organiser']}>
                  <OrganizerEvents defaultStatus="ongoing" />
                </RoleRoute>
              </AuthLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/organiser/events/new"
          element={
            <ProtectedRoute>
              <AuthLayout>
                <RoleRoute allowedRoles={['organiser']}>
                  <OrganizerEventForm />
                </RoleRoute>
              </AuthLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/organiser/events/:id"
          element={
            <ProtectedRoute>
              <AuthLayout>
                <RoleRoute allowedRoles={['organiser']}>
                  <OrganizerEventDetails />
                </RoleRoute>
              </AuthLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/organiser/events/:id/edit"
          element={
            <ProtectedRoute>
              <AuthLayout>
                <RoleRoute allowedRoles={['organiser']}>
                  <OrganizerEventForm />
                </RoleRoute>
              </AuthLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/organiser/profile"
          element={
            <ProtectedRoute>
              <AuthLayout>
                <RoleRoute allowedRoles={['organiser']}>
                  <OrganizerProfile />
                </RoleRoute>
              </AuthLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AuthLayout>
                <RoleRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </RoleRoute>
              </AuthLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/organisers"
          element={
            <ProtectedRoute>
              <AuthLayout>
                <RoleRoute allowedRoles={['admin']}>
                  <AdminOrganisers />
                </RoleRoute>
              </AuthLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/password-resets"
          element={
            <ProtectedRoute>
              <AuthLayout>
                <RoleRoute allowedRoles={['admin']}>
                  <AdminPasswordResets />
                </RoleRoute>
              </AuthLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/events"
          element={
            <ProtectedRoute>
              <AuthLayout>
                <BrowseEvents />
              </AuthLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:id"
          element={
            <ProtectedRoute>
              <AuthLayout>
                <EventDetails />
              </AuthLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-events"
          element={
            <ProtectedRoute>
              <AuthLayout>
                <RoleRoute allowedRoles={['participant']}>
                  <MyEvents />
                </RoleRoute>
              </AuthLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/clubs"
          element={
            <ProtectedRoute>
              <AuthLayout>
                <RoleRoute allowedRoles={['participant']}>
                  <Clubs />
                </RoleRoute>
              </AuthLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/clubs/:id"
          element={
            <ProtectedRoute>
              <AuthLayout>
                <RoleRoute allowedRoles={['participant']}>
                  <OrganizerDetails />
                </RoleRoute>
              </AuthLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <AuthLayout>
                <RoleRoute allowedRoles={['participant']}>
                  <Profile />
                </RoleRoute>
              </AuthLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tickets/:id"
          element={
            <ProtectedRoute>
              <AuthLayout>
                <RoleRoute allowedRoles={['participant']}>
                  <TicketDetails />
                </RoleRoute>
              </AuthLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
