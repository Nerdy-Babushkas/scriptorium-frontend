const SHELF_CONFIG = {
  book: {
    shelves: [
      { key: "wishlist", label: "📋 Wishlist" },
      { key: "reading", label: "📖 Reading" },
      { key: "finished", label: "✅ Finished" },
      { key: "favorites", label: "⭐ Favorites" },
    ],
    completionShelf: "finished",
    addEndpoint:
      "https://scriptorium-backend-six.vercel.app/api/books/shelf/add",
    removeEndpoint:
      "https://scriptorium-backend-six.vercel.app/api/books/shelf/remove",
    idKey: "bookId",
  },
  music: {
    shelves: [
      { key: "listening", label: "🎧 Listening" },
      { key: "finished", label: "✅ Finished" },
      { key: "favorites", label: "⭐ Favorites" },
    ],
    completionShelf: "finished",
    addEndpoint:
      "https://scriptorium-backend-six.vercel.app/api/music/shelf/add",
    removeEndpoint:
      "https://scriptorium-backend-six.vercel.app/api/music/shelf/remove",
    idKey: "trackId",
  },
  movie: {
    shelves: [
      { key: "watchlist", label: "📋 Watchlist" },
      { key: "watching", label: "📺 Watching" },
      { key: "watched", label: "✅ Watched" },
      { key: "favorites", label: "⭐ Favorites" },
    ],
    completionShelf: "watched",
    addEndpoint:
      "https://scriptorium-backend-six.vercel.app/api/movies/shelf/add",
    removeEndpoint:
      "https://scriptorium-backend-six.vercel.app/api/movies/shelf/remove",
    idKey: "movieId",
  },
};

// ============================================================
// DOM REFS
// ============================================================
const modal = document.getElementById("shelfViewModal");
const shelfTitle = document.getElementById("shelfTitle");
const bookCount = document.getElementById("bookCount");
const grid = document.getElementById("shelfGrid");
const loading = document.getElementById("shelfLoading");
const empty = document.getElementById("shelfEmpty");

let _currentShelfKey = null;

// Cache full item objects by _id so moveItem can send the complete payload
const _itemsCache = {};

// ============================================================
// TOAST
// ============================================================
function _injectToast() {
  if (document.getElementById("_libToast")) return;
  const el = document.createElement("div");
  el.id = "_libToast";
  el.style.cssText = [
    "position:fixed",
    "bottom:28px",
    "right:28px",
    "z-index:9999",
    "display:flex",
    "align-items:center",
    "gap:12px",
    "padding:14px 20px",
    "border-radius:14px",
    "min-width:240px",
    "border-left:4px solid #00C49A",
    "background:#0a1a14",
    "box-shadow:0 8px 32px rgba(0,0,0,0.5)",
    "transform:translateY(100px)",
    "opacity:0",
    "transition:transform 0.4s cubic-bezier(0.16,1,0.3,1),opacity 0.4s ease",
    "font-family:inherit",
    "color:#fff",
  ].join(";");
  el.innerHTML = `
    <span id="_libToastIcon" style="font-size:20px"></span>
    <div>
      <div id="_libToastTitle" style="font-weight:700;font-size:14px;line-height:1.2"></div>
      <div id="_libToastMsg"   style="font-size:12px;opacity:0.7;margin-top:2px"></div>
    </div>`;
  document.body.appendChild(el);
}

let _toastTimer;
function showLibToast(title, msg, type) {
  _injectToast();
  const el = document.getElementById("_libToast");
  const ok = type !== "error";
  el.style.borderColor = ok ? "#00C49A" : "#ef4444";
  el.style.background = ok ? "#0a1a14" : "#1a0a0a";
  document.getElementById("_libToastIcon").textContent = ok ? "✅" : "❌";
  document.getElementById("_libToastTitle").textContent = title;
  document.getElementById("_libToastMsg").textContent = msg;
  el.style.transform = "translateY(0)";
  el.style.opacity = "1";
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    el.style.transform = "translateY(100px)";
    el.style.opacity = "0";
  }, 3500);
}

