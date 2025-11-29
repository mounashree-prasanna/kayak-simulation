import { Link, useNavigate } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '../../store/hooks'
import { logoutUser } from '../../store/slices/authSlice'
import './Layout.css'

const Layout = ({ children }) => {
  const { user, admin, isAuthenticated, role } = useAppSelector(state => state.auth)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await dispatch(logoutUser())
    navigate('/')
  }

  const isAdmin = role === 'admin'

  return (
    <div className="layout">
      <header className="header">
        <div className="header-container">
          <Link to={isAdmin ? "/admin/dashboard" : "/"} className="logo">
            <span className="logo-text">KAYAK</span>
          </Link>
          
          {!isAdmin && (
            <nav className="nav">
              <Link to="/flights" className="nav-link">Flights</Link>
              <Link to="/hotels" className="nav-link">Hotels</Link>
              <Link to="/cars" className="nav-link">Cars</Link>
            </nav>
          )}

          <div className="header-actions">
            {isAuthenticated ? (
              <>
                {isAdmin ? (
                  <>
                    <span className="user-name">
                      {admin?.first_name || admin?.email || 'Admin'}
                    </span>
                    <Link to="/admin/dashboard" className="nav-link">Dashboard</Link>
                    <button onClick={handleLogout} className="btn-logout">
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <span className="user-name">
                      {user?.first_name || user?.email || 'User'}
                    </span>
                    <Link to="/dashboard" className="nav-link">Dashboard</Link>
                    <Link to="/my-bookings" className="nav-link">My Bookings</Link>
                    <button onClick={handleLogout} className="btn-logout">
                      Logout
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <Link to="/login" className="btn-login">Login</Link>
                <Link to="/register" className="btn-register">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="main-content">
        {children}
      </main>

      <footer className="footer">
        <div className="footer-container">
          <div className="footer-section">
            <h4>About</h4>
            <Link to="/">About Us</Link>
            <Link to="/">Careers</Link>
            <Link to="/">Press</Link>
            <Link to="/">Blog</Link>
          </div>
          <div className="footer-section">
            <h4>Support</h4>
            <Link to="/">Help Center</Link>
            <Link to="/">Contact Us</Link>
            <Link to="/">Privacy Policy</Link>
            <Link to="/">Terms of Service</Link>
          </div>
          <div className="footer-section">
            <h4>Destinations</h4>
            <Link to="/">Popular Destinations</Link>
            <Link to="/">Travel Guides</Link>
            <Link to="/">Deals</Link>
          </div>
          <div className="footer-section">
            <h4>Connect</h4>
            <Link to="/">Facebook</Link>
            <Link to="/">Twitter</Link>
            <Link to="/">Instagram</Link>
            <Link to="/">LinkedIn</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2024 Kayak. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default Layout

