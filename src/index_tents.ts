import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as TWEEN from "@tweenjs/tween.js";

import { runWhenLogosLoaded } from "./logos";
import { createSurface } from "./surfaces";
import { makeAndLaunchPaper } from "./makePaper";
import { makeRandomNote } from "./midi-client";
import { interpolatedPointOnVertex } from "./helpers";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  40,
  (1.32 * window.innerWidth) / window.innerHeight,
  0.1,
  1000
);
camera.position.z = -4;
camera.position.y = 1;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.2, 0);

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
const renderTargets = [
  createSurface(
    scene,
    renderTargetScene,
    new THREE.Vector3(-1.17, -0.1, -0.55),
    true
  ),
  createSurface(scene, renderTargetScene, new THREE.Vector3(0, 0, -1)),
  createSurface(
    scene,
    renderTargetScene,
    new THREE.Vector3(1.19, -0.1, -0.55),
    true
  ),
];

renderTargets[0].object.rotateOnWorldAxis(
  new THREE.Vector3(Math.sqrt(2) / 2, 1, 0),
  Math.PI * 0.22
);

renderTargets[2].object.rotateOnWorldAxis(
  new THREE.Vector3(-Math.sqrt(2) / 2, 1, 0),
  -Math.PI * 0.21
);

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
  const delayTime = Math.random() * 450 * 6000;
  const fallTime = (12 + Math.random() * 20) * 1000;

  const angle = 0.4 * Math.PI + 1.2 * Math.random() * Math.PI;
  const z = 40 * Math.cos(angle);
  const x = 40 * Math.sin(angle);
  const y = 80 * Math.random() - 40;

  const startPosition = new THREE.Vector3(x, y, z);

  const distances = [
    startPosition.distanceTo(renderTargets[0].object.position),
    startPosition.distanceTo(renderTargets[1].object.position),
    startPosition.distanceTo(renderTargets[2].object.position),
  ];

  const furthestTarget = distances.indexOf(Math.max(...distances));

  const indexes = [0, 1, 2];
  indexes.splice(furthestTarget, 1);

  const target = indexes[Math.floor(Math.random() * 2)];

  const t = renderTargets[target].object.clone();

  const vertices = t.geometry.attributes.position.array;

  // Choose three vertices to form a triangle
  const v1 = t.localToWorld(
    new THREE.Vector3(vertices[0], vertices[1], vertices[2])
  );
  const v2 = t.localToWorld(
    new THREE.Vector3(vertices[3], vertices[4], vertices[5])
  );
  const v3 = t.localToWorld(
    new THREE.Vector3(vertices[6], vertices[7], vertices[8])
  );

  //generate three random numbers

  let r1 = 0.2 + Math.random();
  let r2 = 0.2 + Math.random();
  let r3 = 0.2 + Math.random();

  //get weighted point
  const randomPoint = interpolatedPointOnVertex(v1, v2, v3, r1, r2, r3);
  const targetPosition = randomPoint; //renderTargets[target].object.position.clone();

  //determine exit position based on target
  switch (target) {
    case 0:
      r1 = 1;
      r2 = 0;
      r3 = 1;
      break;
    case 1:
      r1 = 1;
      r2 = 0;
      r3 = 1;
      break;
    case 2:
      r1 = 0;
      r2 = 1;
      r3 = 1;
      break;
  }
  //find the closest position on the line between the two vertices

  const middle = interpolatedPointOnVertex(v1, v2, v3, 1, 1, 1);

  const travelVector = interpolatedPointOnVertex(v1, v2, v3, r1, r2, r3)
    .sub(middle)
    .multiplyScalar(3);

  /*
  const finalPosition = targetPosition
    .clone()
    .add(travelVector)
    .add(travelVector.normalize());
  */
  const finalPosition = new THREE.Vector3(0, 0, 0);

  if (target == 0 || target == 2) {
    t.lookAt(new THREE.Vector3(0, 0, 0));
  }
  const targetRotation = t.rotation;

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
    makeRandomNote(fallTime);
  }, delayTime);
}

function init() {
  for (let i = 1; i < 299; i++) {
    launchPaper();
  }
  animate(0);
}

runWhenLogosLoaded(init);
