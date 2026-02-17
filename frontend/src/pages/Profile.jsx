import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import apiClient from '../api/client'

const interestOptions = ['tech', 'sports', 'design', 'dance', 'music', 'quiz', 'concert', 'gaming', 'misc']

const Profile = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const isOnboarding = useMemo(() => searchParams.get('onboarding') === '1', [searchParams])
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    contactNumber: '',
    organisation: '',
    participantType: '',
    email: ''
  })
  const [preferences, setPreferences] = useState({ interests: [], followedOrganisers: [] })
  const [organisers, setOrganisers] = useState([])
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [profileResponse, prefsResponse, organisersResponse] = await Promise.all([
          apiClient.get('/api/participants/me'),
          apiClient.get('/api/participants/preferences'),
          apiClient.get('/api/organisers/public')
        ])

        setProfile({
          firstName: profileResponse.data.participant?.firstName || '',
          lastName: profileResponse.data.participant?.lastName || '',
          contactNumber: profileResponse.data.participant?.contactNumber || '',
          organisation: profileResponse.data.participant?.organisation || '',
          participantType: profileResponse.data.participant?.participantType || '',
          email: profileResponse.data.email || ''
        })
        setPreferences({
          interests: prefsResponse.data.interests || [],
          followedOrganisers: prefsResponse.data.followedOrganisers || []
        })
        setOrganisers(organisersResponse.data.organisers || [])
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load profile.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const handleProfileChange = (event) => {
    const { name, value } = event.target
    setProfile((prev) => ({ ...prev, [name]: value }))
  }

  const toggleInterest = (interest) => {
    setPreferences((prev) => {
      const exists = prev.interests.includes(interest)
      return {
        ...prev,
        interests: exists
          ? prev.interests.filter((item) => item !== interest)
          : [...prev.interests, interest]
      }
    })
  }

  const toggleFollowed = (organiserId) => {
    setPreferences((prev) => {
      const exists = prev.followedOrganisers.includes(organiserId)
      return {
        ...prev,
        followedOrganisers: exists
          ? prev.followedOrganisers.filter((id) => id !== organiserId)
          : [...prev.followedOrganisers, organiserId]
      }
    })
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')

    try {
      await Promise.all([
        apiClient.put('/api/participants/me', {
          firstName: profile.firstName,
          lastName: profile.lastName,
          contactNumber: profile.contactNumber,
          organisation: profile.organisation
        }),
        apiClient.put('/api/participants/preferences', {
          interests: preferences.interests,
          followedOrganisers: preferences.followedOrganisers
        })
      ])
      setMessage('Profile updated.')
      if (isOnboarding) {
        setSearchParams({})
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    try {
      await apiClient.post('/api/participants/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      })
      setMessage('Password updated.')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to update password.')
    }
  }

  if (loading) {
    return <div className="lb-page">Loading profile...</div>
  }

  return (
    <div className="lb-page">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Profile</h1>
          <p className="text-sm text-base-content/70">Update your details and preferences.</p>
        </div>

        {isOnboarding && !error && !message && (
          <div className="alert alert-info">
            <span>Please select your areas of interest to personalize event recommendations.</span>
          </div>
        )}
        {error && <div className="alert alert-error"><span>{error}</span></div>}
        {message && <div className="alert alert-success"><span>{message}</span></div>}

        <form className="card bg-base-100 shadow" onSubmit={handleSave}>
          <div className="card-body space-y-4">
            <h2 className="text-lg font-semibold">Personal details</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="form-control">
                <label className="label" htmlFor="firstName">
                  <span className="label-text">First name</span>
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  className="input input-bordered"
                  value={profile.firstName}
                  onChange={handleProfileChange}
                  required
                />
              </div>
              <div className="form-control">
                <label className="label" htmlFor="lastName">
                  <span className="label-text">Last name</span>
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  className="input input-bordered"
                  value={profile.lastName}
                  onChange={handleProfileChange}
                  required
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
                  value={profile.contactNumber}
                  onChange={handleProfileChange}
                  required
                />
              </div>
              <div className="form-control">
                <label className="label" htmlFor="organisation">
                  <span className="label-text">College/Organization</span>
                </label>
                <input
                  id="organisation"
                  name="organisation"
                  className="input input-bordered"
                  value={profile.organisation}
                  onChange={handleProfileChange}
                />
              </div>
              <div className="form-control">
                <label className="label" htmlFor="email">
                  <span className="label-text">Email</span>
                </label>
                <input id="email" className="input input-bordered" value={profile.email} disabled />
                <span className="text-xs text-base-content/60 mt-1">Read-only</span>
              </div>
              <div className="form-control">
                <label className="label" htmlFor="participantType">
                  <span className="label-text">Participant type</span>
                </label>
                <input id="participantType" className="input input-bordered" value={profile.participantType} disabled />
                <span className="text-xs text-base-content/60 mt-1">Read-only</span>
              </div>
            </div>

            <div className="divider" />
            <h2 className="text-lg font-semibold">Preferences</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">Areas of interest</p>
                <div className="flex flex-wrap gap-3 mt-2">
                  {interestOptions.map((interest) => {
                    const interestId = `interest-${interest}`
                    return (
                      <div key={interest} className="form-control">
                        <label className="label" htmlFor={interestId}>
                          <span className="label-text capitalize">{interest}</span>
                        </label>
                        <input
                          id={interestId}
                          type="checkbox"
                          className="checkbox checkbox-sm"
                          checked={preferences.interests.includes(interest)}
                          onChange={() => toggleInterest(interest)}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">Followed clubs</p>
                <div className="grid gap-3 md:grid-cols-2 mt-2">
                  {organisers.map((organiser) => {
                    const organiserId = `follow-${organiser._id}`
                    return (
                      <div key={organiser._id} className="form-control">
                        <label className="label" htmlFor={organiserId}>
                          <span className="label-text">{organiser.name}</span>
                        </label>
                        <input
                          id={organiserId}
                          type="checkbox"
                          className="checkbox checkbox-sm"
                          checked={preferences.followedOrganisers.includes(organiser._id)}
                          onChange={() => toggleFollowed(organiser._id)}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button className="btn btn-success" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </form>

        <form className="card bg-base-100 shadow" onSubmit={handlePasswordChange}>
          <div className="card-body space-y-4">
            <h2 className="text-lg font-semibold">Security</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="form-control">
                <label className="label" htmlFor="currentPassword">
                  <span className="label-text">Current password</span>
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  className="input input-bordered"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                  required
                />
              </div>
              <div className="form-control">
                <label className="label" htmlFor="newPassword">
                  <span className="label-text">New password</span>
                </label>
                <input
                  id="newPassword"
                  type="password"
                  className="input input-bordered"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                  minLength={6}
                  required
                />
              </div>
              <div className="form-control">
                <label className="label" htmlFor="confirmPassword">
                  <span className="label-text">Confirm new password</span>
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="input input-bordered"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  minLength={6}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button className="btn btn-outline" type="submit">Update password</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Profile
