import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { useAppSelector } from '../store/hooks'
import api from '../services/api'
import './Details.css'

const FlightDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAppSelector(state => state.auth)
  const [flight, setFlight] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchFlight()
  }, [id])

  const fetchFlight = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/flights/${id}`)
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

  const handleBook = () => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/booking/flight/' + id)
      return
    }
    navigate(`/booking/flight/${id}`)
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

