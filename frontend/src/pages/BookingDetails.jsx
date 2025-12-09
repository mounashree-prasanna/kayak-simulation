import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { useAppSelector } from '../store/hooks'
import api from '../services/api'
import './MyBookings.css'

const BookingDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAppSelector(state => state.auth)
  const [booking, setBooking] = useState(null)
  const [listing, setListing] = useState(null)
  const [billing, setBilling] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    fetchBooking()
  }, [id, isAuthenticated, navigate])

  const fetchBooking = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/bookings/${id}`)
      const bookingData = response.data.data
      setBooking(bookingData)
      
      if (bookingData && bookingData.reference_id) {
        await fetchListingDetails(bookingData)
      }
      
      if (bookingData && bookingData.booking_id) {
        await fetchBillingDetails(bookingData.booking_id || id)
      }
      
      setError(null)
    } catch (err) {
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        setError('Unable to connect to server. Please ensure the backend services are running.')
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to fetch booking details')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchListingDetails = async (bookingData) => {
    try {
      const bookingType = bookingData.booking_type || bookingData.type
      const referenceId = bookingData.reference_id
      
      if (!bookingType || !referenceId) return
      
      let endpoint = ''
      if (bookingType.toLowerCase() === 'flight') {
        endpoint = `/flights/${referenceId}`
      } else if (bookingType.toLowerCase() === 'hotel') {
        endpoint = `/hotels/${referenceId}`
      } else if (bookingType.toLowerCase() === 'car') {
        endpoint = `/cars/${referenceId}`
      }
      
      if (endpoint) {
        const listingResponse = await api.get(endpoint)
        setListing(listingResponse.data.data)
      }
    } catch (err) {
      console.warn('Failed to fetch listing details:', err.message)
    }
  }

  const fetchBillingDetails = async (bookingId) => {
    try {
      const response = await api.get(`/billing/booking/${bookingId}`)
      if (response.data.success && response.data.data) {
        setBilling(response.data.data)
      }
    } catch (err) {
      console.warn('Failed to fetch billing details:', err.message)
    }
  }

  const calculateInvoice = () => {
    if (!booking || !booking.total_price) return null
    
    if (billing && billing.invoice_details) {
      try {
        let invoice = billing.invoice_details
        if (typeof invoice === 'string') {
          invoice = JSON.parse(invoice)
        }
        
        return {
          subtotal: parseFloat(invoice.subtotal || booking.total_price || 0).toFixed(2),
          tax: parseFloat(invoice.tax || 0).toFixed(2),
          total: parseFloat(invoice.total || (parseFloat(booking.total_price || 0) * 1.08)).toFixed(2),
          invoiceNumber: billing.invoice_number,
          paymentMethod: billing.payment_method,
          transactionDate: billing.transaction_date
        }
      } catch (err) {
        console.warn('Error parsing invoice details:', err.message)
      }
    }
    
    const subtotal = parseFloat(booking.total_price) || 0
    const taxRate = 0.08 // 8% tax
    const tax = subtotal * taxRate
    const total = subtotal + tax
    
    return {
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2),
      invoiceNumber: null,
      paymentMethod: null,
      transactionDate: null
    }
  }

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return
    }

    try {
      await api.put(`/bookings/${id}/cancel`)
      fetchBooking()
      alert('Booking cancelled successfully')
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel booking')
    }
  }

  const handlePayment = () => {
    navigate(`/payment/${id}`)
  }

  if (loading) {
    return (
      <div className="my-bookings">
        <div className="container">
          <div className="loading">Loading booking details...</div>
        </div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="my-bookings">
        <div className="container">
          <div className="error">{error || 'Booking not found'}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="my-bookings">
      <div className="container">
        <Link to="/my-bookings" className="back-link">← Back to My Bookings</Link>
        
        <div className="booking-details-page">
          <div className="details-header">
            <div className="details-title-section">
              {listing && (() => {
                const bookingType = booking.type || booking.booking_type
                let displayImage = null
                if (bookingType?.toLowerCase() === 'hotel') {
                  displayImage = listing.image_url || listing.images?.[0]
                } else if (bookingType?.toLowerCase() === 'car') {
                  displayImage = listing.image_url || listing.images?.[0]
                }
                return displayImage ? <img src={displayImage} alt={listing.hotel_name || listing.vehicle_model || ''} className="details-header-image" /> : null
              })()}
              <div>
                <h1>
                  {(() => {
                    const bookingType = booking.type || booking.booking_type
                    if (listing) {
                      if (bookingType?.toLowerCase() === 'hotel') {
                        return listing.hotel_name || listing.name || 'Hotel Booking'
                      } else if (bookingType?.toLowerCase() === 'car') {
                        return listing.vehicle_model || listing.car_model || listing.model || 'Car Rental Booking'
                      } else if (bookingType?.toLowerCase() === 'flight') {
                        return `${listing.airline || listing.airline_name || 'Flight'} Booking`
                      }
                    }
                    return (bookingType === 'flight' || bookingType === 'Flight') ? '✈️ Flight Booking' :
                           (bookingType === 'hotel' || bookingType === 'Hotel') ? '🏨 Hotel Booking' :
                           '🚗 Car Rental Booking'
                  })()}
                </h1>
                <p className="booking-ref">
                  Booking Reference: {booking.booking_reference || booking.booking_id}
                </p>
              </div>
            </div>
            <span className={`status-badge status-${(booking.status || booking.booking_status || '').toLowerCase()}`}>
              {booking.status || booking.booking_status || 'Unknown'}
            </span>
          </div>

          <div className="details-sections">
            {((booking.type === 'flight' || booking.booking_type === 'Flight') && (listing || booking.flight)) && (
              <div className="details-section">
                <h2>Flight Information</h2>
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Airline:</span>
                    <span className="detail-value">{listing?.airline || listing?.airline_name || booking.flight?.airline || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Flight Number:</span>
                    <span className="detail-value">{listing?.flight_number || booking.flight?.flight_number || booking.reference_id}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Route:</span>
                    <span className="detail-value">
                      {listing?.departure_airport || booking.flight?.departure_airport || listing?.departure?.airportCode || 'N/A'} → {listing?.arrival_airport || booking.flight?.arrival_airport || listing?.arrival?.airportCode || 'N/A'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Departure:</span>
                    <span className="detail-value">
                      {listing?.departure_datetime || booking.flight?.departure_datetime || listing?.departure?.dateTime ? 
                        format(new Date(listing.departure_datetime || listing.departure?.dateTime || booking.flight?.departure_datetime), 'MMM dd, yyyy HH:mm') : 
                        booking.start_date ? format(new Date(booking.start_date), 'MMM dd, yyyy HH:mm') : 'N/A'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Arrival:</span>
                    <span className="detail-value">
                      {listing?.arrival_datetime || booking.flight?.arrival_datetime || listing?.arrival?.dateTime ? 
                        format(new Date(listing.arrival_datetime || listing.arrival?.dateTime || booking.flight?.arrival_datetime), 'MMM dd, yyyy HH:mm') : 
                        booking.end_date ? format(new Date(booking.end_date), 'MMM dd, yyyy HH:mm') : 'N/A'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Class:</span>
                    <span className="detail-value">{listing?.flight_class || booking.flight?.flight_class || 'N/A'}</span>
                  </div>
                  {listing?.ticket_price && (
                    <div className="detail-item">
                      <span className="detail-label">Ticket Price:</span>
                      <span className="detail-value">${listing.ticket_price}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {((booking.type === 'hotel' || booking.booking_type === 'Hotel') && (listing || booking.hotel)) && (
              <div className="details-section">
                <h2>Hotel Information</h2>
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Hotel Name:</span>
                    <span className="detail-value">{listing?.hotel_name || listing?.name || booking.hotel?.hotel_name || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Location:</span>
                    <span className="detail-value">
                      {listing?.address?.city || booking.hotel?.address?.city || 'N/A'}, {listing?.address?.state || booking.hotel?.address?.state || listing?.address?.country || booking.hotel?.address?.country || ''}
                    </span>
                  </div>
                  {listing?.address?.street && (
                    <div className="detail-item">
                      <span className="detail-label">Address:</span>
                      <span className="detail-value">
                        {listing.address.street}, {listing.address.city}, {listing.address.state} {listing.address.zip || ''}
                      </span>
                    </div>
                  )}
                  {listing?.star_rating && (
                    <div className="detail-item">
                      <span className="detail-label">Star Rating:</span>
                      <span className="detail-value">{'★'.repeat(listing.star_rating)} ({listing.star_rating} stars)</span>
                    </div>
                  )}
                  {listing?.hotel_rating && (
                    <div className="detail-item">
                      <span className="detail-label">Rating:</span>
                      <span className="detail-value">{listing.hotel_rating.toFixed(1)} / 5.0</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <span className="detail-label">Check-in:</span>
                    <span className="detail-value">
                      {booking.check_in || booking.start_date ? format(new Date(booking.check_in || booking.start_date), 'MMM dd, yyyy') : 'N/A'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Check-out:</span>
                    <span className="detail-value">
                      {booking.check_out || booking.end_date ? format(new Date(booking.check_out || booking.end_date), 'MMM dd, yyyy') : 'N/A'}
                    </span>
                  </div>
                  {listing?.price_per_night && (
                    <div className="detail-item">
                      <span className="detail-label">Price per Night:</span>
                      <span className="detail-value">${listing.price_per_night}</span>
                    </div>
                  )}
                  {listing?.amenities && (
                    <div className="detail-item">
                      <span className="detail-label">Amenities:</span>
                      <span className="detail-value">
                        {Object.entries(listing.amenities)
                          .filter(([key, value]) => value === true)
                          .map(([key]) => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
                          .join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {((booking.type === 'car' || booking.booking_type === 'Car') && (listing || booking.car)) && (
              <div className="details-section">
                <h2>Car Rental Information</h2>
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Vehicle:</span>
                    <span className="detail-value">{listing?.vehicle_model || listing?.car_model || listing?.model || booking.car?.vehicle_model || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Company:</span>
                    <span className="detail-value">{listing?.company_name || listing?.provider_name || listing?.rental_company || booking.car?.company_name || 'N/A'}</span>
                  </div>
                  {(listing?.car_type || listing?.vehicle_type) && (
                    <div className="detail-item">
                      <span className="detail-label">Type:</span>
                      <span className="detail-value">{listing.car_type || listing.vehicle_type}</span>
                    </div>
                  )}
                  {listing?.number_of_seats && (
                    <div className="detail-item">
                      <span className="detail-label">Seats:</span>
                      <span className="detail-value">{listing.number_of_seats}</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <span className="detail-label">Pick-up Location:</span>
                    <span className="detail-value">
                      {listing?.location?.city || listing?.pickup_city || booking.car?.location?.city || 'N/A'}, {listing?.location?.state || listing?.pickup_state || listing?.location?.country || booking.car?.location?.state || ''}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Pick-up Date:</span>
                    <span className="detail-value">
                      {booking.pickup_date || booking.start_date ? format(new Date(booking.pickup_date || booking.start_date), 'MMM dd, yyyy') : 'N/A'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Drop-off Date:</span>
                    <span className="detail-value">
                      {booking.dropoff_date || booking.end_date ? format(new Date(booking.dropoff_date || booking.end_date), 'MMM dd, yyyy') : 'N/A'}
                    </span>
                  </div>
                  {(listing?.daily_rental_price || listing?.price_per_day) && (
                    <div className="detail-item">
                      <span className="detail-label">Price per Day:</span>
                      <span className="detail-value">${listing.daily_rental_price || listing.price_per_day}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {booking.total_price && (() => {
              const invoice = calculateInvoice()
              return invoice ? (
                <div className="details-section">
                  <h2>Payment Information</h2>
                  <div className="payment-summary">
                    {invoice.invoiceNumber && (
                      <div className="invoice-header">
                        <div className="invoice-number">
                          <span className="invoice-label">Invoice Number:</span>
                          <span className="invoice-value">{invoice.invoiceNumber}</span>
                        </div>
                        {invoice.transactionDate && (
                          <div className="invoice-date">
                            <span className="invoice-label">Date:</span>
                            <span className="invoice-value">{format(new Date(invoice.transactionDate), 'MMM dd, yyyy')}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="invoice-breakdown">
                      <div className="invoice-line">
                        <span>Subtotal:</span>
                        <span>${invoice.subtotal}</span>
                      </div>
                      <div className="invoice-line">
                        <span>Tax (8%):</span>
                        <span>${invoice.tax}</span>
                      </div>
                      <div className="invoice-total-line">
                        <span>{(booking.status === 'confirmed' || booking.booking_status === 'Confirmed') ? 'Total Amount Paid:' : 'Total Amount:'}</span>
                        <span className="total-price">${invoice.total}</span>
                      </div>
                    </div>
                    {invoice.paymentMethod && (
                      <div className="payment-method">
                        <span className="payment-label">Payment Method:</span>
                        <span className="payment-value">{invoice.paymentMethod}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : null
            })()}
          </div>

          {booking.status !== 'cancelled' && booking.status !== 'completed' && booking.booking_status !== 'Cancelled' && booking.booking_status !== 'Confirmed' && (
            <div className="booking-actions">
              {(booking.status === 'pending' || booking.booking_status === 'Pending') && (
                <button onClick={handlePayment} className="btn-pay">
                  Complete Payment
                </button>
              )}
              <button onClick={handleCancel} className="btn-cancel">
                Cancel Booking
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BookingDetails

