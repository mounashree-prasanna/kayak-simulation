import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAppSelector } from '../store/hooks'
import './Dashboard.css'

const Dashboard = () => {
  const { user, isAuthenticated, loading } = useAppSelector(state => state.auth)
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login')
    }
  }, [isAuthenticated, loading, navigate])

  if (loading) {
    return (
      <div className="dashboard">
        <div className="container">
          <div className="loading">Loading...</div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="dashboard">
      <div className="container">
        <h1>Welcome, {user?.first_name || user?.email}!</h1>
        
        <div className="dashboard-grid">
          <Link to="/my-bookings" className="dashboard-card">
            <div className="card-icon">📋</div>
            <h2>My Bookings</h2>
            <p>View and manage your bookings</p>
          </Link>

          <Link to="/flights" className="dashboard-card">
            <div className="card-icon">✈️</div>
            <h2>Search Flights</h2>
            <p>Find the best flight deals</p>
          </Link>

          <Link to="/hotels" className="dashboard-card">
            <div className="card-icon">🏨</div>
            <h2>Search Hotels</h2>
            <p>Book your perfect stay</p>
          </Link>

          <Link to="/cars" className="dashboard-card">
            <div className="card-icon">🚗</div>
            <h2>Rent a Car</h2>
            <p>Find car rental deals</p>
          </Link>
        </div>

        <div className="user-info">
          <h2>Account Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Name:</span>
              <span className="info-value">
                {user?.first_name} {user?.last_name}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Email:</span>
              <span className="info-value">{user?.email}</span>
            </div>
            {user?.phone_number && (
              <div className="info-item">
                <span className="info-label">Phone:</span>
                <span className="info-value">{user.phone_number}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

