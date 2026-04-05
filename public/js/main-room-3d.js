import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

// --- INTERACTIVE OBJECTS CONFIG ---
const interactiveObjects = {
  Music: { url: "/music", label: "Music Room" },
  "Music.001": { url: "/music", label: "Music Room" },
  Books: { url: "/library", label: "Library" },
  Screen: { url: "/theatre", label: "Theatre" },
};

let scene, camera, renderer, controls;
let clickableMeshes = [];
let hoveredObject = null;
let outlineMesh = null;

// --- TOOLTIP ---
const tooltip = document.createElement("div");
tooltip.style.cssText = `
  position: fixed;
  background: rgba(20, 10, 5, 0.88);
  color: #f5e6c8;
  padding: 8px 16px;
  border-radius: 6px;
  font-family: serif;
  font-size: 15px;
  pointer-events: none;
  border: 1px solid #8b6914;
  opacity: 0;
  transition: opacity 0.15s;
  z-index: 999;
  letter-spacing: 0.03em;
`;
document.body.appendChild(tooltip);

// --- RAYCASTER ---
const raycaster = new THREE.Raycaster();
raycaster.params.Mesh.threshold = 0;
const mouse = new THREE.Vector2();

// --- OUTLINE MATERIAL ---
const outlineMaterial = new THREE.MeshBasicMaterial({
  color: 0xf0c040,
  side: THREE.BackSide,
});

function addOutline(mesh) {
  removeOutline();
  outlineMesh = new THREE.Mesh(mesh.geometry, outlineMaterial);
  outlineMesh.matrixAutoUpdate = true;

  if (mesh.parent) {
    mesh.parent.add(outlineMesh);
    outlineMesh.applyMatrix4(mesh.matrixWorld);
    outlineMesh.matrix.premultiply(mesh.parent.matrixWorld.clone().invert());
    outlineMesh.matrix.decompose(
      outlineMesh.position,
      outlineMesh.quaternion,
      outlineMesh.scale,
    );
    outlineMesh.scale.multiplyScalar(1.07);
  } else {
    scene.add(outlineMesh);
  }
}

function removeOutline() {
  if (outlineMesh) {
    outlineMesh.parent?.remove(outlineMesh);
    outlineMesh = null;
  }
}

function registerClickableObjects(model) {
  model.traverse((child) => {
    if (child.isMesh) {
      console.log("Mesh:", child.name);
      const config = interactiveObjects[child.name];
      if (config) {
        child.userData.config = config;
        clickableMeshes.push(child);
        console.log(`✓ Registered: "${child.name}" → ${config.url}`);
      }
    }
  });
  console.log(`Total clickable meshes: ${clickableMeshes.length}`);
}

// --- KEY FIX: Canvas-relative mouse ---
function getCanvasRelativeMouse(e) {
  const canvas = renderer.domElement;
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
}

function getHitTarget(intersects) {
  for (const intersect of intersects) {
    let obj = intersect.object;
    while (obj) {
      if (obj.userData.config) return obj;
      obj = obj.parent;
    }
  }
  return null;
}

// ─── TOAST STACK ──────────────────────────────────────────────────────────────

function _ensureToastStack() {
  let stack = document.getElementById("_roomToastStack");
  if (stack) return stack;
  stack = document.createElement("div");
  stack.id = "_roomToastStack";
  stack.style.cssText = `
    position:fixed; bottom:1.5rem; right:1.5rem;
    display:flex; flex-direction:column-reverse; gap:10px;
    z-index:10000; pointer-events:none;
    max-width:300px; width:calc(100vw - 3rem);
  `;
  document.body.appendChild(stack);
  return stack;
}

