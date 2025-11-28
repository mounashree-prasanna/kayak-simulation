import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { format } from 'date-fns'
import api from '../services/api'
import './SearchResults.css'

const HotelSearch = () => {
  const [searchParams] = useSearchParams()
  const [hotels, setHotels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sortBy, setSortBy] = useState('price')
  const [filters, setFilters] = useState({
    minRating: '',
    maxPrice: '',
    wifi: false,
    breakfast: false,
    parking: false
  })

  const city = searchParams.get('city')
  const checkIn = searchParams.get('checkIn')
  const checkOut = searchParams.get('checkOut')
  const guests = searchParams.get('guests') || 2

  useEffect(() => {
    fetchHotels()
  }, [searchParams, filters, sortBy])

  const fetchHotels = async () => {
    try {
      setLoading(true)
      const params = {
        city,
        date: checkIn,
        price_min: '',
        price_max: filters.maxPrice || '',
        stars: filters.minRating || '',
        wifi: filters.wifi ? 'true' : '',
        breakfast_included: filters.breakfast ? 'true' : '',
        parking: filters.parking ? 'true' : ''
      }
      
      const response = await api.get('/hotels/search', { params })
      let hotelsData = response.data.data || []
      
      // Sort hotels
      if (sortBy === 'price') {
        hotelsData.sort((a, b) => a.price_per_night - b.price_per_night)
      } else if (sortBy === 'rating') {
        hotelsData.sort((a, b) => b.hotel_rating - a.hotel_rating)
      } else if (sortBy === 'stars') {
        hotelsData.sort((a, b) => b.star_rating - a.star_rating)
      }
      
      setHotels(hotelsData)
      setError(null)
    } catch (err) {
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        setError('Unable to connect to server. Please ensure the backend services are running.')
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to fetch hotels')
      }
      setHotels([])
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className="search-results">
        <div className="container">
          <div className="loading">Loading hotels...</div>
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
          <h1>Hotels in {city}</h1>
          {checkIn && checkOut && (
            <p>
              {format(new Date(checkIn), 'MMM dd')} - {format(new Date(checkOut), 'MMM dd, yyyy')} • 
              {guests} {guests === 1 ? 'guest' : 'guests'}
            </p>
          )}
        </div>

        <div className="results-layout">
          <div className="filters-sidebar">
            <h3>Filters</h3>
            <div className="filter-group">
              <label>Minimum Rating</label>
              <select 
                value={filters.minRating} 
                onChange={(e) => handleFilterChange('minRating', e.target.value)}
              >
                <option value="">Any</option>
                <option value="3">3+ Stars</option>
                <option value="4">4+ Stars</option>
                <option value="5">5 Stars</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Max Price per Night</label>
              <input
                type="number"
                placeholder="$"
                value={filters.maxPrice}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>
                <input
                  type="checkbox"
                  checked={filters.wifi}
                  onChange={(e) => handleFilterChange('wifi', e.target.checked)}
                />
                Free WiFi
              </label>
            </div>
            <div className="filter-group">
              <label>
                <input
                  type="checkbox"
                  checked={filters.breakfast}
                  onChange={(e) => handleFilterChange('breakfast', e.target.checked)}
                />
                Breakfast Included
              </label>
            </div>
            <div className="filter-group">
              <label>
                <input
                  type="checkbox"
                  checked={filters.parking}
                  onChange={(e) => handleFilterChange('parking', e.target.checked)}
                />
                Parking Available
              </label>
            </div>
          </div>

          <div className="results-content">
            <div className="results-controls">
              <div className="sort-controls">
                <label>Sort by:</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="price">Price (Low to High)</option>
                  <option value="rating">Rating (High to Low)</option>
                  <option value="stars">Stars (High to Low)</option>
                </select>
              </div>
              <div className="results-count">
                {hotels.length} {hotels.length === 1 ? 'hotel' : 'hotels'} found
              </div>
            </div>

            <div className="results-list">
              {hotels.length === 0 ? (
                <div className="no-results">
                  <p>No hotels found for your search criteria.</p>
                </div>
              ) : (
                hotels.map((hotel) => (
                  <div key={hotel._id || hotel.hotel_id} className="result-card hotel-card">
                    <div className="hotel-image">
                      <div className="image-placeholder">🏨</div>
                    </div>
                    <div className="result-main">
                      <div className="hotel-header">
                        <h3>{hotel.hotel_name}</h3>
                        <div className="hotel-rating">
                          <span className="stars">{'★'.repeat(hotel.star_rating)}</span>
                          <span className="rating">{hotel.hotel_rating?.toFixed(1) || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="hotel-location">
                        {hotel.address?.city}, {hotel.address?.state || hotel.address?.country}
                      </div>
                      <div className="hotel-amenities">
                        {hotel.amenities?.wifi && <span>WiFi</span>}
                        {hotel.amenities?.breakfast_included && <span>Breakfast</span>}
                        {hotel.amenities?.parking && <span>Parking</span>}
                      </div>
                    </div>
                    <div className="result-price">
                      <div className="price">${hotel.price_per_night}</div>
                      <div className="price-label">per night</div>
                      <Link 
                        to={`/hotels/${hotel._id || hotel.hotel_id}`}
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
      </div>
    </div>
  )
}

export default HotelSearch

