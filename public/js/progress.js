/* =====================================================
   📈 PROGRESS — Goal tracker
===================================================== */

const API_BASE = "";

const icons = {
  book: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>`,
  music: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg>`,
  movies: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4v16M17 4v16M3 8h4M17 8h4M3 12h18M3 16h4M17 16h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"></path></svg>`,
};

/* ─── STATE ──────────────────────────────────────────────────────────────────── */
let goals = [];
let currentFilter = "active";
let selectedGoalId = null;
let editingGoalId = null;
let selectedMediaItem = null;
let mediaSearchTimeout = null;

/* ─── HELPERS ────────────────────────────────────────────────────────────────── */
function getGoalId(goal) {
  return goal._id || goal.id;
}

function mapGoalTypeToSearchType(goalType) {
  if (goalType === "book") return "books";
  if (goalType === "music") return "music";
  if (goalType === "movies") return "movies";
  return "books";
}

function getMediaDisplayText(item, type) {
  if (!item) return "";
  if (type === "music")
    return `${item.title || "Untitled"}${item.artist?.name ? " — " + item.artist.name : ""}`;
  if (type === "movies")
    return `${item.title || item.Title || "Untitled"}${item.year || item.Year ? " (" + (item.year || item.Year) + ")" : ""}`;
  return `${item.title || "Untitled"}${item.authors?.[0] ? " — " + item.authors[0] : ""}`;
}

/* ─── TOAST ──────────────────────────────────────────────────────────────────── */
function showToast(msg, type = "success") {
  const stack = document.getElementById("toastStack");
  const item = document.createElement("div");
  item.className = `toast-item toast-${type}`;
  item.innerHTML = `<span class="toast-msg">${msg}</span>`;
  item.addEventListener("click", () => dismissToast(item));
  stack.appendChild(item);
  requestAnimationFrame(() =>
    requestAnimationFrame(() => item.classList.add("visible")),
  );
  const t = setTimeout(() => dismissToast(item), 4000);
  item._t = t;
}

function dismissToast(item) {
  clearTimeout(item._t);
  item.classList.remove("visible");
  item.addEventListener("transitionend", () => item.remove(), { once: true });
}

/* ─── YARN REWARDS ───────────────────────────────────────────────────────────── */
async function awardYarns(amount) {
  try {
    await fetch(`${API_BASE}/api/yarns/award`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
  } catch (err) {
    console.error("Yarn award failed (non-fatal):", err);
  }
}

function floatingYarnPill(anchorEl, amount) {
  const rect = anchorEl.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top;

  const pill = document.createElement("div");
  pill.textContent =
    amount >= 25 ? `+${amount} 🧶 Goal complete!` : `+${amount} 🧶`;

  Object.assign(pill.style, {
    position: "fixed",
    left: `${x}px`,
    top: `${y}px`,
    transform: "translateX(-50%) translateY(0)",
    padding: "6px 14px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "700",
    background: "rgba(0,0,0,0.88)",
    color: amount >= 25 ? "#ffd54f" : "#00C49A",
    border: `1px solid ${amount >= 25 ? "rgba(255,196,80,0.5)" : "rgba(0,196,154,0.4)"}`,
    boxShadow: `0 0 14px ${amount >= 25 ? "rgba(255,196,80,0.35)" : "rgba(0,196,154,0.3)"}`,
    pointerEvents: "none",
    opacity: "0",
    zIndex: "9999",
    whiteSpace: "nowrap",
  });

  document.body.appendChild(pill);

  requestAnimationFrame(() => {
    pill.style.transition =
      "opacity 0.2s ease, transform 1.2s cubic-bezier(0.2, 1, 0.4, 1)";
    pill.style.opacity = "1";
    pill.style.transform = `translateX(-50%) translateY(-${amount >= 25 ? 64 : 48}px)`;

    setTimeout(
      () => {
        pill.style.transition = "opacity 0.35s ease";
        pill.style.opacity = "0";
        setTimeout(() => pill.remove(), 400);
      },
      amount >= 25 ? 1000 : 850,
    );
  });
}

/* ─── FETCH GOALS ────────────────────────────────────────────────────────────── */
async function loadGoals() {
  try {
    const res = await fetch(`${API_BASE}/api/goals/user`, {
      method: "GET",
      credentials: "include",
    });

    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }

    if (!res.ok) {
      console.error("Failed to load goals:", await res.text());
      goals = [];
      render();
      return;
    }

    goals = await res.json();
    render();
  } catch (err) {
    console.error("Load goals error:", err);
    showToast("Could not load goals", "error");
  }
}

/* ─── RENDER ─────────────────────────────────────────────────────────────────── */
function render() {
  const container = document.getElementById("goalsContainer");
  container.innerHTML = "";

  // Normalise
  goals = goals.map((g) => {
    const total = Number(g.total || 0);
    const current = Number(g.current || 0);
    const done = total > 0 && current >= total;
    const status = g.status ? g.status : done ? "completed" : "active";
    return { ...g, total, current, status };
  });

  // Stats
  const activeCount = goals.filter((g) => g.status === "active").length;
  const completedCount = goals.filter((g) => g.status === "completed").length;
  document.getElementById("statActive").textContent = activeCount;
  document.getElementById("statCompleted").textContent = completedCount;
  document.getElementById("statTotal").textContent = goals.length;

  // Filter
  const filtered = goals.filter((g) => g.status === currentFilter);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${currentFilter === "active" ? "🎯" : "🏆"}</div>
        <div class="empty-state-text">${
          currentFilter === "active"
            ? "No active goals yet. Add one to get started!"
            : "No completed goals yet. Keep going!"
        }</div>
      </div>`;
    return;
  }

  filtered.forEach((goal) => {
    const id = getGoalId(goal);
    const pct =
      goal.total > 0 ? Math.round((goal.current / goal.total) * 100) : 0;
    const isSelected = selectedGoalId === id;
    const isCompleted = goal.status === "completed";
    const isBinary = goal.total === 1;

    const mediaLabel = goal.media
      ? getMediaDisplayText(
          goal.media,
          mapGoalTypeToSearchType(goal.type || "book"),
        )
      : "";

    const card = document.createElement("div");
    card.className = [
      "goal-card",
      isSelected ? "selected" : "",
      isCompleted ? "completed-card" : "",
    ]
      .filter(Boolean)
      .join(" ");
    card.dataset.id = id;

    // Action buttons for active goals
    let actionsHtml = "";
    if (!isCompleted) {
      if (isBinary) {
        actionsHtml = `
          <div class="goal-actions">
            <button class="btn-increment btn-complete-binary" data-id="${id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              Mark Complete
            </button>
            <button class="btn-edit-goal btn-edit" data-id="${id}">Edit</button>
          </div>`;
      } else {
        const canIncrement = goal.current < goal.total;
        actionsHtml = `
          <div class="goal-actions">
            <button class="btn-increment btn-inc" data-id="${id}" ${!canIncrement ? "disabled" : ""}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
              +1
            </button>
            <button class="btn-edit-goal btn-edit" data-id="${id}">Edit</button>
          </div>`;
      }
    }

    card.innerHTML = `
      <div class="goal-top">
        <div class="goal-icon">${icons[goal.type] || icons.book}</div>
        <div class="goal-meta">
          <div class="goal-title">${goal.title}</div>
          ${mediaLabel && mediaLabel !== "N/A" ? `<div class="goal-media-label">${mediaLabel}</div>` : ""}
        </div>
        <span class="goal-type-pill">${goal.type || "book"}</span>
      </div>

      <div class="goal-progress-row">
        <div class="goal-bar-track">
          <div class="goal-bar-fill ${pct >= 100 ? "complete" : ""}" style="width:${pct}%"></div>
        </div>
        <span class="goal-count">${goal.current}/${goal.total} · ${pct}%</span>
      </div>

      ${actionsHtml}
    `;

    // Select on click
    card.addEventListener("click", (e) => {
      if (
        e.target.closest(".btn-increment, .btn-edit-goal, .btn-complete-binary")
      )
        return;
      selectedGoalId = id;
      render();
    });

    // Wire up increment
    const incBtn = card.querySelector(".btn-inc");
    if (incBtn) {
      incBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        incrementGoal(id);
      });
    }

    // Wire up binary complete
    const binBtn = card.querySelector(".btn-complete-binary");
    if (binBtn) {
      binBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        completeGoalBinary(id);
      });
    }

    // Wire up edit
    const editBtn = card.querySelector(".btn-edit");
    if (editBtn) {
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openEditModal(goal);
      });
    }

    container.appendChild(card);
  });
}

/* ─── INCREMENT (+1) ─────────────────────────────────────────────────────────── */
async function incrementGoal(id) {
  const goal = goals.find((g) => getGoalId(g) === id);
  if (!goal || goal.current >= goal.total) return;

  const newCurrent = goal.current + 1;

  // Find the button for the floating pill anchor
  const card = document.querySelector(`.goal-card[data-id="${id}"]`);
  const anchorEl = card?.querySelector(".btn-inc") || card;

  const ok = await updateGoalProgress(id, newCurrent);
  if (!ok) return;

  const wasActive = goal.status !== "completed";
  const nowComplete = newCurrent >= goal.total;

  if (wasActive && nowComplete) {
    awardYarns(25);
    floatingYarnPill(anchorEl, 25);
    showCelebration(goal);
  } else {
    awardYarns(5);
    floatingYarnPill(anchorEl, 5);
    showToast(`+1 progress on "${goal.title}" · +5 🧶`, "success");
  }

  render();
}

/* ─── COMPLETE BINARY ────────────────────────────────────────────────────────── */
async function completeGoalBinary(id) {
  const goal = goals.find((g) => getGoalId(g) === id);
  if (!goal) return;

  const card = document.querySelector(`.goal-card[data-id="${id}"]`);
  const anchorEl = card?.querySelector(".btn-complete-binary") || card;

  const ok = await updateGoalProgress(id, 1);
  if (!ok) return;

  awardYarns(25);
  floatingYarnPill(anchorEl, 25);
  showCelebration(goal);
  render();
}

/* ─── UPDATE PROGRESS API ────────────────────────────────────────────────────── */
async function updateGoalProgress(id, current) {
  try {
    const res = await fetch(`${API_BASE}/api/goals/update/${id}/progress`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current }),
    });

    if (!res.ok) {
      console.error("Failed to update goal:", await res.text());
      showToast("Failed to update progress", "error");
      return false;
    }

    const data = await res.json();
    const idx = goals.findIndex((g) => getGoalId(g) === id);
    if (idx !== -1 && data.goal) goals[idx] = data.goal;

    return true;
  } catch (err) {
    showToast("Network error", "error");
    return false;
  }
}

/* ─── CELEBRATION ────────────────────────────────────────────────────────────── */
function showCelebration(goal) {
  const modal = document.getElementById("celebrateModal");
  document.getElementById("celebrateTitle").textContent =
    "Goal Complete! +25 🧶";
  document.getElementById("celebrateDesc").textContent =
    `You finished "${goal.title}" and earned 25 yarns! How about capturing your thoughts with a reflection?`;
  modal.classList.add("open");
}

/* ─── FILTER ─────────────────────────────────────────────────────────────────── */
function filterGoals(status) {
  currentFilter = status;

  document.querySelectorAll(".filter-pill").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === status);
  });

  render();
}

/* ─── MODAL: open / close / save ─────────────────────────────────────────────── */
function openModal() {
  const modal = document.getElementById("goalModal");
  modal.classList.add("open");

  if (!editingGoalId) {
    document.getElementById("modalHeading").textContent = "Create a new goal";
    document.getElementById("modal-title").value = "";
    document.getElementById("modal-type").value = "book";
    document.getElementById("modal-tracking").value = "countable";
    document.getElementById("modal-target").value = "";
    document.getElementById("modal-current-binary").value = "0";
    document.getElementById("modal-media-search").value = "N/A";
    document.getElementById("media-search-results").classList.add("hidden");
    selectedMediaItem = null;
    updateTrackingUI();
  }
}

function openEditModal(goal) {
  editingGoalId = getGoalId(goal);
  openModal();

  document.getElementById("modalHeading").textContent = "Edit goal";
  document.getElementById("modal-title").value = goal.title || "";
  document.getElementById("modal-type").value = goal.type || "book";

  const tracking = goal.tracking || (goal.total === 1 ? "binary" : "countable");
  document.getElementById("modal-tracking").value = tracking;

  if (tracking === "binary") {
    document.getElementById("modal-current-binary").value = goal.current
      ? "1"
      : "0";
  } else {
    document.getElementById("modal-target").value = goal.total ?? "";
  }

  updateTrackingUI();

  selectedMediaItem = goal.media || null;
  document.getElementById("modal-media-search").value = selectedMediaItem
    ? getMediaDisplayText(
        selectedMediaItem,
        mapGoalTypeToSearchType(goal.type || "book"),
      )
    : "N/A";

  document.getElementById("media-search-results").classList.add("hidden");
}

function closeModal() {
  document.getElementById("goalModal").classList.remove("open");
  editingGoalId = null;
  selectedMediaItem = null;
}

async function saveGoalFromModal() {
  const title = document.getElementById("modal-title").value.trim();
  const type = document.getElementById("modal-type").value;
  const tracking = document.getElementById("modal-tracking").value;

  let total, current;

  if (tracking === "binary") {
    total = 1;
    current = editingGoalId
      ? Number(document.getElementById("modal-current-binary").value)
      : 0;
  } else {
    total = Number(document.getElementById("modal-target").value);
    current = editingGoalId
      ? goals.find((g) => getGoalId(g) === editingGoalId)?.current || 0
      : 0;
  }

  const mediaInput = document.getElementById("modal-media-search").value.trim();
  const media = mediaInput && mediaInput !== "N/A" ? selectedMediaItem : null;

  if (mediaInput && mediaInput !== "N/A" && !selectedMediaItem) {
    return showToast(
      "Please select a media item from search results.",
      "error",
    );
  }
  if (!title) return showToast("Please fill in a goal name.", "error");
  if (tracking !== "binary") {
    if (!Number.isFinite(total) || total <= 0)
      return showToast("Target must be a positive number.", "error");
  }

  try {
    if (editingGoalId) {
      const res = await fetch(`${API_BASE}/api/goals/update/${editingGoalId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, type, total, current, media }),
      });
      if (!res.ok) {
        console.error("Failed to update goal:", await res.text());
        return showToast("Failed to update goal.", "error");
      }
      const data = await res.json();
      const updated = data.goal || data;
      const idx = goals.findIndex((g) => getGoalId(g) === editingGoalId);
      if (idx !== -1) goals[idx] = updated;
    } else {
      const res = await fetch(`${API_BASE}/api/goals/add`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, type, current: 0, total, media }),
      });
      if (!res.ok) {
        console.error("Failed to save goal:", await res.text());
        return showToast("Failed to save goal.", "error");
      }
      const data = await res.json();
      goals.unshift(data.goal);
    }

    closeModal();
    render();
    showToast(editingGoalId ? "Goal updated!" : "Goal created! 🎯", "success");
  } catch (err) {
    showToast("Network error", "error");
  }
}

