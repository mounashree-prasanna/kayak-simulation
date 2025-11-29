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
  const [carImages, setCarImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchCar()
  }, [id])

  const fetchCar = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/cars/${id}`)
      const carData = response.data.data
      setCar(carData)
      
      // Fetch images for the car - try both car_id and _id
      try {
        const carId = carData.car_id || id
        const imageResponse = await api.get('/images', {
          params: { entity_type: 'Car', entity_id: String(carId) }
        })
        if (imageResponse.data.success && imageResponse.data.data) {
          setCarImages(imageResponse.data.data.map(img => img.image_url))
        }
      } catch (imgErr) {
        // Try with _id if car_id didn't work
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

