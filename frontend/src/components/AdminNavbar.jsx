import React from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navLinkClass = ({ isActive }) =>
  `lb-nav-link ${isActive ? 'lb-nav-link--active' : ''}`

const AdminNavbar = () => {
  const { logout } = useAuth()
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
        <Link className="lb-logo" to="/admin" onClick={() => setMenuOpen(false)}>
          Felicity Admin
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
          <NavLink to="/admin" className={navLinkClass} end onClick={handleNavClick}>
            Dashboard
          </NavLink>
          <NavLink to="/admin/organisers" className={navLinkClass} onClick={handleNavClick}>
            Manage Clubs/Organizers
          </NavLink>
          <NavLink to="/admin/password-resets" className={navLinkClass} onClick={handleNavClick}>
            Password Reset Requests
          </NavLink>
        </nav>
        <div className={`lb-actions ${menuOpen ? 'lb-actions--open' : ''}`}>
          <button className="lb-button" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}

export default AdminNavbar
