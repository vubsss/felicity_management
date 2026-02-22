import React from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navLinkClass = ({ isActive }) =>
  `lb-nav-link ${isActive ? 'lb-nav-link--active' : ''}`

const OrganiserNavbar = () => {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = React.useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
    setMenuOpen(false)
  }

  const handleNavClick = () => setMenuOpen(false)

  return (
    <header className="lb-header">
      <div className="lb-header-inner">
        <Link className="lb-logo" to="/organiser" onClick={() => setMenuOpen(false)}>
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
          <NavLink to="/organiser" className={navLinkClass} end onClick={handleNavClick}>
            Dashboard
          </NavLink>
          <NavLink to="/organiser/events/new" className={navLinkClass} onClick={handleNavClick}>
            Create Event
          </NavLink>
          <NavLink to="/organiser/ongoing" className={navLinkClass} onClick={handleNavClick}>
            Ongoing Events
          </NavLink>
          <NavLink to="/organiser/profile" className={navLinkClass} onClick={handleNavClick}>
            Profile
          </NavLink>
        </nav>
        <div className={`lb-actions ${menuOpen ? 'lb-actions--open' : ''}`}>
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
