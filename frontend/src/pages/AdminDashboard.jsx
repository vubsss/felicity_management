import React, { useEffect, useState } from 'react'
import apiClient from '../api/client'

const AdminDashboard = () => {
  const [stats, setStats] = useState({ active: 0, disabled: 0, archived: 0, openResets: 0 })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [orgResponse, resetResponse] = await Promise.all([
          apiClient.get('/api/admin/organisers'),
          apiClient.get('/api/admin/password-resets')
        ])

        const organisers = orgResponse.data.organisers || []
        const active = organisers.filter((row) => row.status === 'active').length
        const disabled = organisers.filter((row) => row.status === 'disabled').length
        const archived = organisers.filter((row) => row.status === 'archived').length
        const openResets = resetResponse.data.requests?.length || 0

        setStats({ active, disabled, archived, openResets })
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load admin dashboard.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return (
    <div className="lb-page">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Admin dashboard</h1>
          <p className="text-sm text-base-content/70">Manage organizers and password resets.</p>
        </div>

        {loading && <p>Loading dashboard...</p>}
        {error && <div className="alert alert-error"><span>{error}</span></div>}

        {!loading && !error && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h2 className="text-lg font-semibold">Organizers</h2>
                <div className="text-sm">Active: {stats.active}</div>
                <div className="text-sm">Disabled: {stats.disabled}</div>
                <div className="text-sm">Archived: {stats.archived}</div>
              </div>
            </div>
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h2 className="text-lg font-semibold">Password resets</h2>
                <div className="text-sm">Open requests: {stats.openResets}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard
