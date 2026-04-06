let goals = [];
let currentFilter = "active";
let selectedGoalId = null;
let editingGoalId = null;
let selectedMediaItem = null;
let mediaSearchTimeout = null;

const API_BASE = "";

const icons = {
  book: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>`,
  music: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg>`,
  movies: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>`,
};

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
  if (!item) return "N/A";

  if (type === "music") {
    return `${item.title || "Untitled"}${item.artist?.name ? " — " + item.artist.name : ""}`;
  }

  if (type === "movies") {
    return `${item.title || item.Title || "Untitled"}${item.year || item.Year ? " (" + (item.year || item.Year) + ")" : ""}`;
  }

  return `${item.title || "Untitled"}${item.authors?.[0] ? " — " + item.authors[0] : ""}`;
}

function clearMediaSelection(resetInput = true) {
  selectedMediaItem = null;
  const input = document.getElementById("modal-media-search");
  const results = document.getElementById("media-search-results");

  if (resetInput && input) input.value = "N/A";
  if (results) {
    results.innerHTML = "";
    results.classList.add("hidden");
  }
}

async function searchMediaInline(query) {
  const results = document.getElementById("media-search-results");
  const typeSelect = document.getElementById("modal-type");
  const goalType = typeSelect.value;
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
      {
        headers: {
          Authorization: `jwt ${token}`,
        },
      },
    );

    if (!res.ok) {
      results.innerHTML = `<div class="px-4 py-3 text-sm text-red-400">Search failed (${res.status}).</div>`;
      results.classList.remove("hidden");
      return;
    }

    const data = await res.json();
    const items = data.tracks || data.movies || data.books || [];

    if (!items.length) {
      results.innerHTML = `<div class="px-4 py-3 text-sm text-white/50">No media found.</div>`;
      results.classList.remove("hidden");
      return;
    }

    results.innerHTML = "";

    items.slice(0, 6).forEach((item) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className =
        "w-full px-4 py-3 text-left border-b border-white/5 hover:bg-teal-neon/10 transition-colors";

      let title = "";
      let subtitle = "";

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

      row.innerHTML = `
  <div class="text-sm font-medium text-white">${title}</div>
  <div class="text-xs text-teal-neon/80">${subtitle}</div>
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
    console.error("Inline media search failed:", err);
    results.innerHTML = `<div class="px-4 py-3 text-sm text-red-400">Unable to load search results.</div>`;
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
    }, 150);
  });

  input.addEventListener("input", () => {
    const value = input.value.trim();

    selectedMediaItem = null;

    clearTimeout(mediaSearchTimeout);
    mediaSearchTimeout = setTimeout(() => {
      searchMediaInline(value);
    }, 300);
  });

  typeSelect.addEventListener("change", () => {
    clearMediaSelection(true);
  });

  document.addEventListener("click", (e) => {
    if (!results.contains(e.target) && e.target !== input) {
      results.classList.add("hidden");
    }
  });
}

