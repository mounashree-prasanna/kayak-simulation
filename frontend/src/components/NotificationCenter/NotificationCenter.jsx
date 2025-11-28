import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppSelector, useAppDispatch } from '../../store/hooks'
import { markAsRead, markAllAsRead, removeNotification } from '../../store/slices/notificationSlice'
import { FaBell, FaTimes, FaCheck } from 'react-icons/fa'
import './NotificationCenter.css'

const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { notifications, unreadCount } = useAppSelector(state => state.notifications)
  const dispatch = useAppDispatch()

  const handleMarkAsRead = (id) => {
    dispatch(markAsRead(id))
  }

  const handleMarkAllAsRead = () => {
    dispatch(markAllAsRead())
  }

  const handleRemove = (id) => {
    dispatch(removeNotification(id))
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'error': return '#ef4444'
      case 'warning': return '#f59e0b'
      case 'success': return '#10b981'
      default: return '#3b82f6'
    }
  }

  return (
    <div className="notification-center">
      <button
        className="notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <FaBell size={20} />
        {unreadCount > 0 && (
          <motion.span
            className="notification-badge"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="notification-panel"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div className="notification-header">
              <h3>Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllAsRead} className="mark-all-read">
                  Mark all as read
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="close-btn">
                <FaTimes size={16} />
              </button>
            </div>

            <div className="notification-list">
              {notifications.length === 0 ? (
                <div className="no-notifications">
                  <p>No notifications</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    style={{
                      borderLeft: `4px solid ${getSeverityColor(notification.severity)}`
                    }}
                  >
                    <div className="notification-content">
                      <h4>{notification.title}</h4>
                      <p>{notification.message}</p>
                      <span className="notification-time">
                        {new Date(notification.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="notification-actions">
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="action-btn"
                          aria-label="Mark as read"
                        >
                          <FaCheck size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => handleRemove(notification.id)}
                        className="action-btn remove"
                        aria-label="Remove"
                      >
                        <FaTimes size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default NotificationCenter

