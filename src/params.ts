// All tunable parameters of Tiedetulva (ocean mode).
//
// Units: distances are in scene units (one paper is 0.21 x 0.297, i.e. A4 in metres),
// durations are in milliseconds unless stated otherwise.
// The render camera sits at the origin and looks towards -z; the water surface
// lies below it at y = OCEAN.WATER_LEVEL.

export const SCENE = {
  BACKGROUND_COLOR: 0x000000,
  // Background toggled with the "g" key (e.g. for chroma keying), "b" returns to BACKGROUND_COLOR
  CHROMA_KEY_COLOR: 0x00ff00,
};

export const CAMERA = {
  FOV: 95, // vertical field of view in degrees
  ASPECT: 16 / 9,
  PITCH: -30, // degrees, negative tilts the view down towards the water
  NEAR: 0.02,
  FAR: 50,
  ANTIALIAS_SAMPLES: 4, // multisampling of the rendered image, 0 = off
};

// The papers form a fan-shaped surface around the break point in front of the viewer.
// Every paper flows straight towards the break point, and they arrive there one at a time:
// the whole surface moves just enough that the next paper arrives when the previous one splashes.
export const OCEAN = {
  WATER_LEVEL: -0.7, // height of the water surface relative to the camera
  FAR_DISTANCE: 50, // new papers appear at this distance from the break point
  SPREAD: 140, // angle of the fan in degrees, 180 = everything in front of the break point
  PAPER_SPACING: 0.4, // average distance between papers, smaller = denser surface
  POSITION_JITTER: 0.15, // random offset of each paper from its place in the pattern
  YAW_JITTER: 30, // random rotation of each paper around the vertical axis (degrees)
  BRIGHTNESS: 0.3, // brightness of papers on the surface (1 = original colors)
  BACK_SHOW_THROUGH: 0.5, // how much the print shows through the blank back of the floating papers
  FOG_NEAR: 3.5, // papers start fading into the dark at this distance...
  FOG_FAR: 49, // ...and are invisible at this distance (keep <= FAR_DISTANCE)
  TEXTURE_POOL_SIZE: 64, // number of pre-drawn papers shared by the distant papers
  OWN_TEXTURE_AHEAD: 30, // this many papers next in line get their own publication (same color and logo)
  ANISOTROPY: 8, // texture filtering quality at grazing angles
};

export const WAVES = {
  // Each component is a sine wave travelling across the surface.
  // direction: degrees, 0 = travelling straight towards the viewer, positive = towards the right
  COMPONENTS: [
    { amplitude: 0.1, wavelength: 2.2, speed: 0.5, direction: 0 },
    { amplitude: 0.04, wavelength: 1.1, speed: 0.35, direction: 25 },
    { amplitude: 0.02, wavelength: 0.7, speed: 0.3, direction: -35 },
    { amplitude: 0.01, wavelength: 0.4, speed: 0.22, direction: 70 },
  ],
  SHADING: 0.35, // how much the wave slopes brighten/darken the papers
  SEGMENTS_X: 6, // paper mesh subdivisions, more = smoother bending
  SEGMENTS_Y: 8,
};

