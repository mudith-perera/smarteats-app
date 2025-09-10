const express = require('express');
const { registerUser, loginUser, createProfile, getProfiles, setActiveProfile, getUsers, updateUser, deleteUser } = require('../controllers/userController');
const { verifyToken, adminMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/createProfile', verifyToken, createProfile); // New route for creating profile
router.get('/me/profiles', verifyToken, getProfiles); // New route for getting profiles
router.put('/me/active-profile', verifyToken, setActiveProfile);


router.get('/', verifyToken, adminMiddleware, getUsers);
router.put('/:id', verifyToken, adminMiddleware, updateUser);
router.delete('/:id', verifyToken, adminMiddleware, deleteUser);

module.exports = router;
