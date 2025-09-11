// Meal Plans Admin (separate page)

const MP_API = "/api/mealplans";
const mpBody = document.getElementById("mp-body");
const mpForm = document.getElementById("mp-form");
const mpReset = document.getElementById("mp-reset");
const guard = document.getElementById("guard");

// Local helpers (self-contained for this page)
function getToken() {
  return localStorage.getItem("token");
}
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
function requireAdmin() {
  const role = getRoleFromToken();
  if (role !== "admin") {
    guard.textContent =
      "You are not authorized to view this page. (Admins only)";
    // Hard-redirect if you prefer:
    // location.href = "dashboard.html";
  } else {
    guard.textContent = "";
  }
}

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

// Load list
async function loadMealPlans() {
  try {
    const res = await fetch(MP_API);
    if (!res.ok) throw new Error("Failed to load meal plans");
    const data = await res.json();
    const items = data.items || [];
    if (!items.length) {
      mpBody.innerHTML = `<tr><td colspan="5" class="muted" style="padding:1rem;">No meal plans yet.</td></tr>`;
      return;
    }
    mpBody.innerHTML = items
      .map(
        (mp) => `
      <tr data-id="${mp._id}">
        <td><strong>${escapeHtml(
          mp.title || ""
        )}</strong><div class="muted">${escapeHtml(
          mp.description || ""
        )}</div></td>
        <td>${mp.calories ?? 0} kcal • P ${mp.protein ?? 0}g • F ${
          mp.fat ?? 0
        }g • C ${mp.carbs ?? 0}g</td>
        <td>${(mp.dietTags || []).map(escapeHtml).join(", ") || "—"}</td>
        <td>${(mp.goalTypes || []).map(escapeHtml).join(", ") || "—"}</td>
        <td class="row-actions">
          <button class="button sm" data-action="edit">Edit</button>
          <button class="button sm danger" data-action="delete">Delete</button>
        </td>
      </tr>
    `
      )
      .join("");
  } catch (err) {
    mpBody.innerHTML = `<tr><td colspan="5" class="muted" style="padding:1rem;">${escapeHtml(
      err.message
    )}</td></tr>`;
  }
}

// Edit/Delete actions
mpBody?.addEventListener("click", async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const tr = e.target.closest("tr");
  const id = tr?.getAttribute("data-id");
  const action = btn.getAttribute("data-action");
  if (!id) return;

  if (action === "edit") {
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
    setSelectedValues(
      document.getElementById("goalTypesSel"),
      mp.goalTypes || []
    );
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
    loadMealPlans();
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
    goalTypes: getSelectedValues(document.getElementById("goalTypesSel")),
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

  mpForm.reset();
  setSelectedValues(document.getElementById("dietTagsSel"), []);
  setSelectedValues(document.getElementById("goalTypesSel"), []);
  loadMealPlans();
});

// Reset
mpReset?.addEventListener("click", () => {
  mpForm.reset();
  setSelectedValues(document.getElementById("dietTagsSel"), []);
  setSelectedValues(document.getElementById("goalTypesSel"), []);
});

// Init
requireAdmin();
loadMealPlans();
