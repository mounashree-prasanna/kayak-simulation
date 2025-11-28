import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

const initialState = {
  flights: [],
  hotels: [],
  cars: [],
  loading: false,
  error: null,
  filters: {
    flights: {},
    hotels: {},
    cars: {}
  },
  sortBy: {
    flights: 'price',
    hotels: 'price',
    cars: 'price'
  }
}

export const searchFlights = createAsyncThunk(
  'search/flights',
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.get('/flights/search', { params })
      return response.data.data || []
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to search flights')
    }
  }
)

export const searchHotels = createAsyncThunk(
  'search/hotels',
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.get('/hotels/search', { params })
      return response.data.data || []
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to search hotels')
    }
  }
)

export const searchCars = createAsyncThunk(
  'search/cars',
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.get('/cars/search', { params })
      return response.data.data || []
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to search cars')
    }
  }
)

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      const { type, filters } = action.payload
      state.filters[type] = filters
    },
    setSortBy: (state, action) => {
      const { type, sortBy } = action.payload
      state.sortBy[type] = sortBy
    },
    clearResults: (state, action) => {
      const type = action.payload
      if (type) {
        state[type] = []
      } else {
        state.flights = []
        state.hotels = []
        state.cars = []
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Flights
      .addCase(searchFlights.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(searchFlights.fulfilled, (state, action) => {
        state.loading = false
        state.flights = action.payload
      })
      .addCase(searchFlights.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Hotels
      .addCase(searchHotels.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(searchHotels.fulfilled, (state, action) => {
        state.loading = false
        state.hotels = action.payload
      })
      .addCase(searchHotels.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Cars
      .addCase(searchCars.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(searchCars.fulfilled, (state, action) => {
        state.loading = false
        state.cars = action.payload
      })
      .addCase(searchCars.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  }
})

export const { setFilters, setSortBy, clearResults } = searchSlice.actions
export default searchSlice.reducer