function showRoomToast({
  title,
  msg = "",
  emoji = "✦",
  type = "success",
  duration = 4000,
} = {}) {
  const stack = _ensureToastStack();
  const borderColor = type === "error" ? "#ef4444" : "#00C49A";
  const bg = type === "error" ? "#1a0a0a" : "#0a1a14";
  const item = document.createElement("div");
  item.style.cssText = `
    display:flex; align-items:flex-start; gap:11px;
    padding:13px 15px; background:${bg};
    border-radius:14px; border-left:3px solid ${borderColor};
    box-shadow:0 8px 32px rgba(0,0,0,0.6);
    pointer-events:all; cursor:pointer;
    font-family:inherit; color:#fff;
    transform:translateX(110%); opacity:0;
    transition:transform 0.38s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease;
  `;
  item.innerHTML = `
    <span style="font-size:1.25rem;line-height:1;flex-shrink:0;margin-top:1px;">${emoji}</span>
    <div style="display:flex;flex-direction:column;gap:2px;min-width:0;">
      <div style="font-size:0.85rem;font-weight:700;">${title}</div>
      ${msg ? `<div style="font-size:0.72rem;opacity:0.55;line-height:1.4;">${msg}</div>` : ""}
    </div>
    <span style="margin-left:auto;font-size:0.72rem;color:rgba(255,255,255,0.2);flex-shrink:0;padding:0 2px;">✕</span>
  `;
  item.addEventListener("click", () => _dismissToast(item));
  stack.appendChild(item);
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      item.style.transform = "translateX(0)";
      item.style.opacity = "1";
    }),
  );
  const timer = setTimeout(() => _dismissToast(item), duration);
  item._timer = timer;
}

function _dismissToast(item) {
  clearTimeout(item._timer);
  item.style.transform = "translateX(110%)";
  item.style.opacity = "0";
  item.addEventListener("transitionend", () => item.remove(), { once: true });
}

// ─── BADGE MODAL ──────────────────────────────────────────────────────────────

function _ensureBadgeModal() {
  if (document.getElementById("_roomBadgeModal")) return;
  const style = document.createElement("style");
  style.textContent = `
    #_roomBadgeModal {
      position:fixed; inset:0; background:rgba(0,0,0,0.85);
      display:none; align-items:center; justify-content:center;
      z-index:99999; backdrop-filter:blur(8px);
    }
    ._rbmBox {
      background:#0a1418; border:1px solid rgba(0,196,154,0.3);
      border-radius:28px; padding:40px 32px 32px;
      max-width:320px; width:90%; text-align:center;
      animation:_rbmPop 0.45s cubic-bezier(0.34,1.56,0.64,1);
      position:relative; overflow:hidden; font-family:inherit; color:#fff;
    }
    ._rbmBox::before {
      content:''; position:absolute; inset:0;
      background:radial-gradient(ellipse at 50% -10%, rgba(0,196,154,0.15) 0%, transparent 65%);
      pointer-events:none;
    }
    @keyframes _rbmPop {
      from { transform:scale(0.7) translateY(30px); opacity:0; }
      to   { transform:scale(1)   translateY(0);    opacity:1; }
    }
    ._rbmIcon {
      font-size:4rem; line-height:1; display:block; margin-bottom:12px;
      animation:_rbmBounce 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.15s both;
    }
    @keyframes _rbmBounce {
      from { transform:scale(0.4) rotate(-15deg); opacity:0; }
      to   { transform:scale(1)   rotate(0deg);   opacity:1; }
    }
    ._rbmEyebrow { font-size:0.6rem; font-weight:700; letter-spacing:0.15em; text-transform:uppercase; color:#00C49A; margin-bottom:14px; display:block; }
    ._rbmTitle   { font-size:1.25rem; font-weight:800; margin:0 0 6px; }
    ._rbmDesc    { font-size:0.82rem; color:rgba(255,255,255,0.45); margin:0 0 22px; line-height:1.5; }
    ._rbmClose   {
      width:100%; padding:11px; border-radius:12px;
      border:1px solid rgba(0,196,154,0.3); background:rgba(0,196,154,0.08);
      color:#00C49A; font-size:0.86rem; font-weight:600;
      cursor:pointer; font-family:inherit; transition:background 0.2s;
    }
    ._rbmClose:hover { background:rgba(0,196,154,0.16); }
    ._rbmSpark {
      position:fixed; width:6px; height:6px; border-radius:50%;
      pointer-events:none; z-index:999999;
      animation:_rbmSparkFly var(--dur) ease forwards;
    }
    @keyframes _rbmSparkFly {
      0%   { transform:translate(0,0) scale(1); opacity:1; }
      100% { transform:translate(var(--tx),var(--ty)) scale(0); opacity:0; }
    }
  `;
  document.head.appendChild(style);
  const modal = document.createElement("div");
  modal.id = "_roomBadgeModal";
  modal.innerHTML = `
    <div class="_rbmBox">
      <span class="_rbmEyebrow">✦ Badge unlocked</span>
      <span class="_rbmIcon"  id="_rbmIcon"></span>
      <p    class="_rbmTitle" id="_rbmTitle"></p>
      <p    class="_rbmDesc"  id="_rbmDesc"></p>
      <button class="_rbmClose" id="_rbmClose">Nice one!</button>
    </div>`;
  document.body.appendChild(modal);
  const close = () => {
    modal.style.display = "none";
  };
  document.getElementById("_rbmClose").addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });
}

