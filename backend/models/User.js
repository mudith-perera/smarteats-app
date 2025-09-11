const mongoose = require('mongoose');
const Profile = require('./Profile');

// const OAuthProviderSchema = new mongoose.Schema({
//   provider: { type: String, enum: ['google','apple'], required: true },
//   providerId: { type: String, required: true },
//   emailVerified: { type: Boolean, default: false },
// }, { _id: false });

const UserSchema = new mongoose.Schema({
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    profile: { type: Profile.schema, default: null  },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
