const mongoose = require('mongoose');

const DietTag = ['vegetarian','vegan','gluten_free','dairy_free','nut_free','halal','kosher'];
const GoalType = ['lose_weight','maintain','gain_muscle'];

// const OAuthProviderSchema = new mongoose.Schema({
//   provider: { type: String, enum: ['google','apple'], required: true },
//   providerId: { type: String, required: true },
//   emailVerified: { type: Boolean, default: false },
// }, { _id: false });

const ProfileSchema = new mongoose.Schema({
    age: { type: Number, min: 12, max: 120 },
    weight: { type: Number, min: 20, max: 500 },
    height: { type: Number, min: 80, max: 250 },
    dietaryPreferences: [{ type: String, enum: DietTag }],
    goal: { type: String, enum: GoalType, default: 'maintain' },
    unitSystem: { type: String, enum: ['metric', 'imperial'], default: 'metric' },
});

const UserSchema = new mongoose.Schema({
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    profile: { type: ProfileSchema },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
