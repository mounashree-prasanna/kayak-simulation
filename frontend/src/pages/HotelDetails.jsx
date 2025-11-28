import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAppSelector } from '../store/hooks'
import api from '../services/api'
import './Details.css'

const HotelDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAppSelector(state => state.auth)
  const [hotel, setHotel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchHotel()
  }, [id])

  const fetchHotel = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/hotels/${id}`)
      setHotel(response.data.data)
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

  const handleBook = () => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/booking/hotel/' + id)
      return
    }
    navigate(`/booking/hotel/${id}`)
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
            <h1>{hotel.hotel_name}</h1>
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
              <div className="image-placeholder-large">🏨</div>
            </div>

            <div className="details-section">
              <h2>About this hotel</h2>
              <p>{hotel.description || 'A comfortable stay awaits you at this hotel.'}</p>
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

