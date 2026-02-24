import React from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import apiClient from '../api/client'

const navLinkClass = ({ isActive }) =>
  `lb-nav-link ${isActive ? 'lb-nav-link--active' : ''}`

const ParticipantNavbar = () => {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [unreadCount, setUnreadCount] = React.useState(0)

  React.useEffect(() => {
    let isMounted = true

    const loadUnreadCount = async () => {
      try {
        const response = await apiClient.get('/api/participants/notifications/unread-count')
        if (isMounted) {
          setUnreadCount(response.data.unreadCount || 0)
        }
      } catch {
        if (isMounted) {
          setUnreadCount(0)
        }
      }
    }

    const handleRefresh = () => {
      loadUnreadCount()
    }

    loadUnreadCount()
    const intervalId = window.setInterval(loadUnreadCount, 30000)
    window.addEventListener('forum-notifications-updated', handleRefresh)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
      window.removeEventListener('forum-notifications-updated', handleRefresh)
    }
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
    setMenuOpen(false)
  }

  const handleNavClick = () => setMenuOpen(false)

  return (
    <header className="lb-header">
      <div className="lb-header-inner">
        <Link className="lb-logo" to="/" onClick={() => setMenuOpen(false)}>
          Felicity
        </Link>
        <button
          className={`lb-menu-toggle ${menuOpen ? 'lb-menu-toggle--open' : ''}`}
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          <span className="lb-menu-icon" aria-hidden="true">
            <span className="lb-menu-line"></span>
            <span className="lb-menu-line"></span>
            <span className="lb-menu-line"></span>
          </span>
          <span className="sr-only">Toggle navigation</span>
        </button>
        <nav className={`lb-nav ${menuOpen ? 'lb-nav--open' : ''}`}>
          <NavLink to="/" className={navLinkClass} end onClick={handleNavClick}>
            Dashboard
          </NavLink>
          <NavLink to="/events" className={navLinkClass} onClick={handleNavClick}>
            Browse Events
          </NavLink>
          <NavLink to="/clubs" className={navLinkClass} onClick={handleNavClick}>
            Clubs/Organizers
          </NavLink>
          <NavLink to="/notifications" className={navLinkClass} onClick={handleNavClick}>
            Notifications {unreadCount > 0 && <span className="badge badge-error badge-xs">{unreadCount}</span>}
          </NavLink>
          <NavLink to="/profile" className={navLinkClass} onClick={handleNavClick}>
            Profile
          </NavLink>
        </nav>
        <div className={`lb-actions ${menuOpen ? 'lb-actions--open' : ''}`}>
          <button className="lb-button" type="button" onClick={handleLogout}>
            Logout
          </button>
          {profile?.firstName && (
            <span className="lb-user">Hi, {profile.firstName}</span>
          )}
        </div>
      </div>
    </header>
  )
}

export default ParticipantNavbar
