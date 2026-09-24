import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as TWEEN from "@tweenjs/tween.js";

import { createRectangleSurface } from "./surfaces";
import { Ocean } from "./ocean";
import { waveTime } from "./shader";
import { SCENE } from "./params";

const scene = new THREE.Scene();
scene.background = new THREE.Color(SCENE.BACKGROUND_COLOR);

const camera = new THREE.PerspectiveCamera(84, 16 / 9, 0.1, 1000);
camera.position.z = 0;
camera.position.y = 0;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, (9 * window.innerWidth) / 16);

// Add event listener for window resize
window.addEventListener("resize", () => {
  // Update renderer size
  renderer.setSize(window.innerWidth, (9 * window.innerWidth) / 16);
});

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, -1);
controls.enabled = false;

//listen to key presses
// b = black background
// g = green background
// c = log camera position
document.addEventListener("keydown", (event) => {
  if (event.key == "b") {
    scene.background = new THREE.Color(SCENE.BACKGROUND_COLOR);
  } else if (event.key == "g") {
    scene.background = new THREE.Color(SCENE.CHROMA_KEY_COLOR);
  } else if (event.key == "c") {
    console.log(camera.position);
  }
});

//create a scene for the render targets
const renderTargetScene = new THREE.Scene();

//create the surfaces for the projection mapping

//create a 16:9 aspect ratio surface

const renderTargets = [
  createRectangleSurface(scene, renderTargetScene, new THREE.Vector3(0, 0, -1)),
];

const ocean = new Ocean(renderTargetScene);

let previousTime: number | null = null;

function animate(time: number) {
  requestAnimationFrame(animate);
  // limit the step so that the ocean doesn't jump after the tab has been hidden
  const dt =
    previousTime === null ? 0 : Math.min((time - previousTime) / 1000, 0.1);
  previousTime = time;
  waveTime.value = time / 1000;
  ocean.update(dt);
  TWEEN.update(time);
  controls.update();

  for (const renderTarget of renderTargets) {
    renderer.setRenderTarget(renderTarget.target);
    renderer.clear();
    renderer.render(renderTargetScene, renderTarget.camera);
  }

  renderer.setRenderTarget(null);
  renderer.render(scene, camera);
}

export function startShow() {
  document
    .getElementById("renderer-container")
    ?.appendChild(renderer.domElement);

  ocean.start();
  requestAnimationFrame(animate);
}

export function restartShow() {
  ocean.start();
}
