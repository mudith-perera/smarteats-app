const MealPlan = require("../models/MealPlan");
const User = require("../models/User");
const Profile = require("../models/Profile");

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
      filter.$or = [
        { title: { $regex: q.trim(), $options: "i" } },
        { description: { $regex: q.trim(), $options: "i" } },
      ];
    }

    if (diet) {
      // support single or multiple diet tags
      const dietArr = Array.isArray(diet)
        ? diet
        : String(diet)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
      if (dietArr.length) filter.dietTags = { $in: dietArr };
    }

    if (goal) {
      const goalArr = Array.isArray(goal)
        ? goal
        : String(goal)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
      filter.goalType = goalArr.length > 1 ? { $in: goalArr } : goalArr[0];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      MealPlan.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      MealPlan.countDocuments(filter),
    ]);

    const pages = Math.max(1, Math.ceil(total / limitNum));
    return res.json({ items, total, page: pageNum, pages });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/mealplans/suggested
exports.suggestedMealPlans = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("profile").lean();
    let activeProfile = null;

    if (user?.profile) {
      const activeId =
        typeof user.profile === "object" && user.profile._id
          ? user.profile._id
          : user.profile;
      activeProfile = await Profile.findOne({
        _id: activeId,
        user: userId,
      }).lean();
    }

    const dietaryPreferences = Array.isArray(activeProfile?.dietaryPreferences)
      ? activeProfile.dietaryPreferences
      : [];
    const goal = activeProfile?.goal || null;

    const hasSignals = dietaryPreferences.length > 0 || !!goal;

    let items = [];
    if (hasSignals) {
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
        { $sort: { score: -1, createdAt: -1 } },
        { $limit: 12 },
      ]);

      // If everything scored 0, fall back to recent actives
      const hasPositive = items.some((p) => (p.score ?? 0) > 0);
      if (!hasPositive) {
        items = await MealPlan.find({ isActive: true })
          .sort({ createdAt: -1 })
          .limit(12)
          .lean();
      }
    } else {
      // No profile signals → return recent
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
exports.suggestedMealPlans = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("profile").lean();

    let activeProfile = null;
    if (user?.profile) {
      const activeId =
        typeof user.profile === "object" && user.profile._id
          ? user.profile._id
          : user.profile;
      activeProfile = await Profile.findOne({
        _id: activeId,
        user: userId,
      }).lean();
    }
    if (!activeProfile) {
      activeProfile = await Profile.findOne({ user: userId, isActive: true })
        .sort({ updatedAt: -1, createdAt: -1 })
        .lean();
    }

    const dietaryPreferences = Array.isArray(activeProfile?.dietaryPreferences)
      ? activeProfile.dietaryPreferences.map(String) || []
      : [];
    const goal = activeProfile?.goal || null;

    const baseMatch = { isActive: true };

    let hardMatch = { ...baseMatch };
    if (dietaryPreferences.length > 0) {
      hardMatch.dietTags = { $all: dietaryPreferences };
    }

    let items = await MealPlan.aggregate([
      { $match: hardMatch },
      {
        $addFields: {
          goalMatch: goal ? { $cond: [{ $eq: ["$goalType", goal] }, 1, 0] } : 0,
        },
      },
      { $sort: { goalMatch: -1, createdAt: -1 } },
      { $limit: 12 },
    ]);

    if (items.length === 0 && dietaryPreferences.length > 0) {
      items = await MealPlan.aggregate([
        {
          $match: {
            ...baseMatch,
            dietTags: { $in: dietaryPreferences },
          },
        },
        {
          $addFields: {
            dietOverlap: {
              $size: { $setIntersection: ["$dietTags", dietaryPreferences] },
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
                { $multiply: ["$dietOverlap", 2] },
                { $multiply: ["$goalMatch", 3] },
              ],
            },
          },
        },
        { $sort: { score: -1, createdAt: -1 } },
        { $limit: 12 },
      ]);
    }

    if (items.length === 0) {
      items = await MealPlan.find(baseMatch)
        .sort({ createdAt: -1 })
        .limit(12)
        .lean();
    }

    return res.json({
      items,
      profileSignals: {
        dietaryPreferences,
        goal,
        profileId: activeProfile?._id || null,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
