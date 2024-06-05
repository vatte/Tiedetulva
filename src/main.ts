import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as TWEEN from "@tweenjs/tween.js";

import { createRectangleSurface, createSurface } from "./surfaces";
import { makeAndLaunchPaper } from "./makePaper";
import { makeRandomNote } from "./midi-client";
import { playNote } from "./audio";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(90, 16 / 9, 0.1, 1000);
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
    scene.background = new THREE.Color(0x000000);
  } else if (event.key == "g") {
    scene.background = new THREE.Color(0x00ff00);
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

function animate(time: number) {
  requestAnimationFrame(animate);
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

function launchPaper() {
  const delayTime = Math.random() * 300 * 6000;
  const fallTime = (12 + Math.random() * 20) * 1000;

  const angle = 0.4 * Math.PI + 1.2 * Math.random() * Math.PI;
  const z = 40 * Math.cos(angle);
  const x = 40 * Math.sin(angle);
  const y = 80 * Math.random() - 40;

  const startPosition = new THREE.Vector3(x, y, z);

  const target = renderTargets[0].object;
  // Get the dimensions of the rectangle
  const geometry = target.geometry;

  const dimensions = new THREE.Vector3(3, 1.5, 2);

  if (geometry.boundingBox !== null) {
    geometry.boundingBox.getSize(dimensions);
  }

  // Generate two random numbers between -0.5 and 0.5
  const u = Math.random() - 0.5;
  const v = Math.random() - 0.5;

  // Scale and translate the random numbers to get a position on the rectangle
  const targetPosition = new THREE.Vector3(
    u * dimensions.x,
    v * dimensions.y,
    target.position.z
  );

  /*
  const finalPosition = targetPosition
    .clone()
    .add(travelVector)
    .add(travelVector.normalize());
  */
  const finalPosition = new THREE.Vector3(0, 0, 0);

  const targetRotation = target.rotation;

  makeAndLaunchPaper(
    renderTargetScene,
    startPosition,
    targetPosition,
    finalPosition,
    targetRotation,
    delayTime,
    fallTime,
    launchPaper
  );

  //create a midi message after delayTime has passed
  setTimeout(() => {
    //makeRandomNote(fallTime);
    playNote(fallTime, 3500);
  }, delayTime);
}

export function startShow() {
  document
    .getElementById("renderer-container")
    ?.appendChild(renderer.domElement);

  for (let i = 1; i < 200; i++) {
    launchPaper();
  }
  animate(0);
}

export function restartShow() {
  //remove all children from the render target scene
  while (renderTargetScene.children.length > 0) {
    renderTargetScene.remove(renderTargetScene.children[0]);
  }

  for (let i = 1; i < 200; i++) {
    launchPaper();
  }
}