/* ─── DELETE ─────────────────────────────────────────────────────────────────── */
async function deleteSelectedGoal() {
  if (!selectedGoalId) return showToast("Select a goal first.", "error");

  const goal = goals.find((g) => getGoalId(g) === selectedGoalId);
  if (!confirm(`Delete "${goal?.title || "this goal"}"?`)) return;

  try {
    const res = await fetch(`${API_BASE}/api/goals/delete/${selectedGoalId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!res.ok) {
      console.error("Failed to delete goal:", await res.text());
      return showToast("Failed to delete goal.", "error");
    }

    goals = goals.filter((g) => getGoalId(g) !== selectedGoalId);
    selectedGoalId = null;
    render();
    showToast("Goal deleted", "success");
  } catch (err) {
    showToast("Network error", "error");
  }
}

/* ─── TRACKING UI TOGGLE ─────────────────────────────────────────────────────── */
function updateTrackingUI() {
  const tracking = document.getElementById("modal-tracking").value;
  const goalType = document.getElementById("modal-type").value;

  const targetField = document.getElementById("targetField");
  const binaryField = document.getElementById("binaryField");
  const targetLabel = document.getElementById("target-label");

  if (tracking === "binary") {
    targetField.style.display = "none";
    binaryField.style.display = editingGoalId ? "block" : "none";
  } else {
    targetField.style.display = "block";
    binaryField.style.display = "none";

    if (tracking === "countable") {
      if (goalType === "book") targetLabel.textContent = "Number of Chapters";
      else if (goalType === "movies")
        targetLabel.textContent = "Number of Movies";
      else if (goalType === "music")
        targetLabel.textContent = "Number of Songs";
      else targetLabel.textContent = "Target Value";
    } else {
      targetLabel.textContent = "Target Value";
    }
  }
}

/* ─── MEDIA SEARCH ───────────────────────────────────────────────────────────── */
async function searchMediaInline(query) {
  const results = document.getElementById("media-search-results");
  const goalType = document.getElementById("modal-type").value;
  const mediaType = mapGoalTypeToSearchType(goalType);

  if (
    !query ||
    query.trim().length < 2 ||
    query.trim().toUpperCase() === "N/A"
  ) {
    results.innerHTML = "";
    results.classList.add("hidden");
    return;
  }

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(
      `https://scriptorium-backend-six.vercel.app/api/${mediaType}/search?q=${encodeURIComponent(query.trim())}`,
      { headers: { Authorization: `jwt ${token}` } },
    );

    if (!res.ok) {
      results.innerHTML = `<div class="media-result-row"><span class="media-result-title" style="color:#ef4444;">Search failed</span></div>`;
      results.classList.remove("hidden");
      return;
    }

    const data = await res.json();
    const items = data.tracks || data.movies || data.books || [];

    if (!items.length) {
      results.innerHTML = `<div class="media-result-row"><span class="media-result-sub">No results found.</span></div>`;
      results.classList.remove("hidden");
      return;
    }

    results.innerHTML = "";

    items.slice(0, 6).forEach((item) => {
      let title = "",
        subtitle = "";

      if (mediaType === "music") {
        title = item.title || "Untitled";
        subtitle = item.artist?.name || "Unknown Artist";
      } else if (mediaType === "movies") {
        title = item.title || item.Title || "Untitled";
        subtitle = item.year || item.Year || "Unknown Year";
      } else {
        title = item.title || "Untitled";
        subtitle = item.authors?.[0] || "Unknown Author";
      }

      const row = document.createElement("button");
      row.type = "button";
      row.className = "media-result-row";
      row.innerHTML = `
        <div class="media-result-title">${title}</div>
        <div class="media-result-sub">${subtitle}</div>
      `;
      row.onclick = () => {
        selectedMediaItem = item;
        document.getElementById("modal-media-search").value =
          getMediaDisplayText(item, mediaType);
        results.classList.add("hidden");
      };
      results.appendChild(row);
    });

    results.classList.remove("hidden");
  } catch (err) {
    console.error("Media search failed:", err);
    results.innerHTML = `<div class="media-result-row"><span class="media-result-title" style="color:#ef4444;">Search error</span></div>`;
    results.classList.remove("hidden");
  }
}

function setupInlineMediaSearch() {
  const input = document.getElementById("modal-media-search");
  const typeSelect = document.getElementById("modal-type");
  const results = document.getElementById("media-search-results");

  input.addEventListener("focus", () => {
    if (input.value === "N/A") input.value = "";
  });

  input.addEventListener("blur", () => {
    setTimeout(() => {
      if (!input.value.trim()) {
        input.value = "N/A";
        selectedMediaItem = null;
      }
    }, 200);
  });

  input.addEventListener("input", () => {
    selectedMediaItem = null;
    clearTimeout(mediaSearchTimeout);
    mediaSearchTimeout = setTimeout(
      () => searchMediaInline(input.value.trim()),
      300,
    );
  });

  typeSelect.addEventListener("change", () => {
    selectedMediaItem = null;
    input.value = "N/A";
    results.innerHTML = "";
    results.classList.add("hidden");
  });

  document.addEventListener("click", (e) => {
    if (!results.contains(e.target) && e.target !== input) {
      results.classList.add("hidden");
    }
  });
}

/* ─── INIT ───────────────────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  // Filter pills
  document.querySelectorAll(".filter-pill").forEach((btn) => {
    btn.addEventListener("click", () => filterGoals(btn.dataset.filter));
  });

  // Bottom action buttons
  document
    .getElementById("btnAddGoal")
    .addEventListener("click", () => openModal());
  document
    .getElementById("btnDeleteGoal")
    .addEventListener("click", () => deleteSelectedGoal());

  // Modal buttons
  document.getElementById("modalCancel").addEventListener("click", closeModal);
  document
    .getElementById("modalSave")
    .addEventListener("click", saveGoalFromModal);
  document.getElementById("goalModal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("goalModal")) closeModal();
  });

  // Tracking / type change
  document
    .getElementById("modal-tracking")
    .addEventListener("change", updateTrackingUI);
  document
    .getElementById("modal-type")
    .addEventListener("change", updateTrackingUI);

  // Celebrate dismiss
  document.getElementById("celebrateDismiss").addEventListener("click", () => {
    document.getElementById("celebrateModal").classList.remove("open");
  });
  document.getElementById("celebrateModal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("celebrateModal")) {
      document.getElementById("celebrateModal").classList.remove("open");
    }
  });

  // Media search
  setupInlineMediaSearch();

  // Load
  loadGoals();
});
