import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '../../store/hooks'
import api from '../../services/api'
import { addNotification } from '../../store/slices/notificationSlice'
import './AdminDashboard.css'

const AdminAdminManagement = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { isAuthenticated, role, userRole } = useAppSelector(state => state.auth)
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newAdmin, setNewAdmin] = useState({
    admin_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    password: '',
    role: 'Listing Admin',
    address: {
      street: '',
      city: '',
      state: '',
      zip: ''
    }
  })

  useEffect(() => {
    if (!isAuthenticated || role !== 'admin') {
      navigate('/login')
    } else if (userRole !== 'Super Admin') {
      navigate('/admin/dashboard')
    }
  }, [isAuthenticated, role, userRole, navigate])

  useEffect(() => {
    if (isAuthenticated && role === 'admin' && userRole === 'Super Admin') {
      fetchAdmins()
    }
  }, [isAuthenticated, role, userRole])

  const fetchAdmins = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/admins')
      if (response.data.success) {
        setAdmins(response.data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch admins:', err)
      setError(err.response?.data?.error || 'Failed to fetch admins')
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: err.response?.data?.error || 'Failed to fetch admins',
        severity: 'error'
      }))
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAdmin = async (e) => {
    e.preventDefault()
    try {
      const response = await api.post('/admins', newAdmin)
      if (response.data.success) {
        dispatch(addNotification({
          type: 'success',
          title: 'Success',
          message: 'Admin created successfully',
          severity: 'success'
        }))
        setShowAddModal(false)
        setNewAdmin({
          admin_id: '',
          first_name: '',
          last_name: '',
          email: '',
          phone_number: '',
          password: '',
          role: 'Listing Admin',
          address: {
            street: '',
            city: '',
            state: '',
            zip: ''
          }
        })
        fetchAdmins()
      }
    } catch (err) {
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: err.response?.data?.error || 'Failed to create admin',
        severity: 'error'
      }))
    }
  }

  const handleDelete = async (admin) => {
    if (!window.confirm(`Are you sure you want to delete admin ${admin.admin_id}?`)) {
      return
    }

    try {
      await api.delete(`/admins/${admin.admin_id}`)
      dispatch(addNotification({
        type: 'success',
        title: 'Success',
        message: 'Admin deleted successfully',
        severity: 'success'
      }))
      fetchAdmins()
    } catch (err) {
      dispatch(addNotification({
        type: 'error',
        title: 'Error',
        message: err.response?.data?.error || 'Failed to delete admin',
        severity: 'error'
      }))
    }
  }

  if (!isAuthenticated || role !== 'admin') {
    return (
      <div className="admin-dashboard">
        <div className="admin-container">
          <div className="error">Please log in as an admin to access this page.</div>
        </div>
      </div>
    )
  }

  if (userRole !== 'Super Admin') {
    return (
      <div className="admin-dashboard">
        <div className="admin-container">
          <div className="admin-header">
            <h1>Admin Management</h1>
            <button onClick={() => navigate('/admin/dashboard')} className="btn-back">← Back to Admin Dashboard</button>
          </div>
          <div className="admin-content">
            <div className="error">Admin access required. Only Super Admin can access this page.</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-container">
        <div className="admin-header">
          <h1>Admin Management</h1>
          <button onClick={() => navigate('/admin/dashboard')} className="btn-back">← Back to Admin Dashboard</button>
        </div>

        <div className="admin-content">
          <div style={{ marginBottom: '2rem' }}>
            <button onClick={() => setShowAddModal(true)} className="btn-add">
              + Create New Admin
            </button>
          </div>

          {loading ? (
            <div className="loading">Loading admins...</div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Admin ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Phone</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="no-data">No admins found</td>
                    </tr>
                  ) : (
                    admins.map((admin) => (
                      <tr key={admin.admin_id}>
                        <td>{admin.admin_id}</td>
                        <td>{admin.first_name} {admin.last_name}</td>
                        <td>{admin.email}</td>
                        <td>
                          <span className="role-badge">{admin.role}</span>
                        </td>
                        <td>{admin.phone_number || 'N/A'}</td>
                        <td>
                          <button onClick={() => handleDelete(admin)} className="btn-delete-small">Delete</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showAddModal && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Create New Admin</h2>
              <form onSubmit={handleCreateAdmin} className="edit-form">
                <div className="form-group">
                  <label>Admin ID:</label>
                  <input
                    type="text"
                    value={newAdmin.admin_id}
                    onChange={(e) => setNewAdmin({ ...newAdmin, admin_id: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>First Name:</label>
                  <input
                    type="text"
                    value={newAdmin.first_name}
                    onChange={(e) => setNewAdmin({ ...newAdmin, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Last Name:</label>
                  <input
                    type="text"
                    value={newAdmin.last_name}
                    onChange={(e) => setNewAdmin({ ...newAdmin, last_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email:</label>
                  <input
                    type="email"
                    value={newAdmin.email}
                    onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number:</label>
                  <input
                    type="tel"
                    value={newAdmin.phone_number}
                    onChange={(e) => setNewAdmin({ ...newAdmin, phone_number: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Password:</label>
                  <input
                    type="password"
                    value={newAdmin.password}
                    onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                    required
                    minLength={8}
                  />
                </div>
                <div className="form-group">
                  <label>Role:</label>
                  <select
                    value={newAdmin.role}
                    onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
                    required
                  >
                    <option value="Listing Admin">Listing Admin</option>
                    <option value="User Admin">User Admin</option>
                    <option value="Billing Admin">Billing Admin</option>
                    <option value="Analytics Admin">Analytics Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Street Address:</label>
                  <input
                    type="text"
                    value={newAdmin.address.street}
                    onChange={(e) => setNewAdmin({ ...newAdmin, address: { ...newAdmin.address, street: e.target.value } })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>City:</label>
                  <input
                    type="text"
                    value={newAdmin.address.city}
                    onChange={(e) => setNewAdmin({ ...newAdmin, address: { ...newAdmin.address, city: e.target.value } })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>State:</label>
                  <input
                    type="text"
                    value={newAdmin.address.state}
                    onChange={(e) => setNewAdmin({ ...newAdmin, address: { ...newAdmin.address, state: e.target.value } })}
                    maxLength="2"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>ZIP Code:</label>
                  <input
                    type="text"
                    value={newAdmin.address.zip}
                    onChange={(e) => setNewAdmin({ ...newAdmin, address: { ...newAdmin.address, zip: e.target.value } })}
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowAddModal(false)} className="btn-cancel">Cancel</button>
                  <button type="submit" className="btn-save">Create Admin</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminAdminManagement
