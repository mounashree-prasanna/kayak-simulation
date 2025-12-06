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

  useEffect(() => {
    if (!isAuthenticated || role !== 'admin') {
      navigate('/login')
    } else if (userRole !== 'Super Admin' && userRole !== 'Listing Admin') {
      navigate('/admin/dashboard')
    }
  }, [isAuthenticated, role, userRole, navigate])

  useEffect(() => {
    if (isAuthenticated && role === 'admin' && (userRole === 'Super Admin' || userRole === 'Listing Admin')) {
      fetchListings()
    }
  }, [listingType, isAuthenticated, role, userRole])

  const fetchListings = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // For now, we'll use search endpoints with broad parameters
      // In a real implementation, you'd want a dedicated "get all" endpoint
      let response
      if (listingType === 'hotels') {
        response = await api.get('/hotels/search', { params: { city: 'New York' } })
      } else if (listingType === 'flights') {
        response = await api.get('/flights/search', { params: { origin: 'JFK', destination: 'LAX' } })
      } else if (listingType === 'cars') {
        response = await api.get('/cars/search', { params: { city: 'New York' } })
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

  const handleDelete = async (listing) => {
    if (!window.confirm(`Are you sure you want to delete this ${listingType.slice(0, -1)}?`)) {
      return
    }

    try {
      const id = listing._id || listing[`${listingType.slice(0, -1)}_id`] || listing.id
      await api.delete(`/${listingType}/${id}`)
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
            <button onClick={() => setShowAddModal(true)} className="btn-add">
              + Add New {listingType.slice(0, -1)}
            </button>
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
                    listings.slice(0, 20).map((listing) => {
                      const id = listing._id || listing[`${listingType.slice(0, -1)}_id`] || listing.id
                      return (
                        <tr key={id}>
                          <td>{id}</td>
                          <td>
                            {listing.name || listing.hotel_name || listing.airline_name || listing.vehicle_model || 'N/A'}
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
                            <td>{listing.vehicle_model || listing.car_model || 'N/A'}</td>
                          )}
                          <td>
                            ${listing.price_per_night || listing.ticket_price || listing.daily_rental_price || 'N/A'}
                          </td>
                          <td>
                            <button onClick={() => setEditingListing(listing)} className="btn-edit-small">Edit</button>
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
    </div>
  )
}

export default AdminListingManagement
