const User = require("../models/User");
const bcrypt = require("bcryptjs"); // if you use it elsewhere

// GET /api/admin?q=&page=&limit=
exports.getUsers = async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    const filters = {};

    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), "i");
      filters.$or = [
        { username: regex },
        { email: regex },
        { firstName: regex },
        { lastName: regex },
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      User.find(filters)
        .select("-password")
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 }),
      User.countDocuments(filters),
    ]);

    res.json({
      items,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      limit: limitNum,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/admin/:id
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Only allow a safe subset of fields to be updated by admin
    const { firstName, lastName, role, isActive } = req.body;
    const patch = {};
    if (firstName !== undefined) patch.firstName = firstName;
    if (lastName !== undefined) patch.lastName = lastName;
    if (role !== undefined) patch.role = role; // 'user' | 'admin'
    if (isActive !== undefined) patch.isActive = isActive; // true | false

    const user = await User.findByIdAndUpdate(id, patch, { new: true }).select(
      "-password"
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User updated", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/admin/:id
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
