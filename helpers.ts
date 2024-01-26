import * as THREE from "three";

export const interpolatedPointOnVertex = (
  v1: THREE.Vector3,
  v2: THREE.Vector3,
  v3: THREE.Vector3,
  r1: number,
  r2: number,
  r3: number
) => {
  const total = r1 + r2 + r3;

  r1 = r1 / total;
  r2 = r2 / total;
  r3 = r3 / total;

  // Calculate the weighted average of the vertices
  const point = new THREE.Vector3(
    r1 * v1.x + r2 * v2.x + r3 * v3.x,
    r1 * v1.y + r2 * v2.y + r3 * v3.y,
    r1 * v1.z + r2 * v2.z + r3 * v3.z
  );

  return point;
};

export const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};
