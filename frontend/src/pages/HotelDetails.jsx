import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAppSelector } from '../store/hooks'
import api from '../services/api'
import './Details.css'

const HotelDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isAuthenticated } = useAppSelector(state => state.auth)
  const [hotel, setHotel] = useState(null)
  const [hotelImages, setHotelImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [aggregateRating, setAggregateRating] = useState(null)

  useEffect(() => {
    fetchHotel()
  }, [id, searchParams])

  useEffect(() => {
    if (hotel) {
      fetchReviews()
    }
  }, [hotel, id])

  const fetchHotel = async () => {
    try {
      setLoading(true)
      // Pass check-in/check-out dates if available from URL search params
      const checkIn = searchParams.get('checkIn')
      const checkOut = searchParams.get('checkOut')
      let url = `/hotels/${id}`
      if (checkIn && checkOut) {
        url += `?checkIn=${checkIn}&checkOut=${checkOut}`
      }
      const response = await api.get(url)
      const hotelData = response.data.data
      setHotel(hotelData)
      
      // Fetch images for the hotel - try both hotel_id and _id
      try {
        const hotelId = hotelData.hotel_id || id
        const imageResponse = await api.get('/images', {
          params: { entity_type: 'Hotel', entity_id: String(hotelId) }
        })
        if (imageResponse.data.success && imageResponse.data.data) {
          setHotelImages(imageResponse.data.data.map(img => img.image_url))
        }
      } catch (imgErr) {
        // Try with _id if hotel_id didn't work
        try {
          const imageResponse = await api.get('/images', {
            params: { entity_type: 'Hotel', entity_id: String(id) }
          })
          if (imageResponse.data.success && imageResponse.data.data) {
            setHotelImages(imageResponse.data.data.map(img => img.image_url))
          }
        } catch (imgErr2) {
          console.log('No images found for hotel')
        }
      }
      
      setError(null)
    } catch (err) {
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        setError('Unable to connect to server. Please ensure the backend services are running.')
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to fetch hotel details')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchReviews = async () => {
    try {
      setReviewsLoading(true)
      
      // Try multiple ID formats to match reviews
      // Reviews might be stored with _id (ObjectId) or hotel_id (string)
      const possibleIds = []
      
      if (hotel) {
        // Add hotel._id (MongoDB ObjectId) - this is likely what reviews use
        if (hotel._id) {
          possibleIds.push(String(hotel._id))
        }
        // Add hotel.hotel_id (string field)
        if (hotel.hotel_id) {
          possibleIds.push(String(hotel.hotel_id))
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
      
      for (const hotelId of uniqueIds) {
        try {
          // Fetch reviews
          const reviewsResponse = await api.get('/reviews', {
            params: { entity_type: 'Hotel', entity_id: hotelId }
          })
          if (reviewsResponse.data.success && reviewsResponse.data.data) {
            allReviews = [...allReviews, ...reviewsResponse.data.data]
          }

          // Fetch aggregate ratings (use the first successful one)
          if (!aggregateData) {
            const ratingResponse = await api.get('/reviews/aggregate/ratings', {
              params: { entity_type: 'Hotel', entity_id: hotelId }
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
      // Preserve search params in redirect URL
      const params = new URLSearchParams()
      const guests = searchParams.get('guests')
      const checkIn = searchParams.get('checkIn')
      const checkOut = searchParams.get('checkOut')
      if (guests) params.append('guests', guests)
      if (checkIn) params.append('checkIn', checkIn)
      if (checkOut) params.append('checkOut', checkOut)
      const queryString = params.toString()
      navigate(`/login?redirect=/booking/hotel/${id}${queryString ? '?' + queryString : ''}`)
      return
    }
    // Pass search params to booking page
    const params = new URLSearchParams()
    const guests = searchParams.get('guests')
    const checkIn = searchParams.get('checkIn')
    const checkOut = searchParams.get('checkOut')
    if (guests) params.append('guests', guests)
    if (checkIn) params.append('checkIn', checkIn)
    if (checkOut) params.append('checkOut', checkOut)
    const queryString = params.toString()
    navigate(`/booking/hotel/${id}${queryString ? '?' + queryString : ''}`)
  }

  if (loading) {
    return (
      <div className="details-page">
        <div className="container">
          <div className="loading">Loading hotel details...</div>
        </div>
      </div>
    )
  }

  if (error || !hotel) {
    return (
      <div className="details-page">
        <div className="container">
          <div className="error">{error || 'Hotel not found'}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="details-page">
      <div className="container">
        <Link to="/hotels" className="back-link">← Back to search results</Link>
        
        <div className="details-header">
          <div>
            <h1>{hotel.name || hotel.hotel_name}</h1>
            <div className="hotel-meta">
              <span className="stars">{'★'.repeat(hotel.star_rating)}</span>
              <span className="rating">Rating: {hotel.hotel_rating?.toFixed(1) || 'N/A'}</span>
              <span className="location">
                {hotel.address?.city}, {hotel.address?.state || hotel.address?.country}
              </span>
            </div>
          </div>
          <div className="details-price">
            <span className="price">${hotel.price_per_night}</span>
            <span className="price-label">per night</span>
          </div>
        </div>

        <div className="details-content">
          <div className="details-main">
            <div className="hotel-image-large">
              {hotelImages.length > 0 ? (
                <img src={hotelImages[0]} alt={hotel.name || hotel.hotel_name} />
              ) : (
                <div className="image-placeholder-large">🏨</div>
              )}
            </div>

            <div className="details-section">
              <h2>About this hotel</h2>
              <p>{hotel.description || 'A comfortable stay awaits you at this hotel.'}</p>
              <div className="details-grid" style={{ marginTop: '1rem' }}>
                <div className="detail-item">
                  <span className="detail-label">Total Rooms:</span>
                  <span className="detail-value">{hotel.number_of_rooms || 'N/A'}</span>
                </div>
                {hotel.actual_available_rooms !== undefined && (
                  <div className="detail-item">
                    <span className="detail-label">Available Rooms:</span>
                    <span className="detail-value" style={{ color: hotel.actual_available_rooms > 0 ? 'green' : 'red', fontWeight: 'bold' }}>
                      {hotel.actual_available_rooms}
                    </span>
                  </div>
                )}
                {hotel.booked_rooms !== undefined && (
                  <div className="detail-item">
                    <span className="detail-label">Booked Rooms:</span>
                    <span className="detail-value">{hotel.booked_rooms}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="details-section">
              <h2>Amenities</h2>
              <div className="amenities-grid">
                {hotel.amenities?.wifi && <div className="amenity">✓ Free WiFi</div>}
                {hotel.amenities?.breakfast_included && <div className="amenity">✓ Breakfast Included</div>}
                {hotel.amenities?.parking && <div className="amenity">✓ Parking</div>}
                {hotel.amenities?.pet_friendly && <div className="amenity">✓ Pet Friendly</div>}
                {hotel.amenities?.near_transit && <div className="amenity">✓ Near Transit</div>}
              </div>
            </div>

            <div className="details-section">
              <h2>Location</h2>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">Address:</span>
                  <span className="detail-value">
                    {hotel.address?.street}, {hotel.address?.city}, {hotel.address?.state} {hotel.address?.zip}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Country:</span>
                  <span className="detail-value">{hotel.address?.country}</span>
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
                <div className="no-reviews">No reviews yet. Be the first to review this hotel!</div>
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
                <span className="price">${hotel.price_per_night}</span>
                <span className="price-label">per night</span>
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

export default HotelDetails

