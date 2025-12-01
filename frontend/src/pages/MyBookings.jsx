import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { useAppSelector } from '../store/hooks'
import api from '../services/api'
import ReviewModal from '../components/ReviewModal/ReviewModal'
import './MyBookings.css'

const MyBookings = () => {
  const { user, isAuthenticated, loading: authLoading } = useAppSelector(state => state.auth)
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [reviewModal, setReviewModal] = useState({ isOpen: false, booking: null, listing: null })
  const [userReviews, setUserReviews] = useState({}) // Map of entity_id -> review
  const [listingDetails, setListingDetails] = useState({}) // Map of reference_id -> listing details
  const [listingImages, setListingImages] = useState({}) // Map of reference_id -> images

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login')
      return
    }
    if (isAuthenticated && user) {
      fetchBookings()
      fetchUserReviews()
    }
  }, [isAuthenticated, authLoading, user, navigate, filter])

  const fetchUserReviews = async () => {
    if (!user) return
    try {
      const response = await api.get(`/reviews?user_id=${user.user_id || user._id}`)
      const reviews = response.data.data || []
      const reviewsMap = {}
      reviews.forEach(review => {
        const key = `${review.entity_type}_${review.entity_id}`
        reviewsMap[key] = review
      })
      setUserReviews(reviewsMap)
    } catch (err) {
      console.warn('Failed to fetch user reviews:', err.message)
    }
  }

  const fetchListingDetails = async (booking) => {
    const bookingType = booking.type || booking.booking_type
    const referenceId = booking.reference_id
    
    if (!bookingType || !referenceId) return null
    
    try {
      let endpoint = ''
      if (bookingType.toLowerCase() === 'flight') {
        endpoint = `/flights/${referenceId}`
      } else if (bookingType.toLowerCase() === 'hotel') {
        endpoint = `/hotels/${referenceId}`
      } else if (bookingType.toLowerCase() === 'car') {
        endpoint = `/cars/${referenceId}`
      }
      
      if (endpoint) {
        const response = await api.get(endpoint)
        const listing = response.data.data
        
        // Fetch images
        try {
          const entityType = bookingType.charAt(0).toUpperCase() + bookingType.slice(1).toLowerCase()
          const entityId = listing[`${bookingType.toLowerCase()}_id`] || listing._id || referenceId
          const imageResponse = await api.get('/images', {
            params: { entity_type: entityType, entity_id: String(entityId) }
          })
          if (imageResponse.data.success && imageResponse.data.data) {
            const images = imageResponse.data.data.map(img => img.image_url)
            setListingImages(prev => ({ ...prev, [referenceId]: images }))
          }
        } catch (imgErr) {
          // Images not found, continue without them
        }
        
        return listing
      }
    } catch (err) {
      console.warn(`Failed to fetch listing for ${bookingType} ${referenceId}:`, err.message)
      return null
    }
  }

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const params = filter !== 'all' ? { status: filter } : {}
      // Try different endpoint formats
      let response
      try {
        response = await api.get(`/bookings/users/${user.user_id || user._id}/bookings`, { params })
      } catch (err) {
        // Fallback: try to get all bookings and filter client-side
        response = await api.get('/bookings', { params })
        if (response.data.data) {
          // Filter by user if needed
          response.data.data = response.data.data.filter(b => 
            b.user_id === (user.user_id || user._id) || 
            b.user === (user.user_id || user._id)
          )
        }
      }
      const bookingsData = response.data.data || []
      setBookings(bookingsData)
      setError(null)
      
      // Fetch listing details for each booking
      const detailsMap = {}
      const fetchPromises = bookingsData.map(async (booking) => {
        const listing = await fetchListingDetails(booking)
        if (listing) {
          detailsMap[booking.reference_id] = listing
        }
      })
      await Promise.all(fetchPromises)
      setListingDetails(detailsMap)
    } catch (err) {
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        setError('Unable to connect to server. Please ensure the backend services are running.')
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to fetch bookings')
      }
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return
    }

    try {
      await api.put(`/bookings/${bookingId}/cancel`)
      fetchBookings()
      alert('Booking cancelled successfully')
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel booking')
    }
  }

  const handleWriteReview = async (booking) => {
    try {
      // Fetch listing details
      const bookingType = booking.type || booking.booking_type
      const referenceId = booking.reference_id
      
      if (!bookingType || !referenceId) {
        alert('Unable to load listing details for review')
        return
      }

      let endpoint = ''
      if (bookingType.toLowerCase() === 'flight') {
        endpoint = `/flights/${referenceId}`
      } else if (bookingType.toLowerCase() === 'hotel') {
        endpoint = `/hotels/${referenceId}`
      } else if (bookingType.toLowerCase() === 'car') {
        endpoint = `/cars/${referenceId}`
      }

      if (!endpoint) {
        alert('Invalid booking type')
        return
      }

      const listingResponse = await api.get(endpoint)
      const listing = listingResponse.data.data

      // Get listing name
      let listingName = ''
      if (bookingType.toLowerCase() === 'flight') {
        listingName = `${listing.airline || listing.airline_name} - ${listing.flight_number || referenceId}`
      } else if (bookingType.toLowerCase() === 'hotel') {
        listingName = listing.hotel_name || listing.name || 'Hotel'
      } else if (bookingType.toLowerCase() === 'car') {
        listingName = listing.vehicle_model || listing.car_model || listing.model || 'Car Rental'
      }

      setReviewModal({
        isOpen: true,
        booking: booking,
        listing: {
          ...listing,
          name: listingName,
          type: bookingType
        }
      })
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to load listing details')
    }
  }

  const handleSubmitReview = async (reviewData) => {
    if (!reviewModal.booking || !user) return

    const bookingType = reviewModal.booking.type || reviewModal.booking.booking_type
    const entityType = bookingType.charAt(0).toUpperCase() + bookingType.slice(1).toLowerCase()
    const entityId = reviewModal.booking.reference_id

    try {
      await api.post('/reviews', {
        user_id: user.user_id || user._id,
        user_ref: user._id || user.user_id,
        entity_type: entityType,
        entity_id: entityId,
        rating: reviewData.rating,
        title: reviewData.title,
        comment: reviewData.comment
      })

      // Refresh user reviews
      await fetchUserReviews()
      alert('Review submitted successfully!')
    } catch (err) {
      throw err
    }
  }

  const hasUserReviewed = (booking) => {
    if (!user) return false
    const bookingType = booking.type || booking.booking_type
    const entityType = bookingType.charAt(0).toUpperCase() + bookingType.slice(1).toLowerCase()
    const entityId = booking.reference_id
    const key = `${entityType}_${entityId}`
    return !!userReviews[key]
  }

  const canWriteReview = (booking) => {
    const status = (booking.status || booking.booking_status || '').toLowerCase()
    const isConfirmed = status === 'confirmed' || status === 'completed'
    return isConfirmed && !hasUserReviewed(booking)
  }

  if (authLoading || loading) {
    return (
      <div className="my-bookings">
        <div className="container">
          <div className="loading">Loading bookings...</div>
        </div>
      </div>
    )
  }

  if (error && bookings.length === 0) {
    return (
      <div className="my-bookings">
        <div className="container">
          <div className="error">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="my-bookings">
      <div className="container">
        <h1>My Bookings</h1>

        <div className="bookings-controls">
          <div className="filter-tabs">
            <button
              className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={`filter-tab ${filter === 'confirmed' ? 'active' : ''}`}
              onClick={() => setFilter('confirmed')}
            >
              Confirmed
            </button>
            <button
              className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
              onClick={() => setFilter('pending')}
            >
              Pending
            </button>
            <button
              className={`filter-tab ${filter === 'cancelled' ? 'active' : ''}`}
              onClick={() => setFilter('cancelled')}
            >
              Cancelled
            </button>
          </div>
        </div>

        <div className="bookings-list">
          {bookings.length === 0 ? (
            <div className="no-bookings">
              <p>No bookings found.</p>
              <Link to="/" className="btn-search">Start Searching</Link>
            </div>
          ) : (
            bookings.map((booking) => {
              const listing = listingDetails[booking.reference_id]
              const images = listingImages[booking.reference_id] || []
              const bookingType = booking.type || booking.booking_type
              
              // Get name and image
              let displayName = ''
              let displayImage = null
              
              if (listing) {
                if (bookingType?.toLowerCase() === 'hotel') {
                  displayName = listing.hotel_name || listing.name || 'Hotel'
                  displayImage = images[0] || listing.image_url || listing.images?.[0]
                } else if (bookingType?.toLowerCase() === 'car') {
                  displayName = listing.vehicle_model || listing.car_model || listing.model || 'Car Rental'
                  displayImage = images[0] || listing.image_url || listing.images?.[0]
                } else if (bookingType?.toLowerCase() === 'flight') {
                  displayName = `${listing.airline || listing.airline_name || 'Flight'} - ${listing.flight_number || booking.reference_id}`
                }
              } else {
                // Fallback to booking data
                if (bookingType?.toLowerCase() === 'hotel') {
                  displayName = booking.hotel?.hotel_name || 'Hotel'
                } else if (bookingType?.toLowerCase() === 'car') {
                  displayName = booking.car?.vehicle_model || 'Car Rental'
                } else if (bookingType?.toLowerCase() === 'flight') {
                  displayName = booking.flight?.airline || 'Flight'
                }
              }
              
              return (
              <div key={booking._id || booking.booking_id} className="booking-card">
                <div className="booking-header">
                  <div className="booking-title-section">
                    {displayImage && (
                      <img src={displayImage} alt={displayName} className="booking-image" />
                    )}
                    <div>
                      <h3 className="booking-title">{displayName}</h3>
                      <p className="booking-ref">
                        Booking Reference: {booking.booking_reference || booking.booking_id}
                      </p>
                    </div>
                  </div>
                  <span className={`status-badge status-${booking.status}`}>
                    {booking.status}
                  </span>
                </div>

                <div className="booking-details">
                  {bookingType?.toLowerCase() === 'flight' && (booking.flight || listing) && (
                    <div>
                      <p><strong>Route:</strong> {(listing?.departure_airport || booking.flight?.departure_airport) || 'N/A'} → {(listing?.arrival_airport || booking.flight?.arrival_airport) || 'N/A'}</p>
                      <p><strong>Date:</strong> {format(new Date(booking.flight?.departure_datetime || booking.start_date), 'MMM dd, yyyy')}</p>
                      <p><strong>Airline:</strong> {listing?.airline || listing?.airline_name || booking.flight?.airline || 'N/A'}</p>
                    </div>
                  )}
                  {bookingType?.toLowerCase() === 'hotel' && (booking.hotel || listing) && (
                    <div>
                      <p><strong>Location:</strong> {(listing?.address?.city || booking.hotel?.address?.city) || 'N/A'}, {(listing?.address?.state || booking.hotel?.address?.state) || 'N/A'}</p>
                      {(booking.check_in || booking.start_date) && (booking.check_out || booking.end_date) && (
                        <p>
                          <strong>Dates:</strong> {format(new Date(booking.check_in || booking.start_date), 'MMM dd')} - {format(new Date(booking.check_out || booking.end_date), 'MMM dd, yyyy')}
                        </p>
                      )}
                    </div>
                  )}
                  {bookingType?.toLowerCase() === 'car' && (booking.car || listing) && (
                    <div>
                      <p><strong>Company:</strong> {listing?.company_name || booking.car?.company_name || 'N/A'}</p>
                      {(booking.pickup_date || booking.start_date) && (booking.dropoff_date || booking.end_date) && (
                        <p>
                          <strong>Dates:</strong> {format(new Date(booking.pickup_date || booking.start_date), 'MMM dd')} - {format(new Date(booking.dropoff_date || booking.end_date), 'MMM dd, yyyy')}
                        </p>
                      )}
                    </div>
                  )}
                  {booking.total_price && (
                    <p className="booking-price">
                      <strong>Total:</strong> ${typeof booking.total_price === 'number' ? booking.total_price.toFixed(2) : parseFloat(booking.total_price || 0).toFixed(2)}
                    </p>
                  )}
                </div>

                <div className="booking-actions">
                  <Link to={`/booking-details/${booking._id || booking.booking_id}`} className="btn-view">
                    View Details
                  </Link>
                  {canWriteReview(booking) && (
                    <button
                      onClick={() => handleWriteReview(booking)}
                      className="btn-review"
                    >
                      Write Review
                    </button>
                  )}
                  {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                    <button
                      onClick={() => handleCancel(booking._id || booking.booking_id)}
                      className="btn-cancel"
                    >
                      Cancel Booking
                    </button>
                  )}
                </div>
              </div>
              )
            })
          )}
        </div>
      </div>

      {reviewModal.isOpen && reviewModal.booking && reviewModal.listing && (
        <ReviewModal
          isOpen={reviewModal.isOpen}
          onClose={() => setReviewModal({ isOpen: false, booking: null, listing: null })}
          onSubmit={handleSubmitReview}
          entityType={reviewModal.listing.type}
          entityName={reviewModal.listing.name}
        />
      )}
    </div>
  )
}

export default MyBookings

