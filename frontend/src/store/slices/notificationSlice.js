import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  notifications: [],
  unreadCount: 0
}

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action) => {
      const notification = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        read: false,
        ...action.payload
      }
      state.notifications.unshift(notification)
      state.unreadCount += 1
    },
    markAsRead: (state, action) => {
      const id = action.payload
      const notification = state.notifications.find(n => n.id === id)
      if (notification && !notification.read) {
        notification.read = true
        state.unreadCount = Math.max(0, state.unreadCount - 1)
      }
    },
    markAllAsRead: (state) => {
      state.notifications.forEach(n => {
        if (!n.read) {
          n.read = true
        }
      })
      state.unreadCount = 0
    },
    removeNotification: (state, action) => {
      const id = action.payload
      const notification = state.notifications.find(n => n.id === id)
      if (notification && !notification.read) {
        state.unreadCount = Math.max(0, state.unreadCount - 1)
      }
      state.notifications = state.notifications.filter(n => n.id !== id)
    },
    clearAll: (state) => {
      state.notifications = []
      state.unreadCount = 0
    }
  }
})

export const {
  addNotification,
  markAsRead,
  markAllAsRead,
  removeNotification,
  clearAll
} = notificationSlice.actions

export default notificationSlice.reducer