// ============================================================
// COMPLETION PROMPT
// ============================================================
function showCompletionPrompt(itemTitle, itemId, mediaType) {
  document.getElementById("_completionPrompt")?.remove();

  const typeParam = mediaType === "music" ? "track" : mediaType;
  const overlay = document.createElement("div");
  overlay.id = "_completionPrompt";
  overlay.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:10000",
    "background:rgba(0,0,0,0.72)",
    "backdrop-filter:blur(10px)",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "padding:20px",
  ].join(";");

  overlay.innerHTML = `
    <style>
      @keyframes _cpFadeIn  { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:scale(1)} }
    </style>
    <div style="
      background:#0f191e; border:1px solid rgba(0,196,154,0.3);
      border-radius:24px; padding:40px 32px; max-width:400px; width:100%;
      box-shadow:0 24px 80px rgba(0,0,0,0.7);
      animation:_cpFadeIn 0.3s cubic-bezier(0.16,1,0.3,1);
      text-align:center; font-family:inherit; color:#fff;">

      <div style="font-size:52px;margin-bottom:14px;">🎉</div>
      <h2 style="font-size:22px;font-weight:800;margin-bottom:8px;">You finished it!</h2>
      <p style="font-size:14px;color:rgba(255,255,255,0.5);margin-bottom:6px;line-height:1.5;">
        <strong style="color:#00C49A;">${itemTitle}</strong> is now on your finished shelf.
      </p>
      <p style="font-size:13px;color:rgba(255,255,255,0.35);margin-bottom:30px;">
        Want to capture your thoughts while they're still fresh?
      </p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
        <button id="_cpReflect" style="
          padding:13px 26px;border-radius:50px;
          background:#00C49A;color:#000;font-weight:700;font-size:14px;
          border:none;cursor:pointer;
          box-shadow:0 0 24px rgba(0,196,154,0.4);
          transition:transform 0.15s,filter 0.15s;">
          ✍️ Write a Reflection
        </button>
        <button id="_cpDismiss" style="
          padding:13px 26px;border-radius:50px;
          background:transparent;color:rgba(255,255,255,0.45);
          font-weight:600;font-size:14px;
          border:1px solid rgba(255,255,255,0.12);cursor:pointer;
          transition:all 0.15s;">
          Maybe Later
        </button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  const dismiss = () => {
    overlay.style.transition = "opacity 0.2s ease";
    overlay.style.opacity = "0";
    setTimeout(() => overlay.remove(), 200);
  };

  document.getElementById("_cpReflect").addEventListener("click", () => {
    window.location.href = `/add-reflection?itemId=${itemId}&itemType=${typeParam}`;
  });
  document.getElementById("_cpDismiss").addEventListener("click", dismiss);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) dismiss();
  });

  // Button hover effects
  const reflectBtn = document.getElementById("_cpReflect");
  reflectBtn.addEventListener(
    "mouseenter",
    () => (reflectBtn.style.filter = "brightness(1.1)"),
  );
  reflectBtn.addEventListener(
    "mouseleave",
    () => (reflectBtn.style.filter = ""),
  );
}

// ============================================================
// MOVE MENU — floating shelf picker
// ============================================================
let _activeMoveMenu = null;

function closeMoveMenu() {
  if (!_activeMoveMenu) return;
  _activeMoveMenu.style.opacity = "0";
  _activeMoveMenu.style.transform = "scale(0.95) translateY(-4px)";
  const el = _activeMoveMenu;
  _activeMoveMenu = null;
  setTimeout(() => el.remove(), 150);
}

function openMoveMenu(event, itemId, fromShelf, isMusic, isTheatre, itemTitle) {
  event.stopPropagation();
  closeMoveMenu();

  const mediaType = isMusic ? "music" : isTheatre ? "movie" : "book";
  const config = SHELF_CONFIG[mediaType];
  const targets = config.shelves.filter((s) => s.key !== fromShelf);

  const btn = event.currentTarget;
  const rect = btn.getBoundingClientRect();

  const menu = document.createElement("div");
  _activeMoveMenu = menu;
  menu.style.cssText = [
    `position:fixed`,
    `top:${Math.min(rect.bottom + 6, window.innerHeight - 200)}px`,
    `left:${rect.left}px`,
    `z-index:9998`,
    `background:#0f191e`,
    `border:1px solid rgba(255,255,255,0.13)`,
    `border-radius:12px`,
    `padding:6px`,
    `min-width:180px`,
    `box-shadow:0 12px 40px rgba(0,0,0,0.65)`,
    `opacity:0`,
    `transform:scale(0.95) translateY(-4px)`,
    `transition:opacity 0.15s ease,transform 0.15s ease`,
    `font-family:inherit`,
  ].join(";");

  // Header label
  const hdr = document.createElement("div");
  hdr.style.cssText =
    "font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.3);padding:6px 10px 4px;pointer-events:none;";
  hdr.textContent = "Move to…";
  menu.appendChild(hdr);

  targets.forEach((shelf) => {
    const isDone = shelf.key === config.completionShelf;
    const row = document.createElement("button");
    row.style.cssText = [
      "display:flex",
      "align-items:center",
      "gap:8px",
      "width:100%",
      "padding:9px 10px",
      "border-radius:8px",
      "background:transparent",
      "border:none",
      "cursor:pointer",
      `color:${isDone ? "#00C49A" : "#fff"}`,
      `font-weight:${isDone ? "700" : "400"}`,
      "font-size:13px",
      "font-family:inherit",
      "text-align:left",
      "transition:background 0.12s",
    ].join(";");
    row.innerHTML = `
      <span style="flex:1">${shelf.label}</span>
      ${isDone ? `<span style="font-size:10px;background:rgba(0,196,154,0.15);color:#00C49A;padding:2px 7px;border-radius:4px;font-weight:700;">Done!</span>` : ""}`;

    row.addEventListener("mouseenter", () => {
      row.style.background = "rgba(255,255,255,0.07)";
    });
    row.addEventListener("mouseleave", () => {
      row.style.background = "transparent";
    });
    row.addEventListener("click", (e) => {
      e.stopPropagation();
      closeMoveMenu();
      moveItem(itemId, fromShelf, shelf.key, isMusic, isTheatre, itemTitle);
    });
    menu.appendChild(row);
  });

  document.body.appendChild(menu);
  requestAnimationFrame(() => {
    menu.style.opacity = "1";
    menu.style.transform = "scale(1) translateY(0)";
  });

  setTimeout(() => {
    document.addEventListener("click", closeMoveMenu, { once: true });
  }, 0);
}

