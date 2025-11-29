import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '../../store/hooks'
import './AdminDashboard.css'

const AdminBilling = () => {
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
          <h1>Billing & Payments</h1>
          <button onClick={() => navigate('/admin/dashboard')} className="btn-back">← Back to Admin Dashboard</button>
        </div>
        <div className="admin-content">
          <p>Billing management functionality coming soon...</p>
          <p>This page will allow you to search and view billing data by date or month.</p>
        </div>
      </div>
    </div>
  )
}

export default AdminBilling

