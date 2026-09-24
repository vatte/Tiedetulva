import * as THREE from "three";
import { OCEAN, PAPER, SPLASH, WASH, WAVES } from "./params";

// shared by all paper materials, updated once per frame (seconds)
export const waveTime = { value: 0 };

const glslFloat = (n: number) => `(${n.toFixed(6)})`;

// sum of travelling sine waves: height h and its gradient (d/dx, d/dz)
const waveCode = WAVES.COMPONENTS.map((wave) => {
  const k = (2 * Math.PI) / wave.wavelength;
  const omega = k * wave.speed;
  const angle = (wave.direction * Math.PI) / 180;
  const dx = Math.sin(angle);
  const dz = Math.cos(angle);
  return `
      {
        float phase = ${glslFloat(k * dx)} * worldPos.x + ${glslFloat(k * dz)} * worldPos.z - ${glslFloat(omega)} * time;
        h += ${glslFloat(wave.amplitude)} * sin(phase);
        grad += vec2(${glslFloat(dx)}, ${glslFloat(dz)}) * ${glslFloat(wave.amplitude * k)} * cos(phase);
      }`;
}).join("");

const maxSlope = WAVES.COMPONENTS.reduce(
  (sum, wave) => sum + (wave.amplitude * 2 * Math.PI) / wave.wavelength,
  0
);

// ripples washing down the splashed paper: a main wave travelling down and a diagonal one crossing it
const washK = (2 * Math.PI) / WASH.WAVELENGTH;
const washOmega = washK * WASH.SPEED;
const crossKx = washK * 0.8 * 0.6;
const crossKy = washK * 0.8 * 0.8;
const washMaxSlope = WASH.AMPLITUDE * washK * (1 + WASH.CROSS_AMPLITUDE);

const baseMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTexture: { value: null },
    backColor: { value: new THREE.Color() },
    time: waveTime,
    ripple: { value: 1.0 },
    curl: { value: 0 },
    wash: { value: 0 },
    washTime: { value: 0 },
    invert: { value: 0 },
    opacity: { value: 1.0 },
    text_opacity: { value: 1.0 },
  },
  vertexShader: `
    uniform float time;
    uniform float ripple;
    uniform float curl;
    uniform float wash;
    uniform float washTime;
    varying vec2 vUv;
    varying float vShade;
    varying float vWashShade;
    varying vec2 vRefract;
    varying float vDistance;
    void main() {
      vUv = uv;
      vec3 p = position;

      vWashShade = 1.0;
      vRefract = vec2(0.0);
      if (wash > 0.0) {
        // the ripples reach further down the paper as the wash front travels from the top edge
        float front = ${glslFloat(PAPER.HEIGHT / 2)} - ${glslFloat(WASH.SPEED)} * washTime;
        float amplitude = ${glslFloat(WASH.AMPLITUDE)} * wash * smoothstep(front - 0.04, front + 0.04, p.y);
        float phase1 = ${glslFloat(washK)} * p.y + ${glslFloat(washOmega)} * washTime;
        float phase2 = ${glslFloat(crossKx)} * p.x + ${glslFloat(crossKy)} * p.y + ${glslFloat(washOmega * 0.9)} * washTime + 1.3;
        p.z += amplitude * (sin(phase1) + ${glslFloat(WASH.CROSS_AMPLITUDE)} * sin(phase2));
        vec2 slope = amplitude * vec2(
          ${glslFloat(WASH.CROSS_AMPLITUDE * crossKx)} * cos(phase2),
          ${glslFloat(washK)} * cos(phase1) + ${glslFloat(WASH.CROSS_AMPLITUDE * crossKy)} * cos(phase2)
        ) / ${glslFloat(washMaxSlope)};
        // slopes tilting up towards the light are brighter
        vWashShade = 1.0 + ${glslFloat(WASH.SHADING)} * clamp(slope.y + 0.3 * slope.x, -1.0, 1.0);
        vRefract = ${glslFloat(WASH.REFRACTION)} * slope;
      }

      if (abs(curl) > 0.0001) {
        // bend the paper into an arc: positive curl bends the top edge towards the printed side, negative away from it
        float radius = ${glslFloat(PAPER.HEIGHT)} / curl;
        float angle = (p.y + ${glslFloat(PAPER.HEIGHT / 2)}) / radius;
        p = vec3(
          p.x,
          ${glslFloat(-PAPER.HEIGHT / 2)} + radius * sin(angle) - p.z * sin(angle),
          radius * (1.0 - cos(angle)) + p.z * cos(angle)
        );
      }

      vec4 worldPos = modelMatrix * vec4(p, 1.0);
      float h = 0.0;
      vec2 grad = vec2(0.0);
      ${waveCode}
      worldPos.y += h * ripple;
      // slopes facing the viewer are brighter
      vShade = 1.0 + ${glslFloat(WAVES.SHADING)} * clamp(-grad.y / ${glslFloat(maxSlope || 1)}, -1.0, 1.0);
      vec4 mvPosition = viewMatrix * worldPos;
      vDistance = length(mvPosition.xyz);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform vec3 backColor;
    uniform float ripple;
    uniform float invert;
    uniform float opacity;
    uniform float text_opacity;
    varying vec2 vUv;
    varying float vShade;
    varying float vWashShade;
    varying vec2 vRefract;
    varying float vDistance;
    void main() {
      vec4 texColor = texture(uTexture, clamp(vUv + vRefract, 0.0, 1.0));
      if (!gl_FrontFacing) {
        // the blank back of the paper, with the print faintly showing through
        gl_FragColor = vec4(mix(backColor, texColor.rgb, ${glslFloat(OCEAN.BACK_SHOW_THROUGH)}), opacity);
      } else if (texColor.r + texColor.g + texColor.b < 0.4) {
        vec4 invertedColor = vec4(1.0 - texColor.rgb, texColor.a);
        gl_FragColor = mix(texColor, invertedColor, invert) * text_opacity;
      } else {
        // the fading paper color is blended over a black backdrop of BACKDROP_OPACITY
        float coverage = mix(${glslFloat(SPLASH.BACKDROP_OPACITY)} * text_opacity, 1.0, opacity);
        gl_FragColor.rgb = texColor.rgb * opacity / max(coverage, 0.0001);
        gl_FragColor.a = texColor.a * coverage;
      }
      gl_FragColor.rgb *= mix(1.0, ${glslFloat(OCEAN.BRIGHTNESS)} * vShade, ripple) * vWashShade;
      gl_FragColor.a *= 1.0 - smoothstep(${glslFloat(OCEAN.FOG_NEAR)}, ${glslFloat(OCEAN.FOG_FAR)}, vDistance);
    }
  `,
  transparent: true,
  // the papers float face down, so their backs are seen on the surface
  side: THREE.DoubleSide,
  // papers are drawn back to front, so overlapping papers on the surface don't flicker
  depthWrite: false,
});

export const materialFromTexture = (texture: THREE.Texture) => {
  const material = baseMaterial.clone();
  material.uniforms.uTexture.value = texture;
  material.uniforms.time = waveTime;
  return material;
};
