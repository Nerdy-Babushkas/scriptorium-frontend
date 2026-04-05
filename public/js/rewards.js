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

/* ─── BADGE CATEGORY PROGRESS CONFIG ─────────────────────────────────────────
   Thresholds must match badge-service.js on the backend exactly.            */
const PROGRESS_CONFIG = [
  {
    key: "streak",
    label: "Streak",
    icon: "🔥",
    thresholds: [3, 7, 14, 30, 100],
    // value resolved at render time from streakData.current
  },
  {
    key: "reflection",
    label: "Reflections",
    icon: "✍️",
    thresholds: [1, 5, 20, 50],
    // value resolved at render time from earned reflection badges
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
    thresholds: [1, 5], // completed goals only
  },
];

/* ─── FETCH ──────────────────────────────────────────────────────────────────── */
async function fetchAll() {
  try {
    const [streakRes, badgesRes, catalogueRes] = await Promise.all([
      fetch(`${BASE_URL}/streaks`, { headers: getAuthHeaders() }),
      fetch(`${BASE_URL}/badges`, { headers: getAuthHeaders() }),
      fetch(`${BASE_URL}/badges/catalogue`, { headers: getAuthHeaders() }),
    ]);

    if (!streakRes.ok || !badgesRes.ok || !catalogueRes.ok) {
      throw new Error("One or more requests failed");
    }

    streakData = await streakRes.json();
    const badgePayload = await badgesRes.json();
    const catPayload = await catalogueRes.json();

    allBadges = badgePayload.badges || [];
    fullCatalogue = catPayload.catalogue || [];

    renderStreak();
    renderProgress();
    renderBadges();
  } catch (err) {
    console.error("Rewards fetch error:", err);
    showErrorState();
  }
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

  // ── Animal mood based on current streak ──────────────────────────────────
  // Swap src for your actual GIF assets when available
  const animalSrc = getAnimalSrc(current);
  const animalAlt = getAnimalAlt(current);

  // ── Scarf stripes (show up to 30, current streak filled) ─────────────────
  const SCARF_SLOTS = 30;
  let scarfHtml = "";
  for (let i = 0; i < SCARF_SLOTS; i++) {
    let cls = "empty";
    if (i < current - 1) cls = "filled";
    else if (i === current - 1 && current > 0) cls = "today";
    scarfHtml += `<div class="scarf-stripe ${cls}" title="Day ${i + 1}"></div>`;
  }

  // ── Weekly mini-calendar (Mon–Sun of current week) ────────────────────────
  const today = new Date();
  const dow = today.getDay(); // 0 = Sun
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
    // A day counts as "done" if the streak covers it — approximate via lastActiveDate
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

  // ── Grace pill ────────────────────────────────────────────────────────────
  const gracePill =
    grace > 0
      ? `<div class="grace-pill">🛡️ ${grace} grace day${grace > 1 ? "s" : ""} available</div>`
      : "";

  // ── Mood message ─────────────────────────────────────────────────────────
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
    // Count how many badges in this category are earned
    const earnedInCat = allBadges.filter((b) => b.category === cfg.key).length;
    const totalInCat = fullCatalogue.filter(
      (b) => b.category === cfg.key,
    ).length;

    // Current numeric value for the progress fill
    let current = 0;
    if (cfg.key === "streak") {
      current = streakData?.current || 0;
    } else {
      // Infer current value from the highest earned threshold
      const earned = cfg.thresholds.filter((t) =>
        earnedKeys.has(`${cfg.key}_${t}`),
      );
      current = earned.length ? Math.max(...earned) : 0;
    }

    // Next threshold
    const next = cfg.thresholds.find((t) => t > current);
    const max = cfg.thresholds[cfg.thresholds.length - 1];
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

  // Filter catalogue by selected category
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

  // Earned first, then locked
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

/* ─── BADGE UNLOCK MODAL (called from outside, e.g. after a ping) ────────────── */
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
