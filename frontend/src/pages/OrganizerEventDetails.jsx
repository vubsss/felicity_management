import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import jsQR from 'jsqr'
import apiClient from '../api/client'
import { formatDateTime } from '../utils/dateFormat'
import EventForum from '../components/EventForum'

const tabClass = (activeTab, tab) => `tab ${activeTab === tab ? 'tab-active' : ''}`

const OrganizerEventDetails = () => {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [analytics, setAnalytics] = useState(null)

  const [participants, setParticipants] = useState([])
  const [filters, setFilters] = useState({ search: '', status: 'all', type: 'all' })

  const [paymentOrders, setPaymentOrders] = useState([])
  const [paymentFilter, setPaymentFilter] = useState('all')

  const [attendanceRows, setAttendanceRows] = useState([])
  const [attendanceSummary, setAttendanceSummary] = useState({ total: 0, scanned: 0, notScanned: 0 })

  const [activeTab, setActiveTab] = useState('participants')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [participantError, setParticipantError] = useState('')
  const [paymentError, setPaymentError] = useState('')
  const [attendanceError, setAttendanceError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  const [reviewLoadingId, setReviewLoadingId] = useState('')
  const [reviewNote, setReviewNote] = useState({})

  const [scanPayload, setScanPayload] = useState('')
  const [scanLoading, setScanLoading] = useState(false)
  const [scanError, setScanError] = useState('')
  const [scanSuccess, setScanSuccess] = useState('')

  const [manualRegistrationId, setManualRegistrationId] = useState('')
  const [manualAttendance, setManualAttendance] = useState(true)
  const [manualNote, setManualNote] = useState('')
  const [manualLoading, setManualLoading] = useState(false)

  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const loadEvent = async () => {
    const response = await apiClient.get(`/api/organisers/events/${id}`)
    setEvent(response.data.event)
    setAnalytics(response.data.analytics)
  }

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

  const loadPayments = async (nextFilter = paymentFilter) => {
    if (event?.eventType !== 'merchandise') {
      setPaymentOrders([])
      return
    }

    try {
      const params = {}
      if (nextFilter && nextFilter !== 'all') params.status = nextFilter
      const response = await apiClient.get(`/api/organisers/events/${id}/payments`, { params })
      setPaymentOrders(response.data.orders || [])
      setPaymentError('')
    } catch (err) {
      setPaymentError(err?.response?.data?.message || 'Unable to load payment approvals.')
    }
  }

  const loadAttendance = async () => {
    try {
      const response = await apiClient.get(`/api/organisers/events/${id}/attendance`)
      setAttendanceRows(response.data.attendees || [])
      setAttendanceSummary(response.data.summary || { total: 0, scanned: 0, notScanned: 0 })
      setAttendanceError('')
    } catch (err) {
      setAttendanceError(err?.response?.data?.message || 'Unable to load attendance dashboard.')
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        await loadEvent()
        await Promise.all([loadParticipants(), loadAttendance()])
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load event.')
      } finally {
        setLoading(false)
      }
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (event?.eventType === 'merchandise') {
      loadPayments(paymentFilter)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.eventType, paymentFilter, id])

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  useEffect(() => {
    const attachStreamToVideo = async () => {
      if (!cameraActive || !streamRef.current || !videoRef.current) return
      try {
        videoRef.current.srcObject = streamRef.current
        await videoRef.current.play()
      } catch {
        setCameraError('Camera started, but video preview could not start. Try restarting camera.')
      }
    }

    attachStreamToVideo()
  }, [cameraActive])

  const filteredParticipants = useMemo(() => participants, [participants])

  const handleFilterChange = (evt) => {
    const { name, value } = evt.target
    const nextFilters = { ...filters, [name]: value }
    setFilters(nextFilters)
    loadParticipants(nextFilters)
  }

  const handleExportParticipants = async () => {
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

  const handleExportAttendance = async () => {
    try {
      const response = await apiClient.get(`/api/organisers/events/${id}/attendance/export`, {
        responseType: 'blob'
      })
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${event?.name || 'event'}-attendance.csv`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setAttendanceError(err?.response?.data?.message || 'Unable to export attendance CSV.')
    }
  }

  const handleReviewPayment = async (orderId, decision) => {
    setReviewLoadingId(orderId)
    setPaymentError('')
    setActionSuccess('')

    try {
      await apiClient.post(`/api/organisers/events/${id}/payments/review`, {
        registrationId: orderId,
        decision,
        note: reviewNote[orderId] || ''
      })
      setActionSuccess(`Payment ${decision === 'approve' ? 'approved' : 'rejected'} successfully.`)
      await Promise.all([loadPayments(paymentFilter), loadParticipants(), loadAttendance()])
    } catch (err) {
      setPaymentError(err?.response?.data?.message || 'Unable to review payment.')
    } finally {
      setReviewLoadingId('')
    }
  }

  const decodeFromImageElement = (image) => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
    }
    const canvas = canvasRef.current
    canvas.width = image.width
    canvas.height = image.height
    const context = canvas.getContext('2d')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height)
    return code?.data || ''
  }

  const handleScanPayloadSubmit = async (payload) => {
    setScanLoading(true)
    setScanError('')
    setScanSuccess('')

    try {
      const response = await apiClient.post(`/api/organisers/events/${id}/attendance/scan`, { payload })
      setScanSuccess(response.data?.message || 'Attendance marked successfully.')
      setScanPayload(payload)
      await loadAttendance()
    } catch (err) {
      setScanError(err?.response?.data?.message || 'Unable to scan ticket.')
    } finally {
      setScanLoading(false)
    }
  }

  const handleScanManualPayload = async () => {
    if (!scanPayload.trim()) {
      setScanError('Enter scanned payload first.')
      return
    }
    await handleScanPayloadSubmit(scanPayload.trim())
  }

  const handleScanFromFile = async (file) => {
    if (!file) return

    try {
      const image = await createImageBitmap(file)
      const payload = decodeFromImageElement(image)
      if (!payload) {
        setScanError('No QR code detected in selected image.')
        return
      }
      await handleScanPayloadSubmit(payload)
    } catch {
      setScanError('Unable to decode QR from image.')
    }
  }

  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API is not available in this browser/context.')
      return
    }

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }
      })
      streamRef.current = stream
      setCameraActive(true)
      setCameraError('')
    } catch (err) {
      if (err?.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Allow camera access in browser settings.')
        return
      }
      if (err?.name === 'NotFoundError') {
        setCameraError('No camera device found.')
        return
      }
      if (err?.name === 'NotReadableError') {
        setCameraError('Camera is already in use by another app/tab.')
        return
      }
      setCameraError('Unable to access camera.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }

  const scanFromCamera = async () => {
    if (!videoRef.current || !cameraActive) {
      setScanError('Camera is not active.')
      return
    }

    const video = videoRef.current
    if (!video.videoWidth || !video.videoHeight) {
      setScanError('Camera frame not ready yet.')
      return
    }

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
    }
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height)

    if (!code?.data) {
      setScanError('No QR code detected in current camera frame.')
      return
    }

    await handleScanPayloadSubmit(code.data)
  }

  const handleManualOverride = async () => {
    if (!manualRegistrationId) {
      setAttendanceError('Select a participant/registration for manual override.')
      return
    }

    setManualLoading(true)
    setAttendanceError('')
    setActionSuccess('')

    try {
      await apiClient.post(`/api/organisers/events/${id}/attendance/manual`, {
        registrationId: manualRegistrationId,
        attendance: manualAttendance,
        note: manualNote
      })
      setActionSuccess('Manual attendance override saved.')
      setManualNote('')
      await loadAttendance()
    } catch (err) {
      setAttendanceError(err?.response?.data?.message || 'Unable to apply manual override.')
    } finally {
      setManualLoading(false)
    }
  }

  if (loading) {
    return <div className="lb-page">Loading event...</div>
  }

  if (error) {
    return (
      <div className="lb-page">
        <div className="alert alert-error"><span>{error}</span></div>
      </div>
    )
  }

  if (!event) return null

  return (
    <div className="lb-page">
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
              <p className="text-sm">Registrations: {event.registrationStatus || 'closed'}</p>
              <p className="text-sm">Eligibility: {event.eligibility || 'TBD'}</p>
              <p className="text-sm">Fee: {event.fee}</p>
              <p className="text-sm">
                Dates: {event.startTime ? formatDateTime(event.startTime) : 'TBD'} -{' '}
                {event.endTime ? formatDateTime(event.endTime) : 'TBD'}
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

        {(actionSuccess || paymentError || attendanceError) && (
          <div className="space-y-2">
            {actionSuccess && <div className="alert alert-success"><span>{actionSuccess}</span></div>}
            {paymentError && <div className="alert alert-error"><span>{paymentError}</span></div>}
            {attendanceError && <div className="alert alert-error"><span>{attendanceError}</span></div>}
          </div>
        )}

        <div role="tablist" className="tabs tabs-boxed w-fit">
          <button type="button" role="tab" className={tabClass(activeTab, 'participants')} onClick={() => setActiveTab('participants')}>
            Participants
          </button>
          {event.eventType === 'merchandise' && (
            <button type="button" role="tab" className={tabClass(activeTab, 'payments')} onClick={() => setActiveTab('payments')}>
              Payment Approvals
            </button>
          )}
          <button type="button" role="tab" className={tabClass(activeTab, 'attendance')} onClick={() => setActiveTab('attendance')}>
            Attendance Scanner
          </button>
          <button type="button" role="tab" className={tabClass(activeTab, 'forum')} onClick={() => setActiveTab('forum')}>
            Forum
          </button>
        </div>

        {activeTab === 'participants' && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Participants</h2>
                <p className="text-sm text-base-content/70">Search, filter, and export.</p>
              </div>
              <button className="btn btn-outline btn-sm" type="button" onClick={handleExportParticipants}>
                Export CSV
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="form-control">
                <label className="label" htmlFor="participantSearch">
                  <span className="label-text">Search</span>
                </label>
                <input
                  id="participantSearch"
                  name="search"
                  className="input input-bordered"
                  placeholder="Search name or email"
                  value={filters.search}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="form-control">
                <label className="label" htmlFor="participantStatus">
                  <span className="label-text">Status</span>
                </label>
                <select
                  id="participantStatus"
                  name="status"
                  className="select select-bordered"
                  value={filters.status}
                  onChange={handleFilterChange}
                >
                  <option value="all">All statuses</option>
                  <option value="registered">Registered</option>
                  <option value="pending_payment">Pending Payment Proof</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="successful">Successful</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="form-control">
                <label className="label" htmlFor="participantType">
                  <span className="label-text">Type</span>
                </label>
                <select
                  id="participantType"
                  name="type"
                  className="select select-bordered"
                  value={filters.type}
                  onChange={handleFilterChange}
                >
                  <option value="all">All types</option>
                  <option value="normal">Normal</option>
                  <option value="merchandise">Merchandise</option>
                </select>
              </div>
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
                    <th>Status</th>
                    <th>Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParticipants.map((participant) => (
                    <tr key={participant.id}>
                      <td>{participant.name}</td>
                      <td>{participant.email}</td>
                      <td>{formatDateTime(participant.registeredAt)}</td>
                      <td>{participant.payment}</td>
                      <td>{participant.status}</td>
                      <td>{participant.attendance ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'payments' && event.eventType === 'merchandise' && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Payment approvals</h2>
              <select
                className="select select-bordered select-sm w-full max-w-xs"
                value={paymentFilter}
                onChange={(evt) => setPaymentFilter(evt.target.value)}
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {paymentOrders.length === 0 ? (
              <div className="alert"><span>No payment-proof orders found.</span></div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {paymentOrders.map((order) => (
                  <div key={order.id} className="card bg-base-100 shadow">
                    <div className="card-body space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold">{order.participantName}</h3>
                        <span className="badge badge-outline">{order.status}</span>
                      </div>
                      <p className="text-sm text-base-content/70">{order.participantEmail}</p>
                      <div className="text-xs text-base-content/70 space-y-1">
                        {order.items.map((item, index) => (
                          <div key={`${order.id}-${index}`}>
                            {item.itemName} · {item.variantLabel} · Qty {item.quantity}
                          </div>
                        ))}
                      </div>

                      {order.proofImageUrl ? (
                        <img
                          src={order.proofImageUrl}
                          alt="Payment proof"
                          className="rounded-lg border border-base-200 max-h-56 object-contain bg-base-200"
                        />
                      ) : (
                        <div className="text-sm text-warning">Payment proof missing</div>
                      )}

                      <textarea
                        className="textarea textarea-bordered"
                        rows={2}
                        placeholder="Review note (optional)"
                        value={reviewNote[order.id] || ''}
                        onChange={(evt) => setReviewNote((prev) => ({ ...prev, [order.id]: evt.target.value }))}
                      />

                      {order.status === 'pending' ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="btn btn-success btn-sm"
                            type="button"
                            disabled={reviewLoadingId === order.id}
                            onClick={() => handleReviewPayment(order.id, 'approve')}
                          >
                            {reviewLoadingId === order.id ? 'Saving...' : 'Approve'}
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            type="button"
                            disabled={reviewLoadingId === order.id}
                            onClick={() => handleReviewPayment(order.id, 'reject')}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-base-content/70">
                          Reviewed at: {order.review?.reviewedAt ? formatDateTime(order.review.reviewedAt) : '—'}
                        </div>
                      )}

                      {order.ticketCode && (
                        <div className="text-xs">Ticket issued: {order.ticketCode}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'attendance' && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">QR scanner & attendance</h2>
              <button className="btn btn-outline btn-sm" type="button" onClick={handleExportAttendance}>
                Export Attendance CSV
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="card bg-base-100 shadow">
                <div className="card-body py-4">
                  <p className="text-sm text-base-content/70">Total tickets</p>
                  <p className="text-2xl font-semibold">{attendanceSummary.total}</p>
                </div>
              </div>
              <div className="card bg-base-100 shadow">
                <div className="card-body py-4">
                  <p className="text-sm text-base-content/70">Scanned</p>
                  <p className="text-2xl font-semibold">{attendanceSummary.scanned}</p>
                </div>
              </div>
              <div className="card bg-base-100 shadow">
                <div className="card-body py-4">
                  <p className="text-sm text-base-content/70">Not scanned</p>
                  <p className="text-2xl font-semibold">{attendanceSummary.notScanned}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="card bg-base-100 shadow">
                <div className="card-body space-y-3">
                  <h3 className="font-semibold">Scan ticket</h3>

                  <textarea
                    className="textarea textarea-bordered"
                    rows={2}
                    placeholder="Paste scanned QR payload or ticket code"
                    value={scanPayload}
                    onChange={(evt) => setScanPayload(evt.target.value)}
                  />

                  <div className="flex flex-wrap gap-2">
                    <button className="btn btn-success btn-sm" type="button" disabled={scanLoading} onClick={handleScanManualPayload}>
                      {scanLoading ? 'Scanning...' : 'Submit Payload'}
                    </button>
                    <label className="btn btn-outline btn-sm" htmlFor="qrUploadInput">
                      Scan from Image
                    </label>
                    <input
                      id="qrUploadInput"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(evt) => handleScanFromFile(evt.target.files?.[0])}
                    />
                  </div>

                  <div className="space-y-2">
                    {!cameraActive ? (
                      <button className="btn btn-outline btn-sm" type="button" onClick={startCamera}>
                        Start Camera
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <video ref={videoRef} className="w-full rounded-lg border border-base-200" autoPlay muted playsInline />
                        <div className="flex gap-2">
                          <button className="btn btn-success btn-sm" type="button" onClick={scanFromCamera}>
                            Scan Current Frame
                          </button>
                          <button className="btn btn-outline btn-sm" type="button" onClick={stopCamera}>
                            Stop Camera
                          </button>
                        </div>
                      </div>
                    )}
                    {cameraError && <div className="text-sm text-error">{cameraError}</div>}
                  </div>

                  {scanError && <div className="alert alert-error"><span>{scanError}</span></div>}
                  {scanSuccess && <div className="alert alert-success"><span>{scanSuccess}</span></div>}
                </div>
              </div>

              <div className="card bg-base-100 shadow">
                <div className="card-body space-y-3">
                  <h3 className="font-semibold">Manual override</h3>
                  <select
                    className="select select-bordered"
                    value={manualRegistrationId}
                    onChange={(evt) => setManualRegistrationId(evt.target.value)}
                  >
                    <option value="">Select attendee</option>
                    {attendanceRows.map((row) => (
                      <option key={row.registrationId} value={row.registrationId}>
                        {row.participantName} ({row.ticketCode})
                      </option>
                    ))}
                  </select>

                  <select
                    className="select select-bordered"
                    value={manualAttendance ? 'present' : 'absent'}
                    onChange={(evt) => setManualAttendance(evt.target.value === 'present')}
                  >
                    <option value="present">Mark Present</option>
                    <option value="absent">Mark Absent</option>
                  </select>

                  <textarea
                    className="textarea textarea-bordered"
                    rows={2}
                    placeholder="Reason / audit note"
                    value={manualNote}
                    onChange={(evt) => setManualNote(evt.target.value)}
                  />

                  <button
                    className="btn btn-outline btn-sm"
                    type="button"
                    disabled={manualLoading || !manualRegistrationId}
                    onClick={handleManualOverride}
                  >
                    {manualLoading ? 'Saving...' : 'Apply Override'}
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Ticket</th>
                    <th>Attendance</th>
                    <th>Marked At</th>
                    <th>Method</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRows.map((row) => (
                    <tr key={row.registrationId}>
                      <td>{row.participantName}</td>
                      <td>{row.participantEmail}</td>
                      <td>{row.ticketCode}</td>
                      <td>{row.attendance ? 'Present' : 'Absent'}</td>
                      <td>{row.attendanceMarkedAt ? formatDateTime(row.attendanceMarkedAt) : '—'}</td>
                      <td>{row.attendanceMethod || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'forum' && (
          <section>
            <EventForum eventId={id} />
          </section>
        )}
      </div>
    </div>
  )
}

export default OrganizerEventDetails
