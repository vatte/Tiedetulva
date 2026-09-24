import { getPublications, Publication } from "./crossref_parser";
import * as THREE from "three";

import { drawPaperToCanvas, PaperStyle } from "./drawPaperToCanvas";
import { materialFromTexture } from "./shader";
import { OCEAN, PAPER, SPLASH, WAVES } from "./params";

let publications = getPublications();

export const updatePublications = (raw_data: JSON) => {
  publications = getPublications(raw_data);
};

export const randomPublication = () =>
  publications[Math.floor(Math.random() * publications.length)];

export type PaperMesh = THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

//subdivided so that the paper can bend with the waves
const paperGeometry = new THREE.PlaneGeometry(
  PAPER.WIDTH,
  PAPER.HEIGHT,
  WAVES.SEGMENTS_X,
  WAVES.SEGMENTS_Y
);

//finer, for the one paper at a time that curls and ripples in a splash
const splashGeometry = new THREE.PlaneGeometry(
  PAPER.WIDTH,
  PAPER.HEIGHT,
  SPLASH.SEGMENTS_X,
  SPLASH.SEGMENTS_Y
);

export const setSplashing = (mesh: PaperMesh, splashing: boolean) => {
  mesh.geometry = splashing ? splashGeometry : paperGeometry;
};

//draw the publication to a texture
export const makePaperTexture = (
  publication: Publication,
  style?: PaperStyle
) => {
  const texture = new THREE.CanvasTexture(drawPaperToCanvas(publication, style));
  texture.anisotropy = OCEAN.ANISOTROPY;
  return texture;
};

//make the textured 3d surface of the paper
export const makePaperMesh = (texture: THREE.Texture): PaperMesh =>
  new THREE.Mesh(paperGeometry, materialFromTexture(texture));

export const printPaperInfo = (publication: Publication) => {
  console.log("------------------------------------");
  console.log("TITLE:\t\t" + publication.title);
  console.log("AUTHORS:\t" + publication.authors.join(", "));
  if (publication.journal) {
    console.log("JOURNAL:\t" + publication.journal);
  }
  console.log("DOI:\t\thttps://doi.org/" + publication.doi);
};
