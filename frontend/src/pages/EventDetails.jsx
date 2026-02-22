import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import apiClient from '../api/client'
import { formatDateTime } from '../utils/dateFormat'

const EventDetails = () => {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [counts, setCounts] = useState({ registrationCount: 0, remainingSpots: null })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const [ticketId, setTicketId] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [formData, setFormData] = useState({})
  const [merchSelections, setMerchSelections] = useState([])
  const [pendingOrderId, setPendingOrderId] = useState('')
  const [paymentProofFile, setPaymentProofFile] = useState(null)
  const [paymentUploadLoading, setPaymentUploadLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiClient.get(`/api/events/${id}`)
        setEvent(response.data.event)
        setCounts({
          registrationCount: response.data.registrationCount || 0,
          remainingSpots: response.data.remainingSpots
        })
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load event.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id])

  useEffect(() => {
    if (!event?.merchandise?.items?.length) return
    const initial = event.merchandise.items.map((item) => ({
      itemName: item.name,
      variantLabel: item.variants?.[0]?.label || '',
      quantity: 0
    }))
    setMerchSelections(initial)
  }, [event])

  const deadlinePassed = useMemo(() => {
    if (!event?.registrationDeadline) return false
    return new Date(event.registrationDeadline) < new Date()
  }, [event])

  const registrationClosed = event
    ? (event.registrationStatus ? event.registrationStatus === 'closed' : ['draft', 'closed', 'completed'].includes(event.status) || deadlinePassed)
    : false

  const isFull = typeof counts.remainingSpots === 'number' && counts.remainingSpots <= 0

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleFileChange = (fieldName, file) => {
    setFormData((prev) => ({ ...prev, [fieldName]: file }))
  }

  const handleRegister = async () => {
    setActionError('')
    setActionSuccess('')
    setTicketId('')
    setActionLoading(true)
    try {
      // Build FormData for multipart request
      const formDataObj = new FormData()
      const textData = {}

      for (const [key, value] of Object.entries(formData)) {
        if (value instanceof File) {
          formDataObj.append(key, value)
        } else if (Array.isArray(value)) {
          textData[key] = value
        } else if (value !== null && value !== undefined) {
          textData[key] = value
        }
      }

      // Add form data as JSON field
      formDataObj.append('formData', JSON.stringify(textData))

      const response = await apiClient.post(`/api/events/${id}/register`, formDataObj)
      setActionSuccess('Registration successful. Your ticket is ready.')
      if (response.data?.ticket?._id) {
        setTicketId(response.data.ticket._id)
      }
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Registration failed.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleMerchChange = (index, key, value) => {
    setMerchSelections((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [key]: value }
      return next
    })
  }

  const purchaseValidation = useMemo(() => {
    if (!event?.merchandise?.items?.length) {
      return { blocked: true, stockError: false }
    }

    const hasSelection = merchSelections.some((item) => item.quantity > 0)
    if (!hasSelection) {
      return { blocked: true, stockError: false }
    }

    let stockError = false
    merchSelections.forEach((selection) => {
      if (selection.quantity <= 0) return
      const item = event.merchandise.items.find((i) => i.name === selection.itemName)
      const variant = item?.variants?.find((v) => v.label === selection.variantLabel)
      if (!variant || selection.quantity > variant.stock) {
        stockError = true
      }
    })

    return { blocked: stockError, stockError }
  }, [event, merchSelections])

  const handlePurchase = async () => {
    setActionError('')
    setActionSuccess('')
    setTicketId('')
    setPendingOrderId('')
    setActionLoading(true)
    try {
      const items = merchSelections.filter((item) => item.quantity > 0)
      if (!items.length) {
        setActionError('Select at least one item to purchase.')
        return
      }
      const response = await apiClient.post(`/api/events/${id}/purchase`, { items })
      setActionSuccess('Order placed. Upload payment proof to move it to organizer approval.')
      if (response.data?.registration?._id) {
        setPendingOrderId(response.data.registration._id)
      }
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Purchase failed.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUploadPaymentProof = async () => {
    if (!pendingOrderId) {
      setActionError('No pending order found for proof upload.')
      return
    }
    if (!paymentProofFile) {
      setActionError('Select an image file first.')
      return
    }

    setActionError('')
    setPaymentUploadLoading(true)
    try {
      const proofData = new FormData()
      proofData.append('paymentProof', paymentProofFile)

      await apiClient.post(
        `/api/events/registrations/${pendingOrderId}/payment-proof`,
        proofData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      setActionSuccess('Payment proof uploaded. Order is now pending organizer approval.')
      setPaymentProofFile(null)
      setPendingOrderId('')
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Unable to upload payment proof.')
    } finally {
      setPaymentUploadLoading(false)
    }
  }

  if (loading) return <div className="lb-page">Loading...</div>
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
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="card bg-base-100 shadow">
          <div className="card-body space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="card-title text-2xl">{event.name}</h1>
                <p className="text-sm text-base-content/70">{event.description}</p>
              </div>
              <span className="badge badge-outline">{event.eventType}</span>
            </div>
            <div className="text-xs text-base-content/60">
              {event.category} · {event.eligibility}
            </div>
            <div className="text-xs text-base-content/60">
              Organizer: {event.organiserId?.name || 'Organizer'}
            </div>
            <div className="grid gap-2 md:grid-cols-2 text-xs text-base-content/60">
              <div>Starts: {event.startTime ? formatDateTime(event.startTime) : 'TBD'}</div>
              <div>Ends: {event.endTime ? formatDateTime(event.endTime) : 'TBD'}</div>
              <div>Registration deadline: {event.registrationDeadline ? formatDateTime(event.registrationDeadline) : 'TBD'}</div>
              <div>Fee: {event.fee || 0}</div>
              {typeof event.regLimit === 'number' && (
                <div>Capacity: {counts.registrationCount}/{event.regLimit}</div>
              )}
              {typeof counts.remainingSpots === 'number' && (
                <div>Remaining spots: {counts.remainingSpots}</div>
              )}
            </div>
          </div>
        </div>

        {actionError && <div className="alert alert-error"><span>{actionError}</span></div>}
        {actionSuccess && (
          <div className="alert alert-success">
            <span>{actionSuccess}</span>
            {ticketId && (
              <Link className="link link-primary text-sm" to={`/tickets/${ticketId}`}>
                View ticket
              </Link>
            )}
          </div>
        )}

        {event.eventType === 'normal' ? (
          <div className="card bg-base-100 shadow">
            <div className="card-body space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Register</h2>
                {registrationClosed && (
                  <span className="badge badge-ghost">Registration closed</span>
                )}
              </div>

              {event.customForm?.length ? (
                <div className="space-y-3">
                  {event.customForm.map((field, index) => (
                    <div key={`${field.label}-${index}`} className="form-control">
                      <label className="label">
                        <span className="label-text">{field.label}</span>
                      </label>
                      {field.fieldType === 'textarea' && (
                        <textarea
                          className="textarea textarea-bordered"
                          rows={3}
                          required={field.required}
                          value={formData[field.label] || ''}
                          onChange={(e) => handleFieldChange(field.label, e.target.value)}
                        />
                      )}
                      {(field.fieldType === 'select' || field.fieldType === 'dropdown') && (
                        <select
                          className="select select-bordered"
                          required={field.required}
                          value={formData[field.label] || ''}
                          onChange={(e) => handleFieldChange(field.label, e.target.value)}
                        >
                          <option value="">Select</option>
                          {(field.options || []).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      )}
                      {field.fieldType === 'checkbox' && (
                        <div className="flex flex-wrap gap-3">
                          {(field.options || []).map((option) => {
                            const selected = Array.isArray(formData[field.label])
                              ? formData[field.label]
                              : []
                            const isChecked = selected.includes(option)
                            const optionId = `${field.label}-${option}`
                            return (
                              <div key={option} className="form-control">
                                <label className="label" htmlFor={optionId}>
                                  <span className="label-text">{option}</span>
                                </label>
                                <input
                                  id={optionId}
                                  type="checkbox"
                                  className="checkbox checkbox-sm"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const next = e.target.checked
                                      ? [...selected, option]
                                      : selected.filter((item) => item !== option)
                                    handleFieldChange(field.label, next)
                                  }}
                                />
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {field.fieldType === 'radio' && (
                        <div className="flex flex-wrap gap-3">
                          {(field.options || []).map((option) => {
                            const optionId = `${field.label}-${option}`
                            return (
                              <label key={option} className="label cursor-pointer gap-2" htmlFor={optionId}>
                                <input
                                  id={optionId}
                                  type="radio"
                                  name={`radio-${field.label}`}
                                  className="radio radio-sm"
                                  checked={formData[field.label] === option}
                                  onChange={() => handleFieldChange(field.label, option)}
                                  required={field.required}
                                />
                                <span className="label-text">{option}</span>
                              </label>
                            )
                          })}
                        </div>
                      )}
                      {['text', 'number', 'email'].includes(field.fieldType) && (
                        <input
                          type={field.fieldType}
                          className="input input-bordered"
                          required={field.required}
                          value={formData[field.label] || ''}
                          onChange={(e) => handleFieldChange(field.label, e.target.value)}
                        />
                      )}
                      {field.fieldType === 'file' && (
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text">Upload file</span>
                          </label>
                          <input
                            type="file"
                            className="file-input file-input-bordered"
                            required={field.required}
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                handleFileChange(field.label, file)
                              }
                            }}
                          />
                          {formData[field.label] && (
                            <div className="text-sm text-base-content/70 mt-2">
                              Selected: {formData[field.label].name}
                            </div>
                          )}
                        </div>
                      )}
                      {!['textarea', 'select', 'dropdown', 'checkbox', 'radio', 'text', 'file', 'number', 'email'].includes(field.fieldType) && (
                        <input
                          type="text"
                          className="input input-bordered"
                          required={field.required}
                          value={formData[field.label] || ''}
                          onChange={(e) => handleFieldChange(field.label, e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-base-content/70">No extra registration fields required.</p>
              )}

              {isFull && (
                <div className="alert alert-warning"><span>Registration limit reached.</span></div>
              )}
              {deadlinePassed && (
                <div className="alert alert-warning"><span>Registration deadline has passed.</span></div>
              )}

              <button
                className="btn btn-success"
                type="button"
                onClick={handleRegister}
                disabled={actionLoading || registrationClosed || isFull}
              >
                {actionLoading ? 'Registering...' : 'Register'}
              </button>
            </div>
          </div>
        ) : (
          <div className="card bg-base-100 shadow">
            <div className="card-body space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Purchase merchandise</h2>
                {registrationClosed && (
                  <span className="badge badge-ghost">Purchases closed</span>
                )}
              </div>

              {event.merchandise?.items?.length ? (
                <div className="space-y-4">
                  {event.merchandise.items.map((item, index) => (
                    <div key={item.name} className="border border-base-200 rounded-lg p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-semibold">{item.name}</h3>
                        <span className="text-xs text-base-content/60">
                          Limit: {item.purchaseLimit || 1}
                        </span>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text">Variant</span>
                          </label>
                          <select
                            className="select select-bordered"
                            value={merchSelections[index]?.variantLabel || ''}
                            onChange={(e) => handleMerchChange(index, 'variantLabel', e.target.value)}
                          >
                            {item.variants.map((variant) => (
                              <option key={variant.label} value={variant.label}>
                                {variant.label} (Stock: {variant.stock})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text">Quantity</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={item.purchaseLimit || 1}
                            className="input input-bordered"
                            value={merchSelections[index]?.quantity || 0}
                            onChange={(e) => handleMerchChange(index, 'quantity', Number(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-base-content/70">No merchandise items available.</p>
              )}

              {deadlinePassed && (
                <div className="alert alert-warning"><span>Purchase deadline has passed.</span></div>
              )}
              {purchaseValidation.stockError && (
                <div className="alert alert-warning"><span>Selected quantity exceeds stock.</span></div>
              )}

              <button
                className="btn btn-success"
                type="button"
                onClick={handlePurchase}
                disabled={actionLoading || registrationClosed || purchaseValidation.blocked}
              >
                {actionLoading ? 'Processing...' : 'Purchase'}
              </button>

              {pendingOrderId && (
                <div className="border border-base-200 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold">Upload payment proof</h3>
                  <p className="text-sm text-base-content/70">
                    Upload a payment screenshot/receipt image to move this order to pending approval.
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    className="file-input file-input-bordered w-full"
                    onChange={(e) => setPaymentProofFile(e.target.files?.[0] || null)}
                  />
                  <button
                    className="btn btn-outline"
                    type="button"
                    onClick={handleUploadPaymentProof}
                    disabled={paymentUploadLoading || !paymentProofFile}
                  >
                    {paymentUploadLoading ? 'Uploading...' : 'Submit Payment Proof'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-sm text-base-content/70">
          Need your ticket? Check <Link className="link link-primary" to="/my-events">My Events</Link>.
        </div>
      </div>
    </div>
  )
}

export default EventDetails
