const API_BASE = "/api/admin"; // GET /, DELETE /:id, PUT /:id
const usersBody = document.getElementById("usersBody");
const searchInput = document.getElementById("search");
const btnSearch = document.getElementById("btnSearch");
const btnClear = document.getElementById("btnClear");
const btnLogout = document.getElementById("btnLogout");
const prevPageBtn = document.getElementById("prevPage");
const nextPageBtn = document.getElementById("nextPage");
const pageInfo = document.getElementById("pageInfo");
const guard = document.getElementById("guard");

let page = 1;
let limit = 10;
let q = "";

function getToken() {
  return localStorage.getItem("token");
}

function getRoleFromToken() {
  try {
    const token = getToken();
    if (!token) return null;
    const [, payload] = token.split(".");
    const json = JSON.parse(atob(payload));
    return json.role || null;
  } catch {
    return null;
  }
}

function ensureAdminUI() {
  const role = getRoleFromToken();
  if (role !== "admin") {
    guard.classList.remove("hidden");
    guard.textContent =
      "You are not authorized to view this page. (Admins only)";
  }
}

// ===== Users list =====
async function fetchUsers() {
  const token = getToken();
  if (!token) {
    usersBody.innerHTML = `<tr><td colspan="6">Please login first.</td></tr>`;
    return;
  }
  try {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (q && q.trim()) params.set("q", q.trim());
    const res = await fetch(`${API_BASE}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    renderUsers(data.items || []);
    updatePager(data.page, data.pages, data.total);
  } catch (err) {
    usersBody.innerHTML = `<tr><td colspan="6" class="danger">Error: ${escapeHtml(
      err.message
    )}</td></tr>`;
  }
}

function renderUsers(users) {
  if (!users.length) {
    usersBody.innerHTML = `<tr><td colspan="6">No users found.</td></tr>`;
    return;
  }
  usersBody.innerHTML = users
    .map((u) => {
      const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ");
      const lastLogin = u.lastLoginAt
        ? new Date(u.lastLoginAt).toLocaleString()
        : "—";
      const rolePill = `<span class="pill">${u.role || "user"}</span>`;
      const active = u.isActive ? "Yes" : "No";
      return `
      <tr data-id="${u._id}">
        <td>${escapeHtml(fullName || "—")}</td>
        <td>
          <div>${escapeHtml(u.username || "—")}</div>
          <div style="color:#555">${escapeHtml(u.email || "—")}</div>
        </td>
        <td>${rolePill}</td>
        <td>${active}</td>
        <td>${lastLogin}</td>
        <td>
          <button data-action="view">View</button>
          <button data-action="remove" class="danger">Remove</button>
        </td>
      </tr>
    `;
    })
    .join("");
}

function updatePager(current, totalPages, total) {
  pageInfo.textContent = `Page ${current} of ${totalPages} • ${total} users`;
  prevPageBtn.disabled = current <= 1;
  nextPageBtn.disabled = current >= totalPages;
}

usersBody?.addEventListener("click", async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const tr = e.target.closest("tr");
  const id = tr?.getAttribute("data-id");
  if (!id) return;

  const action = btn.getAttribute("data-action");
  if (action === "view") {
    alert(`User id: ${id}`); // Enhance to show a modal with full details if you like
  }
  if (action === "remove") {
    const confirmDel = confirm(
      "Are you sure you want to remove this user? This action cannot be undone."
    );
    if (!confirmDel) return;
    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
      }
      // Refresh list
      fetchUsers();
    } catch (err) {
      alert(`Failed to remove user: ${err.message}`);
    }
  }
});

btnSearch?.addEventListener("click", () => {
  q = searchInput.value || "";
  page = 1;
  fetchUsers();
});

btnClear?.addEventListener("click", () => {
  searchInput.value = "";
  q = "";
  page = 1;
  fetchUsers();
});

prevPageBtn?.addEventListener("click", () => {
  if (page > 1) {
    page -= 1;
    fetchUsers();
  }
});

nextPageBtn?.addEventListener("click", () => {
  page += 1;
  fetchUsers();
});

btnLogout?.addEventListener("click", () => {
  localStorage.removeItem("token");
  location.href = "./index.html";
});

// ===== Navbar: Meals jump + active state =====
(function initMealsNav() {
  const mealsBtn = document.getElementById("mealsBtn");
  const mealsSection = document.getElementById("meals-section");

  function setActiveNav(id) {
    document
      .querySelectorAll("#menu li a")
      .forEach((a) => a.classList.remove("active"));
    const el = document.querySelector(`#${id} > a`);
    if (el) el.classList.add("active");
  }

  // Smooth scroll when clicking "Meals"
  mealsBtn?.addEventListener("click", (e) => {
    const href = e.target.getAttribute("href") || "";
    if (href.startsWith("#")) {
      e.preventDefault();
      mealsSection?.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", "#meals");
      setActiveNav("mealsBtn");
    }
  });

  // Deep-link support: admin.html#meals
  if (location.hash === "#meals") {
    setTimeout(() => {
      mealsSection?.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveNav("mealsBtn");
    }, 50);
  }
})();

// =================== Admin meal plans form (START) ===================

// Allowed enums (mirror backend)
const DIET_TAGS = [
  "vegetarian",
  "vegan",
  "gluten_free",
  "dairy_free",
  "nut_free",
  "halal",
  "kosher",
];
const GOAL_TYPES = ["lose_weight", "maintain", "gain_muscle"];

// Populate dropdowns
(function initMealEnums() {
  const dietSel = document.getElementById("dietTagsSel");
  const goalSel = document.getElementById("goalTypesSel");
  if (dietSel && !dietSel.options.length) {
    DIET_TAGS.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v.replace(/_/g, " ");
      dietSel.appendChild(opt);
    });
  }
  if (goalSel && !goalSel.options.length) {
    GOAL_TYPES.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v.replace(/_/g, " ");
      goalSel.appendChild(opt);
    });
  }
})();

function getSelectedValues(multiSelectEl) {
  return Array.from(multiSelectEl.selectedOptions).map((o) => o.value);
}

function setSelectedValues(multiSelectEl, values = []) {
  const set = new Set(values);
  Array.from(multiSelectEl.options).forEach((o) => {
    o.selected = set.has(o.value);
  });
}

// Helpers
function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (s) => {
    const m = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return m[s] || s;
  });
}

// Init
ensureAdminUI();
fetchUsers();
loadMealPlans();
