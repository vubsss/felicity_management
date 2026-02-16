import React from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navLinkClass = ({ isActive }) =>
  `btn btn-ghost btn-sm ${isActive ? 'btn-active' : ''}`

const OrganiserNavbar = () => {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="navbar bg-base-100 shadow">
      <div className="flex-1">
        <Link className="btn btn-ghost text-lg" to="/organiser">
          Felicity
        </Link>
      </div>
      <div className="flex-none gap-2">
        <NavLink to="/organiser" className={navLinkClass}>
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
        <button className="btn btn-outline btn-sm" type="button" onClick={handleLogout}>
          Logout
        </button>
        {profile?.name && (
          <span className="hidden md:inline text-sm text-base-content/60">
            Hi, {profile.name}
          </span>
        )}
      </div>
    </div>
  )
}

export default OrganiserNavbar
