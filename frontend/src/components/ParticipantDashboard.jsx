import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'
import { formatDateTime } from '../utils/dateFormat'

const formatDateRange = (start, end) => {
  if (!start || !end) return 'Schedule unavailable'
  return `${formatDateTime(start)} - ${formatDateTime(end)}`
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
  const [proofFiles, setProofFiles] = useState({})
  const [uploadingRegistrationId, setUploadingRegistrationId] = useState('')
  const [cancellingRegistrationId, setCancellingRegistrationId] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState('')

  const loadRegistrations = async () => {
    try {
      const response = await apiClient.get('/api/participants/registrations')
      setRegistrations(response.data.registrations || [])
      setError('')
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load registrations.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRegistrations()
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
    if (status === 'pending_payment') return 'Pending Proof'
    if (status === 'pending_approval') return 'Pending Approval'
    if (status === 'successful') return 'Successful'
    if (status === 'cancelled') return 'Cancelled'
    if (status === 'rejected') return 'Rejected'
    return status
  }

  const canUploadProof = (registration) => (
    registration.type === 'merchandise' && ['pending_payment', 'rejected'].includes(registration.status)
  )

  const canCancelRegistration = (registration) => {
    if (registration.type !== 'normal') return false
    if (registration.status !== 'registered') return false
    if (!registration.event?.startTime) return true

    return new Date(registration.event.startTime) > new Date()
  }

  const handleProofFileChange = (registrationId, file) => {
    setProofFiles((prev) => ({ ...prev, [registrationId]: file || null }))
  }

  const handleUploadPaymentProof = async (registrationId) => {
    const file = proofFiles[registrationId]
    if (!file) {
      setActionError('Select a payment proof image first.')
      setActionMessage('')
      return
    }

    setUploadingRegistrationId(registrationId)
    setActionError('')
    setActionMessage('')

    try {
      const formData = new FormData()
      formData.append('paymentProof', file)
      await apiClient.post(`/api/events/registrations/${registrationId}/payment-proof`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setActionMessage('Payment proof uploaded successfully. Awaiting organizer approval.')
      setProofFiles((prev) => ({ ...prev, [registrationId]: null }))
      await loadRegistrations()
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Unable to upload payment proof.')
    } finally {
      setUploadingRegistrationId('')
    }
  }

  const handleCancelRegistration = async (registrationId) => {
    setCancellingRegistrationId(registrationId)
    setActionError('')
    setActionMessage('')

    try {
      await apiClient.post(`/api/participants/registrations/${registrationId}/cancel`)
      setActionMessage('Registration cancelled successfully.')
      await loadRegistrations()
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Unable to cancel registration.')
    } finally {
      setCancellingRegistrationId('')
    }
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

        {actionError && !error && (
          <div className="alert alert-error shadow-lg">
            <span>{actionError}</span>
          </div>
        )}

        {actionMessage && !error && (
          <div className="alert alert-success shadow-lg">
            <span>{actionMessage}</span>
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
                          {canCancelRegistration(registration) && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              disabled={cancellingRegistrationId === registration._id}
                              onClick={() => handleCancelRegistration(registration._id)}
                            >
                              {cancellingRegistrationId === registration._id ? 'Cancelling...' : 'Cancel Registration'}
                            </button>
                          )}
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
                            ['registered', 'successful'].includes(registration.status) ? 'badge-success badge-outline' : 'badge-ghost'
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
                           {registration.type === 'merchandise' && registration.paymentStatus && (
                             <p>💳 Payment: {registration.paymentStatus.replace('_', ' ')}</p>
                           )}
                           {registration.ticketId?._id && (
                             <p className="font-mono bg-base-200 p-1 rounded w-fit mt-2">
                               Ticket: {registration.ticketId.ticketCode || registration.ticketId._id.slice(-6).toUpperCase()}
                             </p>
                           )}
                        </div>

                        {canUploadProof(registration) && (
                          <div className="mt-3 space-y-2">
                            <input
                              type="file"
                              accept="image/*"
                              className="file-input file-input-bordered file-input-sm w-full"
                              onChange={(e) => handleProofFileChange(registration._id, e.target.files?.[0] || null)}
                            />
                            <button
                              className="btn btn-xs btn-outline"
                              type="button"
                              disabled={uploadingRegistrationId === registration._id || !proofFiles[registration._id]}
                              onClick={() => handleUploadPaymentProof(registration._id)}
                            >
                              {uploadingRegistrationId === registration._id ? 'Uploading...' : 'Upload Payment Proof'}
                            </button>
                          </div>
                        )}

                        {registration.ticketId?._id && (
                            <div className="card-actions justify-end mt-3">
                            {canCancelRegistration(registration) && (
                              <button
                                type="button"
                                className="btn btn-xs btn-outline"
                                disabled={cancellingRegistrationId === registration._id}
                                onClick={() => handleCancelRegistration(registration._id)}
                              >
                                {cancellingRegistrationId === registration._id ? 'Cancelling...' : 'Cancel'}
                              </button>
                            )}
                            <Link
                                className="btn btn-xs btn-outline"
                                to={`/tickets/${registration.ticketId._id}`}
                            >
                                View Ticket
                            </Link>
                            </div>
                        )}

                        {!registration.ticketId?._id && canCancelRegistration(registration) && (
                          <div className="card-actions justify-end mt-3">
                            <button
                              type="button"
                              className="btn btn-xs btn-outline"
                              disabled={cancellingRegistrationId === registration._id}
                              onClick={() => handleCancelRegistration(registration._id)}
                            >
                              {cancellingRegistrationId === registration._id ? 'Cancelling...' : 'Cancel'}
                            </button>
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
