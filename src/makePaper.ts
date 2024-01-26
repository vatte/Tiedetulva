import { publications, Publication } from "./crossref_parser";
import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";

import { drawPaperToCanvas } from "./drawPaperToCanvas";

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

  //import the bump map from the same texture but with inverted values
  const bumpMap = texture.clone();
  bumpMap.matrix.multiplyScalar(-1);
  bumpMap.needsUpdate = true;
  const material = new THREE.MeshPhongMaterial({
    map: texture,
    specular: 0x666666,
    shininess: 20,
    bumpMap,
    bumpScale: 5,
    transparent: true,
  });
  /*
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    metalness: 0.5,
    roughness: 0.8,
    bumpMap,
    bumpScale: 0.5,
  });*/

  //create the material
  /*  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
  });*/

  //create the mesh
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.297), material);
  mesh.scale.set(1, 1, 1);
  mesh.position.copy(position);
  mesh.rotation.copy(rotation);

  //mesh.castShadow = true;
  //mesh.receiveShadow = true;

  return mesh;
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
    .to(object.position.multiplyScalar(0.5), delay)
    .onComplete(() => {
      new TWEEN.Tween(object.position)
        .to(
          new THREE.Vector3().copy(targetPosition).multiplyScalar(0.3),
          fallTime
        )
        .easing(TWEEN.Easing.Sinusoidal.Out)
        .onComplete(() => {
          //object.receiveShadow = false;
          console.log("------------------------------------");
          console.log("TITLE:\t\t" + publication.title);
          console.log("AUTHORS:\t" + publication.authors.join(", "));
          if (publication.journal) {
            console.log("JOURNAL:\t" + publication.journal);
          }
          console.log("DOI:\t\thttps://doi.org/" + publication.doi);

          setTimeout(() => {
            new TWEEN.Tween(object.position)
              .to(
                new THREE.Vector3().copy(finalPosition).multiplyScalar(0.3),
                15000 + 10000 * Math.random()
              )
              .easing(TWEEN.Easing.Sinusoidal.In)
              .start();
          }, 200);

          new TWEEN.Tween(object.material)
            .to({ opacity: 0 }, 20000)
            .easing(TWEEN.Easing.Quadratic.In)
            .onComplete(() => {
              scene.remove(object);
              onRemoveCallback();
            })
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
