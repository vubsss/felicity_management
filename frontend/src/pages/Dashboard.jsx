import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Dashboard = () => {
  const { user, role, profile, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="card w-full max-w-xl bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="text-sm text-base-content/70">You are signed in.</p>
          <div className="divider" />
          <div className="space-y-2 text-sm">
            <p><span className="font-semibold">Email:</span> {user?.email || '—'}</p>
            <p><span className="font-semibold">Role:</span> {role || '—'}</p>
            <p>
              <span className="font-semibold">Name:</span>{' '}
              {profile ? `${profile.firstName} ${profile.lastName}` : '—'}
            </p>
          </div>
          <div className="card-actions justify-end mt-4">
            <button className="btn btn-outline" type="button" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
