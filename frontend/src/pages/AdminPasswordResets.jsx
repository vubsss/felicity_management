import React, { useEffect, useState } from 'react'
import apiClient from '../api/client'
import { formatDateTime } from '../utils/dateFormat'

const AdminPasswordResets = () => {
  const [requests, setRequests] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [credentials, setCredentials] = useState(null)

  const loadRequests = async () => {
    try {
      const response = await apiClient.get('/api/admin/password-resets')
      setRequests(response.data.requests || [])
      setError('')
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load reset requests.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  const resolveRequest = async (id) => {
    try {
      const response = await apiClient.post(`/api/admin/password-resets/${id}/resolve`)
      setCredentials(response.data.credentials)
      await loadRequests()
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to resolve request.')
    }
  }

  return (
    <div className="lb-page">
      <div className="max-w-5xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">Password reset requests</h1>
          <p className="text-sm text-base-content/70">Handle organizer password reset requests.</p>
        </div>

        {error && <div className="alert alert-error"><span>{error}</span></div>}
        {credentials && (
          <div className="alert alert-success flex flex-col items-start gap-2">
            <span>New credentials generated.</span>
            <div className="text-sm">Email: {credentials.email}</div>
            <div className="text-sm">Password: {credentials.password}</div>
          </div>
        )}

        {loading && <p>Loading reset requests...</p>}

        {!loading && (
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              {requests.length ? (
                <div className="overflow-x-auto">
                  <table className="table table-zebra">
                    <thead>
                      <tr>
                        <th>Organizer</th>
                        <th>Login email</th>
                        <th>Requested</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((request) => (
                        <tr key={request.id}>
                          <td>{request.organiserName}</td>
                          <td>{request.loginEmail}</td>
                          <td>{formatDateTime(request.createdAt)}</td>
                          <td>
                            <button className="btn btn-xs btn-success" onClick={() => resolveRequest(request.id)}>
                              Reset password
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-base-content/70">No open reset requests.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminPasswordResets
