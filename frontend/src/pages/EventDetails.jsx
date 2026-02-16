import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import apiClient from '../api/client'

const EventDetails = () => {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiClient.get(`/api/events/${id}`)
        setEvent(response.data.event)
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load event.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id])

  const handleRegister = async () => {
    setActionError('')
    setActionLoading(true)
    try {
      await apiClient.post(`/api/events/${id}/register`, { formData: {} })
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Registration failed.')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <div className="min-h-screen p-6">Loading...</div>
  if (error) {
    return (
      <div className="min-h-screen p-6">
        <div className="alert alert-error"><span>{error}</span></div>
      </div>
    )
  }
  if (!event) return null

  return (
    <div className="min-h-screen bg-base-200 p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="card bg-base-100 shadow">
          <div className="card-body space-y-2">
            <h1 className="card-title text-2xl">{event.name}</h1>
            <p className="text-sm text-base-content/70">{event.description}</p>
            <div className="text-xs text-base-content/60">
              {event.eventType} · {event.category} · {event.eligibility}
            </div>
            <div className="text-xs text-base-content/60">
              Starts: {new Date(event.startTime).toLocaleString()}
            </div>
            <div className="text-xs text-base-content/60">
              Ends: {new Date(event.endTime).toLocaleString()}
            </div>
          </div>
        </div>
        {event.eventType === 'normal' ? (
          <div className="card bg-base-100 shadow">
            <div className="card-body space-y-3">
              <h2 className="font-semibold">Register</h2>
              {actionError && <div className="alert alert-error"><span>{actionError}</span></div>}
              <button className="btn btn-primary" onClick={handleRegister} disabled={actionLoading}>
                {actionLoading ? 'Registering...' : 'Register'}
              </button>
            </div>
          </div>
        ) : (
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <p className="text-sm text-base-content/70">
                Merchandise purchases are available from the backend purchase endpoint.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EventDetails
