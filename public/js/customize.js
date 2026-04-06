/* =====================================================
   🎨 CUSTOMISE — Avatar shop
===================================================== */

const BASE_URL = "https://scriptorium-backend-six.vercel.app/api";

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `JWT ${localStorage.getItem("token")}`,
});

// Avatar image paths — one PNG per key in /assets/avatars/
const AVATAR_IMG = (key) => `/assets/avatars/${key}.png`;

// Tier display labels
const TIER_LABEL = {
  default: "Default",
  starter: "Starter",
  mid: "Explorer",
  premium: "Premium",
  rare: "Rare",
  legendary: "Legendary",
};

/* ─── STATE ──────────────────────────────────────────────────────────────────── */
let catalogue = [];
let equipped = "hatchling";
let balance = 0;

// Pending unlock (shown in confirm modal)
let pendingKey = null;

/* ─── FETCH ──────────────────────────────────────────────────────────────────── */
async function fetchAll() {
  try {
    const [avatarRes, yarnRes] = await Promise.all([
      fetch(`${BASE_URL}/avatars`, { headers: getAuthHeaders() }),
      fetch(`${BASE_URL}/yarns`, { headers: getAuthHeaders() }),
    ]);

    if (!avatarRes.ok) throw new Error("Failed to load avatars");

    const avatarData = await avatarRes.json();
    const yarnData = yarnRes.ok ? await yarnRes.json() : { balance: 0 };

    catalogue = avatarData.catalogue || [];
    equipped = avatarData.equipped || "hatchling";
    balance = yarnData.balance || 0;

    // Cache equipped key so next load is instant
    localStorage.setItem("equippedAvatar", equipped);

    renderEquipped();
    renderGrid();
  } catch (err) {
    console.error("Customise fetch error:", err);
    showToast("Could not load avatars", "error");
  }
}

/* ─── RENDER: equipped preview ───────────────────────────────────────────────── */
function renderEquipped() {
  const def = catalogue.find((a) => a.key === equipped);
  if (!def) return;

  document.getElementById("equippedImg").src = AVATAR_IMG(def.key);
  document.getElementById("equippedImg").alt = def.name;
  document.getElementById("equippedName").textContent = def.name;
  document.getElementById("equippedTier").textContent =
    TIER_LABEL[def.tier] || def.tier;
  document.getElementById("yarnBalance").textContent = balance.toLocaleString();
}

/* ─── RENDER: avatar grid ────────────────────────────────────────────────────── */
function renderGrid() {
  const grid = document.getElementById("avatarGrid");
  grid.innerHTML = "";

  catalogue.forEach((def) => {
    const isEquipped = def.key === equipped;
    const isOwned = def.owned || def.cost === 0;
    const canAfford = balance >= def.cost;

    const card = document.createElement("div");
    card.className = [
      "avatar-card",
      isEquipped ? "equipped" : "",
      !isOwned ? "locked" : "",
    ]
      .filter(Boolean)
      .join(" ");

    // Button state
    let btnHtml;
    if (isEquipped) {
      btnHtml = `<button class="avatar-action-btn btn-equipped" disabled>✓ Equipped</button>`;
    } else if (isOwned) {
      btnHtml = `<button class="avatar-action-btn btn-equip" data-key="${def.key}">Equip</button>`;
    } else {
      btnHtml = `
        <button class="avatar-action-btn btn-unlock" data-key="${def.key}" ${!canAfford ? "disabled title='Not enough yarns'" : ""}>
          ${canAfford ? `🧶 Unlock · ${def.cost}` : `🔒 ${def.cost} 🧶`}
        </button>`;
    }

    card.innerHTML = `
      ${isEquipped ? '<div class="avatar-equipped-dot"></div>' : ""}
      <img src="${AVATAR_IMG(def.key)}" alt="${def.name}" class="avatar-img" />
      <span class="avatar-name">${def.name}</span>
      <span class="avatar-tier-pill tier-${def.tier}">${TIER_LABEL[def.tier] || def.tier}</span>
      ${
        def.cost > 0 && !isOwned
          ? `<span style="font-size:0.68rem;color:rgba(255,255,255,0.25);">${def.cost} yarns</span>`
          : def.cost === 0
            ? `<span style="font-size:0.68rem;color:rgba(0,196,154,0.4);">Free</span>`
            : ""
      }
      ${btnHtml}
    `;

    // Event listeners on the button
    const btn = card.querySelector("button:not([disabled])");
    if (btn) {
      if (btn.classList.contains("btn-equip")) {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          equip(def.key);
        });
      } else if (btn.classList.contains("btn-unlock")) {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          openConfirm(def);
        });
      }
    }

    grid.appendChild(card);
  });
}

/* ─── EQUIP ──────────────────────────────────────────────────────────────────── */
async function equip(key) {
  try {
    const res = await fetch(`${BASE_URL}/avatars/equip`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ key }),
    });

    if (!res.ok) {
      const err = await res.json();
      return showToast(err.message || "Couldn't equip avatar", "error");
    }

    const name = catalogue.find((a) => a.key === key)?.name;
    equipped = key;
    localStorage.setItem("equippedAvatar", key);
    catalogue = catalogue.map((a) => ({ ...a, equipped: a.key === key }));

    renderEquipped();
    renderGrid();
    updateNavbarAvatar(key);
    showToast(`${name || key} equipped! 🎉`, "success");
  } catch (err) {
    showToast("Network error", "error");
  }
}

/* ─── UNLOCK (confirm modal) ────────────────────────────────────────────────── */
function openConfirm(def) {
  pendingKey = def.key;
  document.getElementById("confirmAnimal").textContent = ""; // will be the img
  document.getElementById("confirmAnimal").innerHTML =
    `<img src="${AVATAR_IMG(def.key)}" style="width:64px;height:64px;object-fit:contain;" />`;
  document.getElementById("confirmTitle").textContent = `Unlock ${def.name}?`;
  document.getElementById("confirmDesc").textContent =
    `This will spend ${def.cost} yarns from your balance.`;
  document.getElementById("confirmCost").textContent =
    `${def.cost} 🧶  →  ${balance - def.cost} remaining`;
  document.getElementById("confirmModal").classList.add("open");
}

function closeConfirm() {
  document.getElementById("confirmModal").classList.remove("open");
  pendingKey = null;
}

document
  .getElementById("confirmCancel")
  .addEventListener("click", closeConfirm);
document.getElementById("confirmModal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("confirmModal")) closeConfirm();
});

document.getElementById("confirmOk").addEventListener("click", async () => {
  if (!pendingKey) return;
  const key = pendingKey;
  const btn = document.getElementById("confirmOk");
  btn.disabled = true;
  btn.textContent = "Unlocking…";

  try {
    const res = await fetch(`${BASE_URL}/avatars/unlock`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ key }),
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.message || "Unlock failed", "error");
      btn.disabled = false;
      btn.textContent = "Unlock";
      return;
    }

    // Deduct from local balance
    const def = catalogue.find((a) => a.key === key);
    balance -= def?.cost || 0;

    // Mark as owned in local catalogue
    catalogue = catalogue.map((a) =>
      a.key === key ? { ...a, owned: true } : a,
    );

    closeConfirm();
    renderEquipped(); // update balance chip
    renderGrid();

    showToast(`${def?.name} unlocked! Tap Equip to wear it.`, "success");
  } catch (err) {
    showToast("Network error", "error");
    btn.disabled = false;
    btn.textContent = "Unlock";
  }
});

/* ─── NAVBAR AVATAR SYNC ─────────────────────────────────────────────────────── */
// Updates the profile button image in the navbar without a full page reload.
function updateNavbarAvatar(key) {
  const navImg = document.querySelector("#profile-menu-btn img");
  if (navImg) {
    navImg.src = AVATAR_IMG(key);
    navImg.style.objectFit = "contain";
    navImg.style.padding = "4px";
  }
}

/* ─── TOAST ──────────────────────────────────────────────────────────────────── */
function showToast(msg, type = "success") {
  const stack = document.getElementById("toastStack");
  const item = document.createElement("div");
  item.className = `toast-item toast-${type}`;
  item.innerHTML = `<span class="toast-msg">${msg}</span>`;
  item.addEventListener("click", () => dismiss(item));
  stack.appendChild(item);
  requestAnimationFrame(() =>
    requestAnimationFrame(() => item.classList.add("visible")),
  );
  const t = setTimeout(() => dismiss(item), 4000);
  item._t = t;
}

function dismiss(item) {
  clearTimeout(item._t);
  item.classList.remove("visible");
  item.addEventListener("transitionend", () => item.remove(), { once: true });
}

/* ─── INIT ───────────────────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  if (!localStorage.getItem("token")) {
    window.location.href = "/login";
    return;
  }

  // Apply cached avatar immediately — no flicker while the fetch loads
  const cached = localStorage.getItem("equippedAvatar");
  if (cached) {
    const img = document.getElementById("equippedImg");
    if (img) img.src = AVATAR_IMG(cached);
  }

  fetchAll();
});