async function loadGoals() {
  const res = await fetch(`${API_BASE}/api/goals/user`, {
    method: "GET",
    credentials: "include",
  });

  if (res.status === 401) {
    console.error("Goals API error:", await res.text());
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
}

function render() {
  const container = document.getElementById("goals-container");
  container.innerHTML = "";

  goals = goals.map((g) => {
    const total = Number(g.total || 0);
    const current = Number(g.current || 0);
    const done = total > 0 && current >= total;
    const status = g.status ? g.status : done ? "completed" : "active";
    return { ...g, total, current, status };
  });

  const filtered = goals.filter((g) => g.status === currentFilter);

  filtered.forEach((goal) => {
    const id = getGoalId(goal);
    const pct =
      goal.total > 0 ? Math.round((goal.current / goal.total) * 100) : 0;

    const item = document.createElement("div");
    item.dataset.id = id;

    const isSelected = selectedGoalId === id;

    item.className =
      `group relative flex items-center gap-3 border rounded-xl py-4 p-3 transition-colors shrink-0 ` +
      (goal.status === "completed"
        ? "bg-white/5 border-white/5 opacity-80"
        : "bg-teal-dark/30 hover:bg-teal-dark/50 border-white/5 ") +
      (isSelected
        ? " outline outline-1 outline-teal-neon/80 outline-offset-[-2px]"
        : "");

    const mediaLabel =
      goal.media &&
      getMediaDisplayText(goal.media, mapGoalTypeToSearchType(goal.type))
        ? getMediaDisplayText(goal.media, mapGoalTypeToSearchType(goal.type))
        : "";

    item.innerHTML = `
  <div class="relative w-10 h-10 shrink-0">
   <div class="w-10 h-10 rounded-full bg-teal-neon flex items-center justify-center text-teal-dark shadow-sm shrink-0">
  ${icons[goal.type] || icons.book}
</div>

    ${
      goal.status === "active"
        ? `
    <button 
class="edit-goal absolute -top-5 -right-6 bg-black/70 hover:bg-teal-neon text-white hover:text-black rounded-full p-1.5 transition-all opacity-0 group-hover:opacity-100"
title="Edit goal"
    >
<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M12 20h9"/>
  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
</svg>
    </button>
    `
        : ""
    }
  </div>

  <div class="flex-grow flex flex-col justify-center overflow-visible">

    ${
      mediaLabel && mediaLabel !== "N/A"
        ? `
  <div class="text-[12px] text-scriptorium-gold text-center font-semibold mb-1 drop-shadow-[0_0_6px_rgba(255,218,109,1)]">
    ${mediaLabel}
  </div>
  `
        : ""
    }

    <div class="text-sm font-medium text-white mb-2 break-words">
${goal.title}
    </div>

    <div 
class="goal-bar w-full h-2 bg-black/40 rounded-full overflow-hidden ${
      goal.status === "active" ? "cursor-ew-resize" : ""
    }"
data-id="${id}"
data-total="${goal.total}"
data-status="${goal.status}"
    >
<div class="goal-fill h-full bg-teal-neon rounded-full" style="width:${pct}%"></div>
    </div>

  </div>

  <div class="text-right shrink-0 min-w-[70px] ml-2">
    <div class="goal-count text-sm font-bold text-white">${goal.current}/${goal.total}</div>
    <div class="goal-pct text-xs text-teal-neon/80">${pct}%</div>
  </div>
`;

    item.addEventListener("click", (e) => {
      if (e.target.closest(".goal-bar")) return;
      selectedGoalId = id;
      render();
    });

    item.addEventListener("dblclick", (e) => {
      if (e.target.closest(".goal-bar")) return;

      selectedGoalId = id;

      if (goal.status === "active") {
        openEditModal(goal);
        console.log("Opening goal for edit:", goal);
      }
      render();
    });

    const bar = item.querySelector(".goal-bar");
    const editBtn = item.querySelector(".edit-goal");
    if (editBtn && goal.status === "active") {
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openEditModal(goal);
      });
    }
    if (goal.status === "active") {
      attachBarDrag(bar, item);
    }

    container.appendChild(item);
  });
}

let dragState = {
  active: false,
  id: null,
  total: 0,
  item: null,
};

function attachBarDrag(bar, item) {
  bar.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const id = bar.dataset.id;
    const total = Number(bar.dataset.total);

    dragState.active = true;
    dragState.id = id;
    dragState.total = total;
    dragState.item = item;

    bar.setPointerCapture(e.pointerId);
    updateBarFromPointer(e);
  });

  bar.addEventListener("pointermove", (e) => {
    if (!dragState.active) return;
    updateBarFromPointer(e);
  });

  bar.addEventListener("pointerup", async (e) => {
    if (!dragState.active) return;

    bar.releasePointerCapture(e.pointerId);
    dragState.active = false;

    // Capture position NOW — render() will remove this element from the DOM
    const barRect = bar.getBoundingClientRect();
    const burstX = barRect.left + barRect.width / 2;
    const burstY = barRect.top;

    const id = dragState.id;
    const goal = goals.find((g) => (g._id || g.id) === id);
    if (!goal) return;

    const wasCompleted = goal.status === "completed";
    const newCurrent = Number(goal.current);
    await updateGoalProgress(id, newCurrent, wasCompleted, burstX, burstY);

    const idx = goals.findIndex((g) => (g._id || g.id) === id);
    if (idx !== -1) {
      const total = Number(goals[idx].total || 0);
      const current = Number(goals[idx].current || 0);
      goals[idx].status =
        total > 0 && current >= total ? "completed" : "active";
    }

    render();
  });
}

function updateBarFromPointer(e) {
  const item = dragState.item;
  if (!item) return;

  const bar = item.querySelector(".goal-bar");
  const fill = item.querySelector(".goal-fill");
  const countEl = item.querySelector(".goal-count");
  const pctEl = item.querySelector(".goal-pct");

  const rect = bar.getBoundingClientRect();
  let pct = (e.clientX - rect.left) / rect.width;
  pct = Math.max(0, Math.min(1, pct));

  const current = Math.max(
    0,
    Math.min(dragState.total, Math.round(pct * dragState.total)),
  );

  const pctDisplay = Math.round(pct * 100);

  fill.style.width = `${pctDisplay}%`;
  countEl.textContent = `${current}/${dragState.total}`;
  pctEl.textContent = `${pctDisplay}%`;

  const idx = goals.findIndex((g) => (g._id || g.id) === dragState.id);
  if (idx !== -1) goals[idx].current = current;
}

function openEditModal(goal) {
  editingGoalId = getGoalId(goal);

  openModal();

  document.getElementById("modal-title").value = goal.title || "";
  document.getElementById("modal-type").value = goal.type || "book";
  document.getElementById("modal-target").value = goal.total ?? "";
  document.getElementById("modal-current").value = goal.current ?? 0;

  selectedMediaItem = goal.media || null;
  document.getElementById("modal-media-search").value = selectedMediaItem
    ? getMediaDisplayText(
        selectedMediaItem,
        mapGoalTypeToSearchType(goal.type || "book"),
      )
    : "N/A";

  document.getElementById("media-search-results").classList.add("hidden");
}

function openModal() {
  const modal = document.getElementById("goal-modal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  if (!editingGoalId) {
    document.getElementById("modal-title").value = "";
    document.getElementById("modal-type").value = "book";
    document.getElementById("modal-target").value = "";
    document.getElementById("modal-current").value = "";
    document.getElementById("modal-media-search").value = "N/A";
    document.getElementById("media-search-results").classList.add("hidden");
    selectedMediaItem = null;
  }
}

function closeModal() {
  const modal = document.getElementById("goal-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");

  editingGoalId = null;

  document.getElementById("modal-title").value = "";
  document.getElementById("modal-type").value = "book";
  document.getElementById("modal-target").value = "";
  document.getElementById("modal-current").value = "";
  document.getElementById("modal-media-search").value = "N/A";
  document.getElementById("media-search-results").innerHTML = "";
  document.getElementById("media-search-results").classList.add("hidden");
  selectedMediaItem = null;
}

async function saveGoalFromModal() {
  const title = document.getElementById("modal-title").value.trim();
  const type = document.getElementById("modal-type").value;

  let total = Number(document.getElementById("modal-target").value);
  let current = Number(document.getElementById("modal-current").value || 0);

  const mediaInput = document.getElementById("modal-media-search").value.trim();
  const media = mediaInput && mediaInput !== "N/A" ? selectedMediaItem : null;
  if (mediaInput && mediaInput !== "N/A" && !selectedMediaItem) {
    return alert("Please select a media item from the search results.");
  }
  if (!title) return alert("Please fill in a title.");
  if (!Number.isFinite(total) || total <= 0)
    return alert("Target value must be a positive number.");
  if (!Number.isFinite(current) || current < 0)
    return alert("Current progress cannot be negative.");

  if (current > total) current = total;
  console.log("Saving media:", media);
  if (editingGoalId) {
    const res = await fetch(`${API_BASE}/api/goals/update/${editingGoalId}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, type, total, current, media }),
    });

    if (!res.ok) {
      console.error("Failed to update goal:", await res.text());
      return alert("Failed to update goal.");
    }

    const data = await res.json();
    console.log("Saved goal response:", data);
    const updated = data.goal || data;

    const idx = goals.findIndex((g) => (g._id || g.id) === editingGoalId);
    if (idx !== -1) goals[idx] = updated;

    closeModal();
    render();
    return;
  }

  const res = await fetch(`${API_BASE}/api/goals/add`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, type, current, total, media }),
  });

  if (!res.ok) {
    console.error("Failed to save goal:", await res.text());
    return alert("Failed to save goal.");
  }

  const data = await res.json();
  goals.unshift(data.goal);

  closeModal();
  render();
}

async function deleteSelectedActiveGoal(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  if (!selectedGoalId) return alert("Select an active goal first.");

  const res = await fetch(`${API_BASE}/api/goals/delete/${selectedGoalId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!res.ok) {
    console.error("Failed to delete goal:", await res.text());
    return alert("Failed to delete goal.");
  }

  goals = goals.filter((g) => (g._id || g.id) !== selectedGoalId);
  selectedGoalId = null;
  render();
}

async function updateGoalProgress(
  id,
  current,
  wasCompleted = false,
  burstX = null,
  burstY = null,
) {
  const res = await fetch(`${API_BASE}/api/goals/update/${id}/progress`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ current }),
  });

  if (!res.ok) {
    console.error("Failed to update goal:", await res.text());
    return false;
  }

  const data = await res.json();
  const idx = goals.findIndex((g) => (g._id || g.id) === id);
  if (idx !== -1 && data.goal) goals[idx] = data.goal;

  // ── Yarn burst using pre-captured coords ──────────────────────────────
  if (burstX !== null) {
    const justCompleted = !wasCompleted && data.goal?.status === "completed";
    burstAtCoords(burstX, burstY, justCompleted ? "complete" : "progress");
  }

  return true;
}

