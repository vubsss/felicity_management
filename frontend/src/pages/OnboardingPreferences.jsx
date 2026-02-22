import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../api/client'
import { useAuth } from '../context/AuthContext'

const interestOptions = ['tech', 'sports', 'design', 'dance', 'music', 'quiz', 'concert', 'gaming', 'misc']

const OnboardingPreferences = () => {
  const [interests, setInterests] = useState([])
  const [followedOrganisers, setFollowedOrganisers] = useState([])
  const [organisers, setOrganisers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { refreshAuth } = useAuth()

  useEffect(() => {
    const load = async () => {
      try {
        const [prefsResponse, organisersResponse] = await Promise.all([
          apiClient.get('/api/participants/preferences'),
          apiClient.get('/api/organisers/public')
        ])

        setInterests(prefsResponse.data?.interests || [])
        setFollowedOrganisers(prefsResponse.data?.followedOrganisers || [])
        setOrganisers(organisersResponse.data?.organisers || [])
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load onboarding preferences.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const toggleInterest = (interest) => {
    setInterests((prev) => (
      prev.includes(interest)
        ? prev.filter((item) => item !== interest)
        : [...prev, interest]
    ))
  }

  const toggleFollowed = (organiserId) => {
    setFollowedOrganisers((prev) => (
      prev.includes(organiserId)
        ? prev.filter((item) => item !== organiserId)
        : [...prev, organiserId]
    ))
  }

  const handleContinue = async (event) => {
    event.preventDefault()
    setError('')

    if (!interests.length) {
      setError('Select at least one interest to continue.')
      return
    }

    setSaving(true)
    try {
      await apiClient.put('/api/participants/preferences', {
        interests,
        followedOrganisers
      })
      await refreshAuth()
      navigate('/', { replace: true })
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to save preferences.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="lb-page">Loading onboarding...</div>
  }

  return (
    <div className="lb-page">
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">Welcome to Felicity</h1>
          <p className="text-sm text-base-content/70">Set your preferences once to personalize your experience.</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}

        <form className="card bg-base-100 shadow" onSubmit={handleContinue}>
          <div className="card-body space-y-4">
            <div>
              <p className="text-sm font-medium">Select your interests *</p>
              <div className="flex flex-wrap gap-3 mt-2">
                {interestOptions.map((interest) => {
                  const interestId = `onboarding-interest-${interest}`
                  return (
                    <div key={interest} className="form-control">
                      <label className="label" htmlFor={interestId}>
                        <span className="label-text capitalize">{interest}</span>
                      </label>
                      <input
                        id={interestId}
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={interests.includes(interest)}
                        onChange={() => toggleInterest(interest)}
                      />
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium">Follow clubs (optional)</p>
              <div className="grid gap-3 md:grid-cols-2 mt-2">
                {organisers.map((organiser) => {
                  const organiserId = `onboarding-follow-${organiser._id}`
                  return (
                    <div key={organiser._id} className="form-control">
                      <label className="label" htmlFor={organiserId}>
                        <span className="label-text">{organiser.name}</span>
                      </label>
                      <input
                        id={organiserId}
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={followedOrganisers.includes(organiser._id)}
                        onChange={() => toggleFollowed(organiser._id)}
                      />
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <button className="btn btn-success" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default OnboardingPreferences
