import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import apiClient from '../api/client'

const emptyField = () => ({
  label: '',
  fieldType: 'text',
  required: false,
  options: []
})

const OrganizerEventForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = Boolean(id)

  const [form, setForm] = useState({
    name: '',
    description: '',
    eventType: 'normal',
    category: 'tech',
    eligibility: 'both',
    fee: 0,
    regLimit: 1,
    registrationDeadline: '',
    startTime: '',
    endTime: '',
    tags: [],
    customForm: [],
    merchandise: { items: [] }
  })
  const [status, setStatus] = useState('draft')
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    if (!isEditing) return

    const load = async () => {
      try {
        const response = await apiClient.get(`/api/organisers/events/${id}`)
        const event = response.data.event
        setForm({
          ...form,
          ...event,
          registrationDeadline: event.registrationDeadline ? event.registrationDeadline.slice(0, 16) : '',
          startTime: event.startTime ? event.startTime.slice(0, 16) : '',
          endTime: event.endTime ? event.endTime.slice(0, 16) : ''
        })
        setStatus(event.status)
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load event.')
      } finally {
        setLoading(false)
      }
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEditing])

  const canEditDraft = useMemo(() => status === 'draft', [status])
  const canEditPublished = useMemo(() => status === 'published', [status])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleNumberChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: Number(value) }))
  }

  const handleTagChange = (event) => {
    const options = Array.from(event.target.selectedOptions).map((option) => option.value)
    setForm((prev) => ({ ...prev, tags: options }))
  }

  const addField = () => {
    setForm((prev) => ({ ...prev, customForm: [...prev.customForm, emptyField()] }))
  }

  const updateField = (index, key, value) => {
    setForm((prev) => {
      const next = [...prev.customForm]
      next[index] = { ...next[index], [key]: value }
      return { ...prev, customForm: next }
    })
  }

  const moveField = (index, direction) => {
    setForm((prev) => {
      const next = [...prev.customForm]
      const target = index + direction
      if (target < 0 || target >= next.length) return prev
      const temp = next[index]
      next[index] = next[target]
      next[target] = temp
      return { ...prev, customForm: next }
    })
  }

  const removeField = (index) => {
    setForm((prev) => ({
      ...prev,
      customForm: prev.customForm.filter((_, idx) => idx !== index)
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      if (isEditing) {
        await apiClient.put(`/api/organisers/events/${id}`, form)
      } else {
        const response = await apiClient.post('/api/organisers/events', form)
        navigate(`/organiser/events/${response.data.event._id}`)
        return
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to save event.')
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    setActionError('')
    try {
      const response = await apiClient.post(`/api/organisers/events/${id}/publish`)
      setStatus(response.data.event.status)
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Unable to publish event.')
    }
  }

  const handleStatusChange = async (nextStatus) => {
    setActionError('')
    try {
      const response = await apiClient.post(`/api/organisers/events/${id}/status`, { status: nextStatus })
      setStatus(response.data.event.status)
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Unable to update status.')
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-base-200 p-6">Loading event...</div>
  }

  return (
    <div className="min-h-screen bg-base-200 p-6">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{isEditing ? 'Edit event' : 'Create event'}</h1>
            <p className="text-sm text-base-content/70">Drafts allow full edits before publishing.</p>
          </div>
          {isEditing && (
            <div className="flex flex-wrap gap-2">
              {status === 'draft' && (
                <button className="btn btn-primary" type="button" onClick={handlePublish}>
                  Publish
                </button>
              )}
              {status === 'published' && (
                <button className="btn btn-outline" type="button" onClick={() => handleStatusChange('closed')}>
                  Close registrations
                </button>
              )}
              {status === 'ongoing' && (
                <button className="btn btn-outline" type="button" onClick={() => handleStatusChange('completed')}>
                  Mark completed
                </button>
              )}
            </div>
          )}
        </div>

        {error && <div className="alert alert-error"><span>{error}</span></div>}
        {actionError && <div className="alert alert-warning"><span>{actionError}</span></div>}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="card bg-base-100 shadow">
            <div className="card-body space-y-4">
              <h2 className="text-lg font-semibold">Event basics</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="form-control">
                  <label className="label" htmlFor="name">
                    <span className="label-text">Event name</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    className="input input-bordered"
                    value={form.name}
                    onChange={handleChange}
                    required
                    disabled={isEditing && !canEditDraft}
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
                    value={form.eventType}
                    onChange={handleChange}
                    disabled={isEditing && !canEditDraft}
                  >
                    <option value="normal">Normal</option>
                    <option value="merchandise">Merchandise</option>
                  </select>
                </div>
                <div className="form-control">
                  <label className="label" htmlFor="category">
                    <span className="label-text">Category</span>
                  </label>
                  <select
                    id="category"
                    name="category"
                    className="select select-bordered"
                    value={form.category}
                    onChange={handleChange}
                    disabled={isEditing && !canEditDraft}
                  >
                    <option value="tech">Tech</option>
                    <option value="sports">Sports</option>
                    <option value="design">Design</option>
                    <option value="dance">Dance</option>
                    <option value="music">Music</option>
                    <option value="quiz">Quiz</option>
                    <option value="concert">Concert</option>
                    <option value="gaming">Gaming</option>
                    <option value="misc">Misc</option>
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
                    value={form.eligibility}
                    onChange={handleChange}
                    disabled={isEditing && !canEditDraft}
                  >
                    <option value="internal">Internal</option>
                    <option value="external">External</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>

              <div className="form-control">
                <label className="label" htmlFor="description">
                  <span className="label-text">Description</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  className="textarea textarea-bordered"
                  rows={4}
                  value={form.description}
                  onChange={handleChange}
                  disabled={isEditing && !(canEditDraft || canEditPublished)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="form-control">
                  <label className="label" htmlFor="fee">
                    <span className="label-text">Fee</span>
                  </label>
                  <input
                    id="fee"
                    name="fee"
                    type="number"
                    min="0"
                    className="input input-bordered"
                    value={form.fee}
                    onChange={handleNumberChange}
                    disabled={isEditing && !canEditDraft}
                  />
                </div>
                <div className="form-control">
                  <label className="label" htmlFor="regLimit">
                    <span className="label-text">Registration limit</span>
                  </label>
                  <input
                    id="regLimit"
                    name="regLimit"
                    type="number"
                    min="1"
                    className="input input-bordered"
                    value={form.regLimit}
                    onChange={handleNumberChange}
                    disabled={isEditing && !(canEditDraft || canEditPublished)}
                  />
                </div>
                <div className="form-control">
                  <label className="label" htmlFor="tags">
                    <span className="label-text">Tags</span>
                  </label>
                  <select
                    id="tags"
                    name="tags"
                    className="select select-bordered"
                    multiple
                    value={form.tags}
                    onChange={handleTagChange}
                    disabled={isEditing && !canEditDraft}
                  >
                    <option value="tech">Tech</option>
                    <option value="sports">Sports</option>
                    <option value="design">Design</option>
                    <option value="dance">Dance</option>
                    <option value="music">Music</option>
                    <option value="quiz">Quiz</option>
                    <option value="concert">Concert</option>
                    <option value="gaming">Gaming</option>
                    <option value="misc">Misc</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="form-control">
                  <label className="label" htmlFor="registrationDeadline">
                    <span className="label-text">Registration deadline</span>
                  </label>
                  <input
                    id="registrationDeadline"
                    name="registrationDeadline"
                    type="datetime-local"
                    className="input input-bordered"
                    value={form.registrationDeadline}
                    onChange={handleChange}
                    disabled={isEditing && !(canEditDraft || canEditPublished)}
                  />
                </div>
                <div className="form-control">
                  <label className="label" htmlFor="startTime">
                    <span className="label-text">Start time</span>
                  </label>
                  <input
                    id="startTime"
                    name="startTime"
                    type="datetime-local"
                    className="input input-bordered"
                    value={form.startTime}
                    onChange={handleChange}
                    disabled={isEditing && !canEditDraft}
                  />
                </div>
                <div className="form-control">
                  <label className="label" htmlFor="endTime">
                    <span className="label-text">End time</span>
                  </label>
                  <input
                    id="endTime"
                    name="endTime"
                    type="datetime-local"
                    className="input input-bordered"
                    value={form.endTime}
                    onChange={handleChange}
                    disabled={isEditing && !canEditDraft}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow">
            <div className="card-body space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Custom registration form</h2>
                <button className="btn btn-outline btn-sm" type="button" onClick={addField} disabled={isEditing && !canEditDraft}>
                  Add field
                </button>
              </div>
              {!form.customForm.length && (
                <p className="text-sm text-base-content/60">No custom fields yet.</p>
              )}
              <div className="space-y-4">
                {form.customForm.map((field, index) => (
                  <div key={`${field.label}-${index}`} className="card bg-base-200">
                    <div className="card-body space-y-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text">Label</span>
                          </label>
                          <input
                            className="input input-bordered"
                            value={field.label}
                            onChange={(event) => updateField(index, 'label', event.target.value)}
                            disabled={isEditing && !canEditDraft}
                          />
                        </div>
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text">Field type</span>
                          </label>
                          <select
                            className="select select-bordered"
                            value={field.fieldType}
                            onChange={(event) => updateField(index, 'fieldType', event.target.value)}
                            disabled={isEditing && !canEditDraft}
                          >
                            <option value="text">Text</option>
                            <option value="textarea">Textarea</option>
                            <option value="dropdown">Dropdown</option>
                            <option value="checkbox">Checkbox</option>
                            <option value="file">File upload</option>
                          </select>
                        </div>
                      </div>
                      <div className="form-control">
                        <label className="label cursor-pointer">
                          <span className="label-text">Required</span>
                          <input
                            type="checkbox"
                            className="toggle"
                            checked={field.required}
                            onChange={(event) => updateField(index, 'required', event.target.checked)}
                            disabled={isEditing && !canEditDraft}
                          />
                        </label>
                      </div>
                      {(field.fieldType === 'dropdown' || field.fieldType === 'checkbox') && (
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text">Options (comma separated)</span>
                          </label>
                          <input
                            className="input input-bordered"
                            value={field.options?.join(',') || ''}
                            onChange={(event) =>
                              updateField(
                                index,
                                'options',
                                event.target.value
                                  .split(',')
                                  .map((item) => item.trim())
                                  .filter(Boolean)
                              )
                            }
                            disabled={isEditing && !canEditDraft}
                          />
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button className="btn btn-ghost btn-sm" type="button" onClick={() => moveField(index, -1)}>
                          Move up
                        </button>
                        <button className="btn btn-ghost btn-sm" type="button" onClick={() => moveField(index, 1)}>
                          Move down
                        </button>
                        <button className="btn btn-ghost btn-sm text-error" type="button" onClick={() => removeField(index)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default OrganizerEventForm
