import React from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navLinkClass = ({ isActive }) =>
  `btn btn-ghost btn-sm ${isActive ? 'btn-active' : ''}`

const ParticipantNavbar = () => {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="navbar bg-base-100 shadow">
      <div className="flex-1">
        <Link className="btn btn-ghost text-lg" to="/">
          Felicity
        </Link>
      </div>
      <div className="flex-none gap-2">
        <NavLink to="/" className={navLinkClass}>
          Dashboard
        </NavLink>
        <NavLink to="/events" className={navLinkClass}>
          Browse Events
        </NavLink>
        <NavLink to="/clubs" className={navLinkClass}>
          Clubs/Organizers
        </NavLink>
        <NavLink to="/profile" className={navLinkClass}>
          Profile
        </NavLink>
        <button className="btn btn-outline btn-sm" type="button" onClick={handleLogout}>
          Logout
        </button>
        {profile?.firstName && (
          <span className="hidden md:inline text-sm text-base-content/60">
            Hi, {profile.firstName}
          </span>
        )}
      </div>
    </div>
  )
}

export default ParticipantNavbar
