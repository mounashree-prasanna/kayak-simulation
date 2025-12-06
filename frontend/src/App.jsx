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
import Payment from './pages/Payment'
import NotificationCenter from './components/NotificationCenter/NotificationCenter'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminListingManagement from './pages/admin/AdminListingManagement'
import AdminUserManagement from './pages/admin/AdminUserManagement'
import AdminBilling from './pages/admin/AdminBilling'
import AdminAnalytics from './pages/admin/AdminAnalytics'
import AdminAdminManagement from './pages/admin/AdminAdminManagement'
import ProviderAnalytics from './pages/admin/ProviderAnalytics'
import Host from './pages/Host'
import TravelAgent from './components/TravelAgent/TravelAgent'

function App() {
  useEffect(() => {
    // Initialize user on app load
    const accessToken = localStorage.getItem('accessToken')
    const refreshToken = localStorage.getItem('refreshToken')
    const oldToken = localStorage.getItem('token') // For backward compatibility
    
    if (accessToken && refreshToken) {
      store.dispatch(fetchUser())
    } else if (oldToken) {
      // Migrate from old token format
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
            <Route path="/payment/:bookingId" element={<Payment />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/listings" element={<AdminListingManagement />} />
            <Route path="/admin/users" element={<AdminUserManagement />} />
            <Route path="/admin/billing" element={<AdminBilling />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/admins" element={<AdminAdminManagement />} />
            <Route path="/admin/providers/:provider_id" element={<ProviderAnalytics />} />
            <Route path="/host" element={<Host />} />
            <Route path="/travel-agent" element={<TravelAgent />} />
            <Route path="/concierge" element={<TravelAgent />} />
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

