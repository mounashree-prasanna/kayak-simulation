import { useState, useEffect } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { useAppSelector } from '../store/hooks'
import api from '../services/api'
import { logPageClick } from '../services/tracking'
import './SearchResults.css'

const CarSearch = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [cars, setCars] = useState([])
  const [carImages, setCarImages] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sortBy, setSortBy] = useState('price')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const cityParam = searchParams.get('city')
  const pickupDateParam = searchParams.get('pickupDate')
  const dropoffDateParam = searchParams.get('dropoffDate')

  // Search form state
  const [searchForm, setSearchForm] = useState({
    city: cityParam || '',
    pickupDate: pickupDateParam ? new Date(pickupDateParam) : null,
    dropoffDate: dropoffDateParam ? new Date(dropoffDateParam) : null
  })

  const city = cityParam
  const pickupDate = pickupDateParam
  const dropoffDate = dropoffDateParam

  const { user } = useAppSelector(state => state.auth)

  useEffect(() => {
    // Log page visit for analytics
    const pagePath = '/cars'
    logPageClick(pagePath, 'car-search-page', user?.user_id || user?._id || null)
    
    fetchCars()
  }, [searchParams, sortBy])

  useEffect(() => {
    // Update form when URL params change
    setSearchForm({
      city: cityParam || '',
      pickupDate: pickupDateParam ? new Date(pickupDateParam) : null,
      dropoffDate: dropoffDateParam ? new Date(dropoffDateParam) : null
    })
  }, [cityParam, pickupDateParam, dropoffDateParam])

  const handleSearchChange = (field, value) => {
    setSearchForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    const params = new URLSearchParams({
      city: searchForm.city
    })
    
    if (searchForm.pickupDate) {
      params.append('pickupDate', searchForm.pickupDate.toISOString().split('T')[0])
    }
    
    if (searchForm.dropoffDate) {
      params.append('dropoffDate', searchForm.dropoffDate.toISOString().split('T')[0])
    }
    
    navigate(`/cars?${params.toString()}`)
  }

  const fetchCars = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Backend expects: city, pickupDate, dropoffDate (optional)
      const params = {}
      if (city) params.city = city
      if (pickupDate) params.pickupDate = pickupDate
      if (dropoffDate) params.dropoffDate = dropoffDate
      
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
      setCurrentPage(1) // Reset to first page on new search
      
      // Fetch images for each car
      const imagesMap = {}
      for (const car of carsData) {
        try {
          // Use car_id (string) instead of _id (ObjectId) since images are linked to car_id
          const carId = car.car_id || car._id
          if (!carId) continue
          
          const imageResponse = await api.get('/images/primary', {
            params: { entity_type: 'Car', entity_id: String(carId) }
          })
          if (imageResponse.data.success && imageResponse.data.data) {
            // Store image URL using both _id and car_id as keys for lookup
            const imageUrl = imageResponse.data.data.image_url
            if (car._id) imagesMap[car._id] = imageUrl
            if (car.car_id) imagesMap[car.car_id] = imageUrl
          }
        } catch (imgErr) {
          // Image not found, use placeholder - only log if it's not a 404
          if (imgErr.response?.status !== 404) {
            console.log(`Error fetching image for car ${car.car_id || car._id}:`, imgErr.message)
          }
        }
      }
      setCarImages(imagesMap)
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
        <div className="search-form-section">
          <h2>Modify Your Search</h2>
          <form onSubmit={handleSearchSubmit} className="inline-search-form">
            <div className="search-form-row">
              <div className="search-form-group">
                <label>Pick-up location</label>
                <input
                  type="text"
                  placeholder="City or airport"
                  value={searchForm.city}
                  onChange={(e) => handleSearchChange('city', e.target.value)}
                  required
                />
              </div>
              <div className="search-form-group">
                <label>Pick-up date</label>
                <DatePicker
                  selected={searchForm.pickupDate}
                  onChange={(date) => handleSearchChange('pickupDate', date)}
                  minDate={new Date()}
                  placeholderText="Select date"
                  dateFormat="MMM dd, yyyy"
                />
              </div>
              <div className="search-form-group">
                <label>Drop-off date</label>
                <DatePicker
                  selected={searchForm.dropoffDate}
                  onChange={(date) => handleSearchChange('dropoffDate', date)}
                  minDate={searchForm.pickupDate || new Date()}
                  placeholderText="Select date"
                  dateFormat="MMM dd, yyyy"
                />
              </div>
            </div>
            <div className="search-form-options">
              <button type="submit" className="btn-search-inline">Update Search</button>
            </div>
          </form>
        </div>

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
            (() => {
              const startIndex = (currentPage - 1) * itemsPerPage
              const endIndex = startIndex + itemsPerPage
              const paginatedCars = cars.slice(startIndex, endIndex)
              return paginatedCars.map((car) => {
              const carId = car._id || car.car_id
              const imageUrl = carImages[carId]
              return (
              <div key={carId} className="result-card hotel-card">
                <div className="hotel-image">
                  {imageUrl ? (
                    <img src={imageUrl} alt={car.model || car.vehicle_model || car.car_model} />
                  ) : (
                    <div className="image-placeholder">🚗</div>
                  )}
                </div>
                <div className="result-main">
                  <div className="hotel-header">
                    <h3>{car.model || car.vehicle_model || car.car_model}</h3>
                  </div>
                  <div className="car-details">
                    <span>{car.car_type || car.vehicle_type}</span>
                    <span>•</span>
                    <span>{car.provider_name || car.company_name || car.rental_company}</span>
                    {car.number_of_seats && <span>•</span>}
                    {car.number_of_seats && <span>{car.number_of_seats} seats</span>}
                  </div>
                  <div className="car-location">
                    {car.pickup_city || car.location?.city}
                    {(car.pickup_state || car.location?.state || car.location?.country) && 
                      `, ${car.pickup_state || car.location?.state || car.location?.country}`
                    }
                  </div>
                </div>
                <div className="result-price">
                  <div className="price">${car.daily_rental_price || car.price_per_day}</div>
                  <div className="price-label">per day</div>
                  <Link 
                    to={`/cars/${carId}`}
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
        
        {cars.length > itemsPerPage && (
          <div className="pagination">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              Previous
            </button>
            <span className="pagination-info">
              Page {currentPage} of {Math.ceil(cars.length / itemsPerPage)} 
              ({cars.length} total cars)
            </span>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(cars.length / itemsPerPage), prev + 1))}
              disabled={currentPage >= Math.ceil(cars.length / itemsPerPage)}
              className="pagination-btn"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default CarSearch

