import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'
import { formatDateTime } from '../utils/dateFormat'

const Notifications = () => {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [markingRead, setMarkingRead] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const response = await apiClient.get('/api/participants/notifications')
        setNotifications(response.data.notifications || [])
        setMessage('')
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load notifications.')
      } finally {
        setLoading(false)
      }
    }

    loadNotifications()
  }, [])

  const handleMarkAllRead = async () => {
    setMarkingRead(true)
    setError('')
    setMessage('')
    try {
      await apiClient.post('/api/participants/notifications/mark-read')
      setNotifications([])
      setMessage('All announcements marked as read.')
      window.dispatchEvent(new window.Event('forum-notifications-updated'))
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to mark notifications as read.')
    } finally {
      setMarkingRead(false)
    }
  }

  return (
    <div className="lb-page">
      <div className="max-w-5xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-sm text-base-content/70">Unread announcements from your registered events.</p>
        </div>

        {message && (
          <div className="alert alert-success">
            <span>{message}</span>
          </div>
        )}

        {loading && (
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <p className="text-sm text-base-content/70">Loading notifications...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && notifications.length === 0 && (
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <p className="text-sm text-base-content/70">No unread announcements.</p>
            </div>
          </div>
        )}

        {!loading && !error && notifications.length > 0 && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button
                className="btn btn-sm btn-outline"
                type="button"
                onClick={handleMarkAllRead}
                disabled={markingRead}
              >
                {markingRead ? 'Marking...' : 'Mark all as read'}
              </button>
            </div>
            {notifications.map((item) => (
              <div key={item.id} className="card bg-base-100 shadow border border-base-200">
                <div className="card-body space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold">{item.eventName}</div>
                    <div className="text-xs text-base-content/60">{formatDateTime(item.createdAt)}</div>
                  </div>
                  <div className="badge badge-info badge-sm w-fit">Announcement</div>
                  <p className="text-sm whitespace-pre-wrap">{item.content}</p>
                  <div className="text-xs text-base-content/60">By {item.authorName}</div>
                  {item.eventId && (
                    <div>
                      <Link className="link link-primary text-sm" to={`/events/${item.eventId}`}>
                        View Event
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Notifications
