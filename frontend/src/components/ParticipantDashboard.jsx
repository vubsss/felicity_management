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
      const isCancelled = ['cancelled', 'rejected'].includes(registration.status)
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
    if (status === 'rejected') return 'Rejected'
    return status
  }

  return (
    <div className="lb-page">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{heading}</h1>
            <p className="text-sm text-base-content/70 mt-1">
              Track upcoming events and your participation history.
            </p>
          </div>
          
          {!loading && !error && (
            <div className="flex flex-wrap gap-2">
              <Link className="btn btn-success" to="/events">
                Browse Events
              </Link>
              <Link className="btn btn-outline" to="/clubs">
                Clubs
              </Link>
              <Link className="btn btn-ghost" to="/profile">
                Profile
              </Link>
            </div>
          )}
        </div>

        {loading && (
          <div className="flex justify-center p-12">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        )}
        
        {error && (
          <div className="alert alert-error shadow-lg">
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && (
          <>
            <section className="space-y-4">
              <h2 className="text-2xl font-bold border-b border-base-300 pb-2">Upcoming Events</h2>
              {upcoming.length ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {upcoming.map((registration) => (
                    <div key={registration._id} className="card bg-base-100 shadow-xl card-hover border border-base-200">
                      <div className="card-body">
                        <div className="flex justify-between items-start">
                          <h3 className="card-title text-lg">{registration.event?.name || 'Event'}</h3>
                          <span className="badge badge-primary badge-outline text-xs">
                            {registration.event?.eventType || registration.type}
                          </span>
                        </div>
                        <p className="text-sm text-base-content/60">
                           by <span className="font-semibold">{registration.event?.organiserId?.name || 'Organizer'}</span>
                        </p>
                        <div className="mt-2 text-xs opacity-70 flex flex-col gap-1">
                           <span>🕒 {formatDateRange(registration.event?.startTime, registration.event?.endTime)}</span>
                        </div>
                        <div className="card-actions justify-end mt-4">
                          {registration.event && (
                            <Link
                              className="btn btn-sm btn-success"
                              to={`/events/${registration.event._id}`}
                            >
                              View Details
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="hero bg-base-100 rounded-box py-12">
                  <div className="hero-content text-center">
                    <div className="max-w-md">
                      <p className="text-lg opacity-60">No upcoming events. Time to explore!</p>
                      <Link to="/events" className="btn btn-success btn-sm mt-4">Browse Events</Link>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold border-b border-base-300 pb-2">History</h2>
              
              <div role="tablist" className="tabs tabs-boxed bg-base-100 p-2 shadow-sm inline-flex">
                <a
                  role="tab"
                  className={`tab transition-all ${activeTab === 'normal' ? 'tab-active bg-success text-success-content' : ''}`}
                  onClick={() => setActiveTab('normal')}
                >
                  Events ({normal.length})
                </a>
                <a
                  role="tab"
                  className={`tab transition-all ${activeTab === 'merchandise' ? 'tab-active bg-success text-success-content' : ''}`}
                  onClick={() => setActiveTab('merchandise')}
                >
                  Merchandise ({merchandise.length})
                </a>
                <a
                  role="tab"
                  className={`tab transition-all ${activeTab === 'completed' ? 'tab-active bg-success text-success-content' : ''}`}
                  onClick={() => setActiveTab('completed')}
                >
                  Past ({completed.length})
                </a>
                <a
                  role="tab"
                  className={`tab transition-all ${activeTab === 'cancelled' ? 'tab-active bg-success text-success-content' : ''}`}
                  onClick={() => setActiveTab('cancelled')}
                >
                  Cancelled ({cancelled.length})
                </a>
              </div>

              {currentTab.length ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {currentTab.map((registration) => (
                    <div key={registration._id} className="card bg-base-100 shadow-md card-hover border border-base-200/50">
                      <div className="card-body p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <h3 className="card-title text-base font-bold">
                            {registration.event?.name || 'Event'}
                          </h3>
                          <span className={`badge text-xs ${
                            registration.status === 'registered' || registration.status === 'purchased' ? 'badge-success badge-outline' : 'badge-ghost'
                          }`}>
                            {statusLabel(registration.status)}
                          </span>
                        </div>
                        
                        <p className="text-xs text-base-content/60 mb-2">
                          {registration.event?.eventType || registration.type}
                        </p>

                        {registration.teamName && (
                          <div className="badge badge-secondary badge-outline text-xs mb-2">Team: {registration.teamName}</div>
                        )}
                        
                        <div className="text-xs space-y-1 opacity-70">
                           <p>📅 {formatDateRange(registration.event?.startTime, registration.event?.endTime)}</p>
                           {registration.ticketId?._id && (
                             <p className="font-mono bg-base-200 p-1 rounded w-fit mt-2">
                               Ticket: {registration.ticketId.ticketCode || registration.ticketId._id.slice(-6).toUpperCase()}
                             </p>
                           )}
                        </div>

                        {registration.ticketId?._id && (
                            <div className="card-actions justify-end mt-3">
                            <Link
                                className="btn btn-xs btn-outline"
                                to={`/tickets/${registration.ticketId._id}`}
                            >
                                View Ticket
                            </Link>
                            </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-base-100 rounded-xl border border-base-200 border-dashed">
                  <p className="text-base-content/50">No records found in this category.</p>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

export default ParticipantDashboard
