/**
 * WebSocket Service for Real-time Updates
 * 
 * Connects to the Agentic Recommendation Service WebSocket endpoint
 * for real-time deal updates, booking confirmations, and notifications
 */

class WebSocketService {
  constructor() {
    this.ws = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 3000
    this.subscriptions = new Set()
    this.listeners = new Map()
    this.isConnected = false
  }

  connect(store) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return
    }

    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/events'
    
    // Only attempt connection if WebSocket is supported
    if (typeof WebSocket === 'undefined') {
      console.warn('[WebSocket] WebSocket not supported in this environment')
      return
    }

    try {
      this.ws = new WebSocket(wsUrl)
      this.store = store

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected')
        this.isConnected = true
        this.reconnectAttempts = 0
        
        // Resubscribe to all topics
        if (this.subscriptions.size > 0) {
          this.subscribe(Array.from(this.subscriptions))
        }
      }

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          this.handleMessage(message)
        } catch (error) {
          // Silently handle parse errors
        }
      }

      this.ws.onerror = (error) => {
        // Silently handle errors - service may not be running
        // Only log in development
        if (import.meta.env.DEV) {
          console.debug('[WebSocket] Connection error (service may not be running)')
        }
      }

      this.ws.onclose = () => {
        this.isConnected = false
        // Only attempt reconnect if we haven't exceeded max attempts
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect()
        } else {
          // Silently stop trying after max attempts
          if (import.meta.env.DEV) {
            console.debug('[WebSocket] Max reconnection attempts reached. Service may not be available.')
          }
        }
      }
    } catch (error) {
      // Silently handle connection errors
      if (import.meta.env.DEV) {
        console.debug('[WebSocket] Failed to create connection (service may not be running)')
      }
    }
  }

  subscribe(topics) {
    topics.forEach(topic => this.subscriptions.add(topic))
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        topics: Array.from(this.subscriptions)
      }))
    }
  }

  unsubscribe(topics) {
    topics.forEach(topic => this.subscriptions.delete(topic))
  }

  handleMessage(message) {
    const { topic, data } = message

    // Handle different Kafka event topics
    switch (topic) {
      case 'deal.events':
        this.handleDealEvent(data)
        break
      case 'booking.events':
        this.handleBookingEvent(data)
        break
      case 'billing.events':
        this.handleBillingEvent(data)
        break
      case 'user.events':
        this.handleUserEvent(data)
        break
      default:
        // Generic message handling
        this.notifyListeners(topic, data)
    }
  }

  handleDealEvent(data) {
    if (this.store) {
      if (data.eventType === 'deal_created' || data.eventType === 'deal_updated') {
        this.store.dispatch({
          type: 'deals/addDeal',
          payload: data.deal || data
        })
      }
      
      // Show notification
      this.store.dispatch({
        type: 'notifications/addNotification',
        payload: {
          type: 'deal',
          title: 'New Deal Available!',
          message: `Great deal on ${data.deal?.type || 'travel'} - ${data.deal?.discount || ''}% off`,
          severity: 'info'
        }
      })
    }
  }

  handleBookingEvent(data) {
    if (this.store) {
      if (data.eventType === 'booking_created') {
        this.store.dispatch({
          type: 'bookings/addBooking',
          payload: data.booking || data
        })
        this.store.dispatch({
          type: 'notifications/addNotification',
          payload: {
            type: 'booking',
            title: 'Booking Created',
            message: `Your ${data.booking?.type || 'booking'} has been created`,
            severity: 'success'
          }
        })
      } else if (data.eventType === 'booking_confirmed') {
        this.store.dispatch({
          type: 'bookings/updateBooking',
          payload: data.booking || data
        })
        this.store.dispatch({
          type: 'notifications/addNotification',
          payload: {
            type: 'booking',
            title: 'Booking Confirmed!',
            message: `Your ${data.booking?.type || 'booking'} has been confirmed`,
            severity: 'success'
          }
        })
      } else if (data.eventType === 'booking_cancelled') {
        this.store.dispatch({
          type: 'bookings/updateBooking',
          payload: data.booking || data
        })
        this.store.dispatch({
          type: 'notifications/addNotification',
          payload: {
            type: 'booking',
            title: 'Booking Cancelled',
            message: `Your ${data.booking?.type || 'booking'} has been cancelled`,
            severity: 'warning'
          }
        })
      }
    }
  }

  handleBillingEvent(data) {
    if (this.store) {
      if (data.eventType === 'billing_success') {
        this.store.dispatch({
          type: 'notifications/addNotification',
          payload: {
            type: 'payment',
            title: 'Payment Successful',
            message: `Payment of $${data.amount || 'N/A'} processed successfully`,
            severity: 'success'
          }
        })
      } else if (data.eventType === 'billing_failed') {
        this.store.dispatch({
          type: 'notifications/addNotification',
          payload: {
            type: 'payment',
            title: 'Payment Failed',
            message: data.message || 'Payment could not be processed',
            severity: 'error'
          }
        })
      }
    }
  }

  handleUserEvent(data) {
    // Handle user-related events if needed
    console.log('[WebSocket] User event:', data)
  }

  on(topic, callback) {
    if (!this.listeners.has(topic)) {
      this.listeners.set(topic, [])
    }
    this.listeners.get(topic).push(callback)
  }

  off(topic, callback) {
    if (this.listeners.has(topic)) {
      const callbacks = this.listeners.get(topic)
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  notifyListeners(topic, data) {
    if (this.listeners.has(topic)) {
      this.listeners.get(topic).forEach(callback => callback(data))
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      // Only log in development
      if (import.meta.env.DEV) {
        console.debug(`[WebSocket] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
      }
      
      setTimeout(() => {
        if (this.store) {
          this.connect(this.store)
        }
      }, this.reconnectDelay)
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
      this.isConnected = false
      this.subscriptions.clear()
    }
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('[WebSocket] Cannot send message - not connected')
    }
  }
}

// Singleton instance
const wsService = new WebSocketService()

export default wsService

