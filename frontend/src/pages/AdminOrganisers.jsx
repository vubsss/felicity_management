import React, { useEffect, useMemo, useState } from 'react'
import apiClient from '../api/client'

const AdminOrganisers = () => {
  const [organisers, setOrganisers] = useState([])
  const [form, setForm] = useState({
    name: '',
    category: 'tech',
    description: '',
    contactEmail: '',
    contactNumber: '',
    discordWebhook: ''
  })
  const [credentials, setCredentials] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all')

  const loadOrganisers = async () => {
    try {
      const response = await apiClient.get('/api/admin/organisers')
      setOrganisers(response.data.organisers || [])
      setError('')
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load organizers.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrganisers()
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'all') return organisers
    return organisers.filter((row) => row.status === filter)
  }, [organisers, filter])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setCredentials(null)

    try {
      const response = await apiClient.post('/api/admin/organisers', form)
      setCredentials(response.data.credentials)
      setForm({
        name: '',
        category: 'tech',
        description: '',
        contactEmail: '',
        contactNumber: '',
        discordWebhook: ''
      })
      await loadOrganisers()
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to create organizer.')
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (id, status) => {
    try {
      await apiClient.patch(`/api/admin/organisers/${id}/status`, { status })
      await loadOrganisers()
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to update status.')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this organizer permanently?')) return
    try {
      await apiClient.delete(`/api/admin/organisers/${id}`)
      await loadOrganisers()
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to delete organizer.')
    }
  }

  const handleReset = async (id) => {
    try {
      const response = await apiClient.post(`/api/admin/organisers/${id}/reset-password`)
      setCredentials(response.data.credentials)
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to reset password.')
    }
  }

  return (
    <div className="lb-page">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Manage clubs and organizers</h1>
          <p className="text-sm text-base-content/70">Create, archive, or remove organizer accounts.</p>
        </div>

        {error && <div className="alert alert-error"><span>{error}</span></div>}
        {credentials && (
          <div className="alert alert-success flex flex-col items-start gap-2">
            <span>Share these credentials with the organizer.</span>
            <div className="text-sm">Email: {credentials.email}</div>
            <div className="text-sm">Password: {credentials.password}</div>
          </div>
        )}

        <div className="space-y-6">
          <form className="card bg-base-100 shadow" onSubmit={handleCreate}>
            <div className="card-body space-y-4">
              <h2 className="text-lg font-semibold">Add new organizer</h2>
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
                  rows={3}
                  value={form.description}
                  onChange={handleChange}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
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
                  className="input input-bordered"
                  value={form.discordWebhook}
                  onChange={handleChange}
                />
              </div>
              <div className="flex justify-end">
                <button className="btn btn-success" type="submit" disabled={saving}>
                  {saving ? 'Creating...' : 'Create organizer'}
                </button>
              </div>
            </div>
          </form>

          <div className="card bg-base-100 shadow">
            <div className="card-body space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">All organizers</h2>
                <select className="select select-bordered" value={filter} onChange={(e) => setFilter(e.target.value)}>
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {loading && <p>Loading organizers...</p>}

              {!loading && (
                <div className="overflow-x-auto">
                  <table className="table table-zebra">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Login email</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((organiser) => (
                        <tr key={organiser.id}>
                          <td>{organiser.name}</td>
                          <td>{organiser.category}</td>
                          <td>{organiser.loginEmail}</td>
                          <td>{organiser.status}</td>
                          <td>
                            <div className="flex flex-wrap gap-2">
                              {organiser.status === 'archived' && (
                                <button className="btn btn-xs btn-success" onClick={() => updateStatus(organiser.id, 'active')}>
                                  Restore
                                </button>
                              )}
                              {organiser.status !== 'archived' && (
                                <button className="btn btn-xs btn-outline" onClick={() => updateStatus(organiser.id, 'archived')}>
                                  Archive
                                </button>
                              )}
                              <button className="btn btn-xs btn-outline" onClick={() => handleReset(organiser.id)}>
                                Reset password
                              </button>
                              <button className="btn btn-xs btn-error" onClick={() => handleDelete(organiser.id)}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminOrganisers
