import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '../../store/hooks'
import api from '../../services/api'
import { addNotification } from '../../store/slices/notificationSlice'
import './AdminDashboard.css'

const AdminListingManagement = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { isAuthenticated, role, userRole } = useAppSelector(state => state.auth)
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [listingType, setListingType] = useState('hotels') // hotels, flights, cars
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingListing, setEditingListing] = useState(null)
  const [formData, setFormData] = useState({})
  const [imagePreview, setImagePreview] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!isAuthenticated || role !== 'admin') {
      navigate('/login')
    } else if (userRole !== 'Super Admin' && userRole !== 'Listing Admin') {
      navigate('/admin/dashboard')
    }
  }, [isAuthenticated, role, userRole, navigate])

  useEffect(() => {
    if (isAuthenticated && role === 'admin' && (userRole === 'Super Admin' || userRole === 'Listing Admin')) {
      setSearchTerm('') 
    }
  }, [listingType, isAuthenticated, role, userRole])

  useEffect(() => {
    if (isAuthenticated && role === 'admin' && (userRole === 'Super Admin' || userRole === 'Listing Admin')) {
      const timeoutId = setTimeout(() => {
        fetchListings()
      }, searchTerm ? 300 : 0) 
      return () => clearTimeout(timeoutId)
    }
  }, [listingType, searchTerm, isAuthenticated, role, userRole])

  const fetchListings = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = { limit: 1000 }
      if (searchTerm && searchTerm.trim()) {
        params.name = searchTerm.trim()
      }
      
      let response
      if (listingType === 'hotels') {
        response = await api.get('/hotels/search', { params })
      } else if (listingType === 'flights') {
        response = await api.get('/flights/search', { params })
      } else if (listingType === 'cars') {
        response = await api.get('/cars/search', { params })
      }
      
      if (response?.data?.success) {
        setListings(response.data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch listings:', err)
      setError(err.response?.data?.error || 'Failed to fetch listings')
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: err.response?.data?.error || 'Failed to fetch listings',
        severity: 'error'
      }))
    } finally {
      setLoading(false)
    }
  }

  const getListingId = (listing) => {
    if (listingType === 'hotels') {
      return listing.hotel_id || listing._id
    } else if (listingType === 'flights') {
      return listing.flight_id || listing._id
    } else if (listingType === 'cars') {
      return listing.car_id || listing._id
    }
    return listing._id || listing.id
  }

  const handleDelete = async (listing) => {
    const listingId = getListingId(listing)
    if (!listingId) {
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: 'Cannot delete: Listing ID not found',
        severity: 'error'
      }))
      return
    }

    if (!window.confirm(`Are you sure you want to delete this ${listingType.slice(0, -1)}?`)) {
      return
    }

    try {
      await api.delete(`/${listingType}/${listingId}`)
      dispatch(addNotification({
        type: 'success',
        title: 'Success',
        message: `${listingType.slice(0, -1)} deleted successfully`,
        severity: 'success'
      }))
      fetchListings()
    } catch (err) {
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: err.response?.data?.error || 'Failed to delete listing',
        severity: 'error'
      }))
    }
  }

  const handleEdit = (listing) => {
    setEditingListing(listing)
    if (listingType === 'hotels') {
      setFormData({
        hotel_id: listing.hotel_id || '',
        name: listing.name || '',
        provider_id: listing.provider_id || '',
        address: {
          street: listing.address?.street || '',
          city: listing.address?.city || '',
          state: listing.address?.state || '',
          zip: listing.address?.zip || ''
        },
        star_rating: listing.star_rating || 1,
        number_of_rooms: listing.number_of_rooms || 1,
        default_room_type: listing.default_room_type || '',
        price_per_night: listing.price_per_night || 0,
        amenities: {
          wifi: listing.amenities?.wifi || false,
          breakfast_included: listing.amenities?.breakfast_included || false,
          parking: listing.amenities?.parking || false,
          pet_friendly: listing.amenities?.pet_friendly || false,
          near_transit: listing.amenities?.near_transit || false,
          pool: listing.amenities?.pool || false,
          gym: listing.amenities?.gym || false
        },
        hotel_rating: listing.hotel_rating || 0,
        image_url: listing.image_url || ''
      })
      setImagePreview(listing.image_url || null)
    } else if (listingType === 'flights') {
      setFormData({
        flight_id: listing.flight_id || '',
        airline_name: listing.airline_name || '',
        provider_id: listing.provider_id || '',
        departure_airport: listing.departure_airport || '',
        departure_city: listing.departure_city || '',
        arrival_airport: listing.arrival_airport || '',
        arrival_city: listing.arrival_city || '',
        departure_datetime: listing.departure_datetime ? new Date(listing.departure_datetime).toISOString().slice(0, 16) : '',
        arrival_datetime: listing.arrival_datetime ? new Date(listing.arrival_datetime).toISOString().slice(0, 16) : '',
        duration_minutes: listing.duration_minutes || 0,
        flight_class: listing.flight_class || 'Economy',
        ticket_price: listing.ticket_price || 0,
        total_available_seats: listing.total_available_seats || 0,
        rating: listing.rating || 0
      })
    } else if (listingType === 'cars') {
      setFormData({
        car_id: listing.car_id || '',
        car_type: listing.car_type || '',
        provider_name: listing.provider_name || '',
        provider_id: listing.provider_id || '',
        model: listing.model || '',
        year: listing.year || new Date().getFullYear(),
        transmission_type: listing.transmission_type || '',
        number_of_seats: listing.number_of_seats || 1,
        daily_rental_price: listing.daily_rental_price || 0,
        car_rating: listing.car_rating || 0,
        availability_status: listing.availability_status || 'Available',
        pickup_city: listing.pickup_city || '',
        image_url: listing.image_url || ''
      })
      setImagePreview(listing.image_url || null)
    }
  }

  const handleAddNew = () => {
    setEditingListing(null)
    if (listingType === 'hotels') {
      setFormData({
        hotel_id: '',
        name: '',
        provider_id: '',
        address: {
          street: '',
          city: '',
          state: '',
          zip: ''
        },
        star_rating: 1,
        number_of_rooms: 1,
        default_room_type: '',
        price_per_night: 0,
        amenities: {
          wifi: false,
          breakfast_included: false,
          parking: false,
          pet_friendly: false,
          near_transit: false,
          pool: false,
          gym: false
        },
        hotel_rating: 0,
        image_url: ''
      })
      setImagePreview(null)
    } else if (listingType === 'flights') {
      setFormData({
        flight_id: '',
        airline_name: '',
        provider_id: '',
        departure_airport: '',
        departure_city: '',
        arrival_airport: '',
        arrival_city: '',
        departure_datetime: '',
        arrival_datetime: '',
        duration_minutes: 0,
        flight_class: 'Economy',
        ticket_price: 0,
        total_available_seats: 0,
        rating: 0
      })

    } else if (listingType === 'cars') {
      setFormData({
        car_id: '',
        car_type: '',
        provider_name: '',
        provider_id: '',
        model: '',
        year: new Date().getFullYear(),
        transmission_type: '',
        number_of_seats: 1,
        daily_rental_price: 0,
        car_rating: 0,
        availability_status: 'Available',
        pickup_city: '',
        image_url: ''
      })
      setImagePreview(null)
    }
    setShowAddModal(true)
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    
    if (name.startsWith('address.')) {
      const field = name.split('.')[1]
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [field]: value
        }
      }))
    } else if (name.startsWith('amenities.')) {
      const field = name.split('.')[1]
      setFormData(prev => ({
        ...prev,
        amenities: {
          ...prev.amenities,
          [field]: checked
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseFloat(value) || 0 : 
                type === 'checkbox' ? checked : value
      }))
    }
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        dispatch(addNotification({
          type: 'error',
          title: 'Invalid File',
          message: 'Please select an image file.',
          severity: 'error'
        }))
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        dispatch(addNotification({
          type: 'error',
          title: 'File Too Large',
          message: 'Image must be less than 5MB.',
          severity: 'error'
        }))
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result
        setImagePreview(base64String)
        setFormData(prev => ({
          ...prev,
          image_url: base64String
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setImagePreview(null)
    setFormData(prev => ({
      ...prev,
      image_url: ''
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    
    try {
      const listingId = editingListing ? getListingId(editingListing) : null
      
      const dataToSave = { ...formData }
      
      if (listingType === 'hotels' && !editingListing) {
        delete dataToSave.hotel_id
      }
      
      if (listingType === 'flights' && !editingListing) {
        delete dataToSave.flight_id
      }
      
      if (listingType === 'flights' && dataToSave.flight_id) {
        dataToSave.flight_id = dataToSave.flight_id.toUpperCase()
      }
      
      if (listingType === 'cars' && !editingListing) {
        delete dataToSave.car_id
      }
      
      if (listingType === 'flights') {
        if (dataToSave.departure_airport) {
          dataToSave.departure_airport = dataToSave.departure_airport.toUpperCase()
        }
        if (dataToSave.arrival_airport) {
          dataToSave.arrival_airport = dataToSave.arrival_airport.toUpperCase()
        }
        if (dataToSave.provider_id) {
          dataToSave.provider_id = dataToSave.provider_id.toUpperCase()
        }
      }
      
      if (listingType === 'cars' && dataToSave.provider_id) {
        dataToSave.provider_id = dataToSave.provider_id.toUpperCase()
      }
      
      if (editingListing) {
        await api.put(`/${listingType}/${listingId}`, dataToSave)
        dispatch(addNotification({
          type: 'success',
          title: 'Success',
          message: `${listingType.slice(0, -1)} updated successfully`,
          severity: 'success'
        }))
      } else {
        await api.post(`/${listingType}`, dataToSave)
        dispatch(addNotification({
          type: 'success',
          title: 'Success',
          message: `${listingType.slice(0, -1)} created successfully`,
          severity: 'success'
        }))
      }
      
      setShowAddModal(false)
      setEditingListing(null)
      setFormData({})
      setImagePreview(null)
      fetchListings()
    } catch (err) {
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: err.response?.data?.error || `Failed to ${editingListing ? 'update' : 'create'} listing`,
        severity: 'error'
      }))
    }
  }

  const renderModal = () => {
    if (!showAddModal && !editingListing) return null

    return (
      <div className="modal-overlay" onClick={() => { setShowAddModal(false); setEditingListing(null); setImagePreview(null) }}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{editingListing ? 'Edit' : 'Add New'} {listingType.slice(0, -1)}</h2>
            <button className="modal-close" onClick={() => { setShowAddModal(false); setEditingListing(null); setImagePreview(null) }}>×</button>
          </div>
          
          <form onSubmit={handleSave} className="modal-form">
            {listingType === 'hotels' && (
              <>
                {editingListing && (
                  <div className="form-group">
                    <label>Hotel ID</label>
                    <input type="text" name="hotel_id" value={formData.hotel_id || ''} disabled style={{ background: '#f3f4f6', cursor: 'not-allowed' }} />
                    <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>Hotel ID cannot be changed</small>
                  </div>
                )}
                <div className="form-group">
                  <label>Name *</label>
                  <input type="text" name="name" value={formData.name || ''} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>Provider ID</label>
                  <input type="text" name="provider_id" value={formData.provider_id || ''} onChange={handleInputChange} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Street *</label>
                    <input type="text" name="address.street" value={formData.address?.street || ''} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>City *</label>
                    <input type="text" name="address.city" value={formData.address?.city || ''} onChange={handleInputChange} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>State *</label>
                    <input type="text" name="address.state" value={formData.address?.state || ''} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>ZIP *</label>
                    <input type="text" name="address.zip" value={formData.address?.zip || ''} onChange={handleInputChange} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Star Rating *</label>
                    <input type="number" name="star_rating" value={formData.star_rating || 1} onChange={handleInputChange} min="1" max="5" required />
                  </div>
                  <div className="form-group">
                    <label>Number of Rooms *</label>
                    <input type="number" name="number_of_rooms" value={formData.number_of_rooms || 1} onChange={handleInputChange} min="1" required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Default Room Type *</label>
                  <input type="text" name="default_room_type" value={formData.default_room_type || ''} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>Price Per Night *</label>
                  <input type="number" name="price_per_night" value={formData.price_per_night || 0} onChange={handleInputChange} min="0" step="0.01" required />
                </div>
                <div className="form-group">
                  <label>Hotel Rating</label>
                  <input type="number" name="hotel_rating" value={formData.hotel_rating || 0} onChange={handleInputChange} min="0" max="5" step="0.1" />
                </div>
                <div className="form-group">
                  <label>Hotel Photo</label>
                  <div className="image-upload-section">
                    {imagePreview ? (
                      <div className="image-preview-container">
                        <img src={imagePreview} alt="Hotel preview" className="image-preview" />
                        <button type="button" onClick={handleRemoveImage} className="btn-remove-image">Remove Photo</button>
                      </div>
                    ) : (
                      <div className="image-upload-placeholder">
                        <label htmlFor="hotel-image-upload" className="btn-upload-image">
                          Upload Photo
                        </label>
                        <input
                          type="file"
                          id="hotel-image-upload"
                          accept="image/*"
                          onChange={handleImageChange}
                          style={{ display: 'none' }}
                        />
                        <p className="image-upload-hint">Select an image file (max 5MB)</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label>Amenities</label>
                  <div className="checkbox-group">
                    <label><input type="checkbox" name="amenities.wifi" checked={formData.amenities?.wifi || false} onChange={handleInputChange} /> WiFi</label>
                    <label><input type="checkbox" name="amenities.breakfast_included" checked={formData.amenities?.breakfast_included || false} onChange={handleInputChange} /> Breakfast</label>
                    <label><input type="checkbox" name="amenities.parking" checked={formData.amenities?.parking || false} onChange={handleInputChange} /> Parking</label>
                    <label><input type="checkbox" name="amenities.pet_friendly" checked={formData.amenities?.pet_friendly || false} onChange={handleInputChange} /> Pet Friendly</label>
                    <label><input type="checkbox" name="amenities.near_transit" checked={formData.amenities?.near_transit || false} onChange={handleInputChange} /> Near Transit</label>
                    <label><input type="checkbox" name="amenities.pool" checked={formData.amenities?.pool || false} onChange={handleInputChange} /> Pool</label>
                    <label><input type="checkbox" name="amenities.gym" checked={formData.amenities?.gym || false} onChange={handleInputChange} /> Gym</label>
                  </div>
                </div>
              </>
            )}

            {listingType === 'flights' && (
              <>
                {editingListing && (
                  <div className="form-group">
                    <label>Flight ID</label>
                    <input type="text" name="flight_id" value={formData.flight_id || ''} disabled style={{ background: '#f3f4f6', cursor: 'not-allowed' }} />
                    <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>Flight ID cannot be changed</small>
                  </div>
                )}
                <div className="form-group">
                  <label>Airline Name *</label>
                  <input type="text" name="airline_name" value={formData.airline_name || ''} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>Provider ID</label>
                  <input type="text" name="provider_id" value={formData.provider_id || ''} onChange={handleInputChange} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Departure Airport *</label>
                    <input type="text" name="departure_airport" value={formData.departure_airport || ''} onChange={handleInputChange} required style={{ textTransform: 'uppercase' }} />
                  </div>
                  <div className="form-group">
                    <label>Departure City</label>
                    <input type="text" name="departure_city" value={formData.departure_city || ''} onChange={handleInputChange} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Arrival Airport *</label>
                    <input type="text" name="arrival_airport" value={formData.arrival_airport || ''} onChange={handleInputChange} required style={{ textTransform: 'uppercase' }} />
                  </div>
                  <div className="form-group">
                    <label>Arrival City</label>
                    <input type="text" name="arrival_city" value={formData.arrival_city || ''} onChange={handleInputChange} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Departure Date/Time *</label>
                    <input type="datetime-local" name="departure_datetime" value={formData.departure_datetime || ''} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>Arrival Date/Time *</label>
                    <input type="datetime-local" name="arrival_datetime" value={formData.arrival_datetime || ''} onChange={handleInputChange} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Duration (minutes) *</label>
                    <input type="number" name="duration_minutes" value={formData.duration_minutes || 0} onChange={handleInputChange} min="0" required />
                  </div>
                  <div className="form-group">
                    <label>Flight Class *</label>
                    <select name="flight_class" value={formData.flight_class || 'Economy'} onChange={handleInputChange} required>
                      <option value="Economy">Economy</option>
                      <option value="Business">Business</option>
                      <option value="First">First</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Ticket Price *</label>
                    <input type="number" name="ticket_price" value={formData.ticket_price || 0} onChange={handleInputChange} min="0" step="0.01" required />
                  </div>
                  <div className="form-group">
                    <label>Total Available Seats *</label>
                    <input type="number" name="total_available_seats" value={formData.total_available_seats || 0} onChange={handleInputChange} min="0" required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Rating</label>
                  <input type="number" name="rating" value={formData.rating || 0} onChange={handleInputChange} min="0" max="5" step="0.1" />
                </div>
              </>
            )}

            {listingType === 'cars' && (
              <>
                {editingListing && (
                  <div className="form-group">
                    <label>Car ID</label>
                    <input type="text" name="car_id" value={formData.car_id || ''} disabled style={{ background: '#f3f4f6', cursor: 'not-allowed' }} />
                    <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>Car ID cannot be changed</small>
                  </div>
                )}
                <div className="form-group">
                  <label>Car Type *</label>
                  <input type="text" name="car_type" value={formData.car_type || ''} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>Provider Name *</label>
                  <input type="text" name="provider_name" value={formData.provider_name || ''} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>Provider ID</label>
                  <input type="text" name="provider_id" value={formData.provider_id || ''} onChange={handleInputChange} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Model *</label>
                    <input type="text" name="model" value={formData.model || ''} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>Year *</label>
                    <input type="number" name="year" value={formData.year || new Date().getFullYear()} onChange={handleInputChange} min="1900" max={new Date().getFullYear() + 1} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Transmission Type *</label>
                    <input type="text" name="transmission_type" value={formData.transmission_type || ''} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>Number of Seats *</label>
                    <input type="number" name="number_of_seats" value={formData.number_of_seats || 1} onChange={handleInputChange} min="1" required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Daily Rental Price *</label>
                    <input type="number" name="daily_rental_price" value={formData.daily_rental_price || 0} onChange={handleInputChange} min="0" step="0.01" required />
                  </div>
                  <div className="form-group">
                    <label>Availability Status *</label>
                    <select name="availability_status" value={formData.availability_status || 'Available'} onChange={handleInputChange} required>
                      <option value="Available">Available</option>
                      <option value="Booked">Booked</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Unavailable">Unavailable</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Pickup City *</label>
                    <input type="text" name="pickup_city" value={formData.pickup_city || ''} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>Car Rating</label>
                    <input type="number" name="car_rating" value={formData.car_rating || 0} onChange={handleInputChange} min="0" max="5" step="0.1" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Car Photo</label>
                  <div className="image-upload-section">
                    {imagePreview ? (
                      <div className="image-preview-container">
                        <img src={imagePreview} alt="Car preview" className="image-preview" />
                        <button type="button" onClick={handleRemoveImage} className="btn-remove-image">Remove Photo</button>
                      </div>
                    ) : (
                      <div className="image-upload-placeholder">
                        <label htmlFor="car-image-upload" className="btn-upload-image">
                          Upload Photo
                        </label>
                        <input
                          type="file"
                          id="car-image-upload"
                          accept="image/*"
                          onChange={handleImageChange}
                          style={{ display: 'none' }}
                        />
                        <p className="image-upload-hint">Select an image file (max 5MB)</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="modal-actions">
              <button type="button" onClick={() => { setShowAddModal(false); setEditingListing(null); setImagePreview(null) }} className="btn-cancel">Cancel</button>
              <button type="submit" className="btn-save">Save</button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || role !== 'admin') {
    return (
      <div className="admin-dashboard">
        <div className="admin-container">
          <div className="error">Please log in as an admin to access this page.</div>
        </div>
      </div>
    )
  }

  if (userRole !== 'Super Admin' && userRole !== 'Listing Admin') {
    return (
      <div className="admin-dashboard">
        <div className="admin-container">
          <div className="admin-header">
            <h1>Listing Management</h1>
            <button onClick={() => navigate('/admin/dashboard')} className="btn-back">← Back to Admin Dashboard</button>
          </div>
          <div className="admin-content">
            <div className="error">Admin access required. You need Super Admin or Listing Admin role to access this page.</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-container">
        <div className="admin-header">
          <h1>Listing Management</h1>
          <button onClick={() => navigate('/admin/dashboard')} className="btn-back">← Back to Admin Dashboard</button>
        </div>

        <div className="admin-content">
          <div className="listing-type-selector">
            <button 
              className={listingType === 'hotels' ? 'active' : ''}
              onClick={() => setListingType('hotels')}
            >
              Hotels
            </button>
            <button 
              className={listingType === 'flights' ? 'active' : ''}
              onClick={() => setListingType('flights')}
            >
              Flights
            </button>
            <button 
              className={listingType === 'cars' ? 'active' : ''}
              onClick={() => setListingType('cars')}
            >
              Cars
            </button>
            <button onClick={handleAddNew} className="btn-add">
              + Add New {listingType.slice(0, -1)}
            </button>
          </div>

          <div className="admin-search-bar" style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder={`Search ${listingType} by ${listingType === 'hotels' ? 'name' : listingType === 'flights' ? 'airline name' : 'model'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 15px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Clear
              </button>
            )}
          </div>

          {loading ? (
            <div className="loading">Loading {listingType}...</div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    {listingType === 'hotels' && <th>Location</th>}
                    {listingType === 'flights' && <th>Route</th>}
                    {listingType === 'cars' && <th>Model</th>}
                    <th>Price</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="no-data">No {listingType} found</td>
                    </tr>
                  ) : (
                    listings.map((listing) => {
                      const id = getListingId(listing)
                      return (
                        <tr key={id}>
                          <td>{id}</td>
                          <td>
                            {listing.name || listing.hotel_name || listing.airline_name || listing.model || 'N/A'}
                          </td>
                          {listingType === 'hotels' && (
                            <td>{listing.address?.city || 'N/A'}</td>
                          )}
                          {listingType === 'flights' && (
                            <td>
                              {listing.departure_airport || listing.departure?.airportCode} → {listing.arrival_airport || listing.arrival?.airportCode}
                            </td>
                          )}
                          {listingType === 'cars' && (
                            <td>{listing.model || 'N/A'}</td>
                          )}
                          <td>
                            ${Math.round(listing.price_per_night || listing.ticket_price || listing.daily_rental_price || 0)}
                          </td>
                          <td>
                            <button onClick={() => { handleEdit(listing); setShowAddModal(true) }} className="btn-edit-small">Edit</button>
                            <button onClick={() => handleDelete(listing)} className="btn-delete-small">Delete</button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {renderModal()}
    </div>
  )
}

export default AdminListingManagement
