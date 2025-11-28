import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Provider } from 'react-redux'
import { Toaster } from 'react-hot-toast'
import { store } from './store/store'
import { fetchUser } from './store/slices/authSlice'
import wsService from './services/websocket'
import kafkaConsumer from './services/kafkaConsumer'
import Layout from './components/Layout/Layout'
import Home from './pages/Home'
import FlightSearch from './pages/FlightSearch'
import HotelSearch from './pages/HotelSearch'
import CarSearch from './pages/CarSearch'
import FlightDetails from './pages/FlightDetails'
import HotelDetails from './pages/HotelDetails'
import CarDetails from './pages/CarDetails'
import Booking from './pages/Booking'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import MyBookings from './pages/MyBookings'
import BookingDetails from './pages/BookingDetails'
import NotificationCenter from './components/NotificationCenter/NotificationCenter'

function App() {
  useEffect(() => {
    // Initialize user on app load
    const token = localStorage.getItem('token')
    if (token) {
      store.dispatch(fetchUser())
    }

    // Connect WebSocket for real-time updates
    wsService.connect(store)
    
    // Subscribe to Kafka topics via WebSocket
    kafkaConsumer.subscribeToTopics([
      'deal.events',
      'booking.events',
      'billing.events',
      'user.events'
    ])

    // Cleanup on unmount
    return () => {
      wsService.disconnect()
      kafkaConsumer.disconnect()
    }
  }, [])

  return (
    <Provider store={store}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/flights" element={<FlightSearch />} />
            <Route path="/hotels" element={<HotelSearch />} />
            <Route path="/cars" element={<CarSearch />} />
            <Route path="/flights/:id" element={<FlightDetails />} />
            <Route path="/hotels/:id" element={<HotelDetails />} />
            <Route path="/cars/:id" element={<CarDetails />} />
            <Route path="/booking/:type/:id" element={<Booking />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/booking-details/:id" element={<BookingDetails />} />
          </Routes>
          <NotificationCenter />
        </Layout>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#4ade80',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </Router>
    </Provider>
  )
}

export default App

