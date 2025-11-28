import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import searchReducer from './slices/searchSlice'
import bookingReducer from './slices/bookingSlice'
import notificationReducer from './slices/notificationSlice'
import dealsReducer from './slices/dealsSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    search: searchReducer,
    bookings: bookingReducer,
    notifications: notificationReducer,
    deals: dealsReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST']
      }
    })
})

