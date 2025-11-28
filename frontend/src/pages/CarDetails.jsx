import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAppSelector } from '../store/hooks'
import api from '../services/api'
import './Details.css'

const CarDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAppSelector(state => state.auth)
  const [car, setCar] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchCar()
  }, [id])

  const fetchCar = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/cars/${id}`)
      setCar(response.data.data)
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
            <h1>{car.vehicle_model || car.car_model}</h1>
            <div className="car-meta">
              <span>{car.car_type || car.vehicle_type}</span>
              <span>•</span>
              <span>{car.company_name || car.rental_company}</span>
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
              <div className="image-placeholder-large">🚗</div>
            </div>

            <div className="details-section">
              <h2>Vehicle Information</h2>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">Model:</span>
                  <span className="detail-value">{car.vehicle_model || car.car_model}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Type:</span>
                  <span className="detail-value">{car.car_type || car.vehicle_type}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Company:</span>
                  <span className="detail-value">{car.company_name || car.rental_company}</span>
                </div>
                {car.seats && (
                  <div className="detail-item">
                    <span className="detail-label">Seats:</span>
                    <span className="detail-value">{car.seats}</span>
                  </div>
                )}
                {car.fuel_type && (
                  <div className="detail-item">
                    <span className="detail-label">Fuel Type:</span>
                    <span className="detail-value">{car.fuel_type}</span>
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
                    {car.pickup_city || car.location?.city}, {car.pickup_state || car.location?.state || car.location?.country}
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

