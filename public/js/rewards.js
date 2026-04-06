/* =====================================================
   🏅 REWARDS — Streaks · Badges · Progress
===================================================== */

const BASE_URL = "https://scriptorium-backend-six.vercel.app/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `JWT ${token}`,
  };
};

/* ─── GLOBAL STATE ───────────────────────────────────────────────────────────── */
let allBadges = []; // earned Badge docs from the server
let fullCatalogue = []; // all possible badges (catalogue)
let streakData = null; // streak doc from server
let activeFilter = "all";
let yarnData = null;

/* ─── BADGE CATEGORY PROGRESS CONFIG ─────────────────────────────────────────
   Thresholds must match badge-service.js on the backend exactly.            */
const PROGRESS_CONFIG = [
  {
    key: "streak",
    label: "Streak",
    icon: "🔥",
    thresholds: [3, 7, 14, 30, 100],
  },
  {
    key: "reflection",
    label: "Reflections",
    icon: "✍️",
    thresholds: [1, 5, 20, 50],
  },
  {
    key: "media",
    label: "Media saved",
    icon: "📚",
    thresholds: [1, 10, 50, 100],
  },
  {
    key: "goal",
    label: "Goals",
    icon: "🎯",
    thresholds: [1, 5],
  },
];

/* ─── FETCH ──────────────────────────────────────────────────────────────────── */
async function fetchAll() {
  try {
    const [streakRes, badgesRes, catalogueRes, yarnRes] = await Promise.all([
      fetch(`${BASE_URL}/streaks`, { headers: getAuthHeaders() }),
      fetch(`${BASE_URL}/badges`, { headers: getAuthHeaders() }),
      fetch(`${BASE_URL}/badges/catalogue`, { headers: getAuthHeaders() }),
      fetch(`${BASE_URL}/yarns`, { headers: getAuthHeaders() }),
    ]);

    if (!streakRes.ok || !badgesRes.ok || !catalogueRes.ok) {
      throw new Error("One or more requests failed");
    }

    streakData = await streakRes.json();
    const badgePayload = await badgesRes.json();
    const catPayload = await catalogueRes.json();
    yarnData = yarnRes.ok ? await yarnRes.json() : null;

    allBadges = badgePayload.badges || [];
    fullCatalogue = catPayload.catalogue || [];

    renderYarns();
    renderStreak();
    renderProgress();
    renderBadges();
  } catch (err) {
    console.error("Rewards fetch error:", err);
    showErrorState();
  }
}

/* ─── YARN RENDER ────────────────────────────────────────────────────────────── */
function renderYarns() {
  const balanceEl = document.getElementById("yarnBalance");
  const lifetimeEl = document.getElementById("yarnLifetime");
  if (!balanceEl) return;

  const balance = yarnData?.balance ?? 0;
  const lifetimeEarned = yarnData?.lifetimeEarned ?? 0;

  balanceEl.textContent = balance.toLocaleString();
  lifetimeEl.textContent = `${lifetimeEarned.toLocaleString()} earned total`;
}

