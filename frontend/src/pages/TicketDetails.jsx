import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import apiClient from '../api/client'

const TicketDetails = () => {
  const { id } = useParams()
  const [ticket, setTicket] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiClient.get(`/api/participants/tickets/${id}`)
        setTicket(response.data.ticket)
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load ticket.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id])

  if (loading) {
    return <div className="min-h-screen bg-base-200 p-6">Loading ticket...</div>
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base-200 p-6">
        <div className="alert alert-error"><span>{error}</span></div>
      </div>
    )
  }

  if (!ticket) return null

  const event = ticket.eventId

  return (
    <div className="min-h-screen bg-base-200 p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="card bg-base-100 shadow">
          <div className="card-body space-y-2">
            <h1 className="card-title text-2xl">Ticket details</h1>
            <p className="text-sm text-base-content/70">Reference and entry information.</p>
            <div className="divider" />
            <p className="text-sm"><span className="font-semibold">Ticket ID:</span> {ticket.ticketCode}</p>
            <p className="text-sm"><span className="font-semibold">Status:</span> {ticket.status}</p>
            {event && (
              <>
                <p className="text-sm"><span className="font-semibold">Event:</span> {event.name}</p>
                <p className="text-sm"><span className="font-semibold">Organizer:</span> {event.organiserId?.name || 'Organizer'}</p>
                <p className="text-sm">
                  <span className="font-semibold">Schedule:</span>{' '}
                  {new Date(event.startTime).toLocaleString()} - {new Date(event.endTime).toLocaleString()}
                </p>
                <Link className="link link-primary text-sm" to={`/events/${event._id}`}>
                  View event details
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TicketDetails
