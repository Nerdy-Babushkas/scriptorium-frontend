/* =====================================================
   🎬🎵📚 BABUSHKA AI — RECOMMENDATIONS FRONTEND
   Tabs: movies | music | books
===================================================== */

const BASE_URL = "https://scriptorium-backend-six.vercel.app/api";

// Mirrors account.js — must match passport strategy: .fromAuthHeaderWithScheme("jwt")
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `JWT ${token}`,
  };
};

/* ─── PER-TAB CONFIG ────────────────────────────────────────────────────────── */
const TAB_CONFIG = {
  movies: {
    endpoint: `${BASE_URL}/recommendations/movies`,
    saveEndpoint: `${BASE_URL}/movies/shelf/add`,
    label: "Movies",
    emptyMsg: "Babushka AI could not find any movies 😔",
    loadingMessages: [
      "Babushka AI is knitting your recommendations",
      "Warming up the projector",
      "Searching through forgotten cinema",
      "Matching your soul with films",
      "Adding a touch of nostalgia",
      "Don't rush the babushka, she's an artist",
      "Almost ready… patience",
    ],
  },
  music: {
    endpoint: `${BASE_URL}/recommendations/music`,
    saveEndpoint: `${BASE_URL}/music/shelf/add`,
    label: "Music",
    emptyMsg: "Babushka AI could not find any tracks 😔",
    loadingMessages: [
      "Babushka AI is curating your soundtrack",
      "Tuning into your musical soul",
      "Sifting through the vinyl crates",
      "Finding your next obsession",
      "Almost ready… hit play",
    ],
  },
  books: {
    endpoint: `${BASE_URL}/recommendations/books`,
    saveEndpoint: `${BASE_URL}/books/shelf/add`,
    label: "Books",
    emptyMsg: "Babushka AI could not find any books 😔",
    loadingMessages: [
      "Babushka AI is flipping through the shelves",
      "Dusting off the forgotten volumes",
      "Reading between the lines",
      "Matching your taste in prose",
      "Almost ready… turn the page",
    ],
  },
};

/* ─── GLOBAL STATE ──────────────────────────────────────────────────────────── */
let activeTab = "movies";
let currentItemData = null;
let currentAddBtn = null;
let savingInProgress = false;

// "loading" = fetch is currently in flight, blocks re-entry
// "done"    = data rendered successfully, no re-fetch needed
// false     = idle, safe to fetch
const tabState = { movies: false, music: false, books: false };

const intervals = { movies: null, music: null, books: null };
const msgIdx = { movies: 0, music: 0, books: 0 };

/* ─── SINGLE DOCUMENT CLICK HANDLER ─────────────────────────────────────────── */
document.addEventListener("click", async (e) => {
  // 1. Shelf option inside modal
  const shelfBtn = e.target.closest(".shelf-option");
  if (shelfBtn) {
    e.stopPropagation();
    await handleShelfSave(shelfBtn);
    return;
  }

  // 2. "Add to Library" on a card
  const addBtn = e.target.closest(".add-trigger-btn");
  if (addBtn && !addBtn.disabled && !addBtn.classList.contains("is-saved")) {
    e.stopPropagation();
    openModal(addBtn);
    return;
  }

  // 3. Backdrop close
  if (e.target === document.getElementById("shelfModal")) {
    closeModal();
  }
});

/* ─── MODAL ──────────────────────────────────────────────────────────────────── */
function openModal(btn) {
  currentItemData = JSON.parse(btn.dataset.item);
  currentAddBtn = btn;
  const tab = btn.dataset.tab;

  ["movies", "music", "books"].forEach((t) => {
    document.getElementById(`shelfOptions-${t}`).style.display =
      t === tab ? "flex" : "none";
  });

  document.getElementById("modalTitle").textContent = btn.dataset.title;
  document.getElementById("shelfModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("shelfModal").style.display = "none";
}

document.getElementById("closeShelfModal").addEventListener("click", (e) => {
  e.stopPropagation();
  closeModal();
});

/* ─── SHELF SAVE ─────────────────────────────────────────────────────────────── */
async function handleShelfSave(btn) {
  if (savingInProgress) return;
  savingInProgress = true;

  const shelf = btn.dataset.shelf;
  const tab = currentAddBtn?.dataset.tab || activeTab;

  closeModal();

  if (!currentItemData) {
    savingInProgress = false;
    return;
  }

  const itemToSave = currentItemData;
  const triggerBtn = currentAddBtn;
  currentItemData = null;
  currentAddBtn = null;

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(TAB_CONFIG[tab].saveEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `jwt ${token}`,
      },
      body: JSON.stringify({ ...itemToSave, shelf }),
    });

    if (res.ok) {
      showToast("Saved", `Added to ${formatShelfName(shelf)}`, "success");
      markAsAdded(itemToSave.title, tab);
      if (triggerBtn) spawnSparks(triggerBtn);
    } else {
      const err = await res.json().catch(() => ({}));
      showToast("Oops", err.message || "Failed to save", "error");
    }
  } catch (err) {
    console.error("Shelf save error:", err);
    showToast("Error", "Could not connect to server", "error");
  } finally {
    savingInProgress = false;
  }
}

/* ─── TAB SWITCHING ──────────────────────────────────────────────────────────── */
function switchTab(tab) {
  if (tab === activeTab) return;

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.tab === tab);
  });

  activeTab = tab;

  // Only fetch if not already loading or done, and AI is not disabled
  if (tabState[tab] === false && !document.getElementById("ai-disabled-banner"))
    fetchTab(tab);
}

function refreshActive() {
  // Don't allow refresh while a fetch is already in flight or AI is disabled
  if (
    tabState[activeTab] === "loading" ||
    document.getElementById("ai-disabled-banner")
  )
    return;

  tabState[activeTab] = false;
  document.getElementById(`grid-${activeTab}`).innerHTML = "";
  document.getElementById(`empty-${activeTab}`).style.display = "none";
  fetchTab(activeTab);
}

/* ─── LOADING MESSAGES ───────────────────────────────────────────────────────── */
function startLoadingMessages(tab) {
  const el = document.getElementById(`loadingText-${tab}`);
  const msgs = TAB_CONFIG[tab].loadingMessages;
  if (!el) return;
  intervals[tab] = setInterval(() => {
    msgIdx[tab] = (msgIdx[tab] + 1) % msgs.length;
    el.innerHTML = `${msgs[msgIdx[tab]]}<span class="dots"></span>`;
  }, 2200);
}

function stopLoadingMessages(tab) {
  if (intervals[tab]) {
    clearInterval(intervals[tab]);
    intervals[tab] = null;
  }
}

/* ─── FETCH ──────────────────────────────────────────────────────────────────── */
async function fetchTab(tab) {
  // Hard guard: if already loading or done, do nothing
  if (tabState[tab] !== false) return;
  tabState[tab] = "loading";

  const grid = document.getElementById(`grid-${tab}`);
  const loading = document.getElementById(`loading-${tab}`);
  const empty = document.getElementById(`empty-${tab}`);

  grid.innerHTML = "";
  empty.style.display = "none";
  loading.style.display = "flex";
  loading.classList.remove("fade-out");
  startLoadingMessages(tab);

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(TAB_CONFIG[tab].endpoint, {
      headers: { Authorization: `jwt ${token}` },
    });

    const data = await res.json();
    const items = data.recommendations || [];

    fadeOutLoading(loading, tab);

    if (!items.length) {
      showEmptyState(tab);
      // Mark done even on empty so we don't re-fetch on every tab switch
      tabState[tab] = "done";
      return;
    }

    // Render all cards first, THEN mark as done
    items.forEach((item, index) => {
      const card = createCard(tab, item);
      grid.appendChild(card);
      animateCard(card, index);
    });

    tabState[tab] = "done"; // ← only set after cards are in the DOM
  } catch (err) {
    console.error(`${tab} fetch error:`, err);
    tabState[tab] = false; // reset so user can retry
    fadeOutLoading(loading, tab);
    showErrorState(tab);
  }
}

/* ─── CREATE CARD ────────────────────────────────────────────────────────────── */
function createCard(tab, item) {
  const card = document.createElement("div");
  card.className = "rec-card";
  card.style.opacity = "0";
  card.style.transform = "translateY(14px)";

  const { img, title, meta, reason } = extractFields(tab, item);

  card.innerHTML = `
    <div class="rec-img-wrap">
      <img src="${escapeAttr(img)}" class="rec-img" alt="${escapeAttr(title)}" loading="lazy"/>
      <div class="rec-img-overlay"></div>
      <span class="rec-ai-tag">AI Pick</span>
    </div>
    <div class="rec-body">
      <p class="rec-title">${escapeHtml(title)}</p>
      <p class="rec-meta">${escapeHtml(meta)}</p>
      <p class="rec-reason">${escapeHtml(reason)}</p>
      <button
        class="add-trigger-btn"
        data-tab="${escapeAttr(tab)}"
        data-item="${escapeAttr(JSON.stringify(item))}"
        data-title="${escapeAttr(title)}"
      >+ Add to Library</button>
    </div>
  `;

  return card;
}

function extractFields(tab, item) {
  const fallbackImg = "https://via.placeholder.com/300x450?text=No+Image";

  if (tab === "movies") {
    return {
      img: item.poster || fallbackImg,
      title: item.title || "No title",
      meta: `${item.year || "?"} · ${item.director || "Unknown"}`,
      reason: item.reason || "",
    };
  }

  if (tab === "music") {
    return {
      img: item.coverUrl || fallbackImg,
      title: item.title || "No title",
      meta: `${item.artist?.name || "Unknown"} · ${item.release?.title || ""}`.replace(
        / · $/,
        "",
      ),
      reason: item.reason || "",
    };
  }

  // books
  return {
    img:
      item.imageLinks?.thumbnail ||
      item.imageLinks?.smallThumbnail ||
      fallbackImg,
    title: item.title || "No title",
    meta: `${(item.authors || []).join(", ") || "Unknown"} · ${item.publishedDate?.slice(0, 4) || "?"}`,
    reason: item.reason || "",
  };
}

/* ─── HELPERS ────────────────────────────────────────────────────────────────── */
function formatShelfName(shelf) {
  return (
    {
      favorites: "Favorites",
      watchlist: "Watchlist",
      watched: "Seen It",
      listening: "Listening",
      listened: "Listened",
      reading: "Reading",
      wishlist: "Wishlist",
      finished: "Finished",
    }[shelf] || shelf
  );
}

function markAsAdded(title, tab) {
  document
    .querySelectorAll(`.add-trigger-btn[data-tab="${tab}"]`)
    .forEach((btn) => {
      if (btn.dataset.title === title) {
        btn.textContent = "Saved to Library";
        btn.disabled = true;
        btn.classList.add("is-saved");
      }
    });
}

