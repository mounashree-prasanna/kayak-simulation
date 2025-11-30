import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { useAppSelector } from '../store/hooks'
import { store } from '../store/store'
import api from '../services/api'
import './Payment.css'

const Payment = () => {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAppSelector(state => state.auth)
  const [booking, setBooking] = useState(null)
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    cardholderName: '',
    expiryDate: '',
    cvv: '',
    paymentMethod: 'Credit Card'
  })

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/payment/' + bookingId)
      return
    }
    fetchBooking()
  }, [bookingId, isAuthenticated, navigate])

  const fetchBooking = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/bookings/${bookingId}`)
      const bookingData = response.data.data
      setBooking(bookingData)
      
      // Fetch listing details
      if (bookingData && bookingData.reference_id) {
        await fetchListingDetails(bookingData)
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

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setPaymentData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const formatCardNumber = (value) => {
    const cleaned = value.replace(/\s+/g, '')
    const chunks = cleaned.match(/.{1,4}/g) || []
    return chunks.join(' ').slice(0, 19)
  }

  const formatExpiryDate = (value) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4)
    }
    return cleaned
  }

  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value)
    setPaymentData(prev => ({ ...prev, cardNumber: formatted }))
  }

  const handleExpiryChange = (e) => {
    const formatted = formatExpiryDate(e.target.value)
    setPaymentData(prev => ({ ...prev, expiryDate: formatted }))
  }

  const handleCvvChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4)
    setPaymentData(prev => ({ ...prev, cvv: value }))
  }

  const calculateInvoice = () => {
    if (!booking || !booking.total_price) return null
    
    const subtotal = parseFloat(booking.total_price) || 0
    const taxRate = 0.08 // 8% tax
    const tax = subtotal * taxRate
    const total = subtotal + tax
    
    return {
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2),
      lineItems: [
        {
          description: `${booking.booking_type || booking.type || 'Booking'} Booking`,
          quantity: 1,
          unitPrice: subtotal.toFixed(2),
          total: subtotal.toFixed(2)
        }
      ]
    }
  }

  const validateForm = () => {
    if (!paymentData.cardNumber.replace(/\s/g, '').match(/^\d{13,19}$/)) {
      return 'Please enter a valid card number (13-19 digits)'
    }
    if (!paymentData.cardholderName.trim()) {
      return 'Please enter cardholder name'
    }
    if (!paymentData.expiryDate.match(/^\d{2}\/\d{2}$/)) {
      return 'Please enter a valid expiry date (MM/YY)'
    }
    const [month, year] = paymentData.expiryDate.split('/')
    if (parseInt(month) < 1 || parseInt(month) > 12) {
      return 'Please enter a valid month (01-12)'
    }
    if (!paymentData.cvv.match(/^\d{3,4}$/)) {
      return 'Please enter a valid CVV (3-4 digits)'
    }
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const validationError = validateForm()
    if (validationError) {
      alert(validationError)
      return
    }

    setSubmitting(true)

    try {
      if (!user || !user.user_id) {
        alert('User information not available. Please log in again.')
        navigate('/login')
        return
      }

      const response = await api.post('/billing/charge', {
        user_id: user.user_id,
        booking_id: booking.booking_id || bookingId,
        payment_method: paymentData.paymentMethod,
        amount: booking.total_price
      })
      
      if (response.data.success) {
        alert('Payment successful! Booking confirmed.')
        navigate('/my-bookings')
      } else {
        alert('Payment failed: ' + (response.data.message || 'Please try again'))
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Payment failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="payment-page">
        <div className="container">
          <div className="loading">Loading payment details...</div>
        </div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="payment-page">
        <div className="container">
          <div className="error">{error || 'Booking not found'}</div>
          <Link to="/my-bookings" className="back-link">← Back to My Bookings</Link>
        </div>
      </div>
    )
  }

  const invoice = calculateInvoice()

  return (
    <div className="payment-page">
      <div className="container">
        <Link to={`/booking-details/${bookingId}`} className="back-link">← Back to Booking Details</Link>
        
        <div className="payment-container">
          <div className="payment-header">
            <h1>Complete Payment</h1>
            <p className="booking-reference">
              Booking Reference: {booking.booking_reference || booking.booking_id}
            </p>
          </div>

          <div className="payment-content">
            <div className="payment-form-section">
              <h2>Payment Information</h2>
              <form onSubmit={handleSubmit} className="payment-form">
                <div className="form-group">
                  <label>Card Number</label>
                  <input
                    type="text"
                    name="cardNumber"
                    value={paymentData.cardNumber}
                    onChange={handleCardNumberChange}
                    placeholder="1234 5678 9012 3456"
                    maxLength="19"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Cardholder Name</label>
                  <input
                    type="text"
                    name="cardholderName"
                    value={paymentData.cardholderName}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Expiry Date</label>
                    <input
                      type="text"
                      name="expiryDate"
                      value={paymentData.expiryDate}
                      onChange={handleExpiryChange}
                      placeholder="MM/YY"
                      maxLength="5"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>CVV</label>
                    <input
                      type="text"
                      name="cvv"
                      value={paymentData.cvv}
                      onChange={handleCvvChange}
                      placeholder="123"
                      maxLength="4"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Payment Method</label>
                  <select
                    name="paymentMethod"
                    value={paymentData.paymentMethod}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                  </select>
                </div>

                <button type="submit" className="btn-submit-payment" disabled={submitting}>
                  {submitting ? 'Processing...' : 'Submit Payment'}
                </button>
              </form>
            </div>

            <div className="invoice-section">
              <h2>Invoice</h2>
              <div className="invoice-box">
                <div className="booking-summary">
                  <h3>
                    {(booking.type === 'hotel' || booking.booking_type === 'Hotel') && '🏨 Hotel Booking'}
                    {(booking.type === 'flight' || booking.booking_type === 'Flight') && '✈️ Flight Booking'}
                    {(booking.type === 'car' || booking.booking_type === 'Car') && '🚗 Car Rental'}
                  </h3>
                  
                  {listing && (
                    <div className="booking-item-details">
                      <p className="item-name">
                        {listing.hotel_name || listing.name || listing.airline || listing.airline_name || listing.vehicle_model || listing.car_model || 'Booking'}
                      </p>
                      {(listing.address || listing.location) && (
                        <p className="item-location">
                          {listing.address?.city || listing.location?.city || ''}, {listing.address?.state || listing.location?.state || ''}
                        </p>
                      )}
                      {(booking.check_in || booking.start_date) && (
                        <p className="item-dates">
                          {format(new Date(booking.check_in || booking.start_date), 'MMM dd, yyyy')}
                          {booking.check_out && ` - ${format(new Date(booking.check_out), 'MMM dd, yyyy')}`}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {invoice && (
                  <div className="invoice-details">
                    <div className="invoice-line">
                      <span>Subtotal:</span>
                      <span>${invoice.subtotal}</span>
                    </div>
                    <div className="invoice-line">
                      <span>Tax (8%):</span>
                      <span>${invoice.tax}</span>
                    </div>
                    <div className="invoice-total">
                      <span>Total:</span>
                      <span>${invoice.total}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Payment

