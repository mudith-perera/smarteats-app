const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const mealPlanRoutes = require("./routes/mealPlanRoutes");
const mealRoutes = require("./routes/mealRoutes");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function seedAdminUser() {
  try {
    const email = "admin@mail.com";
    const existing = await User.findOne({ email });
    if (existing) {
      console.log("[seed] Admin user already exists:", email);
      return;
    }
    const hashed = await bcrypt.hash("admin@123", 10);
    const adminUser = new User({
      firstName: "System",
      lastName: "Admin",
      username: "admin",
      email,
      password: hashed,
      gender: "other",
      role: "admin",
      isActive: true,
    });
    await adminUser.save();
    console.log("[seed] Admin user created with email:", email);
  } catch (err) {
    console.error("[seed] Failed to create admin user:", err.message);
  }
}

dotenv.config();
const app = express();

// CORS - allow local dev origins and file:// (treated as 'null' origin)
app.use(
  cors({
    origin: function (origin, cb) {
      const allowed = [
        undefined,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "null",
      ];
      if (allowed.includes(origin)) return cb(null, true);
      return cb(null, true); // allow all during dev
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  })
);

app.use(express.json());

// API Routes
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/mealplans", mealPlanRoutes);
app.use("/api/meals", mealRoutes);

// Serve frontend statically (so you can hit http://localhost:5001/)
app.use(express.static(path.join(__dirname, "..", "frontend")));

// Connect DB & start server
const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("MongoDB connected");
    seedAdminUser().then(() => {
      app.listen(PORT, () =>
        console.log(`Server running on http://localhost:${PORT}`)
      );
    });
  })
  .catch((err) => console.error(err));
