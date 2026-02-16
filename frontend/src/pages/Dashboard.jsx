import React from 'react'
import { useAuth } from '../context/AuthContext'
import ParticipantDashboard from '../components/ParticipantDashboard'
import OrganizerDashboard from './OrganizerDashboard'

const Dashboard = () => {
  const { role } = useAuth()

  if (role === 'organiser') {
    return <OrganizerDashboard />
  }

  if (role !== 'participant') {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center p-6">
        <div className="card w-full max-w-xl bg-base-100 shadow">
          <div className="card-body space-y-2">
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="text-sm text-base-content/70">
              This dashboard is currently available for participants only.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return <ParticipantDashboard heading="My Events Dashboard" />
}

export default Dashboard
