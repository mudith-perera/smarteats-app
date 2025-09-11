// Simple admin dashboard for managing users
// Requirements: JWT token stored in localStorage under 'token' after login

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

// Light client-side gate: decode JWT to read "role" (UI only)
// NOTE: server still enforces admin via middleware.
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
    usersBody.innerHTML = `<tr><td colspan="6" class="danger">Error: ${err.message}</td></tr>`;
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
        <td>${fullName || "—"}</td>
        <td>
          <div>${u.username || "—"}</div>
          <div style="color:#555">${u.email || "—"}</div>
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

usersBody.addEventListener("click", async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const tr = e.target.closest("tr");
  const id = tr?.getAttribute("data-id");
  if (!id) return;

  const action = btn.getAttribute("data-action");
  if (action === "view") {
    alert(`User id: ${id}`); // You can enhance to open a modal with full details.
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

btnSearch.addEventListener("click", () => {
  q = searchInput.value || "";
  page = 1;
  fetchUsers();
});

btnClear.addEventListener("click", () => {
  searchInput.value = "";
  q = "";
  page = 1;
  fetchUsers();
});

prevPageBtn.addEventListener("click", () => {
  if (page > 1) {
    page -= 1;
    fetchUsers();
  }
});

nextPageBtn.addEventListener("click", () => {
  page += 1;
  fetchUsers();
});

btnLogout.addEventListener("click", () => {
  localStorage.removeItem("token");
  location.href = "./index.html"; // or your login page
});

// Init
ensureAdminUI();
fetchUsers();
