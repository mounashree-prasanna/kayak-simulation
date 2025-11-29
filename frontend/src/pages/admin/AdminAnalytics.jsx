import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '../../store/hooks'
import './AdminDashboard.css'

const AdminAnalytics = () => {
  const navigate = useNavigate()
  const { isAuthenticated, role } = useAppSelector(state => state.auth)

  useEffect(() => {
    if (!isAuthenticated || role !== 'admin') {
      navigate('/login')
    }
  }, [isAuthenticated, role, navigate])

  return (
    <div className="admin-dashboard">
      <div className="admin-container">
        <div className="admin-header">
          <h1>Analytics & Reports</h1>
          <button onClick={() => navigate('/admin/dashboard')} className="btn-back">← Back to Admin Dashboard</button>
        </div>
        <div className="admin-content">
          <p>Analytics and reports functionality coming soon...</p>
          <p>This page will display charts, reports, and analytics including:</p>
          <ul>
            <li>Top 10 properties with revenue per year</li>
            <li>City-wise revenue per year</li>
            <li>Top 10 hosts/providers with maximum properties sold</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default AdminAnalytics

