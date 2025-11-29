import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { registerUser } from '../store/slices/authSlice'
import './Auth.css'

const Register = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { isAuthenticated, loading: authLoading } = useAppSelector(state => state.auth)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    street: '',
    city: '',
    state: '',
    zip: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasSpecialChar: false
  })
  const [phoneError, setPhoneError] = useState('')

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate])

  const validatePassword = (password) => {
    const errors = {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    }
    setPasswordErrors(errors)
    return Object.values(errors).every(Boolean)
  }

  const formatPhoneNumber = (value) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    
    // Format as 888-999-0098
    if (digits.length <= 3) {
      return digits
    } else if (digits.length <= 6) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`
    } else {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`
    }
  }

  const validatePhoneNumber = (phone) => {
    const phoneRegex = /^\d{3}-\d{3}-\d{4}$/
    if (!phoneRegex.test(phone)) {
      setPhoneError('Phone number must be in format: 888-999-0098')
      return false
    }
    setPhoneError('')
    return true
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    let processedValue = value

    // Format phone number
    if (name === 'phone_number') {
      processedValue = formatPhoneNumber(value)
      if (processedValue.length <= 12) { // Max length: 888-999-0098
        setFormData({
          ...formData,
          [name]: processedValue
        })
        if (processedValue.length === 12) {
          validatePhoneNumber(processedValue)
        } else {
          setPhoneError('')
        }
      }
      setError('')
      return
    }

    // Validate password
    if (name === 'password') {
      setFormData({
        ...formData,
        [name]: value
      })
      validatePassword(value)
      setError('')
      return
    }

    setFormData({
      ...formData,
      [name]: processedValue
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validate password
    if (!validatePassword(formData.password)) {
      setError('Password does not meet requirements. Please check the criteria below.')
      setLoading(false)
      return
    }

    // Validate phone number
    if (!validatePhoneNumber(formData.phone_number)) {
      setError(phoneError || 'Please enter a valid phone number in format: 888-999-0098')
      setLoading(false)
      return
    }

    try {
      const userData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        password: formData.password,
        phone_number: formData.phone_number,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zip: formData.zip
        }
      }
      
      await dispatch(registerUser(userData)).unwrap()
      navigate('/dashboard')
    } catch (err) {
      // Handle different error formats
      let errorMessage = 'Registration failed. Please try again.'
      
      if (typeof err === 'string') {
        errorMessage = err
      } else if (err?.message) {
        errorMessage = err.message
      } else if (err?.response?.data?.error) {
        errorMessage = err.response.data.error
      } else if (err?.error) {
        errorMessage = err.error
      }
      
      setError(errorMessage)
      console.error('Registration error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>Sign Up</h1>
        <p className="auth-subtitle">Create your account to start booking</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="first_name">First Name</label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
                placeholder="First name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="last_name">Last Name</label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
                placeholder="Last name"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone_number">Phone Number</label>
            <input
              type="tel"
              id="phone_number"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              placeholder="888-999-0098"
              required
              maxLength="12"
            />
            {phoneError && <span className="field-error">{phoneError}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="street">Street</label>
            <input
              type="text"
              id="street"
              name="street"
              value={formData.street}
              onChange={handleChange}
              required
              placeholder="Street address"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="city">City</label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                placeholder="City"
              />
            </div>

            <div className="form-group">
              <label htmlFor="state">State (e.g. CA)</label>
              <input
                type="text"
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                required
                placeholder="State code"
                maxLength="2"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="zip">ZIP Code</label>
            <input
              type="text"
              id="zip"
              name="zip"
              value={formData.zip}
              onChange={handleChange}
              required
              placeholder="ZIP (e.g. 94105)"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Create a password"
              minLength="8"
            />
            <div className="password-requirements">
              <div className={`requirement ${passwordErrors.minLength ? 'valid' : ''}`}>
                <span className="requirement-icon">{passwordErrors.minLength ? '✓' : '○'}</span>
                <span>At least 8 characters</span>
              </div>
              <div className={`requirement ${passwordErrors.hasUpperCase ? 'valid' : ''}`}>
                <span className="requirement-icon">{passwordErrors.hasUpperCase ? '✓' : '○'}</span>
                <span>One uppercase letter</span>
              </div>
              <div className={`requirement ${passwordErrors.hasLowerCase ? 'valid' : ''}`}>
                <span className="requirement-icon">{passwordErrors.hasLowerCase ? '✓' : '○'}</span>
                <span>One lowercase letter</span>
              </div>
              <div className={`requirement ${passwordErrors.hasSpecialChar ? 'valid' : ''}`}>
                <span className="requirement-icon">{passwordErrors.hasSpecialChar ? '✓' : '○'}</span>
                <span>One special character</span>
              </div>
            </div>
          </div>

          <button type="submit" className="btn-auth" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

export default Register