function spawnSparks(btn) {
  const rect = btn.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  for (let i = 0; i < 12; i++) {
    const spark = document.createElement("div");
    spark.className = "spark";
    const angle = (360 / 12) * i;
    const dist = 30 + Math.random() * 30;
    const rad = (angle * Math.PI) / 180;
    const dur = 0.45 + Math.random() * 0.25;
    spark.style.cssText = `
      left:${cx}px; top:${cy}px;
      --tx:${Math.cos(rad) * dist}px;
      --ty:${Math.sin(rad) * dist}px;
      --dur:${dur}s;
      background:${Math.random() > 0.5 ? "#00C49A" : "#7fffd4"};
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

function fadeOutLoading(loading, tab) {
  stopLoadingMessages(tab);
  loading.classList.add("fade-out");
  setTimeout(() => {
    loading.style.display = "none";
  }, 420);
}

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

/* ─── STATES ─────────────────────────────────────────────────────────────────── */
function showEmptyState(tab) {
  const empty = document.getElementById(`empty-${tab}`);
  empty.style.cssText =
    "display:flex;flex-direction:column;align-items:center;justify-content:center;margin-top:3rem;";
  empty.innerHTML = `
    <img src="/assets/sorry-sheep.gif" style="width:200px;margin-bottom:1rem;"/>
    <p style="color:#00C49A;font-size:1.15rem;text-align:center;">${TAB_CONFIG[tab].emptyMsg}</p>
    <button onclick="refreshActive()" style="
      margin-top:16px;padding:10px 24px;border-radius:999px;
      border:1px solid rgba(0,196,154,0.4);background:rgba(0,196,154,0.08);
      color:#00C49A;font-size:0.85rem;font-weight:600;cursor:pointer;">
      Try again
    </button>
  `;
}

function showErrorState(tab) {
  const empty = document.getElementById(`empty-${tab}`);
  empty.style.cssText =
    "display:flex;flex-direction:column;align-items:center;justify-content:center;margin-top:3rem;";
  empty.innerHTML = `
    <p style="color:#ff6b6b;font-size:1.1rem;text-align:center;">⚠️ Failed to load ${TAB_CONFIG[tab].label} recommendations.</p>
    <button onclick="refreshActive()" style="
      margin-top:16px;padding:10px 24px;border-radius:999px;
      border:1px solid rgba(255,107,107,0.4);background:rgba(255,107,107,0.08);
      color:#ff6b6b;font-size:0.85rem;font-weight:600;cursor:pointer;">
      Retry
    </button>
  `;
}

/* ─── TOAST ──────────────────────────────────────────────────────────────────── */
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

/* ─── AI RECOMMENDATIONS GATE ────────────────────────────────────────────────── */
async function checkAiEnabled() {
  try {
    const res = await fetch(
      "https://scriptorium-backend-six.vercel.app/api/user/account",
      {
        method: "GET",
        headers: getAuthHeaders(),
      },
    );

    const data = await res.json();

    if (!res.ok || !data.ai_info) {
      showAiDisabledBanner();
      return false;
    }

    return true;
  } catch (err) {
    console.error("Failed to check AI settings:", err);
    // Fail open — let the tab fetch proceed and surface any real auth errors
    return true;
  }
}

function showAiDisabledBanner() {
  // Hide all tab panels content and show a full-width notice instead
  const main = document.querySelector("main");
  if (!main) return;

  // Hide tab bar and panels
  const tabsBar = document.querySelector(".tabs-bar");
  const refreshBtn = document.querySelector(".btn-refresh");
  if (tabsBar) tabsBar.style.display = "none";
  if (refreshBtn) refreshBtn.style.display = "none";

  // Remove any existing banner
  document.getElementById("ai-disabled-banner")?.remove();

  const banner = document.createElement("div");
  banner.id = "ai-disabled-banner";
  banner.innerHTML = `
    <style>
      @keyframes bannerFadeIn {
        from { opacity: 0; transform: translateY(18px) scale(0.98); }
        to   { opacity: 1; transform: translateY(0)   scale(1);    }
      }
      #ai-disabled-banner {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 4rem 2rem;
        animation: bannerFadeIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      }
      .adb-card {
        background: rgba(15, 25, 30, 0.72);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 24px;
        padding: 3rem 2.5rem 2.5rem;
        max-width: 480px;
        width: 100%;
        box-shadow: 0 24px 60px rgba(0,0,0,0.55);
        position: relative;
        overflow: hidden;
      }
      .adb-card::before {
        content: '';
        position: absolute; inset: 0;
        background: radial-gradient(ellipse at 50% -10%, rgba(0,196,154,0.12) 0%, transparent 65%);
        pointer-events: none;
      }
      .adb-icon {
        font-size: 3rem;
        margin-bottom: 1.25rem;
        display: block;
        filter: grayscale(0.2);
      }
      .adb-title {
        font-size: 1.3rem;
        font-weight: 700;
        color: #fff;
        margin: 0 0 0.6rem;
      }
      .adb-subtitle {
        font-size: 0.88rem;
        color: rgba(255,255,255,0.45);
        line-height: 1.6;
        margin: 0 0 2rem;
      }
      .adb-link {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 11px 26px;
        border-radius: 999px;
        border: 1px solid rgba(0,196,154,0.5);
        background: rgba(0,196,154,0.1);
        color: #00C49A;
        font-size: 0.88rem;
        font-weight: 600;
        letter-spacing: 0.02em;
        text-decoration: none;
        transition: background 0.2s, border-color 0.2s, box-shadow 0.2s, transform 0.15s;
      }
      .adb-link:hover {
        background: rgba(0,196,154,0.18);
        border-color: #00C49A;
        box-shadow: 0 0 22px rgba(0,196,154,0.25);
        transform: translateY(-1px);
      }
      .adb-link svg { width: 15px; height: 15px; flex-shrink: 0; }
      .adb-hint {
        margin-top: 1.25rem;
        font-size: 0.72rem;
        color: rgba(255,255,255,0.2);
        letter-spacing: 0.03em;
      }
    </style>

    <div class="adb-card">
      <span class="adb-icon">🤖</span>
      <p class="adb-title">AI Recommendations are turned off</p>
      <p class="adb-subtitle">
        Babushka AI needs your permission to personalise picks for you.<br>
        Enable it in your account settings and come back for movies, music &amp; books curated just for you.
      </p>
      <a href="/account" class="adb-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
             stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
        </svg>
        Go to Account Settings
      </a>
      <p class="adb-hint">Settings → AI Recommendations toggle</p>
    </div>
  `;

  // Insert after the page-controls div
  const pageControls = main.querySelector(".page-controls");
  if (pageControls) {
    pageControls.insertAdjacentElement("afterend", banner);
  } else {
    main.prepend(banner);
  }
}

/* ─── INIT ───────────────────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", async () => {
  const enabled = await checkAiEnabled();
  if (enabled) fetchTab("movies");
});
