import React from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navLinkClass = ({ isActive }) =>
  `lb-nav-link ${isActive ? 'lb-nav-link--active' : ''}`

const AdminNavbar = () => {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="lb-header">
      <div className="lb-header-inner">
        <Link className="lb-logo" to="/admin">
          Felicity Admin
        </Link>
        <nav className="lb-nav">
          <NavLink to="/admin" className={navLinkClass} end>
            Dashboard
          </NavLink>
          <NavLink to="/admin/organisers" className={navLinkClass}>
            Manage Clubs/Organizers
          </NavLink>
          <NavLink to="/admin/password-resets" className={navLinkClass}>
            Password Reset Requests
          </NavLink>
        </nav>
        <div className="lb-actions">
          <button className="lb-button" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}

export default AdminNavbar
