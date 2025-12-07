import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '../store/hooks'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { logPageClick } from '../services/tracking'
import './Home.css'

const Home = () => {
  const navigate = useNavigate()
  const { user } = useAppSelector(state => state.auth)
  const [activeTab, setActiveTab] = useState('flights')
  
  // Log page visit for analytics
  useEffect(() => {
    logPageClick('/', 'home-page', user?.user_id || user?._id || null)
  }, [user])
  
  // Flight search state
  const [flightOrigin, setFlightOrigin] = useState('')
  const [flightDestination, setFlightDestination] = useState('')
  const [flightDepartDate, setFlightDepartDate] = useState(null)
  const [flightReturnDate, setFlightReturnDate] = useState(null)
  const [flightPassengers, setFlightPassengers] = useState(1)
  const [flightClass, setFlightClass] = useState('economy')
  const [isRoundTrip, setIsRoundTrip] = useState(false)

  // Hotel search state
  const [hotelCity, setHotelCity] = useState('')
  const [hotelCheckIn, setHotelCheckIn] = useState(null)
  const [hotelCheckOut, setHotelCheckOut] = useState(null)
  const [hotelGuests, setHotelGuests] = useState(2)

  // Car search state
  const [carCity, setCarCity] = useState('')
  const [carPickupDate, setCarPickupDate] = useState(null)
  const [carDropoffDate, setCarDropoffDate] = useState(null)

  // Helper function to format date as YYYY-MM-DD using local timezone (not UTC)
  const formatDateLocal = (date) => {
    if (!date) return null
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleFlightSearch = (e) => {
    e.preventDefault()
    
    // Validate required fields
    const trimmedOrigin = flightOrigin?.trim()
    const trimmedDestination = flightDestination?.trim()
    
    if (!trimmedOrigin || !trimmedDestination) {
      alert('Please provide both origin and destination to search for flights.')
      return
    }
    
    const params = new URLSearchParams({
      origin: trimmedOrigin,
      destination: trimmedDestination,
      passengers: flightPassengers,
      flightClass: flightClass
    })
    
    if (flightDepartDate) {
      params.append('date', formatDateLocal(flightDepartDate))
    }
    
    if (isRoundTrip && flightReturnDate) {
      params.append('returnDate', formatDateLocal(flightReturnDate))
    }
    
    navigate(`/flights?${params.toString()}`)
  }

  const handleHotelSearch = (e) => {
    e.preventDefault()
    const params = new URLSearchParams({
      city: hotelCity,
      guests: hotelGuests
    })
    
    if (hotelCheckIn) {
      params.append('checkIn', formatDateLocal(hotelCheckIn))
    }
    
    if (hotelCheckOut) {
      params.append('checkOut', formatDateLocal(hotelCheckOut))
    }
    
    navigate(`/hotels?${params.toString()}`)
  }

  const handleCarSearch = (e) => {
    e.preventDefault()
    const params = new URLSearchParams({
      city: carCity
    })
    
    if (carPickupDate) {
      params.append('pickupDate', carPickupDate.toISOString().split('T')[0])
    }
    
    if (carDropoffDate) {
      params.append('dropoffDate', carDropoffDate.toISOString().split('T')[0])
    }
    
    navigate(`/cars?${params.toString()}`)
  }

  return (
    <div className="home">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Find your perfect trip</h1>
          <p className="hero-subtitle">Compare prices on flights, hotels, and car rentals</p>
          
          <div className="search-tabs">
            <button
              className={`tab ${activeTab === 'flights' ? 'active' : ''}`}
              onClick={() => setActiveTab('flights')}
            >
              Flights
            </button>
            <button
              className={`tab ${activeTab === 'hotels' ? 'active' : ''}`}
              onClick={() => setActiveTab('hotels')}
            >
              Hotels
            </button>
            <button
              className={`tab ${activeTab === 'cars' ? 'active' : ''}`}
              onClick={() => setActiveTab('cars')}
            >
              Cars
            </button>
          </div>

          <div className="search-form-container">
            {activeTab === 'flights' && (
              <form onSubmit={handleFlightSearch} className="search-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>From</label>
                    <input
                      type="text"
                      placeholder="City (e.g., New York) or Airport (e.g., JFK)"
                      value={flightOrigin}
                      onChange={(e) => setFlightOrigin(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>To</label>
                    <input
                      type="text"
                      placeholder="City (e.g., Los Angeles) or Airport (e.g., LAX)"
                      value={flightDestination}
                      onChange={(e) => setFlightDestination(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Depart</label>
                    <DatePicker
                      selected={flightDepartDate}
                      onChange={(date) => setFlightDepartDate(date)}
                      minDate={new Date()}
                      placeholderText="Select date"
                      dateFormat="MMM dd, yyyy"
                    />
                  </div>
                  {isRoundTrip && (
                    <div className="form-group">
                      <label>Return</label>
                      <DatePicker
                        selected={flightReturnDate}
                        onChange={(date) => setFlightReturnDate(date)}
                        minDate={flightDepartDate || new Date()}
                        placeholderText="Select date"
                        dateFormat="MMM dd, yyyy"
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label>Passengers</label>
                    <select
                      value={flightPassengers}
                      onChange={(e) => setFlightPassengers(parseInt(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5, 6].map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Class</label>
                    <select
                      value={flightClass}
                      onChange={(e) => setFlightClass(e.target.value)}
                    >
                      <option value="economy">Economy</option>
                      <option value="business">Business</option>
                      <option value="first">First</option>
                    </select>
                  </div>
                </div>
                <div className="form-options">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={isRoundTrip}
                      onChange={(e) => setIsRoundTrip(e.target.checked)}
                    />
                    <span>Round trip</span>
                  </label>
                </div>
                <button type="submit" className="btn-search">Search</button>
              </form>
            )}

            {activeTab === 'hotels' && (
              <form onSubmit={handleHotelSearch} className="search-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Destination</label>
                    <input
                      type="text"
                      placeholder="City or hotel name"
                      value={hotelCity}
                      onChange={(e) => setHotelCity(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Check-in</label>
                    <DatePicker
                      selected={hotelCheckIn}
                      onChange={(date) => setHotelCheckIn(date)}
                      minDate={new Date()}
                      placeholderText="Select date"
                      dateFormat="MMM dd, yyyy"
                    />
                  </div>
                  <div className="form-group">
                    <label>Check-out</label>
                    <DatePicker
                      selected={hotelCheckOut}
                      onChange={(date) => setHotelCheckOut(date)}
                      minDate={hotelCheckIn || new Date()}
                      placeholderText="Select date"
                      dateFormat="MMM dd, yyyy"
                    />
                  </div>
                  <div className="form-group">
                    <label>Guests</label>
                    <select
                      value={hotelGuests}
                      onChange={(e) => setHotelGuests(parseInt(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5, 6].map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn-search">Search Hotels</button>
              </form>
            )}

            {activeTab === 'cars' && (
              <form onSubmit={handleCarSearch} className="search-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Pick-up location</label>
                    <input
                      type="text"
                      placeholder="City or airport"
                      value={carCity}
                      onChange={(e) => setCarCity(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Pick-up date</label>
                    <DatePicker
                      selected={carPickupDate}
                      onChange={(date) => setCarPickupDate(date)}
                      minDate={new Date()}
                      placeholderText="Select date"
                      dateFormat="MMM dd, yyyy"
                    />
                  </div>
                  <div className="form-group">
                    <label>Drop-off date</label>
                    <DatePicker
                      selected={carDropoffDate}
                      onChange={(date) => setCarDropoffDate(date)}
                      minDate={carPickupDate || new Date()}
                      placeholderText="Select date"
                      dateFormat="MMM dd, yyyy"
                    />
                  </div>
                </div>
                <button type="submit" className="btn-search">Search Cars</button>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="features-section">
        <div className="container">
          <h2>Why choose Kayak?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">✈️</div>
              <h3>Best Prices</h3>
              <p>Compare prices from hundreds of providers to find the best deals</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Secure Booking</h3>
              <p>Your information is safe and secure with our encrypted booking system</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home

