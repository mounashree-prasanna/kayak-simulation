import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { useAppSelector } from '../store/hooks'
import api from '../services/api'
import './MyBookings.css'

const BookingDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAppSelector(state => state.auth)
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    fetchBooking()
  }, [id, isAuthenticated, navigate])

  const fetchBooking = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/bookings/${id}`)
      setBooking(response.data.data)
      setError(null)
    } catch (err) {
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        setError('Unable to connect to server. Please ensure the backend services are running.')
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to fetch booking details')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return
    }

    try {
      await api.put(`/bookings/${id}/cancel`)
      fetchBooking()
      alert('Booking cancelled successfully')
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel booking')
    }
  }

  if (loading) {
    return (
      <div className="my-bookings">
        <div className="container">
          <div className="loading">Loading booking details...</div>
        </div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="my-bookings">
        <div className="container">
          <div className="error">{error || 'Booking not found'}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="my-bookings">
      <div className="container">
        <Link to="/my-bookings" className="back-link">← Back to My Bookings</Link>
        
        <div className="booking-details-page">
          <div className="details-header">
            <div>
              <h1>
                {booking.type === 'flight' ? '✈️ Flight Booking' :
                 booking.type === 'hotel' ? '🏨 Hotel Booking' :
                 '🚗 Car Rental Booking'}
              </h1>
              <p className="booking-ref">
                Booking Reference: {booking.booking_reference || booking.booking_id}
              </p>
            </div>
            <span className={`status-badge status-${booking.status}`}>
              {booking.status}
            </span>
          </div>

          <div className="details-sections">
            {booking.type === 'flight' && booking.flight && (
              <div className="details-section">
                <h2>Flight Information</h2>
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Airline:</span>
                    <span className="detail-value">{booking.flight.airline}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Flight Number:</span>
                    <span className="detail-value">{booking.flight.flight_number}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Route:</span>
                    <span className="detail-value">
                      {booking.flight.departure_airport} → {booking.flight.arrival_airport}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Departure:</span>
                    <span className="detail-value">
                      {format(new Date(booking.flight.departure_datetime), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Arrival:</span>
                    <span className="detail-value">
                      {format(new Date(booking.flight.arrival_datetime), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Class:</span>
                    <span className="detail-value">{booking.flight.flight_class}</span>
                  </div>
                </div>
              </div>
            )}

            {booking.type === 'hotel' && booking.hotel && (
              <div className="details-section">
                <h2>Hotel Information</h2>
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Hotel Name:</span>
                    <span className="detail-value">{booking.hotel.hotel_name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Location:</span>
                    <span className="detail-value">
                      {booking.hotel.address?.city}, {booking.hotel.address?.state}
                    </span>
                  </div>
                  {booking.check_in && (
                    <div className="detail-item">
                      <span className="detail-label">Check-in:</span>
                      <span className="detail-value">
                        {format(new Date(booking.check_in), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  )}
                  {booking.check_out && (
                    <div className="detail-item">
                      <span className="detail-label">Check-out:</span>
                      <span className="detail-value">
                        {format(new Date(booking.check_out), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {booking.type === 'car' && booking.car && (
              <div className="details-section">
                <h2>Car Rental Information</h2>
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Vehicle:</span>
                    <span className="detail-value">{booking.car.vehicle_model}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Company:</span>
                    <span className="detail-value">{booking.car.company_name}</span>
                  </div>
                  {booking.pickup_date && (
                    <div className="detail-item">
                      <span className="detail-label">Pick-up:</span>
                      <span className="detail-value">
                        {format(new Date(booking.pickup_date), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  )}
                  {booking.dropoff_date && (
                    <div className="detail-item">
                      <span className="detail-label">Drop-off:</span>
                      <span className="detail-value">
                        {format(new Date(booking.dropoff_date), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {booking.total_price && (
              <div className="details-section">
                <h2>Payment Information</h2>
                <div className="payment-summary">
                  <div className="payment-item">
                    <span>Total Amount:</span>
                    <span className="total-price">${booking.total_price}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {booking.status !== 'cancelled' && booking.status !== 'completed' && (
            <div className="booking-actions">
              <button onClick={handleCancel} className="btn-cancel">
                Cancel Booking
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BookingDetails

