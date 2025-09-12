// ===== Admin Meal Plans (client-side pagination) =====

const MP_API = "/api/mealplans";
const mpBody = document.getElementById("mp-body");
const mpForm = document.getElementById("mp-form");
const mpReset = document.getElementById("mp-reset");
const guard = document.getElementById("guard");

// Pager state (client-side)
let mpPage = 1;
let mpLimit = 10;
let mpQ = "";

// Pager elements
const mpPrev = document.getElementById("mp-prev");
const mpNext = document.getElementById("mp-next");
const mpPageInfo = document.getElementById("mp-pageinfo");
const mpLimitSel = document.getElementById("mp-limit");

// Optional search elems
const mpSearch = document.getElementById("mp-search");
const mpSearchBtn = document.getElementById("mp-search-btn");
const mpClearBtn = document.getElementById("mp-clear-btn");

// Local helpers
function getToken() {
  return localStorage.getItem("token");
}
function escapeHtml(str) {
  return String(str ?? "").replace(
    /[&<>"']/g,
    (s) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        s
      ])
  );
}
function getRoleFromToken() {
  try {
    const t = getToken();
    if (!t) return null;
    return JSON.parse(atob(t.split(".")[1] || "")).role || null;
  } catch {
    return null;
  }
}
function requireAdmin() {
  const role = getRoleFromToken();
  if (role !== "admin") {
    guard &&
      (guard.textContent =
        "You are not authorized to view this page. (Admins only)");
    // Optionally redirect:
    // location.href = "dashboard.html";
    throw new Error("unauthorized");
  } else if (guard) guard.textContent = "";
}

// Enums and selects
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

(function initEnums() {
  const dietSel = document.getElementById("dietTagsSel");
  if (dietSel && !dietSel.options.length) {
    DIET_TAGS.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v.replace(/_/g, " ");
      dietSel.appendChild(opt);
    });
  }
  const goalSel = document.getElementById("goalTypeSel");
  if (goalSel && !goalSel.options.length) {
    goalSel.innerHTML =
      `<option value="">-- choose goal --</option>` +
      GOAL_TYPES.map(
        (v) => `<option value="${v}">${v.replace(/_/g, " ")}</option>`
      ).join("");
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

// ===== DATA CACHE =====
let allItems = []; // full list from server (once)
let filteredItems = []; // after search filter

// Fetch ALL pages once, then paginate in FE
async function fetchAllMealPlansOnce() {
  const firstLimit = 50; // page size for the server requests
  let page = 1;
  let pages = 1;
  const acc = [];

  while (page <= pages) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(firstLimit),
    });
    const res = await fetch(`${MP_API}?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to load meal plans");
    const data = await res.json();

    (data.items || []).forEach((x) => acc.push(x));
    pages = data.pages || 1;
    page += 1;
  }

  return acc;
}

// Filter (client-side)
function applyFilter() {
  const q = (mpQ || "").trim().toLowerCase();
  if (!q) {
    filteredItems = allItems.slice();
    return;
  }
  filteredItems = allItems.filter((mp) => {
    const t = (mp.title || "").toLowerCase();
    const d = (mp.description || "").toLowerCase();
    const diet = (mp.dietTags || []).join(" ").toLowerCase();
    const goal = (mp.goalType || "").toLowerCase();
    return (
      t.includes(q) || d.includes(q) || diet.includes(q) || goal.includes(q)
    );
  });
}

// Render current page slice
function renderCurrentPage() {
  const total = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(total / mpLimit));
  if (mpPage > totalPages) mpPage = totalPages;

  const start = (mpPage - 1) * mpLimit;
  const end = start + mpLimit;
  const slice = filteredItems.slice(start, end);

  if (!slice.length) {
    mpBody.innerHTML = `<tr><td colspan="5" class="muted" style="padding:1rem;">No meal plans found.</td></tr>`;
  } else {
    mpBody.innerHTML = slice
      .map(
        (mp) => `
      <tr data-id="${mp._id}">
        <td><strong>${escapeHtml(mp.title || "")}</strong>
            <div class="muted">${escapeHtml(mp.description || "")}</div></td>
        <td>${mp.calories ?? 0} kcal • P ${mp.protein ?? 0}g • F ${
          mp.fat ?? 0
        }g • C ${mp.carbs ?? 0}g</td>
        <td>${(mp.dietTags || []).map(escapeHtml).join(", ") || "—"}</td>
        <td>${escapeHtml(mp.goalType || "—")}</td>
        <td class="row-actions">
          <button class="button sm" data-action="edit">Edit</button>
          <button class="button sm danger" data-action="delete">Delete</button>
        </td>
      </tr>
    `
      )
      .join("");
  }

  // pager UI
  if (mpPageInfo)
    mpPageInfo.textContent = `Page ${mpPage} of ${totalPages} • ${total} items`;
  if (mpPrev) mpPrev.disabled = mpPage <= 1;
  if (mpNext) mpNext.disabled = mpPage >= totalPages;
}

// Public loader (don’t refetch after first load)
let _loadedOnce = false;
async function loadMealPlansClientSide() {
  if (!_loadedOnce) {
    allItems = await fetchAllMealPlansOnce();
    _loadedOnce = true;
  }
  applyFilter();
  renderCurrentPage();
}

// ===== Edit/Delete handlers =====
mpBody?.addEventListener("click", async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const tr = e.target.closest("tr");
  const id = tr?.getAttribute("data-id");
  const action = btn.getAttribute("data-action");
  if (!id) return;

  if (action === "edit") {
    // Fetch full doc (in case you want freshest), or read from cache (optional)
    const res = await fetch(`${MP_API}/${id}`);
    const mp = await res.json();

    mpForm.title.value = mp.title || "";
    mpForm.description.value = mp.description || "";
    mpForm.calories.value = mp.calories ?? 0;
    mpForm.protein.value = mp.protein ?? 0;
    mpForm.fat.value = mp.fat ?? 0;
    mpForm.carbs.value = mp.carbs ?? 0;

    setSelectedValues(
      document.getElementById("dietTagsSel"),
      mp.dietTags || []
    );
    const goalSel = document.getElementById("goalTypeSel");
    if (goalSel) goalSel.value = mp.goalType || "";

    mpForm.id.value = id;
    window.scrollTo({
      top: mpForm.getBoundingClientRect().top + window.scrollY - 80,
      behavior: "smooth",
    });
  }

  if (action === "delete") {
    if (!confirm("Delete this meal plan?")) return;
    const res = await fetch(`${MP_API}/${id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + getToken() },
    });
    if (!res.ok) {
      alert("Failed to delete");
      return;
    }

    // Update local cache
    allItems = allItems.filter((x) => x._id !== id);
    applyFilter();
    // If current page becomes empty and not page 1, step back
    const totalPages = Math.max(1, Math.ceil(filteredItems.length / mpLimit));
    if (mpPage > totalPages) mpPage = totalPages;
    renderCurrentPage();
  }
});

