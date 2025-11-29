import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

const initialState = {
  user: null,
  admin: null,
  accessToken: localStorage.getItem('accessToken') || null,
  refreshToken: localStorage.getItem('refreshToken') || null,
  isAuthenticated: !!(localStorage.getItem('accessToken') && localStorage.getItem('refreshToken')),
  role: localStorage.getItem('role') || null, // 'user' or 'admin'
  userRole: localStorage.getItem('userRole') || null, // Admin role: 'Super Admin', 'Listing Admin', etc.
  loading: false,
  error: null
}

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await api.post('/users/login', { email, password })
      
      if (response.data.success && response.data.data) {
        const { user, admin, accessToken, refreshToken, role, userRole } = response.data.data
        
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        localStorage.setItem('role', role || 'user')
        if (userRole) localStorage.setItem('userRole', userRole)
        
        if (admin) {
          localStorage.setItem('admin', JSON.stringify(admin))
          return { accessToken, refreshToken, admin, role: 'admin', userRole }
        } else {
          localStorage.setItem('user', JSON.stringify(user))
          return { accessToken, refreshToken, user, role: 'user' }
        }
      } else {
        return rejectWithValue('Invalid response from server')
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Login failed'
      return rejectWithValue(errorMessage)
    }
  }
)

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      // Generate user_id (SSN format) if not provided
      if (!userData.user_id) {
        userData.user_id = `${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 90) + 10}-${Math.floor(Math.random() * 9000) + 1000}`
      }
      
      // Ensure password is included
      if (!userData.password) {
        return rejectWithValue('Password is required')
      }
      
      const response = await api.post('/users', userData)
      
      // Check if response has the expected structure
      if (!response.data || !response.data.success) {
        return rejectWithValue(response.data?.error || 'Registration failed: Invalid response from server')
      }
      
      const registeredUser = response.data.data
      
      if (!registeredUser) {
        return rejectWithValue('Registration failed: No user data received')
      }
      
      if (!registeredUser.user_id) {
        return rejectWithValue('Registration failed: Invalid user data received')
      }
      
      // After registration, automatically log in the user
      // Note: Registration endpoint doesn't return tokens, so we'll need to log in separately
      // For now, we'll just store the user and they'll need to log in
      localStorage.setItem('user', JSON.stringify(registeredUser))
      
      return { user: registeredUser }
    } catch (error) {
      // Handle network errors
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        return rejectWithValue('Unable to connect to server. Please ensure the backend services are running.')
      }
      
      // Handle API errors
      const errorMessage = error.response?.data?.error || error.message || 'Registration failed'
      return rejectWithValue(errorMessage)
    }
  }
)

export const fetchUser = createAsyncThunk(
  'auth/fetchUser',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState()
      const storedUser = localStorage.getItem('user')
      const accessToken = localStorage.getItem('accessToken')
      const refreshToken = localStorage.getItem('refreshToken')
      
      // If we have tokens and user, restore state
      if (storedUser && accessToken && refreshToken) {
        const user = JSON.parse(storedUser)
        // Set authorization header
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
        return { user, accessToken, refreshToken }
      }
      
      // If we have a user_id from old token format, try to fetch user
      const oldToken = localStorage.getItem('token')
      if (oldToken && oldToken.includes('-')) {
        const response = await api.get(`/users/${oldToken}`)
        localStorage.setItem('user', JSON.stringify(response.data.data))
        return { user: response.data.data }
      }
      
      return null
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch user')
    }
  }
)

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue, getState }) => {
    try {
      const refreshTokenValue = localStorage.getItem('refreshToken')
      
      if (!refreshTokenValue) {
        return rejectWithValue('No refresh token available')
      }

      const response = await api.post('/users/refresh', { refreshToken: refreshTokenValue })
      
      if (response.data.success && response.data.data) {
        const { user, accessToken } = response.data.data
        
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('user', JSON.stringify(user))
        
        return { accessToken, user }
      } else {
        return rejectWithValue('Invalid response from server')
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to refresh token'
      return rejectWithValue(errorMessage)
    }
  }
)