/* ─── STREAK RENDER ──────────────────────────────────────────────────────────── */
function renderStreak() {
  const skeleton = document.getElementById("streakSkeleton");
  const content = document.getElementById("streakContent");
  if (!skeleton || !content) return;

  const current = streakData?.current || 0;
  const longest = streakData?.longest || 0;
  const grace = streakData?.graceDaysAvailable || 0;
  const total = streakData?.totalActiveDays || 0;

  const animalSrc = getAnimalSrc(current);
  const animalAlt = getAnimalAlt(current);

  // ── Scarf stripes ────────────────────────────────────────────────────────
  const SCARF_SLOTS = 30;
  let scarfHtml = "";
  for (let i = 0; i < SCARF_SLOTS; i++) {
    let cls = "empty";
    if (i < current - 1) cls = "filled";
    else if (i === current - 1 && current > 0) cls = "today";
    scarfHtml += `<div class="scarf-stripe ${cls}" title="Day ${i + 1}"></div>`;
  }

  // ── Weekly mini-calendar ──────────────────────────────────────────────────
  const today = new Date();
  const dow = today.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const lastActive = streakData?.lastActiveDate
    ? new Date(streakData.lastActiveDate)
    : null;
  const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  let weekHtml = "";

  for (let d = 0; d < 7; d++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + d);
    day.setHours(0, 0, 0, 0);

    const dayNum = day.getDate();
    const isToday = sameDay(day, today);
    const isFuture = day > today;
    const streakCoversDay =
      lastActive &&
      !isFuture &&
      (sameDay(day, lastActive) ||
        (day < lastActive && dayDiff(lastActive, day) < current));

    let dotClass = "";
    if (isToday && current > 0) dotClass = "today";
    else if (!isFuture && streakCoversDay) dotClass = "done";

    weekHtml += `
      <div class="week-day">
        <span class="week-day-label">${DAY_LABELS[d]}</span>
        <div class="week-day-dot ${dotClass}">${dayNum}</div>
      </div>`;
  }

  const gracePill =
    grace > 0
      ? `<div class="grace-pill">🛡️ ${grace} grace day${grace > 1 ? "s" : ""} available</div>`
      : "";

  const moodMsg = getMoodMessage(current);

  content.innerHTML = `
    <div class="streak-top">
      <div class="streak-numbers">
        <div class="streak-stat">
          <span class="streak-stat-value ${current === 0 ? "cold" : ""}">${current}</span>
          <span class="streak-stat-label">Day streak</span>
        </div>
        <div class="streak-stat">
          <span class="streak-stat-value" style="-webkit-text-fill-color:rgba(255,255,255,0.4);background:none;">${longest}</span>
          <span class="streak-stat-label">Best streak</span>
        </div>
        <div class="streak-stat">
          <span class="streak-stat-value" style="-webkit-text-fill-color:rgba(255,255,255,0.4);background:none;">${total}</span>
          <span class="streak-stat-label">Total days</span>
        </div>
      </div>
      <img src="${escapeAttr(animalSrc)}" alt="${escapeAttr(animalAlt)}" class="streak-animal" />
    </div>

    <p style="font-size:0.8rem;color:rgba(255,255,255,0.38);margin:14px 0 0;font-style:italic;">
      ${escapeHtml(moodMsg)}
    </p>

    <div class="scarf-bar">
      <div class="scarf-label">
        <span>Masha's scarf</span>
        <span>${current} / 30 stripes</span>
      </div>
      <div class="scarf-stripes">${scarfHtml}</div>
    </div>

    <div class="week-row">${weekHtml}</div>
    ${gracePill}
  `;

  skeleton.style.display = "none";
  content.style.display = "block";
}

/* ─── PROGRESS RENDER ────────────────────────────────────────────────────────── */
function renderProgress() {
  const container = document.getElementById("progressRows");
  if (!container) return;

  const earnedKeys = new Set(allBadges.map((b) => b.key));

  const rows = PROGRESS_CONFIG.map((cfg) => {
    const earnedInCat = allBadges.filter((b) => b.category === cfg.key).length;
    const totalInCat = fullCatalogue.filter(
      (b) => b.category === cfg.key,
    ).length;

    let current = 0;
    if (cfg.key === "streak") {
      current = streakData?.current || 0;
    } else {
      const earned = cfg.thresholds.filter((t) =>
        earnedKeys.has(`${cfg.key}_${t}`),
      );
      current = earned.length ? Math.max(...earned) : 0;
    }

    const next = cfg.thresholds.find((t) => t > current);
    const pct = next ? Math.min(100, Math.round((current / next) * 100)) : 100;

    const nextLabel = next
      ? `Next badge at ${next}`
      : `All ${cfg.label.toLowerCase()} badges earned!`;

    return `
      <div class="progress-row">
        <div class="progress-row-top">
          <span class="progress-row-label">
            <span>${cfg.icon}</span>${cfg.label}
          </span>
          <span class="progress-row-count">${earnedInCat} / ${totalInCat} badges</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
        <span class="progress-next">${escapeHtml(nextLabel)}</span>
      </div>`;
  });

  container.innerHTML = rows.join("");
}

/* ─── BADGES RENDER ──────────────────────────────────────────────────────────── */
function renderBadges(filterCat) {
  const cat = filterCat ?? activeFilter;
  const grid = document.getElementById("badgesGrid");
  if (!grid) return;

  const earnedMap = new Map(allBadges.map((b) => [b.key, b]));

  const visible = fullCatalogue.filter(
    (b) => cat === "all" || b.category === cat,
  );

  if (!visible.length) {
    grid.innerHTML = `
      <div class="state-center" style="grid-column:1/-1;">
        <img src="/assets/sorry-sheep.gif" style="width:160px;margin-bottom:1rem;"/>
        <p style="color:rgba(255,255,255,0.3);font-size:0.9rem;">No badges in this category yet.</p>
      </div>`;
    return;
  }

  const sorted = [...visible].sort((a, b) => {
    const aEarned = earnedMap.has(a.key) ? 0 : 1;
    const bEarned = earnedMap.has(b.key) ? 0 : 1;
    return aEarned - bEarned;
  });

  grid.innerHTML = sorted
    .map((def) => {
      const earned = earnedMap.get(def.key);
      if (earned) {
        const dateStr = new Date(earned.earnedAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        return `
        <div class="badge-card earned" title="${escapeAttr(def.description)}">
          <div class="badge-sparkle"></div>
          <span class="badge-icon">${escapeHtml(def.icon)}</span>
          <span class="badge-name">${escapeHtml(def.name)}</span>
          <p class="badge-desc">${escapeHtml(def.description)}</p>
          <span class="badge-date">${dateStr}</span>
        </div>`;
      } else {
        return `
        <div class="badge-card locked" title="Not yet earned">
          <span class="badge-icon-locked">🔒</span>
          <span class="badge-name">${escapeHtml(def.name)}</span>
          <p class="badge-desc">${escapeHtml(def.description)}</p>
        </div>`;
      }
    })
    .join("");
}

/* ─── FILTER ─────────────────────────────────────────────────────────────────── */
function filterBadges(cat) {
  activeFilter = cat;
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.cat === cat);
  });
  renderBadges(cat);
}

