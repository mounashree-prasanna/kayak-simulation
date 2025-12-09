import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { updateUser } from '../store/slices/authSlice'
import { addNotification } from '../store/slices/notificationSlice'
import api from '../services/api'
import './Dashboard.css'

const Dashboard = () => {
  const { user, isAuthenticated, loading } = useAppSelector(state => state.auth)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    profile_image_url: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: ''
    }
  })
  const [saving, setSaving] = useState(false)
  const [imagePreview, setImagePreview] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [isEditingPayment, setIsEditingPayment] = useState(false)
  const [paymentFormData, setPaymentFormData] = useState({
    cardNumber: '',
    cardholderName: '',
    expiryMonth: '',
    expiryYear: '',
    cardType: 'Credit Card'
  })

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login')
    }
  }, [isAuthenticated, loading, navigate])

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
        profile_image_url: user.profile_image_url || '',
        address: {
          street: user.address?.street || '',
          city: user.address?.city || '',
          state: user.address?.state || '',
          zip: user.address?.zip || ''
        }
      })
      setImagePreview(user.profile_image_url || null)
      
      // Initialize payment form data from user's saved payment details
      if (user.payment_details) {
        setPaymentFormData({
          cardNumber: user.payment_details.masked_number || '',
          cardholderName: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          expiryMonth: user.payment_details.expiry_month?.toString() || '',
          expiryYear: user.payment_details.expiry_year?.toString() || '',
          cardType: user.payment_details.card_type || 'Credit Card'
        })
      }
      
      fetchUserReviews()
    }
  }, [user])

  const fetchUserReviews = async () => {
    if (!user?.user_id) return
    
    setLoadingReviews(true)
    try {
      const response = await api.get(`/reviews?user_id=${user.user_id}`)
      if (response.data.success) {
        setReviews(response.data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error)
    } finally {
      setLoadingReviews(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1]
      setFormData({
        ...formData,
        address: {
          ...formData.address,
          [addressField]: value
        }
      })
    } else {
      setFormData({
        ...formData,
        [name]: value
      })
    }
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        dispatch(addNotification({
          type: 'error',
          title: 'Invalid File',
          message: 'Please select an image file.',
          severity: 'error'
        }))
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        dispatch(addNotification({
          type: 'error',
          title: 'File Too Large',
          message: 'Image must be less than 5MB.',
          severity: 'error'
        }))
        return
      }

      // Convert to base64
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result
        setImagePreview(base64String)
        // Store in formData for saving
        setFormData({
          ...formData,
          profile_image_url: base64String
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setImagePreview(null)
    setFormData({
      ...formData,
      profile_image_url: ''
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updates = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone_number: formData.phone_number,
        address: {
          street: formData.address.street,
          city: formData.address.city,
          state: formData.address.state,
          zip: formData.address.zip
        }
      }

      // Include profile_image_url if it was changed
      if (formData.profile_image_url !== undefined) {
        updates.profile_image_url = formData.profile_image_url || null
      }

      await dispatch(updateUser({ user_id: user.user_id, updates })).unwrap()
      
      dispatch(addNotification({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your profile has been updated successfully.',
        severity: 'success'
      }))
      
      setIsEditing(false)
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        title: 'Update Failed',
        message: error || 'Failed to update profile. Please try again.',
        severity: 'error'
      }))
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
        profile_image_url: user.profile_image_url || '',
        address: {
          street: user.address?.street || '',
          city: user.address?.city || '',
          state: user.address?.state || '',
          zip: user.address?.zip || ''
        }
      })
      setImagePreview(user.profile_image_url || null)
      
      // Reset payment form data
      if (user.payment_details) {
        setPaymentFormData({
          cardNumber: user.payment_details.masked_number || '',
          cardholderName: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          expiryMonth: user.payment_details.expiry_month?.toString() || '',
          expiryYear: user.payment_details.expiry_year?.toString() || '',
          cardType: user.payment_details.card_type || 'Credit Card'
        })
      } else {
        setPaymentFormData({
          cardNumber: '',
          cardholderName: '',
          expiryMonth: '',
          expiryYear: '',
          cardType: 'Credit Card'
        })
      }
    }
    setIsEditing(false)
    setIsEditingPayment(false)
  }

  const handlePaymentChange = (e) => {
    const { name, value } = e.target
    setPaymentFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const formatCardNumber = (value) => {
    const cleaned = value.replace(/\s+/g, '')
    const chunks = cleaned.match(/.{1,4}/g) || []
    return chunks.join(' ').slice(0, 19)
  }

  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value)
    setPaymentFormData(prev => ({ ...prev, cardNumber: formatted }))
  }

  const handleSavePayment = async () => {
    // Validate payment form
    const cardNumberClean = paymentFormData.cardNumber.replace(/\s/g, '')
    if (!cardNumberClean.match(/^\d{13,19}$/)) {
      dispatch(addNotification({
        type: 'error',
        title: 'Invalid Card Number',
        message: 'Please enter a valid card number (13-19 digits)',
        severity: 'error'
      }))
      return
    }

    if (!paymentFormData.cardholderName.trim()) {
      dispatch(addNotification({
        type: 'error',
        title: 'Invalid Cardholder Name',
        message: 'Please enter cardholder name',
        severity: 'error'
      }))
      return
    }

    if (!paymentFormData.expiryMonth || !paymentFormData.expiryYear) {
      dispatch(addNotification({
        type: 'error',
        title: 'Invalid Expiry Date',
        message: 'Please enter expiry month and year',
        severity: 'error'
      }))
      return
    }

    const expiryMonth = parseInt(paymentFormData.expiryMonth)
    const expiryYear = parseInt(paymentFormData.expiryYear)

    if (expiryMonth < 1 || expiryMonth > 12) {
      dispatch(addNotification({
        type: 'error',
        title: 'Invalid Month',
        message: 'Expiry month must be between 1 and 12',
        severity: 'error'
      }))
      return
    }

    if (expiryYear < 2020) {
      dispatch(addNotification({
        type: 'error',
        title: 'Invalid Year',
        message: 'Expiry year must be 2020 or later',
        severity: 'error'
      }))
      return
    }

    setSaving(true)
    try {
      const last4 = cardNumberClean.slice(-4)
      const maskedNumber = `**** **** **** ${last4}`

      let cardType = paymentFormData.cardType
      if (!cardType || cardType === 'Credit Card') {
        const firstDigit = cardNumberClean[0]
        if (firstDigit === '4') {
          cardType = 'Visa'
        } else if (firstDigit === '5') {
          cardType = 'Mastercard'
        } else if (firstDigit === '3') {
          cardType = 'American Express'
        } else {
          cardType = 'Credit Card'
        }
      }

      const paymentDetails = {
        masked_number: maskedNumber,
        card_type: cardType,
        expiry_month: expiryMonth,
        expiry_year: expiryYear
      }

      await dispatch(updateUser({ 
        user_id: user.user_id, 
        updates: { payment_details: paymentDetails } 
      })).unwrap()
      
      dispatch(addNotification({
        type: 'success',
        title: 'Payment Method Saved',
        message: 'Your payment method has been saved successfully.',
        severity: 'success'
      }))
      
      setIsEditingPayment(false)
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        title: 'Save Failed',
        message: error || 'Failed to save payment method. Please try again.',
        severity: 'error'
      }))
    } finally {
      setSaving(false)
    }
  }

  const handleRemovePayment = async () => {
    if (!window.confirm('Are you sure you want to remove your payment method?')) {
      return
    }

    setSaving(true)
    try {
      await dispatch(updateUser({ 
        user_id: user.user_id, 
        updates: { payment_details: null } 
      })).unwrap()
      
      setPaymentFormData({
        cardNumber: '',
        cardholderName: '',
        expiryMonth: '',
        expiryYear: '',
        cardType: 'Credit Card'
      })
      
      dispatch(addNotification({
        type: 'success',
        title: 'Payment Method Removed',
        message: 'Your payment method has been removed successfully.',
        severity: 'success'
      }))
      
      setIsEditingPayment(false)
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        title: 'Remove Failed',
        message: error || 'Failed to remove payment method. Please try again.',
        severity: 'error'
      }))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return
    }

    if (!window.confirm('This will permanently delete your account and all associated data. Are you absolutely sure?')) {
      return
    }

    try {
      await api.delete(`/users/${user.user_id}`)
      
      dispatch(addNotification({
        type: 'success',
        title: 'Account Deleted',
        message: 'Your account has been deleted successfully.',
        severity: 'success'
      }))
      
      // Logout and redirect to home
      const { logoutUser } = await import('../store/slices/authSlice')
      await dispatch(logoutUser())
      navigate('/')
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        title: 'Delete Failed',
        message: error.response?.data?.error || 'Failed to delete account. Please try again.',
        severity: 'error'
      }))
    }
  }

  if (loading && !user) {
    return (
      <div className="dashboard">
        <div className="container">
          <div className="loading">Loading...</div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="dashboard">
      <div className="container">
        <h1>Welcome, {user?.first_name || user?.email}!</h1>
        
        <div className="dashboard-grid">
          <Link to="/my-bookings" className="dashboard-card">
            <div className="card-icon">📋</div>
            <h2>My Bookings</h2>
            <p>View and manage your bookings</p>
          </Link>
        </div>

        <div className="user-info">
          <div className="user-info-header">
            <h2>Account Information</h2>
            {!isEditing ? (
              <div className="user-actions">
                <button className="btn-edit" onClick={() => setIsEditing(true)}>
                  Edit Profile
                </button>
                <button className="btn-delete" onClick={handleDeleteAccount}>
                  Delete Account
                </button>
              </div>
            ) : (
              <div className="edit-actions">
                <button className="btn-cancel" onClick={handleCancel} disabled={saving}>
                  Cancel
                </button>
                <button className="btn-save" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>

          <div className="profile-picture-section">
            <div className="profile-picture-container">
              {imagePreview ? (
                <img src={imagePreview} alt="Profile" className="profile-picture" />
              ) : (
                <div className="profile-picture-placeholder">
                  <span className="placeholder-icon">👤</span>
                  <span className="placeholder-text">No Photo</span>
                </div>
              )}
            </div>
            {isEditing && (
              <div className="profile-picture-controls">
                <label htmlFor="profile-image-upload" className="btn-upload">
                  {imagePreview ? 'Change Photo' : 'Upload Photo'}
                </label>
                <input
                  type="file"
                  id="profile-image-upload"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
                {imagePreview && (
                  <button className="btn-remove-image" onClick={handleRemoveImage}>
                    Remove Photo
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">User ID (SSN):</span>
              {isEditing ? (
                <input
                  type="text"
                  value={user?.user_id || ''}
                  disabled
                  className="info-input disabled"
                  placeholder="User ID (cannot be changed)"
                />
              ) : (
                <span className="info-value">{user?.user_id || 'N/A'}</span>
              )}
            </div>

            <div className="info-item">
              <span className="info-label">First Name:</span>
              {isEditing ? (
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="info-input"
                  placeholder="First Name"
                  required
                />
              ) : (
                <span className="info-value">{user?.first_name || 'N/A'}</span>
              )}
            </div>

            <div className="info-item">
              <span className="info-label">Last Name:</span>
              {isEditing ? (
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="info-input"
                  placeholder="Last Name"
                  required
                />
              ) : (
                <span className="info-value">{user?.last_name || 'N/A'}</span>
              )}
            </div>

            <div className="info-item">
              <span className="info-label">Email:</span>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="info-input"
                  placeholder="Email"
                  required
                />
              ) : (
                <span className="info-value">{user?.email || 'N/A'}</span>
              )}
            </div>

            <div className="info-item">
              <span className="info-label">Phone Number:</span>
              {isEditing ? (
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  className="info-input"
                  placeholder="Phone Number"
                />
              ) : (
                <span className="info-value">{user?.phone_number || 'N/A'}</span>
              )}
            </div>

            <div className="info-item full-width">
              <span className="info-label">Street Address:</span>
              {isEditing ? (
                <input
                  type="text"
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleChange}
                  className="info-input"
                  placeholder="Street Address"
                />
              ) : (
                <span className="info-value">{user?.address?.street || 'N/A'}</span>
              )}
            </div>

            <div className="info-item">
              <span className="info-label">City:</span>
              {isEditing ? (
                <input
                  type="text"
                  name="address.city"
                  value={formData.address.city}
                  onChange={handleChange}
                  className="info-input"
                  placeholder="City"
                />
              ) : (
                <span className="info-value">{user?.address?.city || 'N/A'}</span>
              )}
            </div>

            <div className="info-item">
              <span className="info-label">State:</span>
              {isEditing ? (
                <input
                  type="text"
                  name="address.state"
                  value={formData.address.state}
                  onChange={handleChange}
                  className="info-input"
                  placeholder="State (e.g. CA)"
                  maxLength="2"
                />
              ) : (
                <span className="info-value">{user?.address?.state || 'N/A'}</span>
              )}
            </div>

            <div className="info-item">
              <span className="info-label">ZIP Code:</span>
              {isEditing ? (
                <input
                  type="text"
                  name="address.zip"
                  value={formData.address.zip}
                  onChange={handleChange}
                  className="info-input"
                  placeholder="ZIP Code"
                />
              ) : (
                <span className="info-value">{user?.address?.zip || 'N/A'}</span>
              )}
            </div>
          </div>

          {/* Payment Method Section */}
          <div className="payment-method-section">
            <div className="payment-method-header">
              <h2>Payment Method</h2>
              {!isEditingPayment ? (
                <div className="payment-actions">
                  {user?.payment_details ? (
                    <>
                      <button className="btn-edit" onClick={() => setIsEditingPayment(true)}>
                        Edit Payment Method
                      </button>
                      <button className="btn-delete" onClick={handleRemovePayment}>
                        Remove Payment Method
                      </button>
                    </>
                  ) : (
                    <button className="btn-edit" onClick={() => setIsEditingPayment(true)}>
                      Add Payment Method
                    </button>
                  )}
                </div>
              ) : (
                <div className="edit-actions">
                  <button className="btn-cancel" onClick={handleCancel} disabled={saving}>
                    Cancel
                  </button>
                  <button className="btn-save" onClick={handleSavePayment} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Payment Method'}
                  </button>
                </div>
              )}
            </div>

            {isEditingPayment ? (
              <div className="payment-form-container">
                <div className="info-grid">
                  <div className="info-item full-width">
                    <span className="info-label">Card Number</span>
                    <input
                      type="text"
                      name="cardNumber"
                      value={paymentFormData.cardNumber}
                      onChange={handleCardNumberChange}
                      className="info-input"
                      placeholder="1234 5678 9012 3456"
                      maxLength="19"
                      required
                    />
                  </div>

                  <div className="info-item full-width">
                    <span className="info-label">Cardholder Name</span>
                    <input
                      type="text"
                      name="cardholderName"
                      value={paymentFormData.cardholderName}
                      onChange={handlePaymentChange}
                      className="info-input"
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div className="info-item">
                    <span className="info-label">Expiry Month</span>
                    <input
                      type="number"
                      name="expiryMonth"
                      value={paymentFormData.expiryMonth}
                      onChange={handlePaymentChange}
                      className="info-input"
                      placeholder="MM"
                      min="1"
                      max="12"
                      required
                    />
                  </div>

                  <div className="info-item">
                    <span className="info-label">Expiry Year</span>
                    <input
                      type="number"
                      name="expiryYear"
                      value={paymentFormData.expiryYear}
                      onChange={handlePaymentChange}
                      className="info-input"
                      placeholder="YYYY"
                      min="2020"
                      required
                    />
                  </div>

                  <div className="info-item">
                    <span className="info-label">Card Type</span>
                    <select
                      name="cardType"
                      value={paymentFormData.cardType}
                      onChange={handlePaymentChange}
                      className="info-input"
                      required
                    >
                      <option value="Credit Card">Credit Card</option>
                      <option value="Debit Card">Debit Card</option>
                      <option value="Visa">Visa</option>
                      <option value="Mastercard">Mastercard</option>
                      <option value="American Express">American Express</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="payment-info-display">
                {user?.payment_details ? (
                  <div className="payment-card-display">
                    <div className="payment-card-info">
                      <div className="payment-card-row">
                        <span className="payment-label">Card Number:</span>
                        <span className="payment-value">{user.payment_details.masked_number || 'N/A'}</span>
                      </div>
                      <div className="payment-card-row">
                        <span className="payment-label">Card Type:</span>
                        <span className="payment-value">{user.payment_details.card_type || 'N/A'}</span>
                      </div>
                      <div className="payment-card-row">
                        <span className="payment-label">Expiry:</span>
                        <span className="payment-value">
                          {user.payment_details.expiry_month?.toString().padStart(2, '0') || 'MM'}/
                          {user.payment_details.expiry_year?.toString().slice(-2) || 'YY'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="no-payment-method">
                    <p>No payment method saved. Add one to speed up your checkout process.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="user-reviews">
          <h2>My Reviews</h2>
          {loadingReviews ? (
            <div className="loading">Loading reviews...</div>
          ) : reviews.length === 0 ? (
            <div className="no-reviews">
              <p>You haven't submitted any reviews yet.</p>
            </div>
          ) : (
            <div className="reviews-list">
              {reviews.map((review) => (
                <div key={review._id} className="review-card">
                  <div className="review-header">
                    <div className="review-type">
                      <span className={`type-badge ${review.entity_type.toLowerCase()}`}>
                        {review.entity_type}
                      </span>
                      <span className="review-date">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="review-rating">
                      {'⭐'.repeat(review.rating)}
                      <span className="rating-number">{review.rating}/5</span>
                    </div>
                  </div>
                  <h3 className="review-title">{review.title}</h3>
                  <p className="review-comment">{review.comment}</p>
                  <div className="review-entity">
                    <span className="entity-label">For:</span>
                    <span className="entity-id">{review.entity_id}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
