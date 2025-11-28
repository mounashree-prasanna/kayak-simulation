import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { useAppSelector } from '../store/hooks'
import api from '../services/api'
import './MyBookings.css'

const MyBookings = () => {
  const { user, isAuthenticated, loading: authLoading } = useAppSelector(state => state.auth)
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login')
      return
    }
    if (isAuthenticated && user) {
      fetchBookings()
    }
  }, [isAuthenticated, authLoading, user, navigate, filter])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const params = filter !== 'all' ? { status: filter } : {}
      // Try different endpoint formats
      let response
      try {
        response = await api.get(`/bookings/users/${user.user_id || user._id}/bookings`, { params })
      } catch (err) {
        // Fallback: try to get all bookings and filter client-side
        response = await api.get('/bookings', { params })
        if (response.data.data) {
          // Filter by user if needed
          response.data.data = response.data.data.filter(b => 
            b.user_id === (user.user_id || user._id) || 
            b.user === (user.user_id || user._id)
          )
        }
      }
      setBookings(response.data.data || [])
      setError(null)
    } catch (err) {
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        setError('Unable to connect to server. Please ensure the backend services are running.')
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to fetch bookings')
      }
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return
    }

    try {
      await api.put(`/bookings/${bookingId}/cancel`)
      fetchBookings()
      alert('Booking cancelled successfully')
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel booking')
    }
  }

  if (authLoading || loading) {
    return (
      <div className="my-bookings">
        <div className="container">
          <div className="loading">Loading bookings...</div>
        </div>
      </div>
    )
  }

  if (error && bookings.length === 0) {
    return (
      <div className="my-bookings">
        <div className="container">
          <div className="error">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="my-bookings">
      <div className="container">
        <h1>My Bookings</h1>

        <div className="bookings-controls">
          <div className="filter-tabs">
            <button
              className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={`filter-tab ${filter === 'confirmed' ? 'active' : ''}`}
              onClick={() => setFilter('confirmed')}
            >
              Confirmed
            </button>
            <button
              className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
              onClick={() => setFilter('pending')}
            >
              Pending
            </button>
            <button
              className={`filter-tab ${filter === 'cancelled' ? 'active' : ''}`}
              onClick={() => setFilter('cancelled')}
            >
              Cancelled
            </button>
          </div>
        </div>

        <div className="bookings-list">
          {bookings.length === 0 ? (
            <div className="no-bookings">
              <p>No bookings found.</p>
              <Link to="/" className="btn-search">Start Searching</Link>
            </div>
          ) : (
            bookings.map((booking) => (
              <div key={booking._id || booking.booking_id} className="booking-card">
                <div className="booking-header">
                  <div>
                    <h3>
                      {booking.type === 'flight' ? '✈️ Flight' :
                       booking.type === 'hotel' ? '🏨 Hotel' :
                       '🚗 Car Rental'}
                    </h3>
                    <p className="booking-ref">
                      Booking Reference: {booking.booking_reference || booking.booking_id}
                    </p>
                  </div>
                  <span className={`status-badge status-${booking.status}`}>
                    {booking.status}
                  </span>
                </div>

                <div className="booking-details">
                  {booking.type === 'flight' && booking.flight && (
                    <div>
                      <p><strong>Route:</strong> {booking.flight.departure_airport} → {booking.flight.arrival_airport}</p>
                      <p><strong>Date:</strong> {format(new Date(booking.flight.departure_datetime), 'MMM dd, yyyy')}</p>
                      <p><strong>Airline:</strong> {booking.flight.airline}</p>
                    </div>
                  )}
                  {booking.type === 'hotel' && booking.hotel && (
                    <div>
                      <p><strong>Hotel:</strong> {booking.hotel.hotel_name}</p>
                      <p><strong>Location:</strong> {booking.hotel.address?.city}, {booking.hotel.address?.state}</p>
                      {booking.check_in && booking.check_out && (
                        <p>
                          <strong>Dates:</strong> {format(new Date(booking.check_in), 'MMM dd')} - {format(new Date(booking.check_out), 'MMM dd, yyyy')}
                        </p>
                      )}
                    </div>
                  )}
                  {booking.type === 'car' && booking.car && (
                    <div>
                      <p><strong>Vehicle:</strong> {booking.car.vehicle_model}</p>
                      <p><strong>Company:</strong> {booking.car.company_name}</p>
                      {booking.pickup_date && booking.dropoff_date && (
                        <p>
                          <strong>Dates:</strong> {format(new Date(booking.pickup_date), 'MMM dd')} - {format(new Date(booking.dropoff_date), 'MMM dd, yyyy')}
                        </p>
                      )}
                    </div>
                  )}
                  {booking.total_price && (
                    <p className="booking-price">
                      <strong>Total:</strong> ${booking.total_price}
                    </p>
                  )}
                </div>

                <div className="booking-actions">
                  <Link to={`/booking-details/${booking._id || booking.booking_id}`} className="btn-view">
                    View Details
                  </Link>
                  {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                    <button
                      onClick={() => handleCancel(booking._id || booking.booking_id)}
                      className="btn-cancel"
                    >
                      Cancel Booking
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default MyBookings

