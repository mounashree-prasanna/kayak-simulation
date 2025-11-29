import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '../../store/hooks'
import './AdminDashboard.css'

const AdminUserManagement = () => {
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
          <h1>User Management</h1>
          <button onClick={() => navigate('/admin/dashboard')} className="btn-back">← Back to Admin Dashboard</button>
        </div>
        <div className="admin-content">
          <p>User management functionality coming soon...</p>
          <p>This page will allow you to view and modify user accounts.</p>
        </div>
      </div>
    </div>
  )
}

export default AdminUserManagement