// ============================================================
// MOVE ITEM
// ============================================================
async function moveItem(
  itemId,
  fromShelf,
  toShelf,
  isMusic,
  isTheatre,
  itemTitle,
) {
  const token = localStorage.getItem("token");
  if (!token) return;

  const mediaType = isMusic ? "music" : isTheatre ? "movie" : "book";
  const config = SHELF_CONFIG[mediaType];

  // Build payloads — add requires the full item object (same as search_results.js does)
  const fullItem = _itemsCache[itemId] || {};
  const addPayload = { ...fullItem, shelf: toShelf };
  const removePayload = { shelf: fromShelf };
  removePayload[config.idKey] = itemId;

  const headers = {
    "Content-Type": "application/json",
    Authorization: `jwt ${token}`,
  };

  try {
    // 1. Add to new shelf
    const addRes = await fetch(config.addEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(addPayload),
    });

    if (!addRes.ok) {
      const err = await addRes.json().catch(() => ({}));
      showLibToast(
        "Move failed",
        err.message || "Couldn't add to shelf",
        "error",
      );
      return;
    }

    // 2. Remove from old shelf
    await fetch(config.removeEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(removePayload),
    });

    // 3. Animate card out
    const card = document.querySelector(`[data-item-id="${itemId}"]`);
    if (card) {
      card.style.transition = "opacity 0.3s ease, transform 0.3s ease";
      card.style.opacity = "0";
      card.style.transform = "scale(0.88)";
      setTimeout(() => {
        card.remove();
        if (bookCount) {
          bookCount.textContent = Math.max(
            0,
            (parseInt(bookCount.textContent) || 1) - 1,
          );
        }
        if (grid.children.length === 0) empty.classList.remove("hidden");
      }, 300);
    }

    // 4. Toast
    const toLabel =
      config.shelves.find((s) => s.key === toShelf)?.label || toShelf;
    showLibToast("Moved!", `"${itemTitle}" → ${toLabel}`, "success");

    // 5. Completion prompt
    if (toShelf === config.completionShelf) {
      setTimeout(() => showCompletionPrompt(itemTitle, itemId, mediaType), 500);
    }
  } catch (err) {
    console.error("Move error:", err);
    showLibToast("Error", "Network error — try again", "error");
  }
}

