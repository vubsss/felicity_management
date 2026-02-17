import React from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navLinkClass = ({ isActive }) =>
  `lb-nav-link ${isActive ? 'lb-nav-link--active' : ''}`

const OrganiserNavbar = () => {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="lb-header">
      <div className="lb-header-inner">
        <Link className="lb-logo" to="/organiser">
          Felicity
        </Link>
        <nav className="lb-nav">
          <NavLink to="/organiser" className={navLinkClass} end>
            Dashboard
          </NavLink>
          <NavLink to="/organiser/events/new" className={navLinkClass}>
            Create Event
          </NavLink>
          <NavLink to="/organiser/ongoing" className={navLinkClass}>
            Ongoing Events
          </NavLink>
          <NavLink to="/organiser/profile" className={navLinkClass}>
            Profile
          </NavLink>
        </nav>
        <div className="lb-actions">
          <button className="lb-button" type="button" onClick={handleLogout}>
            Logout
          </button>
          {profile?.name && <span className="lb-user">Hi, {profile.name}</span>}
        </div>
      </div>
    </header>
  )
}

export default OrganiserNavbar
