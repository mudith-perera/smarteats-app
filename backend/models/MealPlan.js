const mongoose = require("mongoose");

const DietTag = [
  "vegetarian",
  "vegan",
  "gluten_free",
  "dairy_free",
  "nut_free",
  "halal",
  "kosher",
];
const GoalType = ["lose_weight", "maintain", "gain_muscle"];

const MealPlanSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    calories: { type: Number, min: 0, default: 0 },
    protein: { type: Number, min: 0, default: 0 }, // grams
    fat: { type: Number, min: 0, default: 0 }, // grams
    carbs: { type: Number, min: 0, default: 0 }, // grams
    dietTags: [{ type: String, enum: DietTag }],
    goalType: { type: String, enum: GoalType, required: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MealPlan", MealPlanSchema);