function filterGoals(status) {
  currentFilter = status;

  const activeBtn = document.getElementById("btn-active");
  const completedBtn = document.getElementById("btn-completed");
  const activeClass = "bg-teal-neon/20 text-teal-neon border border-teal-neon";
  const inactiveClass = "text-white/50 hover:text-white border-transparent";

  if (status === "active") {
    activeBtn.className = `px-6 py-1.5 rounded-full font-medium text-sm transition-all ${activeClass}`;
    completedBtn.className = `px-6 py-1.5 rounded-full font-medium text-sm transition-all ${inactiveClass}`;
  } else {
    completedBtn.className = `px-6 py-1.5 rounded-full font-medium text-sm transition-all ${activeClass}`;
    activeBtn.className = `px-6 py-1.5 rounded-full font-medium text-sm transition-all ${inactiveClass}`;
  }

  render();
}

// ─── YARN BURST ANIMATION ────────────────────────────────────────────────
// ─── YARN BURST ───────────────────────────────────────────────────────────────
// Uses raw pixel coords captured before render() so the DOM element being
// removed doesn't affect positioning. type: "progress" | "complete"
function burstAtCoords(x, y, type) {
  const isComplete = type === "complete";

  const pill = document.createElement("div");
  pill.textContent = isComplete ? "Goal complete! +25 🧶" : "+5 🧶";
  pill.style.cssText = [
    "position:fixed",
    `left:${x}px`,
    `top:${y - (isComplete ? 16 : 0)}px`,
    "transform:translateX(-50%) translateY(0)",
    `background:${isComplete ? "rgba(0,196,154,0.18)" : "rgba(255,196,80,0.12)"}`,
    `border:1px solid ${isComplete ? "rgba(0,196,154,0.5)" : "rgba(255,196,80,0.35)"}`,
    `color:${isComplete ? "#7fffd4" : "#ffd54f"}`,
    `font-size:${isComplete ? "0.9rem" : "0.82rem"}`,
    "font-weight:700",
    `padding:${isComplete ? "7px 18px" : "4px 12px"}`,
    "border-radius:999px",
    "pointer-events:none",
    "z-index:99999",
    "white-space:nowrap",
    "opacity:0",
    "transition:none",
  ].join(";");

  document.body.appendChild(pill);

  // Animate with requestAnimationFrame so the element is painted before we move it
  requestAnimationFrame(() => {
    pill.style.transition =
      "opacity 0.18s ease, transform 1.3s cubic-bezier(0.2, 1, 0.4, 1)";
    pill.style.opacity = "1";
    pill.style.transform = `translateX(-50%) translateY(-${isComplete ? 64 : 48}px)`;

    // Fade out in the last 400ms
    setTimeout(
      () => {
        pill.style.transition = "opacity 0.35s ease";
        pill.style.opacity = "0";
        setTimeout(() => pill.remove(), 380);
      },
      isComplete ? 950 : 850,
    );
  });
}

setupInlineMediaSearch();
loadGoals();
