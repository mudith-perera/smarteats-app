const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    age: Number,
    weight: Number,
    height: Number,
    preferences: String,
    goals: String,
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
