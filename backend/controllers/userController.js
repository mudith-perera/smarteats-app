const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');

// Register
exports.registerUser = async (req, res) => {
    try {
        const { firstName, lastName, username, email, password, gender } = req.body;
        const existingUser = await User.findOne({ username });
        if (existingUser) return res.status(409).json({ message: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ firstName, lastName, username, email, password: hashedPassword, gender });
        await user.save();

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Login
exports.loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username }).select('+password');
        if (!user) return res.status(401).json({ message: 'Username not found!' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });
        
        const token = jwt.sign({ userId: user._id, userName: user.username, role: user.role }, jwtSecret, { expiresIn: '1h' });
        res.status(200).json({ token, message: 'Login successful' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get all users (Admin)
exports.getUsers = async (req, res) => {
    try {
        console.log(req.user); // { id, role }
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Update user (Admin)
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        if (updates.password) {
            updates.password = await bcrypt.hash(updates.password, 10);
        }
        const user = await User.findByIdAndUpdate(id, updates, { new: true }).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Delete user (Admin)
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        await User.findByIdAndDelete(id);
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
