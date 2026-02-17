import React, { useEffect, useState } from 'react'
import apiClient from '../api/client'

const OrganizerProfile = () => {
  const [form, setForm] = useState({
    name: '',
    category: 'tech',
    description: '',
    contactEmail: '',
    contactNumber: '',
    discordWebhook: '',
    loginEmail: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [requestingReset, setRequestingReset] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiClient.get('/api/organisers/me')
        setForm({
          name: response.data.organiser?.name || '',
          category: response.data.organiser?.category || 'tech',
          description: response.data.organiser?.description || '',
          contactEmail: response.data.organiser?.contactEmail || '',
          contactNumber: response.data.organiser?.contactNumber || '',
          discordWebhook: response.data.organiser?.discordWebhook || '',
          loginEmail: response.data.email || ''
        })
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load profile.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await apiClient.put('/api/organisers/me', form)
      setSuccess('Profile updated.')
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const handleResetRequest = async () => {
    setRequestingReset(true)
    setError('')
    setSuccess('')
    try {
      const response = await apiClient.post('/api/organisers/password-reset-request')
      setSuccess(response.data.message || 'Password reset request submitted.')
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to submit reset request.')
    } finally {
      setRequestingReset(false)
    }
  }

  if (loading) {
    return <div className="lb-page">Loading profile...</div>
  }

  return (
    <div className="lb-page">
      <div className="max-w-4xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Organizer profile</h1>
          <p className="text-sm text-base-content/70">Update your organizer details.</p>
        </div>

        {error && <div className="alert alert-error"><span>{error}</span></div>}
        {success && <div className="alert alert-success"><span>{success}</span></div>}

        <form className="card bg-base-100 shadow" onSubmit={handleSubmit}>
          <div className="card-body space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="form-control">
                <label className="label" htmlFor="name">
                  <span className="label-text">Name</span>
                </label>
                <input
                  id="name"
                  name="name"
                  className="input input-bordered"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
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
                  required
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
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="form-control">
                <label className="label" htmlFor="loginEmail">
                  <span className="label-text">Login email</span>
                </label>
                <input
                  id="loginEmail"
                  name="loginEmail"
                  type="email"
                  className="input input-bordered"
                  value={form.loginEmail}
                  disabled
                />
                <span className="text-xs text-base-content/60 mt-1">Read-only</span>
              </div>
              <div className="form-control">
                <label className="label" htmlFor="contactEmail">
                  <span className="label-text">Contact email</span>
                </label>
                <input
                  id="contactEmail"
                  name="contactEmail"
                  type="email"
                  className="input input-bordered"
                  value={form.contactEmail}
                  onChange={handleChange}
                />
              </div>
              <div className="form-control">
                <label className="label" htmlFor="contactNumber">
                  <span className="label-text">Contact number</span>
                </label>
                <input
                  id="contactNumber"
                  name="contactNumber"
                  type="tel"
                  className="input input-bordered"
                  value={form.contactNumber}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label" htmlFor="discordWebhook">
                <span className="label-text">Discord webhook</span>
              </label>
              <input
                id="discordWebhook"
                name="discordWebhook"
                type="url"
                className="input input-bordered"
                value={form.discordWebhook}
                onChange={handleChange}
              />
              <span className="text-xs text-base-content/60 mt-1">
                New events will be posted automatically.
              </span>
            </div>

            <div className="flex justify-end">
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-outline" type="button" onClick={handleResetRequest} disabled={requestingReset}>
                  {requestingReset ? 'Requesting...' : 'Request password reset'}
                </button>
                <button className="btn btn-success" type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save profile'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default OrganizerProfile