// Create/Update
mpForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    title: mpForm.title.value.trim(),
    description: mpForm.description.value.trim(),
    calories: Number(mpForm.calories.value) || 0,
    protein: Number(mpForm.protein.value) || 0,
    fat: Number(mpForm.fat.value) || 0,
    carbs: Number(mpForm.carbs.value) || 0,
    dietTags: getSelectedValues(document.getElementById("dietTagsSel")),
    goalType: document.getElementById("goalTypeSel")?.value || "",
  };

  const id = mpForm.id.value;
  const method = id ? "PUT" : "POST";
  const url = id ? `${MP_API}/${id}` : MP_API;

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + getToken(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Error" }));
    alert(err.message || "Save failed");
    return;
  }

  const saved = await res.json().catch(() => null);
  // Normalized saved item (depending on controller response shape)
  const savedItem = saved?.mealPlan || saved; // handle { mealPlan } or the doc itself

  // Update local cache
  if (id) {
    const idx = allItems.findIndex((x) => x._id === id);
    if (idx >= 0) allItems[idx] = { ...allItems[idx], ...savedItem };
  } else if (savedItem && savedItem._id) {
    allItems.unshift(savedItem); // new at top
  }

  // Reset form UI
  mpForm.reset();
  setSelectedValues(document.getElementById("dietTagsSel"), []);
  const goalSel = document.getElementById("goalTypeSel");
  if (goalSel) goalSel.value = "";

  // Re-render current page with filters
  applyFilter();
  renderCurrentPage();
});

// Pager controls (client-side)
mpPrev?.addEventListener("click", () => {
  if (mpPage > 1) {
    mpPage -= 1;
    renderCurrentPage();
  }
});
mpNext?.addEventListener("click", () => {
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / mpLimit));
  if (mpPage < totalPages) {
    mpPage += 1;
    renderCurrentPage();
  }
});
mpLimitSel?.addEventListener("change", () => {
  mpLimit = parseInt(mpLimitSel.value, 10) || 10;
  mpPage = 1;
  renderCurrentPage();
});

// Optional search hooks
mpSearchBtn?.addEventListener("click", () => {
  mpQ = (mpSearch?.value || "").trim();
  mpPage = 1;
  applyFilter();
  renderCurrentPage();
});
mpClearBtn?.addEventListener("click", () => {
  if (mpSearch) mpSearch.value = "";
  mpQ = "";
  mpPage = 1;
  applyFilter();
  renderCurrentPage();
});

// Init
requireAdmin();
mpLimit = parseInt(mpLimitSel?.value || "10", 10) || 10;
loadMealPlansClientSide();
