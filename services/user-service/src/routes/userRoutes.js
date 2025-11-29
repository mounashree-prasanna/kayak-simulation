const express = require('express');
const router = express.Router();
const {
  createUser,
  loginUser,
  getUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');

router.post('/login', loginUser);
router.post('/', createUser);
router.get('/:user_id', getUser);
router.put('/:user_id', updateUser);
router.delete('/:user_id', deleteUser);

module.exports = router;

