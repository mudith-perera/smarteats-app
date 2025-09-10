const express = require('express');
const { registerUser, loginUser, getUsers, updateUser, deleteUser } = require('../controllers/userController');
const { verifyToken, adminMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/', verifyToken, adminMiddleware, getUsers);
router.put('/:id', verifyToken, adminMiddleware, updateUser);
router.delete('/:id', verifyToken, adminMiddleware, deleteUser);

module.exports = router;
