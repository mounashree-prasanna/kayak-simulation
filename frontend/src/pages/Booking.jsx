import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAppSelector } from '../store/hooks'
import api from '../services/api'
import './Booking.css'

const Booking = () => {
  const { type, id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, isAuthenticated } = useAppSelector(state => state.auth)
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  // Get guest count from URL params (for hotels) - used for capacity/pricing, but only collect primary guest info
  const guestsParam = searchParams.get('guests')
  const numGuests = guestsParam ? parseInt(guestsParam) : 1
  
  // Initialize form data - only primary guest info needed
  const [formData, setFormData] = useState({
    passengers: [{ firstName: '', lastName: '', dateOfBirth: '', passportNumber: '' }],
    checkIn: searchParams.get('checkIn') || '',
    checkOut: searchParams.get('checkOut') || '',
    guests: [{ firstName: '', lastName: '', age: '' }], // Only primary guest
    pickupDate: '',
    dropoffDate: '',
    driver: { firstName: '', lastName: '', licenseNumber: '', dateOfBirth: '' }
  })

  // Helper function to get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Helper function to format date for min attribute
  const getMinDate = (startDate = null) => {
    if (startDate) {
      return startDate
    }
    return getTodayDate()
  }

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/booking/' + type + '/' + id)
      return
    }
    fetchItem()
  }, [type, id, isAuthenticated, navigate])

  // Update check-in/check-out dates when params change (for hotels)
  useEffect(() => {
    if (type === 'hotel') {
      const checkIn = searchParams.get('checkIn') || ''
      const checkOut = searchParams.get('checkOut') || ''
      
      if (checkIn || checkOut) {
        setFormData(prev => ({
          ...prev,
          checkIn: checkIn || prev.checkIn,
          checkOut: checkOut || prev.checkOut
        }))
      }
    }
  }, [searchParams, type])

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
      const newValue = e.target.value
      const fieldName = e.target.name
      
      // If check-in date changes and check-out is before new check-in, clear check-out
      if (fieldName === 'checkIn' && formData.checkOut && newValue) {
        const checkOutDate = new Date(formData.checkOut)
        const newCheckInDate = new Date(newValue)
        if (checkOutDate <= newCheckInDate) {
          setFormData({ ...formData, [fieldName]: newValue, checkOut: '' })
          return
        }
      }
      
      // If pick-up date changes and drop-off is before new pick-up, clear drop-off
      if (fieldName === 'pickupDate' && formData.dropoffDate && newValue) {
        const dropoffDate = new Date(formData.dropoffDate)
        const newPickupDate = new Date(newValue)
        if (dropoffDate <= newPickupDate) {
          setFormData({ ...formData, [fieldName]: newValue, dropoffDate: '' })
          return
        }
      }
      
      setFormData({ ...formData, [fieldName]: newValue })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (!user || !user.user_id) {
        alert('User information not available. Please log in again.')
        navigate('/login')
        return
      }

      // Map frontend type to backend booking_type (capitalized)
      const bookingTypeMap = {
        'flight': 'Flight',
        'hotel': 'Hotel',
        'car': 'Car'
      }
      const booking_type = bookingTypeMap[type]
      if (!booking_type) {
        alert('Invalid booking type')
        return
      }

      let bookingData = {
        user_id: user.user_id,
        booking_type: booking_type,
        reference_id: id, // The hotel/flight/car ID
        start_date: '',
        end_date: '',
        total_price: 0
      }

      // Calculate dates and price based on type
      if (type === 'flight') {
        // For flights, use the flight's departure_datetime from the item
        // If not available, try to get date from URL params or use current date as fallback
        let flightDate = null
        const dateParam = searchParams.get('date')
        
        if (item?.departure_datetime) {
          // Use the flight's actual departure datetime
          flightDate = new Date(item.departure_datetime)
        } else if (dateParam) {
          // Use date from URL params (from search)
          const [year, month, day] = dateParam.split('-').map(Number)
          flightDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
        } else {
          // Fallback to current date (shouldn't happen in normal flow)
          flightDate = new Date()
        }
        
        bookingData.start_date = flightDate.toISOString()
        bookingData.end_date = flightDate.toISOString() // Same day for flights
        bookingData.total_price = item?.ticket_price || 0
      } else if (type === 'hotel') {
        if (!formData.checkIn || !formData.checkOut) {
          alert('Please select check-in and check-out dates')
          return
        }
        // Fix timezone issue: use local date at midnight to avoid day shift
        const checkInDate = new Date(formData.checkIn + 'T00:00:00')
        const checkOutDate = new Date(formData.checkOut + 'T00:00:00')
        bookingData.start_date = checkInDate.toISOString()
        bookingData.end_date = checkOutDate.toISOString()
        
        // Calculate total price: price_per_night * number of nights
        const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24))
        bookingData.total_price = (item?.price_per_night || 0) * nights
      } else if (type === 'car') {
        if (!formData.pickupDate || !formData.dropoffDate) {
          alert('Please select pick-up and drop-off dates')
          return
        }
        // Fix timezone issue: use local date at midnight to avoid day shift
        const pickupDate = new Date(formData.pickupDate + 'T00:00:00')
        const dropoffDate = new Date(formData.dropoffDate + 'T00:00:00')
        bookingData.start_date = pickupDate.toISOString()
        bookingData.end_date = dropoffDate.toISOString()
        
        // Calculate total price: price_per_day * number of days
        const days = Math.ceil((dropoffDate - pickupDate) / (1000 * 60 * 60 * 24))
        bookingData.total_price = (item?.daily_rental_price || item?.price_per_day || 0) * days
      }

      const response = await api.post('/bookings', bookingData)
      navigate(`/booking-details/${response.data.data.booking_id || response.data.data._id}`)
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
                            max={getTodayDate()}
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
                        min={getTodayDate()}
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
                        min={formData.checkIn || getTodayDate()}
                        required
                      />
                    </div>
                  </div>
                  <h2>Primary Guest Information</h2>
                  {numGuests > 1 && (
                    <p className="guest-info-note">
                      Booking for {numGuests} guests. Please provide information for the primary guest only.
                    </p>
                  )}
                  <div className="guest-section">
                    <div className="form-row">
                      <div className="form-group">
                        <label>First Name <span className="required">*</span></label>
                        <input
                          type="text"
                          name="firstName"
                          value={formData.guests[0].firstName}
                          onChange={(e) => handleChange(e, 0)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Last Name <span className="required">*</span></label>
                        <input
                          type="text"
                          name="lastName"
                          value={formData.guests[0].lastName}
                          onChange={(e) => handleChange(e, 0)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Age <span className="required">*</span></label>
                        <input
                          type="number"
                          name="age"
                          value={formData.guests[0].age}
                          onChange={(e) => handleChange(e, 0)}
                          required
                          min="1"
                          max="120"
                        />
                      </div>
                    </div>
                  </div>
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
                        min={getTodayDate()}
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
                        min={formData.pickupDate || getTodayDate()}
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
                        max={getTodayDate()}
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
              <h3>
                {type === 'flight' ? (item?.airline || item?.airline_name || 'Flight') : 
                 type === 'hotel' ? (item?.hotel_name || item?.name || 'Hotel') : 
                 (item?.vehicle_model || item?.model || item?.car_model || 'Car')}
              </h3>
              <p>
                {type === 'flight' ? 
                  `${item?.departure_airport || item?.departure?.airportCode || 'N/A'} → ${item?.arrival_airport || item?.arrival?.airportCode || 'N/A'}` : 
                  type === 'hotel' ? 
                    `${item?.address?.city || item?.city || 'N/A'}${item?.address?.state ? `, ${item.address.state}` : ''}${item?.address?.country ? `, ${item.address.country}` : ''}` :
                    `${item?.location?.city || item?.pickup_city || 'N/A'}${item?.location?.state || item?.pickup_state ? `, ${item.location?.state || item.pickup_state}` : ''}${item?.location?.country ? `, ${item.location.country}` : ''}`
                }
              </p>
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

