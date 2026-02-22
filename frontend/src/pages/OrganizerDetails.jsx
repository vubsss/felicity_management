import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import apiClient from '../api/client'
import { formatDateTime } from '../utils/dateFormat'

const OrganizerDetails = () => {
  const { id } = useParams()
  const [organiser, setOrganiser] = useState(null)
  const [events, setEvents] = useState({ upcoming: [], past: [] })
  const [followed, setFollowed] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [organiserResponse, prefsResponse] = await Promise.all([
          apiClient.get(`/api/organisers/public/${id}`),
          apiClient.get('/api/participants/preferences')
        ])
        setOrganiser(organiserResponse.data.organiser)
        setEvents(organiserResponse.data.events || { upcoming: [], past: [] })
        setFollowed(prefsResponse.data.followedOrganisers || [])
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load organizer.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id])

  const isFollowed = useMemo(() => new Set(followed.map(String)).has(String(id)), [followed, id])

  const toggleFollow = async () => {
    try {
      const response = isFollowed
        ? await apiClient.delete(`/api/participants/follow/${id}`)
        : await apiClient.post(`/api/participants/follow/${id}`)
      setFollowed(response.data.followedOrganisers || [])
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to update follow status.')
    }
  }

  if (loading) {
    return <div className="lb-page">Loading organizer...</div>
  }

  if (error) {
    return (
      <div className="lb-page">
        <div className="alert alert-error"><span>{error}</span></div>
      </div>
    )
  }

  if (!organiser) return null

  return (
    <div className="lb-page">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{organiser.name}</h1>
            <p className="text-sm text-base-content/70">{organiser.category}</p>
          </div>
          <button className={`btn ${isFollowed ? 'btn-outline' : 'btn-success'}`} type="button" onClick={toggleFollow}>
            {isFollowed ? 'Unfollow' : 'Follow'}
          </button>
        </div>

        <div className="card bg-base-100 shadow">
          <div className="card-body space-y-2">
            <p className="text-sm text-base-content/70">{organiser.description || 'No description available.'}</p>
            <div className="text-sm">Contact email: {organiser.contactEmail || 'Not provided'}</div>
            <div className="text-sm">Contact number: {organiser.contactNumber || 'Not provided'}</div>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Upcoming events</h2>
          {events.upcoming?.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {events.upcoming.map((event) => (
                <Link key={event._id} to={`/events/${event._id}`} className="card bg-base-100 shadow">
                  <div className="card-body space-y-1">
                    <h3 className="card-title text-base">{event.name}</h3>
                    <p className="text-xs text-base-content/60">{event.eventType} · {event.category}</p>
                    {event.startTime && (
                      <p className="text-xs text-base-content/60">
                        {formatDateTime(event.startTime)}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-base-content/70">No upcoming events.</p>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Past events</h2>
          {events.past?.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {events.past.map((event) => (
                <Link key={event._id} to={`/events/${event._id}`} className="card bg-base-100 shadow">
                  <div className="card-body space-y-1">
                    <h3 className="card-title text-base">{event.name}</h3>
                    <p className="text-xs text-base-content/60">{event.eventType} · {event.category}</p>
                    {event.startTime && (
                      <p className="text-xs text-base-content/60">
                        {formatDateTime(event.startTime)}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-base-content/70">No past events.</p>
          )}
        </section>
      </div>
    </div>
  )
}

export default OrganizerDetails
