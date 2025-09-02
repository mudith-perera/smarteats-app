const express = require('express');
const { registerUser, loginUser, getUsers, updateUser, deleteUser } = require('../controllers/userController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/', authMiddleware, adminMiddleware, getUsers);
router.put('/:id', authMiddleware, adminMiddleware, updateUser);
router.delete('/:id', authMiddleware, adminMiddleware, deleteUser);

module.exports = router;
