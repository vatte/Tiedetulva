// An ocean surface made of papers floating face down with the title towards the viewer,
// flowing slowly towards the viewer. The surface converges on a break point in front of the
// viewer, where the papers arrive one at a time. Each arriving paper breaks like a tsunami:
// it lifts up on a curling wave and crashes down upright close to the viewer so it can be
// read, then drifts towards the viewer while ripples wash over it and it fades out.

import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";

import { Publication } from "./crossref_parser";
import {
  makePaperMesh,
  makePaperTexture,
  PaperMesh,
  printPaperInfo,
  randomPublication,
  setSplashing,
} from "./makePaper";
import { PaperStyle, randomPaperStyle } from "./drawPaperToCanvas";
import { playWaveSound } from "./audio";
import { CAMERA, OCEAN, SPLASH, WASH } from "./params";

const DEG = Math.PI / 180;
const X_AXIS = new THREE.Vector3(1, 0, 0);
const GOLDEN_RATIO_CONJUGATE = (Math.sqrt(5) - 1) / 2;

const SPREAD = OCEAN.SPREAD * DEG;
const AREA_PER_PAPER = OCEAN.PAPER_SPACING * OCEAN.PAPER_SPACING;

// The papers are ordered by arrival. A paper that is `place` papers away from arriving
// lies at this distance from the break point, which keeps the density of the fan even.
const radiusAt = (place: number) =>
  Math.sqrt(
    SPLASH.BREAK_RADIUS * SPLASH.BREAK_RADIUS +
      (2 * AREA_PER_PAPER * Math.max(place, 0)) / SPREAD
  );

interface PoolTexture {
  texture: THREE.Texture;
  style: PaperStyle;
}

interface Paper {
  mesh: PaperMesh;
  index: number; // arrival order
  angle: number; // direction from which the paper flows to the break point, 0 = straight ahead
  offsetX: number;
  offsetZ: number;
  style: PaperStyle;
  // set when the paper is next in line and has been given its own texture
  publication: Publication | null;
  // running animations of a splashed paper, stopped when the paper is reused
  tweens: TWEEN.Tween<any>[];
}

// half of the visible width of the view at the given distance
const viewHalfWidth = (distance: number) =>
  distance * Math.tan((CAMERA.FOV * DEG) / 2) * CAMERA.ASPECT;

const jitter = (amount: number) => (Math.random() * 2 - 1) * amount;

const randomInterval = () =>
  (SPLASH.MIN_INTERVAL + Math.random() * SPLASH.RANDOM_INTERVAL) / 1000;

