import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '../../store/hooks'
import './AdminDashboard.css'

const AdminDashboard = () => {
  const navigate = useNavigate()
  const { admin, isAuthenticated, role, userRole } = useAppSelector(state => state.auth)

  useEffect(() => {
    if (!isAuthenticated || role !== 'admin') {
      navigate('/login')
    }
  }, [isAuthenticated, role, navigate])

  if (!isAuthenticated || role !== 'admin' || !admin) {
    return null
  }

  const canAccess = (permission) => {
    if (userRole === 'Super Admin') return true
    const permissions = {
      'Listing Admin': ['manage_listings'],
      'User Admin': ['manage_users'],
      'Billing Admin': ['view_billing'],
      'Analytics Admin': ['view_analytics']
    }
    return permissions[userRole]?.includes(permission) || false
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-container">
        <div className="admin-header">
          <h1>Welcome, {admin.first_name}!</h1>
          <div className="admin-info">
            <p className="admin-role">{admin.role}</p>
          </div>
        </div>

        <div className="admin-cards">
          {canAccess('manage_listings') && (
            <div className="admin-card" onClick={() => navigate('/admin/listings')}>
              <div className="card-icon">✈️</div>
              <h3>Manage Listings</h3>
              <p>Add, edit, or delete flights, hotels, and cars</p>
            </div>
          )}

          {canAccess('manage_users') && (
            <div className="admin-card" onClick={() => navigate('/admin/users')}>
              <div className="card-icon">👥</div>
              <h3>User Management</h3>
              <p>View and modify user accounts</p>
            </div>
          )}

          {canAccess('view_billing') && (
            <div className="admin-card" onClick={() => navigate('/admin/billing')}>
              <div className="card-icon">💰</div>
              <h3>Billing & Payments</h3>
              <p>Search and view billing data</p>
            </div>
          )}

          {canAccess('view_analytics') && (
            <div className="admin-card" onClick={() => navigate('/admin/analytics')}>
              <div className="card-icon">📊</div>
              <h3>Analytics & Reports</h3>
              <p>View charts, reports, and analytics</p>
            </div>
          )}

          {userRole === 'Super Admin' && (
            <div className="admin-card" onClick={() => navigate('/admin/admins')}>
              <div className="card-icon">🔐</div>
              <h3>Admin Management</h3>
              <p>Create and manage admin accounts</p>
            </div>
          )}
        </div>

        <div className="admin-details">
          <div className="details-header">
            <h2>Account Information</h2>
          </div>
          <div className="details-form">
            <div className="form-row">
              <div className="form-group">
                <label>ADMIN ID:</label>
                <input type="text" value={admin.admin_id || 'N/A'} readOnly />
              </div>
              <div className="form-group">
                <label>FIRST NAME:</label>
                <input type="text" value={admin.first_name || 'N/A'} readOnly />
              </div>
              <div className="form-group">
                <label>LAST NAME:</label>
                <input type="text" value={admin.last_name || 'N/A'} readOnly />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>EMAIL:</label>
                <input type="text" value={admin.email || 'N/A'} readOnly />
              </div>
              <div className="form-group">
                <label>PHONE NUMBER:</label>
                <input type="text" value={admin.phone_number || 'N/A'} readOnly />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group full-width">
                <label>STREET ADDRESS:</label>
                <input type="text" value={admin.address?.street || 'N/A'} readOnly />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>CITY:</label>
                <input type="text" value={admin.address?.city || 'N/A'} readOnly />
              </div>
              <div className="form-group">
                <label>STATE:</label>
                <input type="text" value={admin.address?.state || 'N/A'} readOnly />
              </div>
              <div className="form-group">
                <label>ZIP CODE:</label>
                <input type="text" value={admin.address?.zip || 'N/A'} readOnly />
              </div>
            </div>
            {admin.reports_and_analytics_managed && admin.reports_and_analytics_managed.length > 0 && (
              <div className="form-row">
                <div className="form-group full-width">
                  <label>REPORTS & ANALYTICS MANAGED:</label>
                  <div className="tags">
                    {admin.reports_and_analytics_managed.map((report, idx) => (
                      <span key={idx} className="tag">{report}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard

