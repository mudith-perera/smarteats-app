const express = require("express");
const {
  registerUser,
  loginUser,
  createProfile,
  getProfiles,
  setActiveProfile,
  getDashboardInfo,
  deleteProfile,
} = require("../controllers/userController");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/createProfile", verifyToken, createProfile);
router.get("/me/profiles", verifyToken, getProfiles);
router.put("/me/active-profile", verifyToken, setActiveProfile);
router.get("/me/dashboard-info", verifyToken, getDashboardInfo);
router.delete("/me/delete-profile/:profileId", verifyToken, deleteProfile);

module.exports = router;
