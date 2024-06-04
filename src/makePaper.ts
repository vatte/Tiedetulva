import { getPublications, Publication } from "./crossref_parser";
import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";

import { drawPaperToCanvas } from "./drawPaperToCanvas";
import { materialFromTexture } from "./shader";

let publications = getPublications();

export const updatePublications = (raw_data: JSON) => {
  publications = getPublications(raw_data);
};

//make the textured 3d surface of the paper
const makePaper = (
  publication: Publication,
  position: THREE.Vector3,
  rotation: THREE.Euler
) => {
  const canvas = drawPaperToCanvas(publication);

  //draw the canvas to a texture
  const texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;
  //create the material
  const material = materialFromTexture(texture);

  //create the mesh
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.297), material);
  mesh.scale.set(1, 1, 1);
  mesh.position.copy(position);
  mesh.rotation.copy(rotation);

  return mesh;
};

const printPaperInfo = (publication: Publication) => {
  console.log("------------------------------------");
  console.log("TITLE:\t\t" + publication.title);
  console.log("AUTHORS:\t" + publication.authors.join(", "));
  if (publication.journal) {
    console.log("JOURNAL:\t" + publication.journal);
  }
  console.log("DOI:\t\thttps://doi.org/" + publication.doi);
};

//make a randomized paper and launch it
export const makeAndLaunchPaper = (
  scene: THREE.Scene,
  startPosition: THREE.Vector3,
  targetPosition: THREE.Vector3,
  finalPosition: THREE.Vector3,
  targetRotation: THREE.Euler,
  delay: number,
  fallTime: number,
  onRemoveCallback: () => void
) => {
  const publication =
    publications[Math.floor(Math.random() * publications.length)];

  const object = makePaper(
    publication,
    startPosition,
    new THREE.Euler(0, 0, 0)
  );

  if (object == null) return;

  new TWEEN.Tween(object.position)
    .to(object.position.multiplyScalar(0.5), delay) //during delay time, the object will pass half of it's distance to 0,0,0
    .onComplete(() => {
      new TWEEN.Tween(object.position)
        .to(
          new THREE.Vector3().copy(targetPosition).multiplyScalar(0.3),
          fallTime
        )
        .easing(TWEEN.Easing.Quadratic.Out)
        .onComplete(() => {
          printPaperInfo(publication);

          const fallTime = 15000 + 10000 * Math.random();
          const groundTime = 20000;
          const invertTime = 4000;

          setTimeout(() => {
            new TWEEN.Tween(object.position)
              .to(new THREE.Vector3().copy(finalPosition), fallTime)
              .onComplete(() => {
                scene.remove(object);
                onRemoveCallback();
              })
              .easing(TWEEN.Easing.Sinusoidal.InOut)
              .start();
          }, 200);
          new TWEEN.Tween(object.material.uniforms.invert)
            .to({ value: 1 }, invertTime * 2)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .start();
          new TWEEN.Tween(object.material.uniforms.opacity)
            .to({ value: 0 }, invertTime)
            .onComplete(() => {
              new TWEEN.Tween(object.material.uniforms.text_opacity)
                .to({ value: 0 }, groundTime - invertTime)
                .easing(TWEEN.Easing.Circular.In)
                .start();
            })
            .easing(TWEEN.Easing.Quadratic.In)
            .start();
        })
        .start();
    })
    .start();

  const rotation = new THREE.Euler(
    0 /*0.5 * Math.PI * (Math.random() - 0.5)*/,
    0 /*0.5 * Math.PI * (Math.random() - 0.5)*/,
    Math.round(delay / 16000) *
      2 *
      Math.PI *
      Math.floor(10 * Math.random() - 5) +
      0.5 * Math.PI * (Math.random() - 0.5)
  );

  new TWEEN.Tween(rotation)
    .to(targetRotation, delay + fallTime + 10000)
    .onUpdate((rotation) => {
      object.rotation.copy(new THREE.Euler(rotation.x, rotation.y, rotation.z));
    })
    .easing(TWEEN.Easing.Quadratic.Out)
    .start();

  scene.add(object);
};
