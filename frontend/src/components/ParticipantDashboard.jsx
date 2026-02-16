import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'

const formatDateRange = (start, end) => {
  if (!start || !end) return 'Schedule unavailable'
  const startDate = new Date(start)
  const endDate = new Date(end)
  return `${startDate.toLocaleString()} - ${endDate.toLocaleString()}`
}

const getTeamName = (registration) => {
  const formData = registration?.formData || {}
  if (typeof formData.teamName === 'string' && formData.teamName.trim()) {
    return formData.teamName.trim()
  }
  if (typeof formData.team === 'string' && formData.team.trim()) {
    return formData.team.trim()
  }
  return null
}

const ParticipantDashboard = ({ heading = 'My Events Dashboard' }) => {
  const [registrations, setRegistrations] = useState([])
  const [activeTab, setActiveTab] = useState('normal')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiClient.get('/api/participants/registrations')
        setRegistrations(response.data.registrations || [])
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load registrations.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const normalized = useMemo(() => {
    const now = new Date()

    return registrations.map((registration) => {
      const event = registration.eventId
      const startTime = event?.startTime ? new Date(event.startTime) : null
      const endTime = event?.endTime ? new Date(event.endTime) : null
      const isCancelled = registration.status === 'cancelled'
      const isCompleted = endTime ? endTime < now : false
      const isUpcoming = startTime ? startTime > now : false

      return {
        ...registration,
        event,
        isCancelled,
        isCompleted,
        isUpcoming,
        teamName: getTeamName(registration)
      }
    })
  }, [registrations])

  const upcoming = normalized.filter((item) => !item.isCancelled && item.isUpcoming)
  const normal = normalized.filter(
    (item) => item.type === 'normal' && !item.isCancelled && !item.isCompleted
  )
  const merchandise = normalized.filter(
    (item) => item.type === 'merchandise' && !item.isCancelled
  )
  const completed = normalized.filter(
    (item) => item.type === 'normal' && !item.isCancelled && item.isCompleted
  )
  const cancelled = normalized.filter((item) => item.isCancelled)

  const tabData = {
    normal,
    merchandise,
    completed,
    cancelled
  }

  const currentTab = tabData[activeTab] || []
  const statusLabel = (status) => {
    if (status === 'registered') return 'Registered'
    if (status === 'purchased') return 'Purchased'
    if (status === 'cancelled') return 'Cancelled'
    return status
  }

  return (
    <div className="min-h-screen bg-base-200 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{heading}</h1>
          <p className="text-sm text-base-content/70">
            Track upcoming events and your participation history.
          </p>
        </div>

        {!loading && !error && (
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h2 className="text-base font-semibold">Quick actions</h2>
              <div className="flex flex-wrap gap-3">
                <Link className="btn btn-primary btn-sm" to="/events">
                  Browse events
                </Link>
                <Link className="btn btn-outline btn-sm" to="/clubs">
                  Follow clubs
                </Link>
                <Link className="btn btn-outline btn-sm" to="/profile">
                  Update profile & preferences
                </Link>
              </div>
            </div>
          </div>
        )}

        {loading && <p>Loading registrations...</p>}
        {error && <div className="alert alert-error"><span>{error}</span></div>}

        {!loading && !error && (
          <>
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Upcoming events</h2>
              {upcoming.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {upcoming.map((registration) => (
                    <div key={registration._id} className="card bg-base-100 shadow">
                      <div className="card-body space-y-1">
                        <h3 className="card-title text-base">{registration.event?.name || 'Event'}</h3>
                        <p className="text-xs text-base-content/60">
                          {registration.event?.eventType || registration.type} ·{' '}
                          {registration.event?.organiserId?.name || 'Organizer'}
                        </p>
                        <p className="text-xs text-base-content/60">
                          {formatDateRange(registration.event?.startTime, registration.event?.endTime)}
                        </p>
                        {registration.event && (
                          <Link
                            className="link link-primary text-xs"
                            to={`/events/${registration.event._id}`}
                          >
                            View event
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-base-content/70">No upcoming events yet.</p>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Participation history</h2>
              <div className="tabs tabs-boxed">
                <button
                  className={`tab ${activeTab === 'normal' ? 'tab-active' : ''}`}
                  type="button"
                  onClick={() => setActiveTab('normal')}
                >
                  Normal ({normal.length})
                </button>
                <button
                  className={`tab ${activeTab === 'merchandise' ? 'tab-active' : ''}`}
                  type="button"
                  onClick={() => setActiveTab('merchandise')}
                >
                  Merchandise ({merchandise.length})
                </button>
                <button
                  className={`tab ${activeTab === 'completed' ? 'tab-active' : ''}`}
                  type="button"
                  onClick={() => setActiveTab('completed')}
                >
                  Completed ({completed.length})
                </button>
                <button
                  className={`tab ${activeTab === 'cancelled' ? 'tab-active' : ''}`}
                  type="button"
                  onClick={() => setActiveTab('cancelled')}
                >
                  Cancelled/Rejected ({cancelled.length})
                </button>
              </div>

              {currentTab.length ? (
                <div className="space-y-3">
                  {currentTab.map((registration) => (
                    <div key={registration._id} className="card bg-base-100 shadow">
                      <div className="card-body space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="card-title text-base">
                            {registration.event?.name || 'Event'}
                          </h3>
                          <span className="badge badge-ghost text-xs">
                            {statusLabel(registration.status)}
                          </span>
                        </div>
                        <p className="text-xs text-base-content/60">
                          {registration.event?.eventType || registration.type} ·{' '}
                          {registration.event?.organiserId?.name || 'Organizer'}
                        </p>
                        {registration.teamName && (
                          <p className="text-xs text-base-content/60">Team: {registration.teamName}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-base-content/60">
                          <span>
                            Schedule: {formatDateRange(registration.event?.startTime, registration.event?.endTime)}
                          </span>
                          {registration.ticketId?._id && (
                            <Link
                              className="link link-primary"
                              to={`/tickets/${registration.ticketId._id}`}
                            >
                              Ticket: {registration.ticketId.ticketCode || registration.ticketId._id}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-base-content/70">No records in this category.</p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

export default ParticipantDashboard