// ============================================================
// OPEN SHELF
// ============================================================
async function openShelf(shelfKey, displayName) {
  _currentShelfKey = shelfKey;

  modal.classList.remove("hidden");
  shelfTitle.textContent = displayName;
  grid.innerHTML = "";
  empty.classList.add("hidden");
  loading.classList.remove("hidden");
  if (bookCount) bookCount.textContent = "...";

  const path = window.location.pathname;
  const isMusic = path.includes("music");
  const isTheatre = path.includes("theatre");

  let endpoint = `https://scriptorium-backend-six.vercel.app/api/books/shelf/${shelfKey}`;
  if (isMusic)
    endpoint = `https://scriptorium-backend-six.vercel.app/api/music/shelf/${shelfKey}`;
  if (isTheatre)
    endpoint = `https://scriptorium-backend-six.vercel.app/api/movies/shelf/${shelfKey}`;

  try {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please log in.");
      loading.classList.add("hidden");
      return;
    }

    const res = await fetch(endpoint, {
      headers: { Authorization: `jwt ${token}` },
    });
    const items = await res.json();

    loading.classList.add("hidden");
    if (bookCount) bookCount.textContent = items.length;

    if (items && items.length > 0)
      renderItems(items, shelfKey, isMusic, isTheatre);
    else empty.classList.remove("hidden");
  } catch (error) {
    console.error("Shelf error:", error);
    loading.classList.add("hidden");
    grid.innerHTML = `<div class="col-span-full text-center text-red-400">Failed to load contents.</div>`;
  }
}

// ============================================================
// CLOSE SHELF
// ============================================================
function closeShelf() {
  modal.classList.add("hidden");
  closeMoveMenu();
}

// ============================================================
// RENDER ITEMS
// ============================================================
function renderItems(items, currentShelf, isMusic, isTheatre) {
  items.forEach((item) => {
    let title, subtitle, image, id;

    // Store full item for use in moveItem payload
    if (item._id) _itemsCache[item._id] = item;

    if (isMusic) {
      id = item._id;
      title = item.title;
      subtitle = item.artist?.name || "Unknown Artist";
      image = item.coverUrl
        ? `<img src="${item.coverUrl}" class="h-48 w-48 shadow-2xl rounded-full animate-spin-slow object-cover border-4 border-[#1a1a1a]">`
        : `<div class="h-48 w-48 rounded-full bg-[#1a1a1a] flex items-center justify-center shadow-2xl border-4 border-[#333] relative">
            <div class="absolute inset-0 rounded-full border-2 border-white/10" style="margin:10px;"></div>
            <div class="absolute inset-0 rounded-full border-2 border-white/10" style="margin:25px;"></div>
            <div class="absolute inset-0 rounded-full border-2 border-white/10" style="margin:40px;"></div>
            <div class="w-16 h-16 bg-[#00C49A] rounded-full flex items-center justify-center"><span class="text-2xl">🎵</span></div>
           </div>`;
    } else if (isTheatre) {
      id = item._id;
      title = item.title || "Untitled Movie";
      subtitle = item.year || "Movie";
      const poster =
        item.poster && item.poster !== "N/A"
          ? item.poster
          : "https://via.placeholder.com/300x450?text=No+Poster";
      image = `<img src="${poster}" alt="${title}" class="h-48 w-auto shadow-2xl rounded-md group-hover:scale-105 transition-transform duration-300">`;
    } else {
      id = item._id;
      title = item.title;
      subtitle = item.authors ? item.authors[0] : "Unknown";
      const thumb =
        item.imageLinks?.thumbnail ||
        "https://via.placeholder.com/150x220?text=No+Cover";
      image = `<img src="${thumb}" alt="${title}" class="h-48 w-auto shadow-2xl rounded-md group-hover:scale-105 transition-transform duration-300">`;
    }

    const mediaType = isMusic ? "music" : isTheatre ? "movie" : "book";
    const config = SHELF_CONFIG[mediaType];
    const safeTitle = (title || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const canComplete = currentShelf !== config.completionShelf;

    const card = document.createElement("div");
    card.dataset.itemId = id;
    card.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      window.location.href = `/reflections-history?itemId=${id}&itemType=${mediaType}`;
    });
    card.className =
      "group bg-[#0f191e] border border-white/10 rounded-2xl overflow-hidden hover:border-[#00C49A] transition-all duration-300 flex flex-col relative cursor-pointer hover:scale-[1.02]";

    card.innerHTML = `
      <div class="relative p-6 flex justify-center bg-black/20 overflow-hidden">
        ${image}

        <!-- Remove button -->
        <button onclick="removeItem('${id}', '${currentShelf}', this, ${isMusic}, ${isTheatre})"
          title="Remove from shelf"
          class="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur-md hover:bg-[#D90429] text-white rounded-full opacity-0 group-hover:opacity-100 transition-all z-10 shadow-lg border border-white/10">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>

        <!-- Move button -->
        <button onclick="openMoveMenu(event, '${id}', '${currentShelf}', ${isMusic}, ${isTheatre}, '${safeTitle}')"
          title="Move to another shelf"
          class="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1.5 bg-black/60 backdrop-blur-md text-white/70 hover:text-white hover:bg-[#00C49A]/80 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10 shadow-lg border border-white/10 text-[11px] font-semibold">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
          </svg>
          Move
        </button>
      </div>

      <div class="p-5 flex-grow flex flex-col">
        <h3 class="text-white font-bold text-lg leading-tight mb-1 line-clamp-2">${title}</h3>
        <p class="text-[#00C49A] text-sm font-semibold mb-2">${subtitle}</p>
        ${
          canComplete
            ? `
        <button onclick="moveItem('${id}', '${currentShelf}', '${config.completionShelf}', ${isMusic}, ${isTheatre}, '${safeTitle}')"
          class="mt-auto text-xs text-white/25 hover:text-[#00C49A] transition-colors font-semibold flex items-center gap-1.5 w-fit pt-2">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
          </svg>
          Mark as done
        </button>`
            : `
        <div class="mt-auto flex items-center gap-1.5 pt-2">
          <svg class="w-3.5 h-3.5 text-[#00C49A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
          </svg>
          <span class="text-xs text-[#00C49A] font-semibold">Completed</span>
        </div>`
        }
      </div>`;

    grid.appendChild(card);
  });
}

// ============================================================
// REMOVE ITEM
// ============================================================
async function removeItem(id, shelf, btnElement, isMusic, isTheatre) {
  if (!confirm("Remove this item from the shelf?")) return;

  const mediaType = isMusic ? "music" : isTheatre ? "movie" : "book";
  const config = SHELF_CONFIG[mediaType];
  const payload = { shelf };
  payload[config.idKey] = id;

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(config.removeEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `jwt ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const card = btnElement.closest("[data-item-id]");
      card.style.transition = "all 0.3s ease";
      card.style.opacity = "0";
      card.style.transform = "scale(0.88)";
      setTimeout(() => {
        card.remove();
        if (bookCount)
          bookCount.textContent = Math.max(
            0,
            (parseInt(bookCount.textContent) || 1) - 1,
          );
        if (grid.children.length === 0) empty.classList.remove("hidden");
      }, 300);
      showLibToast("Removed", "Item removed from shelf", "success");
    } else {
      showLibToast("Error", "Failed to remove item", "error");
    }
  } catch (e) {
    console.error(e);
    showLibToast("Error", "Network error", "error");
  }
}
