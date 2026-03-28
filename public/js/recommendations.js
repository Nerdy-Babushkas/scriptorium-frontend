/* =====================================================
   🎬 BABUSHKA AI — RECOMMENDATIONS FRONTEND
===================================================== */

/* ---------------- GLOBAL STATE ---------------- */
let currentItemData = null;
let currentAddBtn = null; // track which button triggered the modal

/* ---------------- LOADING MESSAGES ---------------- */
const messages = [
  "Babushka AI is knitting your recommendations",
  "Warming up the projector",
  "Searching through forgotten cinema",
  "Matching your soul with films",
  "Adding a touch of nostalgia",
  "Don't rush the babushka, she's an artist",
  "Almost ready… patience",
];

let msgIndex = 0;
let msgInterval = null;

function startLoadingMessages() {
  const el = document.getElementById("loadingText");
  if (!el) return;
  msgInterval = setInterval(() => {
    msgIndex = (msgIndex + 1) % messages.length;
    el.innerHTML = `${messages[msgIndex]}<span class="dots"></span>`;
  }, 2200);
}

function stopLoadingMessages() {
  if (msgInterval) {
    clearInterval(msgInterval);
    msgInterval = null;
  }
}

/* ---------------- FETCH RECOMMENDATIONS ---------------- */
async function fetchRecommendations() {
  const grid = document.getElementById("recommendationsGrid");
  const loading = document.getElementById("recommendationsLoading");
  const empty = document.getElementById("recommendationsEmpty");

  grid.innerHTML = "";
  empty.style.display = "none";
  loading.style.display = "flex";
  loading.classList.remove("fade-out");
  startLoadingMessages();

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(
      "https://scriptorium-backend-six.vercel.app/api/recommendations/movies",
      { headers: { Authorization: `jwt ${token}` } },
    );

    const data = await res.json();
    const movies = data.recommendations || [];

    fadeOutLoading(loading);
    if (!movies.length) return showEmptyState();

    movies.forEach((movie, index) => {
      const card = createMovieCard(movie);
      grid.appendChild(card);
      animateCard(card, index);
    });
  } catch (err) {
    console.error("Fetch error:", err);
    fadeOutLoading(loading);
    showErrorState();
  }
}

/* ---------------- REFRESH ---------------- */
function refreshRecommendations() {
  const grid = document.getElementById("recommendationsGrid");
  const empty = document.getElementById("recommendationsEmpty");
  grid.innerHTML = "";
  empty.style.display = "none";
  fetchRecommendations();
}

/* ---------------- CREATE CARD ---------------- */
function createMovieCard(movie) {
  const card = document.createElement("div");
  card.className = "movie-card";
  card.style.opacity = "0";
  card.style.transform = "translateY(14px)";

  const poster =
    movie.poster || "https://via.placeholder.com/300x450?text=No+Image";
  const title = movie.title || "No title";
  const year = movie.year || "?";
  const dir = movie.director || "Unknown";
  const reason = movie.reason || "No reason provided";

  card.innerHTML = `
    <div class="movie-poster-wrap">
      <img src="${escapeAttr(poster)}" class="movie-poster" alt="${escapeAttr(title)}" loading="lazy"/>
      <div class="movie-poster-overlay"></div>
      <span class="movie-ai-tag">AI Pick</span>
    </div>
    <div class="movie-body">
      <p class="movie-title">${escapeHtml(title)}</p>
      <p class="movie-meta">${escapeHtml(year)} · ${escapeHtml(dir)}</p>
      <p class="movie-reason">${escapeHtml(reason)}</p>
      <button
        class="add-trigger-btn"
        data-item="${escapeAttr(JSON.stringify(movie))}"
        data-title="${escapeAttr(title)}"
      >
        + Add to Library
      </button>
    </div>
  `;

  return card;
}

/* ---------------- MODAL — OPEN (event delegation) ---------------- */
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".add-trigger-btn");
  if (!btn || btn.disabled || btn.classList.contains("is-saved")) return;

  currentItemData = JSON.parse(btn.dataset.item);
  currentAddBtn = btn;

  const modal = document.getElementById("shelfModal");
  const modalTitle = document.getElementById("modalTitle");

  modalTitle.textContent = btn.dataset.title;
  modal.style.display = "flex";
});

/* ---------------- MODAL — CLOSE ---------------- */
function closeModal() {
  document.getElementById("shelfModal").style.display = "none";
}

document
  .getElementById("closeShelfModal")
  .addEventListener("click", closeModal);

document.getElementById("shelfModal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("shelfModal")) closeModal();
});

