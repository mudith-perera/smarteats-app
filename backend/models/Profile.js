const mongoose = require('mongoose');

const DietTag = ['vegetarian','vegan','gluten_free','dairy_free','nut_free','halal','kosher'];
const GoalType = ['lose_weight','maintain','gain_muscle'];

const ProfileSchema = new mongoose.Schema({
    name: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    age: { type: Number, min: 12, max: 120 },
    weight: { type: Number, min: 20, max: 500 },
    height: { type: Number, min: 80, max: 250 },
    dietaryPreferences: [{ type: String, enum: DietTag }],
    goal: { type: String, enum: GoalType, default: 'maintain' },
    unitSystem: { type: String, enum: ['metric', 'imperial'], default: 'metric' },
    isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('Profile', ProfileSchema);