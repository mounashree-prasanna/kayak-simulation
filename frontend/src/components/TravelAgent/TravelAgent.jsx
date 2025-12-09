import { useState, useRef, useEffect } from 'react'
import { useAppSelector } from '../../store/hooks'
import api from '../../services/api'
import './TravelAgent.css'

const TravelAgent = () => {
  const { user, isAuthenticated } = useAppSelector(state => state.auth)
  const [messages, setMessages] = useState([
    {
      type: 'agent',
      text: "Hi! I'm your travel concierge. Tell me where you'd like to go and I'll find the best deals for you! 🧳",
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationHistory, setConversationHistory] = useState([])
  const [bundles, setBundles] = useState(null)
  const messagesEndRef = useRef(null)
  const wsRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  const addMessage = (type, text, data = null) => {
    setMessages(prev => [...prev, {
      type,
      text,
      data,
      timestamp: new Date()
    }])
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    addMessage('user', userMessage)
    setLoading(true)

    try {
      const intentResponse = await api.post('/intent', {
        query: userMessage,
        conversation_history: conversationHistory
      })

      if (!intentResponse.data || !intentResponse.data.intent) {
        throw new Error('Invalid response format from intent service')
      }

      const intent = intentResponse.data.intent

      setConversationHistory(prev => [...prev, 
        { role: 'user', content: userMessage }
      ])

      if (intent.needs_clarification && intent.clarification_question) {
        addMessage('agent', intent.clarification_question)
        setConversationHistory(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'user', content: userMessage }
          return [...updated, { role: 'assistant', content: intent.clarification_question }]
        })
        setLoading(false)
        return
      }

      if (!intent.destination) {
        const msg = "I need to know where you'd like to go! Please tell me your destination (e.g., 'I want to go to Paris' or 'I want to travel to NYC')."
        addMessage('agent', msg)
        setConversationHistory(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'user', content: userMessage }
          return [...updated, { role: 'assistant', content: msg }]
        })
        setLoading(false)
        return
      }

      if (!intent.origin) {
        const msg = `Great! You want to go to ${intent.destination}. Where will you be traveling from? (e.g., 'from New York' or 'from Los Angeles')`
        addMessage('agent', msg)
        setConversationHistory(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'user', content: userMessage }
          return [...updated, { role: 'assistant', content: msg }]
        })
        setLoading(false)
        return
      }

      if (!intent.check_in || !intent.check_out) {
        const msg = `Perfect! ${intent.origin} to ${intent.destination}. When would you like to travel? Please provide check-in and check-out dates (e.g., 'March 15-20' or 'from March 1 to March 5').`
        addMessage('agent', msg)
        setConversationHistory(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'user', content: userMessage }
          return [...updated, { role: 'assistant', content: msg }]
        })
        setLoading(false)
        return
      }

      const checkinDate = new Date(intent.check_in)
      const checkoutDate = new Date(intent.check_out)
      
      const bundlesResponse = await api.post('/bundles', {
        origin: intent.origin,
        destination: intent.destination,
        checkin: checkinDate.toISOString(),
        checkout: checkoutDate.toISOString(),
        budget: intent.budget || 2000,
        constraints: intent.constraints || {}
      }, {
        headers: {
          'X-User-ID': user?.user_id || 'anonymous'
        }
      })

      let responseText = "I couldn't find any bundles."

      if (bundlesResponse.data.success && bundlesResponse.data.bundles.length > 0) {
        setBundles(bundlesResponse.data.bundles)
        
        responseText = `I found ${bundlesResponse.data.bundles.length} great bundle(s) for you! ✈️🏨\n\n`
        
        bundlesResponse.data.bundles.forEach((bundle, idx) => {
          responseText += `**Bundle ${idx + 1}** (Fit Score: ${bundle.fit_score.toFixed(0)}/100)\n`
          responseText += `💰 Total: $${bundle.total_price.toFixed(2)}\n`
          responseText += `✈️ Flight: ${bundle.flight.airline} - $${bundle.flight.price.toFixed(2)}\n`
          responseText += `🏨 Hotel: ${bundle.hotel.name} - $${bundle.hotel.total_price.toFixed(2)} (${bundle.hotel.total_nights} nights)\n`
          responseText += `💡 ${bundle.why_this}\n`
          responseText += `⚠️ ${bundle.what_to_watch}\n\n`
        })

        addMessage('agent', responseText, bundlesResponse.data.bundles)
      } else {
        const noBundlesMessage = "I couldn't find any matching bundles for your criteria. Try adjusting your dates or destination!"
        responseText = noBundlesMessage
        addMessage('agent', noBundlesMessage)
      }

      setConversationHistory(prev => [...prev, 
        { role: 'user', content: userMessage },
        { role: 'assistant', content: responseText }
      ])

    } catch (error) {
      console.error('Agent error:', error)
      
      let errorMessage = "Sorry, I encountered an error. "
      
      if (error.response) {
        const status = error.response.status
        const data = error.response.data
        
        if (status === 502 || status === 503) {
          errorMessage += "The recommendation service is currently unavailable. Please try again later."
        } else if (status === 401) {
          errorMessage += "Authentication failed. Please refresh the page."
        } else if (data?.detail || data?.message) {
          errorMessage += data.detail || data.message
        } else {
          errorMessage += `Server error (${status}). Please try again.`
        }
      } else if (error.request) {
        errorMessage += "Unable to connect to the server. Please check if the backend services are running."
      } else if (error.message) {
        if (error.message.includes('Network Error') || error.message.includes('timeout')) {
          errorMessage += "Network connection failed. Please check your internet connection and ensure services are running."
        } else {
          errorMessage += error.message
        }
      } else {
        errorMessage += "Please try again or rephrase your request."
      }
      
      addMessage('agent', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="travel-agent-container">
      <div className="agent-header">
        <div className="agent-avatar">🤖</div>
        <div className="agent-info">
          <h3>Travel Concierge</h3>
          <p>AI-Powered Travel Assistant</p>
        </div>
        <div className={`agent-status ${loading ? 'typing' : 'online'}`}>
          {loading ? 'Typing...' : 'Online'}
        </div>
      </div>

      <div className="agent-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.type}`}>
            <div className="message-content">
              {msg.type === 'agent' && <span className="message-avatar">🤖</span>}
              <div className="message-text">
                {msg.text.split('\n').map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
              {msg.type === 'user' && <span className="message-avatar">👤</span>}
            </div>
            {msg.data && msg.data.length > 0 && (
              <div className="bundles-preview">
                {msg.data.map((bundle, bidx) => (
                  <div key={bidx} className="bundle-card">
                    <div className="bundle-header">
                      <span className="bundle-number">Bundle {bidx + 1}</span>
                      <span className="bundle-score">Fit: {bundle.fit_score.toFixed(0)}%</span>
                    </div>
                    <div className="bundle-details">
                      <div className="bundle-item">
                        <span className="bundle-icon">✈️</span>
                        <span>{bundle.flight.airline || 'Airline'} - ${bundle.flight.price.toFixed(2)}</span>
                      </div>
                      <div className="bundle-item">
                        <span className="bundle-icon">🏨</span>
                        <span>{bundle.hotel.name || 'Hotel'} - ${bundle.hotel.total_price.toFixed(2)}</span>
                      </div>
                      <div className="bundle-total">Total: ${bundle.total_price.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="message agent">
            <div className="message-content">
              <span className="message-avatar">🤖</span>
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="agent-input-container">
        <input
          type="text"
          className="agent-input"
          placeholder="Ask me about your travel plans... (e.g., 'I want to go to Paris from New York on March 15-20, budget $2000')"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
        />
        <button
          className="agent-send-btn"
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  )
}

export default TravelAgent

