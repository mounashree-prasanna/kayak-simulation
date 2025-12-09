import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAppSelector } from '../store/hooks'
import api from '../services/api'
import { logListingClick, logPageClick } from '../services/tracking'
import './Details.css'

const CarDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAppSelector(state => state.auth)
  const [car, setCar] = useState(null)
  const [carImages, setCarImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [aggregateRating, setAggregateRating] = useState(null)

  useEffect(() => {
    fetchCar()
    const pagePath = `/cars/${id}`
    logPageClick(pagePath, 'car-details-page', user?.user_id || user?._id || null)
  }, [id])

  useEffect(() => {
    if (car) {
      fetchReviews()
    }
  }, [car, id])

  const fetchCar = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/cars/${id}`)
      const carData = response.data.data
      setCar(carData)
      
      const carId = carData.car_id || carData._id || id
      if (carId) {
        logListingClick('Car', carId, user?.user_id || user?._id || null)
      }
      
      if (carData.image_url) {
        setCarImages([carData.image_url])
      } else {
        try {
          const carId = carData.car_id || id
          const imageResponse = await api.get('/images', {
            params: { entity_type: 'Car', entity_id: String(carId) }
          })
          if (imageResponse.data.success && imageResponse.data.data) {
            setCarImages(imageResponse.data.data.map(img => img.image_url))
          }
        } catch (imgErr) {
          try {
            const imageResponse = await api.get('/images', {
              params: { entity_type: 'Car', entity_id: String(id) }
            })
            if (imageResponse.data.success && imageResponse.data.data) {
              setCarImages(imageResponse.data.data.map(img => img.image_url))
            }
          } catch (imgErr2) {
            console.log('No images found for car')
          }
        }
      }
      
      setError(null)
    } catch (err) {
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        setError('Unable to connect to server. Please ensure the backend services are running.')
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to fetch car details')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchReviews = async () => {
    try {
      setReviewsLoading(true)
      
      const possibleIds = []
      
      if (car) {
        if (car._id) {
          possibleIds.push(String(car._id))
        }
        if (car.car_id) {
          possibleIds.push(String(car.car_id))
        }
      }
      if (id) {
        possibleIds.push(String(id))
      }
      
      const uniqueIds = [...new Set(possibleIds)]
      
      let allReviews = []
      let aggregateData = null
      
      for (const carId of uniqueIds) {
        try {
          const reviewsResponse = await api.get('/reviews', {
            params: { entity_type: 'Car', entity_id: carId }
          })
          if (reviewsResponse.data.success && reviewsResponse.data.data) {
            allReviews = [...allReviews, ...reviewsResponse.data.data]
          }

          if (!aggregateData) {
            const ratingResponse = await api.get('/reviews/aggregate/ratings', {
              params: { entity_type: 'Car', entity_id: carId }
            })
            if (ratingResponse.data.success && ratingResponse.data.data) {
              aggregateData = ratingResponse.data.data
            }
          }
        } catch (err) {
          continue
        }
      }
      
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
      navigate('/login?redirect=/booking/car/' + id)
      return
    }
    navigate(`/booking/car/${id}`)
  }

  if (loading) {
    return (
      <div className="details-page">
        <div className="container">
          <div className="loading">Loading car details...</div>
        </div>
      </div>
    )
  }

  if (error || !car) {
    return (
      <div className="details-page">
        <div className="container">
          <div className="error">{error || 'Car not found'}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="details-page">
      <div className="container">
        <Link to="/cars" className="back-link">← Back to search results</Link>
        
        <div className="details-header">
          <div>
            <h1>{car.model || car.vehicle_model || car.car_model}</h1>
            <div className="car-meta">
              <span>{car.car_type || car.vehicle_type}</span>
              <span>•</span>
              <span>{car.provider_name || car.company_name || car.rental_company}</span>
              {car.year && <span>•</span>}
              {car.year && <span>{car.year}</span>}
            </div>
          </div>
          <div className="details-price">
            <span className="price">${car.daily_rental_price || car.price_per_day}</span>
            <span className="price-label">per day</span>
          </div>
        </div>

        <div className="details-content">
          <div className="details-main">
            <div className="car-image-large">
              {carImages.length > 0 ? (
                <img src={carImages[0]} alt={car.model || car.vehicle_model || car.car_model} />
              ) : (
                <div className="image-placeholder-large">🚗</div>
              )}
            </div>

            <div className="details-section">
              <h2>Vehicle Information</h2>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">Model:</span>
                  <span className="detail-value">{car.model || car.vehicle_model || car.car_model}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Type:</span>
                  <span className="detail-value">{car.car_type || car.vehicle_type}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Provider:</span>
                  <span className="detail-value">{car.provider_name || car.company_name || car.rental_company}</span>
                </div>
                {car.year && (
                  <div className="detail-item">
                    <span className="detail-label">Year:</span>
                    <span className="detail-value">{car.year}</span>
                  </div>
                )}
                {car.number_of_seats && (
                  <div className="detail-item">
                    <span className="detail-label">Seats:</span>
                    <span className="detail-value">{car.number_of_seats}</span>
                  </div>
                )}
                {car.transmission_type && (
                  <div className="detail-item">
                    <span className="detail-label">Transmission:</span>
                    <span className="detail-value">{car.transmission_type}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="details-section">
              <h2>Location</h2>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">Pick-up Location:</span>
                  <span className="detail-value">
                    {car.pickup_city || car.location?.city}
                    {(car.pickup_state || car.location?.state || car.location?.country) && 
                      `, ${car.pickup_state || car.location?.state || car.location?.country}`
                    }
                  </span>
                </div>
                {car.location?.address && (
                  <div className="detail-item">
                    <span className="detail-label">Address:</span>
                    <span className="detail-value">{car.location.address}</span>
                  </div>
                )}
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
                <div className="no-reviews">No reviews yet. Be the first to review this car rental!</div>
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
                <span className="price">${car.daily_rental_price || car.price_per_day}</span>
                <span className="price-label">per day</span>
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

export default CarDetails

