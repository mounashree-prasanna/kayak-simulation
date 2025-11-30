import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import { useAppSelector } from '../store/hooks'
import api from '../services/api'
import './Details.css'

const FlightDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isAuthenticated } = useAppSelector(state => state.auth)
  const [flight, setFlight] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [aggregateRating, setAggregateRating] = useState(null)

  useEffect(() => {
    fetchFlight()
  }, [id, searchParams])

  useEffect(() => {
    if (flight) {
      fetchReviews()
    }
  }, [flight, id])

  const fetchFlight = async () => {
    try {
      setLoading(true)
      // Pass date parameter if available from URL search params
      const dateParam = searchParams.get('date')
      const url = dateParam ? `/flights/${id}?date=${dateParam}` : `/flights/${id}`
      const response = await api.get(url)
      setFlight(response.data.data)
      setError(null)
    } catch (err) {
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        setError('Unable to connect to server. Please ensure the backend services are running.')
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to fetch flight details')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchReviews = async () => {
    try {
      setReviewsLoading(true)
      
      // Try multiple ID formats to match reviews
      const possibleIds = []
      
      if (flight) {
        // Add flight._id (MongoDB ObjectId) - this is likely what reviews use
        if (flight._id) {
          possibleIds.push(String(flight._id))
        }
        // Add flight.flight_id (string field)
        if (flight.flight_id) {
          possibleIds.push(String(flight.flight_id))
        }
      }
      // Add URL id parameter
      if (id) {
        possibleIds.push(String(id))
      }
      
      // Remove duplicates
      const uniqueIds = [...new Set(possibleIds)]
      
      // Try fetching reviews with each ID format
      let allReviews = []
      let aggregateData = null
      
      for (const flightId of uniqueIds) {
        try {
          // Fetch reviews
          const reviewsResponse = await api.get('/reviews', {
            params: { entity_type: 'Flight', entity_id: flightId }
          })
          if (reviewsResponse.data.success && reviewsResponse.data.data) {
            allReviews = [...allReviews, ...reviewsResponse.data.data]
          }

          // Fetch aggregate ratings (use the first successful one)
          if (!aggregateData) {
            const ratingResponse = await api.get('/reviews/aggregate/ratings', {
              params: { entity_type: 'Flight', entity_id: flightId }
            })
            if (ratingResponse.data.success && ratingResponse.data.data) {
              aggregateData = ratingResponse.data.data
            }
          }
        } catch (err) {
          // Continue trying other IDs
          continue
        }
      }
      
      // Remove duplicate reviews by _id
      const uniqueReviews = allReviews.filter((review, index, self) =>
        index === self.findIndex(r => r._id === review._id)
      )
      
      setReviews(uniqueReviews)
      setAggregateRating(aggregateData)
    } catch (err) {
      console.warn('Failed to fetch reviews:', err.message)
      setReviews([])
    } finally {
      setReviewsLoading(false)
    }
  }

  const handleBook = () => {
    if (!isAuthenticated) {
      // Preserve date param in redirect URL
      const dateParam = searchParams.get('date')
      const redirectUrl = `/booking/flight/${id}${dateParam ? '?date=' + dateParam : ''}`
      navigate('/login?redirect=' + encodeURIComponent(redirectUrl))
      return
    }
    // Pass date parameter to booking page if available
    const dateParam = searchParams.get('date')
    navigate(`/booking/flight/${id}${dateParam ? '?date=' + dateParam : ''}`)
  }

  if (loading) {
    return (
      <div className="details-page">
        <div className="container">
          <div className="loading">Loading flight details...</div>
        </div>
      </div>
    )
  }

  if (error || !flight) {
    return (
      <div className="details-page">
        <div className="container">
          <div className="error">{error || 'Flight not found'}</div>
        </div>
      </div>
    )
  }

  const calculateDuration = (departure, arrival) => {
    if (!departure || !arrival) return 'N/A'
    try {
      const dep = new Date(departure)
      const arr = new Date(arrival)
      const diff = arr - dep
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      return `${hours}h ${minutes}m`
    } catch {
      return 'N/A'
    }
  }
  
  // Helper to get field value with fallback
  const getField = (obj, ...paths) => {
    for (const path of paths) {
      const value = path.split('.').reduce((o, p) => o?.[p], obj)
      if (value !== undefined && value !== null) return value
    }
    return null
  }

  return (
    <div className="details-page">
      <div className="container">
        <Link to="/flights" className="back-link">← Back to search results</Link>
        
        <div className="details-header">
          <h1>{flight.airline || flight.airline_name} - {flight.flight_number}</h1>
          <div className="details-price">
            <span className="price">${getField(flight, 'ticket_price', 'price') || 0}</span>
            <span className="price-label">per person</span>
          </div>
        </div>

        <div className="details-content">
          <div className="details-main">
            <div className="details-section">
              <h2>Flight Information</h2>
              <div className="flight-timeline">
                <div className="timeline-item">
                  <div className="timeline-time">
                    {format(new Date(getField(flight, 'departure_datetime', 'departure.dateTime')), 'HH:mm')}
                  </div>
                  <div className="timeline-location">
                    <strong>{getField(flight, 'departure_airport', 'departure.airportCode')}</strong>
                    <span>{format(new Date(getField(flight, 'departure_datetime', 'departure.dateTime')), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
                <div className="timeline-duration">
                  Duration: {calculateDuration(
                    getField(flight, 'departure_datetime', 'departure.dateTime'),
                    getField(flight, 'arrival_datetime', 'arrival.dateTime')
                  )}
                </div>
                <div className="timeline-item">
                  <div className="timeline-time">
                    {format(new Date(getField(flight, 'arrival_datetime', 'arrival.dateTime')), 'HH:mm')}
                  </div>
                  <div className="timeline-location">
                    <strong>{getField(flight, 'arrival_airport', 'arrival.airportCode')}</strong>
                    <span>{format(new Date(getField(flight, 'arrival_datetime', 'arrival.dateTime')), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="details-section">
              <h2>Flight Details</h2>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">Airline:</span>
                  <span className="detail-value">{flight.airline || flight.airline_name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Flight Number:</span>
                  <span className="detail-value">{flight.flight_number}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Class:</span>
                  <span className="detail-value">{getField(flight, 'flight_class', 'class')}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Available Seats:</span>
                  <span className="detail-value">{getField(flight, 'total_available_seats', 'availableSeats') || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="details-section reviews-section">
              <h2>Reviews</h2>
              {aggregateRating && aggregateRating.total_reviews > 0 && (
                <div className="reviews-summary">
                  <div className="reviews-rating">
                    <span className="rating-value-large">{aggregateRating.average_rating.toFixed(1)}</span>
                    <div className="rating-stars-large">
                      {'⭐'.repeat(Math.round(aggregateRating.average_rating))}
                    </div>
                    <span className="reviews-count">({aggregateRating.total_reviews} reviews)</span>
                  </div>
                </div>
              )}
              {reviewsLoading ? (
                <div className="loading">Loading reviews...</div>
              ) : reviews.length === 0 ? (
                <div className="no-reviews">No reviews yet. Be the first to review this flight!</div>
              ) : (
                <div className="reviews-list">
                  {reviews.map((review) => (
                    <div key={review._id} className="review-item">
                      <div className="review-item-header">
                        <div className="review-rating">
                          {'⭐'.repeat(review.rating)}
                          <span className="rating-number">{review.rating}/5</span>
                        </div>
                        <span className="review-date">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="review-title">{review.title}</h3>
                      <p className="review-comment">{review.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="details-sidebar">
            <div className="booking-card">
              <div className="booking-price">
                <span className="price">${getField(flight, 'ticket_price', 'price') || 0}</span>
                <span className="price-label">per person</span>
              </div>
              <button onClick={handleBook} className="btn-book">
                Book Now
              </button>
              <div className="booking-info">
                <p>✓ Free cancellation</p>
                <p>✓ Instant confirmation</p>
                <p>✓ Best price guarantee</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FlightDetails

