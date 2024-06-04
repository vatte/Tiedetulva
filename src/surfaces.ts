// WebGLRenderTargets for the projection mapping surfaces
// camera points from the origin to the center of the surface

import * as THREE from "three";

export const createSurface = (
  scene: THREE.Scene,
  renderTargetScene: THREE.Scene,
  position: THREE.Vector3,
  upsideDown: boolean = false
) => {
  //create a webglrendertarget in the shape of an equilateral triangle with side length 2.5
  const renderTarget = new THREE.WebGLRenderTarget(1024 * Math.sqrt(3), 2048);

  //create a camera for the render target
  // renderTargetCamera fov should depend on distance and angle of the surface but is currently fixed
  const renderTargetCamera = new THREE.PerspectiveCamera(
    110,
    0.5 * Math.sqrt(3),
    0.001,
    1000
  );
  renderTargetCamera.lookAt(position);
  //renderTargetCamera.position.z = 5;
  renderTargetScene.add(renderTargetCamera);
  /*
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    renderTargetScene.add(ambientLight);
  */
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.copy(position.clone().multiplyScalar(-0.3));

  /*
  light.castShadow = true;

  light.shadow.mapSize.width = 1024;
  light.shadow.mapSize.height = 1024;
  */

  renderTargetScene.add(light);

  // create a geometry in the shape of an equilateral triangle with side length 2.5
  // Create a new shape
  const shape = new THREE.Shape();

  const halfsqrt3 = Math.sqrt(3) / 2;

  if (upsideDown) {
    shape.moveTo(-1.25, halfsqrt3);
    shape.lineTo(1.25, halfsqrt3);
    shape.lineTo(0, -halfsqrt3);
    shape.lineTo(-1.25, halfsqrt3);
  } else {
    shape.moveTo(-1.25, -halfsqrt3);
    shape.lineTo(1.25, -halfsqrt3);
    shape.lineTo(0, halfsqrt3);
    shape.lineTo(-1.25, -halfsqrt3);
  }

  // Create a new geometry from the shape
  const geometry = new THREE.ShapeGeometry(shape);

  //add the render target to the scene
  const renderTargetObject = new THREE.Mesh(
    geometry,
    //new THREE.MeshBasicMaterial({ color: 0xffffff })
    new THREE.MeshBasicMaterial({
      map: renderTarget.texture,
      side: THREE.DoubleSide,
    })
  );

  if (upsideDown) {
    renderTargetObject.geometry.attributes.uv.setXY(0, 0, 1);
    renderTargetObject.geometry.attributes.uv.setXY(1, 1, 1);
    renderTargetObject.geometry.attributes.uv.setXY(2, 0.5, 0);
  } else {
    renderTargetObject.geometry.attributes.uv.setXY(0, 0, 0);
    renderTargetObject.geometry.attributes.uv.setXY(1, 0.5, 1);
    renderTargetObject.geometry.attributes.uv.setXY(2, 1, 0);
  }

  renderTargetObject.position.copy(position);
  //renderTargetObject.position.z = -5;
  //renderTargetObject.position.x = -2;
  scene.add(renderTargetObject);

  return {
    camera: renderTargetCamera,
    target: renderTarget,
    object: renderTargetObject,
  };
};

export const createRectangleSurface = (
  scene: THREE.Scene,
  renderTargetScene: THREE.Scene,
  position: THREE.Vector3
) => {
  // Create a WebGLRenderTarget with a rectangular shape
  const renderTarget = new THREE.WebGLRenderTarget(1920, 1080);

  // Create a camera for the render target
  const renderTargetCamera = new THREE.PerspectiveCamera(
    95,
    16 / 9,
    0.001,
    1000
  );
  renderTargetCamera.lookAt(position);
  renderTargetScene.add(renderTargetCamera);

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.copy(position.clone().multiplyScalar(-0.3));
  renderTargetScene.add(light);

  // Create a rectangular shape
  const shape = new THREE.Shape();
  shape.moveTo(-1.6, 0.9); // Top left vertex
  shape.lineTo(1.6, 0.9); // Top right vertex
  shape.lineTo(1.6, -0.9); // Bottom right vertex
  shape.lineTo(-1.6, -0.9); // Bottom left vertex
  shape.lineTo(-1.6, 0.9); // Top left vertex

  // Create a new geometry from the shape
  const geometry = new THREE.ShapeGeometry(shape);

  // Add the render target to the scene
  const renderTargetObject = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      map: renderTarget.texture,
      side: THREE.DoubleSide,
    })
  );

  // Set UV coordinates for the rectangle
  renderTargetObject.geometry.attributes.uv.setXY(0, 0, 1); // Top left vertex
  renderTargetObject.geometry.attributes.uv.setXY(1, 1, 1); // Top right vertex
  renderTargetObject.geometry.attributes.uv.setXY(2, 1, 0); // Bottom right vertex
  renderTargetObject.geometry.attributes.uv.setXY(3, 0, 0); // Bottom left vertex

  renderTargetObject.position.copy(position);
  scene.add(renderTargetObject);

  return {
    camera: renderTargetCamera,
    target: renderTarget,
    object: renderTargetObject,
  };
};
