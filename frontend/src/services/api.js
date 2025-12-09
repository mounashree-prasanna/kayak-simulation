import axios from 'axios'
import { store } from '../store/store'
import { addNotification } from '../store/slices/notificationSlice'

// In development, use relative URL to go through Vite proxy
// In production, use configured URL or absolute URL
const baseURL = import.meta.env.VITE_API_URL || (import.meta.env.DEV 
  ? '/api'
  : 'http://localhost:3000/api')

const api = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 second timeout
})

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken')
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    // Don't retry on auth endpoints or if already retried
    const isAuthEndpoint = originalRequest?.url?.includes('/login') || 
                          originalRequest?.url?.includes('/register') || 
                          originalRequest?.url?.includes('/users/login') || 
                          originalRequest?.url?.includes('/users/register') ||
                          originalRequest?.url?.includes('/users/refresh') ||
                          originalRequest?.url?.includes('/users/logout')
    
    // Handle 401 Unauthorized - try to refresh token
    if (error.response && error.response.status === 401 && !isAuthEndpoint && !originalRequest._retry) {
      originalRequest._retry = true
      
      const refreshTokenValue = localStorage.getItem('refreshToken')
      
      if (refreshTokenValue) {
        try {
          // Try to refresh the token
          const refreshResponse = await axios.post(
            `${baseURL}/users/refresh`,
            { refreshToken: refreshTokenValue },
            { headers: { 'Content-Type': 'application/json' } }
          )
          
          if (refreshResponse.data.success && refreshResponse.data.data) {
            const { accessToken, user } = refreshResponse.data.data
            
            // Update tokens in localStorage
            localStorage.setItem('accessToken', accessToken)
            localStorage.setItem('user', JSON.stringify(user))
            
            // Update the original request with new token
            originalRequest.headers.Authorization = `Bearer ${accessToken}`
            
            // Retry the original request
            return api(originalRequest)
          }
        } catch (refreshError) {
          // Refresh failed - log out user
          const { logoutUser } = await import('../store/slices/authSlice')
          store.dispatch(logoutUser())
          store.dispatch(addNotification({
            type: 'error',
            title: 'Session Expired',
            message: 'Please log in again.',
            severity: 'error'
          }))
          window.location.href = '/login'
          return Promise.reject(refreshError)
        }
      } else {
        // No refresh token - log out
        const { logoutUser } = await import('../store/slices/authSlice')
        store.dispatch(logoutUser())
        store.dispatch(addNotification({
          type: 'error',
          title: 'Session Expired',
          message: 'Please log in again.',
          severity: 'error'
        }))
        window.location.href = '/login'
      }
    } 
    // Handle network errors - retry on connection reset/timeout errors
    else if (!error.response) {
      const isConnectionError = error.code === 'ERR_NETWORK' || 
                                error.code === 'ECONNABORTED' ||
                                error.code === 'ECONNRESET' ||
                                error.code === 'ETIMEDOUT' ||
                                error.code === 'ECONNREFUSED' ||
                                error.message?.includes('Network Error') ||
                                error.message?.includes('timeout') ||
                                error.message?.includes('ECONNRESET') ||
                                (error.request && !error.response) // Any request without response
      
      // Retry connection errors once if not already retried
      if (isConnectionError && !originalRequest._retry && !isAuthEndpoint) {
        originalRequest._retry = true
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000))
        try {
          return api(originalRequest)
        } catch (retryError) {
          // If retry also fails, fall through to error handling
        }
      }
      
      store.dispatch(addNotification({
        type: 'error',
        title: 'Network Error',
        message: 'Unable to connect to server. Please ensure the backend services are running.',
        severity: 'error'
      }))
      return Promise.reject(new Error('Network Error: Backend services unreachable'))
    }
    
    return Promise.reject(error)
  }
)

export default api