// A splash breaks like a tsunami: the arriving paper lifts up from floating face down,
// rising on a towering wave with its top rolled back, and unrolls towards the viewer as it crashes down upright
// close in front of the viewer, where ripples wash over it.
export const SPLASH = {
  BREAK_DISTANCE: 0.1, // distance of the break point from the viewer
  BREAK_RADIUS: 0.5, // papers splash when they are this close to the break point
  FIRST_DELAY: 3000, // time until the first splash
  MIN_INTERVAL: 8000, // minimum time between splashes
  RANDOM_INTERVAL: 16000, // random extra time between splashes
  RISE_DURATION: 1400, // time from floating face down to upright in the reading position
  CREST_HEIGHT: -0.08, // height (relative to the camera) that the rising wave reaches for, the paper peaks lower
  CURL: 60, // how far the top of the paper is rolled back behind it before unrolling towards the viewer (degrees between the bottom and top edge)
  CRASH_AT: 0.6, // fraction of the rise at which the crest crashes: the paper unrolls and the ripples start
  READ_DISTANCE: 0.22, // distance from the camera of the upright paper
  READ_HEIGHT: -0.1, // height of the upright paper relative to the camera
  READ_X_RANGE: 0.14, // papers arriving from the far left / right stand up this far left / right
  SEGMENTS_X: 24, // subdivisions of the splashing paper, more = smoother curl and ripples
  SEGMENTS_Y: 32,
  DRIFT_DELAY: 2000, // pause after the splash before drifting towards the viewer
  DRIFT_DURATION: 20000, // time to drift to FINAL_POSITION...
  DRIFT_DURATION_RANDOM: 10000, // ...plus a random extra
  FINAL_POSITION: { x: 0, y: 0, z: 0 },
  INVERT_DURATION: 20000, // text turns from black to white
  BACKGROUND_FADE_DURATION: 10000, // paper background fades out
  TEXT_FADE_DURATION: 8000, // text fades out after the background has faded
  BACKDROP_OPACITY: 0, // 0 = background fully transparent after fading, >0 leaves a dark card behind the text
};

// Ripples washing over the paper after the crash, travelling from the top edge downwards.
// They keep slowing down and calming until the paper has faded out.
export const WASH = {
  AMPLITUDE: 0.0002, // initial height of the ripples
  WAVELENGTH: 0.08,
  SPEED: 0.5, // initial speed of the ripples travelling down the paper
  CROSS_AMPLITUDE: 1, // relative height of the diagonal ripples crossing the main ones
  SHADING: 0.01, // how much the ripple slopes brighten/darken the paper
  REFRACTION: 0.005, // how much the ripples distort the printed text, as if seen through water
};

// A synthesized wave sound (filtered noise) plays whenever a paper splashes.
// If SAMPLE_FILES lists audio files (relative to dist/, e.g. "sounds/wave-1.mp3"),
// a random one of them is played instead.
export const SOUND = {
  MASTER_VOLUME: 0.8,
  VOLUME_RANDOMNESS: 0.3, // each wave is up to this fraction quieter
  DURATION_RANDOMNESS: 0.3, // each wave is up to this fraction longer or shorter
  STEREO_WIDTH: 0.8, // panning follows the paper position, 0 = mono
  SAMPLE_FILES: [] as string[],
  SAMPLE_PITCH_RANDOMNESS: 0.1,
  // Layers of the synthesized wave. Times in seconds, frequencies in Hz.
  // The filter frequency sweeps start -> peak during attack and peak -> end during decay.
  LAYERS: [
    // the crash of the breaking wave
    {
      filter: "lowpass" as BiquadFilterType,
      freqStart: 300,
      freqPeak: 2400,
      freqEnd: 350,
      level: 0.5,
      delay: 0,
      attack: 0.8,
      decay: 5.0,
    },
    // hissing foam after the break
    {
      filter: "highpass" as BiquadFilterType,
      freqStart: 2000,
      freqPeak: 3500,
      freqEnd: 6000,
      level: 0.12,
      delay: 0.25,
      attack: 3.0,
      decay: 10.0,
    },
    // low rumble
    {
      filter: "lowpass" as BiquadFilterType,
      freqStart: 120,
      freqPeak: 220,
      freqEnd: 80,
      level: 0.6,
      delay: 0,
      attack: 10.0,
      decay: 30.0,
    },
  ],
};

export const PAPER = {
  WIDTH: 0.21,
  HEIGHT: 0.297,
  CANVAS_UPSCALE: 2, // canvas resolution: 210 x 297 pixels times this
  COLORS: ["#6ec498", "#ffe24a", "#fcb116", "#f8bccd"],
  FONT_FAMILY: "Galatea",
  FONT_SIZE_TITLE: 16,
  FONT_SIZE_AUTHOR: 10,
  FONT_SIZE_ABSTRACT: 10,
  LOGO_COUNT: 20,
};

export const UI = {
  MENU_HIDE_DELAY: 3000,
  CURSOR_HIDE_DELAY: 5000,
};
