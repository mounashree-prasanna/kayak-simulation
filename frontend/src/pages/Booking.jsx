import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppSelector } from '../store/hooks'
import api from '../services/api'
import './Booking.css'

const Booking = () => {
  const { type, id } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAppSelector(state => state.auth)
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    passengers: [{ firstName: '', lastName: '', dateOfBirth: '', passportNumber: '' }],
    checkIn: '',
    checkOut: '',
    guests: [{ firstName: '', lastName: '', age: '' }],
    driver: { firstName: '', lastName: '', licenseNumber: '', dateOfBirth: '' }
  })

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/booking/' + type + '/' + id)
      return
    }
    fetchItem()
  }, [type, id, isAuthenticated, navigate])

  const fetchItem = async () => {
    try {
      setLoading(true)
      const endpoint = type === 'flight' ? 'flights' : type === 'hotel' ? 'hotels' : 'cars'
      const response = await api.get(`/${endpoint}/${id}`)
      setItem(response.data.data)
    } catch (err) {
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        console.error('Unable to connect to server. Please ensure the backend services are running.')
      } else {
        console.error('Failed to fetch item:', err)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e, index = null, field = null) => {
    if (type === 'flight' && index !== null) {
      const passengers = [...formData.passengers]
      passengers[index][e.target.name] = e.target.value
      setFormData({ ...formData, passengers })
    } else if (type === 'hotel' && index !== null) {
      const guests = [...formData.guests]
      guests[index][e.target.name] = e.target.value
      setFormData({ ...formData, guests })
    } else if (type === 'car' && field) {
      setFormData({
        ...formData,
        driver: { ...formData.driver, [e.target.name]: e.target.value }
      })
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      let bookingData = {}

      if (type === 'flight') {
        bookingData = {
          flightId: id,
          passengers: formData.passengers,
          class: item?.flight_class || 'economy'
        }
      } else if (type === 'hotel') {
        bookingData = {
          hotelId: id,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          guests: formData.guests,
          roomType: 'Standard'
        }
      } else if (type === 'car') {
        bookingData = {
          carRentalId: id,
          driver: formData.driver,
          pickupDate: formData.pickupDate,
          dropoffDate: formData.dropoffDate
        }
      }

      const response = await api.post('/bookings', bookingData)
      navigate(`/booking-details/${response.data.data._id || response.data.data.booking_id}`)
    } catch (err) {
      alert(err.response?.data?.error || 'Booking failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="booking-page">
        <div className="container">
          <div className="loading">Loading booking details...</div>
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="booking-page">
        <div className="container">
          <div className="error">Item not found</div>
        </div>
      </div>
    )
  }

  return (
    <div className="booking-page">
      <div className="container">
        <h1>Complete Your Booking</h1>

        <div className="booking-content">
          <div className="booking-form-container">
            <form onSubmit={handleSubmit} className="booking-form">
              {type === 'flight' && (
                <>
                  <h2>Passenger Information</h2>
                  {formData.passengers.map((passenger, index) => (
                    <div key={index} className="passenger-section">
                      <h3>Passenger {index + 1}</h3>
                      <div className="form-row">
                        <div className="form-group">
                          <label>First Name</label>
                          <input
                            type="text"
                            name="firstName"
                            value={passenger.firstName}
                            onChange={(e) => handleChange(e, index)}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Last Name</label>
                          <input
                            type="text"
                            name="lastName"
                            value={passenger.lastName}
                            onChange={(e) => handleChange(e, index)}
                            required
                          />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Date of Birth</label>
                          <input
                            type="date"
                            name="dateOfBirth"
                            value={passenger.dateOfBirth}
                            onChange={(e) => handleChange(e, index)}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Passport Number</label>
                          <input
                            type="text"
                            name="passportNumber"
                            value={passenger.passportNumber}
                            onChange={(e) => handleChange(e, index)}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {type === 'hotel' && (
                <>
                  <h2>Booking Dates</h2>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Check-in Date</label>
                      <input
                        type="date"
                        name="checkIn"
                        value={formData.checkIn}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Check-out Date</label>
                      <input
                        type="date"
                        name="checkOut"
                        value={formData.checkOut}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                  <h2>Guest Information</h2>
                  {formData.guests.map((guest, index) => (
                    <div key={index} className="guest-section">
                      <h3>Guest {index + 1}</h3>
                      <div className="form-row">
                        <div className="form-group">
                          <label>First Name</label>
                          <input
                            type="text"
                            name="firstName"
                            value={guest.firstName}
                            onChange={(e) => handleChange(e, index)}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Last Name</label>
                          <input
                            type="text"
                            name="lastName"
                            value={guest.lastName}
                            onChange={(e) => handleChange(e, index)}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Age</label>
                          <input
                            type="number"
                            name="age"
                            value={guest.age}
                            onChange={(e) => handleChange(e, index)}
                            required
                            min="1"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {type === 'car' && (
                <>
                  <h2>Rental Dates</h2>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Pick-up Date</label>
                      <input
                        type="date"
                        name="pickupDate"
                        value={formData.pickupDate}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Drop-off Date</label>
                      <input
                        type="date"
                        name="dropoffDate"
                        value={formData.dropoffDate}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                  <h2>Driver Information</h2>
                  <div className="form-row">
                    <div className="form-group">
                      <label>First Name</label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.driver.firstName}
                        onChange={(e) => handleChange(e, null, 'driver')}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Last Name</label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.driver.lastName}
                        onChange={(e) => handleChange(e, null, 'driver')}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>License Number</label>
                      <input
                        type="text"
                        name="licenseNumber"
                        value={formData.driver.licenseNumber}
                        onChange={(e) => handleChange(e, null, 'driver')}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Date of Birth</label>
                      <input
                        type="date"
                        name="dateOfBirth"
                        value={formData.driver.dateOfBirth}
                        onChange={(e) => handleChange(e, null, 'driver')}
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <button type="submit" className="btn-submit" disabled={submitting}>
                {submitting ? 'Processing...' : 'Confirm Booking'}
              </button>
            </form>
          </div>

          <div className="booking-summary">
            <h2>Booking Summary</h2>
            <div className="summary-item">
              <h3>{type === 'flight' ? item.airline : type === 'hotel' ? item.hotel_name : item.vehicle_model}</h3>
              <p>{type === 'flight' ? `${item.departure_airport} → ${item.arrival_airport}` : 
                  type === 'hotel' ? `${item.address?.city}, ${item.address?.state}` :
                  `${item.location?.city}, ${item.location?.state}`}</p>
            </div>
            <div className="summary-price">
              <div className="price-label">Total Price</div>
              <div className="price">${type === 'flight' ? item.ticket_price : 
                                      type === 'hotel' ? item.price_per_night : 
                                      item.price_per_day}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Booking

