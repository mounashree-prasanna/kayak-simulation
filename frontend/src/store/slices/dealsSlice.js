import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

const initialState = {
  deals: [],
  bundles: [],
  loading: false,
  error: null,
  subscribed: false
}

export const fetchDeals = createAsyncThunk(
  'deals/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      // This would connect to the recommendation service
      // For now, we'll use WebSocket to get real-time deals
      return []
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch deals')
    }
  }
)

export const fetchBundles = createAsyncThunk(
  'deals/fetchBundles',
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.post('/bundles', params)
      return response.data.bundles || []
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch bundles')
    }
  }
)

const dealsSlice = createSlice({
  name: 'deals',
  initialState,
  reducers: {
    addDeal: (state, action) => {
      const deal = action.payload
      const existingIndex = state.deals.findIndex(d => d.deal_id === deal.deal_id)
      if (existingIndex !== -1) {
        state.deals[existingIndex] = deal
      } else {
        state.deals.push(deal)
      }
      // Keep only latest 50 deals
      if (state.deals.length > 50) {
        state.deals = state.deals.slice(-50)
      }
    },
    addBundle: (state, action) => {
      state.bundles.push(action.payload)
    },
    setSubscribed: (state, action) => {
      state.subscribed = action.payload
    },
    clearDeals: (state) => {
      state.deals = []
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBundles.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchBundles.fulfilled, (state, action) => {
        state.loading = false
        state.bundles = action.payload
      })
      .addCase(fetchBundles.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  }
})

export const { addDeal, addBundle, setSubscribed, clearDeals } = dealsSlice.actions
export default dealsSlice.reducer

