import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '../../store/hooks'
import api from '../../services/api'
import { addNotification } from '../../store/slices/notificationSlice'
import './AdminDashboard.css'

const ProviderAnalytics = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { provider_id } = useParams()
  const { isAuthenticated, role, userRole } = useAppSelector(state => state.auth)
  const [year, setYear] = useState(2025)
  const [month, setMonth] = useState('')
  const [providerName, setProviderName] = useState('')
  const [clicksPerPage, setClicksPerPage] = useState([])
  const [listingClicks, setListingClicks] = useState([])
  const [leastSeenSections, setLeastSeenSections] = useState([])
  const [reviews, setReviews] = useState([])
  const [topListings, setTopListings] = useState([])
  const [revenueSummary, setRevenueSummary] = useState({ total_revenue: 0, booking_count: 0 })
  const [userTraces, setUserTraces] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedCohort, setSelectedCohort] = useState('')

  useEffect(() => {
    if (!isAuthenticated || role !== 'admin') {
      navigate('/login')
    }
  }, [isAuthenticated, role, navigate])

  useEffect(() => {
    if (isAuthenticated && role === 'admin' && provider_id) {
      fetchProviderAnalytics()
    }
  }, [isAuthenticated, role, provider_id, year, month])

  const fetchProviderAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const decodedProviderId = decodeURIComponent(provider_id)
      // Try provider_id first, fallback to provider_name
      const isProviderId = decodedProviderId && decodedProviderId.length <= 10 && /^[A-Z0-9]+$/.test(decodedProviderId)
      const baseParams = isProviderId ? {} : { provider_name: decodedProviderId }
      const dateParams = { year, ...(month ? { month } : {}) }
      const params = { ...baseParams, ...dateParams }

      // Fetch all provider analytics
      const [
        clicksResponse,
        listingResponse,
        sectionsResponse,
        reviewsResponse,
        revenueResponse,
        topListingResponse
      ] = await Promise.all([
        api.get(`/analytics/providers/${encodeURIComponent(provider_id)}/clicks-per-page`, { params }),
        api.get(`/analytics/providers/${encodeURIComponent(provider_id)}/listing-clicks`, { params }),
        api.get(`/analytics/providers/${encodeURIComponent(provider_id)}/least-seen-sections`, { params }),
        api.get(`/analytics/providers/${encodeURIComponent(provider_id)}/reviews`, { params }),
        api.get(`/analytics/providers/${encodeURIComponent(provider_id)}/revenue`, { params }),
        api.get(`/analytics/providers/${encodeURIComponent(provider_id)}/top-listings`, { params })
      ])

      if (clicksResponse.data.success) {
        setClicksPerPage(clicksResponse.data.data || [])
        setProviderName(clicksResponse.data.provider_name || decodedProviderId)
      }
      if (listingResponse.data.success) {
        setListingClicks(listingResponse.data.data || [])
      }
      if (sectionsResponse.data.success) {
        setLeastSeenSections(sectionsResponse.data.data || [])
      }
      if (reviewsResponse.data.success) {
        setReviews(reviewsResponse.data.data || [])
      }
      if (revenueResponse.data.success) {
        setRevenueSummary({
          total_revenue: revenueResponse.data.total_revenue || 0,
          booking_count: revenueResponse.data.booking_count || 0
        })
        if (!providerName) {
          setProviderName(revenueResponse.data.provider_name || decodedProviderId)
        }
      }
      if (topListingResponse.data.success) {
        setTopListings(topListingResponse.data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch provider analytics:', err)
      setError(err.response?.data?.error || 'Failed to fetch provider analytics')
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: err.response?.data?.error || 'Failed to fetch provider analytics',
        severity: 'error'
      }))
    } finally {
      setLoading(false)
    }
  }

  const fetchUserTraces = async () => {
    try {
      const decodedProviderId = decodeURIComponent(provider_id)
      const isProviderId = decodedProviderId && decodedProviderId.length <= 10 && /^[A-Z0-9]+$/.test(decodedProviderId)
    const baseParams = isProviderId ? {} : { provider_name: decodedProviderId }
    const filterParams = {
      ...(selectedUserId && { user_id: selectedUserId }),
      ...(selectedCohort && { cohort: selectedCohort }),
      year,
      ...(month ? { month } : {})
    }
    const params = { ...baseParams, ...filterParams }

      const response = await api.get(`/analytics/providers/${encodeURIComponent(provider_id)}/user-traces`, { params })
      if (response.data.success) {
        setUserTraces(response.data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch user traces:', err)
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

  const maxClicks = clicksPerPage.length > 0 ? Math.max(...clicksPerPage.map(c => c.total_clicks || 0), 1) : 1
  const maxListingClicks = listingClicks.length > 0 ? Math.max(...listingClicks.map(l => l.total_clicks || 0), 1) : 1
  const maxTopListingRevenue = topListings.length > 0 ? Math.max(...topListings.map(l => l.total_revenue || 0), 1) : 1

  return (
    <div className="admin-dashboard">
      <div className="admin-container">
        <div className="admin-header">
          <h1>Provider Analytics: {providerName || decodeURIComponent(provider_id)}</h1>
          <button onClick={() => navigate('/admin/analytics')} className="btn-back">← Back to Analytics</button>
        </div>

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
            <label>Month (optional):</label>
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
        </div>

        {loading ? (
          <div className="loading">Loading provider analytics...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <>
            {/* Revenue summary */}
            <div className="analytics-section">
              <h2>Total Revenue ({month ? `Month ${month} ${year}` : `Year ${year}`})</h2>
              <div className="summary-cards">
                <div className="summary-card">
                  <div className="summary-label">Total Revenue</div>
                  <div className="summary-value">${(revenueSummary.total_revenue || 0).toFixed(2)}</div>
                </div>
                <div className="summary-card">
                  <div className="summary-label">Booking Count</div>
                  <div className="summary-value">{revenueSummary.booking_count || 0}</div>
                </div>
              </div>
            </div>

            {/* Clicks Per Page */}
            <div className="analytics-section">
              <h2>Graph for Clicks Per Page</h2>
              <div className="chart-container">
                {clicksPerPage.length === 0 ? (
                  <div className="no-data">No data available for this provider</div>
                ) : (
                  <div className="bar-chart">
                    {clicksPerPage.map((page, idx) => (
                      <div key={idx} className="bar-item">
                        <div className="bar-label">{page.page || 'Unknown'}</div>
                        <div className="bar-wrapper">
                          <div
                            className="bar"
                            style={{ width: `${((page.total_clicks || 0) / maxClicks) * 100}%` }}
                          >
                            <span className="bar-value">{page.total_clicks || 0} clicks</span>
                          </div>
                        </div>
                        <div className="bar-meta">{page.unique_users_count || 0} unique users</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Property/Listing Clicks */}
            <div className="analytics-section">
              <h2>Graph for Property/Listing Clicks</h2>
              <div className="chart-container">
                {listingClicks.length === 0 ? (
                  <div className="no-data">No data available for this provider</div>
                ) : (
                  <div className="bar-chart">
                    {listingClicks.slice(0, 15).map((listing, idx) => (
                      <div key={idx} className="bar-item">
                        <div className="bar-label">
                          {listing.listing_type} - {listing.listing_name || listing.listing_id}
                        </div>
                        <div className="bar-wrapper">
                          <div
                            className="bar"
                            style={{ width: `${((listing.total_clicks || 0) / maxListingClicks) * 100}%` }}
                          >
                            <span className="bar-value">{listing.total_clicks || 0} clicks</span>
                          </div>
                        </div>
                        <div className="bar-meta">{listing.unique_users_count || 0} unique users</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Top listings by revenue */}
            <div className="analytics-section">
              <h2>Top 5 Listings by Revenue ({month ? `Month ${month} ${year}` : `Year ${year}`})</h2>
              <div className="chart-container">
                {topListings.length === 0 ? (
                  <div className="no-data">No data available for this provider</div>
                ) : (
                  <div className="bar-chart">
                    {topListings.map((listing, idx) => (
                      <div key={idx} className="bar-item">
                        <div className="bar-label">
                          {listing.listing_type} - {listing.listing_id}
                        </div>
                        <div className="bar-wrapper">
                          <div
                            className="bar"
                            style={{ width: `${((listing.total_revenue || 0) / maxTopListingRevenue) * 100}%` }}
                          >
                            <span className="bar-value">${(listing.total_revenue || 0).toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="bar-meta">{listing.booking_count || 0} bookings</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Least Seen Sections */}
            <div className="analytics-section">
              <h2>Least Seen Areas/Sections</h2>
              <div className="chart-container">
                {leastSeenSections.length === 0 ? (
                  <div className="no-data">No data available for this provider</div>
                ) : (
                  <div className="table-container">
                    <table className="analytics-table">
                      <thead>
                        <tr>
                          <th>Page</th>
                          <th>Element ID</th>
                          <th>Click Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leastSeenSections.map((section, idx) => (
                          <tr key={idx}>
                            <td>{section.page || 'N/A'}</td>
                            <td>{section.element_id || 'N/A'}</td>
                            <td>{section.click_count || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Reviews on Properties */}
            <div className="analytics-section">
              <h2>Graph for Reviews on Properties</h2>
              <div className="chart-container">
                {reviews.length === 0 ? (
                  <div className="no-data">No reviews available for this provider</div>
                ) : (
                  <div className="bar-chart">
                    {reviews.map((review, idx) => {
                      const maxReviews = reviews.length > 0 ? Math.max(...reviews.map(r => r.count || 0), 1) : 1
                      return (
                        <div key={idx} className="bar-item">
                          <div className="bar-label">
                            {review.entity_type} - {review.entity_id}
                          </div>
                          <div className="bar-wrapper">
                            <div
                              className="bar"
                              style={{ width: `${(review.count / maxReviews) * 100}%` }}
                            >
                              <span className="bar-value">{review.count} reviews</span>
                            </div>
                          </div>
                          <div className="bar-meta">Avg Rating: {review.avgRating?.toFixed(1) || 'N/A'}/5</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* User Trace Diagram */}
            <div className="analytics-section">
              <h2>Trace Diagram for Tracking Users/Cohorts</h2>
              <div className="trace-controls">
                <input
                  type="text"
                  placeholder="User ID (optional)"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="trace-input"
                />
                <input
                  type="text"
                  placeholder="Cohort (e.g., San Jose, CA)"
                  value={selectedCohort}
                  onChange={(e) => setSelectedCohort(e.target.value)}
                  className="trace-input"
                />
                <button onClick={fetchUserTraces} className="btn-search">Search</button>
              </div>
              <div className="chart-container">
                {userTraces.length === 0 ? (
                  <div className="no-data">No trace data available. Use search to find user traces.</div>
                ) : (
                  <div className="trace-diagram">
                    {userTraces.map((trace, idx) => (
                      <div key={idx} className="trace-item">
                        <div className="trace-header">
                          <strong>User: {trace.user_id || 'N/A'}</strong>
                          {trace.cohort_key && <span className="cohort-badge">Cohort: {trace.cohort_key}</span>}
                        </div>
                        <div className="trace-content">
                          <div className="trace-details">
                            <div><strong>Page:</strong> {trace.page || 'N/A'}</div>
                            <div><strong>Action:</strong> {trace.action || 'N/A'}</div>
                            <div><strong>Timestamp:</strong> {trace.created_at ? new Date(trace.created_at).toLocaleString() : 'N/A'}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ProviderAnalytics
