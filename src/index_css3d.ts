import * as THREE from "three";
import {
  CSS3DRenderer,
  CSS3DObject,
} from "three/examples/jsm/renderers/CSS3DRenderer.js";
import * as TWEEN from "@tweenjs/tween.js";

import { publications, Publication } from "./crossref_parser";
//import { Publication } from "./crossref_parser";
//import publications from "./scientific_publications.json";

console.log(publications.length);

const logos: string[] = [];

for (let i = 1; i <= 10; i++) {
  logos.push("Artboard " + i + "a.png");
}

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const scene2 = new THREE.Scene();

camera.position.z = 5;

const renderer2 = new CSS3DRenderer();
renderer2.setSize(window.innerWidth, window.innerHeight);
renderer2.domElement.style.position = "absolute";
renderer2.domElement.style.top = "0";
document.body.appendChild(renderer2.domElement);

function makePaper(
  publication: Publication,
  position: THREE.Vector3,
  rotation: THREE.Euler
) {
  const element = document.createElement("div");
  element.classList.add("pub");
  element.classList.add("st" + Math.floor(Math.random() * 4));
  element.style.opacity = "0.75";
  element.innerHTML =
    "<img style='margin-top: 1em; width: 70px; float: right;' src='logos/" +
    logos[Math.floor(Math.random() * logos.length)] +
    "'><h3>" +
    "<h3>" +
    publication.title +
    "</h3><i>" +
    publication.authors.join(", ") +
    "</i><p>" +
    publication.abstract +
    "</p>";

  const object = new CSS3DObject(element);
  object.position.copy(position);
  object.rotation.copy(rotation);
  return object;
}

const objects: CSS3DObject[] = [];

function makeAndLaunchPaper(delay: number) {
  const publication =
    publications[Math.floor(Math.random() * publications.length)];
  const z = -40000;
  const y = z * Math.random() - 0.5 * z;
  const x = 2 * z * Math.random() - z;

  const object = makePaper(
    publication,
    new THREE.Vector3(x, y, z),
    new THREE.Euler(0, 0, 0)
  );

  new TWEEN.Tween(object.position)
    .to(
      new THREE.Vector3(
        Math.random() * 800 - 400,
        Math.random() * 500 - 250,
        300
      ),
      delay
    )
    .easing(TWEEN.Easing.Quadratic.In)
    .onComplete(() => {
      new TWEEN.Tween(object.element.style)
        .to({ opacity: "0" }, 20000)
        .easing(TWEEN.Easing.Quadratic.In)
        .onComplete(() => {
          scene2.remove(object);
        })
        .start();
    })
    .start();

  const rotation = new THREE.Euler(0, 0, 0);
  new TWEEN.Tween(rotation)
    .to(
      new THREE.Euler(
        0.5 * Math.PI * (Math.random() - 0.5),
        0.5 * Math.PI * (Math.random() - 0.5),
        Math.round(delay / 16000) *
          2 *
          Math.PI *
          Math.floor(10 * Math.random() - 5) +
          0.5 * Math.PI * (Math.random() - 0.5)
      ),
      delay
    )
    .onUpdate((rotation) => {
      object.rotation.copy(new THREE.Euler(rotation.x, rotation.y, rotation.z));
    })
    .easing(TWEEN.Easing.Linear.None)
    .start();

  scene2.add(object);
}

for (let i = 1; i < 999; i++) {
  makeAndLaunchPaper(Math.random() * 1000 * 6000);
}
/*
setInterval(() => {
  console.log("Adding paper");
  makeAndLaunchPaper(16000);
}, 6000);
*/
function animate(time: number) {
  requestAnimationFrame(animate);
  TWEEN.update(time);
  //  if (time % 500 < 250) {
  renderer2.render(scene2, camera);
  //  }
}
animate(0);