/* ─── BADGE UNLOCK MODAL ─────────────────────────────────────────────────────── */
function showBadgeUnlock(badge) {
  document.getElementById("unlockIcon").textContent = badge.icon || "🏅";
  document.getElementById("unlockName").textContent = badge.name || "New badge";
  document.getElementById("unlockDesc").textContent = badge.description || "";
  document.getElementById("badgeUnlockModal").style.display = "flex";
  spawnConfetti();
}

document.getElementById("unlockClose")?.addEventListener("click", () => {
  document.getElementById("badgeUnlockModal").style.display = "none";
});

document.getElementById("badgeUnlockModal")?.addEventListener("click", (e) => {
  if (e.target === document.getElementById("badgeUnlockModal")) {
    document.getElementById("badgeUnlockModal").style.display = "none";
  }
});

/* ─── TOAST SYSTEM ───────────────────────────────────────────────────────────────
   Call showToast(options) from anywhere — including other JS files.
   Options:
     title   {string}  bold first line
     msg     {string}  smaller second line  (optional)
     emoji   {string}  leading emoji        (optional, default "✦")
     type    {string}  "success" | "error" | "info"  (optional, default "success")
     duration{number}  ms before auto-dismiss        (optional, default 3800)

   To show new badge toasts from another page's JS:
     window.dispatchEvent(new CustomEvent("scriptorium:badges", {
       detail: { badges: [ ...badgeObjects ] }
     }));
   rewards.js listens for this event and shows a toast per badge.
   Any page can fire it — just import nothing, no coupling.
────────────────────────────────────────────────────────────────────────────────── */
function showToast({
  title,
  msg = "",
  emoji = "✦",
  type = "success",
  duration = 3800,
} = {}) {
  const stack = document.getElementById("toastStack");
  if (!stack) return;

  const item = document.createElement("div");
  item.className = `toast-item${type === "error" ? " toast-error" : type === "info" ? " toast-info" : ""}`;
  item.innerHTML = `
    <span class="toast-emoji">${escapeHtml(emoji)}</span>
    <div class="toast-body">
      <div class="toast-title">${escapeHtml(title)}</div>
      ${msg ? `<div class="toast-msg">${escapeHtml(msg)}</div>` : ""}
    </div>
    <span class="toast-dismiss">✕</span>
  `;

  // Dismiss on click
  item.addEventListener("click", () => dismissToast(item));

  stack.appendChild(item);

  // Trigger enter animation on next frame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => item.classList.add("visible"));
  });

  // Auto-dismiss
  const timer = setTimeout(() => dismissToast(item), duration);
  item._dismissTimer = timer;
}

function dismissToast(item) {
  clearTimeout(item._dismissTimer);
  item.classList.remove("visible");
  item.addEventListener("transitionend", () => item.remove(), { once: true });
}

/* ─── BADGE TOAST HELPER ─────────────────────────────────────────────────────── */
// Call this to surface new badges as toasts (and show the unlock modal for the first one).
// Used internally and also by other pages via the custom event below.
function showNewBadges(badges) {
  if (!badges || !badges.length) return;

  // Show the full unlock modal for the first new badge
  showBadgeUnlock(badges[0]);

  // Toast for every badge (including the first, as a persistent reminder)
  badges.forEach((badge) => {
    showToast({
      title: `${badge.icon || "🏅"} ${badge.name}`,
      msg: badge.description,
      emoji: badge.icon || "🏅",
      type: "success",
      duration: 5000,
    });
  });
}

/* ─── CROSS-PAGE EVENT LISTENER ──────────────────────────────────────────────────
   Other pages (reflections, goals, media) fire this event after getting
   _newBadges back from the API. rewards.js doesn't need to be loaded there —
   they dispatch the event on window and any page that has rewards.js loaded
   will catch it. For pages that DON'T have rewards.js, add a tiny inline
   listener (see bottom of this file for the snippet to copy).
────────────────────────────────────────────────────────────────────────────────── */
window.addEventListener("scriptorium:badges", (e) => {
  const badges = e.detail?.badges;
  if (badges?.length) showNewBadges(badges);
});

