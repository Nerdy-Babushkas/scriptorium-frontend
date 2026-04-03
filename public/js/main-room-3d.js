import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- INTERACTIVE OBJECTS CONFIG ---
// These should be the LEAF mesh names (the actual geometry, not parent groups)
const interactiveObjects = {
  'Music':     { url: '/music',   label: 'Music Room' },
  'Music.001': { url: '/music',   label: 'Music Room' },
  'Books':     { url: '/library', label: 'Library'    },
  'Screen':    { url: '/theatre', label: 'Theatre'    },
};

let scene, camera, renderer, controls;
let clickableMeshes = [];
let hoveredObject = null;
let outlineMesh = null; // the highlight outline we'll add/remove

// --- TOOLTIP ---
const tooltip = document.createElement('div');
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
// Tighten the raycaster — only detect hits very close to the ray center
raycaster.params.Mesh.threshold = 0;
const mouse = new THREE.Vector2();

// --- OUTLINE MATERIAL ---
const outlineMaterial = new THREE.MeshBasicMaterial({
  color: 0xf0c040,
  side: THREE.BackSide, // renders on the outside of the mesh
});

function addOutline(mesh) {
  removeOutline();
  outlineMesh = new THREE.Mesh(mesh.geometry, outlineMaterial);
  outlineMesh.scale.setScalar(1.07); // slightly bigger = outline effect
  outlineMesh.position.copy(mesh.position);
  outlineMesh.rotation.copy(mesh.rotation);
  outlineMesh.matrixAutoUpdate = true;

  // Add as sibling (same parent) so transforms match
  if (mesh.parent) {
    mesh.parent.add(outlineMesh);
    outlineMesh.applyMatrix4(mesh.matrixWorld);
    outlineMesh.matrix.premultiply(mesh.parent.matrixWorld.clone().invert());
    outlineMesh.matrix.decompose(outlineMesh.position, outlineMesh.quaternion, outlineMesh.scale);
    // Scale up slightly for outline
    outlineMesh.scale.multiplyScalar(1.07);
  } else {
    scene.add(outlineMesh);
  }
}

function removeOutline() {
  if (outlineMesh) {
    outlineMesh.parent?.remove(outlineMesh);
    outlineMesh.geometry = null; // don't dispose shared geometry
    outlineMesh = null;
  }
}

function registerClickableObjects(model) {
  model.traverse((child) => {
    if (child.isMesh) {
      console.log('Mesh:', child.name);
      const config = interactiveObjects[child.name];
      if (config) {
        child.userData.config = config;
        clickableMeshes.push(child);
        console.log(`  ✓ Registered as clickable: "${child.name}" → ${config.url}`);
      }
    }
  });
  console.log(`Total clickable meshes: ${clickableMeshes.length}`);
}

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a0f0a);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.getElementById('container3d').appendChild(renderer.domElement);

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
  controls.maxDistance = 15;
  controls.enablePan = false;

  // --- LOAD MODEL ---
  const loader = new GLTFLoader();
  loader.load('/assets/models/main_room.glb', (gltf) => {
    const model = gltf.scene;
    scene.add(model);

    registerClickableObjects(model);

    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    camera.position.set(center.x, center.y + 1.5, center.z + 4);
    controls.target.copy(center);
    controls.update();

    console.log('3D Room Initialized.');
  }, undefined, (error) => {
    console.error('Load Error:', error);
  });

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('click', onMouseClick);
  window.addEventListener('resize', onWindowResize);

  animate();
}

function getHitTarget(intersects) {
  // From the ray hits, find the first one that has a config registered
  for (const intersect of intersects) {
    let obj = intersect.object;
    // Walk up the tree in case we hit a child of a registered mesh
    while (obj) {
      if (obj.userData.config) return obj;
      obj = obj.parent;
    }
  }
  return null;
}

function onMouseMove(e) {
  mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  tooltip.style.left = e.clientX + 16 + 'px';
  tooltip.style.top  = e.clientY + 'px';

  raycaster.setFromCamera(mouse, camera);

  // Only test against registered clickable meshes for precision
  const intersects = raycaster.intersectObjects(clickableMeshes, false); // false = no deep children

  const target = getHitTarget(intersects);

  if (target !== hoveredObject) {
    // Clear old hover
    removeOutline();
    hoveredObject = null;
    document.body.style.cursor = 'default';
    tooltip.style.opacity = '0';

    // Apply new hover
    if (target) {
      hoveredObject = target;
      addOutline(target);
      document.body.style.cursor = 'pointer';
      tooltip.textContent = target.userData.config.label;
      tooltip.style.opacity = '1';
    }
  }
}

function onMouseClick(e) {
  mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

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