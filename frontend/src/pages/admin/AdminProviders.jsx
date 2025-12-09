import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '../../store/hooks'
import api from '../../services/api'
import { addNotification } from '../../store/slices/notificationSlice'
import './AdminDashboard.css'

const AdminProviders = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { isAuthenticated, role, userRole } = useAppSelector(state => state.auth)
  const [providers, setProviders] = useState({ flight: [], hotel: [], car: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isAuthenticated || role !== 'admin') {
      navigate('/login')
    } else if (userRole !== 'Super Admin' && userRole !== 'Analytics Admin') {
      navigate('/admin/dashboard')
    }
  }, [isAuthenticated, role, userRole, navigate])

  useEffect(() => {
    if (isAuthenticated && role === 'admin' && (userRole === 'Super Admin' || userRole === 'Analytics Admin')) {
      fetchProviders()
    }
  }, [isAuthenticated, role, userRole])

  const fetchProviders = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/analytics/providers')
      if (response.data.success) {
        setProviders(response.data.data || { flight: [], hotel: [], car: [] })
      }
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to fetch providers'
      setError(message)
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message,
        severity: 'error'
      }))
    } finally {
      setLoading(false)
    }
  }

  const renderSection = (title, items) => (
    <div className="analytics-section">
      <div className="section-header-row">
        <h2>{title}</h2>
      </div>
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Provider ID</th>
              <th>Provider Name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(!items || items.length === 0) ? (
              <tr>
                <td colSpan="3" className="no-data">No providers available</td>
              </tr>
            ) : (
              items.map((p, idx) => (
                <tr key={`${p.provider_id}-${idx}`}>
                  <td>{p.provider_id}</td>
                  <td>{p.provider_name}</td>
                  <td>
                    <button
                      onClick={() => navigate(`/admin/providers/${encodeURIComponent(p.provider_id || p.provider_name)}`)}
                      className="btn-view-provider"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  if (!isAuthenticated || role !== 'admin') {
    return (
      <div className="admin-dashboard">
        <div className="admin-container">
          <div className="error">Please log in as an admin to access this page.</div>
        </div>
      </div>
    )
  }

  if (userRole !== 'Super Admin' && userRole !== 'Analytics Admin') {
    return (
      <div className="admin-dashboard">
        <div className="admin-container">
          <div className="admin-header">
            <h1>All Providers</h1>
            <button onClick={() => navigate('/admin/dashboard')} className="btn-back">← Back to Admin Dashboard</button>
          </div>
          <div className="admin-content">
            <div className="error">Admin access required. You need Super Admin or Analytics Admin role to access this page.</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-container">
        <div className="admin-header">
          <h1>All Providers</h1>
          <button onClick={() => navigate('/admin/analytics')} className="btn-back">← Back to Analytics</button>
        </div>

        <div className="admin-content">
          {loading ? (
            <div className="loading">Loading providers...</div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : (
            <>
              {renderSection('Flight Providers', providers.flight)}
              {renderSection('Hotel Providers', providers.hotel)}
              {renderSection('Car Providers', providers.car)}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminProviders

