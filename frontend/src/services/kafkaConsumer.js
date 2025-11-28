/**
 * Kafka Consumer Service (Frontend)
 * 
 * Since Kafka runs on the backend, this service connects via HTTP polling
 * or WebSocket to consume Kafka events. The backend services publish events
 * to Kafka topics, and this frontend service receives them via WebSocket
 * or HTTP endpoints.
 * 
 * Kafka Topics Used:
 * - user.events: User lifecycle events (created, updated, deleted)
 * - booking.events: Booking events (created, confirmed, cancelled)
 * - billing.events: Billing events (success, failed)
 * - deal.events: Deal updates from Recommendation Service
 * - tracking.events: Click/tracking events
 */

import { store } from '../store/store'
import wsService from './websocket'

class KafkaConsumerService {
  constructor() {
    this.subscribedTopics = new Set()
    this.pollingInterval = null
  }

  /**
   * Subscribe to Kafka topics via WebSocket
   * The WebSocket service connects to the Recommendation Service
   * which broadcasts Kafka events
   */
  subscribeToTopics(topics) {
    topics.forEach(topic => this.subscribedTopics.add(topic))
    
    // Subscribe via WebSocket
    wsService.subscribe(topics)
    
    // Also set up polling as fallback (if WebSocket fails)
    this.startPolling()
  }

  /**
   * Poll for events via HTTP (fallback method)
   * This would require a backend endpoint that consumes from Kafka
   * and exposes events via HTTP
   */
  startPolling() {
    if (this.pollingInterval) return
    
    // Poll every 5 seconds for new events
    this.pollingInterval = setInterval(async () => {
      if (!wsService.isConnected) {
        // Fallback: poll HTTP endpoint if WebSocket is down
        // This would require a backend endpoint like GET /api/events/poll
        try {
          // Example: const response = await api.get('/events/poll')
          // Handle events...
        } catch (error) {
          console.error('[Kafka Consumer] Polling error:', error)
        }
      }
    }, 5000)
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
  }

  unsubscribeFromTopics(topics) {
    topics.forEach(topic => this.subscribedTopics.delete(topic))
    wsService.unsubscribe(topics)
  }

  /**
   * Handle incoming Kafka events
   * Events are received via WebSocket and dispatched to Redux store
   */
  handleEvent(event) {
    const { topic, eventType, data } = event

    switch (topic) {
      case 'user.events':
        this.handleUserEvent(eventType, data)
        break
      case 'booking.events':
        this.handleBookingEvent(eventType, data)
        break
      case 'billing.events':
        this.handleBillingEvent(eventType, data)
        break
      case 'deal.events':
        this.handleDealEvent(eventType, data)
        break
      case 'tracking.events':
        this.handleTrackingEvent(eventType, data)
        break
      default:
        console.log('[Kafka Consumer] Unknown topic:', topic)
    }
  }

  handleUserEvent(eventType, data) {
    // User events are typically handled on the backend
    // Frontend might receive notifications about user updates
    console.log('[Kafka Consumer] User event:', eventType, data)
  }

  handleBookingEvent(eventType, data) {
    // Already handled by WebSocket service
    // This is a fallback handler
    console.log('[Kafka Consumer] Booking event:', eventType, data)
  }

  handleBillingEvent(eventType, data) {
    // Already handled by WebSocket service
    console.log('[Kafka Consumer] Billing event:', eventType, data)
  }

  handleDealEvent(eventType, data) {
    // Already handled by WebSocket service
    console.log('[Kafka Consumer] Deal event:', eventType, data)
  }

  handleTrackingEvent(eventType, data) {
    // Tracking events are sent to backend, not consumed by frontend
    console.log('[Kafka Consumer] Tracking event:', eventType, data)
  }

  disconnect() {
    this.stopPolling()
    this.subscribedTopics.clear()
  }
}

// Singleton instance
const kafkaConsumer = new KafkaConsumerService()

export default kafkaConsumer

