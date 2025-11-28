import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

const initialState = {
  bookings: [],
  currentBooking: null,
  loading: false,
  error: null,
  filter: 'all'
}

export const fetchBookings = createAsyncThunk(
  'bookings/fetchAll',
  async ({ userId, filter = 'all' }, { rejectWithValue }) => {
    try {
      const params = filter !== 'all' ? { status: filter } : {}
      let response
      try {
        response = await api.get(`/bookings/users/${userId}/bookings`, { params })
      } catch (err) {
        response = await api.get('/bookings', { params })
        if (response.data.data) {
          response.data.data = response.data.data.filter(b => 
            b.user_id === userId || b.user === userId
          )
        }
      }
      return response.data.data || []
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch bookings')
    }
  }
)

export const fetchBookingDetails = createAsyncThunk(
  'bookings/fetchDetails',
  async (bookingId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/bookings/${bookingId}`)
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch booking details')
    }
  }
)

export const createBooking = createAsyncThunk(
  'bookings/create',
  async (bookingData, { rejectWithValue }) => {
    try {
      const response = await api.post('/bookings', bookingData)
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create booking')
    }
  }
)

export const cancelBooking = createAsyncThunk(
  'bookings/cancel',
  async (bookingId, { rejectWithValue }) => {
    try {
      const response = await api.put(`/bookings/${bookingId}/cancel`)
      return response.data.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to cancel booking')
    }
  }
)

const bookingSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    setFilter: (state, action) => {
      state.filter = action.payload
    },
    addBooking: (state, action) => {
      state.bookings.unshift(action.payload)
    },
    updateBooking: (state, action) => {
      const index = state.bookings.findIndex(b => 
        (b._id || b.booking_id) === (action.payload._id || action.payload.booking_id)
      )
      if (index !== -1) {
        state.bookings[index] = action.payload
      }
      if (state.currentBooking && 
          (state.currentBooking._id || state.currentBooking.booking_id) === 
          (action.payload._id || action.payload.booking_id)) {
        state.currentBooking = action.payload
      }
    },
    clearCurrentBooking: (state) => {
      state.currentBooking = null
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Bookings
      .addCase(fetchBookings.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchBookings.fulfilled, (state, action) => {
        state.loading = false
        state.bookings = action.payload
      })
      .addCase(fetchBookings.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Fetch Booking Details
      .addCase(fetchBookingDetails.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchBookingDetails.fulfilled, (state, action) => {
        state.loading = false
        state.currentBooking = action.payload
      })
      .addCase(fetchBookingDetails.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Create Booking
      .addCase(createBooking.fulfilled, (state, action) => {
        state.bookings.unshift(action.payload)
        state.currentBooking = action.payload
      })
      // Cancel Booking
      .addCase(cancelBooking.fulfilled, (state, action) => {
        const index = state.bookings.findIndex(b => 
          (b._id || b.booking_id) === (action.payload._id || action.payload.booking_id)
        )
        if (index !== -1) {
          state.bookings[index] = action.payload
        }
        if (state.currentBooking && 
            (state.currentBooking._id || state.currentBooking.booking_id) === 
            (action.payload._id || action.payload.booking_id)) {
          state.currentBooking = action.payload
        }
      })
  }
})

export const { setFilter, addBooking, updateBooking, clearCurrentBooking } = bookingSlice.actions
export default bookingSlice.reducer

