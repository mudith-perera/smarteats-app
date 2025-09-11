const MealPlan = require("../models/MealPlan");
const User = require("../models/User");

// POST /api/mealplans (admin)
exports.createMealPlan = async (req, res) => {
  try {
    const data = req.body;
    data.createdBy = req.user.id;
    const mp = await MealPlan.create(data);
    res.status(201).json({ message: "Meal plan created", mealPlan: mp });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// GET /api/mealplans?q=&diet=&goal=&page=&limit=
exports.listMealPlans = async (req, res) => {
  try {
    const { q, diet, goal, page = 1, limit = 10 } = req.query;
    const filter = { isActive: true };

    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), "i");
      filter.$or = [{ title: regex }, { description: regex }];
    }
    if (diet) filter.dietTags = { $in: Array.isArray(diet) ? diet : [diet] };
    if (goal) filter.goalTypes = { $in: Array.isArray(goal) ? goal : [goal] };

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      MealPlan.find(filter).skip(skip).limit(limitNum).sort({ createdAt: -1 }),
      MealPlan.countDocuments(filter),
    ]);

    res.json({
      items,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/mealplans/suggested (auth)
exports.suggestedMealPlans = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const profile = user?.profile || {};
    const prefs = Array.isArray(profile.dietaryPreferences)
      ? profile.dietaryPreferences
      : [];
    const goal = profile.goal;

    const filter = { isActive: true };
    if (prefs.length) filter.dietTags = { $in: prefs };
    if (goal) filter.goalTypes = { $in: [goal] };

    const query = Object.keys(filter).length ? filter : { isActive: true };
    const items = await MealPlan.find(query).limit(8).sort({ createdAt: -1 });

    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/mealplans/:id
exports.getMealPlan = async (req, res) => {
  try {
    const mp = await MealPlan.findById(req.params.id);
    if (!mp) return res.status(404).json({ message: "Meal plan not found" });
    res.json(mp);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/mealplans/:id (admin)
exports.updateMealPlan = async (req, res) => {
  try {
    const mp = await MealPlan.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!mp) return res.status(404).json({ message: "Meal plan not found" });
    res.json({ message: "Meal plan updated", mealPlan: mp });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE /api/mealplans/:id (admin)
exports.deleteMealPlan = async (req, res) => {
  try {
    const mp = await MealPlan.findByIdAndDelete(req.params.id);
    if (!mp) return res.status(404).json({ message: "Meal plan not found" });
    res.json({ message: "Meal plan deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
