import React, { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import apiClient from '../api/client'

const OrganizerEvents = ({ defaultStatus = 'all' }) => {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()

  const statusFilter = searchParams.get('status') || defaultStatus

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiClient.get('/api/organisers/events')
        setEvents(response.data.events || [])
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load events.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return events
    return events.filter((event) => event.displayStatus === statusFilter || event.status === statusFilter)
  }, [events, statusFilter])

  const handleFilterChange = (event) => {
    const next = event.target.value
    searchParams.set('status', next)
    setSearchParams(searchParams, { replace: true })
  }

  return (
    <div className="lb-page">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Events</h1>
            <p className="text-sm text-base-content/70">Track drafts, published, and ongoing events.</p>
          </div>
          <Link className="btn btn-success" to="/organiser/events/new">
            Create event
          </Link>
        </div>

        <div className="form-control max-w-xs">
          <label className="label" htmlFor="statusFilter">
            <span className="label-text">Filter by status</span>
          </label>
          <select
            id="statusFilter"
            className="select select-bordered"
            value={statusFilter}
            onChange={handleFilterChange}
          >
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {loading && <p>Loading events...</p>}
        {error && <div className="alert alert-error"><span>{error}</span></div>}

        {!loading && !error && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((event) => (
              <Link key={event._id} to={`/organiser/events/${event._id}`} className="card bg-base-100 shadow">
                <div className="card-body space-y-1">
                  <h2 className="card-title text-base">{event.name}</h2>
                  <p className="text-xs text-base-content/60">
                    {event.eventType} · {event.category || 'Uncategorized'}
                  </p>
                  <p className="text-xs text-base-content/60">
                    Status: {event.displayStatus || event.status}
                  </p>
                  <p className="text-xs text-base-content/60">
                    {event.startTime ? new Date(event.startTime).toLocaleString() : 'Schedule pending'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default OrganizerEvents
