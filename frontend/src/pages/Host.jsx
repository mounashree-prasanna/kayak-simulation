import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '../store/hooks'
import api from '../services/api'
import './Host.css'

const Host = () => {
  const navigate = useNavigate()
  const { isAuthenticated, role } = useAppSelector(state => state.auth)
  const [clicksPerPage, setClicksPerPage] = useState([])
  const [listingClicks, setListingClicks] = useState([])
  const [leastSeenSections, setLeastSeenSections] = useState([])
  const [reviews, setReviews] = useState([])
  const [userTraces, setUserTraces] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedCohort, setSelectedCohort] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
    } else if (role !== 'admin') {
      // Host page is now admin-only - redirect to admin analytics
      navigate('/admin/analytics')
    }
  }, [isAuthenticated, role, navigate])

  useEffect(() => {
    if (isAuthenticated && role === 'admin') {
      fetchAllAnalytics()
    }
  }, [isAuthenticated, role])

  const fetchAllAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch clicks per page
      const clicksResponse = await api.get('/analytics/clicks-per-page')
      if (clicksResponse.data.success) {
        setClicksPerPage(clicksResponse.data.data || [])
      }

      // Fetch listing clicks
      const listingResponse = await api.get('/analytics/listing-clicks')
      if (listingResponse.data.success) {
        setListingClicks(listingResponse.data.data || [])
      }

      // Fetch least seen sections
      const leastSeenResponse = await api.get('/analytics/least-seen-sections')
      if (leastSeenResponse.data.success) {
        setLeastSeenSections(leastSeenResponse.data.data || [])
      }

      // Fetch reviews (from reviews endpoint)
      const reviewsResponse = await api.get('/reviews')
      if (reviewsResponse.data.success) {
        setReviews(reviewsResponse.data.data || [])
      }

      // Fetch user traces
      const tracesResponse = await api.get('/analytics/user-trace')
      if (tracesResponse.data.success) {
        setUserTraces(tracesResponse.data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
      setError(err.response?.data?.error || 'Failed to fetch analytics')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserTrace = async () => {
    try {
      const params = {}
      if (selectedUserId) params.user_id = selectedUserId
      if (selectedCohort) params.cohort = selectedCohort

      const response = await api.get('/analytics/user-trace', { params })
      if (response.data.success) {
        setUserTraces(response.data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch user trace:', err)
    }
  }

  if (!isAuthenticated || role !== 'admin') {
    return (
      <div className="host-page">
        <div className="host-container">
          <div className="error">Admin access required. Please log in as an admin.</div>
        </div>
      </div>
    )
  }

  const maxClicks = Math.max(...clicksPerPage.map(c => c.total_clicks || 0), 1)
  const maxListingClicks = Math.max(...listingClicks.map(l => l.total_clicks || 0), 1)
  const reviewsByProperty = {}
  reviews.forEach(review => {
    const key = `${review.entity_type}-${review.entity_id}`
    if (!reviewsByProperty[key]) {
      reviewsByProperty[key] = { entity_type: review.entity_type, entity_id: review.entity_id, count: 0, totalRating: 0 }
    }
    reviewsByProperty[key].count++
    reviewsByProperty[key].totalRating += review.rating || 0
  })
  const reviewsData = Object.values(reviewsByProperty).map(r => ({
    ...r,
    avgRating: r.totalRating / r.count
  })).sort((a, b) => b.count - a.count).slice(0, 10)

  return (
    <div className="host-page">
      <div className="host-container">
        <div className="host-header">
          <h1>Host Analytics Dashboard</h1>
          <button onClick={() => navigate('/')} className="btn-back">← Back to Home</button>
        </div>

        {loading ? (
          <div className="loading">Loading analytics...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <>
            {/* Clicks Per Page */}
            <div className="analytics-section">
              <h2>Graph for Clicks Per Page</h2>
              <div className="chart-container">
                {clicksPerPage.length === 0 ? (
                  <div className="no-data">No data available</div>
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
                  <div className="no-data">No data available</div>
                ) : (
                  <div className="bar-chart">
                    {listingClicks.slice(0, 15).map((listing, idx) => (
                      <div key={idx} className="bar-item">
                        <div className="bar-label">
                          {listing.listing_type} - {listing.listing_id}
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

            {/* Least Seen Sections */}
            <div className="analytics-section">
              <h2>Least Seen Areas/Sections</h2>
              <div className="chart-container">
                {leastSeenSections.length === 0 ? (
                  <div className="no-data">No data available</div>
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
                {reviewsData.length === 0 ? (
                  <div className="no-data">No reviews available</div>
                ) : (
                  <div className="bar-chart">
                    {reviewsData.map((review, idx) => (
                      <div key={idx} className="bar-item">
                        <div className="bar-label">
                          {review.entity_type} - {review.entity_id}
                        </div>
                        <div className="bar-wrapper">
                          <div
                            className="bar"
                            style={{ width: `${(review.count / Math.max(...reviewsData.map(r => r.count), 1)) * 100}%` }}
                          >
                            <span className="bar-value">{review.count} reviews</span>
                          </div>
                        </div>
                        <div className="bar-meta">Avg Rating: {review.avgRating.toFixed(1)}/5</div>
                      </div>
                    ))}
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
                <button onClick={fetchUserTrace} className="btn-search">Search</button>
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

            {/* Bidding/Limited Offers Trace (if implemented) */}
            <div className="analytics-section">
              <h2>Trace Diagram for Bidding/Limited Offers</h2>
              <div className="chart-container">
                <div className="no-data">
                  Bidding/Limited offers functionality is not currently implemented in the system.
                  This section will display trace diagrams when that feature is added.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Host
