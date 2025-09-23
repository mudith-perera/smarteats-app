const MealPlan = require("../models/MealPlan");
const User = require("../models/User");
const Profile = require("../models/Profile");
const { rankMealPlans } = require("../services/aiMealPlanRanker");

let rankMealPlansWithAI = rankMealPlans;

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

const toStringArray = (values) =>
  Array.isArray(values) ? values.map((value) => String(value)) : [];

const cleanPlan = (plan, rationale = null) => {
  if (!plan) return null;
  const { score, goalMatch, dietMatches, dietOverlap, ...rest } = plan;

  return { ...rest, aiRationale: rationale ?? null };
};

async function fetchFallbackPlans({ dietaryPreferences, goal, limit }) {
  const baseMatch = { isActive: true };
  const limitNum = limit;

  const sanitize = (items = []) =>
    items
      .map((plan) => cleanPlan(plan))
      .filter(Boolean)
      .slice(0, limitNum);

  if (dietaryPreferences.length) {
    const hardMatch = await MealPlan.aggregate([
      { $match: { ...baseMatch, dietTags: { $all: dietaryPreferences } } },
      {
        $addFields: {
          goalMatch: goal ? { $cond: [{ $eq: ["$goalType", goal] }, 1, 0] } : 0,
        },
      },
      { $sort: { goalMatch: -1, createdAt: -1 } },
      { $limit: limitNum },
    ]);

    if (hardMatch.length) {
      return sanitize(hardMatch);
    }

    const softMatch = await MealPlan.aggregate([
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
          goalMatch: goal ? { $cond: [{ $eq: ["$goalType", goal] }, 1, 0] } : 0,
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
      { $limit: limitNum },
    ]);

    if (softMatch.length) {
      return sanitize(softMatch);
    }
  }

  const recent = await MealPlan.find(baseMatch)
    .sort({ createdAt: -1 })
    .limit(limitNum)
    .lean();

  return sanitize(recent);
}

// Suggested for the logged-in user (with AI re-ranking)
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

    const dietaryPreferences = toStringArray(activeProfile?.dietaryPreferences);

    const goal = activeProfile?.goal || null;
    const profileId = activeProfile?._id || null;

    const baseMatch = { isActive: true };
    const suggestionLimit =
      parseInt(process.env.SUGGESTED_MEALPLAN_LIMIT || "", 10) || 12;
    const candidateLimit =
      parseInt(process.env.AI_RANKER_CANDIDATE_LIMIT || "", 10) || 40;

    let aiCandidates = [];
    try {
      aiCandidates = await MealPlan.find({ isActive: true })
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(candidateLimit)
        .lean();
    } catch (err) {
      if (process.env.NODE_ENV !== "test") {
        console.warn(
          `[mealPlanController] Failed to load AI candidates: ${err.message}`
        );
      }
    }

    let aiResult = null;
    let aiError = null;

    if (aiCandidates.length && typeof rankMealPlansWithAI === "function") {
      try {
        const aiResponse = await rankMealPlansWithAI({
          profile: activeProfile,
          candidates: aiCandidates,
        });

        if (Array.isArray(aiResponse) && aiResponse.length) {
          const candidateMap = new Map(
            aiCandidates.map((plan) => [String(plan._id), plan])
          );

          const seen = new Set();
          const ordered = [];
          for (const entry of aiResponse) {
            if (!entry) continue;
            const id = String(
              entry.id || entry.planId || entry.mealPlanId || entry._id || ""
            );
            if (!id || seen.has(id)) continue;
            const matched = candidateMap.get(id);
            if (!matched) continue;
            seen.add(id);
            ordered.push(cleanPlan(matched, entry.rationale || null));
            if (ordered.length >= suggestionLimit) break;
          }

          if (ordered.length) {
            aiResult = ordered;
          } else {
            aiError = new Error(
              "AI response did not reference available meal plans."
            );
          }
        } else {
          aiError = new Error("AI response was empty.");
        }
      } catch (err) {
        aiError = err;
      }
    } else if (
      !aiCandidates.length &&
      typeof rankMealPlansWithAI === "function"
    ) {
      aiError = new Error("No candidate meal plans available for AI ranking.");
    }

    let items = null;
    let aiUsed = false;

    if (aiResult) {
      items = aiResult;
      aiUsed = true;
    } else {
      if (aiError && process.env.NODE_ENV !== "test") {
        console.warn(
          `[mealPlanController] Falling back to preference-based ordering: ${aiError.message}`
        );
      }
      items = (items || []).slice(0, suggestionLimit);

      items = await fetchFallbackPlans({
        dietaryPreferences,
        goal,
        limit: suggestionLimit,
      });
    }

    return res.json({
      items,
      profileSignals: {
        dietaryPreferences,
        goal,
        profileId,
      },
      ai: {
        used: aiUsed,
        error: aiError ? aiError.message : null,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.__setRankMealPlanService = (fn) => {
  rankMealPlansWithAI = fn;
};

exports.__resetRankMealPlanService = () => {
  rankMealPlansWithAI = rankMealPlans;
};
