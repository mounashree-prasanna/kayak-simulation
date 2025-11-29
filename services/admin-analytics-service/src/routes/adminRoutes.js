const express = require('express');
const router = express.Router();
const {
  createAdmin,
  getAdmins,
  getAdmin,
  updateAdmin,
  deleteAdmin,
  getAllUsers,
  updateUserByAdmin
} = require('../controllers/adminController');
const { authenticate, requireAdmin, requirePermission } = require('../middleware/auth');

// All admin routes require authentication
router.use(authenticate);
router.use(requireAdmin);

// Admin CRUD operations
router.post('/', requirePermission('create_admin'), createAdmin);
router.get('/', requirePermission('create_admin'), getAdmins);
router.get('/:admin_id', getAdmin);
router.put('/:admin_id', updateAdmin);
router.delete('/:admin_id', requirePermission('create_admin'), deleteAdmin);

// User management (User Admin and Super Admin)
router.get('/users/all', requirePermission('manage_users'), getAllUsers);
router.put('/users/:user_id', requirePermission('manage_users'), updateUserByAdmin);

module.exports = router;