export const updateUser = createAsyncThunk(
  'auth/updateUser',
  async ({ user_id, updates }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/users/${user_id}`, updates)
      
      if (response.data.success && response.data.data) {
        const updatedUser = response.data.data
        localStorage.setItem('user', JSON.stringify(updatedUser))
        return updatedUser
      } else {
        return rejectWithValue('Invalid response from server')
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update user'
      return rejectWithValue(errorMessage)
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null
      state.admin = null
      state.accessToken = null
      state.refreshToken = null
      state.role = null
      state.userRole = null
      state.isAuthenticated = false
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      localStorage.removeItem('admin')
      localStorage.removeItem('role')
      localStorage.removeItem('userRole')
      delete api.defaults.headers.common['Authorization']
    },
    setCredentials: (state, action) => {
      const { accessToken, refreshToken, user } = action.payload
      state.accessToken = accessToken
      state.refreshToken = refreshToken || state.refreshToken
      state.user = user
      state.isAuthenticated = true
      if (accessToken) {
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
      }
    },
    clearError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false
        state.accessToken = action.payload.accessToken
        state.refreshToken = action.payload.refreshToken
        state.role = action.payload.role
        state.userRole = action.payload.userRole
        if (action.payload.user) {
          state.user = action.payload.user
          state.admin = null
        } else if (action.payload.admin) {
          state.admin = action.payload.admin
          state.user = null
        }
        state.isAuthenticated = true
        api.defaults.headers.common['Authorization'] = `Bearer ${action.payload.accessToken}`
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Register
      .addCase(registerUser.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload.user
        // Registration doesn't automatically log in - user needs to log in separately
        state.isAuthenticated = false
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Fetch User
      .addCase(fetchUser.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.loading = false
        if (action.payload) {
          if (typeof action.payload === 'object' && 'user' in action.payload) {
            state.user = action.payload.user
            state.accessToken = action.payload.accessToken || state.accessToken
            state.refreshToken = action.payload.refreshToken || state.refreshToken
            state.isAuthenticated = !!(action.payload.accessToken && action.payload.refreshToken)
            if (action.payload.accessToken) {
              api.defaults.headers.common['Authorization'] = `Bearer ${action.payload.accessToken}`
            }
          } else {
            state.user = action.payload
            state.isAuthenticated = !!(state.accessToken && state.refreshToken)
          }
        } else {
          state.isAuthenticated = false
        }
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
        state.isAuthenticated = false
      })
      // Update User
      .addCase(updateUser.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Refresh Token
      .addCase(refreshToken.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.loading = false
        state.accessToken = action.payload.accessToken
        state.user = action.payload.user
        state.isAuthenticated = true
        api.defaults.headers.common['Authorization'] = `Bearer ${action.payload.accessToken}`
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
        // If refresh fails, clear tokens and log out
        state.user = null
        state.accessToken = null
        state.refreshToken = null
        state.isAuthenticated = false
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        delete api.defaults.headers.common['Authorization']
      })
      // Logout
      .addCase(logoutUser.pending, (state) => {
        state.loading = true
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.loading = false
        state.user = null
        state.accessToken = null
        state.refreshToken = null
        state.isAuthenticated = false
      })
      .addCase(logoutUser.rejected, (state) => {
        state.loading = false
        state.user = null
        state.accessToken = null
        state.refreshToken = null
        state.isAuthenticated = false
      })
  }
})

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState()
      const user = state.auth.user
      const admin = state.auth.admin
      
      if (admin && admin.admin_id) {
        // Call logout endpoint to clear refresh token on server
        try {
          await api.post('/users/logout', { admin_id: admin.admin_id })
        } catch (error) {
          console.error('Logout endpoint error:', error)
        }
      } else if (user && user.user_id) {
        // Call logout endpoint to clear refresh token on server
        try {
          await api.post('/users/logout', { user_id: user.user_id })
        } catch (error) {
          console.error('Logout endpoint error:', error)
        }
      }
      
      // Clear local storage and state
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      localStorage.removeItem('admin')
      localStorage.removeItem('role')
      localStorage.removeItem('userRole')
      delete api.defaults.headers.common['Authorization']
      
      return null
    } catch (error) {
      // Even if there's an error, clear local storage
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      localStorage.removeItem('admin')
      localStorage.removeItem('role')
      localStorage.removeItem('userRole')
      delete api.defaults.headers.common['Authorization']
      return rejectWithValue(error.message || 'Logout failed')
    }
  }
)

export const { logout, setCredentials, clearError } = authSlice.actions
export default authSlice.reducer

