import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'
import { formatDateTime } from '../utils/dateFormat'

const initialFilters = {
  search: '',
  eventType: 'all',
  eligibility: 'all',
  dateFrom: '',
  dateTo: '',
  trending: false,
  followed: false
}

const BrowseEvents = () => {
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(initialFilters)
  const [preferences, setPreferences] = useState({ interests: [], followedOrganisers: [] })

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await apiClient.get('/api/participants/preferences')
        setPreferences({
          interests: response.data.interests || [],
          followedOrganisers: response.data.followedOrganisers || []
        })
      } catch {
        setPreferences({ interests: [], followedOrganisers: [] })
      }
    }

    loadPreferences()
  }, [])

  useEffect(() => {
    let active = true
    const timer = setTimeout(async () => {
      setLoading(true)
      setError('')

      try {
        if (filters.followed && preferences.followedOrganisers.length === 0) {
          if (active) {
            setEvents([])
          }
          return
        }

        const params = {}
        if (filters.search) params.search = filters.search
        if (filters.eventType !== 'all') params.eventType = filters.eventType
        if (filters.eligibility !== 'all') params.eligibility = filters.eligibility
        if (filters.dateFrom) params.dateFrom = filters.dateFrom
        if (filters.dateTo) params.dateTo = filters.dateTo
        if (filters.trending) params.trending = 'true'
        if (filters.followed) {
          params.organiserIds = preferences.followedOrganisers.join(',')
        }

        const response = await apiClient.get('/api/events', { params })
        if (active) {
          setEvents(response.data.events || [])
        }
      } catch (err) {
        if (active) {
          setError(err?.response?.data?.message || 'Unable to load events.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }, 300)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [filters, preferences.followedOrganisers])

  const orderedEvents = useMemo(() => {
    if (!events.length) return []
    const followedSet = new Set(preferences.followedOrganisers)
    const interests = new Set(preferences.interests)

    const scoreEvent = (event) => {
      let score = 0
      const organiserId = event.organiserId?._id || event.organiserId
      if (organiserId && followedSet.has(organiserId)) score += 2
      if ((event.tags || []).some((tag) => interests.has(tag))) score += 1
      return score
    }

    return [...events].sort((a, b) => {
      const scoreA = scoreEvent(a)
      const scoreB = scoreEvent(b)
      if (scoreA !== scoreB) return scoreB - scoreA
      return new Date(a.startTime || 0) - new Date(b.startTime || 0)
    })
  }, [events, preferences.followedOrganisers, preferences.interests])

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
    setFilters((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const clearFilters = () => setFilters(initialFilters)

  return (
    <div className="lb-page">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Browse events</h1>
          <p className="text-sm text-base-content/70">Explore upcoming events and merchandise.</p>
        </div>

        <div className="card bg-base-100 shadow">
          <div className="card-body space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="form-control">
                <label className="label" htmlFor="search">
                  <span className="label-text">Search events or organizers</span>
                </label>
                <input
                  id="search"
                  name="search"
                  className="input input-bordered"
                  placeholder="Hackathon, music, club name"
                  value={filters.search}
                  onChange={handleChange}
                />
              </div>
              <div className="form-control">
                <label className="label" htmlFor="eventType">
                  <span className="label-text">Event type</span>
                </label>
                <select
                  id="eventType"
                  name="eventType"
                  className="select select-bordered"
                  value={filters.eventType}
                  onChange={handleChange}
                >
                  <option value="all">All</option>
                  <option value="normal">Normal</option>
                  <option value="merchandise">Merchandise</option>
                </select>
              </div>
              <div className="form-control">
                <label className="label" htmlFor="eligibility">
                  <span className="label-text">Eligibility</span>
                </label>
                <select
                  id="eligibility"
                  name="eligibility"
                  className="select select-bordered"
                  value={filters.eligibility}
                  onChange={handleChange}
                >
                  <option value="all">All</option>
                  <option value="internal">IIIT only</option>
                  <option value="external">Non-IIIT</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div className="form-control">
                <label className="label" htmlFor="dateFrom">
                  <span className="label-text">Date from</span>
                </label>
                <input
                  id="dateFrom"
                  name="dateFrom"
                  type="date"
                  className="input input-bordered"
                  value={filters.dateFrom}
                  onChange={handleChange}
                />
              </div>
              <div className="form-control">
                <label className="label" htmlFor="dateTo">
                  <span className="label-text">Date to</span>
                </label>
                <input
                  id="dateTo"
                  name="dateTo"
                  type="date"
                  className="input input-bordered"
                  value={filters.dateTo}
                  onChange={handleChange}
                />
              </div>
              <div className="flex flex-col gap-3">
                <div className="form-control">
                  <label className="label" htmlFor="trending">
                    <span className="label-text">Trending</span>
                  </label>
                  <input
                    id="trending"
                    type="checkbox"
                    name="trending"
                    className="toggle toggle-primary"
                    checked={filters.trending}
                    onChange={handleChange}
                  />
                  <span className="text-xs text-base-content/60 mt-1">Top 5 in 24h</span>
                </div>
                <div className="form-control">
                  <label className="label" htmlFor="followed">
                    <span className="label-text">Followed clubs only</span>
                  </label>
                  <input
                    id="followed"
                    type="checkbox"
                    name="followed"
                    className="toggle toggle-secondary"
                    checked={filters.followed}
                    onChange={handleChange}
                  />
                  <span className="text-xs text-base-content/60 mt-1">
                    Show events from clubs you follow.
                  </span>
                </div>
                <button className="btn btn-outline btn-sm" type="button" onClick={clearFilters}>
                  Clear filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading && <p>Loading events...</p>}
        {error && <div className="alert alert-error"><span>{error}</span></div>}

        {!loading && !error && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {orderedEvents.map((event) => (
              <Link key={event._id} to={`/events/${event._id}`} className="card bg-base-100 shadow">
                <div className="card-body space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="card-title text-base">{event.name}</h2>
                    <div className="flex flex-wrap items-center gap-2">
                      {event.registrationStatus && (
                        <span className={`badge badge-outline ${event.registrationStatus === 'open' ? 'badge-success' : 'badge-ghost'}`}>
                          {event.registrationStatus === 'open' ? 'Registrations open' : 'Registrations closed'}
                        </span>
                      )}
                      {filters.trending && <span className="badge badge-accent badge-outline">Trending</span>}
                    </div>
                  </div>
                  <p className="text-sm text-base-content/70 line-clamp-2">{event.description}</p>
                  <div className="text-xs text-base-content/60">
                    <span>{event.eventType}</span> · <span>{event.category}</span>
                  </div>
                  <div className="text-xs text-base-content/60">
                    Organizer: {event.organiserId?.name || 'Organizer'}
                  </div>
                  {event.startTime && (
                    <div className="text-xs text-base-content/60">
                      {formatDateTime(event.startTime)}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && !orderedEvents.length && !error && (
          <p className="text-sm text-base-content/70">No events match your filters.</p>
        )}
      </div>
    </div>
  )
}

export default BrowseEvents
