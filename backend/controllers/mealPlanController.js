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
    const { q, diet, goal, page = 1, limit = 100 } = req.query;
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

// Suggested for the logged-in user (scored matching)
// computes a score for each meal plan:

// +2 per matching diet tag

// +3 if goal matches

// Sort by score desc, createdAt desc

// If nothing matches, gracefully fallback to the most recent active plans.
exports.suggestedMealPlans = async (req, res) => {
  try {
    const userId = req.user.id;

    // Load user to find the active profile pointer (could be ObjectId or embedded doc)
    const user = await User.findById(userId).select("profile").lean();

    let activeProfile = null;
    if (user?.profile) {
      const activeId =
        typeof user.profile === "object" && user.profile._id
          ? user.profile._id
          : user.profile;
      // Fetch fresh profile from Profiles collection
      activeProfile = await Profile.findOne({
        _id: activeId,
        user: userId,
      }).lean();
    }

    const dietaryPreferences = Array.isArray(activeProfile?.dietaryPreferences)
      ? activeProfile.dietaryPreferences
      : [];
    const goal = activeProfile?.goal || null;

    // If we have prefs/goal, run a scored aggregation
    const hasSignals = dietaryPreferences.length > 0 || !!goal;

    let items = [];
    if (hasSignals) {
      // Use aggregation to compute score per plan
      items = await MealPlan.aggregate([
        { $match: { isActive: true } },
        {
          $addFields: {
            dietMatches: {
              $size: {
                $setIntersection: ["$dietTags", dietaryPreferences],
              },
            },
            goalMatch: goal
              ? { $cond: [{ $eq: ["$goalType", goal] }, 1, 0] }
              : 0,
          },
        },
        {
          $addFields: {
            score: {
              $add: [
                { $multiply: ["$dietMatches", 2] },
                { $multiply: ["$goalMatch", 3] },
              ],
            },
          },
        },
        // Prefer plans with any score; if all zero, we'll fallback
        { $sort: { score: -1, createdAt: -1 } },
        { $limit: 12 },
      ]);
      // If all scored results are zero or empty, fallback to recents
      const hasPositive = items.some((p) => (p.score ?? 0) > 0);
      if (!hasPositive) {
        items = await MealPlan.find({ isActive: true })
          .sort({ createdAt: -1 })
          .limit(12)
          .lean();
      }
    } else {
      // No profile signals → just return recent plans
      items = await MealPlan.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(12)
        .lean();
    }

    return res.json({ items, profileSignals: { dietaryPreferences, goal } });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
