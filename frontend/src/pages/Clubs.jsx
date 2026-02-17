import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'

const Clubs = () => {
  const [organisers, setOrganisers] = useState([])
  const [followed, setFollowed] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [orgResponse, prefResponse] = await Promise.all([
          apiClient.get('/api/organisers/public'),
          apiClient.get('/api/participants/preferences')
        ])
        setOrganisers(orgResponse.data.organisers || [])
        setFollowed(prefResponse.data.followedOrganisers || [])
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load clubs.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const followedSet = useMemo(() => new Set(followed.map(String)), [followed])

  const toggleFollow = async (organiserId, shouldFollow) => {
    try {
      if (shouldFollow) {
        const response = await apiClient.post(`/api/participants/follow/${organiserId}`)
        setFollowed(response.data.followedOrganisers || [])
      } else {
        const response = await apiClient.delete(`/api/participants/follow/${organiserId}`)
        setFollowed(response.data.followedOrganisers || [])
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to update follows.')
    }
  }

  return (
    <div className="lb-page">
      <div className="max-w-5xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Clubs and organizers</h1>
          <p className="text-sm text-base-content/70">Follow organizers to personalize your event feed.</p>
        </div>

        {loading && <p>Loading clubs...</p>}
        {error && <div className="alert alert-error"><span>{error}</span></div>}

        {!loading && !error && (
          <div className="grid gap-4 md:grid-cols-2">
            {organisers.map((organiser) => {
              const isFollowed = followedSet.has(String(organiser._id))
              return (
                <div key={organiser._id} className="card bg-base-100 shadow">
                  <div className="card-body space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link className="card-title text-base" to={`/clubs/${organiser._id}`}>
                          {organiser.name}
                        </Link>
                        <p className="text-xs text-base-content/60">{organiser.category}</p>
                      </div>
                      <button
                        className={`btn btn-sm ${isFollowed ? 'btn-outline' : 'btn-success'}`}
                        type="button"
                        onClick={() => toggleFollow(organiser._id, !isFollowed)}
                      >
                        {isFollowed ? 'Unfollow' : 'Follow'}
                      </button>
                    </div>
                    <p className="text-sm text-base-content/70">{organiser.description || 'No description yet.'}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!loading && !organisers.length && !error && (
          <p className="text-sm text-base-content/70">No organizers available.</p>
        )}
      </div>
    </div>
  )
}

export default Clubs