window.addEventListener("scriptorium:streak", (e) => {
  const { current } = e.detail || {};
  if (current !== undefined) {
    showToast({
      title: `🔥 ${current}-day streak!`,
      msg: "Keep it going — write or make progress today.",
      emoji: "🔥",
      type: "success",
      duration: 3500,
    });
  }
});

/* ─── CONFETTI BURST ─────────────────────────────────────────────────────────── */
function spawnConfetti() {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const COLORS = ["#00C49A", "#7fffd4", "#ffd700", "#ff9f43", "#a29bfe"];

  for (let i = 0; i < 24; i++) {
    const spark = document.createElement("div");
    spark.className = "spark";
    const angle = (360 / 24) * i + Math.random() * 10;
    const dist = 80 + Math.random() * 80;
    const rad = (angle * Math.PI) / 180;
    const dur = 0.55 + Math.random() * 0.35;
    spark.style.cssText = `
      left:${cx}px; top:${cy}px;
      --tx:${Math.cos(rad) * dist}px;
      --ty:${Math.sin(rad) * dist}px;
      --dur:${dur}s;
      background:${COLORS[Math.floor(Math.random() * COLORS.length)]};
    `;
    document.body.appendChild(spark);
    spark.addEventListener("animationend", () => spark.remove());
  }
}

/* ─── ERROR STATE ────────────────────────────────────────────────────────────── */
function showErrorState() {
  const card = document.getElementById("streakCard");
  if (card)
    card.innerHTML = `
    <div class="state-center">
      <p style="color:#ff6b6b;font-size:1rem;">⚠️ Could not load your rewards. Check your connection.</p>
    </div>`;
}

/* ─── ANIMAL HELPERS ─────────────────────────────────────────────────────────── */
function getAnimalSrc(streak) {
  if (streak === 0) return "/assets/masha-sad.gif";
  if (streak < 3) return "/assets/masha-cosy.gif";
  if (streak < 7) return "/assets/masha-happy.gif";
  if (streak < 14) return "/assets/masha-knitting.gif";
  return "/assets/masha-dancing.gif";
}

function getAnimalAlt(streak) {
  if (streak === 0) return "Masha looks sad — no streak yet";
  if (streak < 3) return "Masha is warming up";
  if (streak < 7) return "Masha is happy";
  if (streak < 14) return "Masha is knitting happily";
  return "Masha is dancing!";
}

function getMoodMessage(streak) {
  if (streak === 0)
    return "Masha's cup is empty. Come back today to start your streak.";
  if (streak === 1)
    return "Masha's pouring the first cup. A journey of a thousand days starts here.";
  if (streak < 3)
    return "Masha is warming up. Keep going — she believes in you.";
  if (streak < 7)
    return "Masha is knitting steadily. A few more days for a real scarf.";
  if (streak < 14) return "Masha is happy! The scarf is growing nicely.";
  if (streak < 30)
    return "Masha is dancing between the shelves. Don't break her heart.";
  return "30 stripes! Masha's scarf is magnificent. Legendary.";
}

/* ─── DATE HELPERS ───────────────────────────────────────────────────────────── */
function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayDiff(a, b) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const ua = new Date(a);
  ua.setHours(0, 0, 0, 0);
  const ub = new Date(b);
  ub.setHours(0, 0, 0, 0);
  return Math.round((ua - ub) / msPerDay);
}

/* ─── ESCAPE HELPERS ─────────────────────────────────────────────────────────── */
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

/* ─── INIT ───────────────────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  fetchAll();
});

/*
═══════════════════════════════════════════════════════════
  HOW TO FIRE BADGE/STREAK TOASTS FROM OTHER PAGES
═══════════════════════════════════════════════════════════
  After any API call that returns _newBadges (reflection, goal, media),
  paste this helper into that page's JS file:

  function notifyBadges(newBadges, streak) {
    if (newBadges?.length) {
      window.dispatchEvent(new CustomEvent("scriptorium:badges", {
        detail: { badges: newBadges }
      }));
    }
    if (streak?.current > 1) {
      window.dispatchEvent(new CustomEvent("scriptorium:streak", {
        detail: { current: streak.current }
      }));
    }
  }

  Then call it after your fetch:
    const data = await res.json();               // has data.reflection._newBadges
    notifyBadges(data.reflection._newBadges, data.streak);

  If the user is ON the rewards page, rewards.js catches the event and
  shows the toast + modal. If they're on another page that also loads
  rewards.js (e.g. via a shared bundle), same thing. If rewards.js is
  NOT loaded on that page, add the toast stack HTML + showToast() to
  your shared layout instead — or just use the event to refresh a
  notification badge in the navbar.
═══════════════════════════════════════════════════════════
*/
