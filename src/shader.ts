import * as THREE from "three";

const baseMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTexture: { value: null },
    invert: { value: 0 },
    opacity: { value: 1.0 },
    text_opacity: { value: 1.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float invert;
    uniform float opacity;
    uniform float text_opacity;
    varying vec2 vUv;
    void main() {
      vec4 texColor = texture(uTexture, vUv);
      if (texColor.r + texColor.g + texColor.b < 0.4) {
        vec4 invertedColor = vec4(1.0 - texColor.rgb, texColor.a);
        gl_FragColor = mix(texColor, invertedColor, invert) * text_opacity;
      } else {
        gl_FragColor = texColor;
        gl_FragColor.a *= opacity;
      }
    }
  `,
  transparent: true,
});

export const materialFromTexture = (texture: THREE.Texture) => {
  const material = baseMaterial.clone();
  material.uniforms.uTexture.value = texture;
  return material;
};
