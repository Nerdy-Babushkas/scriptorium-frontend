import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer, controls;

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

        // INITIAL CAMERA ANGLE (Centering Logic)
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        
        // Position camera inside the room at your preferred angle
        camera.position.set(center.x, center.y + 1.5, center.z + 4); 
        
        controls.target.copy(center);
        controls.update();

        console.log("3D Room Environment Initialized.");
    }, undefined, (error) => {
        console.error("3D Model Load Error:", error);
    });

    animate();
}

function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    renderer.render(scene, camera);
}

// Initial Launch
init();

// Responsive Resize Handling
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});