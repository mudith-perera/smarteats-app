const express = require("express");
const router = express.Router();
const { suggestMeals, addMeal } = require("../controllers/mealController");

// POST: يرجع اقتراحات بناءً على المكونات (API الحقيقي)
router.post("/suggest", suggestMeals);

// POST: يضيف وجبة جديدة مؤقتًا
router.post("/", addMeal);

// GET: اختبار Safari (ترجع وجبة ثابتة)
router.get("/suggest", (req, res) => {
  res.json({ meal: "Grilled chicken with salad" });
});

module.exports = router;

