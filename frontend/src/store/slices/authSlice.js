import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

const initialState = {
  user: null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null
}

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      // Simplified auth - in production this would be a proper endpoint
      const mockUserId = `123-45-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
      const userData = {
        email,
        first_name: email.split('@')[0],
        last_name: '',
        user_id: mockUserId,
        _id: mockUserId
      }
      
      const token = mockUserId
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(userData))
      
      return { token, user: userData }
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Login failed')
    }
  }
)

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      if (!userData.user_id) {
        userData.user_id = `${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 90) + 10}-${Math.floor(Math.random() * 9000) + 1000}`
      }
      
      const response = await api.post('/users', userData)
      const registeredUser = response.data.data
      const token = registeredUser.user_id
      
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(registeredUser))
      
      return { token, user: registeredUser }
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Registration failed')
    }
  }
)

export const fetchUser = createAsyncThunk(
  'auth/fetchUser',
  async (_, { rejectWithValue }) => {
    try {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        return JSON.parse(storedUser)
      }
      
      const token = localStorage.getItem('token')
      if (token && token.includes('-')) {
        const response = await api.get(`/users/${token}`)
        localStorage.setItem('user', JSON.stringify(response.data.data))
        return response.data.data
      }
      
      return null
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch user')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      delete api.defaults.headers.common['Authorization']
    },
    setCredentials: (state, action) => {
      const { token, user } = action.payload
      state.token = token
      state.user = user
      state.isAuthenticated = true
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
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
        state.token = action.payload.token
        state.user = action.payload.user
        state.isAuthenticated = true
        api.defaults.headers.common['Authorization'] = `Bearer ${action.payload.token}`
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
        state.token = action.payload.token
        state.user = action.payload.user
        state.isAuthenticated = true
        api.defaults.headers.common['Authorization'] = `Bearer ${action.payload.token}`
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
        state.user = action.payload
        state.isAuthenticated = !!action.payload
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
        state.isAuthenticated = false
      })
  }
})

export const { logout, setCredentials, clearError } = authSlice.actions
export default authSlice.reducer