function _showBadgeModal(badge) {
  _ensureBadgeModal();
  document.getElementById("_rbmIcon").textContent = badge.icon || "🏅";
  document.getElementById("_rbmTitle").textContent = badge.name || "New badge";
  document.getElementById("_rbmDesc").textContent = badge.description || "";
  document.getElementById("_roomBadgeModal").style.display = "flex";
  const cx = window.innerWidth / 2,
    cy = window.innerHeight / 2;
  const COLORS = ["#00C49A", "#7fffd4", "#ffd700", "#ff9f43", "#a29bfe"];
  for (let i = 0; i < 24; i++) {
    const s = document.createElement("div");
    s.className = "_rbmSpark";
    const angle = (360 / 24) * i + Math.random() * 10;
    const dist = 80 + Math.random() * 80;
    const rad = (angle * Math.PI) / 180;
    const dur = 0.55 + Math.random() * 0.35;
    s.style.cssText = `left:${cx}px;top:${cy}px;--tx:${Math.cos(rad) * dist}px;--ty:${Math.sin(rad) * dist}px;--dur:${dur}s;background:${COLORS[i % COLORS.length]};`;
    document.body.appendChild(s);
    s.addEventListener("animationend", () => s.remove());
  }
}

// ─── GAMIFICATION ON ROOM LOAD ────────────────────────────────────────────────
// Two-step:
//   1. pingStreak  — records today's visit, returns badges earned by that ping
//   2. checkTodaysBadges — catches badges awarded earlier today before this
//      session (e.g. the "joined" badge from registration). Uses sessionStorage
//      so the modal doesn't re-fire on every page refresh within the same session.

async function pingStreak(token) {
  try {
    const res = await fetch(
      "https://scriptorium-backend-six.vercel.app/api/streaks/ping",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `JWT ${token}`,
        },
      },
    );
    if (!res.ok) return [];
    const { streak, newBadges } = await res.json();

    const milestones = [3, 7, 14, 30, 100];
    if (streak?.current && milestones.includes(streak.current)) {
      const msgs = {
        3: "On a roll — keep going.",
        7: "One full week. Masha is impressed.",
        14: "Two weeks straight. The scarf grows.",
        30: "Masha's scarf is magnificent.",
        100: "Legendary.",
      };
      setTimeout(
        () =>
          showRoomToast({
            title: `🔥 ${streak.current}-day streak!`,
            msg: msgs[streak.current] || "",
            emoji: "🔥",
            duration: 4500,
          }),
        newBadges?.length ? 1200 : 0,
      );
    }

    return newBadges || [];
  } catch (err) {
    console.warn("Streak ping failed (non-fatal):", err.message);
    return [];
  }
}

