import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { format } from 'date-fns'
import api from '../services/api'
import './SearchResults.css'

const CarSearch = () => {
  const [searchParams] = useSearchParams()
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sortBy, setSortBy] = useState('price')

  const city = searchParams.get('city')
  const pickupDate = searchParams.get('pickupDate')
  const dropoffDate = searchParams.get('dropoffDate')

  useEffect(() => {
    fetchCars()
  }, [searchParams, sortBy])

  const fetchCars = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Backend expects: city, date (optional)
      const params = {}
      if (city) params.city = city
      if (pickupDate) params.date = pickupDate
      
      const response = await api.get('/cars/search', { params })
      let carsData = response.data.data || []
      
      // Sort cars - handle both field name variations
      if (sortBy === 'price') {
        carsData.sort((a, b) => (a.daily_rental_price || a.price_per_day || 0) - (b.daily_rental_price || b.price_per_day || 0))
      } else if (sortBy === 'name') {
        carsData.sort((a, b) => {
          const nameA = a.vehicle_model || a.car_model || ''
          const nameB = b.vehicle_model || b.car_model || ''
          return nameA.localeCompare(nameB)
        })
      }
      
      setCars(carsData)
      setError(null)
    } catch (err) {
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        setError('Unable to connect to server. Please ensure the backend services are running.')
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to fetch cars')
      }
      setCars([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="search-results">
        <div className="container">
          <div className="loading">Loading cars...</div>
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
          <h1>Car Rentals in {city}</h1>
          {pickupDate && dropoffDate && (
            <p>
              {format(new Date(pickupDate), 'MMM dd')} - {format(new Date(dropoffDate), 'MMM dd, yyyy')}
            </p>
          )}
        </div>

        <div className="results-controls">
          <div className="sort-controls">
            <label>Sort by:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="price">Price (Low to High)</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
          <div className="results-count">
            {cars.length} {cars.length === 1 ? 'car' : 'cars'} found
          </div>
        </div>

        <div className="results-list">
          {cars.length === 0 ? (
            <div className="no-results">
              <p>No cars found for your search criteria.</p>
            </div>
          ) : (
            cars.map((car) => (
              <div key={car._id || car.car_id} className="result-card">
                <div className="result-main">
                  <div className="car-info">
                    <h3>{car.vehicle_model || car.car_model}</h3>
                    <div className="car-details">
                      <span>{car.car_type || car.vehicle_type}</span>
                      <span>•</span>
                      <span>{car.company_name || car.rental_company}</span>
                      {car.seats && <span>•</span>}
                      {car.seats && <span>{car.seats} seats</span>}
                    </div>
                    <div className="car-location">
                      {car.pickup_city || car.location?.city}, {car.pickup_state || car.location?.state || car.location?.country}
                    </div>
                  </div>
                </div>
                <div className="result-price">
                  <div className="price">${car.daily_rental_price || car.price_per_day}</div>
                  <div className="price-label">per day</div>
                  <Link 
                    to={`/cars/${car._id || car.car_id}`}
                    className="btn-select"
                  >
                    View Details
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

export default CarSearch

