const express = require("express");
const {
  verifyToken,
  adminMiddleware,
} = require("../middleware/authMiddleware");
const {
  createMealPlan,
  listMealPlans,
  suggestedMealPlans,
  getMealPlan,
  updateMealPlan,
  deleteMealPlan,
} = require("../controllers/mealPlanController");

const router = express.Router();

// Lists
router.get("/", listMealPlans); // public list
router.get("/suggested", verifyToken, suggestedMealPlans);
router.get("/:id", getMealPlan);

// Admin CRUD
router.post("/", verifyToken, adminMiddleware, createMealPlan);
router.put("/:id", verifyToken, adminMiddleware, updateMealPlan);
router.delete("/:id", verifyToken, adminMiddleware, deleteMealPlan);

module.exports = router;
