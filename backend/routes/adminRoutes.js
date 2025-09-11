const express = require("express");
const {
  getUsers,
  updateUser,
  deleteUser,
} = require("../controllers/adminController");
const {
  verifyToken,
  adminMiddleware,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", verifyToken, adminMiddleware, getUsers);
router.put("/:id", verifyToken, adminMiddleware, updateUser);
router.delete("/:id", verifyToken, adminMiddleware, deleteUser);

module.exports = router;
