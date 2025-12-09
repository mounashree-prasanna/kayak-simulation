import { useState, useEffect } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { useAppSelector } from '../store/hooks'
import api from '../services/api'
import { logPageClick } from '../services/tracking'
import './SearchResults.css'

const HotelSearch = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [hotels, setHotels] = useState([])
  const [hotelImages, setHotelImages] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sortBy, setSortBy] = useState('price')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [filters, setFilters] = useState({
    minRating: '',
    maxPrice: '',
    wifi: false,
    breakfast: false,
    parking: false
  })

  const cityParam = searchParams.get('city')
  const checkInParam = searchParams.get('checkIn')
  const checkOutParam = searchParams.get('checkOut')
  const guestsParam = searchParams.get('guests') || 2

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

  // Helper function to format date as YYYY-MM-DD using local timezone (not UTC)
  const formatDateLocal = (date) => {
    if (!date) return null
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Search form state
  const [searchForm, setSearchForm] = useState({
    city: cityParam || '',
    checkIn: checkInParam ? parseDateFromString(checkInParam) : null,
    checkOut: checkOutParam ? parseDateFromString(checkOutParam) : null,
    guests: parseInt(guestsParam) || 2
  })

  const city = cityParam
  const checkIn = checkInParam
  const checkOut = checkOutParam
  const guests = guestsParam

  const { user } = useAppSelector(state => state.auth)

  useEffect(() => {
    const pagePath = '/hotels'
    logPageClick(pagePath, 'hotel-search-page', user?.user_id || user?._id || null)
    
    fetchHotels()
  }, [searchParams, filters, sortBy])

  useEffect(() => {
    setSearchForm({
      city: cityParam || '',
      checkIn: checkInParam ? parseDateFromString(checkInParam) : null,
      checkOut: checkOutParam ? parseDateFromString(checkOutParam) : null,
      guests: parseInt(guestsParam) || 2
    })
  }, [cityParam, checkInParam, checkOutParam, guestsParam])

  const handleSearchChange = (field, value) => {
    setSearchForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    const params = new URLSearchParams({
      city: searchForm.city,
      guests: searchForm.guests
    })
    
    if (searchForm.checkIn) {
      params.append('checkIn', formatDateLocal(searchForm.checkIn))
    }
    
    if (searchForm.checkOut) {
      params.append('checkOut', formatDateLocal(searchForm.checkOut))
    }
    
    navigate(`/hotels?${params.toString()}`)
  }

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
      setCurrentPage(1) 
      
      const imagesMap = {}
      for (const hotel of hotelsData) {
        const hotelId = hotel._id || hotel.hotel_id
        if (!hotelId) continue
        
        if (hotel.image_url) {
          if (hotel._id) imagesMap[hotel._id] = hotel.image_url
          if (hotel.hotel_id) imagesMap[hotel.hotel_id] = hotel.image_url
        } else {
          try {
            const imageResponse = await api.get('/images/primary', {
              params: { entity_type: 'Hotel', entity_id: String(hotel.hotel_id || hotel._id) }
            })
            if (imageResponse.data.success && imageResponse.data.data) {
              const imageUrl = imageResponse.data.data.image_url
              if (hotel._id) imagesMap[hotel._id] = imageUrl
              if (hotel.hotel_id) imagesMap[hotel.hotel_id] = imageUrl
            }
          } catch (imgErr) {
            if (imgErr.response?.status !== 404) {
              console.log(`Error fetching image for hotel ${hotel.hotel_id || hotel._id}:`, imgErr.message)
            }
          }
        }
      }
      setHotelImages(imagesMap)
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
        <div className="search-form-section">
          <h2>Modify Your Search</h2>
          <form onSubmit={handleSearchSubmit} className="inline-search-form">
            <div className="search-form-row">
              <div className="search-form-group">
                <label>Destination</label>
                <input
                  type="text"
                  placeholder="City or hotel name"
                  value={searchForm.city}
                  onChange={(e) => handleSearchChange('city', e.target.value)}
                  required
                />
              </div>
              <div className="search-form-group">
                <label>Check-in</label>
                <DatePicker
                  selected={searchForm.checkIn}
                  onChange={(date) => handleSearchChange('checkIn', date)}
                  minDate={new Date()}
                  placeholderText="Select date"
                  dateFormat="MMM dd, yyyy"
                />
              </div>
              <div className="search-form-group">
                <label>Check-out</label>
                <DatePicker
                  selected={searchForm.checkOut}
                  onChange={(date) => handleSearchChange('checkOut', date)}
                  minDate={searchForm.checkIn || new Date()}
                  placeholderText="Select date"
                  dateFormat="MMM dd, yyyy"
                />
              </div>
              <div className="search-form-group">
                <label>Guests</label>
                <select
                  value={searchForm.guests}
                  onChange={(e) => handleSearchChange('guests', parseInt(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="search-form-options">
              <button type="submit" className="btn-search-inline">Update Search</button>
            </div>
          </form>
        </div>

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
                (() => {
                  const startIndex = (currentPage - 1) * itemsPerPage
                  const endIndex = startIndex + itemsPerPage
                  const paginatedHotels = hotels.slice(startIndex, endIndex)
                  return paginatedHotels.map((hotel) => {
                  // Use _id as primary key for lookup (since that's what we're using as the map key)
                  const hotelId = hotel._id || hotel.hotel_id
                  // Check both the imagesMap and direct image_url field
                  const imageUrl = hotelImages[hotelId] || hotelImages[hotel._id] || hotelImages[hotel.hotel_id] || hotel.image_url
                  const handleImageError = (e) => {
                    e.target.style.display = 'none'
                    e.target.nextSibling?.style?.display === 'none' && (e.target.nextSibling.style.display = 'flex')
                  }
                  return (
                  <div key={hotelId} className="result-card hotel-card">
                    <div className="hotel-image">
                      {imageUrl ? (
                        <>
                          <img 
                            src={imageUrl} 
                            alt={hotel.name || hotel.hotel_name}
                            onError={handleImageError}
                          />
                          <div className="image-placeholder" style={{ display: 'none' }}>🏨</div>
                        </>
                      ) : (
                        <div className="image-placeholder">🏨</div>
                      )}
                    </div>
                    <div className="result-main">
                      <div className="hotel-header">
                        <h3>{hotel.name || hotel.hotel_name}</h3>
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
                        to={`/hotels/${hotel._id || hotel.hotel_id}?${new URLSearchParams({
                          ...(guests ? { guests } : {}),
                          ...(checkIn ? { checkIn } : {}),
                          ...(checkOut ? { checkOut } : {})
                        }).toString()}`}
                        className="btn-select"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                  )
                  })
                })()
              )}
            </div>
            
            {hotels.length > itemsPerPage && (
              <div className="pagination">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  Previous
                </button>
                <span className="pagination-info">
                  Page {currentPage} of {Math.ceil(hotels.length / itemsPerPage)} 
                  ({hotels.length} total hotels)
                </span>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(hotels.length / itemsPerPage), prev + 1))}
                  disabled={currentPage >= Math.ceil(hotels.length / itemsPerPage)}
                  className="pagination-btn"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default HotelSearch

