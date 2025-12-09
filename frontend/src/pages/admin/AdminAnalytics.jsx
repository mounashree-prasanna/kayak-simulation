import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '../../store/hooks'
import api from '../../services/api'
import { addNotification } from '../../store/slices/notificationSlice'
import './AdminDashboard.css'

const AdminAnalytics = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { isAuthenticated, role, userRole } = useAppSelector(state => state.auth)
  const [topProperties, setTopProperties] = useState([])
  const [cityRevenue, setCityRevenue] = useState([])
  const [topProviders, setTopProviders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [year, setYear] = useState(2025)
  const [month, setMonth] = useState('') 

  useEffect(() => {
    if (!isAuthenticated || role !== 'admin') {
      navigate('/login')
    } else if (userRole !== 'Super Admin' && userRole !== 'Analytics Admin') {
      navigate('/admin/dashboard')
    }
  }, [isAuthenticated, role, userRole, navigate])

  useEffect(() => {
    if (isAuthenticated && role === 'admin' && (userRole === 'Super Admin' || userRole === 'Analytics Admin')) {
      fetchAnalytics()
    }
  }, [year, month, isAuthenticated, role, userRole])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch top properties
      const topPropsResponse = await api.get('/analytics/top-properties', { params: { year } })
      if (topPropsResponse.data.success) {
        setTopProperties(topPropsResponse.data.data || [])
      }
      
      // Fetch city revenue
      const cityResponse = await api.get('/analytics/city-revenue', { params: { year } })
      if (cityResponse.data.success) {
        setCityRevenue(cityResponse.data.data || [])
      }
      
      // Fetch top providers
      const providerParams = { year }
      if (month) providerParams.month = month
      const providersResponse = await api.get('/analytics/top-providers', { params: providerParams })
      if (providersResponse.data.success) {
        setTopProviders(providersResponse.data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
      setError(err.response?.data?.error || 'Failed to fetch analytics')
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: err.response?.data?.error || 'Failed to fetch analytics',
        severity: 'error'
      }))
    } finally {
      setLoading(false)
    }
  }

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
            <h1>Analytics & Reports</h1>
            <button onClick={() => navigate('/admin/dashboard')} className="btn-back">← Back to Admin Dashboard</button>
          </div>
          <div className="admin-content">
            <div className="error">Admin access required. You need Super Admin or Analytics Admin role to access this page.</div>
          </div>
        </div>
      </div>
    )
  }

  const maxRevenue = Math.max(...cityRevenue.map(c => c.total_revenue || 0), 1)

  return (
    <div className="admin-dashboard">
      <div className="admin-container">
        <div className="admin-header">
          <h1>Analytics & Reports</h1>
          <button onClick={() => navigate('/admin/dashboard')} className="btn-back">← Back to Admin Dashboard</button>
        </div>

        <div className="admin-content">
          <div className="analytics-controls">
            <div className="control-group">
              <label>Year:</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                min="2020"
                max={new Date().getFullYear() + 1}
                className="control-input"
              />
            </div>
            <div className="control-group">
              <label>Month (for Top Providers):</label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="control-input"
              >
                <option value="">All months (yearly)</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                  <option key={m} value={m}>
                    {new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div className="control-group control-group-end">
              <button onClick={() => navigate('/admin/providers')} className="btn-view-provider">See all providers</button>
            </div>
          </div>

          {loading ? (
            <div className="loading">Loading analytics...</div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : (
            <>
              <div className="analytics-section">
                <h2>Top 10 Properties by Revenue ({year})</h2>
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Property Type</th>
                        <th>Property ID</th>
                        <th>Total Revenue</th>
                        <th>Booking Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProperties.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="no-data">No data available</td>
                        </tr>
                      ) : (
                        topProperties.map((prop, idx) => (
                          <tr key={idx}>
                            <td>{prop.property_type || 'N/A'}</td>
                            <td>{prop.property_id || 'N/A'}</td>
                            <td>${(prop.total_revenue || 0).toFixed(2)}</td>
                            <td>{prop.booking_count || 0}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="analytics-section">
                <h2>City-wise Revenue ({year})</h2>
                <div className="chart-container">
                  {cityRevenue.length === 0 ? (
                    <div className="no-data">No data available</div>
                  ) : (
                    <div className="bar-chart">
                      {cityRevenue.slice(0, 10).map((city, idx) => (
                        <div key={idx} className="bar-item">
                          <div className="bar-label">{city.city}</div>
                          <div className="bar-wrapper">
                            <div
                              className="bar"
                              style={{ width: `${((city.total_revenue || 0) / maxRevenue) * 100}%` }}
                            >
                              <span className="bar-value">${(city.total_revenue || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="analytics-section">
                <div className="section-header-row">
                  <h2>Top 10 Providers ({month ? `Month ${month} ${year}` : `Year ${year}`})</h2>
                </div>
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Provider Name</th>
                        <th>Total Revenue</th>
                        <th>Properties Sold</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProviders.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="no-data">No data available</td>
                        </tr>
                      ) : (
                        topProviders.map((provider, idx) => (
                          <tr key={idx}>
                            <td>{provider.provider_name || 'N/A'}</td>
                            <td>${(provider.total_revenue || 0).toFixed(2)}</td>
                            <td>{provider.properties_sold || 0}</td>
                            <td>
                              <button 
                                onClick={() => navigate(`/admin/providers/${provider.provider_id || encodeURIComponent(provider.provider_name)}`)}
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminAnalytics
