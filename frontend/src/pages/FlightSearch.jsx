import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { format } from 'date-fns'
import api from '../services/api'
import './SearchResults.css'

const FlightSearch = () => {
  const [searchParams] = useSearchParams()
  const [flights, setFlights] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sortBy, setSortBy] = useState('price')

  const origin = searchParams.get('origin')
  const destination = searchParams.get('destination')
  const date = searchParams.get('date')
  const passengers = searchParams.get('passengers') || 1
  const flightClass = searchParams.get('flightClass') || 'economy'

  useEffect(() => {
    fetchFlights()
  }, [searchParams])

  const fetchFlights = async () => {
    try {
      setLoading(true)
      const params = {
        origin,
        destination,
        date,
        passengers,
        flightClass
      }
      
      const response = await api.get('/flights/search', { params })
      let flightsData = response.data.data || []
      
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
      setError(null)
    } catch (err) {
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        setError('Unable to connect to server. Please ensure the backend services are running.')
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to fetch flights')
      }
      setFlights([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFlights()
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
        <div className="results-header">
          <h1>Flights from {origin} to {destination}</h1>
          {date && <p>{formatDate(date)} • {passengers} {passengers === 1 ? 'passenger' : 'passengers'}</p>}
        </div>

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
            flights.map((flight) => (
              <div key={flight._id || flight.flight_id} className="result-card">
                <div className="result-main">
                  <div className="flight-info">
                    <div className="flight-time">
                      <div className="time">{formatTime(flight.departure_datetime || flight.departure?.dateTime)}</div>
                      <div className="airport">{flight.departure_airport || flight.departure?.airportCode}</div>
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
                    to={`/flights/${flight._id || flight.flight_id}`}
                    className="btn-select"
                  >
                    Select
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default FlightSearch

