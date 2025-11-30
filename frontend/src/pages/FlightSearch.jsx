import { useState, useEffect } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import api from '../services/api'
import './SearchResults.css'

const FlightSearch = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [flights, setFlights] = useState([])
  const [flightImages, setFlightImages] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sortBy, setSortBy] = useState('price')

  const originParam = searchParams.get('origin')
  const destinationParam = searchParams.get('destination')
  const dateParam = searchParams.get('date')
  const passengersParam = searchParams.get('passengers') || 1
  const flightClassParam = searchParams.get('flightClass') || 'economy'
  const returnDateParam = searchParams.get('returnDate')

  // Helper to parse date from YYYY-MM-DD string without timezone issues
  const parseDateFromString = (dateString) => {
    if (!dateString) return null
    // Parse YYYY-MM-DD format as local date (not UTC)
    const [year, month, day] = dateString.split('-').map(Number)
    if (year && month && day) {
      return new Date(year, month - 1, day)
    }
    return null
  }

  // Search form state
  const [searchForm, setSearchForm] = useState({
    origin: originParam || '',
    destination: destinationParam || '',
    date: dateParam ? parseDateFromString(dateParam) : null,
    returnDate: returnDateParam ? parseDateFromString(returnDateParam) : null,
    passengers: parseInt(passengersParam) || 1,
    flightClass: flightClassParam || 'economy',
    isRoundTrip: !!returnDateParam
  })

  const origin = originParam
  const destination = destinationParam
  const date = dateParam
  const passengers = passengersParam
  const flightClass = flightClassParam

  useEffect(() => {
    // Only fetch flights if we have required search parameters
    if (originParam && destinationParam) {
      fetchFlights()
    } else {
      // If no search params, don't show error, just show empty state
      setLoading(false)
      setFlights([])
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    // Update form when URL params change
    setSearchForm({
      origin: originParam || '',
      destination: destinationParam || '',
      date: dateParam ? parseDateFromString(dateParam) : null,
      returnDate: returnDateParam ? parseDateFromString(returnDateParam) : null,
      passengers: parseInt(passengersParam) || 1,
      flightClass: flightClassParam || 'economy',
      isRoundTrip: !!returnDateParam
    })
  }, [originParam, destinationParam, dateParam, returnDateParam, passengersParam, flightClassParam])

  const handleSearchChange = (field, value) => {
    setSearchForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Helper function to format date as YYYY-MM-DD using local timezone (not UTC)
  const formatDateLocal = (date) => {
    if (!date) return null
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    const params = new URLSearchParams({
      origin: searchForm.origin,
      destination: searchForm.destination,
      passengers: searchForm.passengers,
      flightClass: searchForm.flightClass
    })
    
    if (searchForm.date) {
      params.append('date', formatDateLocal(searchForm.date))
    }
    
    if (searchForm.isRoundTrip && searchForm.returnDate) {
      params.append('returnDate', formatDateLocal(searchForm.returnDate))
    }
    
    navigate(`/flights?${params.toString()}`)
  }

  const fetchFlights = async () => {
    // Validate required fields before making API call
    if (!origin || !origin.trim() || !destination || !destination.trim()) {
      setLoading(false)
      setError('Please provide both origin and destination to search for flights.')
      setFlights([])
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      // Build params object, only including non-empty values
      const params = {}
      if (origin && origin.trim()) params.origin = origin.trim()
      if (destination && destination.trim()) params.destination = destination.trim()
      if (date) {
        // Ensure date is in YYYY-MM-DD format using local timezone
        const dateObj = date instanceof Date ? date : new Date(date)
        if (!isNaN(dateObj.getTime())) {
          // Use local date components, not UTC, to avoid timezone shifts
          const year = dateObj.getFullYear()
          const month = String(dateObj.getMonth() + 1).padStart(2, '0')
          const day = String(dateObj.getDate()).padStart(2, '0')
          params.date = `${year}-${month}-${day}`
        }
      }
      if (passengers) params.passengers = passengers
      if (flightClass) params.flightClass = flightClass
      
      console.log('[FlightSearch] Fetching flights with params:', params)
      
      const response = await api.get('/flights/search', { params })
      let flightsData = response.data.data || []
      
      console.log(`[FlightSearch] Received ${flightsData.length} flights from API`)
      
      // Sort flights - handle both field name variations
      if (sortBy === 'price') {
        flightsData.sort((a, b) => (a.ticket_price || 0) - (b.ticket_price || 0))
      } else if (sortBy === 'duration') {
        flightsData.sort((a, b) => {
          const depA = a.departure_datetime || a.departure?.dateTime
          const arrA = a.arrival_datetime || a.arrival?.dateTime
          const depB = b.departure_datetime || b.departure?.dateTime
          const arrB = b.arrival_datetime || b.arrival?.dateTime
          const durationA = new Date(arrA) - new Date(depA)
          const durationB = new Date(arrB) - new Date(depB)
          return durationA - durationB
        })
      } else if (sortBy === 'departure') {
        flightsData.sort((a, b) => {
          const depA = a.departure_datetime || a.departure?.dateTime
          const depB = b.departure_datetime || b.departure?.dateTime
          return new Date(depA) - new Date(depB)
        })
      }
      
      setFlights(flightsData)
      
      // Fetch images for each flight
      const imagesMap = {}
      for (const flight of flightsData) {
        try {
          const flightId = flight._id || flight.flight_id
          if (!flightId) continue
          
          const imageResponse = await api.get('/images/primary', {
            params: { entity_type: 'Flight', entity_id: String(flightId) }
          })
          if (imageResponse.data.success && imageResponse.data.data) {
            const imageUrl = imageResponse.data.data.image_url
            if (flight._id) imagesMap[flight._id] = imageUrl
            if (flight.flight_id) imagesMap[flight.flight_id] = imageUrl
          }
        } catch (imgErr) {
          // Image not found, use placeholder - only log if it's not a 404
          if (imgErr.response?.status !== 404) {
            console.log(`Error fetching image for flight ${flight.flight_id || flight._id}:`, imgErr.message)
          }
        }
      }
      setFlightImages(imagesMap)
      setError(null)
    } catch (err) {
      console.error('[FlightSearch] Error fetching flights:', err)
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        setError('Unable to connect to server. Please ensure the backend services are running.')
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.error || 'Invalid search parameters. Please check your search criteria.')
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to fetch flights')
      }
      setFlights([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Only refetch if we have valid search params
    if (originParam && destinationParam) {
      fetchFlights()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy])

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      return format(new Date(dateString), 'HH:mm')
    } catch {
      return 'N/A'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    try {
      return format(new Date(dateString), 'MMM dd, yyyy')
    } catch {
      return dateString
    }
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

  if (loading) {
    return (
      <div className="search-results">
        <div className="container">
          <div className="loading">Loading flights...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="search-results">
        <div className="container">
          <div className="error">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="search-results">
      <div className="container">
        <div className="search-form-section">
          <h2>Modify Your Search</h2>
          <form onSubmit={handleSearchSubmit} className="inline-search-form">
            <div className="search-form-row">
              <div className="search-form-group">
                <label>From</label>
                <input
                  type="text"
                  placeholder="City (e.g., New York) or Airport (e.g., JFK)"
                  value={searchForm.origin}
                  onChange={(e) => handleSearchChange('origin', e.target.value)}
                  required
                />
              </div>
              <div className="search-form-group">
                <label>To</label>
                <input
                  type="text"
                  placeholder="City (e.g., Los Angeles) or Airport (e.g., LAX)"
                  value={searchForm.destination}
                  onChange={(e) => handleSearchChange('destination', e.target.value)}
                  required
                />
              </div>
              <div className="search-form-group">
                <label>Depart</label>
                <DatePicker
                  selected={searchForm.date}
                  onChange={(date) => handleSearchChange('date', date)}
                  minDate={new Date()}
                  placeholderText="Select date"
                  dateFormat="MMM dd, yyyy"
                />
              </div>
              {searchForm.isRoundTrip && (
                <div className="search-form-group">
                  <label>Return</label>
                  <DatePicker
                    selected={searchForm.returnDate}
                    onChange={(date) => handleSearchChange('returnDate', date)}
                    minDate={searchForm.date || new Date()}
                    placeholderText="Select date"
                    dateFormat="MMM dd, yyyy"
                  />
                </div>
              )}
              <div className="search-form-group">
                <label>Passengers</label>
                <select
                  value={searchForm.passengers}
                  onChange={(e) => handleSearchChange('passengers', parseInt(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>
              <div className="search-form-group">
                <label>Class</label>
                <select
                  value={searchForm.flightClass}
                  onChange={(e) => handleSearchChange('flightClass', e.target.value)}
                >
                  <option value="economy">Economy</option>
                  <option value="business">Business</option>
                  <option value="first">First</option>
                </select>
              </div>
            </div>
            <div className="search-form-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={searchForm.isRoundTrip}
                  onChange={(e) => handleSearchChange('isRoundTrip', e.target.checked)}
                />
                <span>Round trip</span>
              </label>
              <button type="submit" className="btn-search-inline">Update Search</button>
            </div>
          </form>
        </div>

        <div className="results-header">
          <h1>Flights from {origin} to {destination}</h1>
          <p>
            {date ? formatDate(date) : (flights.length > 0 && flights[0].departure_datetime ? formatDate(flights[0].departure_datetime) : '')}
            {date || (flights.length > 0 && flights[0].departure_datetime) ? ' • ' : ''}
            {passengers} {passengers === 1 ? 'passenger' : 'passengers'}
          </p>
        </div>

        <div className="results-content">
          <div className="results-controls">
            <div className="sort-controls">
              <label>Sort by:</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="price">Price (Low to High)</option>
                <option value="departure">Departure Time</option>
                <option value="duration">Duration</option>
              </select>
            </div>
            <div className="results-count">
              {flights.length} {flights.length === 1 ? 'flight' : 'flights'} found
            </div>
          </div>

          <div className="results-list">
            {flights.length === 0 ? (
              <div className="no-results">
                <p>No flights found for your search criteria.</p>
                <p>Try adjusting your search parameters.</p>
              </div>
            ) : (
              flights.map((flight) => {
                const flightId = flight._id || flight.flight_id
                const imageUrl = flightImages[flightId]
                return (
                  <div key={flightId} className="result-card flight-card">
                    <div className="flight-image">
                      {imageUrl ? (
                        <img src={imageUrl} alt={flight.airline || flight.airline_name} />
                      ) : (
                        <div className="image-placeholder">✈️</div>
                      )}
                    </div>
                    <div className="result-main">
                      <div className="flight-info">
                        <div className="flight-time">
                          <div className="time">{formatTime(flight.departure_datetime || flight.departure?.dateTime)}</div>
                          <div className="airport">{flight.departure_airport || flight.departure?.airportCode}</div>
                          {(flight.departure_datetime || flight.departure?.dateTime) && (
                            <div className="date" style={{ fontSize: '0.85em', color: '#666', marginTop: '4px' }}>
                              {formatDate(flight.departure_datetime || flight.departure?.dateTime)}
                            </div>
                          )}
                        </div>
                        <div className="flight-duration">
                          <div className="duration-line">
                            <span>{calculateDuration(
                              flight.departure_datetime || flight.departure?.dateTime,
                              flight.arrival_datetime || flight.arrival?.dateTime
                            )}</span>
                          </div>
                        </div>
                        <div className="flight-time">
                          <div className="time">{formatTime(flight.arrival_datetime || flight.arrival?.dateTime)}</div>
                          <div className="airport">{flight.arrival_airport || flight.arrival?.airportCode}</div>
                          {(flight.arrival_datetime || flight.arrival?.dateTime) && (
                            <div className="date" style={{ fontSize: '0.85em', color: '#666', marginTop: '4px' }}>
                              {formatDate(flight.arrival_datetime || flight.arrival?.dateTime)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flight-details">
                        <div className="airline">{flight.airline || flight.airline_name}</div>
                        <div className="flight-number">{flight.flight_number}</div>
                        <div className="flight-class">{flight.flight_class || flight.class}</div>
                      </div>
                    </div>
                    <div className="result-price">
                      <div className="price">${flight.ticket_price || flight.price || 0}</div>
                      <div className="price-label">per person</div>
                      <Link 
                        to={`/flights/${flightId}${date ? '?date=' + date : ''}`}
                        className="btn-select"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default FlightSearch

