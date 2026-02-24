import React, { useEffect, useMemo, useState } from 'react'
import apiClient from '../api/client'
import { formatDateTime } from '../utils/dateFormat'
import { createForumSocket } from '../utils/forumSocket'
import { useAuth } from '../context/AuthContext'

const EventForum = ({ eventId }) => {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [permissions, setPermissions] = useState({
    canModerate: false,
    canAnnounce: false,
    canParticipate: false
  })
  const [allowedReactions, setAllowedReactions] = useState(['👍', '❤️'])
  const [inputText, setInputText] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [announcementMode, setAnnouncementMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [systemNotification, setSystemNotification] = useState('')
  const [socketError, setSocketError] = useState('')

  const notificationTimeoutRef = React.useRef(null)

  const childrenByParent = useMemo(() => {
    const grouped = {}
    messages.forEach((message) => {
      const key = message.parentMessageId || 'root'
      grouped[key] = grouped[key] || []
      grouped[key].push(message)
    })
    return grouped
  }, [messages])

  const replyTarget = useMemo(() => {
    if (!replyTo) return null
    return messages.find((message) => message.id === replyTo) || null
  }, [replyTo, messages])

  const applyMessageUpsert = (nextMessage) => {
    setMessages((prev) => {
      const exists = prev.some((message) => message.id === nextMessage.id)
      const merged = exists
        ? prev.map((message) => (message.id === nextMessage.id ? nextMessage : message))
        : [...prev, nextMessage]

      return merged.sort((a, b) => {
        if (a.isPinned !== b.isPinned) {
          return a.isPinned ? -1 : 1
        }
        return new Date(a.createdAt) - new Date(b.createdAt)
      })
    })
  }

  const loadForum = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await apiClient.get(`/api/events/${eventId}/forum/messages`)
      setMessages(response.data.messages || [])
      setPermissions(response.data.permissions || {
        canModerate: false,
        canAnnounce: false,
        canParticipate: false
      })
      setAllowedReactions(response.data.allowedReactions || ['👍', '❤️'])
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load discussion forum.')
    } finally {
      setLoading(false)
    }
  }

  const showSystemNotification = (messageText) => {
    setSystemNotification(messageText)
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current)
    }
    notificationTimeoutRef.current = setTimeout(() => {
      setSystemNotification('')
      notificationTimeoutRef.current = null
    }, 7000)

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (window.Notification.permission === 'granted') {
        const browserNotification = new window.Notification('Felicity Forum', { body: messageText })
        browserNotification.onclick = () => window.focus()
      } else if (window.Notification.permission === 'default') {
        window.Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            const browserNotification = new window.Notification('Felicity Forum', { body: messageText })
            browserNotification.onclick = () => window.focus()
          }
        }).catch(() => {})
      }
    }
  }

  useEffect(() => {
    loadForum()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  useEffect(() => {
    const token = localStorage.getItem('token')
    const socket = createForumSocket(token)
    if (!socket) return undefined

    socket.on('connect_error', () => {
      setSocketError('Live forum updates are temporarily unavailable.')
    })

    socket.on('connect', () => {
      setSocketError('')
      socket.emit('forum:join', { eventId })
    })

    socket.on('forum:event', (incoming) => {
      if (!incoming?.payload?.message) return
      const incomingMessage = incoming.payload.message
      applyMessageUpsert(incomingMessage)

      if (
        incoming.type === 'message_created' &&
        incomingMessage.isAnnouncement &&
        incomingMessage.authorUserId !== user?._id
      ) {
        showSystemNotification(`New announcement from ${incomingMessage.authorName}`)
        window.dispatchEvent(new window.Event('forum-notifications-updated'))
      }
    })

    socket.on('forum:error', (payload) => {
      setSocketError(payload?.message || 'Live forum updates are unavailable.')
    })

    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current)
      }
      socket.emit('forum:leave', { eventId })
      socket.disconnect()
    }
  }, [eventId, user?._id])

  const submitMessage = async () => {
    if (!inputText.trim()) return
    setSubmitLoading(true)
    setError('')

    try {
      const response = await apiClient.post(`/api/events/${eventId}/forum/messages`, {
        content: inputText.trim(),
        parentMessageId: replyTo || undefined,
        isAnnouncement: announcementMode
      })

      applyMessageUpsert(response.data.message)
      setInputText('')
      setReplyTo(null)
      setAnnouncementMode(false)
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to post message.')
    } finally {
      setSubmitLoading(false)
    }
  }

  const togglePin = async (messageId) => {
    try {
      const response = await apiClient.post(`/api/events/${eventId}/forum/messages/${messageId}/pin`)
      applyMessageUpsert(response.data.message)
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to update pin state.')
    }
  }

  const deleteMessage = async (messageId) => {
    try {
      const response = await apiClient.delete(`/api/events/${eventId}/forum/messages/${messageId}`)
      applyMessageUpsert(response.data.message)
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to delete message.')
    }
  }

  const reactToMessage = async (messageId, emoji) => {
    try {
      const response = await apiClient.post(`/api/events/${eventId}/forum/messages/${messageId}/react`, { emoji })
      applyMessageUpsert(response.data.message)
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to react to message.')
    }
  }

  const renderMessageTree = (parentId = null, depth = 0) => {
    const key = parentId || 'root'
    const list = childrenByParent[key] || []

    return list.map((message) => (
      <div key={message.id} className="space-y-2" style={{ marginLeft: `${Math.min(depth * 18, 54)}px` }}>
        <div className={`border rounded-lg p-3 ${message.isAnnouncement ? 'border-info bg-info/5' : 'border-base-200 bg-base-100'}`}>
          <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/70">
            <span className="font-semibold text-base-content">{message.authorName}</span>
            <span className="badge badge-ghost badge-xs">{message.authorRole}</span>
            {message.isPinned && <span className="badge badge-warning badge-xs">Pinned</span>}
            {message.isAnnouncement && <span className="badge badge-info badge-xs">Announcement</span>}
            <span>{formatDateTime(message.createdAt)}</span>
          </div>

          <p className={`mt-2 text-sm whitespace-pre-wrap ${message.isDeleted ? 'italic text-base-content/50' : ''}`}>
            {message.content}
          </p>

          {!message.isDeleted && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {permissions.canParticipate && (
                <button type="button" className="btn btn-ghost btn-xs" onClick={() => setReplyTo(message.id)}>
                  Reply
                </button>
              )}

              {permissions.canModerate && (
                <>
                  <button type="button" className="btn btn-ghost btn-xs" onClick={() => togglePin(message.id)}>
                    {message.isPinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button type="button" className="btn btn-ghost btn-xs text-error" onClick={() => deleteMessage(message.id)}>
                    Delete
                  </button>
                </>
              )}

              {permissions.canParticipate && allowedReactions.map((emoji) => {
                const reaction = (message.reactions || []).find((item) => item.emoji === emoji)
                return (
                  <button
                    key={`${message.id}-${emoji}`}
                    type="button"
                    className={`btn btn-xs ${reaction?.reacted ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => reactToMessage(message.id, emoji)}
                  >
                    {emoji} {reaction?.count || 0}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {renderMessageTree(message.id, depth + 1)}
      </div>
    ))
  }

  if (loading) {
    return (
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <p className="text-sm text-base-content/70">Loading forum...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-lg">Discussion Forum</h2>
        </div>

        {systemNotification && <div className="alert alert-info"><span>{systemNotification}</span></div>}
        {socketError && <div className="alert alert-warning"><span>{socketError}</span></div>}
        {error && <div className="alert alert-error"><span>{error}</span></div>}

        {permissions.canParticipate ? (
          <div className="space-y-3 border border-base-200 rounded-lg p-3">
            {replyTarget && (
              <div className="text-xs text-base-content/70">
                Replying to <span className="font-semibold">{replyTarget.authorName}</span>
                <button type="button" className="link link-primary ml-2" onClick={() => setReplyTo(null)}>
                  Cancel
                </button>
              </div>
            )}
            <textarea
              className="textarea textarea-bordered w-full"
              rows={3}
              placeholder="Post a message, ask a question, or reply..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              {permissions.canAnnounce ? (
                <label className="label cursor-pointer gap-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={announcementMode}
                    onChange={(e) => setAnnouncementMode(e.target.checked)}
                  />
                  <span className="label-text">Post as announcement</span>
                </label>
              ) : <span />}
              <button className="btn btn-success btn-sm" type="button" disabled={submitLoading || !inputText.trim()} onClick={submitMessage}>
                {submitLoading ? 'Posting...' : 'Post Message'}
              </button>
            </div>
          </div>
        ) : (
          <div className="alert">
            <span>Register for this event to post and react in the forum.</span>
          </div>
        )}

        <div className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-base-content/70">No messages yet. Start the conversation.</p>
          ) : (
            renderMessageTree()
          )}
        </div>
      </div>
    </div>
  )
}

export default EventForum
