import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import apiClient from '../api/client'
import { formatDateTime } from '../utils/dateFormat'

const TicketDetails = () => {
  const { id } = useParams()
  const [ticket, setTicket] = useState(null)
  const [qrImage, setQrImage] = useState('')
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

  useEffect(() => {
    const buildQr = async () => {
      if (!ticket?.qrData) return
      try {
        const url = await QRCode.toDataURL(ticket.qrData)
        setQrImage(url)
      } catch (err) {
        setQrImage('')
      }
    }

    buildQr()
  }, [ticket])

  if (loading) {
    return <div className="lb-page">Loading ticket...</div>
  }

  if (error) {
    return (
      <div className="lb-page">
        <div className="alert alert-error"><span>{error}</span></div>
      </div>
    )
  }

  if (!ticket) return null

  const event = ticket.eventId

  return (
    <div className="lb-page">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="card bg-base-100 shadow">
          <div className="card-body space-y-2">
            <h1 className="card-title text-2xl">Ticket details</h1>
            <p className="text-sm text-base-content/70">Reference and entry information.</p>
            <div className="divider" />
            <p className="text-sm"><span className="font-semibold">Ticket ID:</span> {ticket.ticketCode}</p>
            <p className="text-sm"><span className="font-semibold">Status:</span> {ticket.status}</p>
            {qrImage && (
              <div className="flex flex-col items-start gap-2">
                <span className="text-sm font-semibold">QR Code</span>
                <img src={qrImage} alt="Ticket QR" className="w-40 h-40" />
              </div>
            )}
            {event && (
              <>
                <p className="text-sm"><span className="font-semibold">Event:</span> {event.name}</p>
                <p className="text-sm"><span className="font-semibold">Organizer:</span> {event.organiserId?.name || 'Organizer'}</p>
                <p className="text-sm">
                  <span className="font-semibold">Schedule:</span>{' '}
                  {formatDateTime(event.startTime)} - {formatDateTime(event.endTime)}
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