async function checkTodaysBadges(token) {
  try {
    const res = await fetch(
      "https://scriptorium-backend-six.vercel.app/api/badges",
      {
        headers: { Authorization: `JWT ${token}` },
      },
    );
    if (!res.ok) return [];

    const { badges } = await res.json();

    // Key includes today's date — automatically "resets" at midnight
    const today = new Date().toISOString().slice(0, 10); // "2026-04-05"
    const shownKey = `_shownBadges_${today}`;
    const alreadyShown = new Set(
      JSON.parse(localStorage.getItem(shownKey) || "[]"),
    );

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const newToday = (badges || []).filter((b) => {
      if (alreadyShown.has(b.key)) return false;
      return new Date(b.earnedAt) >= todayStart;
    });

    newToday.forEach((b) => alreadyShown.add(b.key));
    localStorage.setItem(shownKey, JSON.stringify([...alreadyShown]));

    return newToday;
  } catch (err) {
    console.warn("Badge check failed (non-fatal):", err.message);
    return [];
  }
}

async function initGamification() {
  const token = localStorage.getItem("token");
  if (!token) return;

  const [pingBadges, todayBadges] = await Promise.all([
    pingStreak(token),
    checkTodaysBadges(token),
  ]);

  // Merge, deduplicate by key (pingStreak and checkTodaysBadges can overlap)
  const seen = new Set();
  const allNew = [...pingBadges, ...todayBadges].filter((b) => {
    if (seen.has(b.key)) return false;
    seen.add(b.key);
    return true;
  });

  if (!allNew.length) return;

  _showBadgeModal(allNew[0]);
  allNew.forEach((badge) =>
    showRoomToast({
      title: `${badge.icon || "🏅"} ${badge.name}`,
      msg: badge.description,
      emoji: badge.icon || "🏅",
      duration: 5000,
    }),
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a0f0a);

  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.getElementById("container3d").appendChild(renderer.domElement);

  // --- LIGHTING ---
  const ambientLight = new THREE.AmbientLight(0xffffff, 2.5);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0xffffff, 1.2);
  pointLight.position.set(0, 5, 0);
  scene.add(pointLight);

  // --- CONTROLS ---
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 0.1;
  controls.maxDistance = 50;
  controls.enablePan = false;

  // --- DRACO LOADER (fixes the compression error) ---
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(
    "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
  );

  // --- GLTF LOADER ---
  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);

  // --- LOAD MODEL FROM CLOUDINARY ---
  loader.load(
    "https://res.cloudinary.com/dtonhoq70/image/upload/v1775384112/main_room_i4ekxx.glb",
    (gltf) => {
      const model = gltf.scene;
      scene.add(model);

      registerClickableObjects(model);

      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      camera.position.set(center.x, center.y + 2, center.z + 10);
      controls.target.copy(center);
      controls.update();

      console.log("3D Room Initialized.");

      // Non-blocking — show badges/streak toasts after room is visible
      initGamification();
    },
    (progress) => {
      console.log(
        "Loading:",
        Math.round((progress.loaded / progress.total) * 100) + "%",
      );
    },
    (error) => {
      console.error("Load Error:", error);
    },
  );

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("click", onMouseClick);
  window.addEventListener("resize", onWindowResize);

  animate();
}

function onMouseMove(e) {
  getCanvasRelativeMouse(e);

  tooltip.style.left = e.clientX + 16 + "px";
  tooltip.style.top = e.clientY + "px";

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(clickableMeshes, false);
  const target = getHitTarget(intersects);

  if (target !== hoveredObject) {
    removeOutline();
    hoveredObject = null;
    document.body.style.cursor = "default";
    tooltip.style.opacity = "0";

    if (target) {
      hoveredObject = target;
      addOutline(target);
      document.body.style.cursor = "pointer";
      tooltip.textContent = target.userData.config.label;
      tooltip.style.opacity = "1";
    }
  }
}

function onMouseClick(e) {
  getCanvasRelativeMouse(e);

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(clickableMeshes, false);
  const target = getHitTarget(intersects);

  if (target?.userData.config?.url) {
    window.location.href = target.userData.config.url;
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  if (controls) controls.update();
  renderer.render(scene, camera);
}

init();
