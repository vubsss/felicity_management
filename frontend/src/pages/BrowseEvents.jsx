import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'

const BrowseEvents = () => {
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiClient.get('/api/events')
        setEvents(response.data.events || [])
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load events.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return (
    <div className="min-h-screen bg-base-200 p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Browse events</h1>
          <p className="text-sm text-base-content/70">Explore upcoming events and merchandise.</p>
        </div>
        {loading && <p>Loading events...</p>}
        {error && <div className="alert alert-error"><span>{error}</span></div>}
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((event) => (
            <Link key={event._id} to={`/events/${event._id}`} className="card bg-base-100 shadow">
              <div className="card-body">
                <h2 className="card-title">{event.name}</h2>
                <p className="text-sm text-base-content/70">{event.description}</p>
                <div className="text-xs text-base-content/60">
                  <span>{event.eventType}</span> · <span>{event.category}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {!loading && !events.length && !error && <p>No events yet.</p>}
      </div>
    </div>
  )
}

export default BrowseEvents
