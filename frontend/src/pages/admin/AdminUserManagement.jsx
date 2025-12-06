import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '../../store/hooks'
import api from '../../services/api'
import { addNotification } from '../../store/slices/notificationSlice'
import { useAppDispatch } from '../../store/hooks'
import './AdminDashboard.css'

const AdminUserManagement = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { isAuthenticated, role, userRole } = useAppSelector(state => state.auth)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 20
  const [editingUser, setEditingUser] = useState(null)
  const [editForm, setEditForm] = useState({})

  useEffect(() => {
    if (!isAuthenticated || role !== 'admin') {
      navigate('/login')
    } else if (userRole !== 'Super Admin' && userRole !== 'User Admin') {
      navigate('/admin/dashboard')
    }
  }, [isAuthenticated, role, userRole, navigate])

  useEffect(() => {
    if (isAuthenticated && role === 'admin' && (userRole === 'Super Admin' || userRole === 'User Admin')) {
      fetchUsers()
    }
  }, [isAuthenticated, role, userRole, currentPage, searchTerm])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = {
        page: currentPage,
        limit: itemsPerPage
      }
      if (searchTerm) {
        params.search = searchTerm
      }
      
      const response = await api.get('/admins/users/all', { params })
      if (response.data.success) {
        setUsers(response.data.data || [])
        const total = response.data.total || 0
        setTotalPages(Math.ceil(total / itemsPerPage))
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
      setError(err.response?.data?.error || 'Failed to fetch users')
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: err.response?.data?.error || 'Failed to fetch users',
        severity: 'error'
      }))
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchUsers()
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setEditForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      phone_number: user.phone_number || '',
      address: {
        street: user.address?.street || '',
        city: user.address?.city || '',
        state: user.address?.state || '',
        zip: user.address?.zip || ''
      }
    })
  }

  const handleEditChange = (field, value) => {
    if (field.startsWith('address.')) {
      const addressField = field.split('.')[1]
      setEditForm({
        ...editForm,
        address: {
          ...editForm.address,
          [addressField]: value
        }
      })
    } else {
      setEditForm({
        ...editForm,
        [field]: value
      })
    }
  }

  const handleSaveEdit = async () => {
    try {
      const response = await api.put(`/admins/users/${editingUser.user_id}`, editForm)
      if (response.data.success) {
        dispatch(addNotification({
          type: 'success',
          title: 'Success',
          message: 'User updated successfully',
          severity: 'success'
        }))
        setEditingUser(null)
        fetchUsers()
      }
    } catch (err) {
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: err.response?.data?.error || 'Failed to update user',
        severity: 'error'
      }))
    }
  }

  const handleCancelEdit = () => {
    setEditingUser(null)
    setEditForm({})
  }

  // Show error message instead of returning null
  if (!isAuthenticated || role !== 'admin') {
    return (
      <div className="admin-dashboard">
        <div className="admin-container">
          <div className="error">Please log in as an admin to access this page.</div>
        </div>
      </div>
    )
  }

  if (userRole !== 'Super Admin' && userRole !== 'User Admin') {
    return (
      <div className="admin-dashboard">
        <div className="admin-container">
          <div className="admin-header">
            <h1>User Management</h1>
            <button onClick={() => navigate('/admin/dashboard')} className="btn-back">← Back to Admin Dashboard</button>
          </div>
          <div className="admin-content">
            <div className="error">Admin access required. You need Super Admin or User Admin role to access this page.</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-container">
        <div className="admin-header">
          <h1>User Management</h1>
          <button onClick={() => navigate('/admin/dashboard')} className="btn-back">← Back to Admin Dashboard</button>
        </div>

        <div className="admin-content">
          <div className="admin-search-section">
            <form onSubmit={handleSearch} className="search-form">
              <input
                type="text"
                placeholder="Search by name, email, or user ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <button type="submit" className="btn-search">Search</button>
              {searchTerm && (
                <button type="button" onClick={() => { setSearchTerm(''); setCurrentPage(1); }} className="btn-clear">
                  Clear
                </button>
              )}
            </form>
          </div>

          {loading ? (
            <div className="loading">Loading users...</div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : (
            <>
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Address</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="no-data">No users found</td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.user_id}>
                          <td>{user.user_id}</td>
                          <td>{user.first_name} {user.last_name}</td>
                          <td>{user.email}</td>
                          <td>{user.phone_number || 'N/A'}</td>
                          <td>
                            {user.address ? 
                              `${user.address.street || ''}, ${user.address.city || ''}, ${user.address.state || ''} ${user.address.zip || ''}`.trim() 
                              : 'N/A'
                            }
                          </td>
                          <td>
                            <button onClick={() => handleEdit(user)} className="btn-edit-small">Edit</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="pagination-btn"
                  >
                    Previous
                  </button>
                  <span className="pagination-info">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                    className="pagination-btn"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {editingUser && (
          <div className="modal-overlay" onClick={handleCancelEdit}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Edit User: {editingUser.user_id}</h2>
              <div className="edit-form">
                <div className="form-group">
                  <label>First Name:</label>
                  <input
                    type="text"
                    value={editForm.first_name}
                    onChange={(e) => handleEditChange('first_name', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Last Name:</label>
                  <input
                    type="text"
                    value={editForm.last_name}
                    onChange={(e) => handleEditChange('last_name', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Email:</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => handleEditChange('email', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number:</label>
                  <input
                    type="tel"
                    value={editForm.phone_number}
                    onChange={(e) => handleEditChange('phone_number', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Street Address:</label>
                  <input
                    type="text"
                    value={editForm.address?.street}
                    onChange={(e) => handleEditChange('address.street', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>City:</label>
                  <input
                    type="text"
                    value={editForm.address?.city}
                    onChange={(e) => handleEditChange('address.city', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>State:</label>
                  <input
                    type="text"
                    value={editForm.address?.state}
                    onChange={(e) => handleEditChange('address.state', e.target.value)}
                    maxLength="2"
                  />
                </div>
                <div className="form-group">
                  <label>ZIP Code:</label>
                  <input
                    type="text"
                    value={editForm.address?.zip}
                    onChange={(e) => handleEditChange('address.zip', e.target.value)}
                  />
                </div>
                <div className="modal-actions">
                  <button onClick={handleCancelEdit} className="btn-cancel">Cancel</button>
                  <button onClick={handleSaveEdit} className="btn-save">Save Changes</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminUserManagement
