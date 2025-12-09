import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '../../store/hooks'
import api from '../../services/api'
import { addNotification } from '../../store/slices/notificationSlice'
import './AdminDashboard.css'

const AdminBilling = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { isAuthenticated, role, userRole } = useAppSelector(state => state.auth)
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchType, setSearchType] = useState('date') // 'date' or 'month'
  const [searchDate, setSearchDate] = useState('')
  const [searchMonth, setSearchMonth] = useState('')
  // Default to 2025 since that's where the test data is
  const [searchYear, setSearchYear] = useState('2025')

  useEffect(() => {
    if (!isAuthenticated || role !== 'admin') {
      navigate('/login')
    } else if (userRole !== 'Super Admin' && userRole !== 'Billing Admin') {
      navigate('/admin/dashboard')
    }
  }, [isAuthenticated, role, userRole, navigate])

  const fetchBills = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = {}
      if (searchType === 'date' && searchDate) {
        params.date = searchDate
      } else if (searchType === 'month' && searchMonth && searchYear) {
        params.month = searchMonth
        params.year = searchYear
      }
      
      const response = await api.get('/analytics/bills', { params })
      if (response.data.success) {
        setBills(response.data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch bills:', err)
      setError(err.response?.data?.error || 'Failed to fetch bills')
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: err.response?.data?.error || 'Failed to fetch bills',
        severity: 'error'
      }))
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    fetchBills()
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

  if (userRole !== 'Super Admin' && userRole !== 'Billing Admin') {
    return (
      <div className="admin-dashboard">
        <div className="admin-container">
          <div className="admin-header">
            <h1>Billing & Payments</h1>
            <button onClick={() => navigate('/admin/dashboard')} className="btn-back">← Back to Admin Dashboard</button>
          </div>
          <div className="admin-content">
            <div className="error">Admin access required. You need Super Admin or Billing Admin role to access this page.</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-container">
        <div className="admin-header">
          <h1>Billing & Payments</h1>
          <button onClick={() => navigate('/admin/dashboard')} className="btn-back">← Back to Admin Dashboard</button>
        </div>

        <div className="admin-content">
          <div className="admin-search-section">
            <form onSubmit={handleSearch} className="search-form">
              <div className="search-type-selector">
                <label>
                  <input
                    type="radio"
                    value="date"
                    checked={searchType === 'date'}
                    onChange={(e) => setSearchType(e.target.value)}
                  />
                  Search by Date
                </label>
                <label>
                  <input
                    type="radio"
                    value="month"
                    checked={searchType === 'month'}
                    onChange={(e) => setSearchType(e.target.value)}
                  />
                  Search by Month
                </label>
              </div>
              
              {searchType === 'date' ? (
                <input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className="search-input"
                />
              ) : (
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <select
                    value={searchMonth}
                    onChange={(e) => setSearchMonth(e.target.value)}
                    className="search-input"
                  >
                    <option value="">Select Month</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                      <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Year"
                    value={searchYear}
                    onChange={(e) => setSearchYear(e.target.value)}
                    className="search-input"
                    min="2020"
                    max={new Date().getFullYear() + 1}
                  />
                </div>
              )}
              
              <button type="submit" className="btn-search">Search</button>
            </form>
          </div>

          {loading ? (
            <div className="loading">Loading bills...</div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Billing ID</th>
                    <th>Booking ID</th>
                    <th>User ID</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Transaction Date</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="no-data">No bills found. Use search to find bills.</td>
                    </tr>
                  ) : (
                    bills.map((bill) => (
                      <tr key={bill.billing_id || bill._id}>
                        <td>{bill.billing_id || bill._id}</td>
                        <td>{bill.booking_id || 'N/A'}</td>
                        <td>{bill.user_id || 'N/A'}</td>
                        <td>${bill.total_amount_paid || bill.amount || '0.00'}</td>
                        <td>
                          <span className={`status-badge ${bill.transaction_status?.toLowerCase() || 'pending'}`}>
                            {bill.transaction_status || 'Pending'}
                          </span>
                        </td>
                        <td>
                          {bill.transaction_date ? (() => {
                            // Get the date in UTC to avoid timezone conversion issues
                            const date = new Date(bill.transaction_date);
                            const year = date.getUTCFullYear();
                            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                            const day = String(date.getUTCDate()).padStart(2, '0');
                            return `${month}/${day}/${year}`;
                          })() : 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminBilling
