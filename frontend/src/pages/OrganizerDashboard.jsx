import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'
import { formatDate } from '../utils/dateFormat'

const statusTone = (status) => {
  if (status === 'draft') return 'badge-ghost'
  if (status === 'published') return 'badge-info'
  if (status === 'ongoing') return 'badge-success'
  if (status === 'completed') return 'badge-primary'
  if (status === 'closed') return 'badge-warning'
  return 'badge-ghost'
}

const OrganizerDashboard = () => {
  const [events, setEvents] = useState([])
  const [analytics, setAnalytics] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiClient.get('/api/organisers/dashboard')
        setEvents(response.data.events || [])
        setAnalytics(response.data.analytics || [])
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load dashboard.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return (
    <div className="lb-page">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Organizer dashboard</h1>
            <p className="text-sm text-base-content/70">Manage your events and analytics.</p>
          </div>
          <Link className="btn btn-success" to="/organiser/events/new">
            Create event
          </Link>
        </div>

        {loading && <p>Loading dashboard...</p>}
        {error && <div className="alert alert-error"><span>{error}</span></div>}

        {!loading && !error && (
          <>
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Your events</h2>
                <Link className="link link-primary text-sm" to="/organiser/events">
                  View all events
                </Link>
              </div>
              {events.length ? (
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {events.map((event) => (
                    <Link
                      key={event._id}
                      to={`/organiser/events/${event._id}`}
                      className="card min-w-[260px] bg-base-100 shadow"
                    >
                      <div className="card-body space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="card-title text-base">{event.name}</h3>
                          <span className={`badge ${statusTone(event.displayStatus)}`}>
                            {event.displayStatus}
                          </span>
                        </div>
                        <p className="text-xs text-base-content/60">
                          {event.eventType} · {event.category || 'Uncategorized'}
                        </p>
                        <p className="text-xs text-base-content/60">
                          {event.startTime ? formatDate(event.startTime) : 'Schedule pending'}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-base-content/70">No events yet. Create your first draft.</p>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Completed event analytics</h2>
              {analytics.length ? (
                <div className="overflow-x-auto">
                  <table className="table table-zebra">
                    <thead>
                      <tr>
                        <th>Event</th>
                        <th>Status</th>
                        <th>Registrations</th>
                        <th>Sales</th>
                        <th>Revenue</th>
                        <th>Attendance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.map((row) => (
                        <tr key={row.eventId}>
                          <td>{row.name}</td>
                          <td>{row.status}</td>
                          <td>{row.registrations}</td>
                          <td>{row.sales}</td>
                          <td>{row.revenue}</td>
                          <td>{row.attendance}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-base-content/70">No completed events yet.</p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

export default OrganizerDashboard
