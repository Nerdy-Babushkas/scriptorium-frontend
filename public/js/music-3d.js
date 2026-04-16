import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const interactiveObjects = {
  'listening': { action: 'shelf', key: 'listening', label: '🎧 Currently Listening' },
  'favorites': { action: 'shelf', key: 'favorites', label: '⭐ My Favorites'         },
  'finished':  { action: 'shelf', key: 'finished',  label: '✅ Finished Albums'      },
};

let scene, camera, renderer, controls;
let clickableMeshes = [];
let hoveredObject = null;
let outlineMesh = null;

const tooltip = document.createElement('div');
tooltip.style.cssText = `
  position: fixed;
  background: rgba(5, 10, 26, 0.92);
  color: #f5e6c8;
  padding: 8px 16px;
  border-radius: 6px;
  font-family: serif;
  font-size: 15px;
  pointer-events: none;
  border: 1px solid #ec4899;
  opacity: 0;
  transition: opacity 0.15s;
  z-index: 49;
  letter-spacing: 0.03em;
`;
document.body.appendChild(tooltip);

const raycaster = new THREE.Raycaster();
raycaster.params.Mesh.threshold = 0;
const mouse = new THREE.Vector2();

const outlineMaterial = new THREE.MeshBasicMaterial({
  color: 0xec4899,
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
    outlineMesh.matrix.decompose(outlineMesh.position, outlineMesh.quaternion, outlineMesh.scale);
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

function isModalOpen() {
  return !document.getElementById('shelfViewModal').classList.contains('hidden');
}

function hideTooltip() {
  tooltip.style.opacity = '0';
  removeOutline();
  hoveredObject = null;
  document.body.style.cursor = 'default';
}

function registerClickableObjects(model) {
  model.traverse((node) => {
    const config = interactiveObjects[node.name];
    if (config) {
      node.traverse((child) => {
        if (child.isMesh) {
          child.userData.config = config;
          clickableMeshes.push(child);
          console.log(`✓ Registered child of "${node.name}": ${child.name}`);
        }
      });
    }
  });
  console.log(`Total clickable meshes: ${clickableMeshes.length}`);
}

function getCanvasRelativeMouse(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
  mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
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

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050a1a);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.getElementById('container3d').appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 2.5);
  scene.add(ambientLight);
  const pointLight = new THREE.PointLight(0xffffff, 1.2);
  pointLight.position.set(0, 5, 0);
  scene.add(pointLight);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 0.3;
  controls.maxDistance = 70;
  controls.enablePan = true;

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);

  loader.load(
    'https://res.cloudinary.com/dtonhoq70/image/upload/v1775456651/music_dkyflq.glb',
    (gltf) => {
      const model = gltf.scene;
      scene.add(model);

      registerClickableObjects(model);

      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      camera.position.set(13.65, -67.92, 38.86);
      controls.target.set(-18.39, -71.89, 0.68);
      controls.update();

      console.log('Music 3D Initialized.');
    },
    (progress) => {
      if (progress.total > 0) console.log('Loading:', Math.round(progress.loaded / progress.total * 100) + '%');
    },
    (error) => console.error('Load Error:', error)
  );

  const modal = document.getElementById('shelfViewModal');
  const observer = new MutationObserver(() => {
    if (isModalOpen()) hideTooltip();
  });
  observer.observe(modal, { attributes: true, attributeFilter: ['class'] });

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('click', onMouseClick);
  window.addEventListener('resize', onWindowResize);

  animate();
}

function onMouseMove(e) {
  if (isModalOpen()) return;

  getCanvasRelativeMouse(e);
  tooltip.style.left = e.clientX + 16 + 'px';
  tooltip.style.top  = e.clientY + 'px';

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(clickableMeshes, true);
  const target = getHitTarget(intersects);

  if (target !== hoveredObject) {
    removeOutline();
    hoveredObject = null;
    document.body.style.cursor = 'default';
    tooltip.style.opacity = '0';

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
  if (isModalOpen()) return;

  getCanvasRelativeMouse(e);
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(clickableMeshes, true);
  const target = getHitTarget(intersects);

  if (target?.userData.config?.action === 'shelf') {
    openShelf(target.userData.config.key, target.userData.config.label);
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