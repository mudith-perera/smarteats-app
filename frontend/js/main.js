const API_URL = "/api/users";

// Register
document
  .getElementById("registerForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = {
      username: $("#username").val(),
      email: $("#email").val(),
      password: $("#password").val(),
      gender: $("#gender").val(),
      firstName: $("#firstName").val(),
      lastName: $("#lastName").val(),
    };

    $.ajax({
      url: "/api/users/register",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify(formData),
      success: function (res) {
        Swal.fire({
          icon: "success",
          title: "Registration successful",
          text: res.message,
          confirmButtonColor: "#3085d6",
        }).then(() => {
          window.location.href = "login.html";
        });
      },
      error: function (xhr) {
        Swal.fire({
          icon: "error",
          title: "Registration failed",
          text: xhr.responseJSON?.message || "Something went wrong",
        });
      },
    });
  });

// Login
document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = $("#username").val();
  const password = $("#password").val();

  $.ajax({
    url: "/api/users/login",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify({ username, password }),
    success: function (res) {
      const token = res.token;
      localStorage.setItem("token", token);

      // 🔑 Decode JWT to read the role
      let role = null;
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        role = payload.role;
      } catch (e) {
        console.warn("Failed to decode token payload", e);
      }

      Swal.fire({
        icon: "success",
        title: "Login successful",
        text: "Welcome back!",
        confirmButtonColor: "#3085d6",
      }).then(() => {
        // 🚦 Admins go to the admin dashboard
        if (role === "admin") {
          window.location.href = "admin.html";
          return;
        }

        // Existing behavior for normal users
        if (res.profile) {
          window.location.href = "dashboard.html";
        } else {
          window.location.href = "profileForm.html";
        }
      });
    },

    error: function (xhr) {
      Swal.fire({
        icon: "error",
        title: "Login failed",
        text: xhr.responseJSON?.message,
      });
    },
  });
});

// Create Profile
document
  .getElementById("profileForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      Swal.fire({
        icon: "error",
        title: "Not logged in",
        text: "Please log in to create your profile.",
      });
      return;
    }
    const name = $("#name").val();
    const age = parseInt($("#age").val());
    const weight = parseFloat($("#weight").val());
    const height = parseFloat($("#height").val());
    const dietaryPreferences = [];
    $('input[name="dietaryPreferences"]:checked').each(function () {
      dietaryPreferences.push($(this).val());
    });
    const goal = $("#goal").val();
    const unitSystem = $("#unitSystem").val();
    const profileData = {
      name,
      age,
      weight,
      height,
      dietaryPreferences,
      goal,
      unitSystem,
    };
    $.ajax({
      url: "/api/users/createProfile",
      method: "POST",
      contentType: "application/json",
      headers: {
        Authorization: "Bearer " + token,
      },
      data: JSON.stringify(profileData),
      success: function (res) {
        Swal.fire({
          icon: "success",
          title: "Profile created successfully",
          text: res.message,
        }).then(() => {
          window.location.href = "dashboard.html";
        });
      },
      error: function (xhr) {
        Swal.fire({
          icon: "error",
          title: "Profile creation failed",
          text: xhr.responseJSON?.message || "Something went wrong",
        });
      },
    });
  });

