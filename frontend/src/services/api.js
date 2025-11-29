import axios from 'axios'
import { store } from '../store/store'
import { logout } from '../store/slices/authSlice'
import { addNotification } from '../store/slices/notificationSlice'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config
    
    // Don't redirect on login/register endpoints - let them handle their own errors
    const isAuthEndpoint = originalRequest?.url?.includes('/login') || originalRequest?.url?.includes('/register') || originalRequest?.url?.includes('/users/login') || originalRequest?.url?.includes('/users/register')
    
    // Handle 401 Unauthorized (but not for auth endpoints)
    if (error.response && error.response.status === 401 && !isAuthEndpoint) {
      store.dispatch(logout())
      store.dispatch(addNotification({
        type: 'error',
        title: 'Session Expired',
        message: 'Please log in again.',
        severity: 'error'
      }))
      window.location.href = '/login'
    } 
    // Handle network errors
    else if (!error.response) {
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

