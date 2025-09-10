const User = require('../models/User');
const Profile = require('../models/Profile');
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
        const profile = user.profile ? user.profile : null;
        res.status(200).json({ token, message: 'Login successful', profile });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Create Profile
exports.createProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { age, weight, height, dietaryPreferences, goal, unitSystem } = req.body;

        // 1) Create a Profile with the required `user` field
        const profile = await Profile.create({
            user: userId,
            age,
            weight,
            height,
            dietaryPreferences,
            goal,
            unitSystem
        });

        // 2) Store the *embedded* profile on the user document (NOT an id)
        const user = await User.findByIdAndUpdate(
            userId,
            { profile },
            { new: true }
        ).select('-password');

        if (!user) return res.status(404).json({ message: 'User not found' });
        return res.status(200).json({ message: 'Profile created successfully', profile: user.profile });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};


// Get Profiles
exports.getProfiles = async (req, res) => {
    try {
        const userId = req.user.id;

        // get user to know active profile
        const user = await User.findById(userId).select('profile');
        if (!user) return res.status(404).json({ message: 'User not found' });

        // get all profiles of this user
        const profiles = await Profile.find({ user: userId });

        res.status(200).json({
            profiles,
            activeProfileId: user.profile ? user.profile.id : null
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Set Active Profile
exports.setActiveProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { profileId } = req.body;
        // Validate profile belongs to user
        const profile = await Profile.findOne({ _id: profileId, user: userId });
        if (!profile) return res.status(404).json({ message: 'Profile not found' });
        // Update user's embedded profile
        const user = await User.findByIdAndUpdate(
            userId,
            { profile: profile },
            { new: true }
        ).select('-password');

        if (!user) return res.status(404).json({ message: 'User not found' });
        return res.status(200).json({ message: 'Active profile set successfully', profile: user.profile });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

// Get Dashboard Info
exports.getDashboardInfo = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select('firstName lastName username profile');
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Get user's active profile
        const profile = user.profile ? user.profile : null;

        let bmi = null;
        if (profile && profile.weight && profile.height) {
            if (profile.unitSystem === 'metric') {
                // weight in kg, height in cm
                const heightInMeters = profile.height / 100;
                bmi = profile.weight / (heightInMeters * heightInMeters);
            } else if (profile.unitSystem === 'imperial') {
                // weight in lbs, height in inches
                bmi = (profile.weight / (profile.height * profile.height)) * 703;
            }
            bmi = Number(bmi.toFixed(2));
        }

        res.status(200).json({
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username
            },
            profile,
            bmi
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};