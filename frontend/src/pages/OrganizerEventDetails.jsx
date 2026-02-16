import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import apiClient from '../api/client'

const OrganizerEventDetails = () => {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [participants, setParticipants] = useState([])
  const [filters, setFilters] = useState({ search: '', status: 'all', type: 'all' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [participantError, setParticipantError] = useState('')

  const loadParticipants = async (nextFilters = filters) => {
    try {
      const params = {}
      if (nextFilters.search) params.search = nextFilters.search
      if (nextFilters.status !== 'all') params.status = nextFilters.status
      if (nextFilters.type !== 'all') params.type = nextFilters.type
      const response = await apiClient.get(`/api/organisers/events/${id}/participants`, { params })
      setParticipants(response.data.participants || [])
      setParticipantError('')
    } catch (err) {
      setParticipantError(err?.response?.data?.message || 'Unable to load participants.')
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiClient.get(`/api/organisers/events/${id}`)
        setEvent(response.data.event)
        setAnalytics(response.data.analytics)
        await loadParticipants()
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load event.')
      } finally {
        setLoading(false)
      }
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const filteredParticipants = useMemo(() => participants, [participants])

  const handleFilterChange = (event) => {
    const { name, value } = event.target
    const nextFilters = { ...filters, [name]: value }
    setFilters(nextFilters)
    loadParticipants(nextFilters)
  }

  const handleExport = async () => {
    try {
      const response = await apiClient.get(`/api/organisers/events/${id}/participants/export`, {
        responseType: 'blob'
      })
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${event?.name || 'event'}-participants.csv`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setParticipantError(err?.response?.data?.message || 'Unable to export CSV.')
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-base-200 p-6">Loading event...</div>
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base-200 p-6">
        <div className="alert alert-error"><span>{error}</span></div>
      </div>
    )
  }

  if (!event) return null

  return (
    <div className="min-h-screen bg-base-200 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{event.name}</h1>
            <p className="text-sm text-base-content/70">Organizer view</p>
          </div>
          <Link className="btn btn-outline" to={`/organiser/events/${event._id}/edit`}>
            Edit event
          </Link>
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="card bg-base-100 shadow">
            <div className="card-body space-y-2">
              <h2 className="text-lg font-semibold">Overview</h2>
              <p className="text-sm">Type: {event.eventType}</p>
              <p className="text-sm">Status: {event.displayStatus || event.status}</p>
              <p className="text-sm">Eligibility: {event.eligibility || 'TBD'}</p>
              <p className="text-sm">Fee: {event.fee}</p>
              <p className="text-sm">
                Dates: {event.startTime ? new Date(event.startTime).toLocaleString() : 'TBD'} -{' '}
                {event.endTime ? new Date(event.endTime).toLocaleString() : 'TBD'}
              </p>
            </div>
          </div>
          <div className="card bg-base-100 shadow">
            <div className="card-body space-y-2">
              <h2 className="text-lg font-semibold">Analytics</h2>
              <p className="text-sm">Registrations/Sales: {analytics?.registrations} / {analytics?.sales}</p>
              <p className="text-sm">Attendance: {analytics?.attendance}</p>
              <p className="text-sm">Team completion: {analytics?.teamCompletion}</p>
              <p className="text-sm">Revenue: {analytics?.revenue}</p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Participants</h2>
              <p className="text-sm text-base-content/70">Search, filter, and export.</p>
            </div>
            <button className="btn btn-outline btn-sm" type="button" onClick={handleExport}>
              Export CSV
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <input
              name="search"
              className="input input-bordered"
              placeholder="Search name or email"
              value={filters.search}
              onChange={handleFilterChange}
            />
            <select name="status" className="select select-bordered" value={filters.status} onChange={handleFilterChange}>
              <option value="all">All statuses</option>
              <option value="registered">Registered</option>
              <option value="purchased">Purchased</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select name="type" className="select select-bordered" value={filters.type} onChange={handleFilterChange}>
              <option value="all">All types</option>
              <option value="normal">Normal</option>
              <option value="merchandise">Merchandise</option>
            </select>
          </div>

          {participantError && <div className="alert alert-error"><span>{participantError}</span></div>}

          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Reg date</th>
                  <th>Payment</th>
                  <th>Team</th>
                  <th>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.map((participant) => (
                  <tr key={participant.id}>
                    <td>{participant.name}</td>
                    <td>{participant.email}</td>
                    <td>{new Date(participant.registeredAt).toLocaleString()}</td>
                    <td>{participant.payment}</td>
                    <td>{participant.team || '—'}</td>
                    <td>{participant.attendance ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

export default OrganizerEventDetails