// Load Dashboard
function loadDashboard() {
  const token = localStorage.getItem("token");
  if (!token) {
    location.href = "login.html";
    return;
  }

  $.ajax({
    url: "/api/users/me/dashboard-info", // your route
    method: "GET",
    headers: { Authorization: "Bearer " + token },
    success: function (data) {
      const user = data.user || {};
      const profile = data.profile;
      const bmi = data.bmi || null;

      if (profile == null) {
        Swal.fire({
          icon: "info",
          title: "No active profile",
          text: "Please create a profile to see your dashboard.",
        }).then(() => {
          window.location.href = "profileForm.html";
        });
      }

      console.log("Dashboard data:", data);
      // Greeting
      const name = (user.firstName || "") + " " + (user.lastName || "");
      const fallback = user.username || "there";
      document.getElementById("greeting-title").textContent = `Welcome, ${
        name.trim() || fallback
      }!`;
      document.getElementById("greeting-subtitle").textContent =
        "Here’s your current health overview.";

      // Metrics
      document.getElementById("age-value").textContent = profile.age ?? "–";
      document.getElementById("bmi-value").textContent =
        bmi != null ? bmi : "–";

      // Simple health status from BMI (API returns bmi; we categorize here)
      let status = "N/A";
      if (!Number.isNaN(bmi)) {
        if (bmi < 18.5) status = "Underweight";
        else if (bmi < 25) status = "Healthy";
        else if (bmi < 30) status = "Overweight";
        else status = "Obese";
      }
      document.getElementById("status-value").textContent = status;

      // Details
      document.getElementById("goal-value").textContent = (
        profile.goal || "maintain"
      ).replace("_", " ");
      document.getElementById("unit-value").textContent =
        profile.unitSystem || "metric";
      document.getElementById("weight-value").textContent =
        profile.weight != null ? profile.weight : "–";
      document.getElementById("height-value").textContent =
        profile.height != null ? profile.height : "–";
      const diet =
        Array.isArray(profile.dietaryPreferences) &&
        profile.dietaryPreferences.length
          ? profile.dietaryPreferences.join(", ")
          : "–";
      document.getElementById("diet-value").textContent = diet;
    },
    error: function (xhr) {
      if (xhr.status === 401) location.href = "login.html";
      else {
        Swal.fire({
          icon: "error",
          title: "Failed to load dashboard",
          text: xhr.responseJSON?.message || "Please try again.",
        });
      }
    },
  });
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "/login.html";
}

// Nav visibility based on login + role
$(document).ready(function () {
  const token = localStorage.getItem("token");

  // Default: hide everything that requires auth
  $("#logoutBtn").hide();
  $("#profileBtn").hide();
  $("#dashboardBtn").hide();
  $("#mealsBtn").hide();

  if (!token) {
    // not logged in
    $("#loginBtn").show();
    $("#registerBtn").show();
    return;
  }

  // logged in
  $("#loginBtn").hide();
  $("#registerBtn").hide();
  $("#logoutBtn").show();
  $("#dashboardBtn").show();

  // decode role from JWT; show Meals only for admins
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || ""));
    const role = payload?.role;

    if (role === "admin") {
      // Admins: show Meals, hide Profiles
      $("#mealsBtn").show(); // ✅ only admins see Meals
      $("#profileBtn").hide();
    } else {
      // Regular users
      $("#mealsBtn").hide(); // ✅ users do NOT see Meals
      $("#profileBtn").show();
    }
  } catch (e) {
    console.warn("Failed to decode token", e);
    $("#mealsBtn").hide();
    $("#profileBtn").show();
  }
});

// Redirect admins to admin.html when they click Dashboard link
document.getElementById("dashboardBtn")?.addEventListener("click", (e) => {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.role === "admin") {
      e.preventDefault();
      location.href = "admin.html";
    }
  } catch {}
});

// Admin get users
async function getUsers() {
  const res = await fetch(API_URL, {
    headers: { Authorization: "Bearer " + token },
  });
  const users = await res.json();
  const list = document.getElementById("userList");
  list.innerHTML = "";
  users.forEach((u) => {
    const li = document.createElement("li");
    li.textContent = u.email + " (" + u.role + ")";
    list.appendChild(li);
  });
}

// --- UI helpers (vanilla) ---
(function () {
  const byId = (id) => document.getElementById(id);
  const menuBtn = byId("menuBtn");
  const menu = byId("menu");
  const yearEl = document.getElementById("year");

  if (menuBtn && menu) {
    menuBtn.addEventListener("click", () => {
      menu.classList.toggle("open");
    });
  }

  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
})();