export class Ocean {
  private group = new THREE.Group();
  private surfacePapers: Paper[] = []; // in order of arrival
  private freePapers: Paper[] = [];
  private texturePool: PoolTexture[] = [];
  // number of papers that have arrived, grows continuously so that the surface flows smoothly
  private flow = 0;
  private interval = 1; // seconds until the next arrival
  private nextIndex = 1;
  private angleSeed = 0;

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
  }

  // (re)start with a full ocean, e.g. after the publications have changed
  start() {
    this.clear();

    for (let i = 0; i < OCEAN.TEXTURE_POOL_SIZE; i++) {
      const style = randomPaperStyle();
      this.texturePool.push({
        texture: makePaperTexture(randomPublication(), style),
        style,
      });
    }

    this.flow = 0;
    this.interval = SPLASH.FIRST_DELAY / 1000;
    this.nextIndex = 1;
    this.angleSeed = Math.random();
    this.update(0);
  }

  // dt in seconds
  update(dt: number) {
    const arrived = Math.floor(this.flow);
    this.flow += dt / this.interval;
    if (Math.floor(this.flow) > arrived) this.interval = randomInterval();

    while (
      this.surfacePapers.length > 0 &&
      this.surfacePapers[0].index <= this.flow
    ) {
      this.splash(this.surfacePapers.shift()!);
    }

    for (const paper of this.surfacePapers) {
      const place = paper.index - this.flow;
      if (paper.publication === null && place <= OCEAN.OWN_TEXTURE_AHEAD) {
        this.giveOwnTexture(paper);
      }
      this.placeOnSurface(paper, place);
    }

    while (radiusAt(this.nextIndex - this.flow) <= OCEAN.FAR_DISTANCE) {
      this.spawn(this.nextIndex++);
    }
  }

  private placeOnSurface(paper: Paper, place: number) {
    const radius = radiusAt(place);
    // no jitter close to the break point, so that papers arrive exactly there
    const jitterScale = THREE.MathUtils.clamp(
      (radius - SPLASH.BREAK_RADIUS) / 0.5,
      0,
      1
    );
    paper.mesh.position.set(
      radius * Math.sin(paper.angle) + paper.offsetX * jitterScale,
      OCEAN.WATER_LEVEL,
      -SPLASH.BREAK_DISTANCE -
        radius * Math.cos(paper.angle) +
        paper.offsetZ * jitterScale
    );
  }

  private spawn(index: number) {
    // spread the directions evenly, so that consecutive papers come from different sides
    const angle =
      (((index * GOLDEN_RATIO_CONJUGATE + this.angleSeed) % 1) - 0.5) * SPREAD;
    const pooled =
      this.texturePool[Math.floor(Math.random() * this.texturePool.length)];

    let paper = this.freePapers.pop();
    if (paper === undefined) {
      paper = {
        mesh: makePaperMesh(pooled.texture),
        index,
        angle,
        offsetX: 0,
        offsetZ: 0,
        style: pooled.style,
        publication: null,
        tweens: [],
      };
    }
    paper.index = index;
    paper.angle = angle;
    paper.offsetX = jitter(OCEAN.POSITION_JITTER);
    paper.offsetZ = jitter(OCEAN.POSITION_JITTER);
    paper.style = pooled.style;
    paper.publication = null;

    const { mesh } = paper;
    const uniforms = mesh.material.uniforms;
    uniforms.uTexture.value = pooled.texture;
    uniforms.backColor.value.set(pooled.style.color);
    uniforms.ripple.value = 1;
    uniforms.curl.value = 0;
    uniforms.wash.value = 0;
    uniforms.invert.value = 0;
    uniforms.opacity.value = 1;
    uniforms.text_opacity.value = 1;

    // lying flat, face down, top of the page pointing towards the viewer
    mesh.rotation.set(Math.PI / 2, 0, jitter(OCEAN.YAW_JITTER * DEG));
    this.placeOnSurface(paper, index - this.flow);

    this.group.add(mesh);
    this.surfacePapers.push(paper);
  }

  // distant papers share textures, the ones about to be read get a publication of their own
  private giveOwnTexture(paper: Paper) {
    paper.publication = randomPublication();
    paper.mesh.material.uniforms.uTexture.value = makePaperTexture(
      paper.publication,
      paper.style
    );
  }

  private splash(paper: Paper) {
    const { mesh, tweens } = paper;
    const uniforms = mesh.material.uniforms;

    if (paper.publication === null) this.giveOwnTexture(paper);
    printPaperInfo(paper.publication!);

    setSplashing(mesh, true);

    // the paper ends up upright, on the side it came from
    const readPosition = new THREE.Vector3(
      SPLASH.READ_X_RANGE * (paper.angle / (SPREAD / 2)),
      SPLASH.READ_HEIGHT,
      -SPLASH.READ_DISTANCE
    );
    const upright = new THREE.Object3D();
    upright.position.copy(readPosition);
    upright.lookAt(0, 0, 0);
    const readRotation = upright.quaternion;
    // tilted forward by `tilt` from upright: +90 degrees = face down with the top of the page
    // towards the viewer, as the papers float on the surface
    const tiltedRotation = (tilt: number) =>
      readRotation
        .clone()
        .multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, tilt));
    // the small difference between the paper's rotation on the surface and face down in the
    // reading direction, straightened out while rising
    const surfaceOffset = mesh.quaternion
      .clone()
      .multiply(tiltedRotation(Math.PI / 2).invert());
    const noOffset = new THREE.Quaternion();

    const readHalfWidth = viewHalfWidth(SPLASH.READ_DISTANCE);
    playWaveSound(
      THREE.MathUtils.clamp(readPosition.x / readHalfWidth, -1, 1)
    );

    // a towering wave lifts the paper with its top rolled back behind it, then the paper
    // unrolls from the front towards the viewer as it crashes down upright close in front of the viewer
    const surfacePosition = mesh.position.clone();
    const risePath = new THREE.CubicBezierCurve3(
      surfacePosition,
      new THREE.Vector3(surfacePosition.x, SPLASH.CREST_HEIGHT, surfacePosition.z),
      new THREE.Vector3(readPosition.x, SPLASH.CREST_HEIGHT, readPosition.z),
      readPosition
    );
    // negative: the top rolls back, away from the printed side
    const maxCurl = -SPLASH.CURL * DEG;
    let crashed = false;
    const rise = new TWEEN.Tween({ value: 0 })
      .to({ value: 1 }, SPLASH.RISE_DURATION)
      .onUpdate(({ value: p }) => {
        risePath.getPoint(TWEEN.Easing.Sinusoidal.InOut(p), mesh.position);
        // leans towards the viewer at the crest, upright when it lands
        const tilt = Math.PI / 2 - (Math.PI / 2) * TWEEN.Easing.Quadratic.Out(p);
        mesh.quaternion
          .slerpQuaternions(
            surfaceOffset,
            noOffset,
            TWEEN.Easing.Quadratic.Out(p)
          )
          .multiply(tiltedRotation(tilt));
        uniforms.ripple.value = 1 - p;
        if (p < SPLASH.CRASH_AT) {
          uniforms.curl.value =
            maxCurl * Math.sin((Math.PI / 2) * (p / SPLASH.CRASH_AT));
        } else {
          // the crest opens up with a flap or two
          const u = (p - SPLASH.CRASH_AT) / (1 - SPLASH.CRASH_AT);
          uniforms.curl.value =
            maxCurl * (1 - u) ** 2 * Math.cos(2.5 * Math.PI * u);
          if (!crashed) {
            crashed = true;
            this.startWash(paper);
          }
        }
      })
      .onComplete(() => {
        const { x, y, z } = SPLASH.FINAL_POSITION;
        const drift = new TWEEN.Tween(mesh.position)
          .to(
            { x, y, z },
            SPLASH.DRIFT_DURATION + Math.random() * SPLASH.DRIFT_DURATION_RANDOM
          )
          .delay(SPLASH.DRIFT_DELAY)
          .easing(TWEEN.Easing.Sinusoidal.InOut)
          .onComplete(() => this.release(paper))
          .start();
        tweens.push(drift);
      })
      .start();

    const invert = new TWEEN.Tween(uniforms.invert)
      .to({ value: 1 }, SPLASH.INVERT_DURATION)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start();
    const backgroundFade = new TWEEN.Tween(uniforms.opacity)
      .to({ value: 0 }, SPLASH.BACKGROUND_FADE_DURATION)
      .easing(TWEEN.Easing.Quadratic.In)
      .onComplete(() => {
        const textFade = new TWEEN.Tween(uniforms.text_opacity)
          .to({ value: 0 }, SPLASH.TEXT_FADE_DURATION)
          .easing(TWEEN.Easing.Circular.In)
          .start();
        tweens.push(textFade);
      })
      .start();
    tweens.push(rise, invert, backgroundFade);
  }

  // when the crest crashes, ripples wash over the paper, slowing down and
  // calming until the paper has faded out
  private startWash(paper: Paper) {
    const uniforms = paper.mesh.material.uniforms;
    const duration =
      SPLASH.BACKGROUND_FADE_DURATION +
      SPLASH.TEXT_FADE_DURATION -
      SPLASH.CRASH_AT * SPLASH.RISE_DURATION;
    const seconds = duration / 1000;
    const r = WASH.RESIDUAL;
    const wash = new TWEEN.Tween({ value: 0 })
      .to({ value: 1 }, duration)
      .onUpdate(({ value: u }) => {
        // the ripples travel at r + (1 - r) * (1 - u)^2 times their initial speed
        uniforms.washTime.value =
          seconds * (r * u + ((1 - r) / 3) * (1 - (1 - u) ** 3));
        uniforms.wash.value = r + (1 - r) * (1 - u);
      })
      .onComplete(() => {
        // afterwards the small ripples keep going at the residual speed until the paper is released
        const hour = 3600;
        const residual = new TWEEN.Tween(uniforms.washTime)
          .to({ value: uniforms.washTime.value + r * hour }, hour * 1000)
          .start();
        paper.tweens.push(residual);
      })
      .start();
    paper.tweens.push(wash);
  }

  private release(paper: Paper) {
    this.group.remove(paper.mesh);
    for (const tween of paper.tweens) tween.stop();
    paper.tweens = [];
    setSplashing(paper.mesh, false);
    if (paper.publication !== null) {
      paper.mesh.material.uniforms.uTexture.value.dispose();
      paper.publication = null;
    }
    this.freePapers.push(paper);
  }

  private clear() {
    TWEEN.removeAll();
    for (const mesh of [...this.group.children] as PaperMesh[]) {
      const texture = mesh.material.uniforms.uTexture.value as THREE.Texture;
      if (!this.texturePool.some((pooled) => pooled.texture === texture)) {
        texture.dispose();
      }
      mesh.material.dispose();
      this.group.remove(mesh);
    }
    for (const paper of this.freePapers) paper.mesh.material.dispose();
    for (const pooled of this.texturePool) pooled.texture.dispose();
    this.surfacePapers = [];
    this.freePapers = [];
    this.texturePool = [];
  }
}
