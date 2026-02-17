import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import apiClient from '../api/client'

const emptyField = () => ({
  label: '',
  fieldType: 'text',
  required: false,
  options: [],
  optionsInput: ''
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
  const [tagsInput, setTagsInput] = useState('')
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
          customForm: (event.customForm || []).map((field) => ({
            ...field,
            optionsInput: (field.options || []).join(', ')
          })),
          registrationDeadline: event.registrationDeadline ? event.registrationDeadline.slice(0, 16) : '',
          startTime: event.startTime ? event.startTime.slice(0, 16) : '',
          endTime: event.endTime ? event.endTime.slice(0, 16) : ''
        })
        setTagsInput((event.tags || []).join(', '))
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
    const { value } = event.target
    setTagsInput(value)
    const tags = value
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
    setForm((prev) => ({ ...prev, tags }))
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
    return <div className="lb-page">Loading event...</div>
  }

  return (
    <div className="lb-page">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{isEditing ? 'Edit event' : 'Create event'}</h1>
            <p className="text-sm text-base-content/70">Drafts allow full edits before publishing.</p>
          </div>
          {isEditing && (
            <div className="flex flex-wrap gap-2">
              {status === 'draft' && (
                <button className="btn btn-success" type="button" onClick={handlePublish}>
                  Publish
                </button>
              )}
              {status === 'published' && (
                <button className="btn btn-outline" type="button" onClick={() => handleStatusChange('closed')}>
                  Close registrations
                </button>
              )}
              {status === 'ongoing' && (
                <>
                  <button className="btn btn-outline" type="button" onClick={() => handleStatusChange('completed')}>
                    Mark completed
                  </button>
                  <button className="btn btn-outline" type="button" onClick={() => handleStatusChange('closed')}>
                    Close event
                  </button>
                </>
              )}
              {status === 'completed' && (
                <button className="btn btn-outline" type="button" onClick={() => handleStatusChange('closed')}>
                  Close event
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
                  <input
                    id="tags"
                    name="tags"
                    type="text"
                    placeholder="Enter tags separated by commas (e.g., tech, fun, beginner)"
                    className="input input-bordered"
                    value={tagsInput}
                    onChange={handleTagChange}
                    disabled={isEditing && !canEditDraft}
                  />
                  {form.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {form.tags.map((tag) => (
                        <span key={tag} className="badge badge-primary">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
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

          {form.eventType === 'merchandise' && (
            <div className="card bg-base-100 shadow">
              <div className="card-body space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Merchandise Items</h2>
                  <button
                    className="btn btn-outline btn-sm"
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        merchandise: {
                          ...prev.merchandise,
                          items: [
                            ...(prev.merchandise?.items || []),
                            { name: '', purchaseLimit: 1, variants: [] }
                          ]
                        }
                      }))
                    }
                    disabled={isEditing && !canEditDraft}
                  >
                    Add Item
                  </button>
                </div>
                {!form.merchandise?.items?.length && (
                  <p className="text-sm text-base-content/60">No merchandise items added yet.</p>
                )}
                <div className="space-y-4">
                  {form.merchandise?.items?.map((item, itemIndex) => (
                    <div key={itemIndex} className="card bg-base-200">
                      <div className="card-body space-y-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="form-control">
                            <label className="label">
                              <span className="label-text">Item Name</span>
                            </label>
                            <input
                              className="input input-bordered"
                              value={item.name}
                              onChange={(e) =>
                                setForm((prev) => {
                                  const newItems = [...(prev.merchandise?.items || [])]
                                  newItems[itemIndex] = { ...newItems[itemIndex], name: e.target.value }
                                  return { ...prev, merchandise: { ...prev.merchandise, items: newItems } }
                                })
                              }
                              disabled={isEditing && !canEditDraft}
                            />
                          </div>
                          <div className="form-control">
                            <label className="label">
                              <span className="label-text">Purchase Limit per Person</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              className="input input-bordered"
                              value={item.purchaseLimit}
                              onChange={(e) =>
                                setForm((prev) => {
                                  const newItems = [...(prev.merchandise?.items || [])]
                                  newItems[itemIndex] = {
                                    ...newItems[itemIndex],
                                    purchaseLimit: parseInt(e.target.value) || 1
                                  }
                                  return { ...prev, merchandise: { ...prev.merchandise, items: newItems } }
                                })
                              }
                              disabled={isEditing && !canEditDraft}
                            />
                          </div>
                        </div>

                        <div className="divider text-xs">Variants</div>

                        {item.variants?.map((variant, variantIndex) => (
                            <div key={variantIndex} className="flex gap-2 items-end">
                            <div className="form-control flex-1">
                              <label className="label">
                                <span className="label-text">Label</span>
                              </label>
                              <input
                                className="input input-bordered input-sm"
                                value={variant.label}
                                onChange={(e) =>
                                  setForm((prev) => {
                                    const newItems = [...(prev.merchandise?.items || [])]
                                    const newVariants = [...(newItems[itemIndex].variants || [])]
                                    newVariants[variantIndex] = {
                                      ...newVariants[variantIndex],
                                      label: e.target.value
                                    }
                                    newItems[itemIndex] = { ...newItems[itemIndex], variants: newVariants }
                                    return { ...prev, merchandise: { ...prev.merchandise, items: newItems } }
                                  })
                                }
                                disabled={isEditing && !canEditDraft}
                              />
                              <span className="text-xs text-base-content/60 mt-1">
                                e.g. Size/Color
                              </span>
                            </div>
                            <div className="form-control w-24">
                              <label className="label">
                                <span className="label-text">Stock</span>
                              </label>
                              <input
                                type="number"
                                min="0"
                                className="input input-bordered input-sm"
                                value={variant.stock}
                                onChange={(e) =>
                                  setForm((prev) => {
                                    const newItems = [...(prev.merchandise?.items || [])]
                                    const newVariants = [...(newItems[itemIndex].variants || [])]
                                    newVariants[variantIndex] = {
                                      ...newVariants[variantIndex],
                                      stock: parseInt(e.target.value) || 0
                                    }
                                    newItems[itemIndex] = { ...newItems[itemIndex], variants: newVariants }
                                    return { ...prev, merchandise: { ...prev.merchandise, items: newItems } }
                                  })
                                }
                                disabled={isEditing && !canEditDraft}
                              />
                            </div>
                            <button
                              className="btn btn-ghost btn-sm text-error"
                              type="button"
                              onClick={() =>
                                setForm((prev) => {
                                  const newItems = [...(prev.merchandise?.items || [])]
                                  newItems[itemIndex].variants = newItems[itemIndex].variants.filter(
                                    (_, i) => i !== variantIndex
                                  )
                                  return { ...prev, merchandise: { ...prev.merchandise, items: newItems } }
                                })
                              }
                              disabled={isEditing && !canEditDraft}
                            >
                              ✕
                            </button>
                          </div>
                        ))}

                        <button
                          className="btn btn-outline btn-xs gap-2"
                          type="button"
                          onClick={() =>
                            setForm((prev) => {
                              const newItems = [...(prev.merchandise?.items || [])]
                              newItems[itemIndex].variants = [
                                ...(newItems[itemIndex].variants || []),
                                { label: '', stock: 0 }
                              ]
                              return { ...prev, merchandise: { ...prev.merchandise, items: newItems } }
                            })
                          }
                          disabled={isEditing && !canEditDraft}
                        >
                          + Add Variant
                        </button>

                        <div className="card-actions justify-end mt-2">
                          <button
                            className="btn btn-sm btn-error btn-outline"
                            type="button"
                            onClick={() =>
                              setForm((prev) => {
                                const newItems = prev.merchandise.items.filter((_, i) => i !== itemIndex)
                                return { ...prev, merchandise: { ...prev.merchandise, items: newItems } }
                              })
                            }
                            disabled={isEditing && !canEditDraft}
                          >
                            Remove Item
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="card bg-base-100 shadow">
            <div className="card-body space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Custom registration form</h2>
                  {isEditing && !canEditDraft && (
                    <p className="text-xs text-warning mt-1">📋 Form is locked (registrations received)</p>
                  )}
                </div>
                <button className="btn btn-outline btn-sm" type="button" onClick={addField} disabled={isEditing && !canEditDraft}>
                  Add field
                </button>
              </div>
              {!form.customForm.length && (
                <p className="text-sm text-base-content/60">No custom fields yet.</p>
              )}
              <div className="space-y-4">
                {form.customForm.map((field, index) => (
                  <div key={index} className="card bg-base-200">
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
                            <option value="radio">Radio</option>
                            <option value="checkbox">Checkbox</option>
                            <option value="file">File upload</option>
                          </select>
                        </div>
                      </div>
                      <div className="form-control">
                        <label className="label" htmlFor={`required-${index}`}>
                          <span className="label-text">Required</span>
                        </label>
                        <input
                          id={`required-${index}`}
                          type="checkbox"
                          className="toggle"
                          checked={field.required}
                          onChange={(event) => updateField(index, 'required', event.target.checked)}
                          disabled={isEditing && !canEditDraft}
                        />
                      </div>
                      {(field.fieldType === 'dropdown' || field.fieldType === 'checkbox' || field.fieldType === 'radio') && (
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text">Options</span>
                          </label>
                          <input
                            className="input input-bordered"
                            value={field.optionsInput || ''}
                            onChange={(event) => {
                              const rawValue = event.target.value
                              updateField(index, 'optionsInput', rawValue)
                              updateField(
                                index,
                                'options',
                                rawValue
                                  .split(',')
                                  .map((item) => item.trim())
                                  .filter(Boolean)
                              )
                            }}
                            disabled={isEditing && !canEditDraft}
                          />
                          <span className="text-xs text-base-content/60 mt-1">
                            Comma separated
                          </span>
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
            <button className="btn btn-success" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default OrganizerEventForm