/* ---------------- SHELF OPTIONS — ADD TO SHELF (event delegation) ---------------- */
document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".shelf-option");
  if (!btn) return;

  const shelf = btn.dataset.shelf;
  closeModal();
  if (!currentItemData) return;

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(
      "https://scriptorium-backend-six.vercel.app/api/movies/shelf/add",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `jwt ${token}`,
        },
        body: JSON.stringify({ ...currentItemData, shelf }),
      },
    );

    if (res.ok) {
      showToast("Saved", `Added to ${formatShelfName(shelf)}`, "success");
      markAsAdded(currentItemData.title, currentAddBtn);
      if (currentAddBtn) spawnSparks(currentAddBtn);
    } else {
      const errData = await res.json().catch(() => ({}));
      showToast("Oops", errData.message || "Failed to save", "error");
    }
  } catch (err) {
    console.error("Shelf save error:", err);
    showToast("Error", "Could not connect to server", "error");
  }
});

/* ---------------- HELPERS ---------------- */
function formatShelfName(shelf) {
  return (
    { favorites: "Favorites", watchlist: "Watchlist", watched: "Seen It" }[
      shelf
    ] || shelf
  );
}

function markAsAdded(title, triggerBtn) {
  document.querySelectorAll(".add-trigger-btn").forEach((btn) => {
    if (btn.dataset.title === title) {
      btn.textContent = "Saved to Library";
      btn.disabled = true;
      btn.classList.add("is-saved");
    }
  });
}

/* ✦ Spark burst — fires from the button's position */
function spawnSparks(btn) {
  const rect = btn.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const count = 12;

  for (let i = 0; i < count; i++) {
    const spark = document.createElement("div");
    spark.className = "spark";

    const angle = (360 / count) * i;
    const dist = 30 + Math.random() * 30;
    const rad = (angle * Math.PI) / 180;
    const tx = Math.cos(rad) * dist;
    const ty = Math.sin(rad) * dist;
    const dur = 0.45 + Math.random() * 0.25;

    spark.style.cssText = `
      left: ${cx}px;
      top:  ${cy}px;
      --tx: ${tx}px;
      --ty: ${ty}px;
      --dur: ${dur}s;
      background: ${Math.random() > 0.5 ? "#00C49A" : "#7fffd4"};
    `;

    document.body.appendChild(spark);
    spark.addEventListener("animationend", () => spark.remove());
  }
}

function animateCard(card, index) {
  setTimeout(() => {
    card.style.transition = "opacity 0.35s ease, transform 0.35s ease";
    card.style.opacity = "1";
    card.style.transform = "translateY(0)";
  }, index * 75);
}

function fadeOutLoading(loading) {
  if (!loading) return;
  stopLoadingMessages();
  loading.classList.add("fade-out");
  setTimeout(() => {
    loading.style.display = "none";
  }, 420);
}

/* Escape helpers */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str) {
  return String(str).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/* ---------------- STATES ---------------- */
function showEmptyState() {
  const empty = document.getElementById("recommendationsEmpty");
  empty.style.cssText =
    "display:flex;flex-direction:column;align-items:center;justify-content:center;margin-top:3rem;";
  empty.innerHTML = `
    <img src="/assets/sorry-sheep.gif" style="width:200px;margin-bottom:1rem;"/>
    <p style="color:#00C49A;font-size:1.15rem;text-align:center;">
      Babushka AI could not find any movies 😔
    </p>
    <button onclick="refreshRecommendations()" style="
      margin-top:16px;padding:10px 24px;border-radius:999px;
      border:1px solid rgba(0,196,154,0.4);background:rgba(0,196,154,0.08);
      color:#00C49A;font-size:0.85rem;font-weight:600;cursor:pointer;
    ">Try again</button>
  `;
}

function showErrorState() {
  const empty = document.getElementById("recommendationsEmpty");
  empty.style.cssText =
    "display:flex;flex-direction:column;align-items:center;justify-content:center;margin-top:3rem;";
  empty.innerHTML = `
    <p style="color:#ff6b6b;font-size:1.1rem;text-align:center;">⚠️ Failed to load recommendations.</p>
    <button onclick="refreshRecommendations()" style="
      margin-top:16px;padding:10px 24px;border-radius:999px;
      border:1px solid rgba(255,107,107,0.4);background:rgba(255,107,107,0.08);
      color:#ff6b6b;font-size:0.85rem;font-weight:600;cursor:pointer;
    ">Retry</button>
  `;
}

/* ---------------- TOAST ---------------- */
function showToast(title, msg, type) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  document.getElementById("toastTitle").textContent = title;
  document.getElementById("toastMessage").textContent = msg;
  toast.style.borderLeftColor = type === "success" ? "#00C49A" : "#ff6b6b";
  toast.style.transform = "translateY(0)";

  setTimeout(() => {
    toast.style.transform = "translateY(160px)";
  }, 3500);
}

/* ---------------- INIT ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  fetchRecommendations();
});
